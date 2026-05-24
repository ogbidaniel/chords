// keyboard.js — SVG piano keybed component.
// Range: MIDI 36 (C2) → 84 (C6) = 49 keys.

const Keyboard = (() => {
  const MIDI_LOW = 36, MIDI_HIGH = 84;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VB_W = 1200, VB_H = 220;

  function isBlack(n) { return [1, 3, 6, 8, 10].includes(((n % 12) + 12) % 12); }
  function noteLabel(n) {
    const names = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    return `${names[n % 12]}${Math.floor(n / 12) - 1}`;
  }

  function create({ container, onNoteTap }) {
    const wrapper = typeof container === 'string' ? document.querySelector(container) : container;
    wrapper.innerHTML = '';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('piano-svg');
    wrapper.appendChild(svg);

    let whiteCount = 0;
    for (let n = MIDI_LOW; n <= MIDI_HIGH; n++) if (!isBlack(n)) whiteCount++;
    const whiteW = VB_W / whiteCount;
    const whiteH = VB_H;
    const blackW = whiteW * 0.58;
    const blackH = VB_H * 0.62;

    const keyEls = new Map();   // midi -> rect
    const centers = new Map();  // midi -> {cx, black}

    // White keys first
    let wi = 0;
    for (let n = MIDI_LOW; n <= MIDI_HIGH; n++) {
      if (isBlack(n)) continue;
      const x = wi * whiteW;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', whiteW - 1.5);
      rect.setAttribute('height', whiteH);
      rect.setAttribute('rx', 3);
      rect.setAttribute('class', 'kb-white');
      rect.dataset.midi = n;
      svg.appendChild(rect);
      keyEls.set(n, rect);
      centers.set(n, { cx: x + whiteW / 2, black: false });

      // C-octave label
      if (n % 12 === 0) {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', x + whiteW / 2);
        t.setAttribute('y', whiteH - 10);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('class', 'kb-label');
        t.textContent = noteLabel(n);
        svg.appendChild(t);
      }
      wi++;
    }

    // Black keys on top
    for (let n = MIDI_LOW; n <= MIDI_HIGH; n++) {
      if (!isBlack(n)) continue;
      const below = n - 1;
      const cxBelow = centers.get(below)?.cx;
      if (cxBelow == null) continue;
      const cx = cxBelow + whiteW / 2;
      const x = cx - blackW / 2;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', blackW);
      rect.setAttribute('height', blackH);
      rect.setAttribute('rx', 3);
      rect.setAttribute('class', 'kb-black');
      rect.dataset.midi = n;
      svg.appendChild(rect);
      keyEls.set(n, rect);
      centers.set(n, { cx, black: true });
    }

    // Tap handlers for mobile / fallback play
    if (onNoteTap) {
      keyEls.forEach((el, midi) => {
        const press = (ev) => { ev.preventDefault(); onNoteTap(midi, true); };
        const release = () => onNoteTap(midi, false);
        el.addEventListener('pointerdown', press);
        el.addEventListener('pointerup', release);
        el.addEventListener('pointerleave', release);
        el.addEventListener('pointercancel', release);
      });
    }

    // ---- public API ----
    function setActive(soundingSet) {
      keyEls.forEach((el, midi) => {
        el.classList.toggle('active', soundingSet.has(midi));
      });
    }
    function setHints(hintSet) {
      keyEls.forEach((el, midi) => {
        el.classList.toggle('hint', hintSet.has(midi));
      });
    }
    function clearHints() {
      keyEls.forEach(el => el.classList.remove('hint'));
    }
    function getCenter(midi) { return centers.get(midi); }
    function getSvg() { return svg; }
    function vbWidth() { return VB_W; }
    function range() { return { low: MIDI_LOW, high: MIDI_HIGH }; }

    return { setActive, setHints, clearHints, getCenter, getSvg, vbWidth, range };
  }

  return { create, isBlack, noteLabel, MIDI_LOW, MIDI_HIGH };
})();
if (typeof window !== 'undefined') window.Keyboard = Keyboard;
