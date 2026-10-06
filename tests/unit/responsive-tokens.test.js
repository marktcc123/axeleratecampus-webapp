import { readFileSync } from 'node:fs';

const EXPECTED = {
  '--text-6xl':       { base: '3rem',      md: '4rem',     lg: '5rem' },
  '--text-5xl':       { base: '2.5rem',    md: '3.125rem', lg: '3.75rem' },
  '--text-4xl':       { base: '2.125rem',  md: '2.5rem',   lg: '2.875rem' },
  '--text-3xl':       { base: '1.8125rem', md: '2rem',     lg: '2.25rem' },
  '--text-2xl':       { base: '1.5625rem', md: '1.625rem', lg: '1.75rem' },
  '--container-max':  { base: '100%',      md: '100%',     lg: '1160px' },
  '--gutter':         { base: '20px',      md: '32px',     lg: '24px' },
  '--space-4xl':      { base: '56px',      md: '72px',     lg: '96px' },
  '--space-3xl':      { base: '40px',      md: '52px',     lg: '64px' },
};

/* --text-xl is not overridden here: it is 21px at every tier. It is the
   floor the stepped display rungs have to clear, because it used to sit
   ABOVE --text-2xl on phones. */
// --text-xl is 21px since the ladder stepped down (design system 0be32c5).
const TEXT_XL_PX = 21;
const DISPLAY_RUNGS = ['--text-2xl', '--text-3xl', '--text-4xl', '--text-5xl', '--text-6xl'];
const toPx = (v) => (v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v));

const css = readFileSync('src/styles/responsive.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function block(name) {
  if (name === 'base') return css.split('@media')[0];
  const min = name === 'md' ? '641px' : '1025px';
  const re = new RegExp(`@media\\s*\\(min-width:\\s*${min}\\)\\s*\\{([\\s\\S]*?)\\}\\s*\\}`);
  const m = css.match(re);
  if (!m) throw new Error(`no @media (min-width: ${min}) block`);
  return m[1];
}

function valueIn(blk, token) {
  const m = blk.match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : undefined;
}

describe('responsive.css token override layer', () => {
  for (const [token, tiers] of Object.entries(EXPECTED)) {
    for (const [tier, value] of Object.entries(tiers)) {
      test(`${token} is ${value} at ${tier}`, () => {
        expect(valueIn(block(tier), token)).toBe(value);
      });
    }
  }

  // The bug this guards: the file used to step --text-2xl down to 20px on
  // phones while leaving --text-xl at 21px, so the scale ran backwards at
  // exactly the sizes screen titles use.
  describe.each(['base', 'md', 'lg'])('the %s ladder ascends', (tier) => {
    test('every display rung is larger than the one below it, starting from --text-xl', () => {
      const sizes = DISPLAY_RUNGS.map((t) => toPx(EXPECTED[t][tier]));
      const ladder = [TEXT_XL_PX, ...sizes];
      for (let i = 1; i < ladder.length; i++) {
        expect(ladder[i]).toBeGreaterThan(ladder[i - 1]);
      }
    });

    test('no two adjacent rungs sit closer than a 1.125 ratio', () => {
      const ladder = [TEXT_XL_PX, ...DISPLAY_RUNGS.map((t) => toPx(EXPECTED[t][tier]))];
      for (let i = 1; i < ladder.length; i++) {
        expect(ladder[i] / ladder[i - 1]).toBeGreaterThanOrEqual(1.125);
      }
    });
  });

  test('a rung never shrinks as the viewport grows', () => {
    for (const token of DISPLAY_RUNGS) {
      const { base, md, lg } = EXPECTED[token];
      expect(toPx(md)).toBeGreaterThanOrEqual(toPx(base));
      expect(toPx(lg)).toBeGreaterThanOrEqual(toPx(md));
    }
  });

  test('redefines ONLY the nine approved tokens — no new names, nothing else moved', () => {
    const declared = [...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    const unexpected = declared.filter((t) => !(t in EXPECTED));
    expect(unexpected).toEqual([]);
  });

  test('is mobile-first: base :root has no media query, md and lg use min-width', () => {
    expect(css).not.toMatch(/max-width/);
    expect(css).toMatch(/@media\s*\(min-width:\s*641px\)/);
    expect(css).toMatch(/@media\s*\(min-width:\s*1025px\)/);
  });
});
