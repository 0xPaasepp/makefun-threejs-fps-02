let ctx = null,
  muted = false;
export function startAudio(silent = false) {
  muted = silent;
  if (!silent) {
    ctx ||= new AudioContext();
    ctx.resume();
  }
}
export function sound(kind, volume = 0.15) {
  if (!ctx || muted) return;
  const t = ctx.currentTime,
    g = ctx.createGain();
  g.connect(ctx.destination);
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (kind === "gun" ? 0.13 : 0.16));
  if (kind === "gun" || kind === "blast") {
    const len = Math.floor(ctx.sampleRate * 0.15),
      b = ctx.createBuffer(1, len, ctx.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = ctx.createBufferSource(),
      f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = kind === "gun" ? 1800 : 450;
    n.buffer = b;
    n.connect(f);
    f.connect(g);
    n.start(t);
  } else {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(kind === "win" ? 540 : kind === "step" ? 80 : kind === "reload" ? 220 : 760, t);
    if (kind === "win") o.frequency.setValueAtTime(810, t + 0.08);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.18);
  }
}
