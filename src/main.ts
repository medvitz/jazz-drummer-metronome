import { registerSW } from "virtual:pwa-register";
import { Engine } from "./audio/engine";
import { beatInfo } from "./audio/timeline";
import { loadSettings } from "./settings";
import { Controls } from "./ui/controls";
import { Leader } from "./visual/leader";
import { WallRenderer } from "./visual/wall";
import { wallBeat, wallState } from "./visual/wallModel";

registerSW({ immediate: true });

const settings = loadSettings();
const engine = new Engine({
  bpm: settings.bpm,
  clickBeats: settings.clickBeats,
  volume: settings.volume,
  countInBars: settings.countIn ? 1 : 0,
});

const wallCanvas = document.getElementById("wall") as HTMLCanvasElement;
const leaderCanvas = document.getElementById("leader") as HTMLCanvasElement;
const hud = document.getElementById("hud") as HTMLDivElement;
const countInEl = document.getElementById("countIn") as HTMLDivElement;
const countInDots = Array.from(countInEl.querySelectorAll<HTMLSpanElement>(".dots span"));
const wallG = wallCanvas.getContext("2d")!;
const leaderG = leaderCanvas.getContext("2d")!;
const leader = new Leader();
const wall = new WallRenderer();

/** Size canvases to their boxes at full device resolution. */
function fit(c: HTMLCanvasElement, g: CanvasRenderingContext2D) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const ro = new ResizeObserver(() => {
  fit(wallCanvas, wallG);
  fit(leaderCanvas, leaderG);
});
ro.observe(wallCanvas);
ro.observe(leaderCanvas);

// When stopped, freeze on the last frame so you can see how far you got.
let frozenBeat = 0;
let perWall = settings.perWall; // locked in when Play is pressed
let countInBars = settings.countIn ? 1 : 0; // likewise

// Test hook: ?beat=67.5 shows a still frame at that beat position.
const demoBeat = new URLSearchParams(location.search).get("beat");

function currentBeat(): number {
  if (demoBeat !== null) return Number(demoBeat);
  if (!engine.isPlaying) return frozenBeat;
  const t = engine.heardTime() - settings.visualOffsetMs / 1000;
  return engine.timeline.beatAt(t);
}

let lastHud = "";
function frame() {
  const beat = currentBeat();
  const info = beatInfo(beat);
  const running = engine.isPlaying || demoBeat !== null;

  const lw = leaderCanvas.clientWidth;
  const lh = leaderCanvas.clientHeight;
  leader.draw(leaderG, lw, lh, info.count, beat < 0 ? 0 : info.phase, running);

  const wb = wallBeat(beat, countInBars);
  const ws = wallState(wb, perWall);
  wall.draw(wallG, wallCanvas.clientWidth, wallCanvas.clientHeight, ws, perWall);

  const started = running && beat >= 0;
  const countingIn = started && wb < 0;
  // Bar count restarts with each wall, matching the brick numbers.
  const wallBar = Math.floor(Math.max(0, wb) / 4);
  const text = !started
    ? "Tap play to start"
    : countingIn
      ? "" // the big overlay says it
      : `Wall ${Math.floor(wallBar / perWall) + 1} · Bar ${(wallBar % perWall) + 1}`;
  if (text !== lastHud) hud.textContent = lastHud = text;

  // "Count in..." overlay, with a dot lighting up on each click.
  countInEl.hidden = !countingIn;
  if (countingIn) countInDots.forEach((d, i) => d.classList.toggle("on", i < info.count));

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Keep the screen awake while playing.
let wakeLock: WakeLockSentinel | null = null;
async function keepAwake(on: boolean) {
  try {
    if (on && "wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => (wakeLock = null));
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    /* not supported or refused: not critical */
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && engine.isPlaying) keepAwake(true);
});

const controls = new Controls(settings, {
  async onTogglePlay() {
    if (engine.isPlaying) {
      frozenBeat = currentBeat();
      engine.stop();
      controls.setPlaying(false);
      keepAwake(false);
    } else {
      perWall = settings.perWall;
      countInBars = settings.countIn ? 1 : 0;
      engine.setCountInBars(countInBars);
      await engine.start();
      controls.setPlaying(true);
      keepAwake(true);
    }
  },
  onBpm: (bpm) => engine.setBpm(bpm),
  onClickBeats: (beats) => engine.setClickBeats(beats),
  onVolume: (v) => engine.setVolume(v),
});

// Handy for timing checks from the browser console / tests.
(window as unknown as { __jdm: unknown }).__jdm = { engine, settings };
