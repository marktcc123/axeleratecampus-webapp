import { apiOrigin } from './api-origin.js';
import { createClient, isLiveBackend } from './supabase.js';

export async function deleteAccount() {
  if (!isLiveBackend()) return { ok: false, live: false, error: 'Nothing was deleted.' };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'Sign in before you delete your account.' };
  let res;
  try {
    res = await fetch(`${apiOrigin()}/api/account/delete`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'content-type': 'application/json',
      },
      body: '{}',
    });
  } catch {
    return { ok: false, error: 'The account server is not running.' };
  }
  const json = await res.json().catch(() => null);
  if (!json?.ok) return { ok: false, error: json?.error || 'The account was not deleted.' };
  await supabase.auth.signOut();
  return { ok: true };
}
