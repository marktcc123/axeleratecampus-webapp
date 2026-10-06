// The range toggle changes the bucket, not just the window.
//
// 90 daily points in a 520px column is a wall of unlabelled marks, so a longer
// range means a coarser bucket: 7 days stays daily, 30 becomes 6-day totals,
// 90 becomes 15-day totals. A stack is never more than 7 points.
//
// Every bucket must hold the SAME number of days. Chunking 30 days by calendar
// week leaves 7+7+7+7+2, and that 2-day tail plotted as an equal point reads as
// a cliff — the chart's last move looked like a crash when it was just a short
// bucket. So the sizes below divide their window exactly, and each bucket is
// anchored from the most recent day backwards.
const BUCKET_DAYS = { 7: 1, 30: 6, 90: 15 };

export function bucketDays(range) {
  return BUCKET_DAYS[range] ?? 1;
}

const label = (isoDate) => {
  const day = new Date(`${isoDate}T00:00:00Z`);
  return `${day.getUTCMonth() + 1}/${day.getUTCDate()}`;
};

export function bucketTotals(dailyTotals, range) {
  const window = dailyTotals.slice(-range);
  const size = bucketDays(range);
  const out = [];

  for (let i = 0; i < window.length; i += size) {
    const chunk = window.slice(i, i + size);
    // A trailing chunk shorter than `size` would misrepresent its own total, so
    // it is dropped rather than drawn. With the sizes above this never fires;
    // it is here so a new range cannot reintroduce the cliff silently.
    if (chunk.length < size) break;
    out.push(chunk.reduce((bucket, d) => {
      bucket.cash_paid += d.cash_paid;
      bucket.credits_used += d.credits_used;
      return bucket;
    }, { label: label(chunk[0].date), days: chunk.length, cash_paid: 0, credits_used: 0 }));
  }

  return out;
}
