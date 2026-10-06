// Which browser origins may call the checkout process.
// Localhost is always allowed. A public site is listed in CHECKOUT_ALLOWED_ORIGINS.

export function parseAllowedOrigins(raw) {
  const set = new Set();
  for (const part of String(raw || '').split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed);
      if (url.protocol === 'http:' || url.protocol === 'https:') set.add(url.origin);
    } catch {
      // Skip a bad entry. One typo must not open every origin.
    }
  }
  return set;
}

export function allowOrigin(origin, extraOrigins) {
  if (!origin || typeof origin !== 'string') return '';
  let url;
  try {
    url = new URL(origin);
  } catch {
    return '';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  const allowed = extraOrigins instanceof Set ? extraOrigins : parseAllowedOrigins('');
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (local || allowed.has(url.origin)) return url.origin;
  return '';
}
