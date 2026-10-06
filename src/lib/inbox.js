const FORTNIGHT = 14 * 24 * 60 * 60 * 1000;

// Same idea as the old feed bell: seen ids live in this browser, per login.
// A refresh used to rebuild "new" from the last two weeks and paint them unread again.
const READ_KEY = (userId) => `ax-inbox-read:${userId}`;

const store = () => (typeof window === 'undefined' ? null : window.localStorage);

export function readInboxIds(userId) {
  if (!userId) return new Set();
  try {
    const raw = store()?.getItem(READ_KEY(userId));
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function writeInboxIds(userId, ids) {
  if (!userId) return;
  try {
    store()?.setItem(READ_KEY(userId), JSON.stringify([...ids]));
  } catch { /* private mode: the mark stays for this visit */ }
}

const APP = {
  applied: 'is in review',
  approved: 'was approved',
  submitted: 'has your submission',
  rejected: 'was not selected',
  paid: 'was paid',
};

function when(iso) {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? `${iso}T12:00:00` : iso;
  const t = new Date(value).getTime();
  if (!iso || Number.isNaN(t)) return { group: 'earlier', label: '' };
  const label = new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { group: Date.now() - t < FORTNIGHT ? 'new' : 'earlier', label, t };
}

function row({ id, text, iso, kind, to, icon, tint }) {
  const w = when(iso);
  return {
    id,
    group: w.group,
    icon,
    tint,
    text,
    meta: [w.label, kind].filter(Boolean).join(' · '),
    to,
    unread: w.group === 'new',
    t: w.t || 0,
  };
}

// Real account activity, in the inbox row the new screen already draws.
export function notesFrom({ applications = [], orders = [], tickets = [] }) {
  const notes = [
    ...applications.map((a) => row({
      id: `gig-${a.missionSlug}`,
      text: `${a.title} ${APP[a.status] || 'is on your list'}`,
      iso: a.appliedAt,
      kind: 'missions',
      to: '/app/me/missions',
      icon: 'flag-line',
      tint: 'yellow',
    })),
    ...orders.map((o) => row({
      id: `order-${o.id}`,
      text: `${o.name} is ${o.status}`,
      iso: o.at,
      kind: 'orders',
      to: `/app/me/orders/${o.id}`,
      icon: 'bag-line',
      tint: 'lavender',
    })),
    ...tickets.map((t) => row({
      id: `ticket-${t.eventId}`,
      text: t.past ? `You were on the list for ${t.title}` : `You're going to ${t.title}`,
      iso: t.date,
      kind: 'events',
      to: `/app/me/tickets/${t.eventId || t.date}`,
      icon: 'calendar',
      tint: 'orange',
    })),
  ];
  return notes
    .sort((a, b) => b.t - a.t)
    .map(({ t, ...note }) => note);
}
