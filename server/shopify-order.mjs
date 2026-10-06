// Paid checkout → Shopify Admin order, and fulfillment tracking back onto our row.
// The admin token stays in the checkout process. This module never reads the env file.

export function variantRestId(raw) {
  const s = String(raw ?? '').trim();
  const numeric = /^\d+$/.test(s) ? s : (s.match(/ProductVariant\/(\d+)/) || [])[1];
  if (!numeric) throw new Error('Shopify variant id is not a number.');
  const n = Number(numeric);
  if (!Number.isSafeInteger(n)) throw new Error('Shopify variant id is too large.');
  return n;
}

export function shippingFromProfile(profile) {
  const raw = profile?.shipping_address;
  const line1 = raw && typeof raw === 'object' ? String(raw.address_line1 || '').trim() : '';
  if (!line1) return null;
  const name = String(profile?.full_name || 'Customer').trim() || 'Customer';
  const [first, ...rest] = name.split(/\s+/);
  const address = {
    first_name: first || 'Customer',
    last_name: rest.join(' ') || '-',
    address1: line1,
    city: String(raw.city || ''),
    province: String(raw.state || ''),
    country: String(raw.country || 'US'),
    zip: String(raw.zip_code || ''),
  };
  const line2 = String(raw.address_line2 || '').trim();
  if (line2) address.address2 = line2;
  return address;
}

// Unit prices are scaled so they add up to cash plus the credits spent.
// A store discount code is not required, and the sale matches that total.
export function mirrorOrderBody({
  email,
  lines,
  cashPaidUsd,
  creditsUsed = 0,
  paymentSource = 'wallet',
  reference = '',
  orderId = '',
  userId = '',
  shipping = null,
  inventoryBehaviour = 'decrement_ignoring_policy',
}) {
  const rows = (lines || []).filter((line) => line?.shopifyVariantId && Number(line.quantity) > 0);
  if (!email || !rows.length) return null;
  const catalogCents = rows.map((line) => Math.round(Number(line.unitUsd) * 100) * Math.floor(Number(line.quantity)));
  const sumCatalog = catalogCents.reduce((sum, cents) => sum + cents, 0);
  const mirrorCents = Math.round((Number(cashPaidUsd) + (Number(creditsUsed) || 0) / 100) * 100);
  const totalCents = mirrorCents >= 1 ? mirrorCents : (sumCatalog >= 1 ? sumCatalog : 0);
  if (totalCents < 1) return null;
  let allocated = 0;
  const lineItems = rows.map((line, index) => {
    const qty = Math.floor(Number(line.quantity));
    const isLast = index === rows.length - 1;
    const lineCents = isLast || sumCatalog <= 0
      ? totalCents - allocated
      : Math.round((totalCents * catalogCents[index]) / sumCatalog);
    if (!isLast) allocated += lineCents;
    return {
      variant_id: variantRestId(line.shopifyVariantId),
      quantity: qty,
      price: (lineCents / qty / 100).toFixed(2),
    };
  });
  const saleCents = lineItems.reduce(
    (sum, line) => sum + Math.round(Number(line.price) * 100) * line.quantity,
    0,
  );
  const isWallet = paymentSource !== 'stripe';
  const order = {
    email,
    line_items: lineItems,
    send_receipt: false,
    financial_status: 'paid',
    inventory_behaviour: inventoryBehaviour,
    tags: isWallet
      ? 'h5,wallet,inventory-sync,axelerate-mirror'
      : 'h5,stripe-mirrored,inventory-sync,axelerate-mirror',
    note: [
      isWallet ? 'Paid via Axelerate wallet.' : 'Paid via Stripe.',
      `charged=${(Math.round(Number(cashPaidUsd) * 100) / 100).toFixed(2)} USD`,
      reference ? `ref=${reference}` : '',
    ].filter(Boolean).join(' | '),
    note_attributes: [
      { name: 'payment_gateway', value: isWallet ? 'axelerate_wallet' : 'stripe' },
      { name: 'supabase_order_id', value: String(orderId) },
      { name: 'platform_user_id', value: String(userId) },
      { name: 'mirror_credits_pts', value: String(creditsUsed || 0) },
      { name: 'app', value: 'axelerate-h5' },
    ],
    transactions: [{
      kind: 'sale',
      status: 'success',
      amount: (saleCents / 100).toFixed(2),
      currency: 'USD',
      gateway: isWallet ? 'Axelerate' : 'Stripe',
    }],
  };
  if (shipping) order.shipping_address = shipping;
  return { order };
}

export function trackingNumberFrom(order) {
  const list = Array.isArray(order?.fulfillments) ? order.fulfillments : [];
  for (const row of list) {
    const number = row?.tracking_number
      || (Array.isArray(row?.tracking_numbers) ? row.tracking_numbers.find(Boolean) : '');
    if (number) return String(number);
  }
  return '';
}

export function shopifyOrderIdFrom(items) {
  if (!Array.isArray(items)) return '';
  const hit = items.find((item) => item?.shopifyOrderId);
  return hit ? String(hit.shopifyOrderId) : '';
}

export function stampShopifyOrderId(items, shopifyOrderId) {
  const next = Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
  if (next[0]) next[0] = { ...next[0], shopifyOrderId: String(shopifyOrderId) };
  return next;
}

