import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import Wallet from '../../src/app/screens/Wallet.jsx';
import Orders from '../../src/app/screens/Orders.jsx';
import Syndicate from '../../src/app/screens/Syndicate.jsx';
import CoCreations from '../../src/app/screens/CoCreations.jsx';
import Events from '../../src/app/screens/Events.jsx';
import Invite from '../../src/app/screens/Invite.jsx';
import Career from '../../src/app/screens/Career.jsx';
import Settings from '../../src/app/screens/Settings.jsx';
import hub from '../../src/data/hub.example.json';
import people from '../../src/data/people.example.json';
import applications from '../../src/data/applications.example.json';
// The catalogue as a screen sees it: the fixtures with the brand's name joined
// in from the brands table. The raw JSON carries `brandId` and no display name.
import { FIXTURES as shop } from '../../src/app/content.jsx';
import { ME } from '../../src/app/me.js';
import { ReviewsProvider } from '../../src/app/reviews.jsx';
import { AddressProvider } from '../../src/app/address.jsx';
import { readFileSync } from 'node:fs';

// Orders now reads useReviews() to decide whether a row offers "Write a
// review", so every screen in SCREENS needs the provider above it the way
// they would get it for free from App.jsx's CartRoot in the real app.
// Harmless for the other seven, which never call the hook.
const wrap = (ui) => render(
  <ProfileProvider><WalletProvider><MemoryRouter><ReviewsProvider><AddressProvider>{ui}</AddressProvider></ReviewsProvider></MemoryRouter></WalletProvider></ProfileProvider>,
);

const SCREENS = [
  ['Wallet', Wallet, 'My wallet'],
  ['Orders', Orders, 'My orders'],
  ['Syndicate', Syndicate, 'Syndicate'],
  ['CoCreations', CoCreations, 'Co-creations'],
  ['Events', Events, 'My tickets'],
  ['Invite', Invite, 'Invite friends'],
  // The h1 is the Me row's own label, as on every other sub-screen. It was
  // "Secure the bag" — the owner's masthead line — while this screen drew its
  // own centred header; that line is the handwritten note now.
  ['Career', Career, 'Axelerate career'],
  ['Settings', Settings, 'Profile setting'],
];

