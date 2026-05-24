// pages/reference.js — chord dictionary, scale dictionary, intervals, circle of fifths.

const PageReference = (() => {
  let miniKeyboard = null;
  let currentSelection = null; // { type:'chord'|'scale'|'interval', rootPc, key, midiNotes }

  // ----- Shared sub-component: mini keyboard panel -----
  function renderViewer(host, title, subtitle, midiNotes, playable = true) {
    host.innerHTML = `
      <div class="ref-viewer-head">
        <div>
          <p class="cell-eyebrow mono">${subtitle || ''}</p>
          <h3 class="ref-viewer-title display">${title}</h3>
        </div>
        ${playable ? `<button class="ref-play-btn mono" id="ref-play">▶ Play</button>` : ''}
      </div>
      <div class="ref-mini-piano" id="ref-mini-piano"></div>
      <div class="ref-notes mono" id="ref-notes"></div>
    `;
    miniKeyboard = Keyboard.create({
      container: '#ref-mini-piano',
      low: 48, high: 84,
      showLabels: true,
      onPress: m => { MIDI.virtualNoteOn(m); Audio.play(m); },
      onRelease: m => { MIDI.virtualNoteOff(m); Audio.stop(m); },
    });
    if (!miniKeyboard) return;
    miniKeyboard.setHints(new Set(midiNotes));
    document.getElementById('ref-notes').textContent =
      midiNotes.map(m => Keyboard.noteLabel(m)).join(' · ');
    if (playable) {
      document.getElementById('ref-play').addEventListener('click', () => {
        Audio.playChord(midiNotes, 1500, 90);
        // Briefly flash as "active" too
        miniKeyboard.setActive(new Set(midiNotes));
        setTimeout(() => miniKeyboard.setActive(new Set()), 1200);
      });
    }
  }

  // ----- /reference/chords -----
  function renderChords(params, main) {
    main.innerHTML = `
      <div class="ref-page">
        <header class="ref-header">
          <h1 class="display">Chord reference</h1>
          <p class="ref-lede">Every quality across all 12 roots. Click any chord to see it on the keyboard. Press play to hear it.</p>
        </header>

        <div class="ref-layout">
          <div class="ref-grid-wrap" id="chord-grid-wrap">
            ${buildChordGrid()}
          </div>
          <aside class="ref-viewer" id="ref-viewer">
            <p class="ref-empty mono">Pick a chord →</p>
          </aside>
        </div>
      </div>
    `;
    wireChordGrid();
  }

  function buildChordGrid() {
    // Group qualities by family
    const families = [
      { label: '7th chords (core jazz)', keys: ['maj7','7','m7','m7b5','dim7','mMaj7','7sus4','aug7'] },
      { label: '6th chords',             keys: ['6','m6'] },
      { label: 'Triads',                 keys: ['maj','m','dim','aug','sus2','sus4'] },
      { label: 'Extended',               keys: ['maj9','9','m9'] },
      { label: 'Altered dominants',      keys: ['7b9','7#9','7b5','7#5','7#11'] },
    ];
    const roots = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
    let html = '';
    for (const fam of families) {
      html += `<section class="ref-family">
        <h2 class="ref-family-title">${fam.label}</h2>
        <div class="ref-quality-list">`;
      for (const qKey of fam.keys) {
        const q = Theory.QUALITIES[qKey];
        html += `<div class="ref-quality-row">
          <span class="ref-quality-label mono">${qKey}<span class="ref-quality-name">${q.label || 'maj'}</span></span>
          <div class="ref-cells">`;
        for (let pc = 0; pc < 12; pc++) {
          const useFlat = Theory.preferFlat(pc);
          const name = Theory.pcName(pc, useFlat) + (q.label || '');
          html += `<button class="ref-cell" data-pc="${pc}" data-q="${qKey}">${name}</button>`;
        }
        html += `</div></div>`;
      }
      html += `</section>`;
    }
    return html;
  }

  function wireChordGrid() {
    document.querySelectorAll('.ref-cell').forEach(btn => {
      btn.addEventListener('click', () => {
        const pc = parseInt(btn.dataset.pc, 10);
        const qKey = btn.dataset.q;
        document.querySelectorAll('.ref-cell.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const midi = Theory.chordMidi(pc, qKey, 4);
        const q = Theory.QUALITIES[qKey];
        const name = Theory.chordName(pc, qKey);
        const formula = q.intervals.map(i => intervalShort(i)).join(' · ');
        renderViewer(
          document.getElementById('ref-viewer'),
          name,
          `${qKey} · ${formula}`,
          midi,
          true,
        );
        Audio.playChord(midi, 1500, 90);
      });
    });
  }

  function intervalShort(semitones) {
    const map = { 0:'R', 1:'♭2', 2:'2', 3:'♭3', 4:'3', 5:'4', 6:'♭5', 7:'5', 8:'♭6', 9:'6', 10:'♭7', 11:'7', 12:'8', 13:'♭9', 14:'9', 15:'♯9', 16:'10', 17:'11', 18:'♯11' };
    return map[semitones] || semitones;
  }

  // ----- /reference/scales -----
  function renderScales(params, main) {
    main.innerHTML = `
      <div class="ref-page">
        <header class="ref-header">
          <h1 class="display">Scales</h1>
          <p class="ref-lede">All 12 roots × 20 scales. Click any cell to highlight the notes on the keyboard.</p>
        </header>
        <div class="ref-layout">
          <div class="ref-grid-wrap">${buildScaleGrid()}</div>
          <aside class="ref-viewer" id="ref-viewer">
            <p class="ref-empty mono">Pick a scale →</p>
          </aside>
        </div>
      </div>
    `;
    wireScaleGrid();
  }

  function buildScaleGrid() {
    let html = '';
    for (const [sKey, scale] of Object.entries(Theory.SCALES)) {
      html += `<div class="ref-quality-row">
        <span class="ref-quality-label mono">${scale.label}</span>
        <div class="ref-cells">`;
      for (let pc = 0; pc < 12; pc++) {
        const useFlat = Theory.preferFlat(pc);
        const name = Theory.pcName(pc, useFlat);
        html += `<button class="ref-cell" data-pc="${pc}" data-s="${sKey}">${name}</button>`;
      }
      html += `</div></div>`;
    }
    return html;
  }

  function wireScaleGrid() {
    document.querySelectorAll('.ref-cell').forEach(btn => {
      btn.addEventListener('click', () => {
        const pc = parseInt(btn.dataset.pc, 10);
        const sKey = btn.dataset.s;
        document.querySelectorAll('.ref-cell.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const scale = Theory.SCALES[sKey];
        const pcs = Theory.scalePcs(pc, sKey);
        // Realize MIDI notes starting at C4 area
        const midiBase = 60 + pc;
        const midiNotes = scale.intervals.map(i => midiBase + i);
        const title = Theory.pcName(pc, Theory.preferFlat(pc)) + ' ' + scale.label;
        const subtitle = scale.intervals.map(i => intervalShort(i)).join(' · ');
        renderViewer(document.getElementById('ref-viewer'), title, subtitle, midiNotes, true);
      });
    });
  }

  // ----- /reference/intervals -----
  function renderIntervals(params, main) {
    main.innerHTML = `
      <div class="ref-page">
        <header class="ref-header">
          <h1 class="display">Intervals</h1>
          <p class="ref-lede">The 13 distinct intervals from unison to octave. Click any to hear and see it from C.</p>
        </header>
        <div class="ref-layout">
          <div class="ref-grid-wrap">
            <div class="interval-list">
              ${Theory.INTERVALS.map(iv => `
                <button class="interval-card" data-st="${iv.semitones}">
                  <span class="interval-short mono">${iv.short}</span>
                  <span class="interval-name">${iv.name}</span>
                  <span class="interval-semis mono">${iv.semitones} semitones</span>
                </button>
              `).join('')}
            </div>
          </div>
          <aside class="ref-viewer" id="ref-viewer">
            <p class="ref-empty mono">Pick an interval →</p>
          </aside>
        </div>
      </div>
    `;
    document.querySelectorAll('.interval-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const st = parseInt(btn.dataset.st, 10);
        document.querySelectorAll('.interval-card.selected').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const midi = [60, 60 + st];
        const iv = Theory.INTERVALS.find(i => i.semitones === st);
        renderViewer(document.getElementById('ref-viewer'), iv.name, iv.short + ' from C4', midi, true);
      });
    });
  }

  // ----- /reference/circle -----
  function renderCircle(params, main) {
    main.innerHTML = `
      <div class="ref-page">
        <header class="ref-header">
          <h1 class="display">Circle of Fifths</h1>
          <p class="ref-lede">The map of jazz harmony. Click any key to see its diatonic chords; click a chord to play and visualize it.</p>
        </header>
        <div class="ref-layout">
          <div class="ref-grid-wrap circle-wrap" id="circle-wrap">
            ${buildCircleSvg()}
            <div class="circle-mode-toggle mono">
              <button data-mode="major" class="active">Major</button>
              <button data-mode="minor">Minor (relative)</button>
            </div>
            <div class="diatonic-row" id="diatonic-row"></div>
          </div>
          <aside class="ref-viewer" id="ref-viewer">
            <p class="ref-empty mono">Pick a key →</p>
          </aside>
        </div>
      </div>
    `;
    wireCircle();
  }

  function buildCircleSvg() {
    // 12 sections arranged in a circle, major keys outside, minor inside
    // Order clockwise from top: C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F
    const order = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
    const minorOrder = order.map(pc => (pc + 9) % 12); // relative minor (3 down)
    const cx = 200, cy = 200, rOuter = 180, rInner = 110;
    let html = `<svg viewBox="0 0 400 400" class="circle-svg" aria-label="Circle of fifths">`;
    // outer ring (major)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2; // start at top
      const x = cx + Math.cos(angle) * rOuter * 0.85;
      const y = cy + Math.sin(angle) * rOuter * 0.85;
      const pc = order[i];
      const name = Theory.pcName(pc, [1,3,6,8,10].includes(pc));
      html += `<g class="circle-slot" data-pc="${pc}" data-mode="major">
        <circle cx="${x}" cy="${y}" r="28" class="circle-key-circle"></circle>
        <text x="${x}" y="${y}" class="circle-key-label" text-anchor="middle" dominant-baseline="central">${name}</text>
      </g>`;
    }
    // inner ring (minor)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * rInner * 0.85;
      const y = cy + Math.sin(angle) * rInner * 0.85;
      const pc = minorOrder[i];
      const name = Theory.pcName(pc, [1,3,6,8,10].includes(pc)).toLowerCase() + 'm';
      html += `<g class="circle-slot circle-slot-minor" data-pc="${pc}" data-mode="minor">
        <circle cx="${x}" cy="${y}" r="22" class="circle-key-circle-minor"></circle>
        <text x="${x}" y="${y}" class="circle-key-label-minor" text-anchor="middle" dominant-baseline="central">${name}</text>
      </g>`;
    }
    html += `</svg>`;
    return html;
  }

  function wireCircle() {
    let mode = 'major';
    let selectedPc = null;
    const toggle = document.querySelector('.circle-mode-toggle');
    toggle.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        toggle.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        mode = b.dataset.mode;
        if (selectedPc != null) showDiatonic(selectedPc, mode);
      });
    });
    document.querySelectorAll('.circle-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const pc = parseInt(slot.dataset.pc, 10);
        selectedPc = pc;
        document.querySelectorAll('.circle-slot.active').forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        const slotMode = slot.dataset.mode;
        showDiatonic(pc, slotMode);
      });
    });
  }

  function showDiatonic(tonicPc, mode) {
    const diatonic = Theory.diatonicSevenths(tonicPc, mode);
    const row = document.getElementById('diatonic-row');
    const keyName = Theory.pcName(tonicPc, Theory.preferFlat(tonicPc)) + (mode === 'minor' ? ' minor' : ' major');
    row.innerHTML = `
      <p class="cell-eyebrow mono">Diatonic 7ths in ${keyName}</p>
      <div class="diatonic-chips">
        ${diatonic.map(c => `
          <button class="diatonic-chip" data-pc="${c.rootPc}" data-q="${c.quality}">
            <span class="dc-roman mono">${c.degree}</span>
            <span class="dc-name">${c.name}</span>
          </button>
        `).join('')}
      </div>
    `;
    row.querySelectorAll('.diatonic-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const pc = parseInt(chip.dataset.pc, 10);
        const qKey = chip.dataset.q;
        document.querySelectorAll('.diatonic-chip.selected').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        const midi = Theory.chordMidi(pc, qKey, 4);
        renderViewer(
          document.getElementById('ref-viewer'),
          Theory.chordName(pc, qKey),
          qKey + ' · ' + Theory.QUALITIES[qKey].intervals.map(intervalShort).join(' · '),
          midi,
          true,
        );
        Audio.playChord(midi, 1500, 90);
      });
    });
  }

  return {
    chords: renderChords,
    scales: renderScales,
    intervals: renderIntervals,
    circle: renderCircle,
  };
})();

if (typeof window !== 'undefined') window.PageReference = PageReference;
