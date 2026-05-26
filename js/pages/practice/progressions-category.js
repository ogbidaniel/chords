// pages/practice/progressions-category.js — preview tiles for a category.

const PageProgressionsCategory = (() => {
  let cachedData = null;

  async function render(params, mainEl) {
    if (!cachedData) {
      try {
        const res = await fetch('./data/progressions.json');
        cachedData = await res.json();
      } catch (e) { cachedData = { progressions: [] }; }
    }
    const cat = params.cat;
    const items = cachedData.progressions.filter(p => p.category === cat);
    const catNames = {
      jazz: 'Jazz standards',
      popular: 'Popular songs',
      tutorial: 'Tutorials',
      book: 'Book progressions',
    };
    const catName = catNames[cat] || cat;

    mainEl.innerHTML = `
      <div class="hub-room">
        <header class="hub-header">
          <a class="hub-back mono" href="#/practice/progressions">← Progressions</a>
          <h1 class="hub-title display">${catName}</h1>
        </header>

        <div class="hub-tile-grid hub-tile-grid-progression">
          ${items.map(p => `
            <a class="prog-tile" href="#/practice/progressions/${cat}/${p.id}">
              <p class="cell-eyebrow mono">${escapeText(p.source || '')}</p>
              <h2 class="prog-tile-name display">${escapeText(p.name)}</h2>
              <p class="prog-tile-roman mono">${p.roman.map(prettyRoman).join(' · ')}</p>
              <div class="prog-tile-snippet" data-id="${p.id}"></div>
              <p class="prog-tile-desc">${escapeText(p.summary || '')}</p>
            </a>
          `).join('')}
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      items.forEach(p => {
        const slot = mainEl.querySelector(`.prog-tile-snippet[data-id="${p.id}"]`);
        if (slot) renderSnippet(slot, p);
      });
    });
  }

  function prettyRoman(r) {
    return r
      .replace(/maj7/g, '△⁷')
      .replace(/m7b5/g, 'ø')
      .replace(/m7/g, 'm⁷')
      .replace(/7/g, '⁷')
      .replace(/b/g, '♭')
      .replace(/#/g, '♯');
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderSnippet(el, prog) {
    if (typeof Vex === 'undefined' || !Vex.Flow) {
      el.innerHTML = '<span class="snippet-fallback mono">' + prog.roman.join(' ') + '</span>';
      return;
    }
    const VF = Vex.Flow;
    try {
      const chords = Theory.realizeProgression(prog.roman.slice(0, 4), prog.defaultKey);
      if (!chords.length) return;
      const keySig = Theory.keySignature(prog.defaultKey, 'major');

      const width = 280;
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 90);
      const ctx = renderer.getContext();
      const stave = new VF.Stave(2, 0, width - 4);
      stave.addClef('treble').addKeySignature(keySig.name);
      stave.setContext(ctx).draw();

      const preferFlat = keySig.flats > 0;
      const notes = chords.map(c => {
        const t = Theory.CHORD_TYPES[c.type];
        const root = 60 + (c.rootPc % 12) - ((c.rootPc % 12) > 6 ? 12 : 0); // bring root closer
        const stack = [root, root + t.thirdInterval];
        if (t.seventhInterval != null) stack.push(root + t.seventhInterval);
        const keys = stack.map(m => {
          const pc = ((m % 12) + 12) % 12;
          const oct = Math.floor(m / 12) - 1;
          const letters = preferFlat ? ['c','d','d','e','e','f','g','g','a','a','b','b']
                                     : ['c','c','d','d','e','f','f','g','g','a','a','b'];
          const accs = preferFlat ? ['','b','','b','','','b','','b','','b','']
                                  : ['','#','','#','','','#','','#','','#',''];
          return { key: `${letters[pc]}${accs[pc]}/${oct}`, acc: accs[pc] };
        });
        const n = new VF.StaveNote({ clef: 'treble', keys: keys.map(k => k.key), duration: 'q' });
        keys.forEach((k, i) => { if (k.acc) n.addModifier(new VF.Accidental(k.acc), i); });
        return n;
      });
      const voice = new VF.Voice({ num_beats: chords.length, beat_value: 4 }).setStrict(false);
      voice.addTickables(notes);
      new VF.Formatter().joinVoices([voice]).format([voice], width - 80);
      voice.draw(ctx, stave);
    } catch (e) {}
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageProgressionsCategory = PageProgressionsCategory;
