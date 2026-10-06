import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider, useWallet } from '../../src/app/wallet.jsx';
import Wallet from '../../src/app/screens/Wallet.jsx';

// A wallet checkout took $20 and 1,200 points (owner, 2026-09-22: the history
// shows credit spent as well as earned). Until now the row said −$20.00 and
// buried the points in its grey meta text.
function Spender() {
  const { spend } = useWallet();
  return <button type="button" onClick={() => spend({ cashUsd: 20, creditPts: 1200, title: 'Perks shop order' })}>spend</button>;
}

test('a wallet checkout writes the points it took onto its own row, not into the meta', async () => {
  const user = userEvent.setup();
  render(<ProfileProvider><WalletProvider><MemoryRouter><Spender /><Wallet /></MemoryRouter></WalletProvider></ProfileProvider>);
  await user.click(screen.getByRole('button', { name: 'spend' }));
  const row = screen.getAllByTestId('ledger-row')[0];   // the session group leads the ledger
  expect(within(row).getByText('−$20.00')).toBeInTheDocument();
  expect(within(row).getByText('−1,200 pts')).toBeInTheDocument();
  expect(row.textContent).not.toMatch(/credit/i);
});
