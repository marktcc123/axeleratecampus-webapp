// Maps the old Supabase tables onto the console's row shapes.
// The service-role client stays in checkout.mjs. This file never reads env.
import { payFirstMission } from './referral-pay.mjs';

const PHYSICAL = new Set(['offline_event', 'o2o_delivery']);

function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function uiGigStatus(status, { physical = false } = {}) {
  if (status === 'approved') return 'approved';
  if (status === 'completed' || status === 'paid') return 'complete';
  if (status === 'rejected') return 'rejected';
  if (status === 'submitted') return physical ? 'pending' : 'submitted';
  return 'pending';
}

export function uiEventStatus(status) {
  if (!status || status === 'applied' || status === 'pending') return 'pending';
  if (status === 'approved' || status === 'attended') return 'approved';
  return 'declined';
}

function personName(row) {
  return one(row.user || row.profile)?.full_name || 'Student';
}

export function splitUserGigs(rows) {
  const ugc = [];
  const gigs = [];
  for (const row of rows ?? []) {
    const gig = one(row.gig) ?? {};
    const person = one(row.user || row.profile) ?? {};
    const physical = PHYSICAL.has(gig.type);
    const shared = {
      id: row.id,
      user_id: row.user_id,
      full_name: person.full_name || 'Student',
      reward_cash: num(gig.reward_cash),
      reward_credits: num(gig.reward_credits),
      mission_slug: gig.id || row.gig_id,
      reject_reason: row.admin_rejection_message || '',
    };
    if (physical) {
      gigs.push({
        ...shared,
        phone: person.phone || '',
        email: person.email || '',
        location: person.campus || '',
        gig_date: String(row.applied_at || row.created_at || '').slice(0, 10),
        status: uiGigStatus(row.status, { physical: true }),
      });
    } else {
      ugc.push({
        ...shared,
        avatar_url: person.avatar_url || '',
        platform: row.platform || '',
        ugc_link: row.ugc_link || '',
        notes: row.notes || '',
        xp_reward: num(gig.xp_reward),
        created_at: String(row.created_at || row.applied_at || '').slice(0, 10),
        status: uiGigStatus(row.status),
      });
    }
  }
  return { ugc_submissions: ugc, gig_applications: gigs };
}

export function mapEventApps(rows) {
  return (rows ?? []).map((row) => {
    const person = one(row.profile) ?? {};
    return {
      id: row.id,
      user_id: row.user_id,
      full_name: person.full_name || 'Student',
      campus: person.campus || '',
      tier: '',
      status: uiEventStatus(row.status),
      event_id: row.event_id,
      reject_reason: '',
    };
  });
}

function unitPrice(product, size) {
  const variants = product?.specifications?.shopify_variants;
  if (Array.isArray(variants) && size) {
    const match = variants.find((v) => v && v.title === size);
    if (match && num(match.price) > 0) return num(match.price);
  }
  return num(product?.discount_price ?? product?.original_price);
}

function shipTo(profile) {
  const json = profile?.shipping_address;
  if (!json || typeof json !== 'object') return null;
  return {
    line1: json.address_line1 || '',
    line2: json.address_line2 || '',
    city: json.city || '',
    state: json.state || '',
    zip: json.zip_code || '',
  };
}

export function mapOrders(rows, productsById, brandsById) {
  return (rows ?? []).map((row) => {
    const profile = one(row.profile) ?? {};
    const items = (Array.isArray(row.items) ? row.items : []).map((line) => {
      const product = productsById.get(line.id) ?? {};
      const brand = brandsById.get(product.brand_id);
      return {
        product_id: line.id,
        name: product.title || 'Item',
        brand: brand?.name || '',
        quantity: num(line.quantity) || 1,
        price: unitPrice(product, line.size),
      };
    });
    let needs = null;
    if (row.return_status === 'requested') needs = 'return';
    else if (row.cancel_request_status === 'pending') needs = 'cancellation';
    else if (row.status === 'processing' && !row.tracking_number) needs = 'shipping';
    return {
      id: row.id,
      user_id: row.user_id,
      order_no: `AX-${String(row.id).slice(0, 8).toUpperCase()}`,
      full_name: profile.full_name || 'Student',
      phone: '',
      shipping_email: '',
      shipping_address: shipTo(profile),
      items,
      cash_paid: num(row.cash_paid),
      credits_used: num(row.credits_used),
      status: row.status || 'processing',
      needs,
      request_reason: row.return_reason || row.cancel_request_reason || '',
      created_at: row.created_at,
      tracking: row.tracking_number ? { carrier: '', number: row.tracking_number } : null,
    };
  });
}

