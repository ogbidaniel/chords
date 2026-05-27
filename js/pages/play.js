// pages/play.js — the Play home.
// Full-viewport layout: toolbar · transparent grand staff · large piano.
// Chord detection display is off; atmosphere canvas carries the colour.

const PagePlay = (() => {
  let keyboard    = null;
  let notation    = null;
  let cofInstance = null;
  let bound       = false;
  let renderTimer = null;

  // ── Persistent toolbar state ────────────────────────────────────────────
  function getCofOn()  { try { return localStorage.getItem('play.cofOn')  === '1'; } catch(e) { return false; } }
  function getLibOn()  { try { return localStorage.getItem('play.libOn')  === '1'; } catch(e) { return false; } }
  function savePref(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch(e) {} }

  function render(params, mainEl) {
    clearTimeout(renderTimer);

    const cofOn = getCofOn();
    const libOn = getLibOn();

    mainEl.innerHTML = `
      <div class="play-room">

        <!-- ── Toolbar ──────────────────────────────────────── -->
        <div class="play-toolbar">

          <div class="toolbar-section">
            <button class="toolbar-btn" id="play-sidebar-btn" title="Toggle sidebar">
              <span class="toolbar-icon">☰</span>
            </button>
          </div>

          <div class="toolbar-section toolbar-mid">
            <!-- Metronome -->
            <div class="bpm-control mono" id="play-metro">
              <button class="bpm-step" data-d="-1" aria-label="Slower">−</button>
              <input  class="bpm-input" id="play-bpm" type="number"
                      value="${Metronome.getBpm()}" min="20" max="300"
                      aria-label="BPM">
              <button class="bpm-step" data-d="1" aria-label="Faster">+</button>
              <button class="bpm-run"  id="play-bpm-run" title="Start / stop metronome">
                <span class="bpm-dot ${Metronome.isRunning() ? 'live' : ''}" id="play-bpm-dot"></span>
              </button>
            </div>
          </div>

          <div class="toolbar-section toolbar-right">
            <button class="toolbar-btn ${cofOn ? 'active' : ''}" id="play-cof-btn" title="Circle of Fifths">
              <span class="toolbar-icon">○</span> Circle
            </button>
            <button class="toolbar-btn ${libOn ? 'active' : ''}" id="play-lib-btn" title="Practice library">
              <span class="toolbar-icon">⊞</span> Library
            </button>
          </div>

        </div>

        <!-- ── Circle of Fifths panel ───────────────────────── -->
        <div class="play-cof-panel" id="play-cof-panel" ${cofOn ? '' : 'hidden'}>
          <div id="play-cof-widget"></div>
        </div>

        <!-- ── Library / load panel ─────────────────────────── -->
        <div class="play-library-panel" id="play-lib-panel" ${libOn ? '' : 'hidden'}>
          <a class="library-link" href="#/practice/progressions">Progressions</a>
          <a class="library-link" href="#/practice/chord-types">Chord Types</a>
          <a class="library-link" href="#/practice/scales">Scales</a>
          <a class="library-link" href="#/book">Book</a>
          <a class="library-link" href="#/inspiration">Inspiration</a>
        </div>

        <!-- ── Grand staff ──────────────────────────────────── -->
        <div class="play-staff" id="play-staff"></div>

        <!-- ── Large keyboard ───────────────────────────────── -->
        <div class="play-keyboard-large">
          <div id="play-piano"></div>
        </div>

      </div>
    `;

    // ── Sidebar toggle ───────────────────────────────────────────────────
    document.getElementById('play-sidebar-btn').addEventListener('click', () => {
      if (typeof window.toggleSidebarCollapse === 'function') window.toggleSidebarCollapse();
    });

    // ── Metronome wiring ─────────────────────────────────────────────────
    const bpmInput = mainEl.querySelector('#play-bpm');
    const bpmDot   = mainEl.querySelector('#play-bpm-dot');

    mainEl.querySelectorAll('#play-metro .bpm-step').forEach(btn => {
      btn.addEventListener('click', () => {
        Metronome.setBpm(Metronome.getBpm() + parseInt(btn.dataset.d, 10));
        bpmInput.value = Metronome.getBpm();
      });
    });
    bpmInput.addEventListener('change', () => {
      Metronome.setBpm(parseInt(bpmInput.value, 10) || 70);
      bpmInput.value = Metronome.getBpm();
    });
    bpmInput.addEventListener('wheel', e => {
      e.preventDefault();
      Metronome.setBpm(Metronome.getBpm() + (e.deltaY < 0 ? 1 : -1));
      bpmInput.value = Metronome.getBpm();
    }, { passive: false });
    mainEl.querySelector('#play-bpm-run').addEventListener('click', () => {
      bpmDot.classList.toggle('live', Metronome.toggle());
    });

    // ── Circle of Fifths panel ───────────────────────────────────────────
    const cofPanel = mainEl.querySelector('#play-cof-panel');
    const cofBtn   = mainEl.querySelector('#play-cof-btn');
    cofInstance    = null;

    function ensureCof() {
      if (!cofInstance) {
        cofInstance = CircleOfFifths.create({ container: mainEl.querySelector('#play-cof-widget') });
      }
    }
    if (cofOn) ensureCof();

    cofBtn.addEventListener('click', () => {
      const nowOn = cofPanel.hidden;
      cofPanel.hidden = !nowOn;
      cofBtn.classList.toggle('active', nowOn);
      savePref('play.cofOn', nowOn);
      if (nowOn) ensureCof();
    });

    // ── Library panel ────────────────────────────────────────────────────
    const libPanel = mainEl.querySelector('#play-lib-panel');
    const libBtn   = mainEl.querySelector('#play-lib-btn');
    libBtn.addEventListener('click', () => {
      const nowOn = libPanel.hidden;
      libPanel.hidden = !nowOn;
      libBtn.classList.toggle('active', nowOn);
      savePref('play.libOn', nowOn);
    });

    // ── Piano ────────────────────────────────────────────────────────────
    keyboard = Keyboard.create({
      container: '#play-piano',
      low: 36, high: 84,
      onPress:   m => MIDI.virtualNoteOn(m),
      onRelease: m => MIDI.virtualNoteOff(m),
    });

    // xMinYMid slice: anchor to left (C2 visible), fill height, crop right
    const pianoSvg = mainEl.querySelector('#play-piano .piano-svg');
    if (pianoSvg) pianoSvg.setAttribute('preserveAspectRatio', 'xMinYMid slice');

    // ── Notation staff ───────────────────────────────────────────────────
    notation = Notation.create({ container: '#play-staff' });

    // Delay first render by two rAF frames so the flex layout has settled
    // and el.getBoundingClientRect() returns the real width.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (notation) notation.renderLiveNotes([...MIDI.getSounding().keys()]);
    }));

    // ── MIDI binding (once — survives page navigation) ───────────────────
    if (!bound) {
      MIDI.on('change', onChange);
      bound = true;
    }
    keyboard.setPlaying(MIDI.getSounding());
  }

  // Debounce notation re-renders so rapid arpeggios don't cause flicker
  function scheduleNotation(sounding) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      if (notation) notation.renderLiveNotes([...sounding.keys()]);
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
