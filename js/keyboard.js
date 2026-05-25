// keyboard.js — floating SVG piano. No border, no panel.
// State system: each key can be tagged with multiple states simultaneously:
//   .playing    - blue, user is holding this note via MIDI/tap
//   .correct    - amber, user is playing this as part of a recognized chord
//   .wrong      - red flash, user played this note but it's outside the strict target
//   .target     - faint indicator (only used outside strict mode if needed)
// State methods are independent so the UI can layer them.

const Keyboard = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function isBlack(n) { return [1,3,6,8,10].includes(((n % 12) + 12) % 12); }
  function noteLabel(n) {
    const names = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
    return `${names[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
  }

  function create({ container, low = 36, high = 84, onPress, onRelease, labels = 'octaves' }) {
    const wrapper = typeof container === 'string' ? document.querySelector(container) : container;
    if (!wrapper) return null;
    wrapper.innerHTML = '';

    const VB_W = 1400;
    const VB_H = 240;
    let whiteCount = 0;
    for (let n = low; n <= high; n++) if (!isBlack(n)) whiteCount++;
    const whiteW = VB_W / whiteCount;
    const blackW = whiteW * 0.58;
    const blackH = VB_H * 0.62;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('piano-svg');
    wrapper.appendChild(svg);

    const keyEls = new Map();
    const centers = new Map();

    // Draw white keys
    let wi = 0;
    for (let n = low; n <= high; n++) {
      if (isBlack(n)) continue;
      const x = wi * whiteW;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x + 1);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', Math.max(0, whiteW - 2));
      rect.setAttribute('height', VB_H);
      rect.setAttribute('rx', 4);
      rect.setAttribute('class', 'kb-white');
      rect.dataset.midi = n;
      svg.appendChild(rect);
      keyEls.set(n, rect);
      centers.set(n, { cx: x + whiteW / 2, black: false, x, w: whiteW });

      if (labels === 'octaves' && n % 12 === 0) {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', x + whiteW / 2);
        t.setAttribute('y', VB_H - 12);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('class', 'kb-label');
        t.textContent = noteLabel(n);
        svg.appendChild(t);
      }
      wi++;
    }
    // Draw black keys on top
    for (let n = low; n <= high; n++) {
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
      centers.set(n, { cx, black: true, x, w: blackW });
    }

    // Pointer handlers
    if (onPress || onRelease) {
      keyEls.forEach((el, midi) => {
        const press = (ev) => { ev.preventDefault(); onPress && onPress(midi); };
        const release = (ev) => { ev && ev.preventDefault && ev.preventDefault(); onRelease && onRelease(midi); };
        el.addEventListener('pointerdown', press);
        el.addEventListener('pointerup', release);
        el.addEventListener('pointerleave', release);
        el.addEventListener('pointercancel', release);
      });
    }

    function setState(midiSet, className) {
      keyEls.forEach((el, midi) => {
        el.classList.toggle(className, midiSet.has(midi));
      });
    }
    function flashWrong(midi) {
      const el = keyEls.get(midi);
      if (!el) return;
      el.classList.add('wrong');
      setTimeout(() => el.classList.remove('wrong'), 600);
    }
    function clearAllStates() {
      keyEls.forEach(el => {
        el.classList.remove('playing', 'correct', 'wrong', 'target');
      });
    }

    return {
      setPlaying: (set) => setState(set, 'playing'),
      setCorrect: (set) => setState(set, 'correct'),
      setTarget:  (set) => setState(set, 'target'),
      flashWrong,
      clearAllStates,
      getCenter: (midi) => centers.get(midi),
      getSvg: () => svg,
      vbWidth: () => VB_W,
      range: () => ({ low, high }),
    };
  }

  return { create, isBlack, noteLabel };
})();

if (typeof window !== 'undefined') window.Keyboard = Keyboard;
