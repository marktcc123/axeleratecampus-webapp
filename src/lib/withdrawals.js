import { createClient, isLiveBackend } from './supabase.js';
import { annualPayout, w9Block } from '../app/payout.js';

// The withdrawals table rejects anything under $20. The offline sheet still
// uses the $10 floor from the new wallet; a live request has to clear the
// column check or the insert never lands.
export const LIVE_MIN_USD = 20;

// The example handle is not an account. A live request has to name a real one.
const FIXTURE_DETAIL = '@your-handle';

const money = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);

export function withdrawalInsert({ amountUsd, fee, net, method, accountInfo }) {
  const amount = Number(money(amountUsd));
  const feeN = Number(money(fee));
  const netN = Number(money(net));
  const detail = String(accountInfo || '').trim();
  const kind = String(method || '').trim();
  if (!(amount >= LIVE_MIN_USD)) return { error: 'The minimum is $20.' };
  if (!kind || !detail || detail === FIXTURE_DETAIL) return { error: 'Add where this should be paid.' };
  if (feeN < 0 || netN < 0) return { error: 'That amount does not work.' };
  return {
    row: {
      amount: money(amount),
      fee: money(feeN),
      net_amount: money(netN),
      method: kind.slice(0, 32),
      account_info: detail,
      status: 'pending',
    },
  };
}

// Records a pending request with the signed-in student's own session.
// Cash on the profile stays where it is; paying it out is a later step.
export async function saveWithdrawal(input) {
  if (!isLiveBackend()) return { ok: true, live: false };
  const built = withdrawalInsert(input);
  if (built.error) return { ok: false, error: built.error };
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Sign in before you cash out.' };
  const [prior, profile] = await Promise.all([
    supabase.from('withdrawals').select('amount, status, created_at').eq('user_id', userId),
    supabase.from('profiles').select('is_w9_verified, w9_submitted_at').eq('id', userId).maybeSingle(),
  ]);
  if (prior.error) return { ok: false, error: 'Could not check this year’s payouts.' };
  if (profile.error) return { ok: false, error: 'Could not check the W-9 on file.' };
  const tax = w9Block({
    annualUsd: annualPayout(prior.data),
    amountUsd: input.amountUsd,
    w9Verified: profile.data?.is_w9_verified === true,
    w9Submitted: Boolean(profile.data?.w9_submitted_at),
  });
  if (tax) return { ok: false, error: tax.error, code: tax.code };
  const { data, error } = await supabase
    .from('withdrawals')
    .insert({ ...built.row, user_id: userId })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, live: true, id: data?.id };
}
