// pages/play.js — the Play home.
// Full-viewport layout: grand staff (always rendered) + large piano.
// No chord detection displayed — the background atmosphere carries colour.

const PagePlay = (() => {
  let keyboard  = null;
  let notation  = null;
  let bound     = false;
  let renderTimer = null;

  function render(params, mainEl) {
    // Cancel any pending notation re-render from a previous visit
    clearTimeout(renderTimer);

    mainEl.innerHTML = `
      <div class="play-room">
        <div class="play-staff" id="play-staff"></div>
        <div class="play-keyboard-large" id="play-kb-wrap">
          <div id="play-piano"></div>
        </div>
      </div>
    `;

    // ── Piano ────────────────────────────────────────────────────────────
    keyboard = Keyboard.create({
      container: '#play-piano',
      low: 36, high: 84,
      onPress:   m => MIDI.virtualNoteOn(m),
      onRelease: m => MIDI.virtualNoteOff(m),
    });

    // Scale the SVG to fill the tall container — slice crops the wide sides
    // so the piano fills the full height without distortion.
    const pianoSvg = document.querySelector('#play-piano .piano-svg');
    if (pianoSvg) {
      pianoSvg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    }

    // ── Notation staff ───────────────────────────────────────────────────
    notation = Notation.create({ container: '#play-staff' });
    // Render empty staff immediately (shows rests until notes are played)
    notation.renderLiveNotes([]);

    // ── MIDI binding (once — listeners persist across navigations) ────────
    if (!bound) {
      MIDI.on('change', onChange);
      bound = true;
    }
    onChange(MIDI.getSounding());
  }

  // Debounce notation re-renders — collapses rapid note-on/off bursts into
  // one update once the chord "settles" (80 ms after the last change).
  function scheduleNotation(sounding) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      if (!notation) return;
      notation.renderLiveNotes([...sounding.keys()]);
    }, 80);
  }

  function onChange(sounding) {
    if (!keyboard) return;
    keyboard.setPlaying(sounding);
    scheduleNotation(sounding);
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PagePlay = PagePlay;
