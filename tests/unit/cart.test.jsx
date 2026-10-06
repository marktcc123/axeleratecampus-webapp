import { readFileSync } from 'node:fs';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate, MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
// The catalogue as a screen sees it: the fixtures with the brand's name joined
// in from the brands table. The raw JSON carries `brandId` and no display name.
import { FIXTURES as shop } from '../../src/app/content.jsx';
import { usd, credit } from '../../src/app/parts/Money.jsx';

let goTo = () => {};
function Harness() {
  goTo = useNavigate();
  return <App />;
}
const at = (path) => render(<MemoryRouter initialEntries={[path]}><Harness /></MemoryRouter>);

const products = shop.products;
const open = products.filter((p) => !p.soldOut);
const [A, B] = open;

// The cart lives in the header now (owner, 2026-09-21), on every tab, and the
// floating button it replaced is gone — two carts on one screen was one too
// many. Same accessible name, so the count is still read the same way.
const fab = () => screen.queryByRole('link', { name: /^Cart/ });
// AppHeader's avatar is a link named "Me" too, so tab clicks scope to the bar.
const tab = (name) =>
  within(screen.getByRole('navigation', { name: 'App' })).getByRole('link', { name });
// Prefix match, not exact: the button's accessible name grows a "· N already
// in" tail once the product is in the cart, which is the point of it. A
// function matcher rather than a regex because titles carry em dashes and
// punctuation that would have to be escaped.
const addBtn = (p) =>
  screen.getByRole('button', { name: (n) => n.startsWith(`Add ${p.title} to cart`) });

// The credit a line pays back: cashback is a percentage of the price, and
// credit runs at CREDIT_PER_DOLLAR to the dollar.
const ptsFor = (p, qty = 1) => Math.round(p.priceUsd * qty * (p.cashbackPct / 100) * 100);

async function addFromShop(user, ...items) {
  for (const p of items) await user.click(addBtn(p));
}

// The fixture's saved address is empty strings, so checkout's last step is
// always the forced-entry branch on a first pass through it.
async function fillAddress(user) {
  await user.type(screen.getByLabelText('Street address'), '120 Waterman St');
  await user.type(screen.getByLabelText('City'), 'Providence');
  await user.type(screen.getByLabelText('State'), 'RI');
  await user.type(screen.getByLabelText('ZIP'), '02912');
}

// Checkout is three questions: how you are paying, how the wallet's two
// balances split it, and where it goes.
async function checkout(user, { method = 'wallet', address = true } = {}) {
  await user.click(screen.getByRole('button', { name: /Check out/ }));
  await user.click(screen.getByTestId(`pay-${method}`));
  // The wallet step is a split slider, not a pick: whatever it opens on is a
  // payable split, so Continue is enough.
  if (method === 'wallet') await user.click(screen.getByRole('button', { name: 'Continue' }));
  if (address) await fillAddress(user);
  await user.click(screen.getByRole('button', { name: method === 'card' ? /Continue to shop/ : /Place order/ }));
}

describe('cart — adding from the shop', () => {
  test('the bag button on a perk card puts it in the cart', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    expect(fab()).toBeNull();
    await addFromShop(user, A);
    expect(fab()).toHaveAccessibleName('Cart · 1 item');
  });

  test('adding the same item twice counts it twice, not as two lines', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A, A);
    expect(fab()).toHaveAccessibleName('Cart · 2 items');
    await user.click(fab());
    expect(screen.getAllByTestId('cart-line')).toHaveLength(1);
  });

  test('a sold-out item has no way in — the shop offers no button at all', () => {
    at('/app/shop');
    const sold = products.filter((p) => p.soldOut);
    expect(sold.length).toBeGreaterThan(0);
    for (const p of sold) {
      expect(screen.queryByRole('button', { name: `Add ${p.title} to cart` })).toBeNull();
    }
  });
});

