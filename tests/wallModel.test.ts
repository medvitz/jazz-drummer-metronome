import { describe, expect, it } from "vitest";
import { wallBeat, wallState } from "../src/visual/wallModel";

describe("wallState", () => {
  it("is empty during the first three beats", () => {
    expect(wallState(0, 16).bricks).toHaveLength(0);
    expect(wallState(2.99, 16).bricks).toHaveLength(0);
  });

  it("drops brick 1 on beat 4 and lands it on the next downbeat", () => {
    const falling = wallState(3.5, 16);
    expect(falling.bricks).toHaveLength(1);
    expect(falling.bricks[0]).toMatchObject({ number: 1, fall: 0.5 });
    const landed = wallState(4, 16);
    expect(landed.bricks[0]).toMatchObject({ number: 1, fall: 1 });
  });

  it("fills a 16-brick wall, then clears it", () => {
    // Bar 16 begins at beat 64: all 16 landed, clearing.
    const s = wallState(64.5, 16);
    expect(s.bricks).toHaveLength(16);
    expect(s.clearing).toBeGreaterThan(0);
    expect(s.wallIndex).toBe(0);
  });

  it("restarts numbering on the next wall", () => {
    // Beat 67.5: beat 4 of bar 17 -> wall 2, brick 1 falling.
    const s = wallState(67.5, 16);
    expect(s.clearing).toBeNull();
    expect(s.wallIndex).toBe(1);
    expect(s.bricks).toHaveLength(1);
    expect(s.bricks[0]).toMatchObject({ slot: 0, number: 1 });
    // Wall 2: brick 1 landed, brick 2 falling.
    const t = wallState(71.5, 16);
    expect(t.bricks.map((b) => b.number)).toEqual([1, 2]);
  });

  it("supports 32-brick walls", () => {
    expect(wallState(64.5, 32).clearing).toBeNull();
    expect(wallState(64.5, 32).bricks).toHaveLength(16);
    expect(wallState(128.5, 32).bricks).toHaveLength(32);
    expect(wallState(128.5, 32).clearing).not.toBeNull();
    expect(wallState(131.5, 32).bricks[0].number).toBe(1);
  });
});

describe("count-in", () => {
  it("keeps the wall empty for the count-in bar, then builds as normal", () => {
    // With one bar of count-in, beats 0-3.99 are the count-in.
    expect(wallBeat(2, 1)).toBeLessThan(0);
    expect(wallState(wallBeat(3.5, 1), 16).bricks).toHaveLength(0);
    // Beat 4 of the first wall bar (overall beat 7.5): brick 1 falling.
    expect(wallState(wallBeat(7.5, 1), 16).bricks[0]).toMatchObject({ number: 1, fall: 0.5 });
    // ...and it lands on the next 1 (overall beat 8).
    expect(wallState(wallBeat(8, 1), 16).bricks[0].fall).toBe(1);
  });

  it("with count-in off, the wall starts right away", () => {
    expect(wallBeat(3.5, 0)).toBe(3.5);
    expect(wallState(wallBeat(3.5, 0), 16).bricks).toHaveLength(1);
  });
});
