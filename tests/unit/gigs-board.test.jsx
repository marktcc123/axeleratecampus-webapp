import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import MissionTile from '../../src/app/parts/MissionTile.jsx';
import FeaturedCard from '../../src/app/parts/FeaturedCard.jsx';
import GigsBoard from '../../src/app/screens/GigsBoard.jsx';
import Upcoming, { upcoming, passes, detail } from '../../src/app/parts/Upcoming.jsx';
import hub from '../../src/data/hub.example.json';
import { RsvpProvider, useRsvp, passPath } from '../../src/app/rsvp.jsx';
import Perks from '../../src/app/screens/Perks.jsx';
import { CartProvider } from '../../src/app/cart.jsx';
import quests from '../../src/data/quests.example.json';
import { usd } from '../../src/app/parts/Money.jsx';
import boardEvents from '../../src/data/events.example.json';
// The catalogue as a screen sees it: the fixtures with the brand's name joined
// in from the brands table. The raw JSON carries `brandId` and no display name.
import { FIXTURES } from '../../src/app/content.jsx';
import { brandIndex, live, brandPath, tagline } from '../../src/app/parts/Brands.jsx';
import { pickForYou, duration } from '../../src/app/parts/when.js';
import { cardTitle } from '../../src/app/parts/title.js';
import { ME } from '../../src/app/me.js';

const { brands: brandTable, missions, products } = FIXTURES;

const wrap = (ui) => render(<ProfileProvider><WalletProvider><MemoryRouter>{ui}</MemoryRouter></WalletProvider></ProfileProvider>);
const wrapBoard = () => wrap(<GigsBoard />);
// Brands live on Discover since 2026-09-17; the shop needs the cart provider
// the app shell gives it in production.
const wrapShop = () => wrap(<CartProvider><Perks /></CartProvider>);
const bySlug = (s) => missions.find((m) => m.slug === s);
const solra = bySlug('solra-unboxing-reel');
const dermabell = bySlug('dermabell-campus-launch');
const LOCKED = missions.filter((m) => m.minLevel > ME.level);

