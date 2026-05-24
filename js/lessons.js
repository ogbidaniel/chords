// lessons.js — practice loop controller.
// Picks a drill, shows the target on the keyboard, listens for the right notes, advances.

const Lessons = (() => {
  let state = {
    activeLessonId: null,
    drillIndex: 0,
    streak: 0,
    correct: 0,
    attempts: 0,
    autoAdvanceTimer: null,
  };
  let keyboard = null;
  let listeners = { update: new Set() };

  function on(event, fn) { listeners[event]?.add(fn); }
  function emitUpdate() { listeners.update.forEach(fn => fn(getState())); }

  function attachKeyboard(kb) { keyboard = kb; }

  // Convert lesson drill PCs into MIDI hint notes around middle C
  function drillToMidi(drill) {
    // Place notes in a sensible octave: pick MIDI starting from C4 (60) and lay each PC
    // upwards so we don't skip ranges weirdly.
    const baseMidi = 60; // C4
    let prev = baseMidi - 1;
    return drill.pcs.map(pc => {
      // Find next MIDI >= prev+1 with this pitch class
      let candidate = prev + 1;
      while (candidate % 12 !== ((pc % 12) + 12) % 12) candidate++;
      prev = candidate;
      return candidate;
    });
  }

  function getCurrentDrill() {
    const lesson = Voicings.LESSONS.find(l => l.id === state.activeLessonId);
    if (!lesson) return null;

    if (lesson.generated && lesson.id === 'cycle-ii-V-I') {
      // Dynamically build drills from the cycle progression
      const cycle = Voicings.cycleIIVIProgression();
      const flat = [];
      let cat = 'A';
      for (const key of cycle) {
        for (const ch of key.chords) {
          const voicing = Voicings.realize(`cat${cat}-${ch.quality}`, ch.chordRootPc, 4);
          if (voicing) {
            flat.push({
              name: `${ch.roman} of key ${pcToKeyName(key.tonicPc)} — ${Theory.pcName(ch.chordRootPc, Theory.bestPreferFlat(ch.chordRootPc))}${qualitySuffix(ch.quality)}`,
              pcs: voicing.notes.map(n => n % 12),
              midiHint: voicing.notes,
              rootPc: ch.chordRootPc,
              quality: ch.quality,
              keyTonicPc: key.tonicPc,
              roman: ch.roman,
              dyasCategory: cat,
            });
          }
          cat = cat === 'A' ? 'B' : 'A';
        }
      }
      return flat[state.drillIndex % flat.length] || null;
    }

    return lesson.drills[state.drillIndex % lesson.drills.length] || null;
  }

  function totalDrills() {
    const lesson = Voicings.LESSONS.find(l => l.id === state.activeLessonId);
    if (!lesson) return 0;
    if (lesson.generated && lesson.id === 'cycle-ii-V-I') return 36; // 12 keys × 3 chords
    return lesson.drills.length;
  }

  function pcToKeyName(pc) {
    return Theory.pcName(pc, Theory.bestPreferFlat(pc));
  }

  function qualitySuffix(q) {
    const map = { 'maj7':'Δ', '7':'7', 'm7':'-7', 'm7b5':'ø', 'dim7':'°7' };
    return map[q] || q;
  }

  function startLesson(id) {
    clearTimeout(state.autoAdvanceTimer);
    state.activeLessonId = id;
    state.drillIndex = 0;
    state.streak = 0;
    state.correct = 0;
    state.attempts = 0;
    showCurrentHints();
    emitUpdate();
  }

  function stopLesson() {
    clearTimeout(state.autoAdvanceTimer);
    state.activeLessonId = null;
    if (keyboard) keyboard.clearHints();
    emitUpdate();
  }

  function nextDrill() {
    state.drillIndex++;
    showCurrentHints();
    emitUpdate();
  }

  function prevDrill() {
    state.drillIndex = Math.max(0, state.drillIndex - 1);
    showCurrentHints();
    emitUpdate();
  }

  function showCurrentHints() {
    if (!keyboard) return;
    const drill = getCurrentDrill();
    if (!drill) { keyboard.clearHints(); return; }
    const hintNotes = drill.midiHint || drillToMidi(drill);
    keyboard.setHints(new Set(hintNotes));
  }

  /**
   * Called whenever the MIDI listener reports a change.
   * Checks whether held notes match the current drill's target pitch-class set.
   */
  function onPlayedNotes(soundingSet) {
    if (!state.activeLessonId) return;
    const drill = getCurrentDrill();
    if (!drill) return;
    const targetPcs = new Set(drill.pcs.map(p => ((p % 12) + 12) % 12));
    const playedPcs = new Set([...soundingSet].map(n => n % 12));
    // Match requires exact pc-set equality
    if (playedPcs.size !== targetPcs.size) return;
    for (const pc of targetPcs) if (!playedPcs.has(pc)) return;

    // Correct! Advance after a short pause so they can hear it.
    state.correct++;
    state.streak++;
    state.attempts++;
    emitUpdate();
    clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = setTimeout(() => {
      nextDrill();
    }, 900);
  }

  function getState() {
    const lesson = Voicings.LESSONS.find(l => l.id === state.activeLessonId);
    const drill = getCurrentDrill();
    return {
      lessonId: state.activeLessonId,
      lesson,
      drill,
      drillIndex: state.drillIndex,
      total: totalDrills(),
      streak: state.streak,
      correct: state.correct,
      attempts: state.attempts,
    };
  }

  function getCurrentDrillMidi() {
    const drill = getCurrentDrill();
    if (!drill) return [];
    return drill.midiHint || drillToMidi(drill);
  }

  return {
    attachKeyboard, on,
    startLesson, stopLesson,
    nextDrill, prevDrill,
    onPlayedNotes,
    getState,
    getCurrentDrillMidi,
  };
})();
if (typeof window !== 'undefined') window.Lessons = Lessons;
