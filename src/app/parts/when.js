// How long and by when, worded the same wherever a mission is named — the
// board's tiles, the "worth your time today" tile and the mission page.
export const duration = (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${h} hr`);

// Sun, Sep 6 — a date, not "this week". Rolling missions carry no date and get
// null; the caller says "open until it fills" or its own wording.
export const applyBy = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
    : null;

// The one mission to lead the board with (owner, 2026-09-09: "a section about
// worth your time today"): among the missions this student can take now, the
// one whose deadline is soonest but not past; if none is dated ahead, the
// shortest — the thing you can finish before the next class.
export function pickForYou(missions, lockFor, n = 4, now = new Date()) {
  const open = missions.filter((m) => !lockFor(m));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dated = open
    .filter((m) => m.deadlineOn && new Date(`${m.deadlineOn}T00:00:00`) >= today)
    .sort((a, b) => a.deadlineOn.localeCompare(b.deadlineOn));
  // Closing soonest first, then the quickest of whatever is left. `n` is a cap,
  // not a quota — a thin board shows what it has rather than padding the row
  // with work the student cannot take.
  const rest = open.filter((m) => !dated.includes(m)).sort((a, b) => (a.hours ?? Infinity) - (b.hours ?? Infinity));
  return [...dated, ...rest].slice(0, n);
}

// The single lead, kept so one ordering rule serves both.
export function pickToday(missions, lockFor, now = new Date()) {
  return pickForYou(missions, lockFor, 1, now)[0] ?? null;
}
