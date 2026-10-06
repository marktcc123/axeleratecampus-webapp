// Self-report and verified purchase are different writes.
// Nothing in this file promotes a consumer to V3.

export function applySelfReport(attribution, { purchased, orderValueUsd, at }) {
  if (!attribution) return { error: 'not_found' };
  return {
    attribution: {
      ...attribution,
      state: purchased ? 'self_reported' : 'unknown',
      orderValueUsd: purchased ? (orderValueUsd ?? attribution.orderValueUsd ?? 0) : 0,
      selfReportedAt: purchased ? at : null,
      confirmedAt: at,
    },
    purchase: null,
    upgradesVerification: false,
  };
}

export function applyVerifiedPurchase(attribution, { merchantOrderId, amount, verifiedBy = 'admin', at, currency = 'USD' }) {
  if (!attribution) return { error: 'not_found' };
  if (!merchantOrderId) return { error: 'order_id', message: 'A merchant order id is required.' };
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return { error: 'amount', message: 'Enter the order amount.' };
  const purchase = {
    id: `pur-${attribution.id}`,
    attributionId: attribution.id,
    merchantOrderId: String(merchantOrderId),
    organizationId: attribution.orgId ?? attribution.organizationId ?? null,
    userId: attribution.userId,
    clusterId: attribution.clusterId,
    offerId: attribution.offerId,
    amount: value,
    currency,
    status: 'verified',
    verifiedBy,
    purchasedAt: at,
    refundedAt: null,
    createdAt: at,
    demo: false,
  };
  return {
    attribution: {
      ...attribution,
      state: 'merchant_verified',
      orderValueUsd: value,
      verifiedAt: at,
    },
    purchase,
    upgradesVerification: true,
  };
}

export function attributionToken() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 6; i += 1) body += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `AX-${body}`;
}
