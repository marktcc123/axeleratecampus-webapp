import { apiOrigin } from './api-origin.js';
import { createClient } from './supabase.js';

async function token() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

async function call(path, { method, body } = {}) {
  const access = await token();
  if (!access) return { ok: false, error: 'Sign in before you open the console.' };
  let res;
  try {
    res = await fetch(`${apiOrigin()}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${access}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, error: 'The console server is not running.' };
  }
  const json = await res.json().catch(() => null);
  if (!json) return { ok: false, error: 'The console did not answer.' };
  return json;
}

export function loadAdminQueue() {
  return call('/api/admin', { method: 'GET' });
}

export function adminAct(action, payload) {
  return call('/api/admin/act', { method: 'POST', body: { action, ...payload } });
}
