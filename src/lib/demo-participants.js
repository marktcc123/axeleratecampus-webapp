import seed from '../data/demand.example.json';

// Demo participants, expanded from the seed profiles.
//
// The alternative was to write "63 qualified buyers" into the fixture and have
// the UI print it. Then the thresholds, the weighting and the state machine
// would all be decoration over a hardcoded number. Instead each seeded cluster
// declares a *shape* — how many people at each readiness, what the verification
// mix looks like, what they are willing to spend — and this expands it into
// DemandParticipation rows that the real scoring functions run over.
//
// Every row carries `demo: true`. Nothing here is a real person, and no screen
// may present these as live demand without saying so.

// A small deterministic PRNG so a reload shows the same demand, and so tests
// can assert on exact figures. Seeded from the cluster id.
function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function verificationPicker(mix, next) {
  const entries = Object.entries(mix ?? { V1: 1 });
  return () => {
    const r = next();
    let acc = 0;
    for (const [level, share] of entries) {
      acc += share;
      if (r <= acc) return level;
    }
    return entries[0][0];
  };
}

function expand(cluster) {
  const profile = cluster.seedProfile ?? { readiness: {}, verification: { V1: 1 } };
  const next = rng(cluster.id);
  const pickVerification = verificationPicker(profile.verification, next);
  const [lo, hi] = profile.budgetSpread ?? cluster.budgetRange ?? [cluster.averageBudget, cluster.averageBudget];
  const opened = Date.parse(cluster.openedAt) || Date.now();
  const windowMs = (cluster.purchaseWindowDays ?? 30) * 86400000;

  const rows = [];
  for (const [readiness, count] of Object.entries(profile.readiness)) {
    for (let i = 0; i < count; i += 1) {
      const joinedAt = new Date(opened + next() * windowMs).toISOString();
      rows.push({
        id: `demo-${cluster.id}-${readiness}-${i}`,
        clusterId: cluster.id,
        // Pseudonymous by construction. There is no name, no email and no
        // address on a participation, here or anywhere else — a merchant
        // reading aggregates can never resolve one back to a person.
        userId: `demo-user-${cluster.id}-${readiness}-${i}`,
        signalId: null,
        readiness,
        budget: Math.round(lo + next() * (hi - lo)),
        timeframeId: null,
        mustHave: [],
        status: 'active',
        joinedAt,
        // Seeded demand is deliberately long-lived so the demo does not decay
        // mid-presentation; real participations expire on their timeframe.
        expiresAt: cluster.expiresAt,
        verificationLevel: pickVerification(),
        purchaseStatus: 'none',
        sourceType: cluster.sourceType ?? 'direct',
        fraudScore: 0,
        trustFlags: [],
        demo: true,
      });
    }
  }
  return rows;
}

const CACHE = new Map();

export function demoParticipations(clusterId) {
  if (CACHE.has(clusterId)) return CACHE.get(clusterId);
  const cluster = seed.clusters.find((c) => c.id === clusterId);
  const rows = cluster ? expand(cluster) : [];
  CACHE.set(clusterId, rows);
  return rows;
}

// Attribution records behind the seeded outcome figures, in the same shape the
// live store writes, so merchant and admin views read one list.
export function demoAttributions(clusterId) {
  const cluster = seed.clusters.find((c) => c.id === clusterId);
  const out = cluster?.seedOutcomes;
  if (!out) return [];
  const offers = seed.offers.filter((o) => o.clusterId === clusterId && o.status === 'live');
  if (!offers.length) return [];
  const next = rng(`${clusterId}-outcomes`);
  const rows = [];
  const push = (state, n) => {
    for (let i = 0; i < n; i += 1) {
      const offer = offers[Math.floor(next() * offers.length) % offers.length];
      rows.push({
        id: `demo-att-${clusterId}-${state}-${i}`,
        clusterId,
        offerId: offer.id,
        orgId: offer.orgId,
        userId: `demo-user-${clusterId}-att-${i}`,
        state,
        orderValueUsd: state === 'clicked' ? 0 : offer.priceUsd,
        at: cluster.openedAt,
        demo: true,
      });
    }
  };
  const purchases = (out.selfReported ?? 0) + (out.merchantVerified ?? 0);
  push('clicked', Math.max(0, (out.clicks ?? 0) - purchases));
  push('self_reported', out.selfReported ?? 0);
  push('merchant_verified', out.merchantVerified ?? 0);

  // The seed states a revenue figure. Spread it across the purchase records so
  // the merchant view's GMV is that figure, not a sum of whichever offer the
  // picker happened to land on.
  const bought = rows.filter((r) => r.state !== 'clicked');
  const target = Number(out.revenue) || 0;
  if (bought.length && target > 0) {
    const each = Math.floor(target / bought.length);
    let left = target;
    bought.forEach((r, i) => {
      r.orderValueUsd = i === bought.length - 1 ? left : each;
      left -= each;
    });
  }
  return rows;
}
