import { describe, expect, it } from "vitest";
import { wallState } from "../src/visual/wallModel";

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

  it("keeps counting on the next wall", () => {
    // Beat 67.5: beat 4 of bar 17 -> brick 17 falling into wall 2.
    const s = wallState(67.5, 16);
    expect(s.clearing).toBeNull();
    expect(s.wallIndex).toBe(1);
    expect(s.bricks).toHaveLength(1);
    expect(s.bricks[0]).toMatchObject({ slot: 0, number: 17 });
    // Brick 17 landed, brick 18 falling.
    const t = wallState(71.5, 16);
    expect(t.bricks.map((b) => b.number)).toEqual([17, 18]);
  });

  it("supports 32-brick walls", () => {
    expect(wallState(64.5, 32).clearing).toBeNull();
    expect(wallState(64.5, 32).bricks).toHaveLength(16);
    expect(wallState(128.5, 32).bricks).toHaveLength(32);
    expect(wallState(128.5, 32).clearing).not.toBeNull();
    expect(wallState(131.5, 32).bricks[0].number).toBe(33);
  });
});
