// pages/practice.js — focused chord-progression practice.
// PianoPig's curriculum is the foundation. Two sub-modes:
//   A. Three Chords — drill maj7, dom7, m7 in all 12 keys (PianoPig steps 1, 3)
//   B. Progressions — catalog of jazz/folk/pop progressions, applied to tunes (steps 2, 4, 5, 6)

const PagePractice = (() => {
  // ---- shared state ----
  let mode = 'progressions'; // 'three-chords' | 'progressions'
  let strict = false;        // false=Loose (default), true=Strict
  let tonicPc = 0;           // selected key
  let autoCycle = false;     // cycle through all 12 keys
  let cycleDir = 'fourths';  // 'fourths' or 'fifths'

  // For Progressions mode:
  let selectedProgressionId = null;
  let realizedChords = []; // [{rootPc, type, romanLabel}, ...]
  let activeChordIdx = 0;
  let progressionsData = { progressions: [] };

  // For Three Chords mode:
  let threeChordSequence = []; // [{rootPc, type, romanLabel}, ...] flattened across keys
  let threeChordIdx = 0;

  // For Strict mode error tracking on current chord:
  let attemptedThisChord = false;

  let keyboard = null;
  let staff = null;

  // ============ entry ============

  async function render(params, mainEl) {
    if (progressionsData.progressions.length === 0) {
      try {
        const res = await fetch('./data/progressions.json');
        progressionsData = await res.json();
      } catch (e) {
        progressionsData = { progressions: [] };
      }
    }
    if (!selectedProgressionId && progressionsData.progressions.length) {
      selectedProgressionId = progressionsData.progressions[0].id;
    }

    mainEl.innerHTML = shellHtml();
    bindShellControls();
    renderActiveMode();
  }

  function shellHtml() {
    return `
      <div class="practice-room">

        <div class="practice-modebar">
          <div class="modebar-group" role="tablist">
            <button class="modebar-btn ${mode === 'progressions' ? 'active' : ''}" data-mode="progressions">Progressions</button>
            <button class="modebar-btn ${mode === 'three-chords' ? 'active' : ''}" data-mode="three-chords">Three Chords</button>
          </div>

          <div class="modebar-spacer"></div>

          <div class="modebar-group">
            <label class="strict-toggle">
              <input type="checkbox" id="strict-check" ${strict ? 'checked' : ''}>
              <span class="strict-track"><span class="strict-thumb"></span></span>
              <span class="strict-label mono" id="strict-label">${strict ? 'Strict' : 'Loose'}</span>
            </label>
          </div>

          <div class="modebar-group">
            <div class="bpm-control mono" id="bpm-control">
              <button class="bpm-step" data-d="-1" aria-label="Decrease BPM">−</button>
              <input class="bpm-input" id="bpm-input" type="number" value="${Metronome.getBpm()}" min="20" max="300">
              <span class="bpm-unit">BPM</span>
              <button class="bpm-step" data-d="1" aria-label="Increase BPM">+</button>
              <button class="bpm-toggle" id="bpm-toggle" title="Toggle metronome">
                <span class="bpm-dot" id="bpm-dot"></span>
              </button>
            </div>
          </div>
        </div>

        <div class="practice-keybar">
          <div class="keybar-group">
            <span class="cell-eyebrow mono">Key</span>
            <div class="key-pills" id="key-pills"></div>
          </div>
          <label class="cycle-toggle mono">
            <input type="checkbox" id="cycle-check" ${autoCycle ? 'checked' : ''}>
            <span>Auto-cycle</span>
            <select class="cycle-dir" id="cycle-dir">
              <option value="fourths" ${cycleDir==='fourths'?'selected':''}>fourths ↓</option>
              <option value="fifths" ${cycleDir==='fifths'?'selected':''}>fifths ↑</option>
            </select>
          </label>
        </div>

        <div class="practice-stage" id="practice-stage"></div>
      </div>
    `;
  }

  function bindShellControls() {
    document.querySelectorAll('.modebar-btn').forEach(b => {
      b.addEventListener('click', () => {
        mode = b.dataset.mode;
        document.querySelectorAll('.modebar-btn').forEach(x => x.classList.toggle('active', x === b));
        renderActiveMode();
      });
    });
    document.getElementById('strict-check').addEventListener('change', e => {
      strict = e.target.checked;
      document.getElementById('strict-label').textContent = strict ? 'Strict' : 'Loose';
      renderActiveMode();
    });
    document.getElementById('cycle-check').addEventListener('change', e => {
      autoCycle = e.target.checked;
    });
    document.getElementById('cycle-dir').addEventListener('change', e => {
      cycleDir = e.target.value;
    });

    // BPM control: numeric input + step buttons + scroll + toggle
    const bpmInput = document.getElementById('bpm-input');
    bpmInput.addEventListener('change', () => {
      Metronome.setBpm(parseInt(bpmInput.value, 10) || 70);
      bpmInput.value = Metronome.getBpm();
    });
    bpmInput.addEventListener('wheel', e => {
      e.preventDefault();
      const d = e.deltaY < 0 ? 1 : -1;
      Metronome.setBpm(Metronome.getBpm() + d);
      bpmInput.value = Metronome.getBpm();
    });
    document.querySelectorAll('.bpm-step').forEach(b => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.d, 10);
        Metronome.setBpm(Metronome.getBpm() + d);
        bpmInput.value = Metronome.getBpm();
      });
    });
    document.getElementById('bpm-toggle').addEventListener('click', () => {
      const r = Metronome.toggle();
      updateMetronomeDot(r);
    });
    updateMetronomeDot(Metronome.isRunning());

    // Key pills
    renderKeyPills();
  }

  function updateMetronomeDot(running) {
    const dot = document.getElementById('bpm-dot');
    if (!dot) return;
    dot.classList.toggle('live', running);
  }

  function renderKeyPills() {
    const wrap = document.getElementById('key-pills');
    const keys = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7]; // cycle of fourths visual order
    wrap.innerHTML = keys.map(pc => {
      const name = Theory.pcName(pc, Theory.preferFlat(pc));
      return `<button class="key-pill mono ${pc === tonicPc ? 'active' : ''}" data-pc="${pc}">${name}</button>`;
    }).join('');
    wrap.querySelectorAll('.key-pill').forEach(p => {
      p.addEventListener('click', () => {
        tonicPc = parseInt(p.dataset.pc, 10);
        wrap.querySelectorAll('.key-pill').forEach(x => x.classList.toggle('active', x === p));
        renderActiveMode();
      });
    });
  }

  // ============ mode renderers ============

  function renderActiveMode() {
    if (mode === 'progressions') renderProgressions();
    else renderThreeChords();
  }

  // ---- Progressions mode ----

  function renderProgressions() {
    const stage = document.getElementById('practice-stage');
    if (!stage) return;

    // Realize the selected progression in the current key
    const prog = progressionsData.progressions.find(p => p.id === selectedProgressionId);
    if (!prog) {
      stage.innerHTML = '<p class="empty mono">No progressions loaded.</p>';
      return;
    }
    realizedChords = Theory.realizeProgression(prog.roman, tonicPc);
    activeChordIdx = 0;
    attemptedThisChord = false;

    stage.innerHTML = `
      <div class="progression-stage">
        <div class="progression-title">
          <p class="cell-eyebrow mono">${prog.source}</p>
          <h2 class="display">${prog.name}</h2>
        </div>

        <div class="chord-row" id="chord-row"></div>

        <div class="staff-wrap practice-staff-wrap">
          <div id="practice-staff"></div>
        </div>

        <div class="keyboard-wrap practice-keyboard-wrap">
          <div id="practice-piano"></div>
        </div>

        <details class="progression-picker">
          <summary class="mono">Choose progression</summary>
          <div class="progression-list">
            ${progressionsData.progressions.map(p => `
              <button class="progression-item ${p.id === selectedProgressionId ? 'active' : ''}" data-id="${p.id}">
                <span class="prog-name">${p.name}</span>
                <span class="prog-source mono">${p.source}</span>
              </button>
            `).join('')}
          </div>
        </details>
      </div>
    `;

    document.querySelectorAll('.progression-item').forEach(b => {
      b.addEventListener('click', () => {
        selectedProgressionId = b.dataset.id;
        renderProgressions();
      });
    });

    paintChordRow();

    keyboard = Keyboard.create({
      container: '#practice-piano',
      low: 36, high: 84,
      onPress: m => MIDI.virtualNoteOn(m),
      onRelease: m => MIDI.virtualNoteOff(m),
    });
    staff = Staff.create({ container: '#practice-staff' });

    // Show the active chord's target on the staff when strict, or current sounding when loose
    refreshStaff();
    refreshKeyboard(MIDI.getSounding());

    MIDI.on('change', onProgressionChange);
  }

  function paintChordRow() {
    const row = document.getElementById('chord-row');
    if (!row) return;
    row.innerHTML = realizedChords.map((c, i) => {
      const name = Theory.chordName({ root: c.rootPc, type: c.type, bass: null, extensions: [] });
      const isActive = strict ? i === activeChordIdx : false;
      return `
        <button class="chord-cell ${isActive ? 'active' : ''}" data-i="${i}">
          <span class="chord-roman mono">${prettyRoman(c.romanLabel)}</span>
          <span class="chord-display-name display">${name}</span>
        </button>
      `;
    }).join('');
    row.querySelectorAll('.chord-cell').forEach(b => {
      b.addEventListener('click', () => {
        // Clicking a chord cell makes it active (strict) or just plays it as reference (loose)
        const i = parseInt(b.dataset.i, 10);
        if (strict) {
          activeChordIdx = i;
          attemptedThisChord = false;
          paintChordRow();
          refreshStaff();
        } else {
          // Loose: just preview that chord on the staff
          showChordOnStaff(realizedChords[i]);
        }
      });
    });
  }

  function prettyRoman(r) {
    // Render "IIm7" as "iim⁷", "V7" as "V⁷", etc., for display
    return r
      .replace(/7/g, '⁷')
      .replace(/b/g, '♭')
      .replace(/#/g, '♯');
  }

  function refreshStaff() {
    if (!staff) return;
    if (strict) {
      const c = realizedChords[activeChordIdx];
      if (!c) return;
      const targetMidi = Theory.skeletonMidi37(c.rootPc, c.type, 4) || Theory.chordMidi(c.rootPc, c.type, 4);
      // Also add root in bass clef one octave down
      const bassRoot = 12 * 3 + ((c.rootPc % 12) + 12) % 12;
      const allNotes = [bassRoot, ...targetMidi];
      const stateMap = new Map();
      // Show as faint target (not pressed yet)
      staff.setNotes(allNotes, stateMap);
    } else {
      staff.setNotes([]);
    }
  }

  function showChordOnStaff(c) {
    if (!staff) return;
    const sk = Theory.skeletonMidi37(c.rootPc, c.type, 4) || Theory.chordMidi(c.rootPc, c.type, 4);
    const bassRoot = 12 * 3 + ((c.rootPc % 12) + 12) % 12;
    staff.setNotes([bassRoot, ...sk]);
  }

  function refreshKeyboard(sounding) {
    if (!keyboard) return;
    keyboard.setPlaying(sounding);
    if (sounding.size === 0) {
      keyboard.setCorrect(new Set());
      return;
    }
    const detected = sounding.size >= 2 ? Theory.detectChord(sounding) : null;

    if (strict) {
      const target = realizedChords[activeChordIdx];
      if (!target) return;
      const requiredPcs = requiredChordTonePcs(target);
      const allowedPcs = allowedScalePcs(target);

      const correctMidi = new Set();
      const wrongMidi = [];
      for (const m of sounding) {
        const pc = ((m % 12) + 12) % 12;
        if (allowedPcs.has(pc)) correctMidi.add(m);
        else wrongMidi.push(m);
      }
      keyboard.setCorrect(correctMidi);

      // Flash any wrong notes (only once per press — we approximate by flashing each
      // wrong note seen this turn; the flash is single-shot via CSS animation)
      for (const m of wrongMidi) keyboard.flashWrong(m);

      // Did the user play the required tones? Advance if yes.
      if (!attemptedThisChord) {
        const playedPcs = new Set([...sounding].map(m => ((m % 12) + 12) % 12));
        const allRequired = [...requiredPcs].every(pc => playedPcs.has(pc));
        const noForeign = wrongMidi.length === 0;
        if (allRequired && noForeign && playedPcs.size >= requiredPcs.size) {
          attemptedThisChord = true;
          setTimeout(advanceProgression, 400);
        }
      }

      // Mirror sounding notes on the staff with correct/wrong state
      const stateMap = new Map();
      for (const m of sounding) {
        const pc = ((m % 12) + 12) % 12;
        stateMap.set(m, allowedPcs.has(pc) ? 'correct' : 'wrong');
      }
      // Layer over target — show both target + played
      const target37 = Theory.skeletonMidi37(target.rootPc, target.type, 4) || Theory.chordMidi(target.rootPc, target.type, 4);
      const bassRoot = 12 * 3 + ((target.rootPc % 12) + 12) % 12;
      const targetSet = new Set([bassRoot, ...target37]);
      const merged = [...new Set([...targetSet, ...sounding])];
      // Keep state for played notes; target-only notes get no state class
      staff.setNotes(merged, stateMap);
    } else {
      // Loose: name what they're playing, no errors
      if (detected) {
        showChordOnStaff({ rootPc: detected.root, type: detected.type });
        // Override with played notes shown active
        const stateMap = new Map();
        [...sounding].forEach(m => stateMap.set(m, 'playing'));
        staff.setNotes([...sounding], stateMap);
      } else {
        const stateMap = new Map();
        [...sounding].forEach(m => stateMap.set(m, 'playing'));
        staff.setNotes([...sounding], stateMap);
      }
    }

    // Atmospheric color
    if (detected) setAtmosphere(detected.type);
  }

  function requiredChordTonePcs(c) {
    // For PianoPig's foundation: root + 3rd + 7th (or +5th for triads).
    const t = Theory.CHORD_TYPES[c.type];
    const pcs = new Set([c.rootPc % 12]);
    pcs.add((c.rootPc + t.thirdInterval) % 12);
    if (t.seventhInterval != null) pcs.add((c.rootPc + t.seventhInterval) % 12);
    return pcs;
  }
  function allowedScalePcs(c) {
    const t = Theory.CHORD_TYPES[c.type];
    return new Set(t.scaleIntervals.map(i => (c.rootPc + i) % 12));
  }

  function advanceProgression() {
    if (!realizedChords.length) return;
    const next = activeChordIdx + 1;
    if (next < realizedChords.length) {
      activeChordIdx = next;
      attemptedThisChord = false;
      paintChordRow();
      refreshStaff();
    } else {
      // End of progression
      if (autoCycle) {
        // Move to next key in cycle direction
        const order = cycleDir === 'fourths' ? Theory.CYCLE_FOURTHS : Theory.CYCLE_FIFTHS;
        const idx = order.indexOf(tonicPc);
        tonicPc = order[(idx + 1) % order.length];
      }
      // Re-realize and reset
      const prog = progressionsData.progressions.find(p => p.id === selectedProgressionId);
      realizedChords = Theory.realizeProgression(prog.roman, tonicPc);
      activeChordIdx = 0;
      attemptedThisChord = false;
      renderKeyPills();
      paintChordRow();
      refreshStaff();
    }
  }

  function onProgressionChange(sounding) {
    refreshKeyboard(sounding);
  }

  // ---- Three Chords mode ----

  function renderThreeChords() {
    const stage = document.getElementById('practice-stage');
    if (!stage) return;

    // Build the sequence: maj7, dom7, m7 — for the current key (or all 12 if auto-cycle).
    // We render as one progression with 3 chords in the current key.
    realizedChords = [
      { rootPc: tonicPc, type: 'maj7', romanLabel: 'Imaj7' },
      { rootPc: tonicPc, type: '7',    romanLabel: 'I7' },
      { rootPc: tonicPc, type: 'm7',   romanLabel: 'Im7' },
    ];
    activeChordIdx = 0;
    attemptedThisChord = false;

    const keyName = Theory.pcName(tonicPc, Theory.preferFlat(tonicPc));

    stage.innerHTML = `
      <div class="progression-stage">
        <div class="progression-title">
          <p class="cell-eyebrow mono">PianoPig · Step 1 — the foundation</p>
          <h2 class="display">Three chord types in ${keyName}</h2>
          <p class="three-chords-formulas mono">
            maj7 = R + 3 + 7 &nbsp; · &nbsp; 7 = R + 3 + ♭7 &nbsp; · &nbsp; m7 = R + ♭3 + ♭7
          </p>
        </div>

        <div class="chord-row" id="chord-row"></div>

        <div class="staff-wrap practice-staff-wrap">
          <div id="practice-staff"></div>
        </div>

        <div class="keyboard-wrap practice-keyboard-wrap">
          <div id="practice-piano"></div>
        </div>
      </div>
    `;

    paintChordRow();

    keyboard = Keyboard.create({
      container: '#practice-piano',
      low: 36, high: 84,
      onPress: m => MIDI.virtualNoteOn(m),
      onRelease: m => MIDI.virtualNoteOff(m),
    });
    staff = Staff.create({ container: '#practice-staff' });
    refreshStaff();
    refreshKeyboard(MIDI.getSounding());

    MIDI.on('change', onProgressionChange);
  }

  // Atmospheric color
  function setAtmosphere(type) {
    const body = document.body;
    body.classList.remove('quality-major', 'quality-dominant', 'quality-minor', 'quality-half-dim', 'quality-dim');
    if (!type) return;
    if (type === 'maj7' || type === 'maj' || type === '6') body.classList.add('quality-major');
    else if (type === '7') body.classList.add('quality-dominant');
    else if (type === 'm7' || type === 'm') body.classList.add('quality-minor');
    else if (type === 'm7b5') body.classList.add('quality-half-dim');
    else if (type === 'dim7' || type === 'dim') body.classList.add('quality-dim');
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PagePractice = PagePractice;
