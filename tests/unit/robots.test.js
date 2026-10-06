// public/robots.txt is the one half of "do not index a student's profile" that
// a compliant crawler actually honours (the file's own comment, and
// src/app/useNoIndex.js, say why the meta tag is not the other half). It names
// a path, and paths move: the public profile went from /user/:handle to
// /u/:handle on 2026-09-08 and the Disallow stayed on the old path for two
// weeks, guarding a redirect while the page itself sat open. So this derives
// the answer from App.jsx rather than restating it — every route whose
// component asks not to be indexed must be disallowed, whatever it is called.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const APP = 'src/App.jsx';

function resolveImport(from, spec) {
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.jsx`, `${base}.js`, resolve(base, 'index.jsx')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

// local component name -> the file it comes from, for every relative import.
function componentFiles(app) {
  const files = new Map();
  for (const m of app.matchAll(/^import\s+(?:(\w+)|\{([^}]+)\})\s+from\s+'([^']+)';?/gm)) {
    const [, def, named, spec] = m;
    if (!spec.startsWith('.')) continue;
    const file = resolveImport(APP, spec);
    if (!file) continue;
    if (def) files.set(def, file);
    if (named) {
      for (const n of named.split(',')) {
        const local = n.trim().split(/\s+as\s+/).pop();
        if (local) files.set(local, file);
      }
    }
  }
  return files;
}

// Route paths whose own component calls useNoIndex().
function noIndexRoutes(app) {
  const files = componentFiles(app);
  const routes = [];
  for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)[\s/>]/g)) {
    const [, path, name] = m;
    const file = files.get(name);
    if (file && /\buseNoIndex\(/.test(readFileSync(file, 'utf8'))) routes.push(path);
  }
  return routes;
}

// "/u/:handle" -> "/u/": the fixed part of the path, with the trailing slash
// that stops Disallow: /u from also covering /unlock.
function prefixOf(path) {
  const fixed = [];
  for (const seg of path.split('/').filter(Boolean)) {
    if (seg.startsWith(':') || seg === '*') break;
    fixed.push(seg);
  }
  return `/${fixed.join('/')}/`;
}

test('robots.txt disallows every route that asks not to be indexed', () => {
  const app = readFileSync(APP, 'utf8');
  const routes = noIndexRoutes(app);
  // Zero would mean the search found nothing, not that nothing needs hiding.
  expect(routes.length).toBeGreaterThan(0);

  const robots = readFileSync('public/robots.txt', 'utf8');
  const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
  for (const route of routes) {
    // A nested relative path would need its parent's prefix; nothing under a
    // layout asks not to be indexed today, and this says so if that changes.
    expect(route, `${route} is relative; give it an absolute path`).toMatch(/^\//);
    const prefix = prefixOf(route);
    expect(disallowed, `${route} is noindex but robots.txt does not disallow ${prefix}`)
      .toContain(prefix);
  }
});
