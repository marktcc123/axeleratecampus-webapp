import { withdrawalInsert, LIVE_MIN_USD } from '../../src/lib/withdrawals.js';
import { toLedger } from '../../src/lib/account.js';

describe('a live withdrawal request', () => {
  test('builds a pending row and leaves the amount as money text', () => {
    const built = withdrawalInsert({
      amountUsd: 20, fee: 0, net: 20, method: 'PayPal', accountInfo: 'saved',
    });
    expect(built.row).toEqual({
      amount: '20.00',
      fee: '0.00',
      net_amount: '20.00',
      method: 'PayPal',
      account_info: 'saved',
      status: 'pending',
    });
    expect(LIVE_MIN_USD).toBe(20);
  });

  test('refuses a request under the table minimum, or the example handle', () => {
    expect(withdrawalInsert({ amountUsd: 10, fee: 0, net: 10, method: 'PayPal', accountInfo: 'saved' }).error)
      .toMatch(/\$20/);
    expect(withdrawalInsert({ amountUsd: 20, fee: 0, net: 20, method: 'Venmo', accountInfo: '@your-handle' }).error)
      .toMatch(/where this should be paid/);
  });
});

describe('wallet history includes withdrawal requests', () => {
  test('a pending request sits above older activity and does not clear', () => {
    const ledger = toLedger(
      [{ amount: 40, type: 'wallet_deposit', status: 'cleared', created_at: '2026-05-01T12:00:00.000Z' }],
      [{ amount: 20, method: 'PayPal', status: 'pending', created_at: '2026-09-26T12:00:00.000Z' }],
    );
    const pending = ledger[0].rows[0];
    expect(pending.title).toBe('Withdrawal to PayPal');
    expect(pending.usd).toBe(-20);
    expect(pending.pending).toBe(true);
    expect(ledger.flatMap((g) => g.rows).some((row) => row.title === 'Cash added')).toBe(true);
  });
});
