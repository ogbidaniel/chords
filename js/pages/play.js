// pages/play.js — the home page. Floating keyboard + live chord recognition.

const PagePlay = (() => {
  let keyboard = null;
  let notation = null;
  let bound = false;

  function render(params, mainEl) {
    mainEl.innerHTML = `
      <div class="play-room">

        <div class="play-welcome" id="play-welcome" hidden>
          <p class="welcome-eyebrow mono">Welcome</p>
          <p class="welcome-text">A room for jazz piano practice. Plug in a MIDI keyboard or tap the keys to begin.</p>
          <p class="welcome-text-dim">The page listens passively — your DAW (Ableton, Logic) can run alongside. No sound comes from the app.</p>
        </div>

        <div class="chord-display-row">
          <span class="chord-name display" id="chord-name-text">—</span>
          <span class="chord-detail mono" id="chord-detail-text"></span>
        </div>

        <div class="play-staff" id="play-staff"></div>

        <div class="play-keyboard">
          <div id="play-piano"></div>
        </div>

        <div class="play-footer mono">C2 → C6 · passive listener · tap keys if no device</div>
      </div>
    `;

    keyboard = Keyboard.create({
      container: '#play-piano',
      low: 36, high: 84,
      onPress: m => MIDI.virtualNoteOn(m),
      onRelease: m => MIDI.virtualNoteOff(m),
    });
    notation = Notation.create({ container: '#play-staff' });

    if (!bound) {
      MIDI.on('change', onChange);
      MIDI.on('status', onStatus);
      bound = true;
    }
    onChange(MIDI.getSounding());
  }

  function onStatus(text, kind) {
    const w = document.getElementById('play-welcome');
    if (w) w.hidden = (kind === 'live');
  }

  function onChange(sounding) {
    if (!keyboard) return;
    keyboard.setPlaying(sounding);

    const nameEl = document.getElementById('chord-name-text');
    const detailEl = document.getElementById('chord-detail-text');
    if (!nameEl) return; // navigated away

    if (sounding.size >= 2) {
      const d = Theory.detectChord(sounding);
      if (d) {
        nameEl.textContent = Theory.chordName(d);
        detailEl.textContent = formatDetail(d);
      } else {
        nameEl.textContent = [...sounding.keys()].sort((a,b)=>a-b)
          .map(m => Theory.SHARP_NAMES[m % 12]).join(' · ');
        detailEl.textContent = '';
      }
    } else if (sounding.size === 1) {
      const m = [...sounding.keys()][0];
      nameEl.textContent = Theory.SHARP_NAMES[m % 12];
      detailEl.textContent = '';
    } else {
      nameEl.textContent = '—';
      detailEl.textContent = '';
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

  return { render };
})();

if (typeof window !== 'undefined') window.PagePlay = PagePlay;
