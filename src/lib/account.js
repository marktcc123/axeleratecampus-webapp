import { createClient, isLiveBackend } from './supabase.js';
import { pullOrderTracking } from './checkout.js';

// Old user_gigs statuses, folded into the tracker's words.
const STATUS = {
  pending: 'applied',
  applied: 'applied',
  approved: 'approved',
  submitted: 'submitted',
  completed: 'submitted',
  rejected: 'rejected',
  paid: 'paid',
};

const TX_TITLE = {
  gig_reward: 'Mission pay',
  withdrawal: 'Withdrawal',
  purchase: 'Shop order',
  referral_bonus: 'Referral',
  wallet_deposit: 'Cash added',
};

const MONEY_OUT = new Set(['withdrawal', 'purchase']);

export function toApplication(row) {
  const gig = row.gig ?? {};
  const appliedAt = String(row.applied_at || '').slice(0, 10);
  return {
    missionSlug: gig.id || row.gig_id,
    brand: gig.brand?.name || 'Brand',
    brandId: gig.brand_id || gig.brand?.id || '',
    title: gig.title || 'Mission',
    payUsd: Number(gig.reward_cash) || 0,
    status: STATUS[row.status] || 'applied',
    appliedAt,
    brief: gig.description || 'You applied to this mission.',
  };
}

const STEP_LABELS = ['Ordered', 'Packed', 'Shipped', 'Delivered'];

// Ordered → Packed → Shipped → Delivered. Checkout stores `processing`, the
// old word for "just paid, not packed yet". Anything unknown used to fall
// through to Packed, so a new order looked packed the moment it landed.
function orderRank(status) {
  const s = String(status || '').toLowerCase();
  if (['delivered', 'fulfilled', 'completed', 'paid'].includes(s)) return 3;
  if (s === 'shipped') return 2;
  if (s === 'packed' || s === 'packing') return 1;
  return 0;
}

function listStatus(status) {
  const rank = orderRank(status);
  if (String(status || '').toLowerCase().match(/cancel|refund/)) return 'cancelled';
  return ['ordered', 'packed', 'shipped', 'delivered'][rank];
}

const dayLabel = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Old orders (cash_paid, credits, item ids) into the receipt the new screen draws.
export function toOrder(row, productsById = new Map()) {
  const items = Array.isArray(row.items) ? row.items : [];
  const firstId = items.map((item) => item?.id).find(Boolean) || '';
  const product = productsById.get(firstId);
  const cash = Number(row.cash_paid) || 0;
  const credits = Number(row.credits_used) || 0;
  const placed = dayLabel(row.created_at);
  const rank = orderRank(row.status);
  const status = listStatus(row.status);
  const cashback = Number(row.credits_cashback_given) || 0;
  return {
    id: row.id,
    no: `AX-${String(row.id).replace(/-/g, '').slice(0, 4).toUpperCase()}`,
    brand: product?.brand?.name || '',
    name: product?.title || 'Shop order',
    date: placed,
    at: row.created_at || '',
    priceUsd: Math.round((cash + credits / 100) * 100) / 100,
    status,
    productId: firstId,
    cover: product?.image_url || '',
    note: items.some((item) => item?.gift === true)
      ? 'Gift link. It ships when your friend unwraps it.'
      : (cashback ? `+ ${cashback.toLocaleString('en-US')} credit from this order` : ''),
    gift: items.some((item) => item?.gift === true),
    paid: { cashUsd: cash, creditPts: credits },
    tracking: row.tracking_number ? { carrier: 'Tracking', number: row.tracking_number } : null,
    tone: status === 'delivered' ? 'yellow' : (status === 'shipped' ? 'lavender' : 'neutral'),
    steps: STEP_LABELS.map((label, i) => ({
      label,
      date: i <= rank ? placed : '—',
      done: status === 'cancelled' ? i === 0 : i <= rank,
    })),
  };
}

function monthOf(iso) {
  const date = new Date(iso);
  const ok = !Number.isNaN(date.getTime());
  return {
    ok,
    at: ok ? date.toISOString() : '',
    month: ok ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Activity',
    day: ok ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
  };
}

