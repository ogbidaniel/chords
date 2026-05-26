// components/circle-of-fifths.js — reusable circle widget.
//
// Visual: major keys on the outer ring (top = C, clockwise = G, D, A, E, B, F#, then
// the flat side: Db, Ab, Eb, Bb, F back to C). Minor keys on the inner ring.
// Persistent highlight via setKeyHighlight(pc, mode). Momentary pulse via pulseAt(pc, mode).

const CircleOfFifths = (() => {
  // Clockwise from top: C, G, D, A, E, B, F#/Gb, Db, Ab, Eb, Bb, F
  const POSITIONS_MAJOR = [
    { pc: 0,  label: 'C',  flats: 0, sharps: 0 },
    { pc: 7,  label: 'G',  flats: 0, sharps: 1 },
    { pc: 2,  label: 'D',  flats: 0, sharps: 2 },
    { pc: 9,  label: 'A',  flats: 0, sharps: 3 },
    { pc: 4,  label: 'E',  flats: 0, sharps: 4 },
    { pc: 11, label: 'B',  flats: 0, sharps: 5 },
    { pc: 6,  label: 'F♯', flats: 0, sharps: 6 },
    { pc: 1,  label: 'D♭', flats: 5, sharps: 0 },
    { pc: 8,  label: 'A♭', flats: 4, sharps: 0 },
    { pc: 3,  label: 'E♭', flats: 3, sharps: 0 },
    { pc: 10, label: 'B♭', flats: 2, sharps: 0 },
    { pc: 5,  label: 'F',  flats: 1, sharps: 0 },
  ];
  // Relative minors (3 semitones down from major)
  const POSITIONS_MINOR = POSITIONS_MAJOR.map(p => ({
    pc: ((p.pc - 3) % 12 + 12) % 12,
    label: minorLabel(p.pc),
    flats: p.flats, sharps: p.sharps,
  }));
  function minorLabel(majorPc) {
    const map = { 0:'a', 7:'e', 2:'b', 9:'f♯', 4:'c♯', 11:'g♯', 6:'d♯', 1:'b♭', 8:'f', 3:'c', 10:'g', 5:'d' };
    return map[majorPc] || '?';
  }

  function create({ container, onSelect = null, size = 220 }) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return null;
    el.innerHTML = '';

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'cof-svg');

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.46;
    const innerR = size * 0.32;
    const ringMid = (outerR + innerR) / 2;

    // Background ring
    const ringBg = document.createElementNS(ns, 'circle');
    ringBg.setAttribute('cx', cx);
    ringBg.setAttribute('cy', cy);
    ringBg.setAttribute('r', ringMid);
    ringBg.setAttribute('class', 'cof-ring-bg');
    ringBg.setAttribute('fill', 'none');
    ringBg.setAttribute('stroke-width', (outerR - innerR));
    svg.appendChild(ringBg);

    const majorElsByPc = new Map();
    const minorElsByPc = new Map();
    const pulseElsByPc = new Map();

    POSITIONS_MAJOR.forEach((p, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2; // start at top
      const rMajor = (outerR + ringMid) / 2 + 4;
      const rMinor = (innerR + ringMid) / 2 - 4;

      // Pulse circle (behind label)
      const pulse = document.createElementNS(ns, 'circle');
      pulse.setAttribute('cx', cx + Math.cos(angle) * ringMid);
      pulse.setAttribute('cy', cy + Math.sin(angle) * ringMid);
      pulse.setAttribute('r', 12);
      pulse.setAttribute('class', 'cof-pulse');
      svg.appendChild(pulse);
      pulseElsByPc.set(p.pc + ':major', pulse);

      // Major label
      const tMaj = document.createElementNS(ns, 'text');
      tMaj.setAttribute('x', cx + Math.cos(angle) * rMajor);
      tMaj.setAttribute('y', cy + Math.sin(angle) * rMajor);
      tMaj.setAttribute('text-anchor', 'middle');
      tMaj.setAttribute('dominant-baseline', 'middle');
      tMaj.setAttribute('class', 'cof-major');
      tMaj.textContent = p.label;
      if (onSelect) {
        tMaj.style.cursor = 'pointer';
        tMaj.addEventListener('click', () => onSelect(p.pc, 'major'));
      }
      svg.appendChild(tMaj);
      majorElsByPc.set(p.pc, tMaj);

      // Minor label (inner ring, slightly offset)
      const mp = POSITIONS_MINOR[i];
      const tMin = document.createElementNS(ns, 'text');
      tMin.setAttribute('x', cx + Math.cos(angle) * rMinor);
      tMin.setAttribute('y', cy + Math.sin(angle) * rMinor);
      tMin.setAttribute('text-anchor', 'middle');
      tMin.setAttribute('dominant-baseline', 'middle');
      tMin.setAttribute('class', 'cof-minor');
      tMin.textContent = mp.label;
      if (onSelect) {
        tMin.style.cursor = 'pointer';
        tMin.addEventListener('click', () => onSelect(mp.pc, 'minor'));
      }
      svg.appendChild(tMin);
      minorElsByPc.set(mp.pc, tMin);

      // Minor pulse target
      const pulseMin = document.createElementNS(ns, 'circle');
      pulseMin.setAttribute('cx', cx + Math.cos(angle) * rMinor);
      pulseMin.setAttribute('cy', cy + Math.sin(angle) * rMinor);
      pulseMin.setAttribute('r', 9);
      pulseMin.setAttribute('class', 'cof-pulse cof-pulse-minor');
      svg.appendChild(pulseMin);
      pulseElsByPc.set(mp.pc + ':minor', pulseMin);
    });

    el.appendChild(svg);

    let activeMajorPc = null;
    let activeMinorPc = null;

    function setKeyHighlight(pc, mode) {
      // Clear previous
      if (activeMajorPc !== null) {
        const e = majorElsByPc.get(activeMajorPc);
        if (e) e.classList.remove('cof-active');
      }
      if (activeMinorPc !== null) {
        const e = minorElsByPc.get(activeMinorPc);
        if (e) e.classList.remove('cof-active');
      }
      activeMajorPc = activeMinorPc = null;

      if (pc == null) return;
      if (mode === 'minor' || mode === 'natural-minor') {
        const e = minorElsByPc.get(pc);
        if (e) { e.classList.add('cof-active'); activeMinorPc = pc; }
      } else {
        const e = majorElsByPc.get(pc);
        if (e) { e.classList.add('cof-active'); activeMajorPc = pc; }
      }
    }

    function pulseAt(pc, mode = 'major') {
      const key = pc + ':' + (mode === 'minor' || mode === 'natural-minor' ? 'minor' : 'major');
      const el = pulseElsByPc.get(key);
      if (!el) return;
      // Restart the animation: remove the class, force reflow, re-add
      el.classList.remove('cof-pulse-active');
      void el.getBBox();
      el.classList.add('cof-pulse-active');
    }

    function clearPulses() {
      for (const el of pulseElsByPc.values()) el.classList.remove('cof-pulse-active');
    }

    return { setKeyHighlight, pulseAt, clearPulses, element: svg };
  }

  return { create };
})();

if (typeof window !== 'undefined') window.CircleOfFifths = CircleOfFifths;
