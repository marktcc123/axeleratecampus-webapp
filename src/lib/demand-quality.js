import {
  readinessWeight, verificationWeight, READY_TO_BUY,
  thresholdsFor, canTransition, canonicalStatus, CLUSTER_RANK, CLUSTER_FLOW,
} from './marketplace.js';

// Demand quality, as arithmetic over participations.
//
// The rule this file exists to enforce: a cluster does not go live because a
// lot of people clicked Join. It goes live because enough of the right people
// want the thing, soon, at a price a merchant can meet. Every number below is
// derived from DemandParticipation rows, so leaving a demand removes its
// weight immediately and an expired participation stops counting.

export const isActive = (p, now = Date.now()) => (
  p.status === 'active' && (!p.expiresAt || Date.parse(p.expiresAt) > now)
);

// What a participation is worth: how badly they want it, discounted by how
// much we trust the account behind it.
export function participationWeight(p) {
  return readinessWeight(p.readiness) * verificationWeight(p.verificationLevel ?? 'V1');
}

// The order we expect it to produce. Budget where they gave one, the cluster's
// typical spend where they did not — an unpriced signal should not be valued
// at zero, nor counted as a whale.
export function expectedOrderValue(p, cluster) {
  const budget = p.budget ?? cluster?.averageBudget ?? 0;
  return Number(budget) || 0;
}

// The five figures the product talks about. Deliberately NOT one number:
// "143 joined" and "16 purchase-verified" mean different things to a merchant,
// and collapsing them is how a demand marketplace starts lying.
const countsTowardDemand = (p) => (p.verificationLevel ?? 'V1') !== 'V0';

export function breakdown(participations, now = Date.now()) {
  const active = participations.filter((p) => isActive(p, now) && countsTowardDemand(p));
  return {
    joined: active.length,
    // Kept so older screens keep rendering. It is active demand, not a
    // separate "qualified buyer" class — interested is not qualified.
    qualified: active.length,
    readyToBuy: active.filter((p) => READY_TO_BUY.has(p.readiness)).length,
    purchaseVerified: active.filter((p) => p.verificationLevel === 'V3' || p.verificationLevel === 'V4').length,
    committed: active.filter((p) => p.readiness === 'committed' || p.verificationLevel === 'V4').length,
    expired: participations.filter((p) => !isActive(p, now)).length,
  };
}

// Σ(commitment weight × expected order value × confidence).
//
// Confidence is the verification weight again, which means a V1 account that
// says "ready to buy" contributes real but discounted value, and an unverified
// burst of identical signals cannot drag a cluster over the line on its own.
export function estimatedGmv(participations, cluster, now = Date.now()) {
  return participations
    .filter((p) => isActive(p, now) && countsTowardDemand(p))
    .reduce((sum, p) => {
      const commitment = readinessWeight(p.readiness) / 4;     // ready-to-buy = 1.0
      const confidence = verificationWeight(p.verificationLevel ?? 'V1');
      return sum + commitment * expectedOrderValue(p, cluster) * confidence;
    }, 0);
}

// One internal score, never shown to a consumer. Merchants see the parts it is
// made of; admins see the score itself.
export function demandQualityScore(cluster, participations, { merchantMatches = 0, fraudScore = 0, now = Date.now() } = {}) {
  const b = breakdown(participations, now);
  const t = thresholdsFor(cluster.category);
  const gmv = estimatedGmv(participations, cluster, now);

  const density = Math.min(1, b.qualified / Math.max(1, t.minQualifiedParticipants));
  const intent = Math.min(1, b.readyToBuy / Math.max(1, t.minReadyToBuy));
  const value = Math.min(1, gmv / Math.max(1, t.minEstimatedGmv));
  const supply = Math.min(1, merchantMatches / Math.max(1, t.minMerchantMatches));
  const trust = 1 - Math.min(1, fraudScore);

  // Intent and value lead; supply is a gate rather than a driver, which is why
  // it carries the smallest share and also appears in `meetsLive` below.
  const score = (density * 0.25 + intent * 0.3 + value * 0.25 + supply * 0.1 + trust * 0.1);

  return {
    score: Math.round(score * 100) / 100,
    parts: { density, intent, value, supply, trust },
    breakdown: b,
    estimatedGmv: Math.round(gmv),
    thresholds: t,
  };
}

