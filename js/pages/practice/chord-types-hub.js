// pages/practice/chord-types-hub.js — three tiles.

const PageChordTypesHub = (() => {
  function render(params, mainEl) {
    mainEl.innerHTML = `
      <div class="hub-room">
        <header class="hub-header">
          <a class="hub-back mono" href="#/practice">← Practice</a>
          <h1 class="hub-title display">Chord types</h1>
          <p class="hub-lede">PianoPig's foundation drill. Three chord types, all twelve keys, around the circle.</p>
        </header>

        <div class="hub-tile-grid hub-tile-grid-3">
          ${chordTypeTile('maj7', 'Major 7', 'Root – 3 – 7')}
          ${chordTypeTile('7',    'Dominant 7', 'Root – 3 – ♭7')}
          ${chordTypeTile('m7',   'Minor 7', 'Root – ♭3 – ♭7')}
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      ['maj7','7','m7'].forEach(t => {
        const el = document.getElementById(`chord-snippet-${t}`);
        if (el) renderSnippet(el, t);
      });
    });
  }

  function chordTypeTile(type, name, formula) {
    return `
      <a class="chord-type-tile" href="#/practice/chord-types/${type}">
        <p class="cell-eyebrow mono">${formula}</p>
        <p class="chord-type-tile-name display">${name}</p>
        <div class="chord-type-tile-snippet" id="chord-snippet-${type}"></div>
      </a>
    `;
  }

  function renderSnippet(el, type) {
    if (typeof Vex === 'undefined' || !Vex.Flow) return;
    const VF = Vex.Flow;
    try {
      const width = 200;
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 100);
      const ctx = renderer.getContext();
      const stave = new VF.Stave(2, 0, width - 4);
      stave.addClef('treble');
      stave.setContext(ctx).draw();

      // C-rooted chord, treble register, show 3 + 7 (and root)
      const t = Theory.CHORD_TYPES[type];
      const midis = [60, 60 + t.thirdInterval, 60 + t.seventhInterval];
      const preferFlat = type === 'm7' || type === '7';
      const keys = midis.map(m => {
        const pc = m % 12;
        const oct = Math.floor(m / 12) - 1;
        const letters = preferFlat ? ['c','d','d','e','e','f','g','g','a','a','b','b']
                                   : ['c','c','d','d','e','f','f','g','g','a','a','b'];
        const accs = preferFlat ? ['','b','','b','','','b','','b','','b','']
                                : ['','#','','#','','','#','','#','','#',''];
        return { key: `${letters[pc]}${accs[pc]}/${oct}`, acc: accs[pc] };
      });
      const note = new VF.StaveNote({ clef: 'treble', keys: keys.map(k => k.key), duration: 'w' });
      keys.forEach((k, i) => { if (k.acc) note.addModifier(new VF.Accidental(k.acc), i); });
      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
      voice.addTickables([note]);
      new VF.Formatter().joinVoices([voice]).format([voice], width - 70);
      voice.draw(ctx, stave);
    } catch (e) {}
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageChordTypesHub = PageChordTypesHub;
