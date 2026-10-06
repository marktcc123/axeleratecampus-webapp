// The five routes that only redirect. Renaming a tab (/app/perks -> /app/discover,
// /app/join -> /app/unlock) leaves these behind so old links and bookmarks still
// answer — but nothing the app SHIPS should point at one. They are not 404s, so
// a stale link never announces itself: after the mission tracker moved to
// /app/me/missions, "Back to mission tracker" pointed at /app/join and landed
// the student on the Unlock tab instead. That is what this catches.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REDIRECT_ONLY = ['/app/perks', '/app/join', '/app/me/levels', '/app/me/events'];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(jsx?|json)$/.test(name) ? [path] : [];
  });
}

test('nothing in the app links to a route that only redirects', () => {
  const offenders = [];
  for (const file of walk('src')) {
    // App.jsx is where the redirects are declared; it is allowed to name them.
    if (file.endsWith(join('src', 'App.jsx'))) continue;
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      // to="/x", to={'/x'}, the menu arrays' to: '/x' and JSON's "to": "/x" —
      // every shape a destination takes in this codebase. Comments are skipped:
      // they are where the moves get explained.
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
      for (const m of line.matchAll(/\bto(?:=|["']?\s*:)\s*\{?['"]([^'"]+)['"]\}?/g)) {
        const dest = m[1];
        if (REDIRECT_ONLY.some((r) => dest === r || dest.startsWith(`${r}/`))) {
          offenders.push(`${file}:${i + 1} -> ${dest}`);
        }
      }
    });
  }
  expect(offenders, offenders.join('\n')).toEqual([]);
});

test('and those redirects still exist, so old links keep answering', () => {
  const app = readFileSync('src/App.jsx', 'utf8');
  for (const route of REDIRECT_ONLY) {
    expect(app, route).toContain(`path="${route}"`);
  }
});
