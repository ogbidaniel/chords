// keyboard.js — SVG piano keys.
// States: .playing (blue, anything the user is pressing) and .match (amber,
// when that note also matches an expected note in the current drill).
// No "wrong" state — there are no errors.

const Keyboard = (() => {
  function create({ container, low = 36, high = 84, onPress, onRelease }) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return null;
    el.innerHTML = '';

    // Whites only in this range
    const whitePcs = new Set([0, 2, 4, 5, 7, 9, 11]);
    const whites = [];
    const blacks = [];
    for (let m = low; m <= high; m++) {
      const pc = ((m % 12) + 12) % 12;
      if (whitePcs.has(pc)) whites.push(m);
      else blacks.push(m);
    }

    const W = 100;
    const totalW = whites.length * W;
    const totalH = 480;
    const blackH = totalH * 0.62;
    const blackW = W * 0.58;

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'piano-svg');
    svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const keyByMidi = new Map();

    // Whites
    whites.forEach((m, i) => {
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('class', 'kb-white');
      rect.setAttribute('x', i * W);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', W);
      rect.setAttribute('height', totalH);
      rect.setAttribute('rx', 3);
      rect.dataset.midi = m;
      bindPointer(rect, m);
      svg.appendChild(rect);
      keyByMidi.set(m, rect);

      // C labels
      if ((m % 12) === 0) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('class', 'kb-label');
        t.setAttribute('x', i * W + W / 2);
        t.setAttribute('y', totalH - 18);
        t.setAttribute('text-anchor', 'middle');
        t.textContent = 'C' + (Math.floor(m / 12) - 1);
        svg.appendChild(t);
      }
    });

    // Blacks
    blacks.forEach(m => {
      const whiteBelow = m - 1;
      const idx = whites.indexOf(whiteBelow);
      if (idx < 0) return;
      const x = (idx + 1) * W - blackW / 2;
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('class', 'kb-black');
      rect.setAttribute('x', x);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', blackW);
      rect.setAttribute('height', blackH);
      rect.setAttribute('rx', 2);
      rect.dataset.midi = m;
      bindPointer(rect, m);
      svg.appendChild(rect);
      keyByMidi.set(m, rect);
    });

    function bindPointer(rect, midi) {
      let down = false;
      rect.addEventListener('pointerdown', e => {
        e.preventDefault();
        down = true;
        rect.setPointerCapture(e.pointerId);
        onPress && onPress(midi);
      });
      const release = () => { if (down) { down = false; onRelease && onRelease(midi); } };
      rect.addEventListener('pointerup', release);
      rect.addEventListener('pointercancel', release);
      rect.addEventListener('pointerleave', release);
    }

    el.appendChild(svg);

    return {
      // sounding: Map<midi, velocity>
      setPlaying(sounding) {
        for (const [m, rect] of keyByMidi) {
          rect.classList.toggle('playing', sounding.has(m));
        }
      },
      // matchSet: Set<midi> — notes that match the current drill prompt
      setMatch(matchSet) {
        for (const [m, rect] of keyByMidi) {
          rect.classList.toggle('match', matchSet.has(m));
        }
      },
      clear() {
        for (const rect of keyByMidi.values()) {
          rect.classList.remove('playing', 'match');
        }
      },
    };
  }

  return { create };
})();

if (typeof window !== 'undefined') window.Keyboard = Keyboard;
