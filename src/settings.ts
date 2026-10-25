export interface Settings {
  bpm: number;
  clickBeats: number[]; // 1-based beats that click
  perWall: 16 | 32;
  /** One bar of clicks on all four beats before the wall starts. */
  countIn: boolean;
  volume: number; // 0..1
  /** Shift the visuals vs. the sound, in ms (positive = visuals later). For Bluetooth etc. */
  visualOffsetMs: number;
}

export const DEFAULTS: Settings = {
  bpm: 120,
  clickBeats: [1, 2, 3, 4],
  perWall: 16,
  countIn: true,
  volume: 0.8,
  visualOffsetMs: 0,
};

export const BPM_MIN = 40;
export const BPM_MAX = 320;

const KEY = "jdm.settings.v2";
const OLD_KEY = "jdm.settings.v1";

export function loadSettings(): Settings {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      // v0.3 changed the click default to all four beats: carry over the
      // other saved settings but take the new click default.
      const old = localStorage.getItem(OLD_KEY);
      if (!old) return { ...DEFAULTS };
      const o = JSON.parse(old);
      delete o.clickBeats;
      raw = JSON.stringify(o);
    }
    const s = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
    s.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(s.bpm)));
    if (s.perWall !== 16 && s.perWall !== 32) s.perWall = 16;
    s.countIn = s.countIn !== false;
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
