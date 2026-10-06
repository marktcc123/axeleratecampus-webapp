import { apiOrigin } from './api-origin.js';
import { createClient, isLiveBackend } from './supabase.js';

// The new screen's friend row. `approved` is the old table's paid-out state.
// Blocked stays off the credit total.
function toFriend(row, name) {
  const status = row.status === 'approved' || row.status === 'paid'
    ? 'earned'
    : row.status === 'blocked'
      ? 'held'
      : 'pending';
  return {
    id: row.id,
    handle: row.referred_id,
    name: name || 'Friend',
    on: row.created_at,
    status,
    credits: Math.round(Number(row.reward_amount) || 0),
  };
}

export async function loadInvite() {
  if (!isLiveBackend()) return null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, code: '', friends: [] };

  const profile = await supabase.from('profiles').select('referral_code').eq('id', user.id).maybeSingle();
  if (profile.error) console.warn('[invite] profile', profile.error.message);

  const refs = await supabase
    .from('referrals')
    .select('id, status, reward_amount, created_at, referred_id')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });
  if (refs.error) console.warn('[invite] referrals', refs.error.message);

  const rows = refs.error ? [] : (refs.data ?? []);
  const ids = [...new Set(rows.map((row) => row.referred_id).filter(Boolean))];
  const names = new Map();
  if (ids.length) {
    const named = await supabase.from('profiles').select('id, full_name').in('id', ids);
    if (named.error) console.warn('[invite] names', named.error.message);
    for (const person of named.data ?? []) names.set(person.id, person.full_name || '');
  }

  return {
    signedIn: true,
    code: profile.data?.referral_code || '',
    friends: rows.map((row) => toFriend(row, names.get(row.referred_id))),
  };
}

export async function saveInviteCode(code) {
  if (!isLiveBackend()) return { ok: true, live: false };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'Sign in before you use an invite code.' };
  let res;
  try {
    res = await fetch(`${apiOrigin()}/api/invite`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
  } catch {
    return { ok: false, error: 'Invite server is not running.' };
  }
  const json = await res.json().catch(() => null);
  if (!json) return { ok: false, error: 'The code was not saved.' };
  return json;
}
