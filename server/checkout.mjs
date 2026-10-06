// Checkout for the H5 app. Secrets stay in this process.
// Process env wins. The old project's .env.local fills anything still missing.
// Never imported by Vite.
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { allowOrigin as matchOrigin, parseAllowedOrigins } from './http-origin.mjs';
import { createClient } from '@supabase/supabase-js';
import { quoteCart } from './price-cart.mjs';
import { applyAdminAction, loadAdminSnapshot } from './admin-sync.mjs';
import { applyCatalogAction } from './catalog-write.mjs';
import { storeW9 } from './w9-upload.mjs';
import { storeCertificate } from './certificate-upload.mjs';
import { storeAvatar } from './avatar-upload.mjs';
import {
  decrementStock,
  mirrorOrderBody,
  moveFulfillmentToVendor,
  postMirrorOrder,
  pullTrackingNumber,
  vendorLocationTarget,
  shippingFromProfile,
  shopifyOrderIdFrom,
  stampShopifyOrderId,
} from './shopify-order.mjs';
import { claimBlock, newGiftToken } from './gift.mjs';
import { referralDecision } from './referral.mjs';
import { topupCents } from '../src/lib/wallet-topup.js';

const ENV_PATH = process.env.CHECKOUT_ENV_FILE
  || 'C:\\Users\\Mark\\Desktop\\axelerate-project\\web-design\\old_version_pack\\.env.local';
const PORT = Number(process.env.CHECKOUT_PORT) || 8787;
const HOST = process.env.CHECKOUT_HOST || '127.0.0.1';
const allowedOrigins = parseAllowedOrigins(process.env.CHECKOUT_ALLOWED_ORIGINS);

