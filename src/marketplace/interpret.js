import { parseBudget, tokens } from './text.js';

// Rule-based demand interpretation. A model can replace `interpretDemand`
// later; screens talk to this function, not to a vendor SDK.

const CATEGORIES = [
  {
    id: 'Beauty / Personal Care',
    words: ['sunscreen', 'spf', 'serum', 'moisturizer', 'moisturiser', 'lip', 'tint', 'skincare', 'cleanser', 'toner', 'balm'],
  },
  {
    id: 'Footwear',
    words: ['shoe', 'shoes', 'sneaker', 'sneakers', 'runner', 'runners', 'boot', 'boots'],
  },
  {
    id: 'Food & Drink',
    words: ['protein', 'drink', 'beverage', 'snack', 'coffee'],
  },
];

const PRODUCT_TYPES = [
  ['Sunscreen', /\bsunscreen\b|\bspf\b/],
  ['Moisturizer', /\bmoisturi[sz]er\b|\bbalm\b/],
  ['Lip tint', /\blip\b|\btint\b/],
  ['Serum', /\bserum\b/],
  ['Running shoes', /\b(running|shoe|shoes|sneaker)/],
  ['Protein drink', /\bprotein\b/],
];

const RULES = [
  { test: /no white cast|without (a )?white cast|white[\s-]?cast/, must: { attribute: 'white_cast', operator: 'equals', value: 'none' }, label: 'No white cast' },
  { test: /dry skin|for dry\b/, must: { attribute: 'skin_type', operator: 'supports', value: 'dry' }, label: 'Dry-skin friendly' },
  { test: /lightweight|light[\s-]?weight/, preference: { attribute: 'texture', value: 'lightweight' }, label: 'Lightweight' },
  { test: /korean/, preference: { attribute: 'origin', value: 'KR' }, label: 'Korean brand' },
  { test: /fragrance[\s-]?free|unscented/, must: { attribute: 'fragrance_free', operator: 'equals', value: true }, label: 'Fragrance free' },
  { test: /wide (fit|width)/, must: { attribute: 'width', operator: 'supports', value: 'wide' }, label: 'Wide fit' },
];

export function interpretDemand(rawText) {
  const text = String(rawText || '').trim();
  const lower = text.toLowerCase();
  const words = new Set(tokens(text));
  const category = CATEGORIES.find((c) => c.words.some((w) => words.has(w) || lower.includes(w)))?.id ?? null;
  const productType = PRODUCT_TYPES.find(([, re]) => re.test(lower))?.[0] ?? null;
  const mustHaves = [];
  const preferences = [];
  const labels = [];
  for (const rule of RULES) {
    if (!rule.test.test(lower)) continue;
    if (rule.must) mustHaves.push(rule.must);
    if (rule.preference) preferences.push(rule.preference);
    labels.push(rule.label);
  }
  const keywords = [...new Set([
    ...tokens(text),
    ...tokens(productType),
    ...labels.flatMap((l) => tokens(l)),
    ...(category ? tokens(category) : []),
  ])];
  return {
    rawText: text,
    category,
    productType,
    budgetMin: null,
    budgetMax: parseBudget(text),
    mustHaves,
    preferences,
    labels,
    keywords,
  };
}

// What a newly opened cluster must store so the next similar sentence can
// find it. Seeded clusters already carry keywords; organic ones did not.
export function canonicalFromInterpretation(interpretation, rawText) {
  const budget = interpretation.budgetMax;
  return {
    category: interpretation.category ?? 'General',
    productType: interpretation.productType ?? null,
    keywords: interpretation.keywords,
    canonicalRequirements: interpretation.mustHaves,
    canonicalPreferences: interpretation.preferences,
    commonRequirements: interpretation.labels.length ? interpretation.labels : tokens(rawText).slice(0, 6),
    budgetRange: budget != null ? [Math.max(0, budget - 5), budget] : null,
    averageBudget: budget,
  };
}
