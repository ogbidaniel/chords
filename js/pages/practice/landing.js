// pages/practice/landing.js — Practice hub.

const PagePracticeLanding = (() => {
  function render(params, mainEl) {
    const history = PracticeHistory.recent();

    mainEl.innerHTML = `
      <div class="hub-room">
        <header class="hub-header">
          <h1 class="hub-title display">Practice</h1>
          <p class="hub-lede">Pick a focus. Sheet music shows the prompt. The keyboard listens.</p>
        </header>

        ${history.length > 0 ? `
          <section class="hub-continue">
            <p class="cell-eyebrow mono">Continue where you left off</p>
            <div class="continue-list">
              ${history.map(it => `
                <a class="continue-item" href="#${it.path}">
                  <span class="continue-label display">${escapeText(it.label)}</span>
                  <span class="continue-arrow mono">→</span>
                </a>
              `).join('')}
            </div>
          </section>
        ` : ''}

        <section class="hub-tiles">
          <a class="hub-tile" href="#/practice/scales">
            <div class="hub-tile-icon">
              ${scaleIconSvg()}
            </div>
            <div class="hub-tile-body">
              <h2 class="hub-tile-title display">Scales</h2>
              <p class="hub-tile-desc">Play scales ascending and descending. 12 major + 12 minor. Notes light up as you play them.</p>
            </div>
          </a>

          <a class="hub-tile" href="#/practice/chord-types">
            <div class="hub-tile-icon">
              ${chordIconSvg()}
            </div>
            <div class="hub-tile-body">
              <h2 class="hub-tile-title display">Chord types</h2>
              <p class="hub-tile-desc">Maj7, dom7, and m7 around the circle of fifths. PianoPig's foundation drill.</p>
            </div>
          </a>

          <a class="hub-tile" href="#/practice/progressions">
            <div class="hub-tile-icon">
              ${progressionIconSvg()}
            </div>
            <div class="hub-tile-body">
              <h2 class="hub-tile-title display">Progressions</h2>
              <p class="hub-tile-desc">Jazz standards, popular songs, tutorial sequences, book progressions.</p>
            </div>
          </a>
        </section>
      </div>
    `;
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function scaleIconSvg() {
    return `<svg viewBox="0 0 60 60" class="hub-icon-svg">
      <line x1="6" y1="50" x2="54" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="3 4"/>
      <circle cx="6" cy="50" r="3" fill="currentColor"/>
      <circle cx="18" cy="40" r="3" fill="currentColor"/>
      <circle cx="30" cy="30" r="3" fill="currentColor"/>
      <circle cx="42" cy="20" r="3" fill="currentColor"/>
      <circle cx="54" cy="10" r="3" fill="currentColor"/>
    </svg>`;
  }
  function chordIconSvg() {
    return `<svg viewBox="0 0 60 60" class="hub-icon-svg">
      <ellipse cx="30" cy="18" rx="7" ry="5" fill="currentColor"/>
      <ellipse cx="30" cy="30" rx="7" ry="5" fill="currentColor" opacity="0.7"/>
      <ellipse cx="30" cy="42" rx="7" ry="5" fill="currentColor" opacity="0.4"/>
      <line x1="37" y1="18" x2="37" y2="55" stroke="currentColor" stroke-width="1.2"/>
    </svg>`;
  }
  function progressionIconSvg() {
    return `<svg viewBox="0 0 60 60" class="hub-icon-svg">
      <rect x="6" y="22" width="10" height="16" rx="2" fill="currentColor" opacity="0.4"/>
      <rect x="20" y="18" width="10" height="20" rx="2" fill="currentColor" opacity="0.55"/>
      <rect x="34" y="14" width="10" height="24" rx="2" fill="currentColor" opacity="0.7"/>
      <rect x="48" y="22" width="6" height="16" rx="2" fill="currentColor"/>
    </svg>`;
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PagePracticeLanding = PagePracticeLanding;
