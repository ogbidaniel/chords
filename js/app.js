// app.js — top-level wiring.

(function () {
  // Register routes
  Router.register('/',              (p, m) => PagePlay.render(p, m));
  Router.register('/play',          (p, m) => PagePlay.render(p, m));
  Router.register('/practice',      (p, m) => PagePractice.render(p, m));
  Router.register('/book',          (p, m) => PageBook.render(p, m));
  Router.register('/inspiration',   (p, m) => PageInspiration.render(p, m));

  const navItems = [
    { href: '#/play',        label: 'Play',        match: ['/', '/play'] },
    { href: '#/practice',    label: 'Practice',    match: ['/practice'] },
    { href: '#/book',        label: 'Book',        match: ['/book'] },
    { href: '#/inspiration', label: 'Inspiration', match: ['/inspiration'] },
  ];

  function renderNav() {
    const navEl = document.getElementById('side-nav');
    navEl.innerHTML = navItems.map(item => `
      <a class="nav-item mono" href="${item.href}" data-match='${JSON.stringify(item.match)}'>${item.label}</a>
    `).join('');
  }
  renderNav();

  Router.onChange(path => {
    document.querySelectorAll('.nav-item').forEach(a => {
      const matches = JSON.parse(a.dataset.match);
      a.classList.toggle('active', matches.includes(path));
    });
    document.body.classList.remove('drawer-open');
  });

  document.getElementById('drawer-toggle').addEventListener('click', () => {
    document.body.classList.toggle('drawer-open');
  });
  document.getElementById('sidebar-scrim').addEventListener('click', () => {
    document.body.classList.remove('drawer-open');
  });

  MIDI.on('status', (text, kind) => {
    const dot = document.getElementById('midi-dot');
    const label = document.getElementById('midi-status-text');
    if (dot) dot.className = 'status-dot ' + (kind === 'live' ? 'live' : kind === 'error' ? 'error' : 'idle');
    if (label) label.textContent = text;
  });

  MIDI.init();
  Router.start();
})();
