// pages/practice/scales-hub.js — Scales hub.
// 24 preview tiles: 12 major + 12 minor.

const PageScalesHub = (() => {
  function render(params, mainEl) {
    // Order: cycle of fifths visual ordering (C, G, D, A, E, B, then flats)
    const majorOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
    const minorOrder = majorOrder.map(p => (p + 9) % 12); // relative minor

    mainEl.innerHTML = `
      <div class="hub-room">
        <header class="hub-header">
          <a class="hub-back mono" href="#/practice">← Practice</a>
          <h1 class="hub-title display">Scales</h1>
          <p class="hub-lede">Play ascending and descending. Notes you play light up amber as they match the scale.</p>
        </header>

        <section class="hub-section">
          <h2 class="hub-section-title display">Major</h2>
          <div class="hub-tile-grid">
            ${majorOrder.map(pc => scaleTile(pc, 'major')).join('')}
          </div>
        </section>

        <section class="hub-section">
          <h2 class="hub-section-title display">Natural minor</h2>
          <div class="hub-tile-grid">
            ${minorOrder.map(pc => scaleTile(pc, 'natural-minor')).join('')}
          </div>
        </section>
      </div>
    `;

    // Render mini snippets after DOM is in place. If VexFlow hasn't loaded
    // yet, wait for it.
    function paintSnippets() {
      if (typeof Vex === 'undefined' || !Vex.Flow) return false;
      [...majorOrder.map(pc => ({ pc, mode: 'major' })),
       ...minorOrder.map(pc => ({ pc, mode: 'natural-minor' }))].forEach(({ pc, mode }) => {
        const containerId = `scale-snippet-${mode}-${pc}`;
        const el = document.getElementById(containerId);
        if (el) renderSnippet(el, pc, mode);
      });
      return true;
    }
    let attempts = 0;
    function tryPaint() {
      if (paintSnippets()) return;
      if (attempts++ > 100) return;
      setTimeout(tryPaint, 100);
    }
    requestAnimationFrame(tryPaint);
  }

  function scaleTile(pc, mode) {
    const flat = Theory.preferFlat(pc);
    const name = Theory.pcName(pc, flat);
    const modeName = mode === 'major' ? 'major' : 'minor';
    const route = `/practice/scales/${mode === 'major' ? 'major' : 'minor'}/${pc}`;
    return `
      <a class="scale-tile" href="#${route}">
        <p class="scale-tile-name display">${name} ${modeName}</p>
        <div class="scale-tile-snippet" id="scale-snippet-${mode}-${pc}"></div>
      </a>
    `;
  }

  function renderSnippet(el, pc, mode) {
    if (typeof Vex === 'undefined' || !Vex.Flow) {
      el.innerHTML = '<span class="snippet-fallback mono">' + Theory.pcName(pc, Theory.preferFlat(pc)) + ' …</span>';
      return;
    }
    const VF = Vex.Flow;
    const keySig = Theory.keySignature(pc, mode);
    const startOctave = pc <= 4 ? 4 : 3; // keep within treble for legibility
    const midis = Theory.scaleMidi(pc, mode, startOctave).slice(0, 5); // first 5 notes for snippet
    el.innerHTML = '';
    try {
      const width = 220;
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 70);
      const ctx = renderer.getContext();
      const stave = new VF.Stave(2, 0, width - 4);
      stave.addClef('treble').addKeySignature(keySig.name);
      stave.setContext(ctx).draw();

      const preferFlat = keySig.flats > 0;
      const notes = midis.map(m => {
        const pcN = ((m % 12) + 12) % 12;
        const octave = Math.floor(m / 12) - 1;
        const letters = preferFlat ? ['c','d','d','e','e','f','g','g','a','a','b','b']
                                   : ['c','c','d','d','e','f','f','g','g','a','a','b'];
        const accs = preferFlat ? ['','b','','b','','','b','','b','','b','']
                                : ['','#','','#','','','#','','#','','#',''];
        const key = `${letters[pcN]}${accs[pcN]}/${octave}`;
        const n = new VF.StaveNote({ clef: 'treble', keys: [key], duration: 'q' });
        if (accs[pcN]) n.addModifier(new VF.Accidental(accs[pcN]), 0);
        return n;
      });
      const voice = new VF.Voice({ num_beats: notes.length, beat_value: 4 }).setStrict(false);
      voice.addTickables(notes);
      new VF.Formatter().joinVoices([voice]).format([voice], width - 70);
      voice.draw(ctx, stave);
    } catch (e) {
      el.innerHTML = '<span class="snippet-fallback mono">' + Theory.pcName(pc, Theory.preferFlat(pc)) + '…</span>';
    }
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageScalesHub = PageScalesHub;
