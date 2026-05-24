// app.js — top-level wiring. Loaded last.

(function() {
  const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  // Build keyboard
  const keyboard = Keyboard.create({
    container: '#piano-container',
    onNoteTap: (midi, on) => on ? MIDI.virtualNoteOn(midi) : MIDI.virtualNoteOff(midi),
  });
  Lessons.attachKeyboard(keyboard);

  // ---- DOM refs ----
  const $ = (sel) => document.querySelector(sel);
  const midiDot = $('#midi-dot');
  const midiStatusEl = $('#midi-status');
  const sustainPill = $('#sustain-pill');
  const activeNotesEl = $('#active-notes');
  const activePcsEl = $('#active-pcs');
  const detectedEl = $('#detected-chord');
  const detectedRomanEl = $('#detected-roman');
  const overlayLayer = $('#overlay-layer');
  const lessonTabsEl = $('#lesson-tabs');
  const activePanel = $('#active-lesson-panel');
  const lessonTitleEl = $('#lesson-title');
  const lessonSourceEl = $('#lesson-source');
  const lessonSummaryEl = $('#lesson-summary');
  const drillIndexEl = $('#drill-index');
  const drillTotalEl = $('#drill-total');
  const drillTargetEl = $('#drill-target');
  const drillNotesEl = $('#drill-notes');
  const streakEl = $('#streak-count');

  // ---- Lesson tabs ----
  function renderLessonTabs() {
    lessonTabsEl.innerHTML = '';
    Voicings.LESSONS.forEach(lesson => {
      const btn = document.createElement('button');
      btn.className = 'lesson-tab';
      btn.dataset.id = lesson.id;
      btn.innerHTML = `<span>${lesson.title}</span><span class="lesson-tab-source">${lesson.source}</span>`;
      btn.addEventListener('click', () => {
        Lessons.startLesson(lesson.id);
        activePanel.hidden = false;
      });
      lessonTabsEl.appendChild(btn);
    });
  }
  renderLessonTabs();

  function updateLessonTabActive(id) {
    [...lessonTabsEl.querySelectorAll('.lesson-tab')].forEach(b => {
      b.classList.toggle('active', b.dataset.id === id);
    });
  }

  $('#close-lesson').addEventListener('click', () => {
    Lessons.stopLesson();
    activePanel.hidden = true;
    updateLessonTabActive(null);
  });
  $('#next-drill').addEventListener('click', () => Lessons.nextDrill());
  $('#prev-drill').addEventListener('click', () => Lessons.prevDrill());

  // ---- Lesson state -> UI ----
  Lessons.on('update', state => {
    updateLessonTabActive(state.lessonId);
    if (!state.lesson) return;
    lessonTitleEl.textContent = state.lesson.title;
    lessonSourceEl.textContent = state.lesson.source;
    lessonSummaryEl.textContent = state.lesson.summary;
    drillIndexEl.textContent = (state.drillIndex % state.total) + 1;
    drillTotalEl.textContent = state.total;
    streakEl.textContent = state.streak;
    if (state.drill) {
      drillTargetEl.textContent = state.drill.name;
      const hintMidi = Lessons.getCurrentDrillMidi();
      drillNotesEl.textContent = hintMidi.map(m => Keyboard.noteLabel(m)).join(' · ');
    } else {
      drillTargetEl.textContent = 'Done — start a new lesson.';
      drillNotesEl.textContent = '';
    }
  });

  // ---- MIDI updates ----
  let lastSounding = new Set();

  MIDI.on('change', (sounding, sustainOn) => {
    lastSounding = sounding;
    keyboard.setActive(sounding);
    sustainPill.classList.toggle('on', sustainOn);

    if (sounding.size === 0) {
      activeNotesEl.textContent = '—';
      activePcsEl.textContent = '—';
      detectedEl.textContent = '—';
      detectedRomanEl.textContent = '';
      hideOverlay();
      return;
    }
    const sorted = [...sounding].sort((a, b) => a - b);
    activeNotesEl.textContent = sorted.map(m => Keyboard.noteLabel(m)).join(' · ');
    const pcs = [...new Set(sorted.map(m => NOTE_NAMES_SHARP[m % 12]))];
    activePcsEl.textContent = pcs.join(' · ');

    const chord = Theory.detectChord(sounding);
    if (chord) {
      detectedEl.textContent = chord.name;
      // Roman numeral relative to current lesson's tonic if available
      const state = Lessons.getState();
      const drill = state.drill;
      let romanText = '';
      if (drill && drill.keyTonicPc != null) {
        const r = Theory.romanInKey(chord.rootPc, chord.quality, drill.keyTonicPc);
        if (r) romanText = `${r.roman} in ${Theory.pcName(drill.keyTonicPc, Theory.bestPreferFlat(drill.keyTonicPc))}`;
      } else {
        // Default to key of C
        const r = Theory.romanInKey(chord.rootPc, chord.quality, 0);
        if (r) romanText = `${r.roman} in C`;
      }
      detectedRomanEl.textContent = romanText;
      showOverlay(chord, sounding);
    } else {
      detectedEl.textContent = '—';
      detectedRomanEl.textContent = '';
      hideOverlay();
    }

    // Pass to lesson controller for drill matching
    Lessons.onPlayedNotes(sounding);
  });

  MIDI.on('status', (text, kind) => {
    midiStatusEl.textContent = text;
    midiDot.className = 'dot ' + (kind === 'live' ? 'live' : kind === 'error' ? 'error' : '');
  });

  // ---- Chord overlay positioning ----
  let overlayEl = null;
  function showOverlay(chord, sounding) {
    if (sounding.size === 0) { hideOverlay(); return; }
    const xs = [...sounding].map(m => keyboard.getCenter(m)?.cx).filter(v => v != null);
    if (xs.length === 0) { hideOverlay(); return; }
    const cxVB = xs.reduce((a, b) => a + b, 0) / xs.length;

    const svg = keyboard.getSvg();
    const svgRect = svg.getBoundingClientRect();
    const stageRect = document.getElementById('piano-stage').getBoundingClientRect();
    const scale = svgRect.width / keyboard.vbWidth();
    const pxX = (svgRect.left - stageRect.left) + cxVB * scale;

    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'chord-overlay';
      overlayEl.innerHTML = `<div class="roman"></div><div class="chord-name"></div>`;
      overlayLayer.appendChild(overlayEl);
    }
    // Show roman numeral on top, chord name on bottom (compact)
    const state = Lessons.getState();
    const tonic = (state.drill && state.drill.keyTonicPc != null) ? state.drill.keyTonicPc : 0;
    const rom = Theory.romanInKey(chord.rootPc, chord.quality, tonic);
    overlayEl.querySelector('.roman').textContent = rom ? rom.roman : '';
    overlayEl.querySelector('.chord-name').textContent = chord.name;
    overlayEl.style.left = `${pxX}px`;
    overlayEl.style.top = `0px`;
    overlayEl.style.opacity = '1';
  }
  function hideOverlay() { if (overlayEl) overlayEl.style.opacity = '0'; }

  // Reposition overlay if the keyboard re-lays-out
  window.addEventListener('resize', () => {
    if (lastSounding.size > 0) {
      const chord = Theory.detectChord(lastSounding);
      if (chord) showOverlay(chord, lastSounding);
    }
  });

  // ---- Boot ----
  MIDI.init();
})();
