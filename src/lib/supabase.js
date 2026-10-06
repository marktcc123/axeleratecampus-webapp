import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Browser-only client. Anon key only — service_role and Shopify admin tokens
// never enter this bundle. Tests and `vite build` stay on fixtures unless
// `.env.development.local` sets the live flag (dev server only).
export function isLiveBackend() {
  return (
    import.meta.env.VITE_USE_LIVE_BACKEND === '1' &&
    Boolean(import.meta.env.VITE_SUPABASE_URL) &&
    Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
  );
}

let client = null;

export function createClient() {
  if (!isLiveBackend()) return null;
  if (!client) {
    client = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  }
  return client;
}
