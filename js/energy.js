// energy.js — velocity-driven atmospheric energy.
// Subscribes to MIDI globally; computes a decaying energy value;
// writes --energy and quality classes to <body>.

const Energy = (() => {
  let energy = 0;        // 0..1
  let lastTickAt = 0;
  let rafId = null;
  const HALF_LIFE = 1800; // ms — energy halves every 1.8s of silence
  const VELOCITY_GAIN = 0.012; // a velocity-127 hit pushes energy up by ~1.5

  function pump(velocity) {
    // Velocity 0..127 → bump
    energy = Math.min(1.5, energy + velocity * VELOCITY_GAIN);
  }

  function step(now) {
    const dt = lastTickAt ? now - lastTickAt : 16;
    lastTickAt = now;

    // Held notes also keep energy from decaying fully — sustain via max-of-held-velocities
    const sounding = MIDI.getSounding();
    if (sounding.size > 0) {
      // Compute average velocity of currently held notes as a floor
      let total = 0;
      for (const v of sounding.values()) total += v;
      const avg = total / sounding.size;
      const floor = (avg / 127) * 0.7;
      if (energy < floor) energy = floor;
    }

    // Exponential decay
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
