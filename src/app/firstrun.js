// What this browser has already been shown. There is no backend, so this is
// the browser's own store — per device, and honest about it: a browser that
// blocks storage shows the intro again rather than throwing on read.
//
// Keys this module owns: 'intro' (the four onboarding screens at /) and
// 'account-menu' (the ring on the header's avatar until the drawer is opened).
//
// window.localStorage, not the bare global: Node 26 defines a `localStorage`
// of its own that is unavailable without --localstorage-file, and under jsdom
// that global shadows the one jsdom provides. Reading it off `window` gets the
// real store in a browser and in a test, and `?.` covers a non-DOM environment
// rather than throwing on import.
const KEY = 'ax.firstrun';
const store = () => (typeof window === 'undefined' ? null : window.localStorage);

const read = () => {
  try { return JSON.parse(store()?.getItem(KEY) ?? '{}'); } catch { return {}; }
};
const write = (o) => {
  try { store()?.setItem(KEY, JSON.stringify(o)); } catch { /* fails open */ }
};

export const seen = (key) => read()[key] === true;
export const markSeen = (key) => write({ ...read(), [key]: true });
export const reset = () => write({});
