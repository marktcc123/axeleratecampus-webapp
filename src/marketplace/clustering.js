import { interpretDemand } from './interpret.js';
import { scoreCluster } from './text.js';

const MIN_SCORE = 3;

function sameFamily(cluster, interpretation) {
  if (!interpretation.category || !cluster.category || cluster.category === 'General') return true;
  if (interpretation.category === 'General') return true;
  return interpretation.category === cluster.category;
}

function productCompatible(cluster, interpretation) {
  if (!interpretation.productType || !cluster.productType) return true;
  return interpretation.productType.toLowerCase() === String(cluster.productType).toLowerCase();
}

function budgetCompatible(cluster, budget) {
  if (budget == null || !cluster.budgetRange) return true;
  const [lo, hi] = cluster.budgetRange;
  return budget >= lo - 10 && budget <= hi + 10;
}

// Category, then product type, then the existing keyword score, then hard
// constraints. A conflicting category never joins, even if a word overlaps.
export function findCandidateDemandClusters(signal, clusters = []) {
  const text = signal?.rawText ?? (typeof signal === 'string' ? signal : '');
  const interpretation = signal?.interpretation ?? interpretDemand(text);
  const budget = signal?.maxBudget ?? signal?.budgetMax ?? interpretation.budgetMax;

  return clusters
    .map((cluster) => {
      if (!sameFamily(cluster, interpretation)) return { cluster, score: 0, interpretation };
      if (!productCompatible(cluster, interpretation)) return { cluster, score: 0, interpretation };
      let score = scoreCluster(cluster, text, budget);
      const want = new Set(interpretation.keywords ?? []);
      for (const k of cluster.keywords ?? []) {
        if (want.has(String(k).toLowerCase())) score += 1;
      }
      if (!budgetCompatible(cluster, budget)) score -= 3;
      return { cluster, score, interpretation };
    })
    .filter((row) => row.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
}

export function bestCluster(signal, clusters) {
  return findCandidateDemandClusters(signal, clusters)[0] ?? null;
}
