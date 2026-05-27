// app.js — top-level wiring.

(function () {
  function mountChrome() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
      <div class="layout">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-brand">
            <span class="brand-mark display">chords</span>
            <span class="brand-sub mono">a practice room</span>
          </div>
          <nav class="sidebar-nav">
            <a class="nav-link" href="#/play" data-route="/play">Play</a>
            <a class="nav-link" href="#/practice" data-route="/practice">Practice</a>
            <a class="nav-link" href="#/book" data-route="/book">Book</a>
            <a class="nav-link" href="#/inspiration" data-route="/inspiration">Inspiration</a>
          </nav>
          <div class="sidebar-foot mono">
            <span class="midi-status idle" id="midi-status">connecting…</span>
            <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" title="Collapse sidebar">‹ hide</button>
          </div>
        </aside>

        <!-- Expand tab — only visible when sidebar is collapsed on desktop -->
        <button class="sidebar-expand-tab" id="sidebar-expand-tab" title="Open menu" aria-label="Open menu">›</button>

        <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>

        <main id="main-pane" class="main-pane"></main>

        <!-- atmosphere canvas injected by Atmosphere.start() -->
      </div>
    `;

    // Mobile hamburger — open sidebar overlay
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
    // Desktop collapse / expand
    function toggleSidebarCollapse() {
      document.body.classList.toggle('sidebar-collapsed');
    }
    document.getElementById('sidebar-collapse-btn').addEventListener('click', toggleSidebarCollapse);
    document.getElementById('sidebar-expand-tab').addEventListener('click', toggleSidebarCollapse);
    // Expose globally so the play toolbar can also toggle
    window.toggleSidebarCollapse = toggleSidebarCollapse;

    MIDI.on('status', (text, kind) => {
      const el = document.getElementById('midi-status');
      if (!el) return;
      el.textContent = text;
      el.classList.remove('idle', 'live', 'error');
      el.classList.add(kind);
    });
  }

  function registerRoutes() {
    Router.register('/', (p, m) => Router.go('/play'));
    Router.register('/play', PagePlay.render);
    Router.register('/practice', PagePracticeLanding.render);
    Router.register('/practice/scales', PageScalesHub.render);
    Router.register('/practice/scales/:mode/:key', PageScalesDrill.render);
    Router.register('/practice/chord-types', PageChordTypesHub.render);
    Router.register('/practice/chord-types/:type', PageChordTypesDrill.render);
    Router.register('/practice/progressions', PageProgressionsHub.render);
    Router.register('/practice/progressions/:cat', PageProgressionsCategory.render);
    Router.register('/practice/progressions/:cat/:id', PageProgressionsDrill.render);
    Router.register('/book', PageBook.render);
    Router.register('/inspiration', PageInspiration.render);

    Router.onChange((path) => {
      // Highlight nav link
      document.querySelectorAll('.nav-link').forEach(a => {
        const r = a.dataset.route;
        a.classList.toggle('active', path === r || path.startsWith(r + '/'));
      });
      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    mountChrome();
    registerRoutes();
    MIDI.init();
    Energy.start();
    Atmosphere.start();
    Router.start();
  });
})();
