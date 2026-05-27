// notation.js — VexFlow-based sheet music rendering.
//
// VexFlow is loaded from CDN in index.html as a global `Vex.Flow`.
// We render to SVG and tag noteheads with data-midi attributes so we can
// highlight them after the fact via classes.

const Notation = (() => {
  function getVF() {
    return (typeof Vex !== 'undefined' && Vex.Flow) ? Vex.Flow : null;
  }

  // Pending renders waiting for VexFlow to finish loading.
  // Each page that creates a Notation instance may attempt to render before
  // the CDN script has parsed. We retry every 100ms until it's available, up
  // to ~10 seconds, then give up and show the fallback.
  const pendingRetries = new Set();
  function scheduleWhenReady(fn) {
    if (getVF()) { fn(); return; }
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      if (getVF()) {
        clearInterval(id);
        pendingRetries.delete(id);
        try { fn(); } catch (e) { console.error('Notation render failed:', e); }
      } else if (attempts > 100) {
        clearInterval(id);
        pendingRetries.delete(id);
        console.warn('VexFlow failed to load after 10s');
      }
    }, 100);
    pendingRetries.add(id);
  }

  // Pitch helpers: MIDI → VexFlow keystring + accidental
  // VexFlow expects keys like "c/4", "f#/5", "bb/3". Octave starts at 0,
  // and MIDI 60 = "c/4".
  const PITCH_LETTERS = ['c','c','d','d','e','f','f','g','g','a','a','b'];
  const SHARP_ACCIDENTALS = ['','#','','#','','','#','','#','','#',''];
  const FLAT_LETTERS = ['c','d','d','e','e','f','g','g','a','a','b','b'];
  const FLAT_ACCIDENTALS = ['','b','','b','','','b','','b','','b',''];

  function midiToKey(midi, preferFlat = false) {
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1; // MIDI 60 (C4) → octave 4
    const letters = preferFlat ? FLAT_LETTERS : PITCH_LETTERS;
    const accidentals = preferFlat ? FLAT_ACCIDENTALS : SHARP_ACCIDENTALS;
    // Flat representation puts e.g. D# as Eb (one octave-letter higher)
    let useOctave = octave;
    if (preferFlat && pc === 11) useOctave = octave; // B stays B
    return {
      key: `${letters[pc]}${accidentals[pc]}/${useOctave}`,
      accidental: accidentals[pc] || null,
    };
  }

  // Decide whether a given MIDI note should display with sharps or flats
  // based on the active key signature.
  function preferFlatForKey(keySig) {
    return keySig && keySig.flats > 0;
  }

  // Whether an accidental is implied by the key signature and should be
  // OMITTED from the note (because the key sig already shows it).
  function isImpliedByKeySig(pc, keySig) {
    if (!keySig) return false;
    // VexFlow handles this automatically when we use the right key sig string,
    // but we want to be explicit about when an accidental letter is "natural"
    // vs "altered" so the engine doesn't double-mark.
    return false;
  }

  // Build a VF.StaveNote from a sorted list of MIDI notes (a chord stack)
  function makeStaveNote(VF, midiArr, durationStr, clefName, keySig) {
    const flat = preferFlatForKey(keySig);
    const sorted = [...midiArr].sort((a, b) => a - b);
    const keys = sorted.map(m => midiToKey(m, flat).key);
    const note = new VF.StaveNote({
      clef: clefName,
      keys: keys,
      duration: durationStr,
      auto_stem: true,
    });
    // Manual accidentals — VexFlow doesn't auto-derive these
    sorted.forEach((m, i) => {
      const { accidental } = midiToKey(m, flat);
      if (accidental) {
        // Don't add accidental if it's implied by the key signature
        // VexFlow has built-in support via the "applyAccidentals" method;
        // we'll let it apply at the voice level
        note.addModifier(new VF.Accidental(accidental), i);
      }
    });
    // Tag each notehead with its MIDI value for later highlighting
    note._midiKeys = sorted;
    return note;
  }

  // After rendering, walk the SVG and add data-midi attributes to noteheads.
  // VexFlow assigns each StaveNote an SVG group; within that group are
  // notehead paths in the same order as `keys` were passed in.
  function tagNoteheads(staveNotes) {
    // For each StaveNote, find its rendered noteheads (paths within an
    // attribute group) and tag them by MIDI key.
    staveNotes.forEach(sn => {
      const els = sn.getAttribute('el');
      if (!els) return;
      // VexFlow groups: the main group contains the notehead paths.
      // Walk children, find <path> elements that are noteheads.
      // We approximate by querying for paths inside the group.
      try {
        const g = sn.attrs.el;
        if (!g || !g.querySelectorAll) return;
        const heads = g.querySelectorAll('.vf-notehead path, .vf-notehead');
        if (!sn._midiKeys) return;
        let idx = 0;
        heads.forEach(h => {
          if (idx < sn._midiKeys.length) {
            h.setAttribute('data-midi', sn._midiKeys[idx]);
            h.classList.add('vf-notehead-tagged');
            idx++;
          }
        });
      } catch (e) { /* defensive */ }
    });
  }

  // Render the chord name (or scale name) above a stave note as text.
  function renderLabelAbove(VF, ctx, x, y, text, cssClass = '') {
    // We append an SVG <text> element directly via the context.
    // VF.SVGContext exposes the underlying SVG via .svg.
    const svgRoot = ctx.svg || ctx.element;
    if (!svgRoot) return null;
    const ns = 'http://www.w3.org/2000/svg';
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'chord-label ' + cssClass);
    t.textContent = text;
    svgRoot.appendChild(t);
    return t;
  }

  function create({ container }) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return null;
    el.innerHTML = '';

    const state = {
      // After each render, populate:
      //   noteheadByMidi: Map<midi, [SVG element, ...]>
      //   labelEls: array of label text elements
      //   labelByIndex: Map<idx, [SVG el, ...]>
      noteheadByMidi: new Map(),
      labels: [],
    };

    function clearState() {
      state.noteheadByMidi.clear();
      state.labels = [];
    }

    function resetContainer() {
      el.innerHTML = '';
      clearState();
    }

    function tagAfterRender(svgRoot, staveNotes, allMidis) {
      // For each rendered .vf-stavenote group in order, take its noteheads
      // and tag them by their MIDI key (assumed sorted ascending in `keys`).
      const groups = svgRoot.querySelectorAll('g.vf-stavenote');
      groups.forEach((g, gi) => {
        const sn = staveNotes[gi];
        if (!sn || !sn._midiKeys) return;
        const heads = g.querySelectorAll('.vf-notehead');
        sn._midiKeys.forEach((midi, idx) => {
          if (idx < heads.length) {
            const h = heads[idx];
            const pc = ((midi % 12) + 12) % 12;
            h.setAttribute('data-midi', midi);
            h.classList.add('pc-' + pc);
            if (!state.noteheadByMidi.has(midi)) state.noteheadByMidi.set(midi, []);
            state.noteheadByMidi.get(midi).push(h);
          }
        });
      });
    }

    // Render a scale: 8 notes on a single grand staff (treble + bass), one note per beat.
    function renderScale(tonicPc, mode, octave = 4) {
      resetContainer();
      const VF = getVF();
      if (!VF) {
        el.innerHTML = '<div class="notation-fallback">Loading notation library…</div>';
        scheduleWhenReady(() => renderScale(tonicPc, mode, octave));
        return null;
      }

      const midis = Theory.scaleMidi(tonicPc, mode, octave); // 8 ascending notes
      const keySig = Theory.keySignature(tonicPc, mode);

      // Width: enough for 8 notes
      const width = Math.min(720, el.clientWidth || 720);
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 180);
      const ctx = renderer.getContext();
      ctx.setFont('Times', 14);

      // Decide clef based on starting octave: treble if tonic >= MIDI 60, else bass
      const useTreble = midis[0] >= 60;
      const clefName = useTreble ? 'treble' : 'bass';

      const stave = new VF.Stave(10, 20, width - 20);
      stave.addClef(clefName).addKeySignature(keySig.name);
      stave.setContext(ctx).draw();

      const staveNotes = midis.map(m =>
        makeStaveNote(VF, [m], 'q', clefName, keySig)
      );

      // Apply accidentals automatically via key signature
      try {
        VF.Accidental.applyAccidentals([new VF.Voice({ num_beats: 8, beat_value: 4 }).setStrict(false).addTickables(staveNotes)], keySig.name);
      } catch (e) { /* fallback to manual accidentals already added */ }

      const voice = new VF.Voice({ num_beats: 8, beat_value: 4 }).setStrict(false);
      voice.addTickables(staveNotes);

      new VF.Formatter().joinVoices([voice]).format([voice], width - 80);
      voice.draw(ctx, stave);

      const svgRoot = el.querySelector('svg');
      tagAfterRender(svgRoot, staveNotes, midis);

      return { midis, keySig };
    }

    // Render a single chord on a grand staff (root in bass clef, 3+5+7 in treble)
    function renderChord(rootPc, type, octave = 4, keySigOverride = null) {
      resetContainer();
      const VF = getVF();
      if (!VF) {
        el.innerHTML = '<div class="notation-fallback">Loading notation library…</div>';
        scheduleWhenReady(() => renderChord(rootPc, type, octave, keySigOverride));
        return null;
      }

      const keySig = keySigOverride || Theory.keySignature(rootPc, 'major');
      const width = Math.min(420, el.clientWidth || 420);
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 280);
      const ctx = renderer.getContext();
      ctx.setFont('Times', 14);

      // Two staves: treble on top, bass below
      const trebleStave = new VF.Stave(10, 20, width - 20);
      trebleStave.addClef('treble').addKeySignature(keySig.name);
      trebleStave.setContext(ctx).draw();

      const bassStave = new VF.Stave(10, 130, width - 20);
      bassStave.addClef('bass').addKeySignature(keySig.name);
      bassStave.setContext(ctx).draw();

      // Brace
      const brace = new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.BRACE);
      brace.setContext(ctx).draw();
      const lineLeft = new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.SINGLE_LEFT);
      lineLeft.setContext(ctx).draw();

      // Build the chord notes
      const t = Theory.CHORD_TYPES[type];
      const bassMidi = 12 * (octave + 1 - 1) + (rootPc % 12); // one octave below "octave"
      const trebleNotes = [];
      // 3 and 7 in treble (and 5 optionally)
      trebleNotes.push(bassMidi + 12 + t.thirdInterval);
      if (t.seventhInterval != null) trebleNotes.push(bassMidi + 12 + t.seventhInterval);

      const trebleNote = makeStaveNote(VF, trebleNotes, 'w', 'treble', keySig);
      const bassNote = makeStaveNote(VF, [bassMidi], 'w', 'bass', keySig);

      const trebleVoice = new VF.Voice({ num_beats: 4, beat_value: 4 });
      trebleVoice.addTickables([trebleNote]);
      const bassVoice = new VF.Voice({ num_beats: 4, beat_value: 4 });
      bassVoice.addTickables([bassNote]);

      new VF.Formatter().joinVoices([trebleVoice, bassVoice]).format([trebleVoice, bassVoice], width - 100);
      trebleVoice.draw(ctx, trebleStave);
      bassVoice.draw(ctx, bassStave);

      // Chord name label above the stave
      const chordName = Theory.chordName({ root: rootPc, type, bass: null, extensions: [] });
      const labelEl = renderLabelAbove(VF, ctx, width / 2, 14, chordName, 'main-chord-label');
      if (labelEl) state.labels.push({ el: labelEl, chordIndex: 0, name: chordName });

      const svgRoot = el.querySelector('svg');
      tagAfterRender(svgRoot, [trebleNote, bassNote], [...trebleNotes, bassMidi]);

      return { trebleNotes, bassNote: bassMidi, keySig, chordName };
    }

    // Render a progression: a row of chord stacks on a treble+bass grand staff,
    // chord names above each.
    function renderProgression(chords, tonicPc, octave = 4) {
      resetContainer();
      const VF = getVF();
      if (!VF) {
        el.innerHTML = '<div class="notation-fallback">Loading notation library…</div>';
        scheduleWhenReady(() => renderProgression(chords, tonicPc, octave));
        return null;
      }
      if (chords.length === 0) {
        el.innerHTML = '<div class="notation-fallback">No chords on this page.</div>';
        return null;
      }

      const keySig = Theory.keySignature(tonicPc, 'major');
      const nChords = chords.length;
      const width = Math.min(900, Math.max(500, el.clientWidth || 700));
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, 280);
      const ctx = renderer.getContext();
      ctx.setFont('Times', 14);

      const trebleStave = new VF.Stave(10, 30, width - 20);
      trebleStave.addClef('treble').addKeySignature(keySig.name);
      trebleStave.setContext(ctx).draw();

      const bassStave = new VF.Stave(10, 140, width - 20);
      bassStave.addClef('bass').addKeySignature(keySig.name);
      bassStave.setContext(ctx).draw();

      const brace = new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.BRACE);
      brace.setContext(ctx).draw();
      const lineLeft = new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.SINGLE_LEFT);
      lineLeft.setContext(ctx).draw();

      // Build chord stacks
      const trebleNotes = [];
      const bassNotes = [];
      const chordMidis = []; // per-chord MIDI sets for highlighting

      chords.forEach(c => {
        const t = Theory.CHORD_TYPES[c.type];
        const bassMidi = 12 * (octave) + (c.rootPc % 12); // C2 base for low chord roots
        // Bring up if too low
        const adjustedBass = bassMidi < 36 ? bassMidi + 12 : bassMidi;
        const trebleStack = [adjustedBass + 12 + t.thirdInterval];
        if (t.seventhInterval != null) {
          trebleStack.push(adjustedBass + 12 + t.seventhInterval);
        }

        const tn = makeStaveNote(VF, trebleStack, 'w', 'treble', keySig);
        const bn = makeStaveNote(VF, [adjustedBass], 'w', 'bass', keySig);
        trebleNotes.push(tn);
        bassNotes.push(bn);
        chordMidis.push({
          treble: trebleStack,
          bass: adjustedBass,
          name: Theory.chordName({ root: c.rootPc, type: c.type, bass: null, extensions: [] }),
          rootPc: c.rootPc,
          type: c.type,
        });
      });

      const trebleVoice = new VF.Voice({ num_beats: nChords * 4, beat_value: 4 }).setStrict(false);
      trebleVoice.addTickables(trebleNotes);
      const bassVoice = new VF.Voice({ num_beats: nChords * 4, beat_value: 4 }).setStrict(false);
      bassVoice.addTickables(bassNotes);

      new VF.Formatter().joinVoices([trebleVoice, bassVoice]).format([trebleVoice, bassVoice], width - 100);
      trebleVoice.draw(ctx, trebleStave);
      bassVoice.draw(ctx, bassStave);

      // Add chord name labels above each chord
      const usableW = width - 100;
      const slotW = usableW / nChords;
      const startX = 80;
      chordMidis.forEach((c, i) => {
        const x = startX + slotW * i + slotW / 2;
        const lblEl = renderLabelAbove(VF, ctx, x, 22, c.name, '');
        if (lblEl) {
          lblEl.setAttribute('data-chord-index', i);
          state.labels.push({ el: lblEl, chordIndex: i, name: c.name, rootPc: c.rootPc, type: c.type });
        }
      });

      // Tag noteheads
      const svgRoot = el.querySelector('svg');
      // For progression, we have one .vf-stavenote per chord in treble, then bass
      const allNoteGroups = svgRoot.querySelectorAll('g.vf-stavenote');
      // First N are treble (in order), next N are bass
      const trebleGroups = Array.from(allNoteGroups).slice(0, nChords);
      const bassGroups = Array.from(allNoteGroups).slice(nChords, nChords * 2);

      trebleGroups.forEach((g, i) => {
        const heads = g.querySelectorAll('.vf-notehead');
        const midis = chordMidis[i].treble.slice().sort((a, b) => a - b);
        midis.forEach((m, j) => {
          if (j < heads.length) {
            const h = heads[j];
            const pc = ((m % 12) + 12) % 12;
            h.setAttribute('data-midi', m);
            h.setAttribute('data-chord-index', i);
            h.classList.add('pc-' + pc);
            if (!state.noteheadByMidi.has(m)) state.noteheadByMidi.set(m, []);
            state.noteheadByMidi.get(m).push(h);
          }
        });
      });
      bassGroups.forEach((g, i) => {
        const heads = g.querySelectorAll('.vf-notehead');
        const midi = chordMidis[i].bass;
        if (heads.length) {
          const h = heads[0];
          const pc = ((midi % 12) + 12) % 12;
          h.setAttribute('data-midi', midi);
          h.setAttribute('data-chord-index', i);
          h.classList.add('pc-' + pc);
          if (!state.noteheadByMidi.has(midi)) state.noteheadByMidi.set(midi, []);
          state.noteheadByMidi.get(midi).push(h);
        }
      });

      return { chordMidis, keySig };
    }

    // Render arbitrary live notes on a grand staff (used by the Play page).
    // Splits at middle C: notes below 60 → bass, 60+ → treble.
    // Shows whole rests in whichever clef has no notes.
    function renderLiveNotes(midiArray) {
      resetContainer();
      const VF = getVF();
      if (!VF) {
        el.innerHTML = '<div class="notation-fallback" style="color:rgba(255,255,255,0.5);padding:40px;text-align:center;">Loading notation…</div>';
        scheduleWhenReady(() => renderLiveNotes(midiArray));
        return;
      }

      // getBoundingClientRect is more reliable than clientWidth for flex children
      const rect  = el.getBoundingClientRect();
      const width = Math.max(500, rect.width || el.offsetWidth || window.innerWidth - 280);
      // 250px: enough for treble + bass staves plus ledger-line breathing room
      const height = 250;
      const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();
      ctx.setFont('Times', 14);

      const stavePad = 8;
      const staveW   = width - stavePad * 2;

      const trebleStave = new VF.Stave(stavePad, 18, staveW);
      trebleStave.addClef('treble');
      trebleStave.setContext(ctx).draw();

      // Bass stave positioned lower to give bass ledger lines room
      const bassStave = new VF.Stave(stavePad, 130, staveW);
      bassStave.addClef('bass');
      bassStave.setContext(ctx).draw();

      try {
        new VF.StaveConnector(trebleStave, bassStave)
          .setType(VF.StaveConnector.type.BRACE).setContext(ctx).draw();
        new VF.StaveConnector(trebleStave, bassStave)
          .setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
      } catch (_) { /* defensive */ }

      const sorted      = [...midiArray].sort((a, b) => a - b);
      const trebleMidis = sorted.filter(m => m >= 60);
      const bassMidis   = sorted.filter(m => m < 60);

      // Whole note chord or whole rest
      const trebleTick = trebleMidis.length > 0
        ? makeStaveNote(VF, trebleMidis, 'w', 'treble', null)
        : new VF.StaveNote({ clef: 'treble', keys: ['b/4'], duration: 'wr' });

      const bassTick = bassMidis.length > 0
        ? makeStaveNote(VF, bassMidis, 'w', 'bass', null)
        : new VF.StaveNote({ clef: 'bass', keys: ['d/3'], duration: 'wr' });

      const trebleVoice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
      trebleVoice.addTickables([trebleTick]);
      const bassVoice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
      bassVoice.addTickables([bassTick]);

      try {
        new VF.Formatter()
          .joinVoices([trebleVoice, bassVoice])
          .format([trebleVoice, bassVoice], staveW - 70);
        trebleVoice.draw(ctx, trebleStave);
        bassVoice.draw(ctx, bassStave);
      } catch (e) {
        console.warn('renderLiveNotes:', e);
      }

      // Tag noteheads for future highlighting if needed
      const svgRoot = el.querySelector('svg');
      if (svgRoot) {
        const allNotes = [];
        if (trebleMidis.length > 0) allNotes.push(trebleTick);
        if (bassMidis.length > 0)   allNotes.push(bassTick);
        if (allNotes.length > 0) tagAfterRender(svgRoot, allNotes, sorted);
      }
    }

    // Highlighting API
    // setNotePlay(midi, on) — neutral "currently playing" color (blue)
    function setNotePlay(midi, on) {
      const els = state.noteheadByMidi.get(midi);
      if (!els) return;
      els.forEach(h => h.classList.toggle('vf-playing', on));
    }
    // setNoteMatch(midi, on) — match color (amber)
    function setNoteMatch(midi, on) {
      const els = state.noteheadByMidi.get(midi);
      if (!els) return;
      els.forEach(h => h.classList.toggle('vf-match', on));
    }
    // setChordLabelMatch(chordIndex, on) — highlight the chord-name text above stave
    function setChordLabelMatch(chordIndex, on) {
      state.labels.forEach(l => {
        if (l.chordIndex === chordIndex) {
          l.el.classList.toggle('chord-label-match', on);
        }
      });
    }
    // setMainLabelMatch(on) — highlight the single main chord label (chord-type drill)
    function setMainLabelMatch(on) {
      state.labels.forEach(l => l.el.classList.toggle('chord-label-match', on));
    }
    function clearHighlights() {
      for (const els of state.noteheadByMidi.values()) {
        els.forEach(h => h.classList.remove('vf-playing', 'vf-match'));
      }
      state.labels.forEach(l => l.el.classList.remove('chord-label-match'));
    }

    return {
      renderScale,
      renderChord,
      renderProgression,
      renderLiveNotes,
      setNotePlay,
      setNoteMatch,
      setChordLabelMatch,
      setMainLabelMatch,
      clearHighlights,
      getState: () => state,
    };
  }

  return { create };
})();

if (typeof window !== 'undefined') window.Notation = Notation;
