export interface Settings {
  bpm: number;
  clickBeats: number[]; // 1-based beats that click
  perWall: 16 | 32;
  volume: number; // 0..1
  /** Shift the visuals vs. the sound, in ms (positive = visuals later). For Bluetooth etc. */
  visualOffsetMs: number;
}

export const DEFAULTS: Settings = {
  bpm: 120,
  clickBeats: [2, 4],
  perWall: 16,
  volume: 0.8,
  visualOffsetMs: 0,
};

export const BPM_MIN = 40;
export const BPM_MAX = 320;

const KEY = "jdm.settings.v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const s = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
    s.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(s.bpm)));
    if (s.perWall !== 16 && s.perWall !== 32) s.perWall = 16;
    if (!Array.isArray(s.clickBeats)) s.clickBeats = [...DEFAULTS.clickBeats];
    return s;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}
