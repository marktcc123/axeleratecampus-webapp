import { createClient, isLiveBackend } from './supabase.js';
import { toBrand, toDrop, toEvent, toMission, toProduct } from './adapters/catalog.js';

export async function loadCatalog() {
  if (!isLiveBackend()) return null;
  const supabase = createClient();
  const [gigsRes, productsRes, brandsRes, eventsRes] = await Promise.all([
    supabase.from('gigs').select('*, brand:brands(*)').eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('products').select('*, brand:brands(*)').order('created_at', { ascending: false }),
    supabase.from('brands').select('*').order('name'),
    supabase.from('events').select('*').order('created_at', { ascending: false }),
  ]);

  if (gigsRes.error) console.warn('[catalog] gigs', gigsRes.error.message);
  if (productsRes.error) console.warn('[catalog] products', productsRes.error.message);
  if (brandsRes.error) console.warn('[catalog] brands', brandsRes.error.message);
  if (eventsRes.error) console.warn('[catalog] events', eventsRes.error.message);

  const brands = (brandsRes.data ?? []).map(toBrand);
  const missions = (gigsRes.data ?? []).map(toMission);
  const events = (eventsRes.data ?? []).map(toEvent);
  const reviews = await loadReviews(supabase);
  const reviewsByProduct = new Map();
  for (const review of reviews) {
    const list = reviewsByProduct.get(review.productId) ?? [];
    list.push(review);
    reviewsByProduct.set(review.productId, list);
  }
  const products = (productsRes.data ?? []).map((row) => ({
    ...toProduct(row),
    reviews: reviewsByProduct.get(row.id) ?? [],
  }));
  const drop = toDrop(productsRes.data ?? []);

  return { brands, missions, events, products, drop };
}

async function loadReviews(supabase) {
  const res = await supabase
    .from('product_reviews')
    .select('id, product_id, user_id, rating, comment, created_at')
    .order('created_at', { ascending: false });
  if (res.error) {
    console.warn('[catalog] reviews', res.error.message);
    return [];
  }
  const rows = res.data ?? [];
  const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const names = new Map();
  if (ids.length) {
    const named = await supabase.from('profiles').select('id, full_name').in('id', ids);
    if (named.error) console.warn('[catalog] review names', named.error.message);
    for (const person of named.data ?? []) names.set(person.id, person.full_name || '');
  }
  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: names.get(row.user_id) || 'Student',
    rating: Number(row.rating) || 0,
    date: String(row.created_at || '').slice(0, 10),
    body: row.comment || '',
  }));
}
