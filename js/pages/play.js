// pages/play.js — the home page. Keyboard + live chord detection.

const PagePlay = (() => {
  let keyboard = null;
  let detected = null;
  let lastSounding = new Set();
  let inspirationVideos = [];

  // Pull a sample video for the "watch" widget
  async function loadInspiration() {
    if (inspirationVideos.length) return inspirationVideos;
    try {
      const res = await fetch('./data/inspiration.json');
      const data = await res.json();
      inspirationVideos = data.videos || [];
    } catch (e) { inspirationVideos = []; }
    return inspirationVideos;
  }

  function pickFeaturedVideo() {
    if (!inspirationVideos.length) return null;
    return inspirationVideos[Math.floor(Math.random() * inspirationVideos.length)];
  }

  function render(params, mainEl) {
    mainEl.innerHTML = `
      <div class="play-page">
        <div class="play-stage">
          <div class="play-keyboard-card">
            <div class="overlay-layer" id="overlay-layer"></div>
            <div id="piano-container" class="piano-container"></div>
            <div class="piano-meta mono">
              <span>C2 → C6 · 49 keys · passive · tap to play</span>
            </div>
          </div>

          <div class="play-readout">
            <div class="readout-cell readout-cell-main">
              <span class="cell-eyebrow mono">Detected</span>
              <span class="cell-value display" id="detect-name">—</span>
              <span class="cell-roman mono" id="detect-roman"></span>
            </div>
            <div class="readout-cell">
              <span class="cell-eyebrow mono">Notes</span>
              <span class="cell-value-mono mono" id="detect-notes">—</span>
            </div>
            <div class="readout-cell">
              <span class="cell-eyebrow mono">Pitch classes</span>
              <span class="cell-value-mono mono" id="detect-pcs">—</span>
            </div>
          </div>
        </div>

        <aside class="play-side">
          <div class="side-card" id="welcome-card" hidden>
            <span class="cell-eyebrow mono">Welcome</span>
            <p class="side-prose">
              Plug in a MIDI keyboard to start. The page listens passively — Ableton or any DAW can run at the same time.
            </p>
            <p class="side-prose">
              No MIDI on hand? Tap or click the keys directly. Same chord detection, same live feedback.
            </p>
            <div class="side-tip mono">Browsers: Chrome · Edge · Opera</div>
          </div>

          <div class="side-card" id="watch-card">
            <span class="cell-eyebrow mono">Watch</span>
            <div id="watch-content">Loading…</div>
            <a class="side-link mono" href="#/inspiration">More clips →</a>
          </div>

          <div class="side-card side-card-quiet">
            <span class="cell-eyebrow mono">Quick jump</span>
            <ul class="side-list">
              <li><a href="#/drill">Run a drill →</a></li>
              <li><a href="#/reference/chords">Chord reference →</a></li>
              <li><a href="#/reference/circle">Circle of fifths →</a></li>
              <li><a href="#/lessons">Lessons →</a></li>
            </ul>
          </div>
        </aside>
      </div>
    `;

    // Build keyboard
    keyboard = Keyboard.create({
      container: '#piano-container',
      onPress: (m) => { MIDI.virtualNoteOn(m); Audio.play(m); },
      onRelease: (m) => { MIDI.virtualNoteOff(m); Audio.stop(m); },
    });

    // Detection wiring
    MIDI.on('change', onChange);
    MIDI.on('note', onNote);
    MIDI.on('status', onStatus);

    // Load watch widget
    loadInspiration().then(() => {
      const video = pickFeaturedVideo();
      const watch = document.getElementById('watch-content');
      if (!watch) return;
      if (!video) { watch.textContent = 'No videos yet.'; return; }
      const params = video.type === 'short' ? '' : '?rel=0';
      watch.innerHTML = `
        <div class="video-embed">
          <iframe src="https://www.youtube.com/embed/${video.id}${params}"
                  title="${escapeHtml(video.title)}"
                  frameborder="0"
                  allow="accelerometer; encrypted-media; picture-in-picture"
                  allowfullscreen></iframe>
        </div>
        <p class="video-title">${escapeHtml(video.title)}</p>
        <p class="video-meta mono">${escapeHtml(video.creator)}</p>
      `;
    });
  }

  function onStatus(text, kind) {
    // Show welcome card when there's no device
    const welcomeCard = document.getElementById('welcome-card');
    if (welcomeCard) welcomeCard.hidden = (kind === 'live');
  }

  function onNote(midi, vel, isOn) {
    if (isOn) Audio.play(midi, vel);
    else Audio.stop(midi);
  }

  function onChange(sounding) {
    lastSounding = sounding;
    if (!keyboard) return;
    keyboard.setActive(sounding);

    const name = document.getElementById('detect-name');
    const roman = document.getElementById('detect-roman');
    const notes = document.getElementById('detect-notes');
    const pcs = document.getElementById('detect-pcs');
    if (!name) return; // route may have changed

    if (sounding.size === 0) {
      name.textContent = '—';
      roman.textContent = '';
      notes.textContent = '—';
      pcs.textContent = '—';
      hideOverlay();
      return;
    }
    const sorted = [...sounding].sort((a, b) => a - b);
    notes.textContent = sorted.map(Keyboard.noteLabel).join(' · ');
    pcs.textContent = [...new Set(sorted.map(m => Theory.SHARP_NAMES[m % 12]))].join(' · ');

    const chord = Theory.detectChord(sounding);
    if (chord) {
      name.textContent = chord.name;
      const r = Theory.romanInKey(chord.rootPc, chord.quality, 0);
      roman.textContent = r ? `${r.roman} in C` : '';
      showOverlay(chord, sounding);
    } else {
      name.textContent = '—';
      roman.textContent = '';
      hideOverlay();
    }
  }

  let overlayEl = null;
  function showOverlay(chord, sounding) {
    if (!keyboard || sounding.size === 0) { hideOverlay(); return; }
    const xs = [...sounding].map(m => keyboard.getCenter(m)?.cx).filter(v => v != null);
    if (xs.length === 0) { hideOverlay(); return; }
    const cxVB = xs.reduce((a, b) => a + b, 0) / xs.length;

    const overlayLayer = document.getElementById('overlay-layer');
    if (!overlayLayer) return;
    const svg = keyboard.getSvg();
    const svgRect = svg.getBoundingClientRect();
    const layerRect = overlayLayer.getBoundingClientRect();
    const scale = svgRect.width / keyboard.vbWidth();
    const pxX = (svgRect.left - layerRect.left) + cxVB * scale;

    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'chord-overlay';
      overlayEl.innerHTML = `<div class="roman"></div><div class="cname mono"></div>`;
      overlayLayer.appendChild(overlayEl);
    }
    const r = Theory.romanInKey(chord.rootPc, chord.quality, 0);
    overlayEl.querySelector('.roman').textContent = r ? r.roman : '';
    overlayEl.querySelector('.cname').textContent = chord.name;
    overlayEl.style.left = `${pxX}px`;
    overlayEl.style.opacity = '1';
  }
  function hideOverlay() { if (overlayEl) overlayEl.style.opacity = '0'; }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PagePlay = PagePlay;
