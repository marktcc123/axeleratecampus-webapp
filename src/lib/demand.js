import seed from '../data/demand.example.json';
import { CLUSTER_LABEL, READINESS_CHOICES, TIMEFRAMES as TF, isQualifying } from './marketplace.js';

const STOP = new Set([
  'a', 'an', 'the', 'for', 'and', 'that', 'with', 'under', 'looking', 'im', 'i',
  'want', 'wanted', 'next', 'good', 'works', 'work', 'doesn', 't', 'doesnt',
  'leave', 'leaves', 'really', 'actually', 'something', 'similar', 'like',
  'can', 'carry', 'everywhere', 'am', 'is', 'are', 'to', 'of', 'in', 'on',
  'my', 'me', 'it', 'its', 'be', 'or',
]);

export const PLACEHOLDERS = [
  'A Korean sunscreen under $25 with no white cast',
  'Stylish running shoes under $100',
  'A facial mist I can carry everywhere',
  'A protein drink that actually tastes good',
];

export const MATTERS = [
  'Price', 'Quality', 'Design', 'Ingredients', 'Delivery', 'Brand origin', 'Fit', 'Performance',
];

// The scales live in marketplace.js, where their weights and expiry windows
// sit next to the thresholds that read them. Re-exported here so the screens
// that already import from this module keep one import.
export const TIMEFRAMES = TF;
export const READINESS = READINESS_CHOICES;

// Kept as a Set for the call sites that test membership; the authority is
// `isQualifying`, which reads the readiness table.
export const QUALIFIED = {
  has: (id) => isQualifying(id),
};

export function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^\$/, ''))
    .filter((t) => t && !STOP.has(t) && t.length > 1);
}

export function parseBudget(text) {
  const m = String(text || '').match(/\$?\s*(\d{1,4})\b/);
  return m ? Number(m[1]) : null;
}

function hit(keyword, bag) {
  if (bag.has(keyword)) return true;
  for (const t of bag) {
    if (keyword.includes(t) || t.includes(keyword)) return true;
  }
  return false;
}

export function scoreCluster(cluster, text, budget) {
  const bag = new Set(tokens(text));
  let score = 0;
  for (const k of cluster.keywords ?? []) {
    if (hit(k, bag)) score += 2;
  }
  const body = String(text || '').toLowerCase();
  if (/white\s*cast/.test(body) && (cluster.keywords ?? []).includes('cast')) score += 3;
  if (/korean/.test(body) && (cluster.keywords ?? []).includes('korean')) score += 2;
  if (budget != null && cluster.budgetRange) {
    const [lo, hi] = cluster.budgetRange;
    if (budget >= lo && budget <= hi + 5) score += 2;
    if (budget < lo - 10) score -= 2;
  }
  return score;
}

// The seam a later model plugs into. Today: keyword + budget overlap.
export function clusterDemand(input, clusters = seed.clusters) {
  const text = typeof input === 'string' ? input : input?.rawText ?? '';
  const budget = typeof input === 'string' ? parseBudget(text) : (input?.maxBudget ?? parseBudget(text));
  const ranked = clusters
    .map((c) => ({ cluster: c, score: scoreCluster(c, text, budget) }))
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score);
  return ranked[0] ?? null;
}

export function formatBudget(range, avg) {
  if (Array.isArray(range) && range.length === 2) return `$${range[0]}–${range[1]}`;
  if (avg != null) return `~$${avg}`;
  return 'Open';
}

export function formatMoney(n) {
  return `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function statusLabel(status) {
  return CLUSTER_LABEL[status] ?? 'Demand is forming';
}

export function slugNeed(text) {
  const clean = String(text || '').trim();
  if (!clean) return 'Open demand';
  const clipped = clean.replace(/[.?!].*$/, '').trim();
  return clipped.length > 64 ? `${clipped.slice(0, 61).trim()}…` : clipped;
}

export function seedClusters() {
  return seed.clusters;
}

export function seedOffers() {
  return seed.offers;
}

export function seedOrganizations() {
  return seed.organizations ?? [];
}

export function seedProducts() {
  return seed.products ?? [];
}
