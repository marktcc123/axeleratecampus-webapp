import { normalizeInviteCode, referralDecision, shouldPayReferral, afterInviteReward, INVITE_CREDIT, INVITE_XP } from '../../server/referral.mjs';

describe('invite code', () => {
  test('normalizes paste and refuses own, used, and unknown codes', () => {
    expect(normalizeInviteCode(' ab\u200b12 ')).toBe('AB12');
    expect(referralDecision({ code: 'x' }).error).toMatch(/valid/);
    expect(referralDecision({ code: 'ABCD', ownCode: 'abcd' }).code).toBe('own');
    expect(referralDecision({ code: 'ABCD', alreadyReferred: true }).error).toMatch(/already used/);
    expect(referralDecision({ code: 'ABCD' }).error).toMatch(/doesn’t exist/);
    expect(referralDecision({ code: 'ABCD', referrerId: 'friend' })).toEqual({
      ok: true,
      code: 'ABCD',
      referrerId: 'friend',
    });
  });

  test('pays 200 credit and 200 XP once the first mission is cleared', () => {
    expect(shouldPayReferral({ status: 'pending', clearedCount: 1 })).toBe(true);
    expect(shouldPayReferral({ status: 'pending', clearedCount: 0 })).toBe(false);
    expect(shouldPayReferral({ status: 'approved', clearedCount: 2 })).toBe(false);
    expect(afterInviteReward({ credit_balance: 10, xp: 40, cash_balance: 9 })).toEqual({
      credit_balance: 210,
      xp: 240,
    });
  });
});
