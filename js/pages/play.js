// pages/play.js — the home page. Floating keyboard + live chord recognition.

const PagePlay = (() => {
  let keyboard = null;
  let staff = null;

  function render(params, mainEl) {
    mainEl.innerHTML = `
      <div class="play-room">

        <div class="play-welcome" id="play-welcome" hidden>
          <p class="welcome-eyebrow mono">Welcome</p>
          <p class="welcome-text">A room for jazz piano practice. Plug in a MIDI keyboard, or tap the keys below to begin.</p>
          <p class="welcome-text-dim">The page listens passively — Ableton, Logic, any DAW can run alongside. No sound comes from the app; play through your DAW or hardware.</p>
        </div>

        <div class="chord-display-row">
          <div class="chord-display" id="chord-display">
            <span class="chord-name display" id="chord-name-text">—</span>
            <span class="chord-detail mono" id="chord-detail-text"></span>
          </div>
        </div>

        <div class="staff-wrap">
          <div id="staff-container"></div>
        </div>

        <div class="keyboard-wrap">
          <div id="play-piano"></div>
        </div>

        <div class="play-footer mono">
          C2 → C6 · passive listener · tap keys if no device
        </div>

      </div>
    `;

    // Build components
    keyboard = Keyboard.create({
      container: '#play-piano',
      low: 36, high: 84,
      onPress: m => MIDI.virtualNoteOn(m),
      onRelease: m => MIDI.virtualNoteOff(m),
    });

    staff = Staff.create({ container: '#staff-container' });

    MIDI.on('change', onSoundingChange);
    MIDI.on('status', onMidiStatus);

    onSoundingChange(MIDI.getSounding());
  }

  function onMidiStatus(text, kind) {
    const welcome = document.getElementById('play-welcome');
    if (welcome) welcome.hidden = (kind === 'live');
  }

  function onSoundingChange(sounding) {
    if (!keyboard || !staff) return;
    keyboard.setPlaying(sounding);

    const detected = sounding.size >= 2 ? Theory.detectChord(sounding) : null;

    // Mirror notes on staff
    const stateMap = new Map();
    [...sounding].forEach(m => stateMap.set(m, 'playing'));
    staff.setNotes([...sounding], stateMap);

    // Update chord readout
    const nameEl = document.getElementById('chord-name-text');
    const detailEl = document.getElementById('chord-detail-text');
    if (!nameEl) return;
    if (detected) {
      nameEl.textContent = Theory.chordName(detected);
      detailEl.textContent = formatDetail(detected);
      setAtmosphere(detected.type);
    } else if (sounding.size > 0) {
      const notes = [...sounding].sort((a,b)=>a-b).map(m => Theory.SHARP_NAMES[m % 12]);
      nameEl.textContent = notes.join(' · ');
      detailEl.textContent = '';
      setAtmosphere(null);
    } else {
      nameEl.textContent = '—';
      detailEl.textContent = '';
      setAtmosphere(null);
    }
  }

  function formatDetail(d) {
    const parts = [];
    if (d.isSkeleton) parts.push('rootless 3+7');
    if (d.extensions.length) parts.push('+ ' + d.extensions.join(' '));
    if (d.bass != null) parts.push('bass: ' + Theory.pcName(d.bass, Theory.preferFlat(d.bass)));
    if (d.confidence !== 'high') parts.push(d.confidence);
    return parts.join(' · ');
  }

  // Atmospheric color drift — set a CSS variable based on chord quality
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

if (typeof window !== 'undefined') window.PagePlay = PagePlay;