function loadEnvFile(file) {
  if (!file || !existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

function setting(fileEnv, name) {
  const fromProcess = process.env[name];
  if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim();
  return String(fileEnv[name] || '').trim();
}

const fileEnv = loadEnvFile(ENV_PATH);
const env = new Proxy(fileEnv, {
  get(target, name) {
    if (typeof name !== 'string') return undefined;
    return setting(target, name);
  },
});
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = env.STRIPE_SECRET_KEY;
const shopifyDomain = (env.SHOPIFY_STORE_DOMAIN || '').trim();
const shopifyToken = (env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();
const shopifyVersion = (env.SHOPIFY_API_VERSION || '').trim() || '2024-10';
const shopifyInventory = ['bypass', 'decrement_ignoring_policy', 'decrement_obeying_policy']
  .includes((env.SHOPIFY_ORDER_INVENTORY_BEHAVIOUR || '').trim())
  ? env.SHOPIFY_ORDER_INVENTORY_BEHAVIOUR.trim()
  : 'decrement_ignoring_policy';
const shopifyReady = Boolean(shopifyDomain && shopifyToken);
const shopifyVendorId = (env.SHOPIFY_MIRROR_VENDOR_LOCATION_ID || '').trim();
const shopifyVendorName = (env.SHOPIFY_MIRROR_VENDOR_LOCATION_NAME || '').trim();
const shopifyAssignVendor = ['1', 'true'].includes(
  (env.SHOPIFY_MIRROR_ASSIGN_VENDOR_LOCATION || '').trim().toLowerCase(),
);
const shopifyVendorMove = Boolean(vendorLocationTarget({
  locationId: shopifyVendorId,
  locationName: shopifyVendorName,
  assignByName: shopifyAssignVendor,
}));

if (!supabaseUrl || !anonKey || !serviceKey || !stripeKey) {
  console.error('[checkout] missing Supabase or Stripe keys');
  process.exit(1);
}

const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function allowOrigin(origin) {
  return matchOrigin(origin, allowedOrigins);
}

function send(res, status, body, origin) {
  const headers = { 'content-type': 'application/json' };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-headers'] = 'authorization, content-type';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

async function userFrom(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function loadProducts(ids) {
  const { data, error } = await admin
    .from('products')
    .select('id, discount_price, original_price, stock_count, specifications, credit_cashback_percent')
    .in('id', ids);
  if (error) throw new Error('Failed to verify products.');
  return data ?? [];
}

async function loadProfile(userId) {
  const { data, error } = await admin
    .from('profiles')
    .select('cash_balance, credit_balance, full_name, shipping_address')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data;
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

async function insertOrder(user, quote, profile, options) {
  const {
    cashPaid,
    stripeCheckoutSessionId,
    hold = false,
    recordCredits,
    mirrorCash,
    mirrorCredits,
  } = options;
  const row = {
    user_id: user.id,
    cash_paid: cashPaid,
    credits_used: recordCredits ?? quote.actualCreditsUsed,
    credits_cashback_given: quote.cashbackPts,
    status: 'processing',
    items: quote.lines,
  };
  if (stripeCheckoutSessionId) row.stripe_checkout_session_id = stripeCheckoutSessionId;
  const { data, error } = await admin.from('orders').insert(row).select('id').single();
  if (error) throw new Error('Order creation failed.');
  if (hold) return data.id;
  for (const line of quote.lines) {
    await admin.from('product_purchases').insert({
      user_id: user.id,
      product_id: line.id,
      quantity: line.quantity,
    });
  }
  try {
    await applyStock(quote.lines);
    await mirrorPaidOrder({
      user,
      profile,
      orderId: data.id,
      quote: mirrorCredits == null ? quote : { ...quote, actualCreditsUsed: mirrorCredits },
      cashPaid: mirrorCash ?? cashPaid,
      reference: stripeCheckoutSessionId || `wallet:${data.id}`,
      paymentSource: stripeCheckoutSessionId ? 'stripe' : 'wallet',
    });
  } catch (err) {
    console.error('[checkout] after-order step', err?.message || err);
  }
  return data.id;
}

async function applyStock(lines) {
  const ids = [...new Set(lines.map((line) => line.id).filter(Boolean))];
  const products = await loadProducts(ids);
  for (const product of products) {
    const next = decrementStock(product, lines);
    if (!next) continue;
    const { error } = await admin
      .from('products')
      .update({
        stock_count: next.stock_count,
        specifications: next.specifications,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id);
    if (error) console.error('[checkout] stock update failed', product.id);
  }
}

async function mirrorPaidOrder({ user, profile, orderId, quote, cashPaid, reference, paymentSource }) {
  const body = mirrorOrderBody({
    email: user?.email || '',
    lines: quote.lines,
    cashPaidUsd: cashPaid,
    creditsUsed: quote.actualCreditsUsed,
    paymentSource,
    reference,
    orderId,
    userId: user?.id || '',
    shipping: shippingFromProfile(profile),
    inventoryBehaviour: shopifyInventory,
  });
  if (!body) return;
  if (!shopifyReady) {
    console.warn('[checkout] shopify mirror skipped: admin env missing');
    return;
  }
  try {
    const created = await postMirrorOrder({
      domain: shopifyDomain,
      token: shopifyToken,
      apiVersion: shopifyVersion,
      body,
    });
    const { error } = await admin
      .from('orders')
      .update({
        items: stampShopifyOrderId(quote.lines, created.orderId),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    if (error) console.error('[checkout] shopify order id was not stored', orderId);
    try {
      await moveFulfillmentToVendor({
        domain: shopifyDomain,
        token: shopifyToken,
        apiVersion: shopifyVersion,
        orderId: created.orderId,
        locationId: shopifyVendorId,
        locationName: shopifyVendorName,
        assignByName: shopifyAssignVendor,
      });
    } catch (err) {
      console.error('[checkout] vendor location move failed', orderId, err?.message || err);
    }
  } catch (err) {
    console.error('[checkout] shopify mirror failed', orderId, err?.message || err);
    await admin
      .from('orders')
      .update({ status: 'shopify_sync_failed', updated_at: new Date().toISOString() })
      .eq('id', orderId);
  }
}

async function syncTrackingFor(userId) {
  if (!shopifyReady) return { ok: true, updated: 0 };
  const { data, error } = await admin
    .from('orders')
    .select('id, status, items, tracking_number')
    .eq('user_id', userId);
  if (error) return { ok: false, error: 'Could not read orders.' };
  let updated = 0;
  for (const row of data ?? []) {
    if (row.tracking_number) continue;
    const shopifyId = shopifyOrderIdFrom(row.items);
    if (!shopifyId) continue;
    const number = await pullTrackingNumber({
      domain: shopifyDomain,
      token: shopifyToken,
      apiVersion: shopifyVersion,
      orderId: shopifyId,
    }).catch(() => '');
    if (!number) continue;
    const current = String(row.status || '').toLowerCase();
    const status = ['cancelled', 'canceled', 'refunded', 'delivered', 'shipped'].includes(current)
      ? row.status
      : 'shipped';
    const { error: upErr } = await admin
      .from('orders')
      .update({
        tracking_number: number,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('user_id', userId);
    if (!upErr) updated += 1;
  }
  return { ok: true, updated };
}

async function purchaseGift(user, body) {
  const lines = [{ id: body?.productId, quantity: 1, size: body?.size || '' }];
  const priced = await quoteForUser(user, lines, Number(body?.creditsToUse) || 0);
  if (!priced.ok) return priced;
  const { quote, profile } = priced;
  const cash = Number(profile.cash_balance) || 0;
  if (cash < quote.amountToPayUsd) return { ok: false, error: 'Not enough cash for this gift.' };
  const nextCredit = (Number(profile.credit_balance) || 0) - quote.actualCreditsUsed + quote.cashbackPts;
  const updated = await setBalances(user.id, cash - quote.amountToPayUsd, nextCredit, profile.cash_balance);
  if (!updated) return { ok: false, error: 'Your balance changed. Try again.' };
  const held = {
    ...quote,
    lines: quote.lines.map((line) => ({ ...line, gift: true })),
  };
  let orderId;
  try {
    orderId = await insertOrder(user, held, profile, { cashPaid: quote.amountToPayUsd, hold: true });
  } catch (err) {
    await setBalances(user.id, cash, profile.credit_balance, roundMoney(cash - quote.amountToPayUsd));
    return { ok: false, error: err.message || 'Could not make the gift link.' };
  }
  const token = newGiftToken();
  const { error } = await admin.from('gift_claims').insert({
    token,
    purchaser_order_id: orderId,
    mirror_cash_share: quote.amountToPayUsd,
    mirror_credits_share: quote.actualCreditsUsed,
  });
  if (error) {
    await admin.from('orders').delete().eq('id', orderId);
    await setBalances(user.id, cash, profile.credit_balance, roundMoney(cash - quote.amountToPayUsd));
    return { ok: false, error: 'Could not make the gift link.' };
  }
  return {
    ok: true,
    token,
    path: `/gift/${encodeURIComponent(token)}`,
    cashUsd: Number(updated.cash_balance),
    creditPts: Number(updated.credit_balance),
  };
}

async function claimGift(user, token) {
  const value = String(token || '').trim();
  if (!value) return { ok: false, error: 'This gift link is invalid or expired.' };
  const { data: claim, error } = await admin.from('gift_claims').select('*').eq('token', value).maybeSingle();
  if (error || !claim) return { ok: false, error: 'This gift link is invalid or expired.' };
  const { data: payerOrder } = await admin
    .from('orders')
    .select('id, user_id, items')
    .eq('id', claim.purchaser_order_id)
    .maybeSingle();
  const block = claimBlock({
    claim: { ...claim, buyerId: payerOrder?.user_id },
    userId: user.id,
  });
  if (block) return block;
  const lines = (Array.isArray(payerOrder?.items) ? payerOrder.items : [])
    .filter((line) => line?.id)
    .map((line) => ({ id: line.id, quantity: line.quantity || 1, size: line.size || '' }));
  const priced = await quoteForUser(user, lines, 0);
  if (!priced.ok) return priced;
  const profile = priced.profile;
  const quote = {
    ...priced.quote,
    actualCreditsUsed: 0,
    cashbackPts: 0,
    lines: priced.quote.lines.map((line) => ({ ...line, gift: 'unwrapped' })),
  };
  let orderId;
  try {
    orderId = await insertOrder(user, quote, profile, {
      cashPaid: 0,
      recordCredits: 0,
      mirrorCash: Number(claim.mirror_cash_share) || 0,
      mirrorCredits: Number(claim.mirror_credits_share) || 0,
    });
  } catch (err) {
    return { ok: false, error: err.message || 'Could not unwrap this gift.' };
  }
  const { error: updErr } = await admin.from('gift_claims').update({
    claimed_at: new Date().toISOString(),
    recipient_user_id: user.id,
    recipient_order_id: orderId,
  }).eq('id', claim.id).is('claimed_at', null);
  if (updErr) return { ok: false, error: 'The order was created. Open your orders to see it.' };
  return { ok: true, orderId };
}

async function saveReferral(user, raw) {
  const { data: mine, error } = await admin
    .from('profiles')
    .select('id, referral_code, referred_by')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !mine) return { ok: false, error: 'Could not load your profile.' };
  const norm = String(raw || '').replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toUpperCase();
  let referrerId = '';
  if (norm.length >= 2 && norm !== String(mine.referral_code || '').replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toUpperCase()) {
    const found = await admin
      .from('profiles')
      .select('id')
      .eq('referral_code', norm)
      .neq('id', user.id)
      .maybeSingle();
    referrerId = found.data?.id || '';
  }
  const decision = referralDecision({
    code: raw,
    ownCode: mine.referral_code,
    alreadyReferred: Boolean(mine.referred_by),
    referrerId,
  });
  if (!decision.ok) return decision;
  const { data: linked, error: linkErr } = await admin
    .from('profiles')
    .update({ referred_by: decision.referrerId, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('referred_by', null)
    .select('id');
  if (linkErr || !linked?.length) return { ok: false, error: 'You already used an invite code.' };
  const { error: insertErr } = await admin.from('referrals').insert({
    referrer_id: decision.referrerId,
    referred_id: user.id,
    reward_amount: 0,
    reward_xp: 0,
    status: 'pending',
  });
  if (insertErr) {
    await admin.from('profiles').update({ referred_by: null }).eq('id', user.id).eq('referred_by', decision.referrerId);
    return { ok: false, error: 'The code was not saved.' };
  }
  return { ok: true };
}

async function deleteAccount(user) {
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: 'The account was not deleted.' };
  return { ok: true };
}

async function setBalances(userId, cash, credit, expectedCash) {
  const { data, error } = await admin
    .from('profiles')
    .update({
      cash_balance: roundMoney(cash),
      credit_balance: Math.round(credit),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('cash_balance', expectedCash)
    .select('cash_balance, credit_balance');
  if (error || !data?.length) return null;
  return data[0];
}

async function quoteForUser(user, lines, creditsToUse) {
  const products = await loadProducts([...new Set(lines.map((l) => l.id).filter(Boolean))]);
  const profile = await loadProfile(user.id);
  if (!profile) return { ok: false, error: 'Sign in before you check out.' };
  const quote = quoteCart(products, lines, {
    creditBalance: Number(profile.credit_balance) || 0,
    creditsToUse,
  });
  if (!quote.ok) return quote;
  return { ok: true, quote, profile };
}

async function payWithWallet(user, lines, creditsToUse) {
  const priced = await quoteForUser(user, lines, creditsToUse);
  if (!priced.ok) return priced;
  const { quote, profile } = priced;
  const cash = Number(profile.cash_balance) || 0;
  if (cash < quote.amountToPayUsd) return { ok: false, error: 'Not enough cash for the rest of this order.' };
  const nextCredit = (Number(profile.credit_balance) || 0) - quote.actualCreditsUsed + quote.cashbackPts;
  const updated = await setBalances(user.id, cash - quote.amountToPayUsd, nextCredit, profile.cash_balance);
  if (!updated) return { ok: false, error: 'Your balance changed. Try again.' };
  try {
    const orderId = await insertOrder(user, quote, profile, { cashPaid: quote.amountToPayUsd });
    return {
      ok: true,
      orderId,
      cashUsd: Number(updated.cash_balance),
      creditPts: Number(updated.credit_balance),
      cashbackPts: quote.cashbackPts,
    };
  } catch (err) {
    await setBalances(user.id, cash, profile.credit_balance, roundMoney(cash - quote.amountToPayUsd));
    return { ok: false, error: err.message || 'Order creation failed.' };
  }
}

async function stripeForm(params) {
  const body = new URLSearchParams(params);
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${stripeKey}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json?.error?.message || 'Could not start card checkout.' };
  if (!json.url) return { ok: false, error: 'Could not start card checkout.' };
  return { ok: true, url: json.url, id: json.id };
}

async function payWithCard(user, lines, creditsToUse, origin) {
  const priced = await quoteForUser(user, lines, creditsToUse);
  if (!priced.ok) return priced;
  const { quote } = priced;
  if (quote.amountToPayUsd <= 0) return { ok: false, error: 'Nothing left to charge on a card.' };
  const cents = Math.round(quote.amountToPayUsd * 100);
  if (cents < 50) return { ok: false, error: 'Card checkout starts at $0.50.' };
  const packed = JSON.stringify(quote.lines.map((l) => ({ id: l.id, quantity: l.quantity, size: l.size })));
  if (packed.length > 450) return { ok: false, error: 'Cart is too large for card checkout.' };
  const success = `${origin}/app/cart?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancel = `${origin}/app/cart?checkout=cancelled`;
  return stripeForm({
    mode: 'payment',
    'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': 'Axelerate Perks Shop',
    'line_items[0][price_data][product_data][description]': `${quote.lines.length} item(s)`,
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][quantity]': '1',
    success_url: success,
    cancel_url: cancel,
    'metadata[userId]': user.id,
    'metadata[lines]': packed,
    'metadata[credits]': String(quote.actualCreditsUsed),
    client_reference_id: user.id,
  });
}

async function stripeSession(id) {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${stripeKey}` },
  });
  const json = await res.json();
  if (!res.ok) return null;
  return json;
}

async function completeCard(user, sessionId) {
  if (!sessionId || !/^cs_/.test(sessionId)) return { ok: false, error: 'Missing checkout session.' };
  const existing = await admin
    .from('orders')
    .select('id')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();
  if (existing.data?.id) return { ok: true, orderId: existing.data.id, already: true };
  const session = await stripeSession(sessionId);
  if (!session || session.payment_status !== 'paid') return { ok: false, error: 'Payment is not complete.' };
  if (session.metadata?.userId !== user.id && session.client_reference_id !== user.id) {
    return { ok: false, error: 'This payment belongs to another account.' };
  }
  let lines = [];
  try { lines = JSON.parse(session.metadata?.lines || '[]'); } catch { lines = []; }
  const priced = await quoteForUser(user, lines, Number(session.metadata?.credits) || 0);
  if (!priced.ok) return priced;
  const paidCents = Number(session.amount_total);
  const dueCents = Math.round(priced.quote.amountToPayUsd * 100);
  if (paidCents !== dueCents) return { ok: false, error: 'The paid amount does not match this cart.' };
  const profile = priced.profile;
  const nextCredit = (Number(profile.credit_balance) || 0) - priced.quote.actualCreditsUsed + priced.quote.cashbackPts;
  if (priced.quote.actualCreditsUsed || priced.quote.cashbackPts) {
    const updated = await setBalances(user.id, profile.cash_balance, nextCredit, profile.cash_balance);
    if (!updated) return { ok: false, error: 'Your balance changed. Try again.' };
  }
  try {
    const orderId = await insertOrder(user, priced.quote, profile, {
      cashPaid: priced.quote.amountToPayUsd,
      stripeCheckoutSessionId: sessionId,
    });
    const fresh = await loadProfile(user.id);
    return {
      ok: true,
      orderId,
      cashUsd: Number(fresh?.cash_balance) || 0,
      creditPts: Number(fresh?.credit_balance) || 0,
      cashbackPts: priced.quote.cashbackPts,
    };
  } catch (err) {
    if (priced.quote.actualCreditsUsed || priced.quote.cashbackPts) {
      await setBalances(user.id, profile.cash_balance, profile.credit_balance, profile.cash_balance);
    }
    return { ok: false, error: err.message || 'Order creation failed.' };
  }
}

async function startTopUp(user, amountUsd, origin) {
  const priced = topupCents(amountUsd);
  if (!priced.ok) return priced;
  const base = origin || 'http://127.0.0.1:5173';
  return stripeForm({
    mode: 'payment',
    'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': 'Wallet top-up',
    'line_items[0][price_data][product_data][description]': `Add $${priced.amountUsd.toFixed(2)} to your Axelerate balance`,
    'line_items[0][price_data][unit_amount]': String(priced.cents),
    'line_items[0][quantity]': '1',
    success_url: `${base}/app/me/wallet?topup=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/app/me/wallet?topup=cancelled`,
    'metadata[purpose]': 'wallet_topup',
    'metadata[userId]': user.id,
    'metadata[usdCents]': String(priced.cents),
    client_reference_id: user.id,
  });
}

async function creditedTopUp(userId, amountUsd) {
  const profile = await loadProfile(userId);
  if (!profile) return null;
  return setBalances(
    userId,
    (Number(profile.cash_balance) || 0) + amountUsd,
    Number(profile.credit_balance) || 0,
    profile.cash_balance,
  );
}

async function recordTopUp(user, sessionId, amountUsd) {
  let updated = await creditedTopUp(user.id, amountUsd);
  if (!updated) updated = await creditedTopUp(user.id, amountUsd);
  if (!updated) {
    await admin.from('stripe_wallet_topups').delete().eq('stripe_checkout_session_id', sessionId);
    return { ok: false, error: 'Your balance changed. Open the wallet again to finish adding the cash.' };
  }
  const row = {
    user_id: user.id,
    amount: amountUsd,
    type: 'wallet_deposit',
    status: 'cleared',
    metadata: { stripe_checkout_session_id: sessionId, source: 'stripe' },
  };
  let tx = await admin.from('transactions').insert(row);
  if (tx.error && /metadata|column/i.test(tx.error.message || '')) {
    tx = await admin.from('transactions').insert({
      user_id: row.user_id,
      amount: row.amount,
      type: row.type,
      status: row.status,
    });
  }
  if (tx.error) console.warn('[topup] transaction', tx.error.message);
  return {
    ok: true,
    cashUsd: Number(updated.cash_balance),
    creditPts: Number(updated.credit_balance),
    amountUsd,
  };
}

async function completeTopUp(user, sessionId) {
  if (!sessionId || !/^cs_/.test(sessionId)) return { ok: false, error: 'Missing checkout session.' };
  const existing = await admin
    .from('stripe_wallet_topups')
    .select('id, amount_usd, user_id')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();
  if (existing.error) return { ok: false, error: 'Could not check this top-up.' };
  if (existing.data?.id) {
    if (existing.data.user_id !== user.id) return { ok: false, error: 'This payment belongs to another account.' };
    const profile = await loadProfile(user.id);
    return {
      ok: true,
      already: true,
      cashUsd: Number(profile?.cash_balance) || 0,
      creditPts: Number(profile?.credit_balance) || 0,
      amountUsd: Number(existing.data.amount_usd) || 0,
    };
  }
  const session = await stripeSession(sessionId);
  if (!session || session.payment_status !== 'paid') return { ok: false, error: 'Payment is not complete.' };
  if (session.metadata?.purpose !== 'wallet_topup') return { ok: false, error: 'Not a wallet top-up.' };
  if (session.metadata?.userId !== user.id && session.client_reference_id !== user.id) {
    return { ok: false, error: 'This payment belongs to another account.' };
  }
  const paidCents = Number(session.amount_total);
  const expected = Number(String(session.metadata?.usdCents || '').trim());
  if (!Number.isFinite(expected) || Math.abs(expected - paidCents) > 2) {
    return { ok: false, error: 'The paid amount does not match this top-up.' };
  }
  const amountUsd = paidCents / 100;
  const inserted = await admin.from('stripe_wallet_topups').insert({
    user_id: user.id,
    stripe_checkout_session_id: sessionId,
    amount_usd: amountUsd,
  }).select('id');
  if (inserted.error) {
    if (inserted.error.code === '23505') {
      return completeTopUp(user, sessionId);
    }
    return { ok: false, error: 'Could not record this top-up.' };
  }
  return recordTopUp(user, sessionId, amountUsd);
}

const server = createServer(async (req, res) => {
  const origin = allowOrigin(req.headers.origin);
  const path = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, origin ? {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    } : {});
    res.end();
    return;
  }
  try {
    const user = await userFrom(req);
    if (!user) {
      const message = path.startsWith('/api/admin') || path.startsWith('/api/catalog')
        ? 'Sign in before you open the console.'
        : path === '/api/w9'
          ? 'Sign in before you upload a W-9.'
          : path === '/api/career/certificate'
            ? 'Sign in before you upload a certificate.'
          : path.startsWith('/api/gift')
            ? 'Sign in before you send a gift.'
            : path === '/api/avatar'
              ? 'Sign in before you change your photo.'
              : path === '/api/invite'
                ? 'Sign in before you use an invite code.'
                : path === '/api/account/delete'
                  ? 'Sign in before you delete your account.'
                  : path.startsWith('/api/wallet')
                    ? 'Sign in before you add funds.'
                    : 'Sign in before you check out.';
      send(res, 401, { ok: false, error: message }, origin);
      return;
    }
    if (req.method === 'GET' && path === '/api/admin') {
      send(res, 200, await loadAdminSnapshot(admin, user.id), origin);
      return;
    }
    if (req.method === 'POST' && path === '/api/admin/act') {
      const body = await readJson(req);
      const result = await applyAdminAction(admin, user.id, body);
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method === 'POST' && path === '/api/catalog') {
      const body = await readJson(req);
      const result = await applyCatalogAction(admin, body, {
        brand: toBrand,
        mission: toMission,
        event: toEvent,
        product: toProduct,
      });
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method === 'POST' && path === '/api/orders/tracking') {
      send(res, 200, await syncTrackingFor(user.id), origin);
      return;
    }
    if (req.method === 'POST' && path === '/api/avatar') {
      const body = await readJson(req);
      const result = await storeAvatar(admin, user.id, body);
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method === 'POST' && path === '/api/invite') {
      const body = await readJson(req);
      const result = await saveReferral(user, body.code);
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method === 'POST' && path === '/api/account/delete') {
      const result = await deleteAccount(user);
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method === 'POST' && path === '/api/w9') {
      const body = await readJson(req);
      const result = await storeW9(admin, user.id, body);
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method === 'POST' && path === '/api/career/certificate') {
      const body = await readJson(req);
      const result = await storeCertificate(admin, body);
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method === 'POST' && (path === '/api/wallet/topup' || path === '/api/wallet/topup/complete')) {
      const body = await readJson(req);
      const result = path === '/api/wallet/topup/complete'
        ? await completeTopUp(user, body.sessionId)
        : await startTopUp(user, body.amountUsd, origin || 'http://127.0.0.1:5173');
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method === 'POST' && (path === '/api/gift' || path === '/api/gift/claim')) {
      const body = await readJson(req);
      const result = path === '/api/gift/claim'
        ? await claimGift(user, body.token)
        : await purchaseGift(user, body);
      send(res, result.ok ? 200 : 400, result, origin);
      return;
    }
    if (req.method !== 'POST' || (path !== '/api/checkout' && path !== '/api/checkout/complete')) {
      send(res, 404, { ok: false, error: 'Not found.' }, origin);
      return;
    }
    const body = await readJson(req);
    if (path === '/api/checkout/complete') {
      send(res, 200, await completeCard(user, body.sessionId), origin);
      return;
    }
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const credits = body.method === 'wallet' ? Number(body.creditsToUse) || 0 : 0;
    const result = body.method === 'card'
      ? await payWithCard(user, lines, credits, origin || 'http://localhost:5175')
      : await payWithWallet(user, lines, credits);
    send(res, result.ok ? 200 : 400, result, origin);
  } catch (err) {
    send(res, 500, { ok: false, error: err.message || 'Request failed.' }, origin);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[checkout] listening on ${HOST}:${PORT}`);
  console.log(`[checkout] shopify mirror ${shopifyReady ? 'on' : 'off'}`);
  console.log(`[checkout] shopify vendor move ${shopifyVendorMove ? 'on' : 'off'}`);
});