export function mapReviews(rows) {
  return (rows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    full_name: personName(row),
    rating: num(row.rating),
    body: row.comment || row.body || row.content || '',
    created_at: String(row.created_at || '').slice(0, 10),
    status: row.status || 'approved',
    reject_reason: row.admin_rejection_message || '',
    product_id: row.product_id,
  }));
}

export function mapWithdrawals(rows) {
  return (rows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    full_name: personName(row),
    amount: num(row.amount),
    fee: num(row.fee),
    net_amount: num(row.net_amount),
    method: row.method || '',
    account_info: row.account_info || '',
    status: row.status || 'pending',
    created_at: row.created_at,
  }));
}

export function mapW9(rows) {
  return (rows ?? []).map((row) => ({
    id: row.id,
    user_id: row.id,
    full_name: row.full_name || 'Student',
    w9_submitted_at: String(row.w9_submitted_at || '').slice(0, 10),
    verified: Boolean(row.is_w9_verified),
  }));
}

export function mapClaims(rows) {
  return (rows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    full_name: personName(row),
    reward_summary: row.reward_key || 'Certificate',
    reward_key: row.reward_key || '',
    claimed_at: String(row.claimed_at || '').slice(0, 10),
    certificate_name: row.certificate_pdf_path ? 'On file' : '',
    certificate_stored: Boolean(row.certificate_pdf_path),
    status: row.status || 'pending',
  }));
}

export function campusesFrom(profiles) {
  const counts = new Map();
  for (const row of profiles ?? []) {
    const name = String(row.campus || '').trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, student_count]) => ({
      id: name,
      name,
      logo_url: '',
      student_count,
    }));
}

export function dailyFrom(orders, days = 90) {
  const map = new Map();
  for (const row of orders ?? []) {
    const date = String(row.created_at || '').slice(0, 10);
    if (!date) continue;
    const cur = map.get(date) || { cash_paid: 0, credits_used: 0 };
    cur.cash_paid += num(row.cash_paid);
    cur.credits_used += num(row.credits_used);
    map.set(date, cur);
  }
  const out = [];
  const end = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - i));
    const date = day.toISOString().slice(0, 10);
    const hit = map.get(date) || { cash_paid: 0, credits_used: 0 };
    out.push({ date, cash_paid: hit.cash_paid, credits_used: hit.credits_used });
  }
  return out;
}

async function take(query) {
  const { data, error } = await query;
  if (error) return { rows: [], error };
  return { rows: data ?? [], error: null };
}