// Transactions plus withdrawal requests, newest first inside each month.
// A pending request is a row here; it does not change cash_balance.
export function toLedger(rows, withdrawals = []) {
  const items = [];
  for (const row of rows ?? []) {
    const when = monthOf(row.created_at);
    const amount = Number(row.amount) || 0;
    items.push({
      at: when.at,
      month: when.month,
      title: TX_TITLE[row.type] || 'Wallet',
      meta: [when.day, row.status === 'pending' ? 'pending' : ''].filter(Boolean).join(' · '),
      usd: MONEY_OUT.has(row.type) ? -Math.abs(amount) : amount,
      xp: 0,
      pts: 0,
      pending: row.status === 'pending',
    });
  }
  for (const row of withdrawals ?? []) {
    const when = monthOf(row.created_at);
    const pending = row.status === 'pending';
    items.push({
      at: when.at,
      month: when.month,
      title: `Withdrawal to ${row.method || 'payout'}`,
      meta: [when.day, pending ? 'pending' : ''].filter(Boolean).join(' · '),
      usd: -Math.abs(Number(row.amount) || 0),
      xp: 0,
      pts: 0,
      pending,
    });
  }
  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const groups = new Map();
  for (const item of items) {
    const { month, at, ...row } = item;
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(row);
  }
  return [...groups.entries()].map(([month, list]) => ({ month, rows: list }));
}

// The signed-in student's own rows. Null when this build is still on fixtures.
export async function loadMine() {
  if (!isLiveBackend()) return null;
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { signedIn: false };
  await pullOrderTracking().catch(() => {});

  const [profileRes, gigsRes, txRes, withdrawalsRes, orders] = await Promise.all([
    loadProfile(supabase, userId),
    supabase
      .from('user_gigs')
      .select('id, status, applied_at, gig_id, gig:gigs(id, title, reward_cash, description, brand_id, brand:brands(id, name))')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false }),
    supabase
      .from('transactions')
      .select('id, amount, type, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('withdrawals')
      .select('id, amount, method, account_info, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    loadOrders(supabase, userId),
  ]);

  if (profileRes.error) console.warn('[account] profile', profileRes.error.message);
  if (gigsRes.error) console.warn('[account] user_gigs', gigsRes.error.message);
  if (txRes.error) console.warn('[account] transactions', txRes.error.message);
  if (withdrawalsRes.error) console.warn('[account] withdrawals', withdrawalsRes.error.message);

  const withdrawals = withdrawalsRes.error ? [] : (withdrawalsRes.data ?? []);
  const saved = withdrawals.find((row) => row.method && row.account_info);

  return {
    signedIn: true,
    email: session.user.email || '',
    profile: profileRes.data,
    applications: gigsRes.error ? null : (gigsRes.data ?? []).map(toApplication),
    ledger: txRes.error ? null : toLedger(txRes.data ?? [], withdrawals),
    withdrawals,
    payout: saved ? { method: saved.method, account: saved.account_info } : null,
    orders,
  };
}

async function loadProfile(supabase, userId) {
  const withAddress = 'full_name, avatar_url, campus, cash_balance, credit_balance, xp, is_w9_verified, w9_submitted_at, shipping_address';
  const base = 'full_name, avatar_url, campus, cash_balance, credit_balance, xp, is_w9_verified, w9_submitted_at';
  let res = await supabase.from('profiles').select(withAddress).eq('id', userId).maybeSingle();
  if (res.error && /column/i.test(res.error.message || '')) {
    res = await supabase.from('profiles').select(base).eq('id', userId).maybeSingle();
  }
  return res;
}

async function loadOrders(supabase, userId) {
  const extended = 'id, status, items, created_at, cash_paid, credits_used, credits_cashback_given, tracking_number';
  const min = 'id, status, items, created_at, cash_paid, credits_used, credits_cashback_given';
  let res = await supabase.from('orders').select(extended).eq('user_id', userId).order('created_at', { ascending: false });
  if (res.error && /column/i.test(res.error.message || '')) {
    res = await supabase.from('orders').select(min).eq('user_id', userId).order('created_at', { ascending: false });
  }
  if (res.error) {
    console.warn('[account] orders', res.error.message);
    return null;
  }
  const rows = res.data ?? [];
  const ids = [...new Set(rows.flatMap((row) => (Array.isArray(row.items) ? row.items : []).map((item) => item?.id).filter(Boolean)))];
  const productsById = new Map();
  if (ids.length) {
    const prod = await supabase.from('products').select('id, title, image_url, brand:brands(name)').in('id', ids);
    if (prod.error) console.warn('[account] order products', prod.error.message);
    for (const product of prod.data ?? []) productsById.set(product.id, product);
  }
  return rows.map((row) => toOrder(row, productsById));
}
