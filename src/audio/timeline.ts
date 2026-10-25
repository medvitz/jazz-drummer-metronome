/**
 * Timeline: maps audio-clock time (seconds) <-> beat position.
 *
 * Beat 0 is bar 1, beat 1. Tempo changes are stored as segments, so beats
 * already scheduled at the old tempo still map back to the right place.
 * Everything here is pure maths: no Web Audio, so it can be unit tested.
 */

export const BEATS_PER_BAR = 4;

interface Segment {
  time: number; // audio time where this segment starts
  beat: number; // beat position at that time
  spb: number; // seconds per beat
}

export class Timeline {
  private segs: Segment[] = [];

  start(time: number, bpm: number): void {
    this.segs = [{ time, beat: 0, spb: 60 / bpm }];
  }

  get started(): boolean {
    return this.segs.length > 0;
  }

  get startTime(): number {
    return this.segs[0]?.time ?? 0;
  }

  /** Change tempo from `atBeat` onward (usually the next unscheduled beat). */
  setTempo(atBeat: number, bpm: number): void {
    if (!this.started) return;
    const time = this.timeOfBeat(atBeat);
    // Drop any segment that would start after this one.
    this.segs = this.segs.filter((s) => s.beat < atBeat);
    this.segs.push({ time, beat: atBeat, spb: 60 / bpm });
    // Only the last few segments are ever needed.
    if (this.segs.length > 4) this.segs = this.segs.slice(-4);
  }

  /** Beat position (float) at audio time t. Negative before start. */
  beatAt(t: number): number {
    const segs = this.segs;
    if (!segs.length) return 0;
    let s = segs[0];
    for (const seg of segs) if (seg.time <= t) s = seg;
    return s.beat + (t - s.time) / s.spb;
  }

  /** Audio time of a beat position. */
  timeOfBeat(beat: number): number {
    const segs = this.segs;
    let s = segs[0];
    for (const seg of segs) if (seg.beat <= beat) s = seg;
    return s.time + (beat - s.beat) * s.spb;
  }
}

export interface BeatInfo {
  /** 1-based count shown on the leader circle (1..4). */
  count: number;
  /** 0..1 progress through the current beat (drives the sweep). */
  phase: number;
  /** 0-based bar index. */
  bar: number;
  /** 0..4 float position within the bar. */
  beatInBar: number;
}

export function beatInfo(beat: number): BeatInfo {
  const p = Math.max(0, beat);
  const whole = Math.floor(p);
  const bar = Math.floor(whole / BEATS_PER_BAR);
  const beatInBar = p - bar * BEATS_PER_BAR;
  return {
    count: (whole % BEATS_PER_BAR) + 1,
    phase: p - whole,
    bar,
    beatInBar,
  };
}
