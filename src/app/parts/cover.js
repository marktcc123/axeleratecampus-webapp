// Poster art for missions and events, keyed the way Icon keys the icon set: a
// fixture names a cover and this resolves it, throwing rather than rendering
// nothing when the name is wrong. A silent miss would show the placeholder box
// and read as a slot nobody had filled yet.
//
// One directory for both, because the sets overlap — the techno-party poster is
// a mission cover and an event cover, and two folders would mean two copies of
// the same 126 KB file.
//
// `no-inline` for the same reason Icon.jsx gives: without it Vite base64s
// anything under its 4KB assetsInlineLimit into the JS bundle. These are all
// well over it, so it changes nothing today and stops being true the moment a
// small cover is added.
// jpg photographs and svg packshots alike (the drawn ones arrived 2026-09-09
// so every product has art); a fixture names a cover without its extension.
const FILES = import.meta.glob('/src/assets/covers/*.{jpg,svg}', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
});

const COVERS = Object.fromEntries(
  Object.entries(FILES).map(([k, v]) => [k.split('/').pop().replace(/\.(jpg|svg)$/, ''), v]),
);

export function cover(name) {
  if (!name) return undefined;
  // Live catalogue rows carry a full URL; fixture rows carry a local key.
  if (/^https?:\/\//i.test(name)) return name;
  const src = COVERS[name];
  if (!src) {
    throw new Error(
      `Cover "${name}" is not in src/assets/covers — have ${Object.keys(COVERS).join(', ')}`,
    );
  }
  return src;
}

// Every cover on disk, for the console's art pickers. Read off the same glob
// the resolver uses, so a file dropped into src/assets/covers is selectable the
// moment it exists — a hand-kept list in each panel goes stale silently and an
// operator picks a name `cover()` then throws on.
export const coverNames = (prefix = '') =>
  Object.keys(COVERS).filter((n) => n.startsWith(prefix)).sort();
