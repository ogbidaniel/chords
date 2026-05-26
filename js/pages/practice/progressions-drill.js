// pages/practice/progressions-drill.js — single progression drill page.

const PageProgressionsDrill = (() => {
  let keyboard = null;
  let notation = null;
  let circle = null;
  let shell = null;

  let progression = null;
  let realizedChords = []; // full chord array
  let tonicPc = 0;
  let pageIdx = 0;
  const CHORDS_PER_PAGE = 4;
  let cachedData = null;

  async function render(params, mainEl) {
    if (!cachedData) {
      try {
        const res = await fetch('./data/progressions.json');
        cachedData = await res.json();
      } catch (e) { cachedData = { progressions: [] }; }
    }
    progression = cachedData.progressions.find(p => p.id === params.id);
    if (!progression) {
      mainEl.innerHTML = '<p>Progression not found.</p>';
      return;
    }
    tonicPc = progression.defaultKey || 0;
    pageIdx = 0;
    realizedChords = Theory.realizeProgression(progression.roman, tonicPc);

    const title = progression.name;
    shell = DrillShell.mount({
      mainEl,
      eyebrow: progression.source || 'Progression',
      title,
      backHref: `#/practice/progressions/${params.cat}`,
      circleEnabled: DrillShell.defaultCircleOn(),
    });

    PracticeHistory.record(`/practice/progressions/${params.cat}/${params.id}`, title);

    // Key bar + pagination + chord-name toggle
    const drillRoom = mainEl.querySelector('.drill-room');
    const ctrlRow = document.createElement('div');
    ctrlRow.className = 'progression-controls';
    ctrlRow.innerHTML = `
      <div class="cycle-keybar mono" id="prog-keybar"></div>
      <div class="prog-page-controls mono" ${realizedChords.length <= CHORDS_PER_PAGE ? 'hidden' : ''}>
        <button class="prog-page-btn" id="prog-prev" aria-label="Previous chords">←</button>
        <span class="prog-page-indicator" id="prog-page-indicator"></span>
        <button class="prog-page-btn" id="prog-next" aria-label="Next chords">→</button>
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
        onSelect: (pc) => {
          tonicPc = pc;
          realizedChords = Theory.realizeProgression(progression.roman, tonicPc);
          pageIdx = 0;
          paintKeyBar();
          renderPage();
        }
      });
      circle.setKeyHighlight(tonicPc, 'major');
    }

    renderKeyBar();
    paintKeyBar();
    renderPage();

    document.getElementById('prog-prev').addEventListener('click', () => {
      pageIdx = Math.max(0, pageIdx - 1);
      renderPage();
    });
    document.getElementById('prog-next').addEventListener('click', () => {
      const maxPage = Math.floor((realizedChords.length - 1) / CHORDS_PER_PAGE);
      pageIdx = Math.min(maxPage, pageIdx + 1);
      renderPage();
    });

    MIDI.on('change', onChange);
    onChange(MIDI.getSounding());
  }

  function renderKeyBar() {
    const bar = document.getElementById('prog-keybar');
    const keys = Theory.CYCLE_FOURTHS;
    bar.innerHTML = keys.map(pc => {
      const name = Theory.pcName(pc, Theory.preferFlat(pc));
      return `<button class="key-pill" data-pc="${pc}">${name}</button>`;
    }).join('');
    bar.querySelectorAll('.key-pill').forEach(p => {
      p.addEventListener('click', () => {
        tonicPc = parseInt(p.dataset.pc, 10);
        realizedChords = Theory.realizeProgression(progression.roman, tonicPc);
        pageIdx = 0;
        paintKeyBar();
        renderPage();
        if (circle) circle.setKeyHighlight(tonicPc, 'major');
      });
    });
  }

  function paintKeyBar() {
    document.querySelectorAll('#prog-keybar .key-pill').forEach(p => {
      p.classList.toggle('active', parseInt(p.dataset.pc, 10) === tonicPc);
    });
  }

  function renderPage() {
    const start = pageIdx * CHORDS_PER_PAGE;
    const end = Math.min(start + CHORDS_PER_PAGE, realizedChords.length);
    const slice = realizedChords.slice(start, end);
    notation.renderProgression(slice, tonicPc, 3);

    const indicator = document.getElementById('prog-page-indicator');
    if (indicator) {
      const totalPages = Math.ceil(realizedChords.length / CHORDS_PER_PAGE);
      indicator.textContent = `${pageIdx + 1} / ${totalPages}`;
    }
  }

  function onChange(sounding) {
    if (!keyboard || !notation) return;
    keyboard.setPlaying(sounding);
    notation.clearHighlights();

    const matchSet = new Set();

    // For each played note, light it up on the staff if it's on the page
    for (const m of sounding.keys()) {
      notation.setNotePlay(m, true);
    }

    // Detect chord; if it matches one on the current page, light up that chord
    if (sounding.size >= 2) {
      const det = Theory.detectChord(sounding);
      if (det) {
        const start = pageIdx * CHORDS_PER_PAGE;
        const end = Math.min(start + CHORDS_PER_PAGE, realizedChords.length);
        const pageChords = realizedChords.slice(start, end);
        const matchIdx = pageChords.findIndex(c => c.rootPc === det.root && c.type === det.type);
        if (matchIdx >= 0) {
          notation.setChordLabelMatch(matchIdx, true);
          // Pulse circle
          if (circle) circle.pulseAt(det.root, det.type === 'm7' || det.type === 'm' ? 'minor' : 'major');
          // Light matching notes amber across all played notes that are in this chord's pcs
          const t = Theory.CHORD_TYPES[det.type];
          const targetPcs = new Set([
            det.root,
            Theory.mod12(det.root + t.thirdInterval),
          ]);
          if (t.seventhInterval != null) targetPcs.add(Theory.mod12(det.root + t.seventhInterval));
          if (t.fifthInterval != null) targetPcs.add(Theory.mod12(det.root + t.fifthInterval));

          for (const m of sounding.keys()) {
            const pc = Theory.mod12(m);
            if (targetPcs.has(pc)) {
              matchSet.add(m);
              const state = notation.getState();
              for (const [smid] of state.noteheadByMidi) {
                if (Theory.mod12(smid) === pc) {
                  notation.setNoteMatch(smid, true);
                }
              }
            }
          }
        }
      }
    }
    keyboard.setMatch(matchSet);
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageProgressionsDrill = PageProgressionsDrill;
