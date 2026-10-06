import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import ImageSlot from '../../src/app/ImageSlot.jsx';
import Icon from '../../src/components/Icon.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

afterEach(cleanup);

// Every route the app shell wraps. The gate (/) and /verify sit outside it.
const SHELL_ROUTES = [
  '/app/earn',
  '/app/earn/dermabell-campus-launch',
  '/app/discover',
  '/app/join',
  '/app/me',
  '/legal/terms',
  '/nope',
];

describe('Icon set prop', () => {
  test('outline is the default and solid pulls from icons-solid', () => {
    const { container: a } = render(<Icon name="rocket" />);
    expect(a.querySelector('i.ax-icon').style.getPropertyValue('--icon')).toMatch(/icons\/rocket/);
    const { container: b } = render(<Icon name="rocket" set="solid" />);
    expect(b.querySelector('i.ax-icon').style.getPropertyValue('--icon')).toMatch(/icons-solid\/rocket/);
  });
  test('throws a named error for an icon that is not in the set', () => {
    expect(() => render(<Icon name="definitely-not-an-icon" set="solid" />)).toThrow(/definitely-not-an-icon/);
  });
});

describe('ImageSlot', () => {
  test('renders its caption and is decorative to assistive tech', () => {
    const { container } = render(<ImageSlot label="Solra product shot" />);
    expect(screen.getByText('Solra product shot')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('app shell', () => {
  test('the tab bar has exactly the four designed tabs, in order', () => {
    at('/app');
    const bar = screen.getByRole('navigation', { name: 'App' });
    const labels = within(bar).getAllByRole('link').map((a) => a.textContent.trim());
    expect(labels).toEqual(['Home', 'Discover', 'Demand', 'Profile']);
  });

  test.each([
    ['/app', 'Home'],
    ['/app/discover', 'Discover'],
    ['/app/me/demand', 'Demand'],
    ['/app/me', 'Profile'],
  ])('%s marks %s as the current tab', (path, label) => {
    at(path);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  });


  test('the gate and the verification screen sit outside the shell', () => {
    for (const p of ['/', '/verify', '/login']) {
      const { unmount } = at(p);
      expect(screen.queryByRole('navigation', { name: 'App' }), `${p} should have no tab bar`).not.toBeInTheDocument();
      unmount();
    }
  });

  test('nested paths that previously doubled up on <main> render exactly one', () => {
    for (const p of ['/app/earn', '/nope', '/app/earn/no-such-mission']) {
      const { unmount } = at(p);
      expect(screen.getAllByRole('main')).toHaveLength(1);
      unmount();
    }
  });

  test('the shell drops the grid-paper ground', () => {
    const { container } = at('/app/earn');
    expect(container.querySelector('.app')).toBeInTheDocument();
    expect(container.querySelector('.ax-grid-paper')).toBeNull();
  });

  test('an unknown path renders not-found inside the app shell', () => {
    at('/nope');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/isn't here/);
    expect(screen.getByRole('navigation', { name: 'App' })).toBeInTheDocument();
  });
});

describe('the header row (owner, 2026-09-21)', () => {
  // Three things, and only three. Two came off on 2026-09-21: the flame that
  // opened the quest sheet from any tab, and the "How Axelerate Works" panel,
  // whose lightning was its only way in — its five steps are the four
  // onboarding screens' subject, and those run before the gate now.
  // The same row on every tab, Me included (owner, 2026-09-21). Me used to
  // swap its avatar for a Share button; Share moved down beside the public
  // profile link so that this row could be identical everywhere.
  test.each(['/app/earn', '/app/discover', '/app/unlock', '/app/me'])('carries updates and the account on %s, and no empty cart', (path) => {
    at(path);
    const bar = document.querySelector('.ah');
    const names = [...bar.querySelectorAll('a, button')].map((n) => n.getAttribute('aria-label'));
    // An empty bag is a store. It appears only once something is in the cart.
    expect(names).toEqual(['Updates', 'Account']);
  });

  // The avatar opens a drawer rather than going to Me (owner, 2026-09-21),
  // which is a tab anyway. It is a modal surface with a scrim, so a dialog,
  // and its rows are plain links.
  test('the avatar opens an account drawer: demand, then Settings and Log out', async () => {
    const user = userEvent.setup();
    at('/app/earn');
    expect(screen.queryByTestId('account-menu')).toBeNull();
    const avatar = screen.getByTestId('account');
    expect(avatar.tagName).toBe('BUTTON');
    expect(avatar).toHaveAttribute('aria-haspopup', 'dialog');
    expect(avatar).toHaveAttribute('aria-expanded', 'false');

    await user.click(avatar);
    expect(avatar).toHaveAttribute('aria-expanded', 'true');
    const drawer = screen.getByRole('dialog', { name: 'Account' });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    const rows = within(drawer).getAllByRole('link');
    // Two groups: what you come back to check, then the account. Every row
    // goes where Settings' own row for that screen goes.
    // Three groups: what you have, what you are building, then the account.
    // This is the whole of what used to sit below Me's wallet, so if a route
    // under /app/me loses its row here it has lost its only way in.
    // The next pass leads (owner, 2026-09-21) while the fixture has one still
    // to come as of today; it renders nothing otherwise.
    expect(rows.map((i) => [i.textContent, i.getAttribute('href')])).toEqual([
      ['My Demand', '/app/me/demand'],
      ['Respond as a brand', '/brands'],
      ['What is Axelerate', '/app/me/about'],
      ['Settings', '/app/me/profilesetting'],
      ['Log out', '/login'],
    ]);
    // One rule between each group.
    expect(within(drawer).getAllByRole('separator')).toHaveLength(2);
    // Share is the one row that acts rather than goes somewhere, so it is a
    // button among the links — in a group of its own, first (owner,
    // 2026-09-21). The share arrow as a line, like every other row's glyph:
    // the filled cut (share.svg, still on the detail pages' top bar) was the
    // one solid mark in the column.
    const share = within(drawer).getByRole('button', { name: 'Share profile' });
    expect(share).toHaveAttribute('data-testid', 'share-profile');
    const all = [...drawer.querySelectorAll('.ah__drawer-item')].map((n) => n.textContent);
    expect(all[0]).toBe('Share profile');
    expect(share.querySelector('.ah__drawer-icon').style.getPropertyValue('--icon')).toMatch(/share-line/);
    // Every menu row wears an icon, and a real one: Icon sets --icon on its
    // element. (The next pass's panel above them is a card, not a row.)
    for (const i of rows.filter((r) => r.classList.contains('ah__drawer-item'))) {
      const icon = i.querySelector('.ah__drawer-icon');
      expect(icon, i.textContent).not.toBeNull();
      expect(icon.style.getPropertyValue('--icon'), i.textContent).not.toBe('');
    }
    // Log out is the one row drawn as danger, and the last (owner, 2026-09-21).
    expect(rows.at(-1)).toHaveClass('ah__drawer-item--danger');
    expect(rows.filter((r) => r.classList.contains('ah__drawer-item--danger'))).toHaveLength(1);
    // Focus moved into it, so a keyboard is not left behind on the avatar.
    expect(rows[0]).toHaveFocus();
  });

  test('the drawer closes on Escape, on the scrim, and on going somewhere', async () => {
    const user = userEvent.setup();
    at('/app/earn');
    const avatar = screen.getByTestId('account');

    await user.click(avatar);
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('account-menu')).toBeNull();
    expect(avatar, 'Escape hands focus back to what opened it').toHaveFocus();

    await user.click(avatar);
    await user.click(screen.getByTestId('account-scrim'));
    expect(screen.queryByTestId('account-menu')).toBeNull();
    expect(avatar, 'so does the scrim').toHaveFocus();

    // Every row navigates, so a drawer left open would stand over the screen
    // it opened.
    await user.click(avatar);
    await user.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Settings' }));
    expect(screen.queryByTestId('account-menu')).toBeNull();
  });
});


describe('the bell opens demand updates', () => {
  test('names Updates and goes to My Demand while nothing is waiting', () => {
    render(<MemoryRouter initialEntries={['/app/me']}><App /></MemoryRouter>);
    const bell = screen.getByTestId('header-bell');
    expect(bell).toHaveAccessibleName('Updates');
    expect(bell).toHaveAttribute('href', '/app/me/demand');
    expect(bell.querySelector('.ah__bell-n')).toBeNull();
  });
});

describe('the tab bar stands down where a screen owns the bottom', () => {
  test('a product page has its buy bar and no tabs (owner, 2026-09-21)', () => {
    render(<MemoryRouter initialEntries={['/app/shop/p1']}><App /></MemoryRouter>);
    expect(screen.getByTestId('buy-bar')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'App' })).toBeNull();
    cleanup();
    render(<MemoryRouter initialEntries={['/app/shop']}><App /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'App' })).toBeInTheDocument();
  });
});

describe('the first-run ring on the avatar (owner, 2026-09-22)', () => {
  test('shows until the drawer is opened once, then stays gone for this browser', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MemoryRouter initialEntries={['/app/earn']}><App /></MemoryRouter>);
    const ring = screen.getByTestId('avatar-hint');
    expect(ring).toHaveAttribute('aria-hidden', 'true');   // a mark, not a control or a word
    expect(screen.getByTestId('account')).toContainElement(ring);
    // And a note under the disc that opens the drawer itself (owner, 2026-09-22).
    const note = screen.getByRole('button', { name: 'Tap for your menu' });
    await user.click(note);
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeInTheDocument();
    expect(screen.queryByTestId('avatar-hint')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tap for your menu' })).toBeNull();
    unmount();
    render(<MemoryRouter initialEntries={['/app/me']}><App /></MemoryRouter>);
    expect(screen.queryByTestId('avatar-hint')).toBeNull();
  });
});