describe('cart — the button rides the header', () => {
  test('an empty cart stays out of the header', () => {
    for (const path of ['/app', '/app/discover', '/app/me/demand', '/app/me', '/app/shop']) {
      const { unmount } = at(path);
      expect(fab(), `${path} should not carry an empty cart`).toBeNull();
      unmount();
    }
  });

  test('and the floating button it replaced is gone', () => {
    at('/app/shop');
    expect(document.querySelector('.cart-fab')).toBeNull();
  });

  test('the count travels with it, tab to tab', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A, B);
    expect(fab()).toHaveAccessibleName('Cart · 2 items');
    // It used to be drawn on the shop alone, so a student who put something in
    // the cart and walked away lost sight of it until they came back. That was
    // the reason for moving it into the header.
    for (const tabName of ['Home', 'Demand', 'Profile']) {
      await user.click(tab(tabName));
      expect(fab(), `${tabName} should carry the count`).toHaveAccessibleName('Cart · 2 items');
    }
    await user.click(tab('Discover'));
    expect(fab(), 'and the count survived the round trip').toHaveAccessibleName('Cart · 2 items');
  });

  // The cart screen is a sub-screen with its own header, so the row's cart is
  // not drawn on top of the thing it opens.
  test('it is not drawn on top of itself inside the cart', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    expect(fab()).toBeNull();
  });

  test('a trip out to a guest profile and back does not empty it', async () => {
    const user = userEvent.setup();
    // A data router, so the test can go back the way a browser does — the
    // profile's own chevron reads window.history, which MemoryRouter does not
    // touch. What is under test is the provider's lifetime, not the chevron.
    const router = createMemoryRouter([{ path: '*', element: <App /> }], {
      initialEntries: ['/app/shop'],
    });
    render(<RouterProvider router={router} />);
    await addFromShop(user, A, B);
    expect(fab()).toHaveAccessibleName('Cart · 2 items');

    await act(() => router.navigate('/app/shop'));
    await user.click(screen.getAllByTestId('board-event')[0]);
    await user.click(screen.getAllByTestId('guest')[0]);
    // No cart chrome on the profile: it is outside the shell, which is the
    // whole reason the provider had to move above it.
    expect(fab()).toBeNull();

    // Back twice to the board, then to the shop. What is under test is
    // unchanged: the provider's lifetime across a trip outside the shell.
    await act(() => router.navigate(-1));
    await act(() => router.navigate(-1));
    await act(() => router.navigate('/app/shop'));
    expect(fab(), 'the cart was emptied by a trip outside the shell')
      .toHaveAccessibleName('Cart · 2 items');
  });

  test('the gate and verification never carry it', () => {
    for (const path of ['/', '/verify', '/login']) {
      const { unmount } = at(path);
      expect(fab(), `${path} should have no cart button`).toBeNull();
      unmount();
    }
  });
});

describe('cart — the screen', () => {
  test('an empty cart says so, with no link back — the tab bar and Back are the way (owner, 2026-09-09)', () => {
    at('/app/cart');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your cart');
    expect(screen.getByText('Nothing in here yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Back to the shop/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Check out/ })).toBeNull();
  });

  test('each line carries its brand, title, price and quantity', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A, B, B);
    await user.click(fab());
    const lines = screen.getAllByTestId('cart-line');
    expect(lines).toHaveLength(2);
    expect(within(lines[0]).getByText(A.brand)).toBeInTheDocument();
    expect(within(lines[0]).getByRole('heading', { name: A.title })).toBeInTheDocument();
    expect(within(lines[0]).getByText(usd(A.priceUsd))).toBeInTheDocument();
    expect(within(lines[1]).getByTestId('cart-qty')).toHaveTextContent('2');
  });

  test('the steppers name the item they act on', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    const line = screen.getByTestId('cart-line');
    expect(within(line).getByRole('button', { name: `One fewer ${A.title}` })).toBeInTheDocument();
    expect(within(line).getByRole('button', { name: `One more ${A.title}` })).toBeInTheDocument();
  });

  test('the steppers add, subtract, and drop the line at zero', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    const qty = () => screen.getByTestId('cart-qty');
    await user.click(screen.getByRole('button', { name: `One more ${A.title}` }));
    expect(qty()).toHaveTextContent('2');
    await user.click(screen.getByRole('button', { name: `One fewer ${A.title}` }));
    expect(qty()).toHaveTextContent('1');
    await user.click(screen.getByRole('button', { name: `One fewer ${A.title}` }));
    expect(screen.queryByTestId('cart-line')).toBeNull();
    expect(screen.getByText('Nothing in here yet.')).toBeInTheDocument();
  });

  test('the total is the sum, and the bar carries it beside the action', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A, B, B);
    await user.click(fab());
    const total = A.priceUsd + B.priceUsd * 2;
    // The figure sits in the bar next to the button now, the way the perk
    // page's buy bar carries its own — so the button no longer repeats it.
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent(usd(total));
    expect(within(screen.getByTestId('checkout-bar')).getByRole('button', { name: 'Check out' }))
      .toBeEnabled();
  });

  test('R1: the cart names no credit at all, so none of it can stand bare', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    // The "back in credit when it ships" row came off on 2026-09-04. R1 is not
    // weakened by that — it forbids a BARE credit number, and the summary now
    // carries none at all. The rule's live coverage is the confirmation, which
    // still pairs its figure with the shop value (tested below), and My orders'
    // lede, which still names the rate.
    expect(document.querySelector('.cart').textContent).not.toMatch(/credit/i);
    expect(screen.queryByTestId('cart-credit')).toBeNull();
  });
});

