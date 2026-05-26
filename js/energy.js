// energy.js — velocity-driven atmospheric energy.
// Subscribes to MIDI globally; computes a decaying energy value;
// writes --energy and quality classes to <body>.

const Energy = (() => {
  let energy = 0;        // 0..1
  let lastTickAt = 0;
  let rafId = null;
  const HALF_LIFE = 900;   // ms — faster decay so silence settles quickly
  const VELOCITY_GAIN = 0.0035; // gentle — a forte note adds ~0.45, not a wallop
  const ENERGY_MAX = 0.85;  // ceiling — never fully saturate

  function pump(velocity) {
    energy = Math.min(ENERGY_MAX, energy + velocity * VELOCITY_GAIN);
  }

  function step(now) {
    const dt = lastTickAt ? now - lastTickAt : 16;
    lastTickAt = now;

    // Held notes set a soft floor so drift doesn't fully die while playing,
    // but the floor is much lower than the velocity-pump peak.
    const sounding = MIDI.getSounding();
    if (sounding.size > 0) {
      let total = 0;
      for (const v of sounding.values()) total += v;
      const avg = total / sounding.size;
      const floor = (avg / 127) * 0.30;  // was 0.70 — much lower
      if (energy < floor) energy = floor;
    }

    const decay = Math.pow(0.5, dt / HALF_LIFE);
    energy *= decay;
    if (energy < 0.005) energy = 0;

    document.body.style.setProperty('--energy', energy.toFixed(3));

    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (rafId) return;
    MIDI.on('noteOn', (m, v) => pump(v));
    MIDI.on('change', (sounding, lastV) => {
      // Update chord-quality class based on currently sounding notes
      updateQualityClass(sounding);
    });
    rafId = requestAnimationFrame(step);
  }
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function updateQualityClass(sounding) {
    const body = document.body;
    const classes = ['quality-major','quality-dominant','quality-minor','quality-half-dim','quality-dim'];
    classes.forEach(c => body.classList.remove(c));
    if (sounding.size < 2) return;
    const det = Theory.detectChord(sounding);
    if (!det) return;
    if (det.type === 'maj7' || det.type === 'maj') body.classList.add('quality-major');
    else if (det.type === '7') body.classList.add('quality-dominant');
    else if (det.type === 'm7' || det.type === 'm') body.classList.add('quality-minor');
    else if (det.type === 'm7b5') body.classList.add('quality-half-dim');
    else if (det.type === 'dim7' || det.type === 'dim') body.classList.add('quality-dim');
  }

  return { start, stop, getEnergy: () => energy };
})();

if (typeof window !== 'undefined') window.Energy = Energy;
