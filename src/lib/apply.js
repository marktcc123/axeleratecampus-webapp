import { createClient, isLiveBackend } from './supabase.js';

// Writes one row to the old `user_gigs` table. Offline preview does not call this.
export async function applicationFor(gigId) {
  if (!isLiveBackend() || !gigId) return null;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_gigs')
    .select('id, status')
    .eq('user_id', userId)
    .eq('gig_id', gigId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function submitApplication({ gigId }) {
  if (!isLiveBackend()) return { ok: true, live: false };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Sign in before you apply.');

  const row = { user_id: userId, gig_id: gigId, status: 'pending', progress_percent: 0 };
  let { error } = await supabase.from('user_gigs').insert(row);
  if (error && /invalid input value for enum/i.test(error.message)) {
    ({ error } = await supabase.from('user_gigs').insert({ ...row, status: 'applied' }));
  }
  if (error?.code === '23505') throw new Error('You already applied.');
  if (error) throw new Error(error.message);
  return { ok: true, live: true };
}
