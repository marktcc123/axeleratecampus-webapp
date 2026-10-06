export function normalizeInviteCode(raw) {
  return String(raw || '').replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toUpperCase();
}

// A saved code waits for the first cleared mission. It does not pay anyone now.
export function referralDecision({ code, ownCode = '', alreadyReferred = false, referrerId = '' }) {
  const norm = normalizeInviteCode(code);
  if (norm.length < 2) return { ok: false, error: 'Enter a valid invite code.' };
  if (alreadyReferred) return { ok: false, error: 'You already used an invite code.' };
  if (ownCode && normalizeInviteCode(ownCode) === norm) {
    return { ok: false, code: 'own', error: 'That is your own code. Ask a friend for theirs.' };
  }
  if (!referrerId) return { ok: false, error: 'That code doesn’t exist. Double-check and try again.' };
  return { ok: true, code: norm, referrerId };
}

export const INVITE_CREDIT = 200;
export const INVITE_XP = 200;

// The first cleared mission pays a pending invite. A later mission does not pay it again.
export function shouldPayReferral({ status, clearedCount }) {
  return status === 'pending' && Number(clearedCount) >= 1;
}

export function afterInviteReward(profile) {
  return {
    credit_balance: Math.round(Number(profile?.credit_balance) || 0) + INVITE_CREDIT,
    xp: Math.round(Number(profile?.xp) || 0) + INVITE_XP,
  };
}
