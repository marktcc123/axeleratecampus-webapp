import { createClient, isLiveBackend } from './supabase.js';

const PAST = new Set(['attended', 'completed']);

function isoOf(value) {
  const when = value ? new Date(value) : null;
  if (!when || Number.isNaN(when.getTime())) return { iso: '', time: '', past: false };
  const iso = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
  const time = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const start = new Date(when.getFullYear(), when.getMonth(), when.getDate());
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return { iso, time, past: start < todayStart };
}

// An event_applications row, joined to its event, in the pass shape My tickets reads.
export function toTicket(row, name = '') {
  const ev = row.event ?? {};
  const when = isoOf(ev.starts_at || ev.event_date);
  const went = PAST.has(row.status);
  return {
    eventId: ev.id || row.event_id,
    title: ev.title || 'Event',
    date: when.iso,
    meta: `${ev.location || 'Campus'} · ${when.time || 'TBC'}`,
    cover: ev.image_url || '',
    status: went ? 'done' : 'going',
    past: went || when.past,
    name,
    message: '',
  };
}

export async function loadMyTickets() {
  if (!isLiveBackend()) return null;
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];
  const res = await supabase
    .from('event_applications')
    .select('id, status, created_at, event_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (res.error) {
    console.warn('[events]', res.error.message);
    return [];
  }
  const rows = res.data ?? [];
  const ids = [...new Set(rows.map((row) => row.event_id).filter(Boolean))];
  const eventsById = new Map();
  if (ids.length) {
    const evs = await supabase.from('events').select('*').in('id', ids);
    if (evs.error) console.warn('[events]', evs.error.message);
    for (const ev of evs.data ?? []) eventsById.set(ev.id, ev);
  }
  const data = rows.map((row) => ({ ...row, event: eventsById.get(row.event_id) }));
  const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '';
  return (data ?? []).map((row) => toTicket(row, name));
}

export async function submitEventApplication(eventId) {
  if (!isLiveBackend()) return { ok: true, live: false };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Sign in before you save a seat.');
  const row = { user_id: userId, event_id: eventId, status: 'pending' };
  let { error } = await supabase.from('event_applications').insert(row);
  // Older docs say `applied`; this database's enum does not include it.
  if (error && /invalid input value for enum/i.test(error.message || '')) {
    ({ error } = await supabase.from('event_applications').insert({ user_id: userId, event_id: eventId }));
  }
  if (error?.code === '23505') return { ok: true, live: true, already: true };
  if (error) throw new Error(error.message);
  return { ok: true, live: true };
}
