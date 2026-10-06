import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* Every font-size in the app used to be a hardcoded px value: 130 of them
   across 25 distinct sizes, from 9px to 27px, with half-pixel steps that put
   adjacent sizes at 1.03 ratios. This file is the guard that keeps them on
   the scale. */

const CSS = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.css')) CSS.push([path, readFileSync(path, 'utf8')]);
  }
})('src');

const declarations = CSS.flatMap(([path, css]) =>
  css.split('\n').flatMap((line, i) => {
    const m = line.match(/font-size:\s*([^;}]+)/);
    return m ? [{ path, line: i + 1, value: m[1].trim() }] : [];
  }),
);

/* Read the rungs from the design system itself, so a font-size naming a token
   the system does not define fails here rather than silently rendering at the
   inherited size — which is exactly how --text-3xs behaved before the system
   shipped it. */
const DEFINED = new Set(
  [...readFileSync('node_modules/axelerate-design-system/tokens/typography.css', 'utf8')
    .matchAll(/(--text-[a-z0-9]+)\s*:/g)].map((m) => m[1]),
);

describe('type scale', () => {
  test('no stylesheet hardcodes a font size', () => {
    const hardcoded = declarations
      .filter((d) => /\d/.test(d.value) && !d.value.includes('var(--text-'))
      .map((d) => `${d.path}:${d.line} — ${d.value}`);
    expect(hardcoded).toEqual([]);
  });

  test('every font size names a rung the design system actually defines', () => {
    const offScale = declarations
      .map((d) => ({ ...d, token: (d.value.match(/var\((--text-[a-z0-9]+)\)/) || [])[1] }))
      .filter((d) => d.token && !DEFINED.has(d.token))
      .map((d) => `${d.path}:${d.line} — ${d.token}`);
    expect(offScale).toEqual([]);
  });

  test('the app screens commit to the five-rung ladder', () => {
    // --text-md and the display rungs are the gate/legal register; the shell
    // itself should be 3xs · xs · sm · lg · xl and nothing else.
    const APP_LADDER = new Set(['--text-3xs', '--text-xs', '--text-sm', '--text-lg', '--text-xl', '--text-2xl']);
    const strays = declarations
      .filter((d) => d.path.startsWith('src/app/') && !d.path.endsWith('welcome.css'))
      .map((d) => ({ ...d, token: (d.value.match(/var\((--text-[a-z0-9]+)\)/) || [])[1] }))
      .filter((d) => !d.token || !APP_LADDER.has(d.token))
      .map((d) => `${d.path}:${d.line} — ${d.value}`);
    expect(strays).toEqual([]);
  });

  test('the scale is used, not merely available', () => {
    const used = new Set(
      declarations.map((d) => (d.value.match(/var\((--text-[a-z0-9]+)\)/) || [])[1]).filter(Boolean),
    );
    for (const rung of ['--text-3xs', '--text-xs', '--text-sm', '--text-lg', '--text-xl']) {
      expect(used, `${rung} is defined but nothing uses it`).toContain(rung);
    }
  });
});
