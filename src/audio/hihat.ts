/**
 * Synthesized foot hi-hat "chick", rendered once into an AudioBuffer.
 *
 * Playing a pre-rendered buffer is sample-accurate and cheap, and there's
 * no sample file to license or download.
 */

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export async function renderHiHat(sampleRate: number): Promise<AudioBuffer> {
  const len = 0.12;
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * len), sampleRate);
  const noise = noiseBuffer(ctx, len);
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);

  // 1) Bright metallic sizzle: high-passed noise, fast decay.
  const n1 = ctx.createBufferSource();
  n1.buffer = noise;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 9500;
  bp.Q.value = 0.8;
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0, 0);
  g1.gain.linearRampToValueAtTime(1, 0.001);
  g1.gain.exponentialRampToValueAtTime(0.001, 0.055);
  n1.connect(hp).connect(bp).connect(g1).connect(out);

  // 2) Metallic partials (classic inharmonic square-wave cluster).
  const metal = ctx.createGain();
  metal.gain.setValueAtTime(0, 0);
  metal.gain.linearRampToValueAtTime(0.25, 0.001);
  metal.gain.exponentialRampToValueAtTime(0.001, 0.04);
  const mHp = ctx.createBiquadFilter();
  mHp.type = "highpass";
  mHp.frequency.value = 8000;
  metal.connect(mHp).connect(out);
  for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 40 * r * 1.6;
    const og = ctx.createGain();
    og.gain.value = 1 / 6;
    o.connect(og).connect(metal);
    o.start(0);
    o.stop(len);
  }

  // 3) The "chick": short mid-range body of the two cymbals closing.
  const n2 = ctx.createBufferSource();
  n2.buffer = noise;
  const body = ctx.createBiquadFilter();
  body.type = "bandpass";
  body.frequency.value = 1100;
  body.Q.value = 1.2;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0, 0);
  g2.gain.linearRampToValueAtTime(0.55, 0.002);
  g2.gain.exponentialRampToValueAtTime(0.001, 0.025);
  n2.connect(body).connect(g2).connect(out);

  n1.start(0);
  n2.start(0);
  return ctx.startRendering();
}
