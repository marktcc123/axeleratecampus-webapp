// Demo and live are different products sharing one UI.
//
// `VITE_USE_LIVE_BACKEND` still means "Supabase auth/profile is configured".
// It does not turn the marketplace into live mode. That switch is explicit,
// because a half-configured project must keep showing the labeled demo
// rather than an empty production store.

export function isLiveMode() {
  return import.meta.env.VITE_APP_MODE === 'live'
    && Boolean(import.meta.env.VITE_SUPABASE_URL)
    && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function isDemoMode() {
  return !isLiveMode();
}

// Legacy earn / shop / XP / missions stay in the repo. They are part of the
// running product only when this is exactly "1". Tests set it so the old
// screens remain reachable; a normal build does not.
export function isLegacyMode() {
  return import.meta.env.VITE_LEGACY_MODE === '1';
}
