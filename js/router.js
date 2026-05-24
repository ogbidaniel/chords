// router.js — minimal hash router. No framework, no dependencies.
// Routes look like #/play, #/reference/chords, #/drill/quality-flashcards.

const Router = (() => {
  const routes = []; // [{ pattern: '/reference/:type', render: (params, el) => void }]
  const listeners = new Set();
  let currentPath = null;

  function register(pattern, render) {
    // Convert ":param" → capture group; "*" → catch-all
    const keys = [];
    const regexStr = pattern
      .replace(/:([a-zA-Z]+)/g, (m, k) => { keys.push(k); return '([^/]+)'; })
      .replace(/\*/g, '(.*)');
    routes.push({ pattern, regex: new RegExp('^' + regexStr + '$'), keys, render });
  }

  function match(path) {
    for (const r of routes) {
      const m = path.match(r.regex);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
        return { route: r, params };
      }
    }
    return null;
  }

  function go(path) {
    if (!path.startsWith('/')) path = '/' + path;
    if (location.hash === '#' + path) {
      // Same path — re-render
      handleChange();
    } else {
      location.hash = '#' + path;
    }
  }

  function handleChange() {
    const hash = location.hash.startsWith('#') ? location.hash.slice(1) : '/';
    const path = hash || '/';
    const main = document.getElementById('main-pane');
    const matched = match(path) || match('/');
    if (matched) {
      // Scroll top on route change (mobile-friendly)
      if (currentPath !== path) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        currentPath = path;
      }
      matched.route.render(matched.params, main);
      listeners.forEach(fn => fn(path, matched.route.pattern));
    }
  }

  function onChange(fn) { listeners.add(fn); }
  function currentPathOf() { return currentPath; }

  function start() {
    window.addEventListener('hashchange', handleChange);
    handleChange();
  }

  return { register, go, start, onChange, currentPathOf };
})();

if (typeof window !== 'undefined') window.Router = Router;
