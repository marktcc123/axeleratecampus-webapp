// Browser calls to the checkout process. Unset stays on this computer.
// A public build sets VITE_API_ORIGIN to the https API host. No secrets.
const LOCAL = 'http://127.0.0.1:8787';

export function apiOrigin() {
  const raw = String(import.meta.env.VITE_API_ORIGIN || '').trim();
  if (!raw) return LOCAL;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return LOCAL;
    return url.origin;
  } catch {
    return LOCAL;
  }
}
