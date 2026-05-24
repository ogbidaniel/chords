// drills.js — drill catalog and progression library.

const Drills = (() => {

  // Named progressions used by drills and lessons (degree-based, transposable)
  const PROGRESSIONS = {
    'major-ii-V-I':   { name: 'ii–V–I (major)',  pattern: ['ii','V','I'],         mode: 'major' },
    'minor-ii-V-i':   { name: 'ii–V–i (minor)',  pattern: ['ii','V','I'],         mode: 'minor' },
    'I-vi-ii-V':      { name: 'I–vi–ii–V (rhythm)', pattern: ['I','vi','ii','V'], mode: 'major' },
    'I-IV-V':         { name: 'I–IV–V',          pattern: ['I','IV','V'],         mode: 'major' },
    'circle-fourths': { name: 'Cycle of fourths', pattern: ['I','IV','vii','iii','vi','ii','V','I'], mode: 'major' },
  };

  // Build a list of {roman, rootPc, quality, name} for a progression in a key
  function realize(progKey, tonicPc) {
    const p = PROGRESSIONS[progKey];
    if (!p) return null;
    const diatonic = Theory.diatonicSevenths(tonicPc, p.mode);
    const lookup = Object.fromEntries(diatonic.map(c => [c.degree.toLowerCase().replace(/[ø°]/g, ''), c]));
    // Build by matching pattern entries to diatonic degrees (case-insensitive)
    return p.pattern.map(deg => {
      const key = deg.toLowerCase();
      // Find by case-insensitive degree match
      const match = diatonic.find(c => c.degree.toLowerCase().startsWith(key));
      return match || null;
    }).filter(Boolean);
  }

  // The drill catalog. Each drill: id, title, summary, source, build() -> array of items.
  // Items are { prompt, targetPcs:Set, targetMidi:[], targetName, contextKey? }
  const CATALOG = [
    {
      id: 'cycle-ii-v-i',
      title: 'Cycle ii–V–I',
      summary: 'Walk a ii–V–I through every key around the cycle of fourths. 36 chords, alternating Cat A and Cat B voicings.',
      source: 'Davey · Mt. Hood',
      difficulty: 'intermediate',
      build() {
        // Cycle of fourths: C, F, Bb, Eb, Ab, Db, Gb/F#, B, E, A, D, G
        const items = [];
        for (const tonicPc of Theory.CYCLE_FOURTHS) {
          const chords = realize('major-ii-V-I', tonicPc);
          for (const ch of chords) {
            items.push({
              prompt: ch.name,
              targetPcs: new Set(Theory.chordPcs(ch.rootPc, ch.quality)),
              targetMidi: Theory.chordMidi(ch.rootPc, ch.quality, 4),
              targetName: ch.name,
              contextKey: tonicPc,
              roman: ch.degree,
            });
          }
        }
        return items;
      },
    },
    {
      id: 'quality-flashcards',
      title: 'Chord-quality flashcards',
      summary: 'See a chord name, play it. All five core qualities × 12 roots, in random order. Speed builds confidence.',
      source: 'Dyas · 5 chord qualities',
      difficulty: 'beginner',
      build() {
        const qualities = ['maj7','7','m7','m7b5','dim7'];
        const items = [];
        for (let pc = 0; pc < 12; pc++) {
          for (const q of qualities) {
            items.push({
              prompt: Theory.chordName(pc, q),
              targetPcs: new Set(Theory.chordPcs(pc, q)),
              targetMidi: Theory.chordMidi(pc, q, 4),
              targetName: Theory.chordName(pc, q),
            });
          }
        }
        // Shuffle
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        return items;
      },
    },
    {
      id: 'diatonic-7ths',
      title: 'Diatonic 7ths in a key',
      summary: 'In a given key, play the I, ii, iii, IV, V, vi, or viiø chord. Tests your knowledge of chord-in-key relationships.',
      source: 'Standard theory',
      difficulty: 'beginner',
      build() {
        const items = [];
        for (let pc = 0; pc < 12; pc++) {
          const diatonic = Theory.diatonicSevenths(pc, 'major');
          for (const ch of diatonic) {
            items.push({
              prompt: `${ch.degree} in ${Theory.pcName(pc, Theory.preferFlat(pc))}`,
              targetPcs: new Set(Theory.chordPcs(ch.rootPc, ch.quality)),
              targetMidi: Theory.chordMidi(ch.rootPc, ch.quality, 4),
              targetName: ch.name,
              contextKey: pc,
              roman: ch.degree,
            });
          }
        }
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        return items.slice(0, 40); // Cap to 40 items per session
      },
    },
    {
      id: 'minor-ii-v-i',
      title: 'Minor ii–V–i in all 12 keys',
      summary: 'The darker cousin. Half-diminished ii → altered V → minor i. 36 chords through the cycle.',
      source: 'Dyas · Monk Institute',
      difficulty: 'intermediate',
      build() {
        const items = [];
        for (const tonicPc of Theory.CYCLE_FOURTHS) {
          const chords = realize('minor-ii-V-i', tonicPc);
          for (const ch of chords) {
            items.push({
              prompt: ch.name,
              targetPcs: new Set(Theory.chordPcs(ch.rootPc, ch.quality)),
              targetMidi: Theory.chordMidi(ch.rootPc, ch.quality, 4),
              targetName: ch.name,
              contextKey: tonicPc,
              roman: ch.degree,
            });
          }
        }
        return items;
      },
    },
  ];

  function getDrill(id) { return CATALOG.find(d => d.id === id) || null; }

  // ---- Stats (localStorage) ----
  const STATS_KEY = 'chords.drill.stats';

  function loadStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveStats(s) { localStorage.setItem(STATS_KEY, JSON.stringify(s)); }

  function recordAttempt(drillId, correct, timeMs) {
    const all = loadStats();
    const s = all[drillId] || { attempts: 0, correct: 0, totalTimeMs: 0, lastPlayed: 0 };
    s.attempts++;
    if (correct) s.correct++;
    s.totalTimeMs += timeMs;
    s.lastPlayed = Date.now();
    all[drillId] = s;
    saveStats(all);
    return s;
  }
  function getStats(drillId) {
    const all = loadStats();
    return all[drillId] || { attempts: 0, correct: 0, totalTimeMs: 0, lastPlayed: 0 };
  }
  function resetStats(drillId) {
    const all = loadStats();
    delete all[drillId];
    saveStats(all);
  }

  return { PROGRESSIONS, CATALOG, realize, getDrill, recordAttempt, getStats, resetStats };
})();

if (typeof window !== 'undefined') window.Drills = Drills;