describe('MissionTile', () => {
  test('leads with the dollar figure (R1)', () => {
    wrap(<MissionTile mission={solra} />);
    // The pay pill is the first thing in the earn row, and the row is the
    // last block in the column — so the price is what a reader ends on and
    // an eye lands on. Assert the pill itself rather than DOM position.
    expect(screen.getByText('$25')).toBeInTheDocument();
  });

  test('the caps line carries the labels and not the when or where', () => {
    wrap(<MissionTile mission={solra} />);
    // The design replaced the row of Tag stickers with a single caps line, and
    // that line names what KIND of mission this is. `meta` used to trail the
    // labels — "45 min · flexible this week" — which put the schedule in the
    // one line that is not about the schedule.
    expect(screen.getByText('Digital · K-beauty')).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(solra.meta, 'i'))).toBeNull();
    expect(screen.getByRole('heading', { name: cardTitle(solra) })).toBeInTheDocument();
    expect(screen.getByText('+80 XP')).toBeInTheDocument();
  });

  test('the earn line is the pay and the XP, and nothing trails them', () => {
    // This used to assert a perk line appeared for solra and not for notely.
    // The line is gone: it was an empty string on four of five missions, so it
    // only ever drew for one, and the owner asked for that one to stop.
    wrap(<MissionTile mission={solra} />);
    expect(screen.getByText(usd(solra.payUsd))).toBeInTheDocument();
    expect(screen.getByText(`+${solra.xp.toLocaleString('en-US')} XP`)).toBeInTheDocument();
    expect(screen.queryByText(/keep the/)).not.toBeInTheDocument();
  });

  test('links to the mission detail route and carries the go affordance', () => {
    wrap(<MissionTile mission={solra} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/app/earn/${solra.slug}`);
    expect(link.querySelector('.card-go')).toHaveAttribute('aria-hidden', 'true');
  });

  test('names the brand on its own line and drops it from the title (owner, 2026-09-22)', () => {
    wrap(<MissionTile mission={solra} />);
    const tile = screen.getByTestId('mission-tile');
    // The brand is a name of its own, not the first word of the heading — so
    // the heading is the work alone, capitalised as a heading. A name only: the
    // disc it wore for an hour came off (owner, 2026-09-22: "不需要品牌的avatar").
    expect(within(tile).getByText('Solra')).toBeInTheDocument();
    expect(tile.querySelector('.mt__brand .avatar')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Unboxing reel on your feed' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: solra.title })).toBeNull();
  });

  test('a row reads brand, title, kind, then pay (owner, 2026-09-22)', () => {
    wrap(<MissionTile mission={solra} />);
    const col = screen.getByTestId('mission-tile').querySelector('.mt__col');
    const order = [...col.children].map((el) => el.className.split(' ')[0]);
    expect(order).toEqual(['mt__brand', 'mt__title', 'mt__caps', 'mt__earn']);
  });

  test('a locked row keeps that order, with the distance where the kind was', () => {
    wrap(<MissionTile mission={dermabell} locked={{ xpAway: 2620, missionsAway: 13 }} />);
    const col = screen.getByTestId('mission-tile').querySelector('.mt__col');
    const order = [...col.children].map((el) => el.className.split(' ')[0]);
    expect(order).toEqual(['mt__brand', 'mt__title', 'mt__caps', 'mt__earn']);
    expect(col.children[2]).toHaveTextContent(/2,620 XP away/);
  });

  test('keeps a title whole when it does not open with its brand', () => {
    // "Dermabell salon ambassador" belongs to Axelerate Beauty: nothing to drop.
    wrap(<MissionTile mission={dermabell} locked={{ xpAway: 2620, missionsAway: 13 }} />);
    const tile = screen.getByTestId('mission-tile');
    expect(within(tile).getByText('Axelerate Beauty')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: dermabell.title })).toBeInTheDocument();
  });

  test('a locked tile keeps its price and states the distance, never "locked" (R8), and opens its page', () => {
    wrap(<MissionTile mission={dermabell} locked={{ xpAway: 2620, missionsAway: 13 }} />);
    const tile = screen.getByTestId('mission-tile');
    expect(screen.getByText('$50')).toBeInTheDocument();
    expect(screen.getByText(/LV\.4 · 2,620 XP away/)).toBeInTheDocument();
    // The reward as well as the distance (owner, 2026-09-22: every mission on
    // the board reads pay AND XP). The caps line says how far; the earn line
    // says what the mission pays in XP once you get there.
    expect(screen.getByText('+1,000 XP')).toBeInTheDocument();
    expect(tile.textContent).not.toMatch(/locked/i);
    // Readable, not takeable (owner, 2026-09-21): the tile links to the
    // mission like any other; the detail page's bar is what withholds Apply
    // (tests/unit/gigs-detail.test.jsx).
    expect(tile.closest('a')).toHaveAttribute('href', `/app/earn/${dermabell.slug}`);
    expect(tile.dataset.locked).toBe('true');
  });

  test('renders no emoji', () => {
    wrap(<MissionTile mission={dermabell} locked={{ xpAway: 620, missionsAway: 3 }} />);
    expect(screen.getByTestId('mission-tile').textContent)
      .not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('FeaturedCard', () => {
  test('reads the pay and then the XP, like a mission row (R1 leads, owner 2026-09-22)', () => {
    wrap(<FeaturedCard mission={solra} />);
    const card = screen.getByTestId('today-tile');
    expect(within(card).getByText('$25')).toBeInTheDocument();
    const xp = within(card).getByText('+80 XP');
    // Cash leads in the DOM as in the eye: the XP sits right after the pay.
    expect(xp.previousElementSibling).toHaveTextContent('$25');
  });

  test('names the brand on its own line above a title without it', () => {
    // "August — run the tea tasting table" is August Uncommon Tea's: the
    // title's lead is the brand's first word, so it goes, and the line says
    // the whole name.
    const august = bySlug('august-tea-tasting-table');
    wrap(<FeaturedCard mission={august} />);
    const card = screen.getByTestId('today-tile');
    expect(within(card).getByText('August Uncommon Tea')).toBeInTheDocument();
    expect(card.querySelector('.ph__brand .avatar')).toBeNull();
    expect(within(card).getByRole('heading', { name: 'Run the tea tasting table' })).toBeInTheDocument();
  });

  test('a mission published without XP says nothing rather than "+0 XP"', () => {
    wrap(<FeaturedCard mission={{ ...solra, xp: 0 }} />);
    const card = screen.getByTestId('today-tile');
    expect(within(card).getByText('$25')).toBeInTheDocument();
    expect(within(card).queryByText(/XP/)).toBeNull();
  });
});

describe('GigsBoard', () => {
  test('renders the header and the missions heading', () => {
    wrap(<GigsBoard />);
    expect(screen.getByRole('img', { name: 'Axelerate' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Inbox/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Missions' })).toBeInTheDocument();
    // Brands moved to Discover (2026-09-17); the board must not keep a copy.
    expect(screen.queryByRole('heading', { name: 'Brands' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Active quests' })).toBeNull();   // hidden (owner, 2026-09-08)
  });

  test('opens on All, showing every mission with the out-of-reach ones locked', () => {
    wrap(<GigsBoard />);
    const tiles = screen.getAllByTestId('mission-tile');
    expect(tiles).toHaveLength(missions.length);
    expect(tiles.filter((t) => t.dataset.locked === 'true')).toHaveLength(LOCKED.length);
  });

  test('format tabs filter the tiles', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('tab', { name: /Digital/ }));
    const titles = screen.getAllByTestId('mission-tile').map((t) => within(t).getByRole('heading').textContent);
    // Every Digital mission and nothing else, in the board's order.
    expect(titles).toEqual(missions.filter((m) => m.tags.some((t) => t.label === 'Digital')).map(cardTitle));
    expect(titles).toContain(cardTitle(solra));
  });

  test('the tab counts match what each filter shows', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    for (const [label, n] of [['All', 8], ['Digital', 2], ['Physical', 6], ['K-beauty', 2]]) {
      await user.click(screen.getByRole('tab', { name: new RegExp(label) }));
      expect(screen.getAllByTestId('mission-tile'), label).toHaveLength(n);
      expect(screen.getByRole('tab', { selected: true }).textContent).toBe(`${label}${n}`);
    }
  });

  test('the K-beauty tab filters by tag rather than format', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('tab', { name: /K-beauty/ }));
    const titles = screen.getAllByTestId('mission-tile').map((t) => within(t).getByRole('heading').textContent);
    // One Digital and one Physical, so the tab cannot be a format in disguise.
    expect(titles).toEqual([cardTitle(solra), cardTitle(dermabell)]);
  });

  test('every tag shown on a tile is reachable from some tab', () => {
    wrap(<GigsBoard />);
    // A mission tagged Physical that the Physical tab hides reads as a broken
    // filter. This is the guard on format and tags agreeing.
    const FORMAT_OF = { content: 'Digital', sales: 'Digital', field: 'Physical', event: 'Physical' };
    for (const m of missions) {
      const shown = m.tags.map((t) => t.label);
      if (shown.includes('Physical') || shown.includes('Digital')) {
        expect(shown, `${m.slug}`).toContain(FORMAT_OF[m.format]);
      }
    }
  });

  test('filter chips toggle independently and are pressed when on', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('button', { name: '$25+' }));
    expect(screen.getByRole('button', { name: '$25+' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('the $25+ chip removes cheaper missions', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('button', { name: '$25+' }));
    const tiles = screen.getAllByTestId('mission-tile');
    expect(tiles).toHaveLength(missions.filter((m) => m.payUsd >= 25).length);
    for (const t of tiles) expect(t.textContent).not.toMatch(/\$18\b/);
  });

  test('filtering to nothing names the active filters instead of going blank', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    // Physical missions are all either under $25 or over an hour, so this
    // combination genuinely empties the board.
    await user.click(screen.getByRole('tab', { name: /Physical/ }));
    await user.click(screen.getByRole('button', { name: '$25+' }));
    await user.click(screen.getByRole('button', { name: 'Under 1 hr' }));
    expect(screen.queryAllByTestId('mission-tile')).toHaveLength(0);
    const panel = document.getElementById('gigs-grid');
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel.textContent).toMatch(/No missions match/);
    expect(panel.textContent).toMatch(/Physical, \$25\+ and Under 1 hr are on/);
  });

  test('the empty state names two filters without a serial comma', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('tab', { name: /Digital/ }));
    await user.click(screen.getByRole('button', { name: 'This week' }));
    await user.click(screen.getByRole('button', { name: '$25+' }));
    // Digital's only mission is $25 and due this week, so this still shows it.
    expect(screen.getAllByTestId('mission-tile')).toHaveLength(1);
  });

  test('clear filters brings the whole board back', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('tab', { name: /Physical/ }));
    await user.click(screen.getByRole('button', { name: '$25+' }));
    await user.click(screen.getByRole('button', { name: 'Under 1 hr' }));
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByTestId('mission-tile')).toHaveLength(missions.length);
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe(`All${missions.length}`);
    expect(screen.getByRole('button', { name: '$25+' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('there is no empty state or clear-filters button while tiles are showing', () => {
    wrap(<GigsBoard />);
    expect(screen.queryByText(/No missions match/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  test('a screen reader is told the result count on every filter change', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    const status = () => screen.getByRole('status');
    expect(status()).toHaveTextContent('8 missions');
    await user.click(screen.getByRole('tab', { name: /Digital/ }));
    expect(status()).toHaveTextContent('2 missions');
    await user.click(screen.getByRole('tab', { name: /Physical/ }));
    expect(status()).toHaveTextContent('6 missions');
    await user.click(screen.getByRole('button', { name: '$25+' }));
    await user.click(screen.getByRole('button', { name: 'Under 1 hr' }));
    expect(status()).toHaveTextContent('0 missions');
  });

  const wrapQuests = () => render(<ProfileProvider><WalletProvider><MemoryRouter initialEntries={['/app/earn?quests=all']}><GigsBoard /></MemoryRouter></WalletProvider></ProfileProvider>);

  // ?quests opens every quest, and nothing else does — which since 2026-09-21
  // means nothing in the app opens it at all: the header flame that carried
  // this URL came off at the owner's request. The sheet still answers, so it
  // is reachable by URL and by a bookmark, and it is asserted here rather than
  // quietly deleted, because an orphaned screen is the kind of thing that goes
  // unnoticed until someone asks where the quests went.
  test('?quests opens every quest, and nothing in the app links to it any more', () => {
    wrap(<GigsBoard />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View all' })).toBeNull();     // the deck and its button are hidden
    expect(screen.queryByRole('link', { name: 'Quests' })).toBeNull();
    cleanup();
    wrapQuests();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('All quests')).toBeInTheDocument();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Stay tuned. These are examples.');
    expect(within(dialog).getAllByTestId('quest-row')).toHaveLength(quests.length);
    for (const q of quests) {
      expect(within(dialog).getByRole('heading', { name: q.title })).toBeInTheDocument();
      expect(within(dialog).getByText(q.reward)).toBeInTheDocument();
    }
  });

  test('the quest dialog takes focus and Tab cannot leave it', async () => {
    const user = userEvent.setup();
    wrapQuests();
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  test('Escape closes the quest dialog', async () => {
    const user = userEvent.setup();
    wrapQuests();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('the quest dialog resolves its dots to tokens, never hex', () => {
    const { container } = wrapQuests();
    const dots = [...container.querySelectorAll('.qa__dot')];
    expect(dots).toHaveLength(quests.length);
    for (const d of dots) expect(d.getAttribute('style')).toMatch(/var\(--[a-z0-9-]+\)/);
  });

  test('the tile grid is the region the format tabs control', () => {
    wrap(<GigsBoard />);
    const panel = document.getElementById('gigs-grid');
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', 'fmt-tab-All');
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-controls', 'gigs-grid');
  });
});

describe('Events on Discover (moved 2026-09-17)', () => {
  test('one card per event, under an Events heading', () => {
    wrapShop();
    const section = screen.getByRole('region', { name: 'Events' });
    expect(within(section).getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(within(section).getAllByTestId('board-event')).toHaveLength(boardEvents.length);
  });

  test('each card carries the place, the title and the time — seats only when there are none', () => {
    wrapShop();
    const cards = screen.getAllByTestId('board-event');
    for (const [i, e] of boardEvents.entries()) {
      const c = cards[i];
      expect(within(c).getByText(`${e.kind} · ${e.place}`)).toBeInTheDocument();
      expect(within(c).getByRole('heading', { name: e.title })).toBeInTheDocument();
      // The time where the seat count was (owner, 2026-09-08), with a clock.
      // ev8 is the one sold-out event; it says so after the time.
      const when = c.querySelector('.ev-c__when');
      expect(when).toHaveTextContent(e.time);
      expect(when.querySelector('.ax-icon')).not.toBeNull();
      if (e.seatsLeft === 0) expect(when).toHaveTextContent(/sold out/);
      else expect(when).not.toHaveTextContent(/seat/);
    }
  });

  // The "these are not links" assertion lived here. It was right while the
  // cards had no destination; Task 3 gave them one.

  test('an event carries no card at all, and no inline override of one', () => {
    // These used to be design-system Cards. The owner asked for no ground and
    // no padding, only the gap between events — and a card with neither is not
    // a card, so they are plain divs now. The guard this replaces protected the
    // real rule, which still holds: never reach past an ax-* component to null
    // its own styling (PRODUCT.md Principle 5). Not using it is the way to have
    // no card; overriding it is not.
    const { container } = wrapShop();
    expect(container.querySelectorAll('.gb__events .ax-card')).toHaveLength(0);
    for (const row of container.querySelectorAll('[data-testid="board-event"]')) {
      const style = row.getAttribute('style') || '';
      expect(style).not.toMatch(/box-shadow|background|padding/);
    }
  });

  test('these are open events, not the tickets on /me/events', () => {
    const { container } = wrapShop();
    // This used to assert one hub title was absent from the board. Two of the
    // three tickets on /me/events now name real listings — that is what makes
    // a ticket's "Event details" link possible — so a title match proves
    // nothing. What must hold is the destination: an events card on the board
    // opens the LISTING, never somebody's ticket.
    const cards = [...container.querySelectorAll('[data-testid="board-event"]')];
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.getAttribute('href')).toMatch(/^\/app\/earn\/events\//);
    }
  });
});

describe('Discover events lead somewhere', () => {
  test('each card is a link to its detail', () => {
    const { container } = wrapShop();
    const cards = [...container.querySelectorAll('[data-testid="board-event"]')];
    expect(cards).toHaveLength(boardEvents.length);
    for (const [i, card] of cards.entries()) {
      expect(card.tagName).toBe('A');
      expect(card).toHaveAttribute('href', `/app/earn/events/${boardEvents[i].id}`);
      // No interactive element nested inside the link — would be invalid HTML.
      // Every kind of them, not just links and buttons: an <input> or anything
      // carrying [tabindex] is the same bug and slipped straight past a
      // two-role check.
      expect(card.querySelectorAll('a,button,input,select,textarea,[tabindex]')).toHaveLength(0);
    }
  });
});

describe('Brands (owner, 2026-09-08; on Discover since 2026-09-17)', () => {
  const brands = brandIndex(brandTable, missions, products).filter(live);

  test('one disc per brand on Discover, missions first, names shown', () => {
    wrapShop();
    const discs = screen.getAllByTestId('brand');
    const names = new Set([...missions.map((m) => m.brand), ...products.map((p) => p.brand)]);
    expect(discs).toHaveLength(names.size);
    for (const b of brands) expect(within(screen.getByRole('list', { name: 'Brands' })).getByText(b.name)).toBeInTheDocument();
    const firstHasMissions = brands[0].missions.length > 0, lastHasMissions = brands[brands.length - 1].missions.length > 0;
    expect(firstHasMissions).toBe(true);
    expect(lastHasMissions).toBe(false);          // shop-only brands sink
  });

  test('a brand with nothing live has no disc, and every disc names a table row', () => {
    wrapShop();
    const all = brandIndex(brandTable, missions, products);
    expect(all.length).toBeGreaterThanOrEqual(brands.length);
    for (const b of all.filter((x) => !live(x))) {
      expect(screen.queryByText(b.name), `${b.name} has nothing live`).toBeNull();
    }
    for (const disc of screen.getAllByTestId('brand')) {
      const href = disc.getAttribute('href');
      expect(brandTable.some((b) => brandPath(b.id) === href), href).toBe(true);
    }
  });

  test('the discs run through the six accents in row order', () => {
    const { container } = wrapShop();
    const discs = [...container.querySelectorAll('.br__row .avatar')];
    const tones = ['coral', 'orange', 'pink', 'blush', 'lavender', 'yellow'];
    discs.forEach((d, i) => expect(d.getAttribute('style')).toContain(`var(--accent-${tones[i % 6]})`));
  });

  // Cards since 2026-09-21 (owner): the disc, the name, one line from the
  // brand's own blurb, and how many missions it has — the count, where the
  // reference showed a mission's pay.
  test('each card says how many missions the brand has, and one line about it', () => {
    wrapShop();
    const cards = screen.getAllByTestId('brand');
    for (const [i, card] of cards.entries()) {
      const b = brands[i];
      const n = within(card).getByTestId('brand-missions');
      expect(n).toHaveTextContent(`${b.missions.length} ${b.missions.length === 1 ? 'mission' : 'missions'}`);
      // No price on the card: pay is a mission's fact, not a brand's.
      expect(card.textContent).not.toMatch(/\$\d/);
      // The line is the blurb's first sentence, read rather than retyped.
      expect(within(card).getByText(tagline(b))).toBeInTheDocument();
    }
    // The fixture has to carry both forms — a brand with a mission and one with
    // none — for the count to be tested rather than assumed. (Today every live
    // brand has one or none; that is the catalogue, not the code.)
    expect(brands.some((b) => b.missions.length >= 1)).toBe(true);
    expect(brands.some((b) => b.missions.length === 0)).toBe(true);
  });

  test('each disc is a link to the brand\'s page — a sub-page, not a pop-up (owner, 2026-09-09)', () => {
    wrapShop();
    for (const b of brands) {
      const link = screen.getByRole('link', { name: new RegExp(`^${b.name} —`) });
      expect(link).toHaveAttribute('href', brandPath(b.id));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the board leads with today (owner, 2026-09-09)', () => {
  test('three to four "worth your time today" tiles sit first, cash leading, each a mission page link', () => {
    const { container } = wrap(<GigsBoard />);
    const picks = pickForYou(missions, (m) => (m.minLevel <= ME.level ? undefined : { xpAway: 1 }));
    const tiles = screen.getAllByTestId('today-tile');
    // A cap, not a quota: up to four, and never more than the board can offer.
    expect(tiles.length).toBeGreaterThanOrEqual(3);
    expect(tiles.length).toBeLessThanOrEqual(4);
    expect(tiles).toHaveLength(picks.length);
    tiles.forEach((tile, i) => {
      expect(tile).toHaveAttribute('href', `/app/earn/${picks[i].slug}`);
      expect(tile).toHaveTextContent(usd(picks[i].payUsd));
      expect(tile).toHaveTextContent(duration(picks[i].hours));
      expect(tile).toHaveTextContent(cardTitle(picks[i]));
    });
    // Upcoming moved to Me (owner, 2026-09-21); the board is Featured, then Missions.
    expect(screen.queryByRole('heading', { name: 'Upcoming' })).toBeNull();
    const present = ['Featured', 'Missions'].filter((n) => screen.queryByRole('heading', { name: n }));
    expect(present).toEqual(['Featured', 'Missions']);
    const order = present.map((n) => screen.getByRole('heading', { name: n }));
    for (let i = 1; i < order.length; i++) {
      expect(Boolean(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING), `${order[i - 1].textContent} before ${order[i].textContent}`).toBe(true);
    }
    expect(container.querySelectorAll('[data-testid="mission-tile"]')).toHaveLength(missions.length);   // the lead is not one of the rows
  });

  test('six missions the student can take, and a push to Discover after the third row (owner, 2026-09-21)', () => {
    const { container } = wrap(<GigsBoard />);
    expect(missions.filter((m) => m.minLevel <= ME.level)).toHaveLength(6);
    const grid = container.querySelector('#gigs-grid');
    const kids = [...grid.children];
    // Third tile, then the push, then the fourth tile — and the push is not a tile.
    expect(kids[3]).toBe(screen.getByTestId('board-push'));
    expect(kids[2].querySelector('[data-testid="mission-tile"]') ?? kids[2]).toBeTruthy();
    expect(screen.getByTestId('board-push')).toHaveAttribute('href', '/app/shop');
    expect(screen.getByTestId('board-push')).toHaveTextContent('Looking for something you actually want to work on?');
    expect(screen.getByTestId('board-push')).toHaveTextContent(/Discover brands on your campus/);
    expect(screen.getAllByTestId('mission-tile')).toHaveLength(missions.length);
    expect(screen.getAllByTestId('board-push')).toHaveLength(1);
  });

  test('the rows do not repeat how long and by when — that is the lead\'s and the page\'s (owner, 2026-09-09)', () => {
    wrap(<GigsBoard />);
    for (const row of screen.getAllByTestId('mission-tile')) expect(row).not.toHaveTextContent(/\bby [A-Z][a-z]{2}, /);
  });
});

describe('Upcoming (owner, 2026-09-21)', () => {
  // A fixed clock, so the cut-off is a fact of the test and not of the day it
  // happens to run on.
  const NOW = new Date(2026, 8, 21);   // 21 Sep 2026, local
  const wrapUp = (ui) => render(<ProfileProvider><WalletProvider><MemoryRouter>{ui}</MemoryRouter></WalletProvider></ProfileProvider>);
  const byId = (id) => boardEvents.find((e) => e.id === id);

  test('is the passes the student holds that are still to come, soonest first, never a past one', () => {
    const list = upcoming(passes(), NOW);
    expect(list.length).toBeGreaterThan(0);
    for (const t of list) {
      expect(t.past, t.title).toBe(false);
      expect(t.date >= '2026-09-21', t.title).toBe(true);
    }
    expect(list.map((t) => t.date)).toEqual([...list.map((t) => t.date)].sort());
    // Something is behind us in the fixture, or this test asserts nothing:
    // a pass marked past, and one whose date has gone by unmarked.
    expect(hub.events.some((e) => e.past)).toBe(true);
    expect(hub.events.some((e) => !e.past && e.date < '2026-09-21')).toBe(true);
    // The row is the student's own passes, not the board's events.
    for (const t of list) expect(hub.events).toContain(t);
  });

  test('each card: the title opens the event, the Show ticket strip opens the ticket, nothing nests', () => {
    wrapUp(<Upcoming events={boardEvents} now={NOW} />);
    const list = upcoming(passes(), NOW);
    const cards = screen.getAllByTestId('upcoming-card');
    expect(cards).toHaveLength(list.length);
    cards.forEach((card, i) => {
      const t = list[i];
      const ev = byId(t.eventId);
      const event = within(card).getByTestId('upcoming-event');
      const strip = within(card).getByTestId('upcoming-tickets');
      expect(event).toHaveAttribute('href', `/app/earn/events/${t.eventId}`);
      expect(event).toHaveTextContent(t.title);
      expect(strip).toHaveAttribute('href', passPath(t));
      // The glyph and "Ticket" on a line (owner, 2026-09-21); "Show" is the
      // screen reader's, so the link still names its action.
      expect(strip).toHaveTextContent(/^Show Ticket$/);
      expect(strip.querySelector('.po__strip-ico')).not.toBeNull();
      // The date block carries the time (owner, 2026-09-21); the line under
      // the title is the address, not the time or a length.
      const date = card.querySelector('.po__date');
      expect(date).toHaveTextContent(String(Number(t.date.slice(-2))));
      expect(date).toHaveTextContent(ev.time);
      expect(card.querySelector('.po__caps')).toHaveTextContent(ev.venue ?? ev.place);
      // Just the title beside the block (owner, 2026-09-21): no kind line.
      expect(card).not.toHaveTextContent(/\bIRL\b|\bOnline\b/);
      // Month over day over time, in that order.
      expect(date.textContent).toMatch(new RegExp(`^[A-Z][a-z]{2}${Number(t.date.slice(-2))}`));
      expect(card).not.toHaveTextContent(/Get ticket|Sold out|seats? left|\+\d+ going|\d+ hr\b/);
      // Two links, side by side; neither holds a control.
      expect(within(card).getAllByRole('link')).toHaveLength(2);
      for (const a of within(card).getAllByRole('link')) expect(a.querySelectorAll('a,button,input,[tabindex]')).toHaveLength(0);
    });
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('the strip tells the ticket where it came from, so its back is Me (owner, 2026-09-21)', async () => {
    const user = userEvent.setup();
    const Probe = () => { const { state, pathname } = useLocation(); return <p data-testid="probe">{pathname} from {state?.from ?? 'nowhere'}</p>; };
    render(<ProfileProvider><WalletProvider><MemoryRouter initialEntries={['/app/me']}>
      <Routes>
        <Route path="/app/me" element={<Upcoming events={boardEvents} now={NOW} />} />
        <Route path="/app/me/tickets/:date" element={<Probe />} />
      </Routes>
    </MemoryRouter></WalletProvider></ProfileProvider>);
    const [t] = upcoming(passes(), NOW);
    await user.click(screen.getAllByTestId('upcoming-tickets')[0]);
    expect(screen.getByTestId('probe')).toHaveTextContent(`/app/me/tickets/${t.eventId} from /app/me`);
  });

  test('a seat saved this session joins the row, and one the fixture already holds is not doubled', () => {
    const fresh = boardEvents.find((e) => e.date >= '2026-09-21' && !hub.events.some((h) => h.eventId === e.id));
    const held = boardEvents.find((e) => hub.events.some((h) => h.eventId === e.id && !h.past && h.date >= '2026-09-21'));
    expect(fresh && held, 'the fixture needs an unheld and a held upcoming event').toBeTruthy();
    const Save = () => {
      const { attend } = useRsvp();
      useEffect(() => { attend(fresh, { name: 'Priya', message: '' }); attend(held, { name: 'Priya', message: '' }); }, [attend]);
      return null;
    };
    wrapUp(<RsvpProvider><Save /><Upcoming events={boardEvents} now={NOW} /></RsvpProvider>);
    const hrefs = screen.getAllByTestId('upcoming-tickets').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`/app/me/tickets/${fresh.id}`);
    expect(hrefs.filter((h) => h === `/app/me/tickets/${held.id}`)).toHaveLength(1);
    // Soonest first still holds with the saved seat in the mix.
    const dates = screen.getAllByTestId('upcoming-card').map((c) => c.querySelector('.po__date b').textContent);
    expect(dates.map(Number)).toEqual([...dates.map(Number)].sort((a, b) => a - b));
  });

  test('a pass whose event has left the board still says where and when, off its own line', () => {
    const t = { title: 'Pop-up', meta: 'Kerckhoff patio · 3–5pm', status: 'going', past: false, date: '2026-09-30', eventId: 'gone', cover: 'event-demo-table' };
    expect(detail(t, boardEvents)).toMatchObject({ where: 'Kerckhoff patio', time: '3–5pm' });
  });

  test('renders nothing at all once nothing is coming', () => {
    const { container } = wrapUp(<Upcoming events={boardEvents} now={new Date(2030, 0, 1)} />);
    expect(container.querySelector('.up')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Upcoming' })).toBeNull();
  });
});
