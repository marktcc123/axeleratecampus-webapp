import { afterInviteReward, INVITE_CREDIT, INVITE_XP, shouldPayReferral } from './referral.mjs';

const CLEARED = ['completed', 'paid'];

async function credit(admin, userId) {
  const { data, error } = await admin
    .from('profiles')
    .select('credit_balance, xp')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  const next = afterInviteReward(data);
  const { error: upErr } = await admin.from('profiles').update({
    ...next,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
  return !upErr;
}

// Called after a mission is marked complete. Cash is left alone.
export async function payFirstMission(admin, referredUserId) {
  if (!referredUserId) return { paid: false };
  const cleared = await admin
    .from('user_gigs')
    .select('id')
    .eq('user_id', referredUserId)
    .in('status', CLEARED);
  if (cleared.error) return { paid: false };
  const pending = await admin
    .from('referrals')
    .select('id, status, referrer_id, referred_id')
    .eq('referred_id', referredUserId)
    .eq('status', 'pending')
    .maybeSingle();
  if (pending.error || !shouldPayReferral({ status: pending.data?.status, clearedCount: cleared.data?.length || 0 })) {
    return { paid: false };
  }
  const row = pending.data;
  const claimed = await admin
    .from('referrals')
    .update({
      status: 'approved',
      reward_amount: INVITE_CREDIT,
      reward_xp: INVITE_XP,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('status', 'pending')
    .select('id');
  if (claimed.error || !claimed.data?.length) return { paid: false };
  const referrerOk = await credit(admin, row.referrer_id);
  const referredOk = await credit(admin, row.referred_id);
  if (referrerOk && referredOk) return { paid: true };
  await admin.from('referrals').update({
    status: 'pending',
    reward_amount: 0,
    reward_xp: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', row.id);
  return { paid: false };
}
