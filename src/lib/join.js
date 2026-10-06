/**
 * The ONLY exit for the /join form. With no live backend this validates and
 * resolves. With `.env.development.local` it becomes
 *   supabase.auth.signInWithOtp({ email })
 * — the .edu OTP flow the product spec §4.3 requires — and nothing
 * else in the app changes. Tests and production preview stay offline.
 */
import { createClient, isLiveBackend } from './supabase.js';

export function isEduEmail(email) {
  return /^[^@\s]+@[^@\s]+\.edu$/i.test(String(email ?? '').trim());
}

const BASIC_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Product rule is .edu. The local live preview accepts any inbox so a
// developer without a school address can still receive a real OTP.
export function isSignInEmail(email) {
  const value = String(email ?? '').trim();
  if (isLiveBackend()) return BASIC_EMAIL.test(value);
  return isEduEmail(value);
}

function origin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

async function sendOtp(email, { createUser, data } = {}) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: createUser !== false,
      ...(origin() ? { emailRedirectTo: `${origin()}/login/code` } : {}),
      ...(data ? { data } : {}),
    },
  });
  if (error) throw new Error(error.message);
  return { ok: true, needsCode: true };
}

export async function submitJoin({ email, name, campus }) {
  if (!isSignInEmail(email)) throw new Error('School email must end in .edu');
  if (!name?.trim()) throw new Error('Name is required');
  if (!isLiveBackend()) {
    void campus;
    return { ok: true };
  }
  return sendOtp(email.trim(), {
    createUser: true,
    data: { full_name: name.trim(), campus: campus || '' },
  });
}

export async function submitLogin({ email }) {
  if (!isSignInEmail(email)) throw new Error('School email must end in .edu');
  if (!isLiveBackend()) return { ok: true };
  return sendOtp(email.trim(), { createUser: false });
}

export function isSixDigits(code) {
  return /^\d{6}$/.test(String(code ?? '').trim());
}

export async function verifyCode({ email, code, kind }) {
  if (!isSignInEmail(email)) throw new Error('School email must end in .edu');
  if (!isSixDigits(code)) throw new Error('The code is six digits');
  if (!isLiveBackend()) return { ok: true };
  const supabase = createClient();
  // A first signup's code is type `signup`. Checking it as `email` returns
  // "expired or invalid" even when the digits are right.
  const types = kind === 'signup'
    ? ['signup', 'email', 'magiclink']
    : ['email', 'magiclink', 'signup'];
  let last = null;
  for (const type of types) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: String(code).trim(),
      type,
    });
    if (!error) return { ok: true, user: data.user ?? null };
    last = error;
  }
  throw new Error(last?.message || 'That code did not work.');
}
