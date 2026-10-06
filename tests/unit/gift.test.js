import { claimBlock, newGiftToken } from '../../server/gift.mjs';

describe('gift links', () => {
  test('makes an unguessable token', () => {
    const token = newGiftToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(newGiftToken()).not.toBe(token);
  });

  test('refuses a missing, used, or self-sent gift', () => {
    expect(claimBlock({ claim: null, userId: 'friend' }).error).toMatch(/invalid/);
    expect(claimBlock({
      claim: { claimed_at: '2026-09-26', recipient_user_id: 'other' },
      userId: 'friend',
    }).error).toMatch(/already unwrapped/);
    expect(claimBlock({
      claim: { claimed_at: '2026-09-26', recipient_user_id: 'friend' },
      userId: 'friend',
    }).error).toMatch(/your orders/);
    expect(claimBlock({
      claim: { claimed_at: null, buyerId: 'buyer' },
      userId: 'buyer',
    }).error).toMatch(/you sent/);
    expect(claimBlock({
      claim: { claimed_at: null, buyerId: 'buyer' },
      userId: 'friend',
    })).toBeNull();
  });
});
