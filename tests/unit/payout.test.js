import { feeFor, netFor, etaFor, gates, earnedThisYear, hasWithdrawnBefore, annualPayout, w9Block, MIN_WITHDRAW_USD, W9_THRESHOLD_USD } from '../../src/app/payout.js';
import hub from '../../src/data/hub.example.json';

describe('payout arithmetic', () => {
  test('standard is free; instant is 1.5% with a 25-cent floor', () => {
    expect(feeFor(100, 'standard')).toBe(0);
    expect(feeFor(100, 'instant')).toBe(1.5);
    expect(feeFor(10, 'instant')).toBe(0.25);      // 15 cents would be under the floor
    expect(netFor(133, 'instant')).toBe(131);      // 1.995 → 2.00 (rounded to cents: 1.995 → 2)
  });

  test('standard lands within three BUSINESS days — a Friday says Wednesday', () => {
    const fri = new Date('2026-09-11T12:00:00');
    expect(etaFor('standard', fri).date.getDay()).toBe(3);       // Wednesday
    expect(etaFor('standard', new Date('2026-09-07T12:00:00')).date.getDay()).toBe(4); // Mon → Thu
    expect(etaFor('instant').label).toBe('in minutes');
  });

  test('the fixture has earned $87 this year and has withdrawn before', () => {
    expect(earnedThisYear(hub.ledger)).toBe(87);
    expect(hasWithdrawnBefore(hub.ledger)).toBe(true);
  });

  test('a 1099 year counts pending and completed payouts, and a verified W-9 clears it', () => {
    const rows = [
      { amount: 500, status: 'pending', created_at: '2026-09-10T00:00:00Z' },
      { amount: 100, status: 'completed', created_at: '2026-04-08T00:00:00Z' },
      { amount: 40, status: 'rejected', created_at: '2026-06-01T00:00:00Z' },
      { amount: 80, status: 'completed', created_at: '2025-12-01T00:00:00Z' },
    ];
    expect(annualPayout(rows, 2026)).toBe(600);
    expect(w9Block({ annualUsd: 600, w9Verified: true })).toBeNull();
    expect(w9Block({ annualUsd: 500, amountUsd: 100, w9Verified: false }).code).toBe('REQUIRE_W9');
    expect(w9Block({ annualUsd: 500, amountUsd: 50, w9Verified: false })).toBeNull();
    expect(w9Block({ annualUsd: 600, w9Verified: false, w9Submitted: true }).code).toBe('W9_PENDING');
  });

  test('gates bite only when they should', () => {
    const base = { cashUsd: 133, earnedYtd: 87, withdrawnBefore: true, w9Verified: false };
    expect(gates(base)).toEqual({
      belowMin: false, shortBy: 0, approachingW9: false, needsW9: false, w9Pending: false, needsLegalName: false,
    });
    expect(gates({ ...base, cashUsd: 6 })).toMatchObject({ belowMin: true, shortBy: MIN_WITHDRAW_USD - 6 });
    expect(gates({ ...base, annualUsd: W9_THRESHOLD_USD })).toMatchObject({ needsW9: true, approachingW9: false });
    expect(gates({ ...base, annualUsd: 520 })).toMatchObject({ approachingW9: true, needsW9: false });
    expect(gates({ ...base, annualUsd: W9_THRESHOLD_USD, w9Verified: true })).toMatchObject({ needsW9: false });
    expect(gates({ ...base, withdrawnBefore: false })).toMatchObject({ needsLegalName: true });
  });
});
