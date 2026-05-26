// pages/practice/scales-drill.js — Single scale drill page.
// Renders the scale on staff (one octave), listens for MIDI, lights up
// scale notes amber as played. Auto-scrolls octave when boundary is crossed.

const PageScalesDrill = (() => {
  let keyboard = null;
  let notation = null;
  let circle = null;
  let shell = null;

  let tonicPc = 0;
  let mode = 'major';
  let currentOctave = 4;
  let scaleMidiCurrent = []; // current octave's scale notes

  function render(params, mainEl) {
    tonicPc = parseInt(params.key, 10) || 0;
    mode = params.mode === 'minor' ? 'natural-minor' : 'major';

    const flat = Theory.preferFlat(tonicPc);
    const tonicName = Theory.pcName(tonicPc, flat);
    const modeLabel = mode === 'major' ? 'major' : 'minor';
    const title = `${tonicName} ${modeLabel}`;

    // Pick a starting octave that fits the keyboard well
    if (mode === 'major') currentOctave = (tonicPc <= 4) ? 4 : 3;
    else currentOctave = (tonicPc <= 4) ? 4 : 3;
    if (tonicPc === 9 && mode === 'natural-minor') currentOctave = 3; // A minor starts at A3 → C4

    shell = DrillShell.mount({
      mainEl,
      eyebrow: 'Scales',
      title,
      backHref: '#/practice/scales',
      circleEnabled: DrillShell.defaultCircleOn(),
    });

    PracticeHistory.record(`/practice/scales/${mode === 'major' ? 'major' : 'minor'}/${tonicPc}`, title);

    notation = Notation.create({ container: shell.staffContainer });
    keyboard = Keyboard.create({
      container: shell.keyboardContainer,
      low: 36, high: 84,
      onPress: m => MIDI.virtualNoteOn(m),
      onRelease: m => MIDI.virtualNoteOff(m),
    });

    if (shell.isCircleOn()) {
      circle = shell.ensureCircle();
      circle.setKeyHighlight(tonicPc, mode);
    }

    renderScaleAtCurrentOctave();
    MIDI.on('change', onChange);
    onChange(MIDI.getSounding());
  }

  function renderScaleAtCurrentOctave() {
    if (!notation) return;
    const out = notation.renderScale(tonicPc, mode, currentOctave);
    if (out) scaleMidiCurrent = out.midis;
  }

  function onChange(sounding) {
    if (!keyboard || !notation) return;
    keyboard.setPlaying(sounding);

    // Clear previous match highlights
    notation.clearHighlights();
    const matchSet = new Set();

    // For each played MIDI note, if any scale tone matches at any octave → light up
    const scalePcs = new Set(scaleMidiCurrent.map(m => Theory.mod12(m)));
    for (const m of sounding.keys()) {
      const pc = Theory.mod12(m);
      // First, mark "currently playing" on any matching staff note (b approach: show neutral if also on staff)
      // We highlight specifically the staff note that matches in pitch-class.
      // Find the staff note in scaleMidiCurrent closest to the played note.
      if (scalePcs.has(pc)) {
        // Find best matching staff note (same pitch class, prefer same octave)
        const candidates = scaleMidiCurrent.filter(sm => Theory.mod12(sm) === pc);
        const best = candidates.reduce((a, b) =>
          Math.abs(b - m) < Math.abs(a - m) ? b : a, candidates[0]);
        notation.setNoteMatch(best, true);
        matchSet.add(m);

        // Keyboard match (the actual played MIDI value)
        // (we'll batch-set below)
      }
      // Also show the played note as "playing" on the staff if it's a staff note
      if (scaleMidiCurrent.includes(m)) {
        notation.setNotePlay(m, true);
      }
    }
    keyboard.setMatch(matchSet);

    // Auto-paginate octave when user plays beyond boundaries
    paginateIfNeeded(sounding);
  }

  let lastOctaveShiftAt = 0;
  function paginateIfNeeded(sounding) {
    const now = Date.now();
    if (now - lastOctaveShiftAt < 800) return; // throttle
    if (sounding.size === 0) return;
    const played = [...sounding.keys()];
    const top = scaleMidiCurrent[scaleMidiCurrent.length - 1];
    const bottom = scaleMidiCurrent[0];

    // If user plays a note above the current octave's top + 1 semitone → page up
    const maxPlayed = Math.max(...played);
    const minPlayed = Math.min(...played);
    if (maxPlayed > top + 1) {
      currentOctave++;
      lastOctaveShiftAt = now;
      renderScaleAtCurrentOctave();
    } else if (minPlayed < bottom - 1) {
      currentOctave--;
      lastOctaveShiftAt = now;
      renderScaleAtCurrentOctave();
    }
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageScalesDrill = PageScalesDrill;
