// keyboard.js — SVG piano keybed component.
// Reusable: create() returns an instance bound to a container element.
// Default range C2 (36) → C6 (84), 49 keys. Smaller ranges supported for mini-keyboards.

const Keyboard = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function isBlack(n) { return [1,3,6,8,10].includes(((n % 12) + 12) % 12); }
  function noteLabel(n) {
    const names = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
    return `${names[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
  }

  function create({ container, low = 36, high = 84, onPress, onRelease, showLabels = true }) {
    const wrapper = typeof container === 'string' ? document.querySelector(container) : container;
    if (!wrapper) return null;
    wrapper.innerHTML = '';

    const VB_W = 1200;
    const VB_H = 220;
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

    let wi = 0;
    for (let n = low; n <= high; n++) {
      if (isBlack(n)) continue;
      const x = wi * whiteW;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', Math.max(0, whiteW - 1.5));
      rect.setAttribute('height', VB_H);
      rect.setAttribute('rx', 3);
      rect.setAttribute('class', 'kb-white');
      rect.dataset.midi = n;
      svg.appendChild(rect);
      keyEls.set(n, rect);
      centers.set(n, { cx: x + whiteW / 2, black: false });

      if (showLabels && n % 12 === 0) {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', x + whiteW / 2);
        t.setAttribute('y', VB_H - 10);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('class', 'kb-label');
        t.textContent = noteLabel(n);
        svg.appendChild(t);
      }
      wi++;
    }

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
      centers.set(n, { cx, black: true });
    }

    // Pointer handlers — work for mouse and touch
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

    function setActive(set) {
      keyEls.forEach((el, midi) => el.classList.toggle('active', set.has(midi)));
    }
    function setHints(set) {
      keyEls.forEach((el, midi) => el.classList.toggle('hint', set.has(midi)));
    }
    function clearHints() {
      keyEls.forEach(el => el.classList.remove('hint'));
    }
    function getCenter(midi) { return centers.get(midi); }
    function vbWidth() { return VB_W; }
    function getSvg() { return svg; }
    function range() { return { low, high }; }

    return { setActive, setHints, clearHints, getCenter, vbWidth, getSvg, range };
  }

  return { create, isBlack, noteLabel };
})();

if (typeof window !== 'undefined') window.Keyboard = Keyboard;
