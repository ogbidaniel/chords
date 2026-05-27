// atmosphere.js — canvas-based ambient background driven by MIDI pitch classes.
// Each of the 12 pitch classes owns a large soft blob; held notes bring their
// blob to life. screen compositing stacks them into the multi-colour shift look.

const Atmosphere = (() => {

  // ── Colours ───────────────────────────────────────────────────────────────
  // Brightened for screen-blending on near-black. Hues match the --pc-* keys.
  const PC_RGB = [
    [240,  70,  70],   //  0  C   red
    [200,  40, 120],   //  1  C#  magenta
    [240, 130,  30],   //  2  D   orange
    [110,  70, 210],   //  3  Eb  indigo
    [245, 215,  50],   //  4  E   yellow
    [235,  80, 140],   //  5  F   rose
    [ 60, 185,  75],   //  6  F#  green
    [245, 150,  25],   //  7  G   amber
    [ 40, 130, 230],   //  8  Ab  blue
    [250, 175,  45],   //  9  A   gold
    [145,  50, 200],   // 10  Bb  purple
    [110, 200, 120],   // 11  B   spring green
  ];

  // ── Blob layout — circle-of-fifths order around an ellipse ────────────────
  // Neighbouring fifths share canvas-space so common voice-leading has
  // adjacent colours. The ellipse fills most of the viewport.
  const COF = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

  let canvas, ctx;
  let W = 0, H = 0;
  const blobs = [];
  let rafId = null;

  // ── Build / rebuild blobs after resize ────────────────────────────────────
  function rebuild() {
    const prev = new Map(blobs.map(b => [b.pc, b]));
    blobs.length = 0;

    COF.forEach((pc, i) => {
      const angle  = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const homeX  = W * (0.5 + Math.cos(angle) * 0.40);
      const homeY  = H * (0.5 + Math.sin(angle) * 0.37);
      const old    = prev.get(pc);

      blobs.push({
        pc,
        x:      old ? old.x  : homeX,
        y:      old ? old.y  : homeY,
        vx:     old ? old.vx : (Math.random() - 0.5) * 0.12,
        vy:     old ? old.vy : (Math.random() - 0.5) * 0.12,
        homeX,
        homeY,
        r:      Math.hypot(W, H) * 0.54,   // large: each blob covers ~half the screen
        alpha:  old ? old.alpha  : 0,
        target: old ? old.target : 0,
        pulse:  0,
      });
    });
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    rebuild();
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  function frame() {
    // Near-black base every frame
    ctx.fillStyle = '#08080d';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'screen';

    for (const b of blobs) {
      // Gentle drift toward home position
      b.vx += (b.homeX - b.x) * 0.00028 + (Math.random() - 0.5) * 0.032;
      b.vy += (b.homeY - b.y) * 0.00028 + (Math.random() - 0.5) * 0.032;
      b.vx *= 0.975;
      b.vy *= 0.975;
      b.x  += b.vx;
      b.y  += b.vy;

      // Smooth alpha towards target; pulse decays quickly
      b.alpha += (b.target - b.alpha) * 0.045;
      b.pulse *= 0.88;

      const a = Math.min(1, b.alpha + b.pulse);
      if (a < 0.004) continue;

      const [r, g, bl] = PC_RGB[b.pc];

      // Multi-stop gradient: very soft gaussian-like falloff
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grad.addColorStop(0.00, `rgba(${r},${g},${bl},${(a * 0.75).toFixed(3)})`);
      grad.addColorStop(0.22, `rgba(${r},${g},${bl},${(a * 0.58).toFixed(3)})`);
      grad.addColorStop(0.48, `rgba(${r},${g},${bl},${(a * 0.28).toFixed(3)})`);
      grad.addColorStop(0.72, `rgba(${r},${g},${bl},${(a * 0.09).toFixed(3)})`);
      grad.addColorStop(0.90, `rgba(${r},${g},${bl},${(a * 0.02).toFixed(3)})`);
      grad.addColorStop(1.00, `rgba(${r},${g},${bl},0)`);

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    rafId = requestAnimationFrame(frame);
  }

  // ── MIDI callbacks ────────────────────────────────────────────────────────
  function onNoteOn(midi, velocity) {
    const pc = midi % 12;
    const b  = blobs.find(b => b.pc === pc);
    // Velocity-scaled attack pulse — snappy brightness on the hit
    if (b) b.pulse = (velocity / 127) * 0.42;
  }

  function onChange(sounding) {
    const active = new Set();
    for (const [midi] of sounding) active.add(midi % 12);
    for (const b of blobs) {
      b.target = active.has(b.pc) ? 0.60 : 0;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  function start() {
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    // Behind all UI (z-index 0), fixed, no pointer events
    canvas.style.cssText =
      'position:fixed;top:0;left:0;pointer-events:none;z-index:0;display:block;';
    document.body.insertBefore(canvas, document.body.firstChild);

    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    MIDI.on('noteOn', onNoteOn);
    MIDI.on('change',  onChange);

    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    window.removeEventListener('resize', resize);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  return { start, stop };
})();

if (typeof window !== 'undefined') window.Atmosphere = Atmosphere;
