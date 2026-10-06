import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Wallet from '../../src/app/screens/Wallet.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import { ProfileProvider } from '../../src/app/profile.jsx';
import hub from '../../src/data/hub.example.json';

const wrap = (initial) => render(
  <ProfileProvider><WalletProvider initial={initial}><MemoryRouter><Wallet /></MemoryRouter></WalletProvider></ProfileProvider>,
);
const open = async (user) => { await user.click(screen.getByRole('button', { name: 'Withdraw' })); return screen.getByRole('dialog'); };

describe('cashing out', () => {
  test('opens on the full balance, standard and free, to the default method', async () => {
    const user = userEvent.setup();
    wrap();
    const d = await open(user);
    expect(within(d).getByRole('heading', { name: 'Cash out' })).toBeInTheDocument();
    expect(within(d).getByTestId('withdraw-amount')).toHaveValue('133');
    expect(within(d).getByTestId('speed-standard')).toHaveAttribute('aria-pressed', 'true');
    expect(within(d).getByTestId('withdraw-method')).toHaveAttribute('aria-pressed', 'true');
    expect(within(d).getByTestId('withdraw-method')).toHaveTextContent(`${hub.payout.method}`);
    expect(within(d).getByTestId('withdraw-summary')).toHaveTextContent('free');
    expect(within(d).getByTestId('withdraw-summary')).toHaveTextContent('$133.00');
  });

  test('instant shows the fee and what actually arrives', async () => {
    const user = userEvent.setup();
    wrap();
    const d = await open(user);
    await user.click(within(d).getByTestId('speed-instant'));
    expect(within(d).getByTestId('withdraw-summary')).toHaveTextContent('−$2.00');
    expect(within(d).getByTestId('withdraw-summary')).toHaveTextContent('$131.00');
    expect(within(d).getByRole('button', { name: /Withdraw \$131\.00/ })).toBeInTheDocument();
  });

  test('confirming takes the cash out and puts a pending row at the top of the history', async () => {
    const user = userEvent.setup();
    wrap();
    const d = await open(user);
    await user.clear(within(d).getByTestId('withdraw-amount'));
    await user.type(within(d).getByTestId('withdraw-amount'), '47');
    await user.click(within(d).getByRole('button', { name: /^Withdraw \$/ }));
    expect(within(d).getByRole('heading', { name: 'On its way' })).toBeInTheDocument();
    expect(within(d).getByTestId('withdraw-done')).toHaveTextContent('$47.00');
    expect(within(d).getByText(/Ref AX-W-/)).toBeInTheDocument();
    await user.click(within(d).getByRole('button', { name: 'Done' }));
    expect(screen.getByTestId('wallet-cash')).toHaveTextContent('$86');
    const rows = screen.getAllByTestId('ledger-row');
    expect(rows[0]).toHaveAttribute('data-pending', 'true');
    expect(rows[0]).toHaveTextContent('Withdrawal to Venmo');
    expect(rows[0]).toHaveTextContent('−$47.00');
    expect(rows[0]).toHaveTextContent('pending');
  });

  test('under the minimum, the button stays and says how far off (R8)', () => {
    wrap({ cashUsd: 6 });
    const b = screen.getByRole('button', { name: /Withdraw · \$4 to go/ });
    expect(b).toBeDisabled();
  });

  test('over the amount held, or under the minimum, the sheet says so and will not confirm', async () => {
    const user = userEvent.setup();
    wrap();
    const d = await open(user);
    await user.clear(within(d).getByTestId('withdraw-amount'));
    await user.type(within(d).getByTestId('withdraw-amount'), '500');
    expect(within(d).getByText('You have $133 in cash.')).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: 'Withdraw' })).toBeDisabled();
    await user.clear(within(d).getByTestId('withdraw-amount'));
    await user.type(within(d).getByTestId('withdraw-amount'), '4');
    expect(within(d).getByText('The minimum is $10.')).toBeInTheDocument();
  });

  test('a first payout asks for a legal name; the fixture has paid out before, so it does not', async () => {
    const user = userEvent.setup();
    wrap();
    expect(within(await open(user)).queryByTestId('withdraw-legal-name')).toBeNull();
  });

  test('a first-ever payout will not go without the legal name', async () => {
    const user = userEvent.setup();
    const noWithdrawals = hub.ledger.map((g) => ({ ...g, rows: g.rows.filter((r) => r.usd > 0) }));
    wrap({ ledger: noWithdrawals });
    const d = await open(user);
    await user.click(within(d).getByRole('button', { name: /^Withdraw \$/ }));
    expect(within(d).getByText('Your legal name, as your bank has it.')).toBeInTheDocument();
    expect(within(d).queryByRole('heading', { name: 'On its way' })).toBeNull();
    await user.type(within(d).getByTestId('withdraw-legal-name'), 'Mark Tao');
    await user.click(within(d).getByRole('button', { name: /^Withdraw \$/ }));
    expect(within(d).getByRole('heading', { name: 'On its way' })).toBeInTheDocument();
  });

  test('a W-9 upload reminder sits on the wallet, and cash-out still opens', async () => {
    const user = userEvent.setup();
    wrap({ annualUsd: 700, cashUsd: 680 });
    expect(screen.getByTestId('w9-upload')).toHaveTextContent('Upload a W-9 for your 1099.');
    expect(screen.getByTestId('w9-upload')).toHaveTextContent('Upload');
    const d = await open(user);
    expect(within(d).getByTestId('withdraw-w9')).toBeInTheDocument();
    expect(within(d).getByRole('button', { name: /^Withdraw/ })).toBeDisabled();
  });

  test('a W-9 already on file waits to be checked', () => {
    wrap({ annualUsd: 700, w9Submitted: true, cashUsd: 680 });
    expect(screen.getByTestId('w9-pending')).toHaveTextContent(/waiting/i);
    expect(screen.getByTestId('w9-upload')).toHaveTextContent('Replace');
  });

  test('between $500 and $600 it warns, and a request that crosses $600 stops', async () => {
    const user = userEvent.setup();
    wrap({ annualUsd: 520, cashUsd: 133 });
    expect(screen.getByTestId('w9-warning')).toHaveTextContent('$520');
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeEnabled();
    const d = await open(user);
    expect(within(d).getByTestId('withdraw-w9')).toHaveTextContent('$653');
    expect(within(d).getByRole('link', { name: /What that means/ })).toHaveAttribute('href', '/legal/payouts');
    expect(within(d).getByRole('button', { name: /^Withdraw/ })).toBeDisabled();
  });

  test('a new destination can be added and becomes the one selected', async () => {
    const user = userEvent.setup();
    wrap();
    const d = await open(user);
    await user.click(within(d).getByRole('button', { name: /Add another/ }));
    await user.click(within(d).getByRole('button', { name: 'Bank' }));
    await user.type(within(d).getByTestId('withdraw-new-detail'), '•••• 4471');
    await user.click(within(d).getByRole('button', { name: 'Save' }));
    const methods = within(d).getAllByTestId('withdraw-method');
    expect(methods).toHaveLength(2);
    expect(methods[1]).toHaveAttribute('aria-pressed', 'true');
    expect(methods[1]).toHaveTextContent('Bank');
  });
});
