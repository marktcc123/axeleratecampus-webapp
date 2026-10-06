import { apiOrigin } from './api-origin.js';
import { createClient } from './supabase.js';

async function post(path, body) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'Sign in before you check out.' };
  let res;
  try {
    res = await fetch(`${apiOrigin()}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'Checkout server is not running.' };
  }
  const json = await res.json().catch(() => null);
  if (!json) return { ok: false, error: 'Checkout failed.' };
  return json;
}

export function placeLiveOrder({ method, creditsToUse, items }) {
  return post('/api/checkout', {
    method,
    creditsToUse,
    lines: items.map((item) => ({
      id: item.id,
      quantity: item.qty,
      size: item.size || '',
    })),
  });
}

export function completeLiveOrder(sessionId) {
  return post('/api/checkout/complete', { sessionId });
}

export function startWalletTopUp(amountUsd) {
  return post('/api/wallet/topup', { amountUsd });
}

export function completeWalletTopUp(sessionId) {
  return post('/api/wallet/topup/complete', { sessionId });
}

export function pullOrderTracking() {
  return post('/api/orders/tracking', {});
}

export function placeGift({ productId, size, creditsToUse }) {
  return post('/api/gift', { productId, size, creditsToUse });
}

export function claimGift(token) {
  return post('/api/gift/claim', { token });
}
