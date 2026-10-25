import { describe, expect, it } from "vitest";
import { Timeline, beatInfo } from "../src/audio/timeline";

describe("Timeline", () => {
  it("maps time to beats at a fixed tempo", () => {
    const tl = new Timeline();
    tl.start(10, 120); // 0.5 s per beat
    expect(tl.beatAt(10)).toBe(0);
    expect(tl.beatAt(10.5)).toBeCloseTo(1);
    expect(tl.timeOfBeat(8)).toBeCloseTo(14);
  });

  it("has no drift over a long run", () => {
    const tl = new Timeline();
    tl.start(0, 300);
    // Beat 10,000 at 300 BPM = 2000 s exactly.
    expect(tl.timeOfBeat(10_000)).toBeCloseTo(2000, 9);
  });

  it("keeps earlier beats in place after a tempo change", () => {
    const tl = new Timeline();
    tl.start(0, 60); // 1 s per beat
    tl.setTempo(4, 120); // from beat 4 (t=4) onward, 0.5 s per beat
    expect(tl.timeOfBeat(3)).toBeCloseTo(3);
    expect(tl.timeOfBeat(4)).toBeCloseTo(4);
    expect(tl.timeOfBeat(6)).toBeCloseTo(5);
    expect(tl.beatAt(3.5)).toBeCloseTo(3.5);
    expect(tl.beatAt(4.25)).toBeCloseTo(4.5);
  });
});

describe("beatInfo", () => {
  it("counts 1-4 and tracks bars", () => {
    expect(beatInfo(0)).toMatchObject({ count: 1, bar: 0, phase: 0 });
    expect(beatInfo(3.5)).toMatchObject({ count: 4, bar: 0, phase: 0.5 });
    expect(beatInfo(4)).toMatchObject({ count: 1, bar: 1 });
    expect(beatInfo(63.9).count).toBe(4);
    expect(beatInfo(63.9).bar).toBe(15);
  });

  it("clamps before the start", () => {
    expect(beatInfo(-0.3)).toMatchObject({ count: 1, bar: 0, phase: 0 });
  });
});
