import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate, MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
// The catalogue as a screen sees it: the fixtures with the brand's name joined
// in from the brands table. The raw JSON carries `brandId` and no display name.
import { FIXTURES as shop } from '../../src/app/content.jsx';
import hub from '../../src/data/hub.example.json';
import { usd } from '../../src/app/parts/Money.jsx';

let goTo = () => {};
function Harness() {
  goTo = useNavigate();
  return <App />;
}
const at = (path) => render(<MemoryRouter initialEntries={[path]}><Harness /></MemoryRouter>);

// The product page swapped the tab bar and the floating cart button for its own
// buy bar, so the route to the cart from here is the one a user has: back to the
// shop, where the button lives, and in from there. Same mounted App throughout,
// so the cart provider keeps its state.
const toCartViaShop = async (user) => {
  await user.click(screen.getByRole('link', { name: 'Back' }));
  await user.click(screen.getByRole('link', { name: /^Cart/ }));
};
const products = shop.products;
const inStock = products.find((p) => !p.soldOut);
const soldOut = products.find((p) => p.soldOut);
// By product, not by position: the shop opens on Trending now as of
// 2026-09-21, which orders the grid by review recency, so "the first card" is
// no longer "the first product in the fixture".
const cardFor = (p) => screen.getAllByTestId('shop-item').find((c) => c.textContent.includes(p.title));

