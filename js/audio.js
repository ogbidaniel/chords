// audio.js — pluggable synth layer.
// Default backend: Web Audio API oscillator with ADSR envelope.
// Future backends (Tone.js + samples, etc.) plug in via registerBackend().
// Mute state persisted in localStorage.

const Audio = (() => {
  const STORAGE_KEY = 'chords.audio.muted';
  let muted = localStorage.getItem(STORAGE_KEY) === '1';
  let backend = null;
  const backends = new Map();
  let backendKey = 'oscillator';
  const listeners = new Set();

  // ---- Default backend: Web Audio oscillator ----
  // Pleasant enough for chord previews. Stacked sine + triangle, light ADSR,
  // master gain capped so chords don't clip.
  function makeOscillatorBackend() {
    let ctx = null;
    let masterGain = null;
    const active = new Map(); // midi -> { osc, gain, releaseAt }

    function ensureCtx() {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.18;
      masterGain.connect(ctx.destination);
    }

    function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

    return {
      key: 'oscillator',
      label: 'Built-in synth',
      noteOn(midi, velocity = 100) {
        ensureCtx();
        if (ctx.state === 'suspended') ctx.resume();
        // Cut existing voice on same note
        if (active.has(midi)) this.noteOff(midi);

        const freq = midiToFreq(midi);
        const now = ctx.currentTime;
        // Two-oscillator voice: sine (fundamental) + triangle (2nd partial-ish)
        const oscA = ctx.createOscillator();
        const oscB = ctx.createOscillator();
        oscA.type = 'sine';
        oscB.type = 'triangle';
        oscA.frequency.value = freq;
        oscB.frequency.value = freq * 2.003;  // slight detune for warmth
        const gain = ctx.createGain();
        const mix = ctx.createGain();
        mix.gain.value = 0.7;
        gain.gain.setValueAtTime(0, now);
        const peak = 0.45 * (velocity / 127);
        gain.gain.linearRampToValueAtTime(peak, now + 0.01);     // attack
        gain.gain.exponentialRampToValueAtTime(peak * 0.6, now + 0.25); // decay to sustain
        oscA.connect(mix); oscB.connect(mix); mix.connect(gain); gain.connect(masterGain);
        oscA.start(now); oscB.start(now);
        active.set(midi, { oscA, oscB, gain, mix });
      },
      noteOff(midi) {
        if (!ctx) return;
        const v = active.get(midi);
        if (!v) return;
        const now = ctx.currentTime;
        // Release envelope — short tail
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(v.gain.gain.value, now);
        v.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        setTimeout(() => {
          try { v.oscA.stop(); v.oscB.stop(); } catch(e){}
        }, 300);
        active.delete(midi);
      },
      stopAll() {
        for (const m of [...active.keys()]) this.noteOff(m);
      },
    };
  }

  // ---- API ----

  function registerBackend(key, backendImpl) {
    backends.set(key, backendImpl);
  }

  function useBackend(key) {
    if (!backends.has(key)) return false;
    if (backend) backend.stopAll();
    backend = backends.get(key);
    backendKey = key;
    return true;
  }

  function listBackends() {
    return [...backends.entries()].map(([k, b]) => ({ key: k, label: b.label }));
  }

  function play(midi, velocity = 100) {
    if (muted || !backend) return;
    try { backend.noteOn(midi, velocity); } catch (e) { console.warn('audio noteOn failed', e); }
  }

  function stop(midi) {
    if (!backend) return;
    try { backend.noteOff(midi); } catch (e) {}
  }

  function playChord(midiArr, duration = 1200, velocity = 90) {
    if (muted) return;
    midiArr.forEach(m => play(m, velocity));
    setTimeout(() => midiArr.forEach(m => stop(m)), duration);
  }

  function stopAll() { if (backend) backend.stopAll(); }

  function setMuted(v) {
    muted = !!v;
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    if (muted) stopAll();
    listeners.forEach(fn => fn({ muted, backend: backendKey }));
  }
  function isMuted() { return muted; }
  function toggleMuted() { setMuted(!muted); return muted; }
  function onChange(fn) { listeners.add(fn); }

  // Bootstrap with the oscillator backend
  registerBackend('oscillator', makeOscillatorBackend());
  useBackend('oscillator');

  return {
    play, stop, playChord, stopAll,
    setMuted, isMuted, toggleMuted, onChange,
    registerBackend, useBackend, listBackends,
  };
})();

if (typeof window !== 'undefined') window.Audio = Audio;
