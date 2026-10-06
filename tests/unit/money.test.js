import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { usd, credit, CREDIT_PER_DOLLAR } from '../../src/app/parts/Money.jsx';

describe('usd', () => {
  test('formats with a thousands separator and no cents', () => {
    expect(usd(25)).toBe('$25');
    expect(usd(1200)).toBe('$1,200');
    expect(usd(0)).toBe('$0');
  });
  test('renders cents only when there are cents', () => {
    expect(usd(1.5)).toBe('$1.50');
    expect(usd(0.5)).toBe('$0.50');
    expect(usd(1234.5)).toBe('$1,234.50');
    expect(usd(24)).toBe('$24');          // whole dollars stay bare
  });
});

describe('credit — R1: never a bare number', () => {
  test("matches the product spec's own example exactly", () => {
    // Product spec §2.1.1: "2,400 credit · $24 in shop"
    expect(credit(2400)).toBe('2,400 credit · $24 in shop');
  });
  test("converts the design's +8,000 pts", () => {
    expect(credit(8000)).toBe('8,000 credit · $80 in shop');
  });
  test('the rate is 100 credit to the dollar', () => {
    expect(CREDIT_PER_DOLLAR).toBe(100);
    expect(credit(100)).toBe('100 credit · $1 in shop');
  });
  test('returns null for no credit so callers can omit the row', () => {
    expect(credit(null)).toBeNull();
    expect(credit(undefined)).toBeNull();
  });
  test('a credit value that is not a whole number of dollars still formats cleanly', () => {
    expect(credit(150)).toBe('150 credit · $1.50 in shop');
  });
});

describe('no screen formats credit by hand', () => {
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.jsx?$/.test(e.name)) out.push(p);
    }
    return out;
  }
  // Prose may mention credit; only Money.jsx may pair a number with it.
  const FORMATTED = /\d[\d,]*\s*credit\b|\bcredit\s*[·:]\s*\$/i;
  test('only Money.jsx pairs a number with the word credit', () => {
    const offenders = walk('src/app')
      .filter((p) => !p.endsWith('Money.jsx'))
      .filter((p) => FORMATTED.test(readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
    expect(offenders).toEqual([]);
  });
});

describe('no screen re-implements usd() by hand', () => {
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.jsx?$/.test(e.name)) out.push(p);
    }
    return out;
  }
  // A hand-rolled `'$' + n.toLocaleString(...)` is exactly the $12.5 defect
  // usd() was built to fix. Only Money.jsx may compose a dollar sign this way.
  test('no file under src/app other than Money.jsx contains \'$\' + or "$" +', () => {
    const offenders = walk('src/app')
      .filter((p) => !p.endsWith('Money.jsx'))
      .filter((p) => /'\$'\s*\+|"\$"\s*\+/.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
