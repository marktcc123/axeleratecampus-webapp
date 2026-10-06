import { toOrder } from '../../src/lib/account.js';

const row = (status) => ({
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  status,
  cash_paid: 4.99,
  credits_used: 0,
  created_at: '2026-09-26T00:00:00.000Z',
  items: [{ id: 'p1' }],
});

test('a processing order stays on Ordered', () => {
  const order = toOrder(row('processing'));
  expect(order.status).toBe('ordered');
  expect(order.steps.map((step) => step.done)).toEqual([true, false, false, false]);
});

test('later statuses keep their own step', () => {
  expect(toOrder(row('packed')).status).toBe('packed');
  expect(toOrder(row('shipped')).steps.map((step) => step.done)).toEqual([true, true, true, false]);
  expect(toOrder(row('delivered')).status).toBe('delivered');
  expect(toOrder(row('cancelled')).status).toBe('cancelled');
});
