/**
 * The app's only money formatter.
 *
 * R1 (product spec §2.1.1): "Cash is the unit. Credit is never displayed as a
 * bare number — the UI always renders it with its dollar equivalence, in one
 * string: 2,400 credit · $24 in shop."
 *
 * The 100:1 rate is derived from that example. Every credit figure in the app
 * goes through credit(); tests/unit/money.test.js asserts no other file in
 * src/app even mentions credit.
 */
export const CREDIT_PER_DOLLAR = 100;

// Whole dollars render bare ($24, $1,200); anything with cents renders to
// exactly two decimals ($1.50). A credit value that is not a multiple of
// CREDIT_PER_DOLLAR would otherwise produce "$1.5".
export const usd = (n) => {
  const v = Number(n);
  return '$' + v.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

// A ledger reads down a column, so every row shows cents whether it has them
// or not: "$40.00" over "$25.00" aligns, "$40" over "$25.00" does not. Only
// the wallet's history uses this; everywhere else usd() is right.
export const usdExact = (n) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function credit(pts) {
  if (pts == null) return null;
  const n = Number(pts);
  return `${n.toLocaleString('en-US')} credit · ${usd(n / CREDIT_PER_DOLLAR)} in shop`;
}
