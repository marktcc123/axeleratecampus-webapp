// Live mode never mixes seeded people, seeded GMV, or seeded offers
// into the numbers a real merchant sees.
export function clustersForMode(demo, seedClusters, organic) {
  return demo ? [...seedClusters, ...organic] : [...organic];
}

export function rowsForMode(demo, seeded, real) {
  return demo ? [...seeded, ...real] : [...real];
}

export function demandsForMerchant(clusters, org) {
  const open = clusters.filter((c) => c.openToMerchants);
  if (!org) return open;
  const cats = new Set(org.categories ?? []);
  return open.filter((c) => cats.has(c.category));
}
