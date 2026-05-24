// pages/lessons.js — lesson catalog and Markdown lesson renderer with
// interactive chord pill syntax: [[Cmaj7]] or [[Dm7 → G7 → Cmaj7]].

const PageLessons = (() => {
  // Hard-coded lesson catalog. Each entry references a markdown file in /lessons-content.
  const LESSONS = [
    {
      slug: 'circle-of-fifths-progressions',
      title: 'Circle of Fifths Progressions',
      source: 'Adapted from Weissman · Alfred Handy Guide',
      topic: 'Progressions',
      summary: 'How chord movement around the cycle of fifths underpins almost all jazz harmony. ii–V–I, tritone subs, the minor cousin.',
    },
    {
      slug: 'inversions-and-voice-leading',
      title: 'Chord Inversions and Smooth Voice Leading',
      source: 'Adapted from Weissman · Alfred Handy Guide',
      topic: 'Voicings',
      summary: 'Same notes, different bass. How inversions transform an angular progression into a flowing one — and how the half-step rule makes ii–V–I sing.',
    },
  ];

  function renderCatalog(params, main) {
    main.innerHTML = `
      <div class="lessons-page">
        <header class="ref-header">
          <h1 class="display">Lessons</h1>
          <p class="ref-lede">Long-form material from books and handouts. Click a chord pill in any lesson to hear and visualize it.</p>
        </header>
        <div class="lessons-list">
          ${LESSONS.map(l => `
            <a class="lesson-row" href="#/lessons/${l.slug}">
              <div class="lesson-row-main">
                <p class="cell-eyebrow mono">${l.topic} · ${l.source}</p>
                <h2 class="lesson-row-title display">${l.title}</h2>
                <p class="lesson-row-summary">${l.summary}</p>
              </div>
              <span class="lesson-row-arrow mono">→</span>
            </a>
          `).join('')}
          <div class="lessons-coming">
            <p class="cell-eyebrow mono">Coming soon</p>
            <p class="lesson-row-summary">More lessons will be added from photographed pages of Weissman's <em>Basic Chord Progressions</em>, the Davey handout, the Dyas Monk Institute materials, and others.</p>
          </div>
        </div>
      </div>
    `;
  }

  async function renderLesson(params, main) {
    const slug = params.slug;
    const meta = LESSONS.find(l => l.slug === slug);
    if (!meta) {
      main.innerHTML = `<div class="lessons-page"><p>Lesson not found. <a href="#/lessons">Back →</a></p></div>`;
      return;
    }

    main.innerHTML = `<div class="lessons-page"><p class="cell-eyebrow mono">Loading…</p></div>`;

    let md = '';
    try {
      const res = await fetch(`./lessons-content/${slug}.md`);
      md = await res.text();
    } catch (e) {
      main.innerHTML = `<div class="lessons-page"><p>Couldn't load this lesson.</p></div>`;
      return;
    }

    // Strip YAML front matter
    md = md.replace(/^---[\s\S]*?---\s*/m, '');

    main.innerHTML = `
      <article class="lesson-article">
        <header class="lesson-article-head">
          <a class="lesson-back mono" href="#/lessons">← Back to lessons</a>
          <p class="cell-eyebrow mono">${meta.source}</p>
        </header>
        <div class="lesson-prose" id="lesson-prose"></div>
      </article>
    `;
    document.getElementById('lesson-prose').innerHTML = renderMarkdown(md);
    wireChordPills();
  }

  // ---- Minimal Markdown -> HTML ----
  function renderMarkdown(md) {
    // Pre-protect chord pills (handle progressions first, then single chords).
    // Use placeholders so they survive other transformations.
    const pills = [];
    md = md.replace(/\[\[([^\]]+)\]\]/g, (match, contents) => {
      pills.push(contents.trim());
      return `\x00PILL${pills.length - 1}\x00`;
    });

    // Escape HTML
    md = md.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

    // Headings
    md = md.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    md = md.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    md = md.replace(/^# (.+)$/gm, '<h1 class="display">$1</h1>');

    // Bold + italic
    md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Lists (basic ol/ul)
    md = md.replace(/(^|\n)((?:\d+\. .+\n?)+)/g, (_, pre, block) => {
      const items = block.trim().split('\n').map(l => l.replace(/^\d+\. /, '')).map(t => `<li>${t}</li>`).join('');
      return `${pre}<ol>${items}</ol>`;
    });
    md = md.replace(/(^|\n)((?:- .+\n?)+)/g, (_, pre, block) => {
      const items = block.trim().split('\n').map(l => l.replace(/^- /, '')).map(t => `<li>${t}</li>`).join('');
      return `${pre}<ul>${items}</ul>`;
    });

    // Links
    md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Paragraphs — split on blank lines, wrap remaining text blocks
    const blocks = md.split(/\n{2,}/).map(b => {
      const trimmed = b.trim();
      if (!trimmed) return '';
      if (/^<(h\d|ul|ol|li|p|article|div|blockquote)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    });
    let html = blocks.join('\n');

    // Restore pills as interactive elements
    html = html.replace(/\x00PILL(\d+)\x00/g, (_, idx) => {
      const content = pills[parseInt(idx, 10)];
      // Progression vs single chord
      if (/[→]|->|—/.test(content)) {
        const chords = content.split(/\s*(?:→|->|—)\s*/).filter(Boolean);
        const data = chords.map(c => parseChordName(c)).filter(Boolean);
        const dataStr = encodeURIComponent(JSON.stringify(data));
        return `<button class="prog-pill" data-prog="${dataStr}">${chords.map(c => `<span class="prog-chord">${escapeText(c)}</span>`).join('<span class="prog-arrow mono">→</span>')}</button>`;
      } else {
        const parsed = parseChordName(content);
        if (!parsed) return `<code>${escapeText(content)}</code>`;
        const dataStr = encodeURIComponent(JSON.stringify(parsed));
        return `<button class="chord-pill" data-chord="${dataStr}">${escapeText(content)}</button>`;
      }
    });

    return html;
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Parse a chord name like "Dm7", "Cmaj7", "G7", "Bb7", "Dø", "F#m7b5", "C/E"
  // into {rootPc, quality, bassPc?}. Slash chords supported.
  function parseChordName(s) {
    s = s.trim();
    // Slash chord: split on /
    let bassPart = null;
    if (s.includes('/')) {
      const parts = s.split('/');
      s = parts[0].trim();
      bassPart = parts[1].trim();
    }
    // Root: 1 letter + optional # or b
    const m = s.match(/^([A-G])([#b]?)(.*)$/);
    if (!m) return null;
    const rootPc = Theory.NAME_TO_PC[m[1] + m[2]];
    if (rootPc == null) return null;
    const rest = (m[3] || '').trim();

    // Exact-match suffix map. Order doesn't matter when matching exactly.
    const suffixMap = {
      '':        'maj',
      'maj':     'maj',
      'M':       'maj',
      'm':       'm',
      'min':     'm',
      'dim':     'dim',
      '°':       'dim',
      'aug':     'aug',
      '+':       'aug',
      'sus2':    'sus2',
      'sus4':    'sus4',
      'sus':     'sus4',
      '6':       '6',
      'm6':      'm6',
      'min6':    'm6',
      '7':       '7',
      'maj7':    'maj7',
      'M7':      'maj7',
      'Δ':       'maj7',
      'm7':      'm7',
      'min7':    'm7',
      '-7':      'm7',
      'm7b5':    'm7b5',
      'ø':       'm7b5',
      'dim7':    'dim7',
      '°7':      'dim7',
      'o7':      'dim7',
      'mMaj7':   'mMaj7',
      'm(maj7)': 'mMaj7',
      '7sus4':   '7sus4',
      '7sus':    '7sus4',
      'aug7':    'aug7',
      '+7':      'aug7',
      '9':       '9',
      'maj9':    'maj9',
      'M9':      'maj9',
      'm9':      'm9',
      '7b9':     '7b9',
      '7#9':     '7#9',
      '7b5':     '7b5',
      '7#5':     '7#5',
      '7#11':    '7#11',
    };
    const quality = suffixMap[rest];
    if (quality == null) return null;

    const result = { rootPc, quality };
    if (bassPart) {
      const bm = bassPart.match(/^([A-G])([#b]?)$/);
      if (bm) {
        const bassPc = Theory.NAME_TO_PC[bm[1] + bm[2]];
        if (bassPc != null) result.bassPc = bassPc;
      }
    }
    return result;
  }

  // Wire chord pills (after render). We use a single inline mini-keyboard that
  // expands underneath whichever pill was clicked.
  let activePill = null;
  let pillKeyboard = null;

  function wireChordPills() {
    document.querySelectorAll('.chord-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = JSON.parse(decodeURIComponent(btn.dataset.chord));
        showPillPanel(btn, [data]);
      });
    });
    document.querySelectorAll('.prog-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = JSON.parse(decodeURIComponent(btn.dataset.prog));
        showPillPanel(btn, data);
      });
    });
  }

  function showPillPanel(anchorEl, chords) {
    // Remove existing panel if it was attached to the same pill
    const existing = document.querySelector('.pill-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.className = 'pill-panel';
    panel.innerHTML = `
      <div class="pill-panel-head">
        <span class="cell-eyebrow mono">${chords.length === 1 ? 'Chord' : 'Progression'}</span>
        <button class="pill-panel-close mono">Close ×</button>
      </div>
      <div class="pill-panel-keyboard" id="pill-keyboard"></div>
      <div class="pill-panel-controls">
        <button class="ghost-btn mono" id="pill-play">▶ Play ${chords.length > 1 ? 'all' : ''}</button>
        ${chords.length > 1 ? chords.map((c, i) =>
          `<button class="ghost-btn mono pill-step-btn" data-step="${i}">${i+1}</button>`
        ).join('') : ''}
      </div>
    `;
    anchorEl.parentElement.insertBefore(panel, anchorEl.nextSibling);

    pillKeyboard = Keyboard.create({
      container: '#pill-keyboard',
      low: 48, high: 84,
      onPress: m => { MIDI.virtualNoteOn(m); Audio.play(m); },
      onRelease: m => { MIDI.virtualNoteOff(m); Audio.stop(m); },
    });
    // Slash-chord-aware MIDI realization
    function chordMidiForPill(c) {
      const notes = Theory.chordMidi(c.rootPc, c.quality, 4);
      if (c.bassPc != null) {
        // Bass note one octave below the chord
        notes.unshift(12 * 4 + ((c.bassPc % 12) + 12) % 12); // C3 = 48 = 12*(3+1)
      }
      return notes;
    }

    function showStep(i) {
      const c = chords[i];
      const midi = chordMidiForPill(c);
      pillKeyboard.setHints(new Set(midi));
    }
    showStep(0);

    panel.querySelector('.pill-panel-close').addEventListener('click', () => panel.remove());
    panel.querySelector('#pill-play').addEventListener('click', async () => {
      // Sequential playback
      for (let i = 0; i < chords.length; i++) {
        const c = chords[i];
        const midi = chordMidiForPill(c);
        showStep(i);
        Audio.playChord(midi, chords.length > 1 ? 1200 : 1500, 90);
        if (i < chords.length - 1) await new Promise(r => setTimeout(r, 1100));
      }
    });
    panel.querySelectorAll('.pill-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.step, 10);
        showStep(i);
        const c = chords[i];
        Audio.playChord(chordMidiForPill(c), 1500, 90);
      });
    });
  }

  return { catalog: renderCatalog, lesson: renderLesson };
})();

if (typeof window !== 'undefined') window.PageLessons = PageLessons;
