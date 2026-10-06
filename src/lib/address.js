import { createClient, isLiveBackend } from './supabase.js';

// The new form says line1 / zip. The old profile stores address_line1 / zip_code.
export function fromShipping(json) {
  if (!json || typeof json !== 'object') return null;
  return {
    line1: json.address_line1 || '',
    line2: json.address_line2 || '',
    city: json.city || '',
    state: json.state || '',
    zip: json.zip_code || '',
  };
}

export function toShipping(address) {
  return {
    address_line1: address.line1 || '',
    address_line2: address.line2 || '',
    city: address.city || '',
    state: address.state || '',
    zip_code: address.zip || '',
  };
}

export async function saveShippingAddress(address) {
  if (!isLiveBackend()) return { ok: true, live: false };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Sign in before you save an address.');
  const { error } = await supabase
    .from('profiles')
    .update({ shipping_address: toShipping(address) })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  return { ok: true, live: true };
}
