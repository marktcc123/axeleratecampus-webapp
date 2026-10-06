const KEY = 'ax.analytics.v0';
const CAP = 200;

const EVENTS = [
  'demand_started',
  'demand_submitted',
  'demand_joined',
  'demand_left',
  'demand_opened',
  'demand_qualified',
  'demand_outcome',
  'offer_viewed',
  'offer_clicked',
  'purchase_redirect',
  'purchase_confirmed',
  'purchase_self_reported',
  'purchase_declined',
  'merchant_registered',
  'merchant_offer_submitted',
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function track(event, payload = {}) {
  const row = { event, payload, at: new Date().toISOString() };
  try {
    const next = [...read(), row].slice(-CAP);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode / blocked storage — the UI still works.
  }
  if (import.meta.env.DEV) console.debug('[ax]', event, payload);
  return row;
}

export function events() {
  return read();
}

export function knownEvents() {
  return EVENTS;
}

export function trackedUrl(url, { demandId, offerId } = {}) {
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('ax_ref', 'axelerate');
    if (demandId) u.searchParams.set('ax_demand', demandId);
    if (offerId) u.searchParams.set('ax_offer', offerId);
    return u.toString();
  } catch {
    return url;
  }
}
