// practice-history.js — tracks recently visited drill routes.

const PracticeHistory = (() => {
  const KEY = 'chords.practiceHistory.v1';
  const MAX = 5;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }

  // Only count drill leaves, not hub pages.
  // Drill paths: /practice/scales/major/0, /practice/chord-types/maj7, /practice/progressions/jazz/blue-bossa
  function isDrillPath(path) {
    if (!path.startsWith('/practice/')) return false;
    const parts = path.split('/').filter(Boolean);
    // /practice/scales/major/0 → 4 parts
    // /practice/chord-types/maj7 → 3 parts
    // /practice/progressions/jazz/blue-bossa → 4 parts
    if (parts.length === 3 && parts[1] === 'chord-types') return true;
    if (parts.length === 4 && parts[1] === 'scales') return true;
    if (parts.length === 4 && parts[1] === 'progressions') return true;
    return false;
  }

  function record(path, label) {
    if (!isDrillPath(path)) return;
    let items = load();
    items = items.filter(it => it.path !== path);
    items.unshift({ path, label, at: Date.now() });
    if (items.length > MAX) items = items.slice(0, MAX);
    save(items);
  }
  function recent() { return load(); }
  function clear() { save([]); }

  return { record, recent, clear, isDrillPath };
})();

if (typeof window !== 'undefined') window.PracticeHistory = PracticeHistory;
