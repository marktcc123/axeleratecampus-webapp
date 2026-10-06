import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import FormatTabs from '../parts/FormatTabs.jsx';
import ShopFilterSheet, { applyFilters, activeCount } from '../parts/ShopFilterSheet.jsx';
import SearchTools from '../parts/SearchTools.jsx';
import { cover } from '../parts/cover.js';
import { fromPrice } from '../../lib/adapters/catalog.js';
import ImageSlot from '../ImageSlot.jsx';
import AppHeader from '../AppHeader.jsx';
import { useContent } from '../content.jsx';

// "Sep 8" from the fixture's ISO date, built from its parts so the day never
// slips across midnight UTC into the day before.
function dayLabel(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

import { brandIndex, live, BrandRow, searchBrands } from '../parts/Brands.jsx';
import GiftSheet from '../parts/GiftSheet.jsx';
import { useCart } from '../cart.jsx';
import './perks-shop.css';
import './screens.css';

// Three tabs, in the owner's order (2026-09-21): the shop opens on Trending
// now, and All is the one you come back to. Single-select — a product belongs
// to one collection, so two on at once would mean nothing.
//
// Trending now is a SORT over the whole catalogue, not a slice of it: nothing
// in the data marks a product as trending, and inventing a flag would mean a
// list that is only as current as the last person to edit it. What the shop
// does know is what students are reviewing, so that is what it reads.
const COLLECTIONS = ['Trending now', 'Dorm collection', 'All'];
const TRENDING = 'Trending now';

// How recently a product was last reviewed, and how many reviews it has. Both,
// because either alone gets it wrong: a single fresh review would out-rank a
// product with twenty, and twenty old ones would out-rank the thing everyone
// bought this week. Recency leads, count breaks ties.
function trendRank(p) {
  const dates = (p.reviews ?? []).map((r) => Date.parse(r.date)).filter(Number.isFinite);
  return { last: dates.length ? Math.max(...dates) : -Infinity, n: dates.length };
}

// Everything, ordered. Not a filter, so the tab can never come up empty — and
// a product nobody has reviewed yet still appears, at the end, rather than
// being hidden from the view the shop opens on.
function byTrend(products) {
  return [...products].sort((a, b) => {
    const x = trendRank(a);
    const y = trendRank(b);
    return (y.last - x.last) || (y.n - x.n);
  });
}

// What a tab shows, before the filter sheet narrows it further.
const inCollection = (products, c) => (
  c === 'All' ? products
    : c === TRENDING ? byTrend(products)
      : products.filter((p) => p.topic === c)
);

// Prices carry cents only when they have them: $39, not $39.00.
const price = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const cardPrice = (product) => {
  const low = fromPrice(product);
  return { from: low != null, amount: low ?? product.priceUsd };
};

// The next Friday 20:00 in the viewer's own zone. A hard-coded countdown that
// never moved would be a lie, and a real one needs no backend.
function nextDrop(now) {
  const d = new Date(now);
  d.setHours(20, 0, 0, 0);
  const until = (5 - d.getDay() + 7) % 7;      // 5 = Friday
  d.setDate(d.getDate() + (until === 0 && d <= now ? 7 : until));
  return d;
}

const split = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [
    ['days', Math.floor(s / 86400)],
    ['hrs', Math.floor(s / 3600) % 24],
    ['min', Math.floor(s / 60) % 60],
    ['sec', s % 60],
  ];
};