export async function loadAdminSnapshot(admin, userId) {
  const gigs = await take(admin.from('user_gigs').select('*, gig:gigs(*), user:profiles(*)').order('applied_at', { ascending: false }));
  const events = await take(admin.from('event_applications').select('*, profile:profiles(*)').order('created_at', { ascending: false }));
  const orders = await take(admin.from('orders').select('id, user_id, status, items, created_at, cash_paid, credits_used, credits_cashback_given, tracking_number, cancel_reason, return_status, return_reason, cancel_request_status, cancel_request_reason, admin_rejection_message, profile:profiles(id, full_name, shipping_address)').order('created_at', { ascending: false }));
  const reviews = await take(admin.from('product_reviews').select('id, product_id, user_id, rating, comment, created_at, profile:profiles(full_name)').order('created_at', { ascending: false }));
  const profiles = await take(admin.from('profiles').select('id, full_name, campus'));
  const withdrawals = await take(admin.from('withdrawals').select('id, user_id, amount, fee, net_amount, method, account_info, status, created_at, profile:profiles!withdrawals_user_id_fkey(full_name)').order('created_at', { ascending: false }));
  const w9 = await take(admin.from('profiles').select('id, full_name, w9_submitted_at, is_w9_verified').not('w9_submitted_at', 'is', null).order('w9_submitted_at', { ascending: false }));
  const claims = await take(admin.from('career_rewards').select('id, user_id, reward_key, claimed_at, status, certificate_pdf_path, profile:profiles!career_rewards_user_id_fkey(full_name)').order('claimed_at', { ascending: false }));
  const me = await take(admin.from('profiles').select('full_name, campus').eq('id', userId));

  const warnings = [gigs, events, orders, reviews, profiles, withdrawals, w9, claims]
    .filter((r) => r.error)
    .map((r) => r.error.message);
  for (const message of warnings) console.error('[admin]', message);

  const orderRows = orders.rows;
  const productIds = [...new Set(orderRows.flatMap((row) => (Array.isArray(row.items) ? row.items : []).map((line) => line?.id).filter(Boolean)))];
  let products = [];
  if (productIds.length) {
    const loaded = await take(admin.from('products').select('id, title, brand_id, discount_price, original_price, specifications').in('id', productIds));
    products = loaded.rows;
  }
  const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))];
  let brands = [];
  if (brandIds.length) {
    const loaded = await take(admin.from('brands').select('id, name').in('id', brandIds));
    brands = loaded.rows;
  }

  const split = splitUserGigs(gigs.rows);
  const campusRows = profiles.rows;
  const operatorRow = me.rows[0] ?? {};
  return {
    ok: true,
    operator: {
      name: operatorRow.full_name || 'Admin',
      campus: operatorRow.campus || '',
    },
    queue: {
      ...split,
      event_applications: mapEventApps(events.rows),
      orders: mapOrders(orderRows, new Map(products.map((p) => [p.id, p])), new Map(brands.map((b) => [b.id, b]))),
      reviews: mapReviews(reviews.rows),
      withdrawals: mapWithdrawals(withdrawals.rows),
      w9_submissions: mapW9(w9.rows),
      career_claims: mapClaims(claims.rows),
      campuses: campusesFrom(campusRows),
      career_roles: [],
      career_pathways: [],
      daily_totals: dailyFrom(orderRows),
      stats: {
        total_users: campusRows.length,
        verified_users: campusRows.filter((row) => String(row.campus || '').trim()).length,
        active_today: 0,
      },
    },
  };
}

async function audit(admin, userId, entityType, entityId, action) {
  const { error } = await admin.from('audit_log').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: userId,
  });
  if (error) console.error('[admin] audit', error.message);
}

export async function applyAdminAction(admin, userId, body) {
  const action = body?.action;
  const id = body?.id;
  if (!id) return { ok: false, error: 'Missing id.' };
  const now = new Date().toISOString();
  const reason = String(body?.reason || '').trim();

  const finish = async (entityType, verb, query) => {
    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    await audit(admin, userId, entityType, id, verb);
    return { ok: true };
  };

  if (action === 'approveGig' || action === 'approveUgc') {
    return finish('user_gig', 'approved', admin.from('user_gigs').update({ status: 'approved', approved_at: now, updated_at: now }).eq('id', id));
  }
  if (action === 'rejectGig' || action === 'rejectUgc') {
    if (reason.length < 3) return { ok: false, error: 'A reason is required.' };
    return finish('user_gig', 'rejected', admin.from('user_gigs').update({ status: 'rejected', admin_rejection_message: reason, updated_at: now }).eq('id', id));
  }
  if (action === 'completeGig') {
    const result = await finish('user_gig', 'completed', admin.from('user_gigs').update({ status: 'completed', completed_at: now, updated_at: now }).eq('id', id));
    if (result.ok) {
      const gig = await admin.from('user_gigs').select('user_id').eq('id', id).maybeSingle();
      if (gig.data?.user_id) {
        try {
          await payFirstMission(admin, gig.data.user_id);
        } catch (err) {
          console.error('[admin] invite payout', err?.message || err);
        }
      }
    }
    return result;
  }
  if (action === 'approveEvent') {
    return finish('event_application', 'approved', admin.from('event_applications').update({ status: 'approved' }).eq('id', id));
  }
  if (action === 'declineEvent') {
    if (reason.length < 3) return { ok: false, error: 'A reason is required.' };
    return finish('event_application', 'rejected', admin.from('event_applications').update({ status: 'rejected' }).eq('id', id));
  }
  if (action === 'markShipped') {
    const carrier = String(body?.carrier || '').trim();
    const number = String(body?.number || '').trim();
    if (!carrier || !number) return { ok: false, error: 'Carrier and tracking number are required.' };
    return finish('order', 'shipped', admin.from('orders').update({ status: 'shipped', tracking_number: `${carrier} ${number}` }).eq('id', id));
  }
  if (action === 'verifyW9') {
    return finish('profile', 'w9_verified', admin.from('profiles').update({ is_w9_verified: true, updated_at: now }).eq('id', id));
  }
  return { ok: false, error: 'That decision is not saved from this console.' };
}
