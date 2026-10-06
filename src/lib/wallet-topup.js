// Card top-up bounds from the old wallet. Cash is credited only after Stripe
// reports the session paid; this check is the amount the session is allowed
// to charge.
export const MIN_TOPUP_USD = 5;
export const MAX_TOPUP_USD = 500;

export function topupCents(amountUsd) {
  const amt = Number(amountUsd);
  const error = `Enter an amount between $${MIN_TOPUP_USD} and $${MAX_TOPUP_USD}.`;
  if (!Number.isFinite(amt)) return { ok: false, error };
  const cents = Math.round(amt * 100);
  const dollars = cents / 100;
  if (dollars < MIN_TOPUP_USD || dollars > MAX_TOPUP_USD) return { ok: false, error };
  return { ok: true, cents, amountUsd: dollars };
}