// One tick for the section; every piece's clock reads it, so they agree.
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// The clock rides on its piece (owner, 2026-09-08): it scrolls with the photo
// instead of sitting fixed over the stage. Every piece carries one — the drop
// has a single moment, so they all say the same thing — and only the first is
// the one the tests read.
function Countdown({ now, first = false }) {
  return (
    <div className="drop__clock" data-testid={first ? 'drop-countdown' : undefined}>
      {split(nextDrop(now) - now).map(([label, n]) => (
        <div key={label} className="drop__unit">
          <div className="drop__digits">
            {String(n).padStart(2, '0').split('').map((c, i) => (
              // The hairline is the flip-clock seam the design draws.
              <span key={i} className="drop__digit">{c}<span className="drop__seam" aria-hidden="true" /></span>
            ))}
          </div>
          <div className="drop__label">{label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Perks() {
  const { products, drop, brands, missions, events: boardEvents } = useContent();
  const navigate = useNavigate();
  const brandRow = useMemo(
    () => brandIndex(brands, missions, products).filter(live), [brands, missions, products],
  );
  // Chips rather than the folder-tab strip the shop used to carry, but the
  // same one-at-a-time behaviour: FilterChips wants a Set, so the selection is
  // a Set of one. Picking the chip that is already on does nothing — there is
  // no "nothing selected" state to fall into.
  const [collection, setCollection] = useState(TRENDING);
  // Everything else you can narrow by lives in the filter sheet (owner,
  // 2026-09-08): search, category, brand, availability. The collection chip
  // stays on the page; the sheet's rule is applyFilters, beside the sheet.
  const EMPTY = { q: '', category: 'All', brands: new Set(), availability: 'All' };
  const [filters, setFilters] = useState(EMPTY);
  const [sheet, setSheet] = useState(null);   // null | 'filter'
  const closeSheet = useCallback(() => setSheet(null), []);
  // Search lives in the tools row (owner, 2026-09-08): the glyph opens a field
  // that grows out of it, leftwards, and you type straight away (SearchTools).
  // The filter sheet carries no search box, so the Filter badge does not count q.
  const setQ = (q) => setFilters((f) => ({ ...f, q }));
  const filterN = activeCount({ ...filters, q: '' });
  // The Brands row has the same search (owner, 2026-09-22: "brands需要筛选项和
  // 搜索"; 2026-09-23: "不要filter了 只要搜索" — search alone, no sheet) with its
  // own query, so narrowing the brands never narrows the shop.
  const [brandQ, setBrandQ] = useState('');
  const shownBrands = useMemo(() => searchBrands(brandRow, brandQ), [brandRow, brandQ]);
  // Both lists follow the catalogue: the shop is editable from the console now,
  // so a product listed under a category or a brand the filter sheet had never
  // heard of would otherwise be unfilterable until a reload.
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const brandsAll = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products]);
  const { add, items } = useCart();
  const [gifting, setGifting] = useState(null);

  // Which piece is showing. Read off scrollLeft rather than kept in sync by
  // hand — the reel is the control, and this only follows it.
  const reelRef = useRef(null);
  const [piece, setPiece] = useState(0);
  const now = useNow();
  const onReelScroll = () => {
    const el = reelRef.current;
    if (!el) return;
    const pitch = el.scrollWidth / Math.max(1, drop.items.length);
    setPiece(Math.min(drop.items.length - 1, Math.round(el.scrollLeft / pitch)));
  };

  // A product can be in the cart under several sizes, so the card's badge is
  // the sum across its variants rather than one line's quantity.
  const inCart = useMemo(() => {
    const byId = new Map();
    for (const i of items) byId.set(i.id, (byId.get(i.id) ?? 0) + i.qty);
    return byId;
  }, [items]);

  // Sold-out cards sink below everything buyable: one you cannot act on should
  // not sit between two you can. Array.prototype.sort is stable, so the
  // fixture's own order survives inside each group.
  const shown = useMemo(() => {
    const list = applyFilters(inCollection(products, collection), filters);
    // !! first: in-stock products carry no `soldOut` key at all, so Number()
    // gave NaN and the comparator silently did nothing. No unit test caught it
    // — none asserts the order — only reading the rendered list did.
    //
    // Stable, so Trending now's order survives inside each group: sold-out
    // cards still sink, and everything buyable stays in the order the tab put
    // it in.
    return [...list].sort((a, b) => Number(!!a.soldOut) - Number(!!b.soldOut));
  }, [products, collection, filters]);

  return (
    <div className="scr shop">
      <AppHeader />


      {/* Events lead the page (2026-09-17, moved here from the board): they are
          dated and they sell out, so they are the thing that goes stale if you
          scroll past it. */}
      <section className="shop__events" aria-labelledby="events-h">
        <h2 id="events-h" className="shop__brands-title">Events</h2>
        <ul className="shop__ev-list">
          {boardEvents.map((e) => (
            <li key={e.id}>
              <Link
                to={`/app/earn/events/${e.id}`}
                className="ev-c"
                data-testid="board-event"
              >
                <div className="ev-c__photo"><ImageSlot label={e.photo} src={cover(e.cover)} radius={10} /></div>
                <div className="ev-c__text">
                  <p className="ev-c__caps">{e.kind} · {e.place}</p>
                  <h3 className="ev-c__title">{e.title}</h3>
                  {/* When, not how many seats (owner, 2026-09-08). The seat count
                      still decides the event page's own bar, where it drives
                      the action; here a sold-out one just says so after the time. */}
                  <p className="ev-c__when">
                    <Icon name="clock" size={13} className="ev-c__when-ico" />
                    {dayLabel(e.date)} · {e.time}{e.seatsLeft === 0 ? ' · sold out' : ''}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Brands sit under Events (2026-09-17, moved here from the board): who is
          on campus comes before what they are dropping this week. Only brands
          with something live get a disc — a brand an operator has onboarded
          before its first mission has a page, but nothing to show here yet. */}
      <section className="shop__brands" aria-labelledby="brands-title">
        {/* The heading and the search on one line (owner, 2026-09-23: "搜索能不能
            brands一行"): the glyph at the row's right, and the field it opens runs
            leftwards to the word, which stays. */}
        <div className="shop__brands-head">
          <h2 className="shop__brands-title" id="brands-title">Brands</h2>
          <SearchTools
            q={brandQ}
            onQ={setBrandQ}
            placeholder="Search brands" label="Search brands"
            ids={{ search: 'open-brand-search', field: 'search-brands' }}
          />
        </div>
        {shownBrands.length > 0 ? (
          <BrandRow brands={shownBrands} from="/app/shop" />
        ) : (
          // The shop's empty state, for the row: say what is on, offer the way back.
          <div className="shop__empty shop__empty--row" data-testid="brands-empty">
            <p className="shop__empty-title">No brands match “{brandQ.trim()}”.</p>
            <button type="button" className="shop__empty-clear" onClick={() => setBrandQ('')}>Clear search</button>
          </div>
        )}
      </section>

      <section className="drop" aria-labelledby="drop-title">
        <div className="drop__bar">
          <h2 id="drop-title" className="drop__title">Weekly drops</h2>
        </div>
        <div className="drop__body">
          {/* Three things have come off this block at the owner's request: the
              lede ("Every Friday at 8pm, a tiny batch goes live…"), the "This
              week: 2 pieces" heading with the rule that divided them, and now
              the "Next drop opens in" caps line above the clock. The heading
              names the drop and the clock says when. */}
          <div className="drop__stage">
            {/* One piece per view, as asked — the two-up grid made each one a
                thumbnail. tabIndex because a <ul> with overflow-x is not
                focusable on its own, so arrow keys would do nothing. */}
            <ul
              className="drop__reel"
              ref={reelRef}
              onScroll={onReelScroll}
              {...(drop.items.length > 1
                ? { tabIndex: 0, 'aria-label': `This week's drop — ${drop.items.length} pieces` }
                : {})}
            >
              {drop.items.map((it, i) => {
                const shown = cardPrice(it);
                return (
                <li key={it.title} className="dp" data-testid="drop-item">
                  {/* The piece opens as a product page with the cart locked
                      until the drop (owner, 2026-09-21). One link round the
                      whole card; nothing inside it is a control. */}
                  <Link to={`/app/shop/${it.id}`} className="dp__link" data-testid="drop-link">
                  <div className="dp__clock"><Countdown now={now} first={i === 0} /></div>
                  {/* The ratio is passed, not just set on the wrapper: ImageSlot
                      writes aspectRatio inline, and an inline style beats the
                      stylesheet — the wrapper went 4:3 while the slot inside
                      stayed square. */}
                  <div className="dp__photo">
                    <ImageSlot label={it.photo} src={cover(it.cover)} ratio="1 / 1" />
                  </div>
                  {/* On the photo, each line on its own block of colour, per the
                      reference the owner sent. The span is what carries the
                      block: `box-decoration-break: clone` in the CSS gives a
                      title that wraps one block per line rather than one long
                      ragged rectangle behind the lot. Ink on --accent-yellow
                      measures 16.65:1, so the highlight is what makes text on a
                      photograph legible whatever the photograph turns out to
                      be. */}
                  <div className="dp__lines">
                    <p className="dp__earn"><span>
                      {shown.from && <span className="dp__from">from </span>}
                      {price(shown.amount)}
                      {it.cap ? ` · ${it.cap}` : ''}
                    </span></p>
                    <h3 className="dp__title"><span>{it.title}</span></h3>
                  </div>
                  </Link>
                </li>
                );
              })}
            </ul>
          </div>

          {/* Presentation only: the reel itself is the control. */}
          {drop.items.length > 1 && (
            <div className="drop__dots" aria-hidden="true">
              {drop.items.map((it, i) => (
                <span key={it.title} className={i === piece ? 'drop__dot is-on' : 'drop__dot'} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Under the drop, at the owner's request. It means the drop's own h2
          reaches a screen reader before this h1 — the drop is a promoted module
          above the page's title, and the alternative was giving it a second
          h1. */}
      <div className="shop__head">
        {/* Still the page's h1. The drop's own h2 renders above it, which reads
            oddly in a heading outline; moving the drawn title above the drop is
            a layout change and belongs to the owner, not to a fix. What the
            detector actually flagged — the drop's h2 jumping to h4 — is fixed:
            its pieces are h3. (2026-09-10) */}
        <h1 className="scr__h1">Perks shop</h1>
      </div>

      {/* The board's folder tabs, not chips (owner, 2026-09-08): the shop's
          collections behave like the board's formats — one on at a time, with
          the count on the open one — so they should look like them too. Counts
          respect the sheet's filters, the way the grid does. */}
      <FormatTabs
        label="Collection"
        prefix="col"
        controls="shop-grid"
        formats={COLLECTIONS.map((c) => ({
          id: c,
          count: applyFilters(inCollection(products, c), filters).length,
        }))}
        value={collection}
        onChange={setCollection}
      />
      {/* The board's cream panel (owner, 2026-09-08): folder tabs only read as
          folders when there is a folder under them. Same construction as
          .gb__panel — no top margin, the tabs' -10px bites in. */}
      <div className="shop__panel">

      {/* Under the chips: the two ways into the sheet. Filter carries how many
          filters are on; Search opens in place with its field focused. */}
      <SearchTools
        q={filters.q}
        onQ={setQ}
        onFilter={() => setSheet('filter')}
        filterN={filterN}
        placeholder="Search perks" label="Search the shop"
        ids={{ filter: 'open-filters', search: 'open-search', field: 'search-shop' }}
      />

      <p className="shop__count" role="status">
        {`${shown.length} ${shown.length === 1 ? 'item' : 'items'}`}
      </p>

      <div id="shop-grid" className="shop__grid">
        {shown.length === 0 && (
          // The same shape the board's empty state takes: say what is on, and
          // offer the way back, rather than an empty grid.
          <div className="shop__empty" data-testid="shop-empty">
            <p className="shop__empty-title">No perks match{filters.q.trim() ? ` “${filters.q.trim()}”` : ' those filters'}.</p>
            <button type="button" className="shop__empty-clear" onClick={() => { setFilters(EMPTY); setCollection('All'); }}>
              Clear filters
            </button>
          </div>
        )}
        {shown.map((p) => (
          <div
            key={p.id}
            className="perk-card"
            data-testid="shop-item"
            data-sold-out={p.soldOut ? 'true' : 'false'}
          >
            {/* The card opens the product now, so the whole thing is one link
                and the bag button sits OUTSIDE it — a <button> inside an <a>
                is invalid, and nesting them makes the hit areas fight.
                `flat` rests with no shadow, because the panel behind already
                carries one, and `interactive="shadow"` raises it on hover
                without the ink wash — the colour shift the owner did not want. */}
            <Link to={`/app/shop/${p.id}`} className="perk-card__hit">
            {/* padding="none": the owner asked for the card's inner frame off,
                so the photo and the copy both meet its edges. */}
            <Card variant="flat" interactive="shadow" padding="none" className="pi">
              <div className="pi__photo">
                <ImageSlot label={p.photo} src={cover(p.covers?.[0])} />
                {p.soldOut && <span className="pi__flag">sold out</span>}
              </div>
              <p className="pi__brand">{p.brand}</p>
              <h3 className="pi__title">{p.title}</h3>
              <p className="pi__earn">
                <span className="pi__price">
                  {cardPrice(p).from && <span className="pi__from">from </span>}
                  {price(cardPrice(p).amount)}
                </span>
                {/* Only where there is any: not every product pays it, and a
                    "0% cashback" label is worse than none. The word is the
                    fixture's own (cashbackPct) and the owner's; note that what
                    it pays is CREDIT, which the wallet keeps apart from cash —
                    the product page spells that out under Ships and Returns. */}
                {p.cashbackPct > 0 && (
                  <span className="pi__back">{p.cashbackPct}% cashback</span>
                )}
              </p>
              {/* No stock count here at the owner's request — "883 left" on a
                  card nobody has decided about yet was noise. The product page
                  still carries it, where it bears on a quantity. Sold out is a
                  different fact and keeps its line. */}
              {p.soldOut && <p className="pi__stock">Back next drop</p>}
            </Card>
            </Link>
            {!p.soldOut && (
              /* Both controls on their own row along the card's foot. They sit
                 OUTSIDE the Link because a <button> inside an <a> is invalid
                 markup — the same reason the bag alone used to float over the
                 card's corner. Gift on the left, bag on the
                 right; DOM order follows the visual order rather than using flex
                 `order`, so a screen reader and the tab key meet them in the
                 order they are drawn. */
              <div className="pi__acts">
                <button
                  type="button"
                  className="pi__gift"
                  data-gift={p.id}
                  aria-label={`Send ${p.title} as a gift`}
                  onClick={() => setGifting(p)}
                >
                  {/* The label is a span so it can sit above the pill the
                      ::before draws, without z-index games on a bare text
                      node. */}
                  <span className="pi__gift-t">Gift it</span>
                </button>
                <button
                  type="button"
                  className="cart-go"
                  aria-label={
                    p.variantStock
                      ? `Choose ${(p.sizeLabel || 'option').toLowerCase()} for ${p.title}`
                      : inCart.get(p.id)
                        ? `Add ${p.title} to cart · ${inCart.get(p.id)} already in`
                        : `Add ${p.title} to cart`
                  }
                  onClick={() => {
                    if (p.variantStock) navigate(`/app/shop/${p.id}`);
                    else add(p.id);
                  }}
                >
                  {/* A plus, not a bag (owner, 2026-09-09): the bag is the cart itself,
                      in the FAB; this adds to it. The app's own glyph — the system
                      set has no plus. */}
                  <Icon name="plus" set="app" size={20} className="cart-go__ico" />
                  {/* Decorative: the number is already in the button's
                      accessible name, the same split .cart-fab__n makes. */}
                  {inCart.get(p.id) > 0 && (
                    <span className="cart-go__n" aria-hidden="true">{inCart.get(p.id)}</span>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* One sheet for the screen, not one per card. Closing returns focus to
          the button that opened it — found by its data-gift id rather than a
          ref map, since there are as many buttons as products. */}      </div>

      <ShopFilterSheet
        open={sheet === 'filter'}
        onClose={closeSheet}
        filters={filters}
        setFilters={setFilters}
        categories={categories}
        brands={brandsAll}
        count={shown.length}
      />
      <GiftSheet
        product={gifting}
        onClose={() => {
          const id = gifting?.id;
          setGifting(null);
          if (id) {
            requestAnimationFrame(() => {
              document.querySelector(`[data-gift="${id}"]`)?.focus();
            });
          }
        }}
      />
    </div>
  );
}
