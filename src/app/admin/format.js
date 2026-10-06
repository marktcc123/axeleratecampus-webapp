const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The fixture stores dates as ISO, because that is what a Supabase column
// returns. On screen they read as "Aug 29": an ISO date in a 320px row breaks
// mid-token ("2026-08-" / "24"), and the year is noise in a queue where every
// row is from this term.
export function shortDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(iso);
  return `${MONTHS[m - 1]} ${d}`;
}
