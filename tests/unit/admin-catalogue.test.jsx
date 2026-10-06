import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from '../../src/App.jsx';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import brandsFixture from '../../src/data/brands.example.json';
import missionsFixture from '../../src/data/missions.example.json';
import eventsFixture from '../../src/data/events.example.json';
import shopFixture from '../../src/data/shop.example.json';
import admin from '../../src/data/admin.example.json';

// One router for the whole walk: the catalogue is session state, so the console
// and the board have to be the same mount for a change in one to reach the
// other. A second render() would be a second session, which is the thing this
// file exists to prove is no longer true.
const app = (path = '/app/me/admin/missions') => {
  const router = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
};

const dialog = () => within(screen.getByRole('dialog'));
const fill = async (user, testId, value) => {
  const field = dialog().getByTestId(testId);
  await user.clear(field);
  if (value) await user.type(field, value);
};
const choose = (user, testId, value) => user.selectOptions(dialog().getByTestId(testId), value);
const rowFor = (testId, text) => screen.getAllByTestId(testId).find((r) => r.textContent.includes(text));

describe('the console publishes what the student browses', () => {
  beforeEach(() => { sessionStorage.clear(); setUnlocked(true); });

  test('a brand added in the console gets a page, and a mission for it lands on the board', async () => {
    const user = userEvent.setup();
    const router = app('/app/me/admin/brands');
    expect(screen.getAllByTestId('brand-row')).toHaveLength(brandsFixture.length);

    await user.click(screen.getByRole('button', { name: 'Add brand' }));
    await fill(user, 'field-name', 'Halo');
    await fill(user, 'field-blurb', 'Sample tables and the tea behind them.');
    await user.click(screen.getByTestId('catalogue-save'));
    expect(screen.getAllByTestId('brand-row')).toHaveLength(brandsFixture.length + 1);

    // A brand with nothing behind it has a page and no disc on the board.
    await router.navigate('/app/earn/brands/halo');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Halo');
    expect(screen.getByText('Sample tables and the tea behind them.')).toBeInTheDocument();
    expect(screen.getByText('Nothing on the board right now.')).toBeInTheDocument();

    await router.navigate('/app/me/admin/missions');
    await user.click(screen.getByRole('button', { name: 'Add mission' }));
    await fill(user, 'field-title', 'Halo — sampling table at the union');
    await choose(user, 'field-brandId', 'halo');
    await fill(user, 'field-payUsd', '30');
    await user.click(screen.getByTestId('catalogue-save'));
    expect(screen.getAllByTestId('mission-row')).toHaveLength(missionsFixture.length + 1);

    await router.navigate('/app/earn');
    // getAllByText, not getByText: the board's Featured row carries three to
    // four missions and the grid below lists every mission, so a new one can
    // legitimately appear twice. What this test is about is that it reached the
    // student's board at all. A card names the brand on its own line and drops
    // it from the title (owner, 2026-09-22), so the board reads "Halo" and then
    // "Sampling table at the union"; the mission page below keeps the whole title.
    expect(screen.getAllByText('Sampling table at the union').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Halo').length).toBeGreaterThan(0);

    await router.navigate('/app/earn/halo-sampling-table-at-the-union');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Halo — sampling table at the union');
    expect(screen.getByText('$30')).toBeInTheDocument();
    // The host line is the brand's row, not a string copied onto the mission.
    expect(screen.getByRole('link', { name: 'Halo' })).toHaveAttribute('href', '/app/earn/brands/halo');
  });

  test('renaming a brand reaches the shop, the mission page and the queues, and its page does not move', async () => {
    const user = userEvent.setup();
    const router = app('/app/me/admin/brands');
    await user.click(within(rowFor('brand-row', 'Solra')).getByTestId('brand-edit'));
    await fill(user, 'field-name', 'Solra Drinks');
    await user.click(screen.getByTestId('catalogue-save'));

    await router.navigate('/app/shop/p7');
    expect(screen.getByText('Solra Drinks')).toBeInTheDocument();
    expect(screen.queryByText('Solra')).toBeNull();

    await router.navigate('/app/earn/solra-unboxing-reel');
    expect(screen.getByRole('link', { name: 'Solra Drinks' })).toBeInTheDocument();

    // The id is the address, so the link a student already has still answers.
    await router.navigate('/app/earn/brands/solra');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Solra Drinks');
  });

  test('a brand with a mission or a product behind it cannot be removed', async () => {
    const user = userEvent.setup();
    app('/app/me/admin/brands');
    const held = rowFor('brand-row', 'Solra');
    expect(within(held).getByTestId('brand-held')).toHaveTextContent('In use');
    expect(within(held).queryByTestId('brand-remove')).toBeNull();

    // One with nothing behind it can go, and does.
    await user.click(screen.getByRole('button', { name: 'Add brand' }));
    await fill(user, 'field-name', 'Halo');
    await user.click(screen.getByTestId('catalogue-save'));
    await user.click(within(rowFor('brand-row', 'Halo')).getByTestId('brand-remove'));
    expect(screen.getAllByTestId('brand-row')).toHaveLength(brandsFixture.length);
  });

  test('a price edited in the console is the price in the shop', async () => {
    const user = userEvent.setup();
    const router = app('/app/me/admin/shop');
    const target = shopFixture.products.find((p) => p.stock > 0);

    await user.click(within(rowFor('product-row', target.title)).getByTestId('product-edit'));
    await fill(user, 'field-priceUsd', '99');
    await user.click(screen.getByTestId('catalogue-save'));

    await router.navigate(`/app/shop/${target.id}`);
    expect(screen.getByText('$99')).toBeInTheDocument();
    expect(screen.queryByText(`$${target.priceUsd}`)).toBeNull();
  });

  test('a brand rate set in Cashback is the cashback the shop promises', async () => {
    const user = userEvent.setup();
    const router = app('/app/me/admin/cashback');
    // Italic's three towels disagree (0% and 10%), which is why the panel
    // groups by brand: one save settles all of them.
    const italic = shopFixture.products.filter((p) => p.brandId === 'italic');
    expect(new Set(italic.map((p) => p.cashbackPct)).size).toBeGreaterThan(1);

    await user.type(screen.getByLabelText('Italic rate, percent'), '25');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    for (const towel of italic) {
      await router.navigate(`/app/shop/${towel.id}`);
      expect(screen.getByText('25% cashback'), towel.id).toBeInTheDocument();
    }
  });

  test('an event closed in the console leaves the board', async () => {
    const user = userEvent.setup();
    const router = app('/app/me/admin/events');
    const target = eventsFixture[0];

    await user.click(within(rowFor('event-row', target.title)).getByTestId('event-close'));
    expect(screen.queryAllByTestId('event-row')).toHaveLength(eventsFixture.length - 1);

    await router.navigate('/app/earn');
    expect(screen.queryByText(target.title)).toBeNull();
  });

  test('the queues name the catalogue, so a rename reaches them', async () => {
    const user = userEvent.setup();
    const router = app('/app/me/admin/missions');
    const slug = admin.gig_applications[0].mission_slug;
    const target = missionsFixture.find((m) => m.slug === slug);

    // The queue starts out naming the mission, not a copy of its title.
    await router.navigate('/app/me/admin/gigs');
    expect(screen.getByText(target.title)).toBeInTheDocument();

    await router.navigate('/app/me/admin/missions');
    await user.click(within(rowFor('mission-row', target.title)).getByTestId('mission-edit'));
    await fill(user, 'field-title', 'Renamed in the console');
    await user.click(screen.getByTestId('catalogue-save'));

    await router.navigate('/app/me/admin/gigs');
    expect(screen.getByText('Renamed in the console')).toBeInTheDocument();
    expect(screen.queryByText(target.title)).toBeNull();
  });

  test('every row points at something that exists', () => {
    const brandIds = new Set(brandsFixture.map((b) => b.id));
    const slugs = new Set(missionsFixture.map((m) => m.slug));
    const eventIds = new Set(eventsFixture.map((e) => e.id));
    const productIds = new Set(shopFixture.products.map((p) => p.id));
    for (const m of missionsFixture) expect(brandIds.has(m.brandId), m.slug).toBe(true);
    for (const p of shopFixture.products) expect(brandIds.has(p.brandId), p.id).toBe(true);
    for (const r of admin.ugc_submissions) expect(slugs.has(r.mission_slug), r.id).toBe(true);
    for (const r of admin.gig_applications) expect(slugs.has(r.mission_slug), r.id).toBe(true);
    for (const r of admin.event_applications) expect(eventIds.has(r.event_id), r.id).toBe(true);
    for (const r of admin.reviews) expect(productIds.has(r.product_id), r.id).toBe(true);
    // And no row carries its own copy of a title or brand any more.
    const copies = ['mission_title', 'gig_title', 'event_title', 'product_title', 'brand'];
    for (const key of ['ugc_submissions', 'gig_applications', 'event_applications', 'reviews']) {
      for (const row of admin[key]) {
        for (const c of copies) expect(row, `${key}.${row.id}.${c}`).not.toHaveProperty(c);
      }
    }
  });
});