export function decrementStock(product, lines) {
  const mine = (lines || []).filter((line) => line?.id === product?.id);
  if (!mine.length) return null;
  const specs = product.specifications && typeof product.specifications === 'object'
    ? structuredClone(product.specifications)
    : {};
  const variants = Array.isArray(specs.shopify_variants) ? specs.shopify_variants : null;
  let stock = Number(product.stock_count) || 0;
  for (const line of mine) {
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
    if (variants) {
      const match = variants.find((variant) => (
        (line.shopifyVariantId && String(variant.id) === String(line.shopifyVariantId))
        || (line.size && variant.title === line.size)
      ));
      if (match && Number.isFinite(Number(match.inventory_quantity))) {
        match.inventory_quantity = Math.max(0, Number(match.inventory_quantity) - qty);
      }
    }
    stock = Math.max(0, stock - qty);
  }
  return { stock_count: stock, specifications: specs };
}

function adminUrl(domain, apiVersion, path) {
  const host = String(domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${host}/admin/api/${apiVersion}${path}`;
}

export async function postMirrorOrder({
  domain,
  token,
  apiVersion = '2024-10',
  body,
  fetchImpl = fetch,
}) {
  const res = await fetchImpl(adminUrl(domain, apiVersion, '/orders.json'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok || !json?.order?.id) {
    throw new Error('Shopify did not create the order.');
  }
  return { orderId: String(json.order.id), orderName: json.order.name || '' };
}

// A numeric location id wins. Otherwise a name lookup runs only when asked.
export function vendorLocationTarget({ locationId = '', locationName = '', assignByName = false } = {}) {
  const id = String(locationId || '').trim();
  if (/^\d+$/.test(id)) return { gid: `gid://shopify/Location/${id}`, lookupName: '' };
  const name = String(locationName || '').trim();
  const assign = assignByName === true || ['1', 'true'].includes(String(assignByName).trim().toLowerCase());
  if (!name && !assign) return null;
  return { gid: '', lookupName: name || 'Vendor' };
}

const FULFILLMENT_ORDERS_QUERY = `query MirrorOrderFulfillmentOrders($orderId: ID!) {
  order(id: $orderId) {
    fulfillmentOrders(first: 25) {
      nodes { id status assignedLocation { location { id } } }
    }
  }
}`;

const FULFILLMENT_MOVE_MUTATION = `mutation MirrorMoveFulfillmentOrder($id: ID!, $newLocationId: ID!) {
  fulfillmentOrderMove(id: $id, newLocationId: $newLocationId) {
    userErrors { field message }
  }
}`;

async function adminGraphql({ domain, token, apiVersion, query, variables, fetchImpl }) {
  const res = await fetchImpl(adminUrl(domain, apiVersion, '/graphql.json'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok || json?.data == null) return null;
  return json.data;
}

async function lookupLocationGid({ domain, token, apiVersion, name, fetchImpl }) {
  const res = await fetchImpl(adminUrl(domain, apiVersion, '/locations.json'), {
    headers: { 'X-Shopify-Access-Token': token },
  });
  if (!res.ok) return '';
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  const want = String(name).trim().toLowerCase();
  const found = (json?.locations || []).find((row) => String(row?.name || '').trim().toLowerCase() === want);
  return found?.id != null && Number.isFinite(Number(found.id))
    ? `gid://shopify/Location/${found.id}`
    : '';
}

// After the paid order exists, move open fulfillment orders to the vendor warehouse.
// A missing warehouse, a 403, or a Shopify userError leaves the order in place.
export async function moveFulfillmentToVendor({
  domain,
  token,
  apiVersion = '2024-10',
  orderId,
  locationId = '',
  locationName = '',
  assignByName = false,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  attempts = 8,
}) {
  const target = vendorLocationTarget({ locationId, locationName, assignByName });
  if (!target || !orderId) return { moved: 0, skipped: true };
  const targetGid = target.gid || await lookupLocationGid({
    domain, token, apiVersion, name: target.lookupName, fetchImpl,
  });
  if (!targetGid) return { moved: 0, skipped: true };

  const orderGid = `gid://shopify/Order/${orderId}`;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleep(300 + attempt * 150);
    const data = await adminGraphql({
      domain,
      token,
      apiVersion,
      query: FULFILLMENT_ORDERS_QUERY,
      variables: { orderId: orderGid },
      fetchImpl,
    });
    if (!data) return { moved: 0, skipped: true };
    const nodes = data.order?.fulfillmentOrders?.nodes ?? [];
    if (!nodes.length) continue;
    let moved = 0;
    for (const row of nodes) {
      if (!row?.id) continue;
      const status = String(row.status || '').toUpperCase();
      if (status === 'CLOSED' || status === 'CANCELLED') continue;
      if (row.assignedLocation?.location?.id === targetGid) continue;
      const result = await adminGraphql({
        domain,
        token,
        apiVersion,
        query: FULFILLMENT_MOVE_MUTATION,
        variables: { id: row.id, newLocationId: targetGid },
        fetchImpl,
      });
      const errors = result?.fulfillmentOrderMove?.userErrors ?? [];
      if (result && errors.length === 0) moved += 1;
    }
    return { moved, skipped: false };
  }
  return { moved: 0, skipped: false };
}

export async function pullTrackingNumber({
  domain,
  token,
  apiVersion = '2024-10',
  orderId,
  fetchImpl = fetch,
}) {
  const res = await fetchImpl(
    adminUrl(domain, apiVersion, `/orders/${encodeURIComponent(orderId)}.json?fields=id,fulfillments`),
    { headers: { 'X-Shopify-Access-Token': token } },
  );
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) return '';
  return trackingNumberFrom(json?.order);
}
