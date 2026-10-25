/**
 * Film-leader countdown circle (old-school black & white "academy leader").
 *
 * Each beat, the dark wedge sweeps once clockwise from 12 o'clock, and the
 * big number shows the beat in the bar (counting up 1 to 4). It's drawn
 * entirely in code: rings, crosshairs, vignette, grain and the odd scratch.
 */

interface Speck {
  x: number;
  y: number;
  r: number;
  life: number;
}

export class Leader {
  private specks: Speck[] = [];
  private scratchX = -1;
  private scratchLife = 0;
  private flicker = 1;

  draw(
    g: CanvasRenderingContext2D,
    w: number,
    h: number,
    count: number,
    phase: number,
    running: boolean,
  ): void {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.42; // outer ring radius
    const far = Math.hypot(w, h);

    // Gentle projector flicker while running.
    if (running && Math.random() < 0.25) this.flicker = 0.95 + Math.random() * 0.07;
    const f = running ? this.flicker : 1;
    const shade = (v: number) => {
      const c = Math.round(Math.min(255, v * f));
      return `rgb(${c},${c},${c})`;
    };

    // Base: light grey field.
    g.fillStyle = shade(200);
    g.fillRect(0, 0, w, h);

    // Swept wedge: darker grey from 12 o'clock clockwise to the hand.
    const start = -Math.PI / 2;
    const end = start + phase * Math.PI * 2;
    if (phase > 0) {
      g.fillStyle = shade(118);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, far, start, end);
      g.closePath();
      g.fill();
    }

    // The sweep hand: a thin dark line from the centre to the edge.
    g.strokeStyle = shade(60);
    g.lineWidth = Math.max(1.5, R * 0.012);
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(end) * far, cy + Math.sin(end) * far);
    g.stroke();

    // Crosshairs.
    g.strokeStyle = shade(45);
    g.lineWidth = Math.max(1, R * 0.008);
    g.beginPath();
    g.moveTo(0, cy);
    g.lineTo(w, cy);
    g.moveTo(cx, 0);
    g.lineTo(cx, h);
    g.stroke();

    // Two white rings.
    g.strokeStyle = shade(250);
    g.lineWidth = R * 0.045;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = R * 0.03;
    g.beginPath();
    g.arc(cx, cy, R * 0.86, 0, Math.PI * 2);
    g.stroke();

    // The big number.
    g.fillStyle = shade(12);
    g.font = `700 ${Math.round(R * 1.15)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    // Nudge down a little: font metrics sit high.
    g.fillText(String(count), cx, cy + R * 0.06);

    // Vignette.
    const vg = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, Math.hypot(w, h) * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.78)");
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);

    if (running) this.drawDirt(g, w, h);
  }

  private drawDirt(g: CanvasRenderingContext2D, w: number, h: number): void {
    // Dust specks that live a few frames.
    if (Math.random() < 0.3) {
      this.specks.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 2.2,
        life: 2 + Math.floor(Math.random() * 4),
      });
    }
    g.fillStyle = "rgba(10,10,10,0.75)";
    for (const s of this.specks) {
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      g.fill();
      s.life--;
    }
    this.specks = this.specks.filter((s) => s.life > 0);

    // An occasional vertical scratch.
    if (this.scratchLife <= 0 && Math.random() < 0.01) {
      this.scratchX = Math.random() * w;
      this.scratchLife = 6 + Math.floor(Math.random() * 12);
    }
    if (this.scratchLife > 0) {
      this.scratchX += (Math.random() - 0.5) * 2;
      g.strokeStyle = "rgba(235,235,235,0.35)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(this.scratchX, 0);
      g.lineTo(this.scratchX + (Math.random() - 0.5) * 3, h);
      g.stroke();
      this.scratchLife--;
    }

    // Fine grain.
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 60; i++) {
      g.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
    }
  }
}
