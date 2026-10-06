import {
  readinessWeight, verificationWeight, isQualifying, READY_TO_BUY,
  thresholdsFor, canTransition, ATTRIBUTION_CONFIDENCE,
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
export function breakdown(participations, now = Date.now()) {
  const active = participations.filter((p) => isActive(p, now));
  return {
    joined: active.length,
    qualified: active.filter((p) => isQualifying(p.readiness)).length,
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
    .filter((p) => isActive(p, now))
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
  return (
    b.qualified >= t.minQualifiedParticipants
    && b.readyToBuy >= t.minReadyToBuy
    && gmv >= t.minEstimatedGmv
  );
}

export function meetsLive(quality, { merchantMatches = 0, adminApproved = false } = {}) {
  if (!meetsQualified(quality)) return false;
  return adminApproved || merchantMatches >= quality.thresholds.minMerchantMatches;
}

// The one place a cluster's status may change on its own. Everything else goes
// through an explicit admin action, and both are checked against CLUSTER_FLOW.
export function nextStatus(cluster, quality, { merchantMatches = 0, liveOffers = 0, purchases = 0, adminApproved = false } = {}) {
  const from = cluster.status;
  if (from === 'rejected' || from === 'expired') return from;

  const want = (() => {
    if (purchases > 0 && liveOffers > 0) return 'converting';
    if (liveOffers > 0) return 'offers_available';
    if (meetsLive(quality, { merchantMatches, adminApproved })) {
      return merchantMatches > 0 ? 'offers_open' : 'live';
    }
    if (meetsQualified(quality)) return 'qualified';
    return 'collecting';
  })();

  if (want === from) return from;

  // One step at a time, along a legal edge. A cluster that qualifies and
  // already has offers walks collecting → qualified → live → offers_open over
  // successive evaluations rather than teleporting, so every state it passes
  // through is one the UI and the admin log actually saw.
  if (canTransition(from, want)) return want;
  const step = (CLUSTER_PATH[from] ?? []).find((s) => canTransition(from, s));
  return step ?? from;
}

// The forward path, used when the target is more than one edge away.
const CLUSTER_PATH = {
  collecting: ['qualified'],
  qualified: ['live'],
  live: ['offers_open'],
  offers_open: ['offers_available'],
  offers_available: ['converting'],
  converting: ['scaled'],
};

// Outcome figures for a merchant or an admin. Weighted by how much we believe
// each attribution record.
export function outcomeStats(records = []) {
  const clicks = records.filter((r) => r.state !== 'refunded').length;
  const purchases = records.filter((r) => ['self_reported', 'merchant_verified', 'attributed'].includes(r.state));
  const confident = purchases.reduce((n, r) => n + (ATTRIBUTION_CONFIDENCE[r.state] ?? 0), 0);
  const revenue = purchases.reduce((n, r) => n + (Number(r.orderValueUsd) || 0), 0);
  const refunded = records.filter((r) => r.state === 'refunded').length;
  return {
    clicks,
    purchases: purchases.length,
    confidentPurchases: Math.round(confident * 10) / 10,
    revenue,
    refunded,
    conversion: clicks > 0 ? purchases.length / clicks : 0,
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
