// app.js — top-level wiring. Sidebar, routes, header status, mute toggle.

(function() {
  // Register routes
  Router.register('/',                       (p, m) => PagePlay.render(p, m));
  Router.register('/play',                   (p, m) => PagePlay.render(p, m));
  Router.register('/reference',              (p, m) => Router.go('/reference/chords'));
  Router.register('/reference/chords',       (p, m) => PageReference.chords(p, m));
  Router.register('/reference/scales',       (p, m) => PageReference.scales(p, m));
  Router.register('/reference/intervals',    (p, m) => PageReference.intervals(p, m));
  Router.register('/reference/circle',       (p, m) => PageReference.circle(p, m));
  Router.register('/drill',                  (p, m) => PageDrill.catalog(p, m));
  Router.register('/drill/:id',              (p, m) => PageDrill.session(p, m));
  Router.register('/lessons',                (p, m) => PageLessons.catalog(p, m));
  Router.register('/lessons/:slug',          (p, m) => PageLessons.lesson(p, m));
  Router.register('/inspiration',            (p, m) => PageInspiration.render(p, m));

  // Sidebar nav data — emoji removed; lean, mono labels
  const navItems = [
    { href: '#/play',                label: 'Play',         match: ['/', '/play'] },
    { href: '#/reference/chords',    label: 'Chords',       match: ['/reference', '/reference/chords'] },
    { href: '#/reference/scales',    label: 'Scales',       match: ['/reference/scales'] },
    { href: '#/reference/intervals', label: 'Intervals',    match: ['/reference/intervals'] },
    { href: '#/reference/circle',    label: 'Circle of 5ths', match: ['/reference/circle'] },
    { href: '#/drill',               label: 'Drill',        match: ['/drill', /^\/drill\//] },
    { href: '#/lessons',             label: 'Lessons',      match: ['/lessons', /^\/lessons\//] },
    { href: '#/inspiration',         label: 'Inspiration',  match: ['/inspiration'] },
  ];

  function renderNav() {
    const navEl = document.getElementById('side-nav');
    navEl.innerHTML = navItems.map(item => `
      <a class="nav-item mono" href="${item.href}" data-match='${JSON.stringify(item.match.map(m => m instanceof RegExp ? '__rx__' + m.source : m))}'>${item.label}</a>
    `).join('');
  }
  renderNav();

  // Update active nav item when route changes
  Router.onChange((path) => {
    document.querySelectorAll('.nav-item').forEach(a => {
      const matches = JSON.parse(a.dataset.match);
      const active = matches.some(m => {
        if (typeof m === 'string' && m.startsWith('__rx__')) {
          return new RegExp(m.slice(6)).test(path);
        }
        return m === path;
      });
      a.classList.toggle('active', active);
    });
    // Close mobile drawer on nav
    document.body.classList.remove('drawer-open');
  });

  // Mobile drawer toggle
  document.getElementById('drawer-toggle').addEventListener('click', () => {
    document.body.classList.toggle('drawer-open');
  });
  document.getElementById('sidebar-scrim').addEventListener('click', () => {
    document.body.classList.remove('drawer-open');
  });

  // MIDI status pill
  MIDI.on('status', (text, kind) => {
    const dot = document.getElementById('midi-dot');
    const label = document.getElementById('midi-status-text');
    if (dot) dot.className = 'status-dot ' + (kind === 'live' ? 'live' : kind === 'error' ? 'error' : 'idle');
    if (label) label.textContent = text;
  });

  // Mute toggle
  function updateMuteBtn() {
    const btn = document.getElementById('mute-toggle');
    if (!btn) return;
    const muted = Audio.isMuted();
    btn.classList.toggle('muted', muted);
    btn.querySelector('.mute-label').textContent = muted ? 'Sound: muted' : 'Sound: on';
  }
  document.getElementById('mute-toggle').addEventListener('click', () => {
    Audio.toggleMuted();
    updateMuteBtn();
  });
  Audio.onChange(updateMuteBtn);
  updateMuteBtn();

  // Boot
  MIDI.init();
  Router.start();
})();
