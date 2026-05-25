// metronome.js — soft brush metronome. No samples shipped; synthesized with
// filtered noise burst to mimic brushed hi-hat. Default 70 BPM.

const Metronome = (() => {
  let ctx = null;
  let bpm = 70;
  let running = false;
  let nextTick = 0;
  let timerId = null;
  let beatCount = 0;
  const listeners = new Set();

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // One brush hit: filtered white noise burst with quick exponential decay.
  function brushHit(time, accent = false) {
    if (!ctx) return;
    const dur = 0.08;
    const bufSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      // Pink-ish noise, decaying
      const t = i / bufSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) ** 2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    // Bandpass for brush character
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = accent ? 5500 : 4500;
    bp.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = accent ? 0.18 : 0.10;
    src.connect(bp).connect(gain).connect(ctx.destination);
    src.start(time);
  }

  function scheduler() {
    if (!running) return;
    const ahead = 0.1;
    while (nextTick < ctx.currentTime + ahead) {
      brushHit(nextTick, beatCount % 4 === 0);
      // Notify listeners on the main thread for visual sync
      const beatNum = beatCount;
      const fireAt = nextTick;
      setTimeout(() => {
        listeners.forEach(fn => fn(beatNum));
      }, Math.max(0, (fireAt - ctx.currentTime) * 1000));
      beatCount++;
      nextTick += 60 / bpm;
    }
    timerId = setTimeout(scheduler, 25);
  }

  function start() {
    ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();
    if (running) return;
    running = true;
    beatCount = 0;
    nextTick = ctx.currentTime + 0.05;
    scheduler();
  }
  function stop() {
    running = false;
    if (timerId) { clearTimeout(timerId); timerId = null; }
  }
  function toggle() { if (running) stop(); else start(); return running; }
  function isRunning() { return running; }
  function setBpm(n) {
    bpm = Math.max(20, Math.min(300, Math.round(n)));
    return bpm;
  }
  function getBpm() { return bpm; }
  function onBeat(fn) { listeners.add(fn); }

  return { start, stop, toggle, isRunning, setBpm, getBpm, onBeat };
})();

if (typeof window !== 'undefined') window.Metronome = Metronome;
