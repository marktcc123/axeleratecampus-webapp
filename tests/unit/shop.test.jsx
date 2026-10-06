import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import Perks from '../../src/app/screens/Perks.jsx';
import App from '../../src/App.jsx';
import { CartProvider } from '../../src/app/cart.jsx';
// The catalogue as a screen sees it: the fixtures with the brand's name joined
// in from the brands table. The raw JSON carries `brandId` and no display name.
import { FIXTURES as shop } from '../../src/app/content.jsx';

const products = shop.products;
const drop = shop.drop;

// The bag button adds to the cart now, so the screen needs the provider the
// app shell gives it in production.
const wrap = () => render(
  <ProfileProvider><WalletProvider><MemoryRouter><CartProvider><Perks /></CartProvider></MemoryRouter></WalletProvider></ProfileProvider>
);
const DORM = products.filter((p) => p.topic === 'Dorm collection');

describe('Perks shop', () => {
  test('opens on Trending now, one card per product', () => {
    wrap();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Perks shop');
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);
  });

  test('avoids the design copy that the voice rules ban', () => {
    wrap();
    // The design says "Cutting-edge brand perks". Both the impeccable copy
    // rules and the design system's own voice forbid that register.
    expect(document.body.textContent).not.toMatch(/cutting-edge|world-class|seamless|supercharge/i);
  });

  test('cashback names its unit, and only appears where there is any (R1)', () => {
    wrap();
    // The label reads "cashback", the fixture's own word (cashbackPct) and the
    // owner's. And not every product pays it: a 0% label is worse than no
    // label, so the card renders none.
    const paying = products.find((p) => p.cashbackPct > 0);
    const free = products.find((p) => !p.cashbackPct);
    expect(free, 'the fixture needs one product with no cashback').toBeTruthy();

    const card = (p) =>
      screen.getAllByTestId('shop-item').find((c) => c.textContent.includes(p.title));
    expect(within(card(paying)).getByText(`${paying.cashbackPct}% cashback`)).toBeInTheDocument();
    expect(within(card(free)).queryByText(/cashback/i)).toBeNull();
    expect(within(card(free)).queryByText(/0%/)).toBeNull();
  });

  test('every sold-out item sits below every one you can buy', () => {
    wrap();
    // The first attempt at this sorted on Number(p.soldOut), and in-stock
    // products carry no `soldOut` key at all — Number(undefined) is NaN, the
    // comparator returned NaN, and the sort silently did nothing. Every test
    // here still passed, because none of them looked at the order.
    const flags = screen.getAllByTestId('shop-item').map((c) => c.dataset.soldOut === 'true');
    expect(flags).toContain(true);
    expect(flags).toContain(false);
    expect(flags.indexOf(true)).toBeGreaterThan(flags.lastIndexOf(false));
  });

  test('a sold-out item is flagged, priced quietly and has no way to buy', () => {
    wrap();
    const sold = screen.getAllByTestId('shop-item').filter((c) => c.dataset.soldOut === 'true');
    expect(sold.length).toBeGreaterThan(0);
    for (const c of sold) {
      expect(within(c).getByText('sold out')).toBeInTheDocument();
      expect(within(c).getByText('Back next drop')).toBeInTheDocument();
      // The design drops the button entirely rather than disabling it.
      expect(within(c).queryByRole('button')).not.toBeInTheDocument();
    }
  });

  test('an in-stock item has a bag button that names it, and no stock count', () => {
    wrap();
    const open = screen.getAllByTestId('shop-item').filter((c) => c.dataset.soldOut === 'false');
    for (const c of open) {
      const title = within(c).getByRole('heading').textContent;
      // The button is icon-only, so its accessible name has to carry the item.
      expect(within(c).getByRole('button', { name: `Add ${title} to cart` })).toBeEnabled();
      // "883 left" came off the card on 2026-09-02 at the owner's request: a
      // count on a card nobody has decided about yet was noise. The product
      // page still carries it, where it bears on a quantity.
      expect(within(c).queryByText(/\d[\d,]* left/)).toBeNull();
    }
  });

  test('the collection is a folder tab like the board\'s, and the shop opens on Trending now', async () => {
    const user = userEvent.setup();
    wrap();
    // Chips from 2026-09-02 to 2026-09-08; the board's folder tabs since —
    // one on at a time, the count on the open one. Trending now arrived on
    // 2026-09-21 and took the default off All (owner).
    const tabs = within(screen.getByRole('tablist', { name: 'Collection' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent.replace(/\d+$/, ''))).toEqual(['Trending now', 'Dorm collection', 'All']);
    const [trending, dorm, all] = tabs;
    expect(trending).toHaveAttribute('aria-selected', 'true');
    // Trending is a sort, not a slice, so it holds the whole catalogue — a tab
    // the shop opens on must never be able to come up empty.
    expect(trending).toHaveTextContent(String(products.length));
    expect(dorm).toHaveAttribute('aria-selected', 'false');
    expect(all).toHaveAttribute('aria-selected', 'false');
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);

    await user.click(dorm);
    expect(dorm).toHaveAttribute('aria-selected', 'true');
    expect(dorm).toHaveTextContent(String(DORM.length));
    expect(trending).toHaveAttribute('aria-selected', 'false');
    expect(screen.getAllByTestId('shop-item')).toHaveLength(DORM.length);

    await user.click(all);
    expect(all).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);

    // One at a time: clicking the open tab changes nothing, and there is no
    // way to end up with none selected.
    await user.click(all);
    expect(all).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);
  });

  // The order is the whole difference between Trending now and All, so it is
  // asserted rather than assumed: the two tabs hold the same nine products.
  test('Trending now leads with what students reviewed most recently', async () => {
    const user = userEvent.setup();
    wrap();
    const titles = () => screen.getAllByTestId('shop-item').map((n) => n.textContent);
    const lastReview = (p) => Math.max(...(p.reviews ?? []).map((r) => Date.parse(r.date)), -Infinity);
    const expected = [...products]
      .sort((a, b) => (lastReview(b) - lastReview(a)) || ((b.reviews?.length ?? 0) - (a.reviews?.length ?? 0)))
      .sort((a, b) => Number(!!a.soldOut) - Number(!!b.soldOut));
    // A fixture where every product shares a review date would make this pass
    // on any order at all.
    expect(new Set(products.map(lastReview)).size, 'the fixture needs distinct review dates').toBeGreaterThan(1);
    const shown = titles();
    for (const [i, p] of expected.entries()) {
      expect(shown[i], `position ${i}`).toContain(p.title);
    }
    // And All leaves the catalogue in its own order, which is a different one.
    await user.click(screen.getByRole('tab', { name: /^All/ }));
    expect(titles()).not.toEqual(shown);
  });

  test('a screen reader is told the item count', () => {
    wrap();
    expect(screen.getByRole('status')).toHaveTextContent(`${products.length} items`);
  });

  test('the weekly drop counts down in real units, in its own section', () => {
    wrap();
    // "Next drop opens in" came off above the clock; the section's heading is
    // what names it now.
    expect(screen.queryByText('Next drop opens in')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Weekly drops' })).toBeInTheDocument();
    const clock = screen.getByTestId('drop-countdown');
    for (const unit of ['days', 'hrs', 'min', 'sec']) {
      expect(within(clock).getByText(unit)).toBeInTheDocument();
    }
    // Two digits per unit, each with the flip-clock seam the design draws.
    expect(clock.querySelectorAll('.drop__digit')).toHaveLength(8);
    expect(clock.querySelectorAll('.drop__seam')).toHaveLength(8);
  });

  test('the drop previews what is in it', () => {
    wrap();
    // The "This week: N pieces" heading and the lede above it were removed at
    // the owner's request on 2026-09-02, along with the rule between them. The
    // preview is the items themselves.
    expect(screen.queryByRole('heading', { name: /This week/ })).toBeNull();
    expect(screen.queryByText(/tiny batch goes live/)).toBeNull();
    const items = screen.getAllByTestId('drop-item');
    expect(items).toHaveLength(drop.items.length);
    // Scoped to the preview: "Nautilus towels" is also a product below. The
    // price and the cap share one line on the photo now ("$39 · 50 ONLY"), so
    // the cap is matched inside its line rather than as the whole of it.
    for (const [i, it] of drop.items.entries()) {
      expect(within(items[i]).getByRole('heading', { name: it.title })).toBeInTheDocument();
      expect(within(items[i]).getByText(new RegExp(it.cap, 'i'))).toBeInTheDocument();
      expect(within(items[i]).getByText(new RegExp(`\\$${it.priceUsd}\\b`))).toBeInTheDocument();
    }
    // The reminder button was removed at the owner's request; the countdown
    // above already says when the drop opens.
    expect(screen.queryByRole('button', { name: /Remind me/ })).toBeNull();
  });

  test('each drop piece opens as a product page with the cart locked (owner, 2026-09-21)', async () => {
    wrap();
    const links = screen.getAllByTestId('drop-link');
    expect(links).toHaveLength(drop.items.length);
    drop.items.forEach((it, i) => expect(links[i]).toHaveAttribute('href', `/app/shop/${it.id}`));
    for (const a of links) expect(a.querySelectorAll('a,button,input')).toHaveLength(0);
    cleanup();
    // The page itself: the shop's own, with the cap for stock and a locked bar.
    const it = drop.items[0];
    render(<MemoryRouter initialEntries={[`/app/shop/${it.id}`]}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(it.title);
    expect(screen.getByText(`${parseInt(it.cap, 10)} only · drops Friday 8pm`)).toBeInTheDocument();
    const locked = screen.getByTestId('drop-locked');
    expect(locked).toBeDisabled();
    expect(locked).toHaveTextContent('Drops Friday 8pm');
    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeNull();
    expect(screen.queryByRole('button', { name: /as a gift/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Waitlist/ })).toBeNull();
  });

  test('prices show cents only when they have them', () => {
    wrap();
    // $32 appears twice now — once as a product, once in the drop preview.
    expect(screen.getAllByText('$32').length).toBeGreaterThan(0);
    expect(screen.getByText('$14.09')).toBeInTheDocument();
  });

  test('hover raises the shadow and leaves the colour alone', () => {
    const { container } = wrap();
    const card = container.querySelector('.perk-card .ax-card');
    // The two are separate in the design system: --interactive raises the
    // shadow, --wash tints the surface. The shop card wants the first and not
    // the second, which is `interactive="shadow"`.
    expect(card.className).toMatch(/ax-card--interactive/);
    expect(card.className).not.toMatch(/ax-card--wash/);
    // Flat at rest, because the panel behind it carries the only shadow.
    expect(card.className).toMatch(/ax-card--flat/);
    // And nothing in the app reaches into the component to achieve it.
    expect(card.getAttribute('style') || '').not.toMatch(/box-shadow/);
  });

  const openFilters = async (user) => { await user.click(screen.getByTestId('open-filters')); return screen.getByRole('dialog'); };

  test('search grows out of the glyph in the tools row, and you type straight away', async () => {
    const user = userEvent.setup();
    wrap();
    expect(screen.queryByRole('searchbox')).toBeNull();                 // folded: hidden, out of the tab order
    await user.click(screen.getByTestId('open-search'));
    expect(screen.queryByRole('dialog')).toBeNull();                    // no sheet — it opens in place
    const box = screen.getByRole('searchbox', { name: 'Search the shop' });
    expect(box).toHaveFocus();
    expect(screen.getByTestId('open-search')).toHaveAttribute('aria-expanded', 'true');
    await user.type(box, 'towel');
    const towels = products.filter((p) => /towel/i.test(p.title));
    expect(screen.getAllByTestId('shop-item')).toHaveLength(towels.length);
    expect(screen.getByTestId('open-filters')).toHaveTextContent(/^Filter$/);   // the query is not a "filter on"
    await user.clear(box);
    expect(box).toHaveValue('');
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);
    await user.type(box, 'towel');
    await user.keyboard('{Escape}');                                    // Escape clears and folds it back
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);
    expect(screen.getByTestId('open-search')).toHaveFocus();
  });

  test('the filter sheet carries no search box, and Reset all leaves the query alone', async () => {
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByTestId('open-search'));
    await user.type(screen.getByRole('searchbox'), 'towel');
    const towels = products.filter((p) => /towel/i.test(p.title));
    const d = await openFilters(user);
    expect(within(d).getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
    expect(within(d).queryByRole('searchbox')).toBeNull();
    for (const lab of ['Product category', 'Brand', 'Availability']) expect(within(d).getByText(lab)).toBeInTheDocument();
    expect(within(d).queryByText(/tier/i)).toBeNull();     // the reference had one; the products carry none
    expect(within(d).getByTestId('filter-show')).toHaveTextContent(`Show ${towels.length} results`);
    await user.click(within(d).getByRole('button', { name: 'Reset all' }));
    expect(screen.getAllByTestId('shop-item')).toHaveLength(towels.length);
    await user.click(within(d).getByTestId('filter-show'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('searchbox')).toHaveValue('towel');        // a live query keeps the field open
  });

  test('brands are a multi-select; Select all and Clear do what they say', async () => {
    const user = userEvent.setup();
    wrap();
    const d = await openFilters(user);
    const rows = within(d).getAllByTestId('filter-brand');
    expect(rows).toHaveLength(new Set(products.map((p) => p.brand)).size);
    await user.click(within(d).getByRole('checkbox', { name: 'Italic' }));
    expect(within(d).getByRole('checkbox', { name: 'Italic' })).toBeChecked();
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.filter((p) => p.brand === 'Italic').length);
    await user.click(within(d).getByRole('checkbox', { name: 'Vera' }));
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.filter((p) => ['Italic', 'Vera'].includes(p.brand)).length);
    await user.click(within(d).getByRole('button', { name: 'Clear' }));
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);
    await user.click(within(d).getByRole('button', { name: 'Select all' }));
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);
  });

  // Brands on Discover (owner, 2026-09-22: "brands需要筛选项和搜索", then
  // 2026-09-23: "不要filter了 只要搜索"): the shop's search glyph under the Brands
  // heading and nothing else — no Filter pill, no sheet — narrowing the row in place.
  describe('Brands search', () => {
    const liveBrands = () => screen.getAllByTestId('brand');
    const N = 7;   // every fixture brand is live (a mission on the board or a product in the shop)

    test('search under the Brands heading narrows the row and leaves the shop alone; there is no Filter', async () => {
      const user = userEvent.setup();
      wrap();
      expect(liveBrands()).toHaveLength(N);
      expect(screen.queryByTestId('open-brand-filters')).toBeNull();
      // On the heading's own line (owner, 2026-09-23: "搜索能不能brands一行"): the
      // heading and the glyph share a head row, not the whole section.
      const h2 = screen.getByRole('heading', { name: 'Brands' });
      expect(h2.parentElement).not.toBe(h2.closest('section'));
      expect(h2.parentElement).toContainElement(screen.getByTestId('open-brand-search'));
      await user.click(screen.getByTestId('open-brand-search'));
      const box = screen.getByRole('searchbox', { name: 'Search brands' });
      expect(box).toHaveFocus();
      await user.type(box, 'Solra');
      expect(liveBrands()).toHaveLength(1);
      expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);   // the shop's own list is untouched
      await user.keyboard('{Escape}');
      expect(liveBrands()).toHaveLength(N);
      expect(screen.getByTestId('open-brand-search')).toHaveFocus();
    });

    test('nothing matching shows an empty state whose Clear brings every brand back', async () => {
      const user = userEvent.setup();
      wrap();
      await user.click(screen.getByTestId('open-brand-search'));
      await user.type(screen.getByRole('searchbox', { name: 'Search brands' }), 'zzz');
      expect(screen.queryAllByTestId('brand')).toHaveLength(0);
      const empty = screen.getByTestId('brands-empty');
      expect(empty).toHaveTextContent(/No brands match/);
      await user.click(within(empty).getByRole('button', { name: 'Clear search' }));
      expect(liveBrands()).toHaveLength(N);
    });
  });

  test('availability: Sold out, In stock and Low stock each pick the right products', async () => {
    const user = userEvent.setup();
    wrap();
    const d = await openFilters(user);
    await user.click(within(d).getByRole('button', { name: 'Sold out' }));
    expect(screen.getAllByTestId('shop-item').every((c) => c.dataset.soldOut === 'true')).toBe(true);
    await user.click(within(d).getByRole('button', { name: 'In stock' }));
    expect(screen.getAllByTestId('shop-item').every((c) => c.dataset.soldOut === 'false')).toBe(true);
    await user.click(within(d).getByRole('button', { name: 'Low stock' }));
    const low = products.filter((p) => !p.soldOut && p.stock > 0 && p.stock < 15);
    expect(low.length).toBeGreaterThan(0);                                // the fixture keeps one
    expect(screen.getAllByTestId('shop-item')).toHaveLength(low.length);
    expect(within(d).getByText(/fewer than 15 left/)).toBeInTheDocument();
  });

  test('category chips narrow; Reset all puts everything back', async () => {
    const user = userEvent.setup();
    wrap();
    const d = await openFilters(user);
    await user.click(within(d).getByRole('button', { name: 'Home & bath' }));
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.filter((p) => p.category === 'Home & bath').length);
    await user.click(within(d).getByRole('button', { name: 'Reset all' }));
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);
    expect(within(d).getByTestId('filter-show')).toHaveTextContent(`Show ${products.length} results`);
  });

  test('filters that match nothing say so, in the sheet and on the page', async () => {
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByTestId('open-search'));
    await user.type(screen.getByRole('searchbox'), 'zzzz-not-a-perk');
    const d = await openFilters(user);
    expect(within(d).getByTestId('filter-show')).toHaveTextContent('Nothing matches');
    await user.click(within(d).getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('shop-empty')).toHaveTextContent(/No perks match “zzzz-not-a-perk”/);
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByTestId('shop-item')).toHaveLength(products.length);
  });

  test('no app stylesheet patches a design-system component', () => {
    // PRODUCT.md Principle 5. The shop card is where this last broke: the app
    // was overriding .ax-card with !important to win the cascade race the
    // design system's JS-time <style> injection creates.
    const offenders = readdirSync('src', { recursive: true })
      .filter((f) => String(f).endsWith('.css'))
      .flatMap((f) => {
        // Blank out comments first, keeping line numbers, so prose that
        // mentions .ax-card does not read as a rule that patches it.
        const text = readFileSync(join('src', String(f)), 'utf8').replace(
          /\/\*[\s\S]*?\*\//g,
          (m) => m.replace(/[^\n]/g, ' '),
        );
        return text
          .split('\n')
          .map((line, i) => ({ line, i }))
          .filter(({ line }) => /\.ax-[a-z-]+/.test(line))
          .map(({ line, i }) => `src/${f}:${i + 1} — ${line.trim()}`);
      });
    expect(offenders).toEqual([]);
  });

  test('renders no emoji', () => {
    wrap();
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
