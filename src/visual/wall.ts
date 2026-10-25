/**
 * Brick wall renderer. Draws whatever wallState() says for this instant.
 */
import { WallState } from "./wallModel";

/** 16 distinct, classic toy-brick colours (one per position in the wall). */
export const BRICK_COLORS = [
  "#C91A09", // red
  "#0055BF", // blue
  "#F2CD37", // yellow
  "#237841", // green
  "#FE8A18", // orange
  "#923978", // magenta
  "#36AEBF", // medium azure
  "#BBE90B", // lime
  "#E4ADC8", // bright pink
  "#0A3463", // dark blue
  "#E4CD9E", // tan
  "#720E0F", // dark red
  "#AC78BA", // lavender
  "#A0BCAC", // sand green
  "#582A12", // reddish brown
  "#F4F4F4", // white
];

const COLS = 4;

function textColorFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 150 ? "#1a1a1a" : "#ffffff";
}

function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export class WallRenderer {
  draw(g: CanvasRenderingContext2D, w: number, h: number, state: WallState, perWall: number): void {
    // Background.
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0d0d0f");
    bg.addColorStop(1, "#1c1d21");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    const rows = Math.ceil(perWall / COLS);
    const pad = Math.max(10, w * 0.04);
    const plateH = Math.max(8, h * 0.035);
    const usableH = h - plateH - pad * 1.6;
    let bw = (w - pad * 2) / COLS;
    let bh = Math.min(usableH / rows, bw * 0.5);
    if (bh < bw * 0.3) bw = Math.min(bw, bh / 0.3); // keep bricks brick-shaped
    const wallW = bw * COLS;
    const x0 = (w - wallW) / 2;
    const base = h - plateH;

    // Baseplate.
    g.fillStyle = "#4b4f55";
    g.fillRect(x0 - bw * 0.15, base, wallW + bw * 0.3, plateH);
    g.fillStyle = "#5c6168";
    const studW = bw * 0.16;
    for (let i = 0; i < COLS * 4 + 1; i++) {
      const sx = x0 - bw * 0.1 + i * (bw / 4) + bw / 8 - studW / 2;
      g.fillRect(sx, base - plateH * 0.35, studW, plateH * 0.35);
    }

    const clearing = state.clearing;
    const clearBeats = clearing === null ? 0 : clearing * 3;
    const flashPhase = clearing !== null && clearBeats < 1;
    const flashOn = flashPhase && Math.floor(clearBeats * 4) % 2 === 0;

    for (const b of state.bricks) {
      const row = Math.floor(b.slot / COLS);
      const col = b.slot % COLS;
      const x = x0 + col * bw; // stacked straight up, no offset
      const targetY = base - (row + 1) * bh;
      const startY = -bh * 1.6;
      const y = startY + (targetY - startY) * b.fall * b.fall; // falls like gravity

      let alpha = 1;
      let scaleY = 1;
      let white = flashOn;
      if (clearing !== null && !flashPhase) {
        // Rows go white and fade out bottom-to-top, like a Tetris line clear.
        const local = (clearBeats - 1) / 2; // 0..1 over the last two beats
        const per = 1 / rows;
        const t = Math.min(1, Math.max(0, (local - row * per * 0.6) / (per * 1.6)));
        if (t >= 1) continue;
        white = t > 0;
        alpha = 1 - t;
        scaleY = 1 - 0.5 * t;
      }
      if (b.sinceLand < 0.15) scaleY = 1 - 0.1 * (1 - b.sinceLand / 0.15); // landing squash

      const color = BRICK_COLORS[b.slot % BRICK_COLORS.length];
      this.drawBrick(g, x, y, bw, bh, color, b.number, alpha, scaleY, white);
    }
  }

  private drawBrick(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    bw: number,
    bh: number,
    color: string,
    number: number,
    alpha: number,
    scaleY: number,
    white: boolean,
  ): void {
    const gap = Math.max(1, bw * 0.012);
    const fill = white ? "#ffffff" : color;
    g.save();
    g.globalAlpha = alpha;
    // Scale about the brick's bottom-centre.
    g.translate(x + bw / 2, y + bh);
    g.scale(1, scaleY);
    g.translate(-bw / 2, -bh);

    const bodyY = bh * 0.18;
    const bodyH = bh - bodyY - gap;
    const studW = bw * 0.14;
    const studH = bodyY + 1;

    // Studs.
    for (let i = 0; i < 4; i++) {
      const sx = (i + 0.5) * (bw / 4) - studW / 2;
      g.fillStyle = white ? "#ffffff" : shadeHex(color, -0.06);
      roundRect(g, sx, 0, studW, studH, Math.min(3, studW * 0.2));
      g.fill();
      if (!white) {
        g.fillStyle = shadeHex(color, 0.12);
        g.fillRect(sx + studW * 0.15, 1, studW * 0.18, studH - 2);
      }
    }

    // Body.
    g.fillStyle = fill;
    roundRect(g, gap, bodyY, bw - gap * 2, bodyH, Math.min(5, bw * 0.04));
    g.fill();
    if (!white) {
      // Top highlight and bottom shade for a moulded-plastic look.
      g.fillStyle = shadeHex(color, 0.14);
      g.fillRect(gap * 2, bodyY + 1, bw - gap * 4, Math.max(1.5, bodyH * 0.1));
      g.fillStyle = shadeHex(color, -0.18);
      g.fillRect(gap * 2, bodyY + bodyH * 0.84, bw - gap * 4, bodyH * 0.16 - 1);

      // The bar number.
      g.fillStyle = textColorFor(color);
      g.font = `800 ${Math.round(bodyH * 0.58)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(String(number), bw / 2, bodyY + bodyH * 0.5);
    }
    g.restore();
  }
}
