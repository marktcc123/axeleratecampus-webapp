import { interpretDemand, canonicalFromInterpretation } from '../../src/marketplace/interpret.js';
import { bestCluster } from '../../src/marketplace/clustering.js';
import { clustersForMode, demandsForMerchant, rowsForMode } from '../../src/marketplace/sources.js';
import { demandQualityScore, meetsQualified, nextStatus } from '../../src/lib/demand-quality.js';
import { applySelfReport, applyVerifiedPurchase } from '../../src/marketplace/purchases.js';
import { canSubmitOffer, feeFor } from '../../src/lib/marketplace.js';
import { isDemoMode, isLiveMode } from '../../src/lib/app-mode.js';

const future = new Date(Date.now() + 86400000 * 30).toISOString();

function people(n, readiness) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${readiness}-${i}`,
    status: 'active',
    readiness,
    verificationLevel: 'V1',
    budget: 80,
    expiresAt: future,
  }));
}

describe('marketplace v1 rules', () => {
  test('a sentence becomes structured demand', () => {
    const parsed = interpretDemand('I want a lightweight Korean sunscreen under $25 with no white cast that works for dry skin.');
    expect(parsed.category).toBe('Beauty / Personal Care');
    expect(parsed.productType).toBe('Sunscreen');
    expect(parsed.budgetMax).toBe(25);
    expect(parsed.mustHaves).toEqual(expect.arrayContaining([
      expect.objectContaining({ attribute: 'white_cast', value: 'none' }),
      expect.objectContaining({ attribute: 'skin_type', value: 'dry' }),
    ]));
    expect(parsed.preferences).toEqual(expect.arrayContaining([
      expect.objectContaining({ attribute: 'origin', value: 'KR' }),
    ]));
  });

  test('the second similar request joins the cluster the first person opened', () => {
    const first = interpretDemand('A lightweight Korean sunscreen under $25, no white cast, for dry skin.');
    const cluster = {
      id: 'organic-1',
      status: 'collecting',
      ...canonicalFromInterpretation(first, first.rawText),
      normalizedNeed: first.rawText,
    };
    const second = interpretDemand('Korean sunscreen under $25 with no white cast, dry skin, lightweight.');
    const hit = bestCluster({ rawText: second.rawText, maxBudget: second.budgetMax }, [cluster]);
    expect(hit?.cluster.id).toBe('organic-1');

    const shared = { participations: [] };
    shared.participations.push({ userId: 'a', clusterId: cluster.id });
    shared.participations.push({ userId: 'b', clusterId: hit.cluster.id });
    expect(shared.participations.map((p) => p.clusterId)).toEqual(['organic-1', 'organic-1']);
  });

  test('qualification reaches sourcing without any merchant match', () => {
    const cluster = { id: 'c', status: 'collecting', category: 'Beauty / Personal Care', averageBudget: 22 };
    const parts = [...people(5, 'ready'), ...people(10, 'interested')];
    const quality = demandQualityScore(cluster, parts, { merchantMatches: 0, fraudScore: 0 });
    expect(meetsQualified(quality)).toBe(true);
    expect(nextStatus(cluster, quality, { liveOffers: 0, verifiedPurchases: 0 })).toBe('sourcing');
  });

  test('interested-only demand does not qualify', () => {
    const cluster = { id: 'c', status: 'collecting', category: 'Beauty / Personal Care', averageBudget: 22 };
    const quality = demandQualityScore(cluster, people(20, 'interested'), { fraudScore: 0 });
    expect(meetsQualified(quality)).toBe(false);
    expect(nextStatus(cluster, quality, { liveOffers: 0, verifiedPurchases: 0 })).toBe('collecting');
  });

  test('a beauty merchant does not receive footwear demand', () => {
    const clusters = [
      { id: 'sun', category: 'Beauty / Personal Care', openToMerchants: true },
      { id: 'shoes', category: 'Footwear', openToMerchants: true },
    ];
    const seen = demandsForMerchant(clusters, { categories: ['Beauty / Personal Care'] });
    expect(seen.map((c) => c.id)).toEqual(['sun']);
  });

  test('self-report does not verify, an order id does', () => {
    const clicked = { id: 'att-1', userId: 'u', clusterId: 'c', offerId: 'o', orgId: 'org', state: 'clicked' };
    const reported = applySelfReport(clicked, { purchased: true, orderValueUsd: 22, at: future });
    expect(reported.upgradesVerification).toBe(false);
    expect(reported.purchase).toBeNull();
    expect(reported.attribution.state).toBe('self_reported');

    const verified = applyVerifiedPurchase(clicked, {
      merchantOrderId: 'SHOP-100', amount: 22, verifiedBy: 'admin', at: future,
    });
    expect(verified.upgradesVerification).toBe(true);
    expect(verified.purchase.status).toBe('verified');
    expect(verified.purchase.merchantOrderId).toBe('SHOP-100');
    expect(verified.attribution.state).toBe('merchant_verified');
  });

  test('fee is calculated only from verified GMV', () => {
    expect(feeFor(null, { verifiedGmv: 100, verifiedPurchases: 2 })).toBeNull();
    expect(feeFor({ model: 'revenue_share', rate: 0.15 }, { verifiedGmv: 200, verifiedPurchases: 2 })).toBe(30);
    expect(feeFor({ model: 'cpa', amount: 8 }, { verifiedGmv: 200, verifiedPurchases: 2 })).toBe(16);
  });

  test('live mode drops seeded rows; demo mode keeps them', () => {
    expect(isLiveMode()).toBe(false);
    expect(isDemoMode()).toBe(true);
    const seed = [{ id: 'seed', demo: true }];
    const real = [{ id: 'real', demo: false }];
    expect(clustersForMode(false, seed, real)).toEqual(real);
    expect(rowsForMode(false, [{ id: 'fake-gmv', demo: true }], [])).toEqual([]);
    expect(clustersForMode(true, seed, real)).toHaveLength(2);
  });

  test('a pending organization cannot be treated as allowed to publish', () => {
    expect(canSubmitOffer({ status: 'pending' })).toBe(false);
    expect(canSubmitOffer({ status: 'verified' })).toBe(true);
  });
});