describe('cart — checking out', () => {
  test('checkout confirms, empties the cart and puts the button away', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await checkout(user);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Order in.');
    expect(screen.queryByTestId('cart-line')).toBeNull();
    expect(fab()).toBeNull();
  });

  test('the confirmation says what lands in credit, still paired with its value', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await checkout(user);
    expect(screen.getByTestId('order-credit')).toHaveTextContent(credit(ptsFor(A)));
  });

  test('leaving the confirmation lands back in the shop, not in an empty cart', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await checkout(user);
    await user.click(screen.getByRole('link', { name: /Back to the shop/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Perks shop');
  });
});

describe('checkout — the three questions', () => {
  const openSheet = async (user) => {
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await user.click(screen.getByRole('button', { name: /Check out/ }));
  };

  test('the total is on the cart and on every step of the sheet', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    // On the cart it reads "Total", not "Subtotal": nothing is added after it.
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent(usd(A.priceUsd));
    await user.click(screen.getByRole('button', { name: /Check out/ }));
    expect(screen.getByTestId('checkout-total')).toHaveTextContent(usd(A.priceUsd));
    await user.click(screen.getByTestId('pay-wallet'));
    expect(screen.getByTestId('checkout-total')).toHaveTextContent(usd(A.priceUsd));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('checkout-total')).toHaveTextContent(usd(A.priceUsd));
  });

  test('wallet asks how the two balances split it; card does not', async () => {
    const user = userEvent.setup();
    await openSheet(user);
    await user.click(screen.getByTestId('pay-wallet'));
    expect(screen.getByRole('heading', { name: /from credit/i })).toBeInTheDocument();
    expect(screen.getByTestId('split-slider')).toBeInTheDocument();
    // Back out and take the card instead: there is one card, and which one is
    // a question for a payments backend this app does not have.
    await user.click(screen.getByRole('button', { name: 'Back a step' }));
    await user.click(screen.getByTestId('pay-card'));
    expect(screen.queryByTestId('split-slider')).toBeNull();
    expect(screen.getByRole('heading', { name: /where does it go/i })).toBeInTheDocument();
  });

  test('the slider splits the bill between cash and credit', async () => {
    const user = userEvent.setup();
    await openSheet(user);
    await user.click(screen.getByTestId('pay-wallet'));
    const slider = screen.getByTestId('split-slider');
    // $133 cash covers a $32 journal on its own, so credit starts at nothing
    // and can rise to the whole 2,400 the wallet holds ($24 of the $32).
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '2400');
    // Whole dollars: a step of 1 would offer hundredths of a cent as choices.
    expect(slider).toHaveAttribute('step', '100');
    expect(screen.getByTestId('split-note')).toHaveTextContent(`All ${usd(A.priceUsd)} from cash.`);

    await user.click(screen.getByRole('button', { name: 'Max' }));
    expect(screen.getByTestId('split-note'))
      .toHaveTextContent(`${credit(2400)} from credit, ${usd(A.priceUsd - 24)} from cash.`);
  });

  test('R1 holds on the sheet: no credit figure stands alone', async () => {
    const user = userEvent.setup();
    await openSheet(user);
    expect(screen.getByTestId('pay-wallet')).toHaveTextContent(credit(2400));
    await user.click(screen.getByTestId('pay-wallet'));
    // Both the balance readout and the split sentence pair it with its value.
    expect(screen.getByText(credit(2400))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Max' }));
    expect(screen.getByTestId('split-note')).toHaveTextContent(credit(2400));
  });
});

