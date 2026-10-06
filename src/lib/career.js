import { createClient, isLiveBackend } from './supabase.js';

// Brands that offer a certificate or a referral lane. Finished counts stay on
// the student's paid applications; this list is only who the lane belongs to.
export async function loadCareerBrands() {
  if (!isLiveBackend()) return null;
  const supabase = createClient();
  if (!supabase) return [];
  const res = await supabase
    .from('brands')
    .select('id, name, career_internship_proof_enabled, career_referral_enabled')
    .order('name');
  if (res.error) {
    console.warn('[career] brands', res.error.message);
    return [];
  }
  return (res.data ?? [])
    .filter((b) => b.career_internship_proof_enabled || b.career_referral_enabled)
    .map((b) => ({ id: b.id, name: (b.name || '').trim() || 'Partner brand' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function finishedFor(applications, brandId) {
  const id = String(brandId || '').toLowerCase();
  return (applications ?? []).filter((a) => (
    a.status === 'paid' && String(a.brandId || '').toLowerCase() === id
  )).length;
}
