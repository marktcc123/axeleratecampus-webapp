const STOP = new Set([
  'a', 'an', 'the', 'for', 'and', 'that', 'with', 'under', 'looking', 'im', 'i',
  'want', 'wanted', 'next', 'good', 'works', 'work', 'doesn', 't', 'doesnt',
  'leave', 'leaves', 'really', 'actually', 'something', 'similar', 'like',
  'can', 'carry', 'everywhere', 'am', 'is', 'are', 'to', 'of', 'in', 'on',
  'my', 'me', 'it', 'its', 'be', 'or',
]);

export function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^\$/, ''))
    .filter((t) => t && !STOP.has(t) && t.length > 1);
}

export function parseBudget(text) {
  const m = String(text || '').match(/(?:under|below|max(?:imum)?|\$)\s*\$?\s*(\d{1,4})\b|\$\s*(\d{1,4})\b/i);
  if (m) return Number(m[1] || m[2]);
  const any = String(text || '').match(/\$?\s*(\d{1,4})\b/);
  return any ? Number(any[1]) : null;
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
    if (hit(String(k).toLowerCase(), bag)) score += 2;
  }
  const body = String(text || '').toLowerCase();
  if (/white\s*cast/.test(body) && (cluster.keywords ?? []).some((k) => String(k).includes('cast'))) score += 3;
  if (/korean/.test(body) && (cluster.keywords ?? []).some((k) => String(k).includes('korean'))) score += 2;
  if (budget != null && cluster.budgetRange) {
    const [lo, hi] = cluster.budgetRange;
    if (budget >= lo && budget <= hi + 5) score += 2;
    if (budget < lo - 10) score -= 2;
  }
  return score;
}
