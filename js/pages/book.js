// pages/book.js — placeholder for chord-progression book renderer.
// Reads from data/weissman-book.json (empty until photographs are extracted).

const PageBook = (() => {
  let book = { pages: [] };

  async function render(params, mainEl) {
    if (book.pages.length === 0) {
      try {
        const res = await fetch('./data/weissman-book.json');
        book = await res.json();
      } catch (e) {
        book = { pages: [] };
      }
    }

    if (book.pages.length === 0) {
      mainEl.innerHTML = `
        <div class="book-room">
          <header class="page-header">
            <h1 class="display">Book</h1>
            <p class="page-lede">Chord progressions from <em>Basic Chord Progressions</em> by Dick Weissman, plus additional sources. Photographs will be processed and added as pages here.</p>
          </header>
          <div class="book-empty">
            <p class="cell-eyebrow mono">Not yet photographed</p>
            <p class="book-empty-text">When pages are added, each will appear here with its progression notation, prose, clickable keyboard diagrams, and song examples.</p>
          </div>
        </div>
      `;
      return;
    }

    mainEl.innerHTML = `
      <div class="book-room">
        <header class="page-header">
          <h1 class="display">Book</h1>
          <p class="page-lede">${book.pages.length} pages from <em>Basic Chord Progressions</em></p>
        </header>
        <div class="book-pages">
          ${book.pages.map(renderPage).join('')}
        </div>
      </div>
    `;
  }

  function renderPage(p) {
    return `
      <article class="book-page">
        <p class="cell-eyebrow mono">Page ${p.page}</p>
        <h2 class="display">${p.section}</h2>
        <p class="book-prose">${p.prose || ''}</p>
        ${p.chords && p.chords.length ? `
          <div class="book-chord-row">
            ${p.chords.map(c => `<div class="book-chord-card">
              <span class="display">${c.name}</span>
              <span class="mono">${(c.notes || []).join(' · ')}</span>
            </div>`).join('')}
          </div>
        ` : ''}
        ${p.song_examples && p.song_examples.length ? `
          <p class="book-songs mono">Song examples: <em>${p.song_examples.join(', ')}</em></p>
        ` : ''}
      </article>
    `;
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageBook = PageBook;
