import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDataProvider, useAdmin } from '../../src/app/admin/store.jsx';
import admin from '../../src/data/admin.example.json';

// The order's status after a decision, read straight off the store — the
// Tasks queue only lists what is still waiting, so a screen cannot show this.
function Probe() {
  const s = useAdmin();
  return (
    <div>
      <button type="button" onClick={() => s.approveCancellation('ord3')}>cancel ord3</button>
      <button type="button" onClick={() => s.approveReturn('ord2')}>return ord2</button>
      <button type="button" onClick={() => s.declineCancellation('ord3', 'Already shipped.')}>decline ord3</button>
      <button type="button" onClick={() => s.markShipped('ord4', { carrier: 'USPS', number: '9400 1' })}>ship ord4</button>
      <ul>{s.orders.map((o) => <li key={o.id} data-testid={o.id}>{`${o.status}|${o.needs ?? ''}|${o.decline_reason ?? ''}|${o.tracking ? `${o.tracking.carrier} ${o.tracking.number}` : ''}`}</li>)}</ul>
    </div>
  );
}

const wrap = () => render(<AdminDataProvider><Probe /></AdminDataProvider>);

test('an approved cancellation is cancelled, not delivered (the bug the owner found, 2026-09-23)', async () => {
  const user = userEvent.setup(); wrap();
  expect(admin.orders.find((o) => o.id === 'ord3').needs).toBe('cancellation');
  await user.click(screen.getByRole('button', { name: 'cancel ord3' }));
  expect(screen.getByTestId('ord3')).toHaveTextContent(/^cancelled\|\|/);
});

test('an approved return is returned', async () => {
  const user = userEvent.setup(); wrap();
  await user.click(screen.getByRole('button', { name: 'return ord2' }));
  expect(screen.getByTestId('ord2')).toHaveTextContent(/^returned\|\|/);
});

test('a declined cancellation keeps its status, leaves the queue, and carries the reason', async () => {
  const user = userEvent.setup(); wrap();
  await user.click(screen.getByRole('button', { name: 'decline ord3' }));
  expect(screen.getByTestId('ord3')).toHaveTextContent(/^placed\|\|Already shipped\./);
});

test('Mark shipped stores the carrier and number on the order', async () => {
  const user = userEvent.setup(); wrap();
  await user.click(screen.getByRole('button', { name: 'ship ord4' }));
  expect(screen.getByTestId('ord4')).toHaveTextContent(/^shipped\|\|\|USPS 9400 1$/);
});
