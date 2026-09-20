// صدای محیطی پرواز (باد و موتور) که کاملاً با WebAudio ساخته می‌شود؛ فایل صوتی لازم نیست.
export function createAudio() {
  let ctx = null, master = null, windGain = null, windFilter = null, engGain = null, engFilter = null;
  let on = false;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

    // باد: نویز قهوه‌ای از فیلتر بین‌گذر
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; ch[i] = last * 3.5; }
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0.075;
    noise.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
    noise.start();

    // موتور: دو موج دندانه‌ای کمی ناکوک از فیلتر پایین‌گذر
    engFilter = ctx.createBiquadFilter(); engFilter.type = 'lowpass'; engFilter.frequency.value = 260;
    engGain = ctx.createGain(); engGain.gain.value = 0.095;
    [62, 64.3].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(engFilter); o.start(); });
    engFilter.connect(engGain); engGain.connect(master);
    return true;
  }

  return {
    async enable() {
      if (!ctx && !build()) return false;
      await ctx.resume();
      master.gain.setTargetAtTime(0.68, ctx.currentTime, 0.5);
      on = true; return true;
    },
    disable() {
      if (!ctx) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      on = false;
    },
    get enabled() { return on; },
    update(speed, cloud) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      windGain.gain.setTargetAtTime(0.075 + speed * 0.16 + cloud * 0.08, t, 0.15);
      windFilter.frequency.setTargetAtTime(420 + speed * 900 + cloud * 300, t, 0.2);
      engGain.gain.setTargetAtTime(0.09 + speed * 0.06, t, 0.2);
      engFilter.frequency.setTargetAtTime(240 + speed * 120, t, 0.3);
    },
    dispose() { try { if (ctx) ctx.close(); } catch (e) { /* ignore */ } },
  };
}
