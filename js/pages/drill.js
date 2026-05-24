// pages/drill.js — drill catalog and active sessions.

const PageDrill = (() => {
  let activeSession = null;
  let keyboard = null;

  function renderCatalog(params, main) {
    main.innerHTML = `
      <div class="drill-page">
        <header class="ref-header">
          <h1 class="display">Drills</h1>
          <p class="ref-lede">Pick a drill. The page shows you a chord, you play it. Streak and accuracy stats persist on this device.</p>
        </header>
        <div class="drill-catalog">
          ${Drills.CATALOG.map(d => {
            const stats = Drills.getStats(d.id);
            const acc = stats.attempts ? Math.round(100 * stats.correct / stats.attempts) : null;
            return `
              <a class="drill-card" href="#/drill/${d.id}">
                <div class="drill-card-head">
                  <span class="cell-eyebrow mono">${d.difficulty}</span>
                  <span class="cell-eyebrow mono">${d.source}</span>
                </div>
                <h2 class="drill-card-title display">${d.title}</h2>
                <p class="drill-card-summary">${d.summary}</p>
                <div class="drill-card-stats mono">
                  ${stats.attempts ? `${stats.attempts} attempts · ${acc}% correct` : 'Not started yet'}
                </div>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderSession(params, main) {
    const drillId = params.id;
    const drill = Drills.getDrill(drillId);
    if (!drill) {
      main.innerHTML = `<div class="drill-page"><p>Drill not found. <a href="#/drill">Back to drills →</a></p></div>`;
      return;
    }

    main.innerHTML = `
      <div class="drill-session">
        <header class="drill-session-head">
          <div>
            <p class="cell-eyebrow mono">${drill.source}</p>
            <h1 class="display">${drill.title}</h1>
          </div>
          <a class="ref-play-btn mono" href="#/drill">← Back to drills</a>
        </header>

        <div class="drill-prompt">
          <div class="prompt-text">
            <span class="cell-eyebrow mono">Play this chord</span>
            <span class="prompt-name display" id="prompt-name">—</span>
            <span class="prompt-context mono" id="prompt-context"></span>
          </div>
          <div class="prompt-meta">
            <div class="prompt-stat"><span class="cell-eyebrow mono">Item</span><span class="mono" id="item-idx">1</span></div>
            <div class="prompt-stat"><span class="cell-eyebrow mono">Streak</span><span class="mono" id="streak">0</span></div>
            <div class="prompt-stat"><span class="cell-eyebrow mono">Accuracy</span><span class="mono" id="accuracy">—</span></div>
          </div>
        </div>

        <div class="drill-keyboard-card">
          <div id="drill-piano-container" class="piano-container"></div>
        </div>

        <div class="drill-controls">
          <button class="ghost-btn mono" id="skip-btn">Skip →</button>
          <button class="ghost-btn mono" id="hint-btn">Toggle hints</button>
          <button class="ghost-btn mono" id="play-target-btn">Hear target</button>
          <button class="ghost-btn mono" id="reset-stats-btn">Reset stats</button>
        </div>
      </div>
    `;

    keyboard = Keyboard.create({
      container: '#drill-piano-container',
      onPress: m => { MIDI.virtualNoteOn(m); Audio.play(m); },
      onRelease: m => { MIDI.virtualNoteOff(m); Audio.stop(m); },
    });

    const items = drill.build();
    activeSession = {
      drill, items, idx: 0,
      streak: 0, sessionCorrect: 0, sessionAttempts: 0,
      startTime: Date.now(),
      hintsOn: true,
      advancing: false,
    };
    showItem();

    MIDI.on('change', onChange);
    document.getElementById('skip-btn').addEventListener('click', skip);
    document.getElementById('hint-btn').addEventListener('click', toggleHints);
    document.getElementById('play-target-btn').addEventListener('click', playTarget);
    document.getElementById('reset-stats-btn').addEventListener('click', resetStats);
  }

  function showItem() {
    if (!activeSession) return;
    const item = activeSession.items[activeSession.idx];
    if (!item) return;
    document.getElementById('prompt-name').textContent = item.targetName;
    document.getElementById('prompt-context').textContent = item.contextKey != null
      ? `${item.roman} of ${Theory.pcName(item.contextKey, Theory.preferFlat(item.contextKey))} major`
      : '';
    document.getElementById('item-idx').textContent =
      `${activeSession.idx + 1} of ${activeSession.items.length}`;

    if (keyboard) {
      keyboard.setActive(new Set());
      if (activeSession.hintsOn) {
        keyboard.setHints(new Set(item.targetMidi));
      } else {
        keyboard.clearHints();
      }
    }
    activeSession.startTime = Date.now();
    activeSession.advancing = false;
  }

  function onChange(sounding) {
    if (!activeSession || activeSession.advancing) return;
    if (keyboard) keyboard.setActive(sounding);
    const item = activeSession.items[activeSession.idx];
    if (!item) return;

    const playedPcs = new Set([...sounding].map(n => n % 12));
    const target = item.targetPcs;
    if (playedPcs.size !== target.size) return;
    for (const pc of target) if (!playedPcs.has(pc)) return;

    // Correct!
    const elapsed = Date.now() - activeSession.startTime;
    activeSession.streak++;
    activeSession.sessionCorrect++;
    activeSession.sessionAttempts++;
    Drills.recordAttempt(activeSession.drill.id, true, elapsed);
    updateMeters();
    flashCorrect();
    activeSession.advancing = true;
    setTimeout(() => {
      if (!activeSession) return;
      activeSession.idx = (activeSession.idx + 1) % activeSession.items.length;
      showItem();
    }, 900);
  }

  function flashCorrect() {
    const card = document.querySelector('.drill-keyboard-card');
    if (!card) return;
    card.classList.add('correct-flash');
    setTimeout(() => card.classList.remove('correct-flash'), 600);
  }

  function updateMeters() {
    if (!activeSession) return;
    document.getElementById('streak').textContent = activeSession.streak;
    const stats = Drills.getStats(activeSession.drill.id);
    const acc = stats.attempts ? Math.round(100 * stats.correct / stats.attempts) : null;
    document.getElementById('accuracy').textContent = acc != null ? acc + '%' : '—';
  }

  function skip() {
    if (!activeSession) return;
    activeSession.streak = 0;
    activeSession.sessionAttempts++;
    Drills.recordAttempt(activeSession.drill.id, false, Date.now() - activeSession.startTime);
    updateMeters();
    activeSession.idx = (activeSession.idx + 1) % activeSession.items.length;
    showItem();
  }

  function toggleHints() {
    if (!activeSession) return;
    activeSession.hintsOn = !activeSession.hintsOn;
    showItem();
  }

  function playTarget() {
    if (!activeSession) return;
    const item = activeSession.items[activeSession.idx];
    if (item) Audio.playChord(item.targetMidi, 1500, 90);
  }

  function resetStats() {
    if (!activeSession) return;
    if (!confirm('Reset stats for this drill?')) return;
    Drills.resetStats(activeSession.drill.id);
    activeSession.streak = 0;
    activeSession.sessionCorrect = 0;
    activeSession.sessionAttempts = 0;
    updateMeters();
  }

  return { catalog: renderCatalog, session: renderSession };
})();

if (typeof window !== 'undefined') window.PageDrill = PageDrill;
