// pages/book.js — placeholder for Weissman's book pages.

const PageBook = (() => {
  let book = null;

  async function render(params, mainEl) {
    if (!book) {
      try {
        const res = await fetch('./data/weissman-book.json');
        book = await res.json();
      } catch (e) { book = { pages: [] }; }
    }
    if (!book.pages || book.pages.length === 0) {
      mainEl.innerHTML = `
        <div class="page-room">
          <header class="page-header">
            <h1 class="display">Book</h1>
            <p class="page-lede">Chord progressions from <em>Basic Chord Progressions</em> by Dick Weissman, plus other sources.</p>
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
      <div class="page-room">
        <header class="page-header">
          <h1 class="display">Book</h1>
          <p class="page-lede">${book.pages.length} pages from <em>Basic Chord Progressions</em></p>
        </header>
        <div class="book-pages">${book.pages.map(renderPage).join('')}</div>
      </div>
    `;
  }

  function renderPage(p) {
    return `
      <article class="book-page">
        <p class="cell-eyebrow mono">Page ${p.page}</p>
        <h2 class="display">${p.section || ''}</h2>
        <p class="book-prose">${p.prose || ''}</p>
      </article>
    `;
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageBook = PageBook;
