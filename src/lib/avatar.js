import { apiOrigin } from './api-origin.js';
import { inspectAvatar } from './avatar-file.js';
import { createClient, isLiveBackend } from './supabase.js';

function asBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const comma = text.indexOf(',');
      resolve(comma === -1 ? text : text.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('That photo could not be read.'));
    reader.readAsDataURL(file);
  });
}

export async function saveAvatar(file) {
  const checked = inspectAvatar({ type: file?.type, byteLength: file?.size });
  if (checked.error) return { ok: false, error: checked.error };
  if (!isLiveBackend()) return { ok: true, live: false };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const access = session?.access_token;
  if (!access) return { ok: false, error: 'Sign in before you change your photo.' };
  let data;
  try {
    data = await asBase64(file);
  } catch (err) {
    return { ok: false, error: err.message };
  }
  let res;
  try {
    res = await fetch(`${apiOrigin()}/api/avatar`, {
      method: 'POST',
      headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
      body: JSON.stringify({ type: file.type, data }),
    });
  } catch {
    return { ok: false, error: 'Photo server is not running.' };
  }
  const json = await res.json().catch(() => null);
  if (!json?.ok) return { ok: false, error: json?.error || 'The photo was not saved.' };
  return { ok: true, url: json.url };
}
