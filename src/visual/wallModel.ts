/**
 * Wall model: works out what the brick wall looks like at any beat position.
 *
 * It's stateless: the picture is computed from the beat alone, so it can
 * never drift from the audio.
 *
 *  - The brick for bar b (0-based) starts falling when beat 4 of that bar
 *    begins and lands exactly on the next downbeat.
 *  - Bricks are numbered by bar and keep counting across walls (1, 2, ... 17 ...).
 *  - When a wall's last brick lands, the wall clears during beats 1-3 of the
 *    next bar, so the next wall's first brick still lands on time.
 */
import { BEATS_PER_BAR } from "../audio/timeline";

export const CLEAR_BEATS = 3;
export const FALL_START = 3; // beat-in-bar when a brick starts falling (beat "4")

export interface BrickState {
  slot: number; // 0-based position in the wall
  number: number; // bar number printed on the brick
  /** 0..1 fall progress; 1 = landed. */
  fall: number;
  /** Beats since landing (for the small landing squash); Infinity if long ago. */
  sinceLand: number;
}

export interface WallState {
  wallIndex: number;
  bricks: BrickState[];
  /** 0..1 clear progress, or null if not clearing. */
  clearing: number | null;
}

export function wallState(beat: number, perWall: number): WallState {
  const p = Math.max(0, beat);
  const bar = Math.floor(p / BEATS_PER_BAR);
  const inBar = p - bar * BEATS_PER_BAR;

  // Just finished a wall: show it full while it clears.
  if (bar > 0 && bar % perWall === 0 && inBar < CLEAR_BEATS) {
    const wallIndex = bar / perWall - 1;
    const bricks: BrickState[] = [];
    for (let slot = 0; slot < perWall; slot++) {
      bricks.push({
        slot,
        number: wallIndex * perWall + slot + 1,
        fall: 1,
        sinceLand: slot === perWall - 1 ? inBar : Infinity,
      });
    }
    return { wallIndex, bricks, clearing: inBar / CLEAR_BEATS };
  }

  const wallIndex = Math.floor(bar / perWall);
  const landed = bar - wallIndex * perWall; // bricks already landed in this wall
  const bricks: BrickState[] = [];
  for (let slot = 0; slot < landed; slot++) {
    bricks.push({
      slot,
      number: wallIndex * perWall + slot + 1,
      fall: 1,
      sinceLand: slot === landed - 1 ? inBar : Infinity,
    });
  }
  if (inBar >= FALL_START) {
    bricks.push({
      slot: landed,
      number: wallIndex * perWall + landed + 1,
      fall: inBar - FALL_START,
      sinceLand: Infinity,
    });
  }
  return { wallIndex, bricks, clearing: null };
}
