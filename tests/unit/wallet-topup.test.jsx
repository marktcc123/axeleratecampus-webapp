import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import Wallet from '../../src/app/screens/Wallet.jsx';
import { topupCents } from '../../src/lib/wallet-topup.js';

const wrap = () => render(
  <ProfileProvider><WalletProvider><MemoryRouter><Wallet /></MemoryRouter></WalletProvider></ProfileProvider>,
);

test('a top-up is $5 to $500, in cents', () => {
  expect(topupCents(1).ok).toBe(false);
  expect(topupCents(5)).toMatchObject({ ok: true, cents: 500, amountUsd: 5 });
  expect(topupCents(500)).toMatchObject({ ok: true, cents: 50000, amountUsd: 500 });
  expect(topupCents(500.01).ok).toBe(false);
  expect(topupCents('12.34')).toMatchObject({ ok: true, cents: 1234, amountUsd: 12.34 });
});

test('add funds opens a card sheet and does not call checkout while the wallet is offline', async () => {
  const user = userEvent.setup();
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  wrap();
  await user.click(screen.getByRole('button', { name: 'Add funds' }));
  const sheet = screen.getByRole('dialog', { name: 'Add funds' });
  expect(within(sheet).getByRole('button', { name: 'Continue to card' })).toBeDisabled();
  await user.type(within(sheet).getByLabelText('Amount'), '10');
  await user.click(within(sheet).getByRole('button', { name: /Continue to card/ }));
  expect(within(sheet).getByRole('alert')).toHaveTextContent('Add funds needs the live wallet.');
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
