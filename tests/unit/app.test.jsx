import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { handleFor } from '../../src/app/profile.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('App routing', () => {
  // A first visit to / is sent to the intro (owner, 2026-09-21); after that /
  // is the gate. Neither is the board: walking straight into the app is what
  // this route has never done, whatever sits on it.
  test('/ sends a first visit to the intro, and is the gate after that', () => {
    at('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tell us what you want.');
    expect(screen.queryByRole('heading', { name: 'Missions' })).not.toBeInTheDocument();
    cleanup();
    at('/');
    expect(screen.getByRole('link', { name: 'Join the squad' })).toHaveAttribute('href', '/verify');
    expect(screen.queryByRole('heading', { name: 'Missions' })).not.toBeInTheDocument();
  });

  // The intro has its own address, the demo's, and it answers there whether or
  // not it has been seen — that is how anyone comes back to it on purpose.
  test('/onboarding is always the intro', () => {
    at('/');          // seen once
    cleanup();
    at('/onboarding');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tell us what you want.');
  });

  // The public card at /u/<handle> is the outside view of this session, not an
  // editable copy of Me. Reached by the URL Share hands out — the link to it on
  // Me came off on 2026-09-21 — so this walks straight to the placeholder's
  // handle, which is what a shared link carries before sign-up.
  test('the public card is the outside view, with none of the app around it', () => {
    at(`/u/${handleFor('Your name')}`);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // No hub menu, no tab bar: this is a page anyone can open.
    expect(screen.queryByTestId('hub-item')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'App' })).toBeNull();
  });

  test('/verify is the verification screen, outside the app shell', () => {
    at('/verify');
    expect(screen.getByRole('heading', { name: 'Sign up' })).toBeInTheDocument();
    // Still "Get verified": this is the verification form's own submit
    // button, not the entry CTA. The gate says "Join the squad"; the button
    // that actually submits the form says what it does.
    expect(screen.getByRole('button', { name: /Get verified/ })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'App' })).not.toBeInTheDocument();
  });

  test('/gigs is the board, inside the app shell', () => {
    at('/app/earn');
    expect(screen.getByRole('heading', { name: 'Missions' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'App' })).toBeInTheDocument();
  });

  test.each([
    ['/app/discover', 'Discover'],
    ['/app', 'What do you want next?'],
    ['/app/me/missions', 'Mission tracker'],
    ['/app/me', 'Your name'],
    // Me's eight sub-screens, all nested under it rather than promoted to tabs.
    ['/app/me/levels', 'Levels'],
    ['/app/me/wallet', 'My wallet'],
    ['/app/me/orders', 'My orders'],
    ['/app/me/syndicate', 'Syndicate'],
    ['/app/me/co-creations', 'Co-creations'],
    ['/app/me/tickets', 'My tickets'],
    // The old address and an old pass link both land on the new ones (owner, 2026-09-21).
    ['/app/me/events', 'My tickets'],
    ['/app/me/events/ev6', 'Your ticket'],
    ['/app/me/invite', 'Invite friends'],
    ['/app/me/career', 'Axelerate career'],
    ['/app/me/profilesetting', 'Profile setting'],
    ['/app/me/about', 'What is Axelerate'],
    ['/app/earn/brands/notely', 'Notely'],
  ])('%s renders inside the app shell', (path, heading) => {
    at(path);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading);
    expect(screen.getByRole('navigation', { name: 'App' })).toBeInTheDocument();
  });

  // Not in the list above: this screen's own apply bar takes the tab bar's
  // place, the way the product page's buy bar does. It is still inside the
  // shell — one <main>, the shell's column — it just owns the bottom.
  test('a mission page renders in the shell and owns the bottom bar', () => {
    at('/app/earn/dermabell-campus-launch');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dermabell salon ambassador');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('navigation', { name: 'App' })).not.toBeInTheDocument();
    expect(screen.getByTestId('apply-bar')).toBeInTheDocument();
  });

  test.each([['terms', 'Terms of service'], ['privacy', 'Privacy'], ['payouts', 'Payout terms']])(
    '/legal/%s', (kind, title) => {
      at(`/legal/${kind}`);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    }
  );

  test('an unknown path renders the 404', () => {
    at('/nope');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/isn't here/);
  });

  test('every route has exactly one main landmark', () => {
    // The list is the invariant: every route this app answers, including the
    // ones that render a 404. It went stale twice — /user/nobody rendered zero
    // <main> landmarks for a whole branch because neither /user route was here.
    for (const p of ['/', '/verify', '/login', '/app', '/app/earn', '/app/earn/dermabell-campus-launch', '/app/discover',
                     '/app/join', '/app/me', '/legal/terms', '/nope', '/app/earn/no-such-mission',
                     '/u/marktao', '/u/nobody', '/user/marktao',
                     '/app/earn/events/ev1', '/app/earn/events/nope', '/app/demand/korean-sunscreen-25', '/merchant']) {
      const { unmount } = at(p);
      expect(screen.getAllByRole('main'), `${p} should have one main`).toHaveLength(1);
      unmount();
    }
  });
});

describe('a brand page (owner, 2026-09-09)', () => {
  test('lists the brand\'s missions and products, and a wrong slug is a 404', () => {
    at('/app/earn/brands/notely');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Notely');
    // Two missions since 2026-09-21 (the study-hall photo set joined the chalk crew).
    expect(screen.getByText('2 missions · 1 product')).toBeInTheDocument();
    expect(screen.getAllByTestId('brand-mission').map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/app/earn/notely-chalk-the-quad', '/app/earn/notely-study-hall-photo-set']),
    );
    expect(screen.getByTestId('brand-product')).toHaveAttribute('href', '/app/shop/p1');
    expect(screen.getByRole('link', { name: /Brand site/ })).toHaveAttribute('href', 'https://notely.example/');
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/app/earn');
    cleanup();
    at('/app/earn/brands/nobody-here');
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('Notely');
  });
});
