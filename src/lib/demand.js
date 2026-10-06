import seed from '../data/demand.example.json';
import { CLUSTER_LABEL, READINESS_CHOICES, TIMEFRAMES as TF, isQualifying } from './marketplace.js';
import { bestCluster } from '../marketplace/clustering.js';
import { parseBudget, scoreCluster, tokens } from '../marketplace/text.js';

export { parseBudget, scoreCluster, tokens };

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

// Category gate, then keyword and budget overlap. Organic clusters are
// matchable because opening one stores the keywords interpretation produced.
export function clusterDemand(input, clusters = seed.clusters) {
  const text = typeof input === 'string' ? input : input?.rawText ?? '';
  const budget = typeof input === 'string' ? parseBudget(text) : (input?.maxBudget ?? input?.budgetMax ?? parseBudget(text));
  const signal = typeof input === 'string' ? { rawText: text, maxBudget: budget } : { ...input, rawText: text, maxBudget: budget };
  return bestCluster(signal, clusters);
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
