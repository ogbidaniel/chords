// pages/inspiration.js — curated YouTube embed feed with tag filters.

const PageInspiration = (() => {
  let videos = [];
  let activeTag = null;

  async function load() {
    if (videos.length) return;
    try {
      const res = await fetch('./data/inspiration.json');
      const data = await res.json();
      videos = data.videos || [];
    } catch (e) {
      videos = [];
    }
  }

  function allTags() {
    const s = new Set();
    videos.forEach(v => (v.tags || []).forEach(t => s.add(t)));
    return [...s].sort();
  }

  async function render(params, main) {
    main.innerHTML = `<div class="inspiration-page"><p class="cell-eyebrow mono">Loading…</p></div>`;
    await load();
    paint(main);
  }

  function paint(main) {
    const filtered = activeTag ? videos.filter(v => v.tags && v.tags.includes(activeTag)) : videos;
    main.innerHTML = `
      <div class="inspiration-page">
        <header class="ref-header">
          <h1 class="display">Inspiration</h1>
          <p class="ref-lede">A curated feed of jazz piano clips. Watch, then go play.</p>
        </header>
        <div class="tag-filters mono">
          <button class="tag-pill ${activeTag === null ? 'active' : ''}" data-tag="">All</button>
          ${allTags().map(t => `<button class="tag-pill ${activeTag === t ? 'active' : ''}" data-tag="${t}">${t}</button>`).join('')}
        </div>
        <div class="video-grid">
          ${filtered.map(v => `
            <div class="video-card">
              <div class="video-embed">
                <iframe src="https://www.youtube.com/embed/${v.id}?rel=0"
                        title="${escapeText(v.title)}"
                        frameborder="0"
                        allow="accelerometer; encrypted-media; picture-in-picture"
                        allowfullscreen></iframe>
              </div>
              <div class="video-info">
                <h3 class="video-card-title">${escapeText(v.title)}</h3>
                <p class="video-meta mono">${escapeText(v.creator)} · ${v.type}</p>
                <div class="video-tags">
                  ${(v.tags || []).map(t => `<span class="video-tag mono">${escapeText(t)}</span>`).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    main.querySelectorAll('.tag-pill').forEach(b => {
      b.addEventListener('click', () => {
        activeTag = b.dataset.tag || null;
        paint(main);
      });
    });
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { render };
})();

if (typeof window !== 'undefined') window.PageInspiration = PageInspiration;