describe('every Me sub-screen', () => {
  test.each(SCREENS)('%s wears the shell: one h1 and a way back', (_n, C, title) => {
    wrap(<C />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(title);
    // Settings wears the compact header (owner, 2026-09-21): the same back
    // control, on one row with the title, and named plainly — the owner did not
    // want the page to feel like somewhere you went back from.
    const label = C === Settings ? 'Back' : 'Back to me';
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', '/app/me');
  });

  test('co-creations show the examples and say to stay tuned', () => {
    wrap(<CoCreations />);
    expect(screen.getByRole('status')).toHaveTextContent('Stay tuned. These are examples.');
    expect(screen.getByText('Solra — name the summer flavor')).toBeInTheDocument();
    expect(screen.getByText('Notely — design the sticker pack')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cast your vote' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit art' })).toBeDisabled();
  });

  test('Settings puts its title on the back row, centred, with no kicker', () => {
    wrap(<Settings />);
    expect(document.querySelector('.sub--compact')).not.toBeNull();
    expect(screen.queryByText('Me')).toBeNull();
    const bar = document.querySelector('.sub__bar');
    expect(bar.querySelector('h1')).not.toBeNull();
    expect(bar.querySelector('a')).toHaveAttribute('aria-label', 'Back');
  });

  test('delete account asks first and cancel leaves the account', async () => {
    const user = userEvent.setup();
    wrap(<Settings />);
    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('It cannot be undone.');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test.each(SCREENS)('%s names no real person and no real handle', (_n, C) => {
    wrap(<C />);
    expect(document.body.textContent).not.toMatch(/Jinyue|@jinyuew|jw2450|Cornell Tech|JINYUE-24/);
  });

  test.each(SCREENS)('%s renders no emoji', (_n, C) => {
    wrap(<C />);
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('Wallet', () => {
  test('shows cash, and credit with its shop value (R1)', () => {
    wrap(<Wallet />);
    expect(screen.getByText('$133')).toBeInTheDocument();
    expect(screen.getByText(/2,400/)).toBeInTheDocument();
    // The "$24 in shop" aside under Credits came off on 2026-09-08 (owner);
    // R1 is overridden on this screen, as on the shop card and the cart.
    expect(screen.queryByText(/\$24 in shop/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });

  test('the ledger groups by month and signs withdrawals as money out', () => {
    wrap(<Wallet />);
    const rows = screen.getAllByTestId('ledger-row');
    expect(rows).toHaveLength(hub.ledger.flatMap((g) => g.rows).length);
    for (const g of hub.ledger) {
      expect(screen.getByRole('heading', { name: g.month })).toBeInTheDocument();
    }
    // A minus sign, not a bare number, on the withdrawal.
    expect(screen.getByText(/−\$50/)).toBeInTheDocument();
    expect(screen.getByText('+$40.00')).toBeInTheDocument();
  });

  const rowOf = (title) => screen.getAllByTestId('ledger-row').find((r) => r.textContent.includes(title));

  test('XP rides along with a payout but never replaces the cash figure', () => {
    wrap(<Wallet />);
    // By title, not position: the fixture's newest row is a shop order now.
    const row = rowOf('Vera — Friday pop-up');
    expect(within(row).getByText('+$40.00')).toBeInTheDocument();
    expect(within(row).getByText('+120 XP')).toBeInTheDocument();
  });

  test('credit moves show in the history too (owner, 2026-09-22): points ride under a cash figure, or take its place', () => {
    wrap(<Wallet />);
    // A payout that also earned the mission's points: cash first, points under it.
    const solra = rowOf('Solra — unboxing reel');
    expect(within(solra).getByText('+$25.00')).toBeInTheDocument();
    expect(within(solra).getByText('+500 pts')).toBeInTheDocument();
    // Cashback landing moves points alone: they take the figure slot, no dollar figure.
    const cashback = rowOf('cashback landed');
    expect(within(cashback).getByText('+141 pts')).toBeInTheDocument();
    expect(cashback.textContent).not.toMatch(/\$/);
    // An order paid from both balances moves both, both signed as out.
    const order = rowOf('Five Minute Journal');
    expect(within(order).getByText('−$20.00')).toBeInTheDocument();
    expect(within(order).getByText('−1,200 pts')).toBeInTheDocument();
  });
});

describe('Orders', () => {
  test('each order carries brand, title, date and a status', () => {
    wrap(<Orders />);
    const rows = screen.getAllByTestId('order-row');
    expect(rows).toHaveLength(hub.orders.length);
    for (const o of hub.orders) {
      expect(screen.getByText(o.name)).toBeInTheDocument();
      expect(rows.some((r) => r.dataset.status === o.status)).toBe(true);
    }
  });

  test('carries no cashback lede and no status tabs — every order in one list (owner, 2026-09-09)', () => {
    wrap(<Orders />);
    expect(screen.queryByText(/10% credit/)).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getAllByTestId('order-row')).toHaveLength(hub.orders.length);
    for (const o of hub.orders) expect(screen.getByText(o.name)).toBeInTheDocument();
  });

  test('prices align as a column — cents whether they have them or not', () => {
    wrap(<Orders />);
    expect(screen.getByText('$32.00')).toBeInTheDocument();
    expect(screen.getByText('$14.09')).toBeInTheDocument();
  });

  test('each row opens its receipt', () => {
    wrap(<Orders />);
    const rows = screen.getAllByTestId('order-row');
    for (const [i, o] of hub.orders.entries()) {
      expect(rows[i]).toHaveAttribute('href', `/app/me/orders/${o.id}`);
    }
  });
});

describe('Orders — writing a review', () => {
  const delivered = hub.orders.filter((o) => o.status === 'delivered');
  const shipped = hub.orders.filter((o) => o.status === 'shipped');
  const rowFor = (o) =>
    screen.getAllByTestId('order-row').find((r) => r.dataset.status === o.status);

  test('a delivered order offers the control', () => {
    wrap(<Orders />);
    expect(delivered.length, 'the fixture needs a delivered order').toBeGreaterThan(0);
    for (const o of delivered) {
      const row = rowFor(o);
      expect(row, o.id).toBeTruthy();
      expect(within(row.parentElement).getByRole('button', { name: 'Write a review' })).toBeInTheDocument();
    }
  });

  // The rule narrowed on 2026-09-03: shipped means it is still in a van, and a
  // review is about the thing in your hands. This is the counter-example the
  // fixture now carries, which the old shipped-or-delivered version could not.
  test('an order that has only shipped does not', () => {
    wrap(<Orders />);
    expect(shipped.length, 'the fixture needs a shipped order').toBeGreaterThan(0);
    for (const o of shipped) {
      const row = rowFor(o);
      expect(within(row.parentElement).queryByRole('button', { name: 'Write a review' })).toBeNull();
    }
  });

  // One status, one colour. The fixture used to write the tone down per order
  // and had given its two shipped rows different ones.
  test('the same status wears the same badge on every row', () => {
    const { container } = wrap(<Orders />);
    const byStatus = new Map();
    for (const row of container.querySelectorAll('[data-testid="order-row"]')) {
      const badge = row.querySelector('[class*="ax-badge"]');
      const seen = byStatus.get(row.dataset.status);
      if (seen) expect(badge.className, row.dataset.status).toBe(seen);
      else byStatus.set(row.dataset.status, badge.className);
    }
    expect(byStatus.size, 'more than one status on screen to compare').toBeGreaterThan(1);
  });

  test('an order already reviewed this session stops offering', async () => {
    const user = userEvent.setup();
    wrap(<Orders />);
    const target = delivered[0];
    const row = () => rowFor(target);
    await user.click(within(row().parentElement).getByRole('button', { name: 'Write a review' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: /4/ }));
    await user.click(within(dialog).getByRole('button', { name: /post|submit|share/i }));
    expect(within(row().parentElement).queryByRole('button', { name: 'Write a review' })).toBeNull();
  });

  test('opens the sheet for that order\'s own product, not another one', async () => {
    const user = userEvent.setup();
    wrap(<Orders />);
    const target = delivered[0];
    const product = shop.products.find((p) => p.id === target.productId);
    const row = rowFor(target);
    await user.click(within(row.parentElement).getByRole('button', { name: 'Write a review' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(product.title)).toBeInTheDocument();
    expect(within(dialog).getByText(product.brand)).toBeInTheDocument();
  });

  test('the whole-row link is a plain anchor — the review control sits outside it', () => {
    wrap(<Orders />);
    const row = rowFor(delivered[0]);
    const button = within(row.parentElement).getByRole('button', { name: 'Write a review' });
    expect(button.closest('a')).toBeNull();
  });
});

describe('Syndicate', () => {
  test('states the distance rather than only that it is shut (R8)', () => {
    wrap(<Syndicate />);
    const away = hub.syndicate.needXp - ME.xp;
    expect(screen.getByText(`${away.toLocaleString('en-US')} XP to go`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${ME.xp.toLocaleString('en-US')} / `))).toBeInTheDocument();
  });

  test('lists what it unlocks, and none of it is a higher rate (R7)', () => {
    wrap(<Syndicate />);
    expect(screen.getAllByTestId('unlock-row')).toHaveLength(hub.syndicate.unlocks.length);
    expect(document.body.textContent).not.toMatch(/higher pay|pay multiplier|earn more per/i);
  });
});

describe('Events', () => {
  test('splits coming up from past and keeps a date block on each', () => {
    wrap(<Events />);
    const rows = screen.getAllByTestId('event-row');
    expect(rows).toHaveLength(hub.events.length);
    expect(rows.filter((r) => r.dataset.past === 'true')).toHaveLength(
      hub.events.filter((e) => e.past).length
    );
    expect(screen.getByRole('heading', { name: 'Coming up' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Past' })).toBeInTheDocument();
  });
});

describe('Invite', () => {
  test('shows a placeholder code and the three steps', () => {
    wrap(<Invite />);
    expect(screen.getByText(hub.invite.code)).toBeInTheDocument();
    for (const s of hub.invite.steps) expect(screen.getByText(s)).toBeInTheDocument();
    // The tally went the way its two captions did, at the owner's request:
    // first "N of M codes used" and the names of who is in, then on
    // 2026-09-02 the marks themselves — three violet strokes with nothing to
    // label them read as a stray rule under the steps.
    expect(screen.queryByText(/codes used/)).toBeNull();
    expect(screen.queryByText(/are in/)).toBeNull();
    expect(document.querySelector('.inv__tally')).toBeNull();
    // The count that survives is the one with words on it.
    expect(screen.queryByText(/codes a semester/)).toBeNull();   // came off 2026-09-08
  });

  test('copy only claims success when the clipboard actually took it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    // navigator.clipboard is getter-only in jsdom, so assignment throws.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    wrap(<Invite />);
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith(hub.invite.code);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  test('a rejected clipboard leaves the label alone rather than lying', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('no')) }, configurable: true,
    });
    wrap(<Invite />);
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument();
  });

  test('share writes the join link, not the bare code', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    // No navigator.share in jsdom, which is the fallback path: the clipboard.
    expect(navigator.share).toBeUndefined();
    wrap(<Invite />);
    await user.click(screen.getByRole('button', { name: 'Share link' }));
    const [written] = writeText.mock.calls.at(-1);
    expect(written).toContain(`ref=${hub.invite.code}`);
    expect(written).not.toBe(hub.invite.code);
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    // And the two buttons are independent: sharing does not flip Copy code.
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  test('earnings count the friends who cleared a mission, in R1 form', () => {
    wrap(<Invite />);
    const { friends, perInviteCredits, used, total } = hub.invite;
    // A friend who has joined but not cleared their first mission has paid
    // nothing yet, so counting `used` here would overstate the balance.
    const paid = friends.filter((f) => f.status === 'earned').length;
    expect(paid).toBeLessThan(friends.length);
    // The figure alone since 2026-09-09 (owner): no "$N in shop", no "from N of M who used it".
    expect(screen.getByText(`${(paid * perInviteCredits).toLocaleString('en-US')} credit`)).toBeInTheDocument();
    expect(screen.queryByText(/in shop/)).toBeNull();
    expect(screen.queryByText(/from \d+ of \d+ who used it/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Who used it' })).toBeInTheDocument();
    expect(screen.queryByText(/One code, once/)).toBeNull();
    // The fixture writes the count down twice; this is what holds them equal.
    expect(used).toBe(friends.length);
    expect(used).toBeLessThanOrEqual(total);
  });

  test('names everyone who used it, and marks the ones still pending', () => {
    wrap(<Invite />);
    const rows = screen.getAllByTestId('invite-friend');
    expect(rows).toHaveLength(hub.invite.friends.length);
    for (const [i, f] of hub.invite.friends.entries()) {
      const person = people.find((x) => x.handle === f.handle);
      expect(person, `${f.handle} is not in people.example.json`).toBeTruthy();
      expect(rows[i]).toHaveTextContent(person.name);
      expect(rows[i]).toHaveTextContent(
        f.status === 'earned' ? `+${hub.invite.perInviteCredits} credit` : 'pending',
      );
    }
  });

  test('a friend\'s code can be entered, and your own is refused', async () => {
    const user = userEvent.setup();
    wrap(<Invite />);
    const field = screen.getByLabelText(/friend/i);
    const go = screen.getByRole('button', { name: 'Apply' });
    // Nothing typed, nothing to submit.
    expect(go).toBeDisabled();

    await user.type(field, hub.invite.code.toLowerCase());
    expect(go).toBeEnabled();
    await user.click(go);
    expect(screen.getByText(/your own code/i)).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, 'FRIEND-24');
    await user.click(go);
    // Session only, and it says so — the promise the apply sheet and the seat
    // CTA both make.
    expect(screen.getByText(/Nothing was sent/)).toBeInTheDocument();
  });
});

describe('Career', () => {
  test('the run rate is derived from paid gigs, never stored', () => {
    wrap(<Career />);
    // Written down once. `roles` — the three job rows this screen used to
    // render — is gone from the fixture with the screen that read it, and the
    // count comes from the applications that actually paid.
    expect(hub.roles).toBeUndefined();
    const done = applications.filter((a) => a.status === 'paid').length;
    expect(done).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent(`${done}/${hub.career.proofAt} gigs`);
    // Dots, not a bar (the design system forbids solid progress bars): one
    // dot per gig on the proof's own row, filled up to the count.
    const [first] = screen.getAllByTestId('reward');
    const dots = first.querySelectorAll('.ax-hatch__d');
    expect(dots).toHaveLength(hub.career.proofAt);
    expect(first.querySelectorAll('.ax-hatch__d[data-on]')).toHaveLength(done);
    expect(first.querySelector('.crr__meter')).toBeNull();
  });

  test('the platform proof is locked until the target, and says by how much', () => {
    wrap(<Career />);
    const done = applications.filter((a) => a.status === 'paid').length;
    const left = hub.career.proofAt - done;
    expect(left).toBeGreaterThan(0);
    // The deck's first card. The proof's title also appears in the run-rate
    // note above it, in bold, which is why this is not a text lookup.
    const [card] = screen.getAllByTestId('reward');
    expect(card).toHaveTextContent(hub.career.proof.title);
    expect(card).toHaveAttribute('data-locked', 'true');
    expect(card).toHaveTextContent(`${left} more gig${left === 1 ? '' : 's'} to unlock`);
  });

  test('every brand lane carries both rewards and its own distance', () => {
    wrap(<Career />);
    const { brands, laneRewards, laneAt } = hub.career;
    // One deck card for the platform proof, then two per brand.
    expect(screen.getAllByTestId('reward')).toHaveLength(1 + brands.length * laneRewards.length);
    for (const b of brands) {
      const lane = screen.getByRole('heading', { name: b.name }).closest('section');
      expect(within(lane).getByText(`${b.finished}/${laneAt} finished`)).toBeInTheDocument();
      const cards = within(lane).getAllByTestId('reward');
      expect(cards).toHaveLength(laneRewards.length);
      const left = laneAt - b.finished;
      for (const [i, r] of laneRewards.entries()) expect(cards[i]).toHaveTextContent(r.title);
      // The distance once per lane (owner, 2026-09-09: fewer words) — both rewards open at the same gig.
      // The distance shares its line with what counts ("· Any paid mission with this brand counts.").
      expect(within(lane).getAllByText(new RegExp(`^${left} more gig${left === 1 ? '' : 's'} to unlock`))).toHaveLength(1);
      expect(lane.querySelectorAll('.ax-hatch__d')).toHaveLength(laneAt);
    }
    // Two brands at different distances, so the copy cannot be one shared
    // string that happens to read right.
    expect(new Set(brands.map((b) => b.finished)).size).toBeGreaterThan(1);
  });

  // Career was the app's one dark screen until 2026-09-03, built to the owner's
  // reference in 5bf496c and reverted because it was the only screen in Me that
  // stepped outside the app's own surfaces. jsdom does no CSS, so this reads the
  // stylesheet: it pins the reversal rather than the pixels, and would catch the
  // dark ground coming back by accident (a revert, a merge) instead of on
  // purpose. The AA of the light palette is the e2e sweep's job, not this test's.
  test('the career screen paints no dark ground of its own', () => {
    const css = readFileSync('src/app/screens/career.css', 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    expect(css).not.toMatch(/background:\s*var\(--ink-900\)/);
    expect(css).not.toMatch(/\.crr::before/);
    // And the accents that only worked on ink are gone with it: coral measures
    // 3.45:1 on white and accent-yellow ~1.6:1, both AA failures as text.
    expect(css).not.toMatch(/color:\s*var\(--accent-coral\)/);
    expect(css).not.toMatch(/color:\s*var\(--accent-yellow\)/);
    expect(wrap(<Career />).container.querySelector('.crr__rate')).toBeInTheDocument();
  });
});

describe('Settings', () => {
  test('shows the account rows as placeholders', () => {
    wrap(<Settings />);
    expect(screen.getAllByTestId('account-row')).toHaveLength(hub.settings.account.length);
    expect(screen.getByText('you@campus.edu')).toBeInTheDocument();
  });

  // Notifications came off this screen on 2026-09-03 and the shipping address
  // took its place: the shop sends real merch, and there is no checkout to ask
  // for an address in.
  test('the address fields are labelled, and State and ZIP share a row', () => {
    const { container } = wrap(<Settings />);
    expect(screen.queryByText('Notifications')).toBeNull();
    for (const label of ['Street address', 'Apt / room', 'City', 'State', 'ZIP']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    // The two that pair are the only ones that do not span the grid. The class
    // is .addr__half, not .set__addr-half: the form moved to parts/AddressFields
    // when checkout started drawing the same one.
    expect(container.querySelectorAll('.addr__half')).toHaveLength(2);
  });

  test('Save appears only once the address changes, and stores nothing', async () => {
    const user = userEvent.setup();
    wrap(<Settings />);
    // An untouched form shows no Save — a full-width button under a form
    // nobody has touched reads as the screen's main action.
    expect(screen.queryByRole('button', { name: /save address/i })).toBeNull();
    await user.type(screen.getByLabelText('City'), 'Providence');
    const save = screen.getByRole('button', { name: /save address/i });
    await user.click(save);
    // Saved means "this screen agrees with itself again", not persisted: the
    // fixture is untouched and lib/join.js stays the only backend seam.
    expect(screen.queryByRole('button', { name: /save address/i })).toBeNull();
    expect(hub.settings.address.city).toBe('');
  });

  test('keeps ax-icon when a caller passes its own class', async () => {
    // Icon used to hardcode className="ax-icon" and then spread ...rest, so a
    // caller's className replaced the mask utility and the icon rendered as
    // nothing at all. That is how the whole Me menu lost its icons.
    const { default: Icon } = await import('../../src/components/Icon.jsx');
    const { container } = render(<Icon name="bag" set="solid" className="mine" />);
    const i = container.firstChild;
    expect(i).toHaveClass('ax-icon');
    expect(i).toHaveClass('mine');
    expect(i.style.getPropertyValue('--icon')).toMatch(/^url\(/);
  });
});

describe('Settings, after payouts moved into the wallet', () => {
  test('carries no payout section; the page itself is Profile setting, said once', () => {
    wrap(<Settings />);
    expect(screen.queryByText('Payouts')).toBeNull();
    expect(screen.queryByText(new RegExp(hub.payout.handle))).toBeNull();
    expect(screen.getAllByRole('heading', { name: 'Profile setting' })).toHaveLength(1);   // the title, no repeating label
  });
});

describe('Settings — the photo', () => {
  test('is changed here: the disc is a file control with a camera badge, and a picked image shows at once', async () => {
    URL.createObjectURL ??= () => 'blob:settings'; URL.revokeObjectURL ??= () => {};
    const user = userEvent.setup();
    wrap(<Settings />);
    const input = screen.getByLabelText('Change photo');
    expect(input).toHaveAttribute('type', 'file');
    // A camera badge on the disc's corner says it can change; no caption does.
    expect(screen.getByTestId('avatar-badge')).toBeInTheDocument();
    expect(screen.queryByText('Change photo')).toBeNull();
    expect(screen.getByTestId('settings-avatar')).toHaveAttribute('data-has-photo', 'false');
    await user.upload(input, new File(['x'], 'me.png', { type: 'image/png' }));
    expect(screen.getByTestId('settings-avatar')).toHaveAttribute('data-has-photo', 'true');
    expect(screen.getByTestId('settings-avatar').querySelector('img')).toBeInTheDocument();
  });
});
