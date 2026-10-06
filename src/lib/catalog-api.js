import { apiOrigin } from './api-origin.js';
import { createClient } from './supabase.js';

export async function catalogAct(action, payload) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'Sign in before you save the catalogue.' };
  let res;
  try {
    res = await fetch(`${apiOrigin()}/api/catalog`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    return { ok: false, error: 'The console server is not running.' };
  }
  const json = await res.json().catch(() => null);
  if (!json) return { ok: false, error: 'The catalogue did not save.' };
  return json;
}

export async function kept(result) {
  const settled = result && typeof result.then === 'function' ? await result : result;
  if (settled && settled.ok === false) return settled;
  return null;
}
