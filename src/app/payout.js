// The rules of getting paid out, as numbers and dates — no React, so they can
// be tested as arithmetic. The figures mirror what the operator's own console
// already models (admin.example.json → withdrawals: amount, fee, net_amount,
// method, account_info, status; w9_submissions) and what the payment rails
// this will sit on actually charge: an instant transfer costs a percentage
// with a floor, a standard one is free and takes business days.
export const MIN_WITHDRAW_USD = 10;
export const W9_WARNING_USD = 500;            // heads-up before the 1099 line
export const W9_THRESHOLD_USD = 600;          // IRS 1099 reporting threshold
export const INSTANT_FEE_RATE = 0.015;
export const INSTANT_FEE_MIN_USD = 0.25;
export const STANDARD_DAYS = 3;               // business days, the outer bound

const round2 = (n) => Math.round(n * 100) / 100;
const dollars = (n) => `$${Number(n).toLocaleString('en-US', {
  minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2,
  maximumFractionDigits: 2,
})}`;

export function feeFor(amountUsd, speed) {
  if (speed !== 'instant') return 0;
  return round2(Math.max(INSTANT_FEE_MIN_USD, amountUsd * INSTANT_FEE_RATE));
}

export const netFor = (amountUsd, speed) => round2(amountUsd - feeFor(amountUsd, speed));

// Standard lands within three BUSINESS days: a Friday's withdrawal says
// Wednesday, not Monday. Instant says minutes, as the rails do.
export function etaFor(speed, from = new Date()) {
  if (speed === 'instant') return { label: 'in minutes', date: null };
  const d = new Date(from);
  let left = STANDARD_DAYS;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  return { label: `by ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`, date: d };
}

// What has come IN this year: the positive rows. The fixture's rows carry no
// year, so every row counts — the ledger is this year's by construction.
// A card top-up is cash the student put in, not pay, so it stays out of this sum.
export const earnedThisYear = (ledger) =>
  ledger.flatMap((g) => g.rows)
    .filter((r) => r.usd > 0 && r.title !== 'Cash added')
    .reduce((n, r) => n + r.usd, 0);

export const hasWithdrawnBefore = (ledger) =>
  ledger.flatMap((g) => g.rows).some((r) => r.usd < 0 && /withdrawal/i.test(r.title));

// Which of the rules bite right now. Shown only when they do (R8: state the
// distance, never just the no).
// What has already been asked for this calendar year: pending requests count,
// a rejected one does not. The 1099 line is about money paid out, not XP or
// credits, and not cash that is still only sitting in the balance.
export function annualPayout(rows, year = new Date().getUTCFullYear()) {
  return (rows ?? []).reduce((sum, row) => {
    const status = String(row.status || '');
    if (status !== 'pending' && status !== 'completed') return sum;
    const created = new Date(row.created_at);
    if (Number.isNaN(created.getTime()) || created.getUTCFullYear() !== year) return sum;
    return sum + (Number(row.amount) || 0);
  }, 0);
}

// Null when this payout can go ahead. A verified W-9 clears the line.
// Crossing $600 on this request counts, even if the year is still under it.
export function w9Block({ annualUsd = 0, amountUsd = 0, w9Verified = false, w9Submitted = false } = {}) {
  const paid = round2(Number(annualUsd) || 0);
  const projected = round2(paid + (Number(amountUsd) || 0));
  if (w9Verified || projected < W9_THRESHOLD_USD) return null;
  if (w9Submitted) {
    return {
      code: 'W9_PENDING',
      paid,
      projected,
      error: 'Your W-9 is in and waiting to be checked. Withdrawals open again after that.',
    };
  }
  const reached = paid >= W9_THRESHOLD_USD ? paid : projected;
  return {
    code: 'REQUIRE_W9',
    paid,
    projected,
    error: `Payouts this year reach ${dollars(reached)}. A W-9 has to be on file before more can go out.`,
  };
}

export function gates({ cashUsd, withdrawnBefore, w9Verified, min = MIN_WITHDRAW_USD, annualUsd = 0, w9Submitted = false }) {
  const paid = round2(Number(annualUsd) || 0);
  const tax = w9Block({ annualUsd: paid, w9Verified, w9Submitted });
  return {
    belowMin: cashUsd < min,
    shortBy: Math.max(0, round2(min - cashUsd)),
    approachingW9: paid >= W9_WARNING_USD && paid < W9_THRESHOLD_USD && !w9Verified,
    needsW9: Boolean(tax),
    w9Pending: tax?.code === 'W9_PENDING',
    needsLegalName: !withdrawnBefore,
  };
}

// A reference a support agent could find. Time-derived, not random, so two
// in the same second still differ by the counter.
let seq = 0;
export const reference = (now = Date.now()) => `AX-W-${now.toString(36).slice(-5).toUpperCase()}${(seq++ % 36).toString(36).toUpperCase()}`;
