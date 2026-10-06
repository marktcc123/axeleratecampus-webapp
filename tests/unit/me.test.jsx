import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import Me from '../../src/app/screens/Me.jsx';
import Settings from '../../src/app/screens/Settings.jsx';
import { AddressProvider } from '../../src/app/address.jsx';
import { DemandProvider } from '../../src/app/demand.jsx';

const wrap = () => render(
  <DemandProvider>
    <ProfileProvider><WalletProvider><MemoryRouter><Me /></MemoryRouter></WalletProvider></ProfileProvider>
  </DemandProvider>,
);

const wrapSettings = () => render(
  <ProfileProvider><WalletProvider><MemoryRouter><AddressProvider><Settings /></AddressProvider></MemoryRouter></WalletProvider></ProfileProvider>,
);

describe('Me — demand hub', () => {
  test('identifies the person without naming a fixture student', () => {
    wrap();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your name');
    expect(document.body.textContent).not.toMatch(/Jinyue|Cornell Tech|@jinyuew/);
    expect(screen.getByTestId('view-public')).toHaveAttribute('href', '/u/yourname');
    expect(screen.getByTestId('view-public').closest('.hub__id')).not.toBeNull();
  });

  test('three figures are demand, matches and scouted — not missions or XP', () => {
    wrap();
    const stats = screen.getByTestId('me-stats');
    expect(within(stats).getByText('Demand')).toBeInTheDocument();
    expect(within(stats).getByText('Matches')).toBeInTheDocument();
    expect(within(stats).getByText('Scouted')).toBeInTheDocument();
    expect(within(stats).queryByText('Missions')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\bXP\b/);
  });

  test('the push opens a demand, not the earn board', () => {
    wrap();
    expect(screen.getByTestId('me-push')).toHaveAttribute('href', '/app/demand/new');
  });

  test('no shortcuts, menu rows, footer or Log out — those are the drawer\'s', () => {
    wrap();
    expect(screen.queryByRole('navigation', { name: 'Shortcuts' })).toBeNull();
    for (const name of ['Orders', 'Tickets', 'Invite friends', 'Settings']) expect(screen.queryByRole('link', { name })).toBeNull();
    expect(screen.queryAllByTestId('hub-item')).toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'Log out' })).toBeNull();
  });

  test('sections read demand first', () => {
    wrap();
    const hs = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(hs).toEqual(['My Demand', 'My Matches', 'Purchases']);
  });

  test('promises no extra pay for climbing (R7)', () => {
    wrap();
    expect(document.body.textContent).not.toMatch(/earn more|higher pay|more pay|pay multiplier/i);
  });

  test('renders no emoji', () => {
    wrap();
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('Settings', () => {
  test('keeps the legal links reachable, and carries no second Log out', () => {
    wrapSettings();
    const footer = screen.getByRole('navigation', { name: 'Legal' });
    expect(within(footer).getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/legal/terms');
    expect(within(footer).getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/legal/privacy');
    expect(screen.queryByRole('link', { name: 'Log out' })).toBeNull();
    expect(within(footer).queryByRole('link', { name: 'Payouts' })).toBeNull();
    expect(screen.queryAllByTestId('hub-item')).toHaveLength(0);
  });
});

describe('the photo on Me', () => {
  test('is display only — changing it lives in Settings', () => {
    wrap();
    expect(screen.getByTestId('me-avatar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Change photo')).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByText(/^Change/)).toBeNull();
  });
});
