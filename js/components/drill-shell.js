// components/drill-shell.js — shared drill page chrome.
//
// Layout:
//   ┌─────────────────────────────────────────────────────────────┐
//   │ ← back · eyebrow · title          [○ circle] [BPM ▶]        │
//   │                                                              │
//   │              [optional circle of fifths, ~200px]             │
//   │                                                              │
//   │         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           │
//   │         ━━━━━━━━━ sheet music ━━━━━━━━━━━━━━━━━━━            │
//   │         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           │
//   │                                                              │
//   │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ piano ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      │
//   └─────────────────────────────────────────────────────────────┘

const DrillShell = (() => {
  function mount({ mainEl, eyebrow, title, backHref, circleEnabled = false }) {
    mainEl.innerHTML = `
      <div class="drill-room">
        <header class="drill-header">
          <a class="drill-back" href="${backHref}" aria-label="Back">←</a>
          <div class="drill-title-block">
            <p class="cell-eyebrow mono">${eyebrow}</p>
            <h1 class="drill-title display">${title}</h1>
          </div>
          <div class="drill-toolbar">
            <button class="circle-toggle ${circleEnabled ? 'active' : ''}" id="circle-toggle" title="Toggle circle of fifths">
              <span class="circle-glyph">○</span>
            </button>
            <div class="bpm-control mono">
              <input class="bpm-input" id="bpm-input" type="number" value="${Metronome.getBpm()}" min="20" max="300">
              <button class="bpm-step" data-d="-1" aria-label="Slower">−</button>
              <button class="bpm-step" data-d="1" aria-label="Faster">+</button>
              <button class="bpm-run" id="bpm-run" title="Play metronome">
                <span class="bpm-dot" id="bpm-dot"></span>
              </button>
            </div>
          </div>
        </header>

        <div class="drill-circle-slot" id="drill-circle-slot" ${circleEnabled ? '' : 'hidden'}></div>

        <div class="drill-staff-slot" id="drill-staff-slot"></div>

        <div class="drill-keyboard-slot" id="drill-keyboard-slot"></div>
      </div>
    `;

    // BPM control wiring
    const bpmInput = mainEl.querySelector('#bpm-input');
    bpmInput.addEventListener('change', () => {
      Metronome.setBpm(parseInt(bpmInput.value, 10) || 70);
      bpmInput.value = Metronome.getBpm();
    });
    bpmInput.addEventListener('wheel', e => {
      e.preventDefault();
      const d = e.deltaY < 0 ? 1 : -1;
      Metronome.setBpm(Metronome.getBpm() + d);
      bpmInput.value = Metronome.getBpm();
    }, { passive: false });
    mainEl.querySelectorAll('.bpm-step').forEach(b => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.d, 10);
        Metronome.setBpm(Metronome.getBpm() + d);
        bpmInput.value = Metronome.getBpm();
      });
    });
    const runBtn = mainEl.querySelector('#bpm-run');
    const dot = mainEl.querySelector('#bpm-dot');
    runBtn.addEventListener('click', () => {
      const r = Metronome.toggle();
      dot.classList.toggle('live', r);
    });
    dot.classList.toggle('live', Metronome.isRunning());

    // Circle toggle wiring (state passed back via getter)
    let circleOn = circleEnabled;
    let circleInstance = null;
    const circleSlot = mainEl.querySelector('#drill-circle-slot');
    const circleBtn = mainEl.querySelector('#circle-toggle');

    function toggleCircle(forceOn) {
      if (typeof forceOn === 'boolean') circleOn = forceOn;
      else circleOn = !circleOn;
      circleSlot.hidden = !circleOn;
      circleBtn.classList.toggle('active', circleOn);
      try {
        localStorage.setItem('chords.circleOn', circleOn ? '1' : '0');
      } catch (e) {}
      return circleOn;
    }
    circleBtn.addEventListener('click', () => toggleCircle());

    return {
      staffContainer: mainEl.querySelector('#drill-staff-slot'),
      keyboardContainer: mainEl.querySelector('#drill-keyboard-slot'),
      circleContainer: circleSlot,
      isCircleOn: () => circleOn,
      toggleCircle,
      ensureCircle(onSelect = null) {
        if (!circleInstance) {
          circleInstance = CircleOfFifths.create({ container: circleSlot, onSelect });
        }
        return circleInstance;
      },
      getCircle: () => circleInstance,
    };
  }

  function defaultCircleOn() {
    try { return localStorage.getItem('chords.circleOn') === '1'; }
    catch (e) { return false; }
  }

  return { mount, defaultCircleOn };
})();

if (typeof window !== 'undefined') window.DrillShell = DrillShell;
