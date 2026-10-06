import { Link } from 'react-router-dom';
import Avatar, { TONES } from '../Avatar.jsx';
import ImageSlot from '../ImageSlot.jsx';
import MissionTile from './MissionTile.jsx';
import { cover } from './cover.js';
import { distanceTo } from '../me.js';
import { useStanding } from '../account.jsx';
import { fromPrice, httpUrl } from '../../lib/adapters/catalog.js';
import { usd } from './Money.jsx';
import './brands.css';

// Every brand, with what it has on the board and in the shop. Identity — the
// name, how it is described as a host, its words and its art — comes off the
// brands table (content.jsx); the two lists are matched to it by `brandId`.
// Until 2026-09-10 there was no table and a brand was whatever string its
// missions happened to share, so a brand could not be renamed, described or
// given a cover of its own.
//
// Brands you can work for now come first, then by name. A brand with nothing
// live sorts last and `live` keeps it off the board's row, but its page still
// answers: an operator onboards a brand before its first mission exists.
export function brandIndex(brands, missions, products) {
  const by = new Map(brands.map((b) => [b.id, { ...b, missions: [], products: [] }]));
  for (const m of missions) by.get(m.brandId)?.missions.push(m);
  for (const p of products) by.get(p.brandId)?.products.push(p);
  return [...by.values()]
    .sort((a, b) => (b.missions.length - a.missions.length) || a.name.localeCompare(b.name));
}

export const live = (b) => b.missions.length > 0 || b.products.length > 0;

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const what = (b) => `${count(b.missions.length, 'mission', 'missions')} · ${count(b.products.length, 'product', 'products')}`;
// The card's one line about the brand: the first sentence of its blurb, which
// on this table is the tagline and the rest is the story. Read, not retyped,
// so a brand renamed or redescribed in the console changes here too.
export const tagline = (b) => (b.blurb ?? '').trim().split(/(?<=[.!?])\s+/)[0] ?? '';
// The brand's address is its id: /app/earn/brands/axelerate-beauty. It is
// stored, not derived from the name, so renaming a brand does not move its page
// or break a link a student already has.
export const brandPath = (id) => `/app/earn/brands/${id}`;

// The brand's own site. Products carry it as brand_link_url; the first real
// http(s) address is the one the brand page's button opens.
export function brandSite(brand) {
  const own = httpUrl(brand?.siteUrl);
  if (own) return own;
  for (const product of brand?.products ?? []) {
    const url = httpUrl(product.siteUrl);
    if (url) return url;
  }
  return '';
}

// Discover's Brands row search (owner, 2026-09-22: "brands需要筛选项和搜索";
// 2026-09-23: "不要filter了 只要搜索" — the facet sheet that shipped for a day
// came off, search stayed). The name or the tagline, whatever the case.
export function searchBrands(brands, q = '') {
  const needle = q.trim().toLowerCase();
  if (!needle) return brands;
  return brands.filter((b) => `${b.name} ${tagline(b)}`.toLowerCase().includes(needle));
}

// The row on Discover, redrawn as cards (owner, 2026-09-21, from a reference):
// a white card per brand with its disc — the app's Avatar, so a brand without
// a logo gets its accent and initial like a person does — its name, one line
// about it, and how many missions it has on the board. The reference showed a
// mission's pay on that line; the owner asked for the count instead.
// Each card is a link to the brand's own page (owner, 2026-09-09: a sub-page,
// not a pop-up); `from` is where that page's Back returns to.
export function BrandRow({ brands, from = '/app/earn' }) {
  return (
    <ul className="br__row" aria-label="Brands">
      {brands.map((b, i) => (
        <li key={b.id} className="br__item">
          <Link to={brandPath(b.id)} state={{ from }} className="br__card" data-testid="brand" aria-label={`${b.name} — ${what(b)}`}>
            {/* The discs run through the six accents in row order (owner,
                2026-09-09) rather than each hashing its own, so the row reads
                as the palette. Positional, so it follows what is shown. */}
            <Avatar name={b.name} size={48} tone={TONES[i % TONES.length]} />
            <span className="br__name">{b.name}</span>
            <span className="br__tag">{tagline(b)}</span>
            {/* The count, in the brand hue, tabular so a row of cards lines up.
                Zero is said as zero: a brand can be live in the shop with
                nothing on the board, and that is the fact. */}
            <span className="br__n" data-testid="brand-missions">{count(b.missions.length, 'mission', 'missions')}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// The lists themselves, drawn by the brand's page (/app/earn/brands/:slug),
// reached from the board's discs and from a mission's host line.
export function BrandBody({ brand }) {
  // A mission row is out of reach above the student's level, as on the board.
  const standing = useStanding();
  const lockFor = (m) => (m.minLevel <= standing.level ? undefined : distanceTo(m.minLevel, standing.xp));
  return (
    <>
      <p className="bd__lab">Missions</p>
      {brand.missions.length > 0 ? (
        /* The board's own rows, bare (owner, 2026-09-09): same design, no ground. */
        <ul className="bd__tiles">
          {brand.missions.map((m) => (
            <li key={m.slug}><MissionTile mission={m} locked={lockFor(m)} bare linkTestId="brand-mission" /></li>
          ))}
        </ul>
      ) : <p className="bd__none">Nothing on the board right now.</p>}

      <p className="bd__lab">Products</p>
      {brand.products.length > 0 ? (
        /* The shop's card copy — photo, brand, title, price and cashback — two
           across, with no card under it. Sold out takes the price's place. */
        <ul className="bd__grid">
          {brand.products.map((p) => (
            <li key={p.id}>
              <Link className="bp-p" to={`/app/shop/${p.id}`} data-testid="brand-product">
                <ImageSlot label={p.photo} src={cover(p.covers?.[0])} radius={10} />
                <p className="bp-p__brand">{p.brand}</p>
                <h3 className="bp-p__title">{p.title}</h3>
                <p className="bp-p__earn">
                  {p.stock === 0
                    ? <span className="bp-p__price bp-p__price--out">Sold out</span>
                    : <span className="bp-p__price">
                        {fromPrice(p) != null && <span className="bp-p__from">from </span>}
                        {usd(fromPrice(p) ?? p.priceUsd)}
                      </span>}
                  {p.cashbackPct > 0 && p.stock !== 0 && <span className="bp-p__back">{p.cashbackPct}% cashback</span>}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="bd__none">Nothing in the shop yet.</p>}
    </>
  );
}
