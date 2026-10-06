import { createClient, isLiveBackend } from './supabase.js';

export async function saveReview({ productId, rating, comment }) {
  if (!isLiveBackend()) return { ok: true, live: false };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Sign in before you review.' };
  const stars = Math.round(Number(rating));
  if (stars < 1 || stars > 5) return { ok: false, error: 'Pick a rating.' };
  const { error } = await supabase.from('product_reviews').insert({
    product_id: productId,
    user_id: userId,
    rating: stars,
    comment: String(comment || '').trim(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, live: true };
}

export async function loadMyReviewIds() {
  if (!isLiveBackend()) return null;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('product_reviews')
    .select('product_id')
    .eq('user_id', userId);
  if (error) return [];
  return (data ?? []).map((row) => row.product_id);
}
