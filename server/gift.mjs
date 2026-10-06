import { randomBytes } from 'node:crypto';

export function newGiftToken() {
  return randomBytes(26).toString('base64url');
}

// The buyer already paid. Claiming checks the link, not the price.
export function claimBlock({ claim, userId }) {
  if (!claim) return { ok: false, error: 'This gift link is invalid or expired.' };
  if (claim.claimed_at) {
    if (claim.recipient_user_id === userId) {
      return { ok: false, error: 'You already unwrapped this gift. It is in your orders.' };
    }
    return { ok: false, error: 'This gift was already unwrapped.' };
  }
  if (claim.buyerId && claim.buyerId === userId) {
    return { ok: false, error: 'You can’t unwrap a gift you sent.' };
  }
  return null;
}