describe('checkout — where the money goes', () => {
  test('a wallet pay comes straight out of the balances the Me cards show', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);                      // $32
    await user.click(fab());
    await user.click(screen.getByRole('button', { name: /Check out/ }));
    await user.click(screen.getByTestId('pay-wallet'));
    await user.click(screen.getByRole('button', { name: 'Max' }));   // 2,400 credit = $24; $8 of cash
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await fillAddress(user);
    await user.click(screen.getByRole('button', { name: /Place order/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Order in.');
    expect(screen.queryByTestId('paid-in-shop')).toBeNull();
    await user.click(screen.getByRole('link', { name: /Back to the shop/ }));
    // The profile is demand now. The balance the checkout wrote still lives
    // on the wallet screen.
    await act(() => { goTo('/app/me/wallet'); });
    expect(screen.getByTestId('wallet-cash')).toHaveTextContent(usd(133 - (A.priceUsd - 24))); // $125
    expect(within(screen.getByTestId('wallet-credit')).getByText('0')).toBeInTheDocument();
  });

  test('a card pay is placed in the shop and touches the wallet not at all', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await user.click(screen.getByRole('button', { name: /Check out/ }));
    await user.click(screen.getByTestId('pay-card'));
    await fillAddress(user);
    // The button says where it goes, not "Place order".
    await user.click(screen.getByRole('button', { name: /Continue to shop/ }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Order in.');
    expect(screen.getByTestId('paid-in-shop')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Back to the shop/ }));
    await act(() => { goTo('/app/me/wallet'); });
    expect(screen.getByTestId('wallet-cash')).toHaveTextContent('$133');
  });
});

describe('checkout — the address', () => {
  test('with nothing on file it refuses to place, and says what is missing', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await checkout(user, { address: false });
    // Still on the sheet, no confirmation.
    expect(screen.queryByText('Order in.')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(/street, a city, a state and a ZIP/);
    // The optional line is not among the fields marked.
    expect(screen.getAllByText('needed')).toHaveLength(4);
  });

  test('an address typed at checkout is on file next time, and in Settings', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await checkout(user);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Order in.');

    // Buy again: the address step is a summary now, not a form.
    await user.click(screen.getByRole('link', { name: /Back to the shop/ }));
    await addFromShop(user, A);
    await user.click(fab());
    await user.click(screen.getByRole('button', { name: /Check out/ }));
    await user.click(screen.getByTestId('pay-wallet'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('saved-address')).toHaveTextContent('120 Waterman St');
    expect(screen.getByTestId('saved-address')).toHaveTextContent('Providence, RI 02912');
    expect(screen.queryByLabelText('Street address')).toBeNull();

    // And it is the same address Settings holds — one provider, not two copies.
    await user.click(screen.getByRole('button', { name: /Place order/ }));
    await user.click(screen.getByRole('link', { name: /Back to the shop/ }));
    // Settings is reached from the header's account drawer since 2026-09-21;
    // Me stops at the wallet and has no row to it any more.
    await user.click(screen.getByTestId('account'));
    await user.click(within(screen.getByRole('dialog', { name: 'Account' })).getByRole('link', { name: 'Settings' }));
    expect(screen.getByLabelText('City')).toHaveValue('Providence');
  });

  test('a saved address can still be swapped for a different one', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await checkout(user);
    await user.click(screen.getByRole('link', { name: /Back to the shop/ }));
    await addFromShop(user, A);
    await user.click(fab());
    await user.click(screen.getByRole('button', { name: /Check out/ }));
    await user.click(screen.getByTestId('pay-wallet'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: /different address/i }));
    expect(screen.getByLabelText('Street address')).toHaveValue('120 Waterman St');
  });
});

describe('cart — getting back out', () => {
  test('back returns to the shop, which is where the button is', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    await user.click(screen.getByRole('link', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Perks shop');
  });

  test('opened straight from a cold URL, back still has somewhere to go', async () => {
    at('/app/cart');
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/app/shop');
  });
});

describe('cart — house rules', () => {
  test('renders no emoji', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  test('avoids the register the voice rules ban', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await addFromShop(user, A);
    await user.click(fab());
    expect(document.body.textContent).not.toMatch(/cutting-edge|world-class|seamless|supercharge/i);
  });

  test('no app stylesheet patches a design-system component', () => {
    const css = readFileSync('src/app/screens/cart.css', 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      (m) => m.replace(/[^\n]/g, ' '),
    );
    const offenders = css
      .split('\n')
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => /\.ax-[a-z-]+/.test(line))
      .map(({ line, i }) => `src/app/screens/cart.css:${i + 1} — ${line.trim()}`);
    expect(offenders).toEqual([]);
  });
});
