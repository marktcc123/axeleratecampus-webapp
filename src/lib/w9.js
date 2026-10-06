import { apiOrigin } from './api-origin.js';
import { createClient, isLiveBackend } from './supabase.js';
import { inspectW9 } from './w9-file.js';

function asBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const comma = text.indexOf(',');
      resolve(comma === -1 ? text : text.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}

// Sends the file to the local server. The private bucket stays off this page.
export async function saveW9(file) {
  const checked = inspectW9({ type: file?.type, byteLength: file?.size });
  if (checked.error) return { ok: false, error: checked.error };
  if (!isLiveBackend()) return { ok: true, live: false };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const access = session?.access_token;
  if (!access) return { ok: false, error: 'Sign in before you upload a W-9.' };
  let data;
  try {
    data = await asBase64(file);
  } catch (err) {
    return { ok: false, error: err.message };
  }
  let res;
  try {
    res = await fetch(`${apiOrigin()}/api/w9`, {
      method: 'POST',
      headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
      body: JSON.stringify({ type: file.type, data }),
    });
  } catch {
    return { ok: false, error: 'The console server is not running.' };
  }
  const json = await res.json().catch(() => null);
  if (!json?.ok) return { ok: false, error: json?.error || 'The W-9 was not saved.' };
  return { ok: true, live: true };
}
