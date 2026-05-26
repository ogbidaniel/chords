// pages/practice/chord-types-drill.js — single chord-type cycle drill.

const PageChordTypesDrill = (() => {
  let keyboard = null;
  let notation = null;
  let circle = null;
  let shell = null;
  let chordType = 'maj7';
  let currentPc = 0;
  let cycleDir = 'fourths';

  function render(params, mainEl) {
    chordType = params.type;
    if (!Theory.CHORD_TYPES[chordType]) {
      mainEl.innerHTML = '<p>Unknown chord type.</p>';
      return;
    }

    const typeLabel = chordType === 'maj7' ? 'Major 7'
                    : chordType === '7' ? 'Dominant 7'
                    : 'Minor 7';
    const title = `${typeLabel} around the circle`;

    shell = DrillShell.mount({
      mainEl,
      eyebrow: 'Chord types',
      title,
      backHref: '#/practice/chord-types',
      circleEnabled: DrillShell.defaultCircleOn() || true, // default ON for chord-types
    });

    PracticeHistory.record(`/practice/chord-types/${chordType}`, title);

    // Add key bar + cycle direction controls inserted between header and circle slot
    const drillRoom = mainEl.querySelector('.drill-room');
    const ctrlRow = document.createElement('div');
    ctrlRow.className = 'cycle-controls';
    ctrlRow.innerHTML = `
      <div class="cycle-keybar mono" id="cycle-keybar"></div>
      <div class="cycle-dir-group mono">
        <label><input type="radio" name="cdir" value="fourths" ${cycleDir==='fourths'?'checked':''}> ↺ fourths</label>
        <label><input type="radio" name="cdir" value="fifths" ${cycleDir==='fifths'?'checked':''}> ↻ fifths</label>
      </div>
    `;
    drillRoom.insertBefore(ctrlRow, mainEl.querySelector('#drill-circle-slot'));

    notation = Notation.create({ container: shell.staffContainer });
    keyboard = Keyboard.create({
      container: shell.keyboardContainer,
      low: 36, high: 84,
      onPress: m => MIDI.virtualNoteOn(m),
      onRelease: m => MIDI.virtualNoteOff(m),
    });
    if (shell.isCircleOn()) {
      circle = shell.ensureCircle({
        onSelect: (pc, mode) => {
          if (mode === 'major' || mode === 'minor') {
            currentPc = pc;
            renderForKey();
            paintKeyBar();
          }
        },
      });
    }

    renderKeyBar();
    paintKeyBar();
    renderForKey();

    ctrlRow.querySelectorAll('input[name="cdir"]').forEach(r => {
      r.addEventListener('change', e => {
        cycleDir = e.target.value;
      });
    });

    MIDI.on('change', onChange);
    onChange(MIDI.getSounding());
  }

  function renderKeyBar() {
    const bar = document.getElementById('cycle-keybar');
    const keys = Theory.CYCLE_FOURTHS; // visual order
    bar.innerHTML = keys.map(pc => {
      const name = Theory.pcName(pc, Theory.preferFlat(pc));
      return `<button class="key-pill" data-pc="${pc}">${name}</button>`;
    }).join('');
    bar.querySelectorAll('.key-pill').forEach(p => {
      p.addEventListener('click', () => {
        currentPc = parseInt(p.dataset.pc, 10);
        renderForKey();
        paintKeyBar();
      });
    });
  }

  function paintKeyBar() {
    document.querySelectorAll('#cycle-keybar .key-pill').forEach(p => {
      p.classList.toggle('active', parseInt(p.dataset.pc, 10) === currentPc);
    });
  }

  function renderForKey() {
    if (!notation) return;
    // Key signature derives from the chord's key context: maj7 → major; 7 → use the major key with that tonic
    // (parallel major for visual consistency); m7 → use natural minor for nicer accidentals
    let keySig;
    if (chordType === 'm7') keySig = Theory.keySignature(currentPc, 'natural-minor');
    else keySig = Theory.keySignature(currentPc, 'major');
    notation.renderChord(currentPc, chordType, 4, keySig);

    if (circle) {
      const mode = (chordType === 'm7') ? 'minor' : 'major';
      circle.setKeyHighlight(currentPc, mode);
    }
  }

  function onChange(sounding) {
    if (!keyboard || !notation) return;
    keyboard.setPlaying(sounding);

    notation.clearHighlights();
    const matchSet = new Set();

    // Identify target chord pitch classes
    const t = Theory.CHORD_TYPES[chordType];
    const requiredPcs = new Set([
      currentPc,
      Theory.mod12(currentPc + t.thirdInterval),
    ]);
    if (t.seventhInterval != null) requiredPcs.add(Theory.mod12(currentPc + t.seventhInterval));

    // For each played note, if its pitch class is in the target chord → mark on staff and keyboard
    for (const m of sounding.keys()) {
      const pc = Theory.mod12(m);
      // Show played notes as neutral "playing" on the staff if they correspond to a staff note
      notation.setNotePlay(m, true);
      if (requiredPcs.has(pc)) {
        // Find any staff note of that pitch class and light it amber
        const state = notation.getState();
        for (const [smid, els] of state.noteheadByMidi) {
          if (Theory.mod12(smid) === pc) {
            notation.setNoteMatch(smid, true);
          }
        }
        matchSet.add(m);
      }
    }
    keyboard.setMatch(matchSet);

    // Detect chord & light up chord label, pulse circle if it matches
    if (sounding.size >= 2) {
      const det = Theory.detectChord(sounding);
      if (det && det.type === chordType && det.root === currentPc && det.foreign.length === 0) {
        notation.setMainLabelMatch(true);
        if (circle) circle.pulseAt(currentPc, chordType === 'm7' ? 'minor' : 'major');
      }
    }
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageChordTypesDrill = PageChordTypesDrill;
