// Catalogue edits from the admin console, mapped onto the old tables.
// Hours, level, campus and local cover keys have no column, so they stay on screen only.

const GIG_TYPE = {
  content: 'ugc_post',
  sales: 'ugc_post',
  field: 'o2o_delivery',
  event: 'offline_event',
};

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function httpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isId(value) {
  return UUID.test(String(value || ''));
}

export function brandRow(fields) {
  const row = {
    name: String(fields.name || '').trim(),
    description: fields.blurb || '',
    category: fields.role || '',
  };
  const site = String(fields.siteUrl || '').trim();
  if (httpUrl(site)) row.website_url = site;
  if (httpUrl(fields.cover)) row.logo_url = fields.cover;
  return row;
}

export function missionRow(fields, { keepDescription = false, taken = 0 } = {}) {
  const total = Math.max(1, Math.floor(num(fields.spots?.total ?? fields.spotsTotal) || 1));
  const left = Math.max(0, total - Math.max(0, Math.floor(num(taken))));
  const row = {
    brand_id: fields.brandId,
    title: String(fields.title || '').trim(),
    type: GIG_TYPE[fields.format] || 'ugc_post',
    reward_cash: num(fields.payUsd),
    reward_credits: Math.max(0, Math.round(num(fields.creditPts))),
    xp_reward: Math.max(0, Math.round(num(fields.xp))),
    spots_total: total,
    spots_left: Math.min(total, left),
    status: 'active',
  };
  if (!keepDescription) row.description = fields.desc || '';
  if (httpUrl(fields.cover)) row.gallery_url = fields.cover;
  return row;
}

export function eventStamp(date, time) {
  const day = String(date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (time) {
    const parsed = new Date(`${day} ${time}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return `${day}T12:00:00.000Z`;
}

export function eventRow(fields, existing = {}) {
  const seats = Math.max(0, Math.round(num(fields.seatsLeft)));
  const cap = Math.max(num(existing.spots_total), seats);
  const row = {
    title: String(fields.title || '').trim(),
    description: fields.blurb || '',
    location: fields.venue || fields.place || '',
    spots_left: seats,
    spots_total: cap || seats || 1,
  };
  const stamp = eventStamp(fields.date, fields.time);
  if (stamp) row.event_date = stamp;
  if (httpUrl(fields.cover)) row.image_url = fields.cover;
  return row;
}

export function productPatch(fields) {
  const row = {};
  if (fields.title != null) row.title = String(fields.title).trim();
  if (fields.brandId) row.brand_id = fields.brandId;
  if (fields.priceUsd != null) row.discount_price = num(fields.priceUsd);
  if (fields.cashbackPct != null) {
    row.credit_cashback_percent = Math.min(100, Math.max(0, Math.round(num(fields.cashbackPct))));
  }
  if (fields.stock != null) row.stock_count = Math.max(0, Math.round(num(fields.stock)));
  if (fields.desc != null) row.description = fields.desc;
  if (fields.category) row.category = fields.category;
  if (httpUrl(fields.covers?.[0] || fields.cover)) row.image_url = fields.covers?.[0] || fields.cover;
  return row;
}

async function one(query) {
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, row: data };
}

export async function applyCatalogAction(admin, body, map) {
  const action = body?.action;
  const fail = (error) => ({ ok: false, error });

  if (action === 'saveBrand') {
    const row = brandRow(body);
    if (!row.name) return fail('A brand needs a name.');
    const saved = isId(body.id)
      ? await one(admin.from('brands').update(row).eq('id', body.id).select('*').single())
      : await one(admin.from('brands').insert(row).select('*').single());
    if (!saved.ok) return saved;
    return { ok: true, item: map.brand(saved.row) };
  }

  if (action === 'removeBrand') {
    const id = body.id;
    const gigs = await admin.from('gigs').select('id').eq('brand_id', id).limit(1);
    const products = await admin.from('products').select('id').eq('brand_id', id).limit(1);
    if (gigs.error) return fail(gigs.error.message);
    if (products.error) return fail(products.error.message);
    if ((gigs.data ?? []).length || (products.data ?? []).length) {
      return fail('This brand still has a mission or a product.');
    }
    const removed = await one(admin.from('brands').delete().eq('id', id).select('id').maybeSingle());
    if (!removed.ok) return removed;
    return { ok: true };
  }

  if (action === 'saveMission') {
    const row = missionRow(body, { keepDescription: Boolean(body.keepDescription), taken: body.taken });
    if (!row.title) return fail('A mission needs a title.');
    if (!row.brand_id) return fail('Pick a brand.');
    const saved = isId(body.slug)
      ? await one(admin.from('gigs').update(row).eq('id', body.slug).select('*, brand:brands(*)').single())
      : await one(admin.from('gigs').insert(row).select('*, brand:brands(*)').single());
    if (!saved.ok) return saved;
    return { ok: true, item: map.mission(saved.row) };
  }

  if (action === 'closeMission') {
    const closed = await one(admin.from('gigs').update({ status: 'closed' }).eq('id', body.slug).select('id').maybeSingle());
    if (!closed.ok) return closed;
    return { ok: true };
  }

  if (action === 'saveEvent') {
    let existing = {};
    if (isId(body.id)) {
      const current = await admin.from('events').select('spots_total').eq('id', body.id).maybeSingle();
      if (current.error) return fail(current.error.message);
      existing = current.data ?? {};
    }
    const row = eventRow(body, existing);
    if (!row.title) return fail('An event needs a title.');
    const saved = isId(body.id)
      ? await one(admin.from('events').update(row).eq('id', body.id).select('*').single())
      : await one(admin.from('events').insert(row).select('*').single());
    if (!saved.ok) return saved;
    return { ok: true, item: map.event(saved.row) };
  }

  if (action === 'closeEvent') {
    const apps = await admin.from('event_applications').select('id').eq('event_id', body.id).limit(1);
    if (apps.error) return fail(apps.error.message);
    if ((apps.data ?? []).length) return fail('This event has sign-ups, so it stays on the board.');
    const removed = await one(admin.from('events').delete().eq('id', body.id).select('id').maybeSingle());
    if (!removed.ok) return removed;
    return { ok: true };
  }

  if (action === 'saveProduct') {
    const patch = productPatch(body);
    if (!isId(body.id) && !patch.title) return fail('A product needs a title.');
    if (!isId(body.id) && !patch.brand_id) return fail('Pick a brand.');
    const saved = isId(body.id)
      ? await one(admin.from('products').update(patch).eq('id', body.id).select('*, brand:brands(*)').single())
      : await one(admin.from('products').insert({ price_credits: 0, stock_count: 0, ...patch }).select('*, brand:brands(*)').single());
    if (!saved.ok) return saved;
    return { ok: true, item: map.product(saved.row) };
  }

  if (action === 'removeProduct') {
    const bought = await admin.from('product_purchases').select('id').eq('product_id', body.id).limit(1);
    if (bought.error) return fail(bought.error.message);
    if ((bought.data ?? []).length) return fail('Students have bought this, so it stays in the shop.');
    const removed = await one(admin.from('products').delete().eq('id', body.id).select('id').maybeSingle());
    if (!removed.ok) return removed;
    return { ok: true };
  }

  return fail('That catalogue change is not saved from this console.');
}
