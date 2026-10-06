import '@testing-library/jest-dom/vitest';

// jsdom does not implement these; ScrollToHash calls them on every route change.
Element.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};

// Nor, here, does it give us a working localStorage. Node defines a global
// `localStorage` that is unavailable without --localstorage-file, and it wins
// over the one jsdom installs: the object is present, but getItem and setItem
// are missing. src/app/firstrun.js fails open on that — the intro would simply
// be shown every time — which is the right behaviour in a browser that blocks
// storage and the wrong one for testing what a second visit does.
//
// A Map is enough: the app reads and writes JSON strings under its own keys.
const storageBroken = !window.localStorage
  || typeof window.localStorage.getItem !== 'function'
  || typeof window.localStorage.setItem !== 'function';
if (storageBroken) {
  const mem = new Map();
  const fake = {
    getItem: (k) => (mem.has(String(k)) ? mem.get(String(k)) : null),
    setItem: (k, v) => { mem.set(String(k), String(v)); },
    removeItem: (k) => { mem.delete(String(k)); },
    clear: () => mem.clear(),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: fake });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fake });
}

// The intro at / records that it has been shown (src/app/firstrun.js), in the
// browser's own store. That store lives for the whole file, so without this the
// first test to render / marks it seen and every later one silently gets the
// redirect instead — the kind of order dependence that passes locally and fails
// on a rerun.
beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* a blocked store is already empty */ }
});