describe('tapping into a product', () => {
  test('the whole card is one link to the product', () => {
    at('/app/shop');
    const link = within(cardFor(inStock)).getByRole('link');
    expect(link).toHaveAttribute('href', `/app/shop/${inStock.id}`);
  });

  test('the bag button sits outside that link — a button inside an anchor is invalid', () => {
    at('/app/shop');
    const card = screen.getAllByTestId('shop-item').find((c) => c.dataset.soldOut === 'false');
    const bag = within(card).getByRole('button', { name: /^Add / });
    expect(bag.closest('a')).toBeNull();
  });

  test('a sold-out card still opens, it just cannot be added', () => {
    at('/app/shop');
    // There is more than one sold-out product, and which of them the grid shows
    // first depends on the open tab's order — so this asks for the card of a
    // named product rather than for the first sold-out card it finds.
    const card = cardFor(soldOut);
    expect(card.dataset.soldOut).toBe('true');
    expect(within(card).getByRole('link')).toHaveAttribute('href', `/app/shop/${soldOut.id}`);
    expect(within(card).queryByRole('button')).toBeNull();
  });

  test('tapping a card opens that product', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    await user.click(within(cardFor(inStock)).getByRole('link'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(inStock.title);
  });

  test('adding from the card does not open the product', async () => {
    const user = userEvent.setup();
    at('/app/shop');
    const card = screen.getAllByTestId('shop-item').find((c) => c.dataset.soldOut === 'false');
    await user.click(within(card).getByRole('button', { name: /^Add / }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Perks shop');
  });
});

describe('perk detail', () => {
  test('the brand above the title is its disc and name, one link to the brand page, which comes back here (owner, 2026-09-23)', async () => {
    const user = userEvent.setup();
    at(`/app/shop/${inStock.id}`);
    const link = screen.getByRole('link', { name: inStock.brand });
    expect(link).toHaveAttribute('href', `/app/earn/brands/${inStock.brandId}`);
    expect(link.querySelector('.avatar')).not.toBeNull();
    // Who, then what: the brand line precedes the title in the DOM as on the page.
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(Boolean(link.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    await user.click(link);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(inStock.brand);
    await user.click(screen.getByRole('link', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(inStock.title);
  });

  test('carries the brand, price, cashback, stock and the description', () => {
    at(`/app/shop/${inStock.id}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(inStock.title);
    expect(screen.getByText(inStock.brand)).toBeInTheDocument();
    // The page states no price at all now — the buy bar carries the total, and
    // the credit went with it, beside the figure it is a share of.
    const bar = within(screen.getByTestId('buy-bar'));
    expect(screen.getAllByText(usd(inStock.priceUsd))).toHaveLength(1);
    expect(bar.getByText(usd(inStock.priceUsd))).toBeInTheDocument();
    expect(bar.getByText(`${inStock.cashbackPct}% cashback`)).toBeInTheDocument();
    expect(screen.getByText(`${inStock.stock.toLocaleString('en-US')} left`)).toBeInTheDocument();
  });

  test('adds to the cart, and the cover bag shows the count', async () => {
    const user = userEvent.setup();
    at(`/app/shop/${inStock.id}`);
    const bag = screen.getByTestId('detail-cart');
    expect(bag).toHaveAttribute('href', '/app/cart');
    expect(bag).toHaveAccessibleName('Cart');
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(screen.getByTestId('detail-cart')).toHaveAccessibleName('Cart · 1 item');
    // Scoped to the toast: the title is also the page's own <h1>.
    const said = screen.getByRole('status');
    expect(within(said).getByText('Added to your cart')).toBeInTheDocument();
    expect(within(said).getByText(inStock.title)).toBeInTheDocument();
  });

  test('a sold-out product offers the waitlist instead of the cart', () => {
    at(`/app/shop/${soldOut.id}`);
    expect(screen.getByText('sold out')).toBeInTheDocument();
    expect(screen.getByText('Back next drop')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Buy now' })).toBeNull();
    expect(screen.getByRole('button', { name: /Waitlist me/ })).toBeInTheDocument();
  });

  test('states what shipping and returns promise, as the canvas does', () => {
    at(`/app/shop/${inStock.id}`);
    expect(screen.getByText(`${inStock.cashbackPct}% cashback when it ships`)).toBeInTheDocument();
    expect(screen.getByText('Ships in 3–5 days to the campus desk')).toBeInTheDocument();
    expect(screen.getByText('30-day returns, no questions')).toBeInTheDocument();
  });

  test('back returns to the shop', () => {
    at(`/app/shop/${inStock.id}`);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/app/shop');
  });

  test('an unknown product is not found rather than blank', () => {
    at('/app/shop/not-a-product');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/isn't here/);
  });

  test('renders no emoji and avoids the banned register', () => {
    at(`/app/shop/${inStock.id}`);
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(document.body.textContent).not.toMatch(/cutting-edge|world-class|seamless|supercharge/i);
  });
});

describe('size, quantity and reviews', () => {
  const sized = shop.products.find((p) => p.sizes?.length && !p.soldOut);
  const plain = shop.products.find((p) => !p.sizes && !p.soldOut);

  test('a product with sizes will not go in the cart until one is picked', async () => {
    const user = userEvent.setup();
    at(`/app/shop/${sized.id}`);
    const add = screen.getByRole('button', { name: 'Add to cart' });
    const buy = screen.getByRole('button', { name: 'Buy now' });
    expect(add).toBeDisabled();
    expect(buy).toBeDisabled();
    // A disabled button with no reason is a dead end.
    expect(screen.getByText(/Pick a size first/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: sized.sizes[0] }));
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Buy now' })).toBeEnabled();
    expect(screen.queryByText(/Pick a size first/)).toBeNull();
  });

  test('a product without sizes shows no size picker and adds straight away', () => {
    at(`/app/shop/${plain.id}`);
    // Scoped to the picker: the details block has its own "Size" row, so a
    // document-wide text query matches that instead.
    expect(document.querySelector('.pd__sizes')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Buy now' })).toBeEnabled();
  });

  test('the quantity stepper stops at one and at the stock on hand', async () => {
    const user = userEvent.setup();
    at(`/app/shop/${plain.id}`);
    expect(screen.getByRole('button', { name: 'One fewer' })).toBeDisabled();
    const more = screen.getByRole('button', { name: 'One more' });
    await user.click(more);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'One fewer' })).toBeEnabled();
  });

  test('the size reaches the cart, and two sizes are two lines', async () => {
    const user = userEvent.setup();
    at(`/app/shop/${sized.id}`);
    await user.click(screen.getByRole('button', { name: sized.sizes[0] }));
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    await user.click(screen.getByRole('button', { name: sized.sizes[1] }));
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    await toCartViaShop(user);
    const lines = await screen.findAllByTestId('cart-line');
    expect(lines).toHaveLength(2);
    expect(screen.getByText(`Size ${sized.sizes[0]}`)).toBeInTheDocument();
    expect(screen.getByText(`Size ${sized.sizes[1]}`)).toBeInTheDocument();
  });

  test('buy now adds this selection and opens the cart', async () => {
    const user = userEvent.setup();
    at(`/app/shop/${plain.id}`);
    await user.click(screen.getByRole('button', { name: 'One more' }));
    await user.click(screen.getByRole('button', { name: 'Buy now' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your cart');
    const lines = await screen.findAllByTestId('cart-line');
    expect(lines).toHaveLength(1);
    expect(within(lines[0]).getByText(plain.title)).toBeInTheDocument();
    expect(within(lines[0]).getByTestId('cart-qty')).toHaveTextContent('2');
  });

  test('the quantity picked is the quantity added', async () => {
    const user = userEvent.setup();
    at(`/app/shop/${plain.id}`);
    await user.click(screen.getByRole('button', { name: 'One more' }));
    await user.click(screen.getByRole('button', { name: 'One more' }));
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    await user.click(screen.getByRole('link', { name: 'Back' }));
    expect(screen.getByRole('link', { name: /Cart · 3 items/ })).toBeInTheDocument();
  });

  test('the details block states materials and size, not shipping', () => {
    at(`/app/shop/${plain.id}`);
    for (const d of plain.details) {
      expect(screen.getByText(d.label)).toBeInTheDocument();
      expect(screen.getByText(d.value)).toBeInTheDocument();
    }
    // Shipping and returns live in the promises list; two sources would drift.
    expect(plain.details.map((d) => d.label)).not.toContain('Shipping');
  });

  test('the review average is computed from the reviews, never stored', () => {
    at(`/app/shop/${plain.id}`);
    expect(screen.getAllByTestId('review')).toHaveLength(plain.reviews.length);
    const avg = plain.reviews.reduce((n, r) => n + r.rating, 0) / plain.reviews.length;
    expect(screen.getByText(avg.toFixed(1))).toBeInTheDocument();
    // A stored average could disagree with the list under it.
    expect(plain).not.toHaveProperty('rating');
    expect(plain).not.toHaveProperty('reviewAverage');
  });
});

describe('reviews on the product page — it reads them, it never writes one', () => {
  const deliveredOrder = hub.orders.find((o) => o.status === 'delivered');
  const eligible = products.find((p) => p.id === deliveredOrder.productId);

  test('offers no way to write one, even for a product you did buy', () => {
    at(`/app/shop/${eligible.id}`);
    // The gate itself is not observable here any more — nothing on this page
    // offers to write, bought or not. Order history is the one entry point, so
    // that is where the gate is tested (tests/unit/hub-screens.test.jsx) along
    // with the rule itself (tests/unit/reviews.test.jsx).
    expect(screen.queryByRole('button', { name: 'Write a review' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('a review written from order history turns up here', async () => {
    const user = userEvent.setup();
    at('/app/me/orders');

    const row = screen
      .getAllByTestId('order-row')
      .find((r) => r.dataset.status === deliveredOrder.status);
    await user.click(within(row.parentElement).getByRole('button', { name: 'Write a review' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: '5 stars' }));
    await user.type(within(dialog).getByLabelText('Your review'), 'Excellent, buy it.');
    await user.click(within(dialog).getByRole('button', { name: 'Submit review' }));
    expect(within(dialog).getByText(/Nothing was sent/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    // Same mounted App, so the provider kept it: walk to the product and read.
    await act(() => { goTo('/app/shop'); });
    await user.click(
      screen.getAllByTestId('shop-item').find((c) => c.querySelector('a').getAttribute('href').endsWith(eligible.id)).querySelector('a'),
    );
    const mine = screen.getByTestId('review-mine');
    expect(within(mine).getByText('You')).toBeInTheDocument();
    expect(within(mine).getByText('Excellent, buy it.')).toBeInTheDocument();
    expect(screen.getAllByTestId('review')).toHaveLength(eligible.reviews.length);
  });
});