export function meetsQualified(quality) {
  const { breakdown: b, estimatedGmv: gmv, thresholds: t } = quality;
  const minActive = t.minActiveParticipants ?? t.minQualifiedParticipants ?? 15;
  return (
    b.joined >= minActive
    && b.readyToBuy >= t.minReadyToBuy
    && gmv >= t.minEstimatedGmv
    && (quality.parts?.trust ?? 1) >= (1 - (t.maxFraudScore ?? 1))
  );
}

// The status the numbers justify, ignoring how far the cluster currently is.
export function desiredStatus(quality, { liveOffers = 0, verifiedPurchases = 0 } = {}) {
  if (verifiedPurchases > 0 && liveOffers > 0) return 'converting';
  if (liveOffers > 0) return 'offers_live';
  if (meetsQualified(quality)) return 'sourcing';
  return 'collecting';
}

// Walk every legal forward edge until the cluster sits on the status its
// demand already earned. Merchant matches are not an input.
export function nextStatus(cluster, quality, { liveOffers = 0, verifiedPurchases = 0 } = {}) {
  let from = canonicalStatus(cluster.status);
  if (from === 'rejected' || from === 'expired' || from === 'closed') return from;
  if (!CLUSTER_FLOW[from]) from = 'collecting';

  const want = desiredStatus(quality, { liveOffers, verifiedPurchases });
  if ((CLUSTER_RANK[want] ?? 0) < (CLUSTER_RANK[from] ?? 0) && want !== 'collecting') return from;

  let guard = 0;
  while (from !== want && guard < 8) {
    guard += 1;
    if (canTransition(from, want)) return want;
    const ahead = Object.entries(CLUSTER_RANK)
      .filter(([, rank]) => rank > (CLUSTER_RANK[from] ?? 0) && rank <= (CLUSTER_RANK[want] ?? 0))
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id)
      .find((id) => canTransition(from, id));
    if (!ahead) return from;
    from = ahead;
  }
  return from;
}

// Outcome figures for a merchant or an admin. Weighted by how much we believe
// each attribution record.
const VERIFIED_STATES = new Set(['merchant_verified', 'attributed']);

// Clicks and self-reports stay visible. Verified GMV counts only rows an
// independent confirmation produced. A self-report is never revenue.
export function outcomeStats(records = [], purchases = []) {
  const clicks = records.filter((r) => r.state !== 'refunded').length;
  const selfReported = records.filter((r) => r.state === 'self_reported').length;
  const fromAttributions = records.filter((r) => VERIFIED_STATES.has(r.state));
  const fromPurchases = purchases.filter((p) => p.status === 'verified');
  const verifiedRows = fromPurchases.length
    ? fromPurchases.map((p) => ({ orderValueUsd: p.amount }))
    : fromAttributions;
  const verifiedPurchases = fromPurchases.length ? fromPurchases.length : fromAttributions.length;
  const verifiedRevenue = verifiedRows.reduce((n, r) => n + (Number(r.orderValueUsd ?? r.amount) || 0), 0);
  const refunded = records.filter((r) => r.state === 'refunded').length
    + purchases.filter((p) => p.status === 'refunded').length;
  return {
    clicks,
    selfReported,
    verifiedPurchases,
    verifiedRevenue,
    // Older call sites. These are verified figures, not self-reports.
    purchases: verifiedPurchases,
    revenue: verifiedRevenue,
    refunded,
    conversion: clicks > 0 ? verifiedPurchases / clicks : 0,
  };
}

// When a participation lapses, given the timeframe its owner chose.
export function expiryFor(timeframeDays, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + timeframeDays);
  return d.toISOString();
}

export function daysLeft(expiresAt, now = Date.now()) {
  if (!expiresAt) return null;
  return Math.ceil((Date.parse(expiresAt) - now) / 86400000);
}
