/**
 * Metronome engine: a look-ahead scheduler on the Web Audio clock.
 *
 * A ticker in a Web Worker wakes about every 25 ms (workers aren't throttled
 * like page timers). Each tick queues any clicks due in the next 120 ms at
 * exact audio-clock times. JS timers never decide *when* a click sounds;
 * they only make sure it's queued in time.
 */
import { BEATS_PER_BAR, Timeline } from "./timeline";
import { renderHiHat } from "./hihat";

const LOOKAHEAD = 0.12; // seconds of audio queued ahead
const TICK_MS = 25;

const workerSrc = `let id=null;onmessage=e=>{if(e.data==='start'){clearInterval(id);id=setInterval(()=>postMessage(0),${TICK_MS});}else{clearInterval(id);id=null;}}`;

export interface EngineOptions {
  bpm: number;
  /** Beats in the bar that click, 1-based (default [2, 4]). */
  clickBeats: number[];
  volume: number; // 0..1
}

export class Engine {
  readonly timeline = new Timeline();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hihat: AudioBuffer | null = null;
  private worker: Worker | null = null;
  private nextBeat = 0;
  private playing = false;
  /** Optional: log of scheduled click times (for timing checks). */
  scheduleLog: number[] | null = null;

  constructor(private opts: EngineOptions) {}

  get isPlaying(): boolean {
    return this.playing;
  }

  get audioContext(): AudioContext | null {
    return this.ctx;
  }

  async start(): Promise<void> {
    if (this.playing) return;
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.hihat = await renderHiHat(this.ctx.sampleRate);
    }
    await this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.setValueAtTime(this.opts.volume, now);
    this.timeline.start(this.ctx.currentTime + 0.15, this.opts.bpm);
    this.nextBeat = 0;
    this.playing = true;
    if (!this.worker) {
      const url = URL.createObjectURL(new Blob([workerSrc], { type: "text/javascript" }));
      this.worker = new Worker(url);
      this.worker.onmessage = () => this.tick();
    }
    this.worker.postMessage("start");
    this.tick();
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    this.worker?.postMessage("stop");
    // Fade quickly so an already-queued click doesn't sound after Stop.
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + 0.01);
    }
  }

  setBpm(bpm: number): void {
    this.opts.bpm = bpm;
    if (this.playing) this.timeline.setTempo(this.nextBeat, bpm);
  }

  setClickBeats(beats: number[]): void {
    this.opts.clickBeats = beats;
  }

  setVolume(v: number): void {
    this.opts.volume = v;
    if (this.master && this.ctx && this.playing) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    }
  }

  /**
   * The audio-clock time of what the listener is hearing *right now*,
   * after accounting for output latency. Visuals use this.
   */
  heardTime(): number {
    const ctx = this.ctx;
    if (!ctx) return 0;
    if (typeof ctx.getOutputTimestamp === "function") {
      const ts = ctx.getOutputTimestamp();
      if (ts.contextTime && ts.performanceTime) {
        return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
      }
    }
    return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!this.playing || !ctx || !this.hihat || !this.master) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    for (;;) {
      const t = this.timeline.timeOfBeat(this.nextBeat);
      if (t >= horizon) break;
      const beatInBar = (this.nextBeat % BEATS_PER_BAR) + 1;
      // Skip a beat that's already in the past (e.g. tab was suspended).
      if (t >= ctx.currentTime - 0.005 && this.opts.clickBeats.includes(beatInBar)) {
        const src = ctx.createBufferSource();
        src.buffer = this.hihat;
        src.connect(this.master);
        src.start(Math.max(t, ctx.currentTime));
        this.scheduleLog?.push(t);
      }
      this.nextBeat++;
    }
  }
}
