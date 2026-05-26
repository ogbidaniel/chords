// pages/practice/progressions-hub.js — 4 category tiles.

const PageProgressionsHub = (() => {
  let cachedData = null;

  async function render(params, mainEl) {
    if (!cachedData) {
      try {
        const res = await fetch('./data/progressions.json');
        cachedData = await res.json();
      } catch (e) { cachedData = { progressions: [] }; }
    }
    const categories = [
      { id: 'jazz',      name: 'Jazz standards', desc: 'ii–V–i, Autumn Leaves, All The Things, more.' },
      { id: 'popular',   name: 'Popular songs',   desc: 'I–vi–IV–V, I–V–vi–IV, the timeless pop forms.' },
      { id: 'tutorial',  name: 'Tutorials',       desc: 'PianoPig fundamentals and curated lesson sequences.' },
      { id: 'book',      name: 'Book progressions', desc: 'From Dick Weissman\'s Basic Chord Progressions.' },
    ];

    mainEl.innerHTML = `
      <div class="hub-room">
        <header class="hub-header">
          <a class="hub-back mono" href="#/practice">← Practice</a>
          <h1 class="hub-title display">Progressions</h1>
          <p class="hub-lede">Real harmonic motion. Pick a flavor, then a piece.</p>
        </header>

        <div class="hub-tile-grid hub-tile-grid-2">
          ${categories.map(c => {
            const count = cachedData.progressions.filter(p => p.category === c.id).length;
            return `
              <a class="cat-tile" href="#/practice/progressions/${c.id}">
                <p class="cell-eyebrow mono">${count} progression${count !== 1 ? 's' : ''}</p>
                <h2 class="cat-tile-name display">${c.name}</h2>
                <p class="cat-tile-desc">${c.desc}</p>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageProgressionsHub = PageProgressionsHub;
