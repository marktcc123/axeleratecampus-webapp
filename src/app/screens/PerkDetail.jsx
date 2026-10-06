import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import { useContent } from '../content.jsx';
import DetailTopBar from '../parts/DetailTopBar.jsx';
import { cover } from '../parts/cover.js';
import { brandPath } from '../parts/Brands.jsx';
import Avatar from '../Avatar.jsx';
import { usd } from '../parts/Money.jsx';
import { useCart } from '../cart.jsx';
import { useReviews } from '../reviews.jsx';
import { fromPrice, priceFor, stockFor } from '../../lib/adapters/catalog.js';
import GiftSheet from '../parts/GiftSheet.jsx';
import NotFoundPage from '../../pages/NotFoundPage.jsx';
import './perk-detail.css';
import './screens.css';

// One product, from H5.dc.html's perk detail.
//
// The product page has no tab header, so the cart lives on the cover bar,
// beside Share. Buy now adds this selection and opens the cart; it does not
// place the order.
const ASSURANCES = [
  { icon: 'rocket', text: 'Ships in 3–5 days to the campus desk' },
  { icon: 'tick-2', text: '30-day returns, no questions' },
];

// A rating is out of five, which is a real denominator, so five marks is an
// honest drawing of it — not a chart, and not an invented proportion.
function Stars({ rating, label }) {
  return (
    <span className="pd__stars" role="img" aria-label={label ?? `${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        // 'outline' is the set's real name; 'line' is not one, and Icon throws
        // on an unknown set rather than quietly rendering nothing.
        <Icon
          key={n}
          name="star"
          set={n <= Math.round(rating) ? 'solid' : 'outline'}
          size={14}
          className={n <= Math.round(rating) ? 'pd__star is-on' : 'pd__star'}
        />
      ))}
    </span>
  );
}

// "Friday 20:00" (the clock the drop's countdown parses) said the way a person
// would: "Friday 8pm".
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'NOSCRIPT']);
const KEEP_TAGS = new Set(['P', 'STRONG', 'B', 'EM', 'UL', 'OL', 'LI', 'BR']);

function introNodes(node, key) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    return text && text.trim() ? text : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  if (SKIP_TAGS.has(node.tagName)) return null;
  if (node.tagName === 'BR') return <br key={key} />;
  const children = [...node.childNodes].map((child, i) => introNodes(child, `${key}-${i}`)).filter((child) => child != null);
  if (!children.length) return null;
  if (!KEEP_TAGS.has(node.tagName)) return children;
  const Tag = node.tagName === 'B' ? 'strong' : node.tagName.toLowerCase();
  return <Tag key={key}>{children}</Tag>;
}

function Intro({ html, text }) {
  if (html && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = [...doc.body.childNodes].map((child, i) => introNodes(child, `n${i}`)).filter(Boolean);
    if (nodes.length) return <div className="pd__intro">{nodes}</div>;
  }
  if (!text) return null;
  return <p className="pd__intro">{text}</p>;
}

const dropTime = (s = '') => s.replace(/\b(\d{1,2}):(\d{2})\b/, (_, h, m) => {
  const hh = Number(h); const ap = hh >= 12 ? 'pm' : 'am'; const h12 = hh % 12 || 12;
  return m === '00' ? `${h12}${ap}` : `${h12}:${m}${ap}`;
});

export default function PerkDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { productById } = useContent();
  const p = productById(id);
  const { add } = useCart();
  // Only `added`: the write control moved to order history, so this page
  // reads reviews and never opens the sheet.
  const { added } = useReviews();

  // Real photography wins. A product with `covers` shows those and only those
  // — mixing one real shot with two dashed placeholders in the same row reads
  // as a broken gallery rather than art that has not arrived. Without any, the
  // labels stand in, and `photo` is the one-shot shorthand for `photos`.
  const shots = p?.covers?.length
    ? p.covers.map((name) => ({ key: name, label: p.photo, src: cover(name) }))
    : (p?.photos?.length ? p.photos : p ? [p.photo] : []).map((label) => ({ key: label, label }));
  const shotsRef = useRef(null);
  const [shot, setShot] = useState(0);
  const onShotScroll = () => {
    const el = shotsRef.current;
    if (!el) return;
    const first = el.querySelector('li');
    if (!first) return;
    // Pitch read off the DOM, gap included: hardcoding it drifted the events
    // row's dots the moment its stylesheet changed.
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const pitch = first.getBoundingClientRect().width + gap;
    setShot(Math.min(shots.length - 1, Math.round(el.scrollLeft / pitch)));
  };

  // Step one shot at a time. The row is the scroller, so this moves it rather
  // than holding an index of its own — the dots already read position off
  // scrollLeft, and two sources for "which shot" is one too many.
  const goShot = (delta) => {
    const el = shotsRef.current;
    const first = el?.querySelector('li');
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const pitch = first.getBoundingClientRect().width + gap;
    const next = Math.max(0, Math.min(shots.length - 1, shot + delta));
    el.scrollTo({ left: pitch * next, behavior: 'smooth' });
  };
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [gifting, setGifting] = useState(false);

  if (!p) return <NotFoundPage bare />;

  const sizes = p.sizes ?? [];
  const needsSize = sizes.length > 0;
  const choice = (p.sizeLabel || 'size').toLowerCase();
  const unitPrice = priceFor(p, size);
  // Until an option is chosen, the bar matches the card: "from" the cheapest.
  const from = size ? null : fromPrice(p);
  const unitStock = stockFor(p, size);
  const sizedStock = p.variantStock ? Object.values(p.variantStock) : null;
  const everySizeGone = sizedStock ? sizedStock.every((n) => n <= 0) : false;
  const sizeGone = Boolean(size) && unitStock <= 0;
  const unavailable = sizedStock ? (size ? sizeGone : everySizeGone) : Boolean(p.soldOut);
  // Stock is a real number in the fixture, so the stepper honours it: letting
  // someone add 900 of a thing with 883 left is a promise the shop cannot keep.
  const maxQty = Math.max(1, Math.min(unitStock || 1, 10));
  const reviews = p.reviews ?? [];
  // Averaged from the reviews themselves rather than stored beside them, so the
  // figure can never disagree with the list under it.
  const avg = reviews.length
    ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
    : null;
  const mine = added[p.id];
  // A piece of the weekly drop (content.jsx dropProduct): the page is the
  // shop's, the cart is locked until the drop opens (owner, 2026-09-21).
  const locked = Boolean(p.drop);
  const opens = locked ? dropTime(p.opensAt) : '';

  const addToCart = () => {
    add(p.id, size, qty);
    // Back to one, and back to no size: the next thing you add is a new
    // decision, not a repeat of the last one.
    setQty(1);
    setSize(null);
  };
  const buyNow = () => {
    add(p.id, size, qty);
    navigate('/app/cart');
  };
  const canBuy = !((needsSize && !size) || (Boolean(size) && unitStock <= 0));

  return (
    <div className="scr pd">
      <div className="pd__gallery">
        {/* Back and Share: the same fixed chips the mission and event pages
            wear (owner, 2026-09-09: one size of back button across the three). */}
        <DetailTopBar backTo="/app/shop" shareTitle={p.title} cart />
        {/* tabIndex so the row is genuinely keyboard-scrollable. A <ul> with
            overflow-x is not focusable on its own, so arrow keys do nothing —
            the board's events row carries a comment claiming otherwise and has
            no tabindex either. Only when there is more than one shot: a single
            image is not a scroller and should not take a tab stop. */}
        <ul
          className="pd__shots"
          ref={shotsRef}
          onScroll={onShotScroll}
          {...(shots.length > 1 ? { tabIndex: 0, 'aria-label': `${p.title} — ${shots.length} photos` } : {})}
        >
          {shots.map((sh) => (
            <li key={sh.key} className="pd__shot">
              <ImageSlot label={sh.label} src={sh.src} radius={18} />
            </li>
          ))}
        </ul>
        {(sizedStock ? everySizeGone : p.soldOut) && <span className="pd__flag">sold out</span>}
        {/* Only where there is somewhere to go. A disabled arrow parked on a
            photo is noise, and position is what the dots are for. */}
        {shots.length > 1 && shot > 0 && (
          <button
            type="button"
            className="pd__shot-nav pd__shot-nav--prev"
            aria-label="Previous photo"
            onClick={() => goShot(-1)}
          >
            <Icon name="arrow-left" size={18} />
          </button>
        )}
        {shots.length > 1 && shot < shots.length - 1 && (
          <button
            type="button"
            className="pd__shot-nav pd__shot-nav--next"
            aria-label="Next photo"
            onClick={() => goShot(1)}
          >
            <Icon name="arrow-right" size={18} />
          </button>
        )}
        {shots.length > 1 && (
          /* Presentation only: the row itself is the control, so these are not
             a second set of focus stops doing the same job. */
          <div className="pd__dots" aria-hidden="true">
            {shots.map((sh, i) => (
              <span key={sh.key} className={`pd__dot${i === shot ? ' is-on' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* The brand above the title as its disc and its name, one link to the
          brand's page (owner, 2026-09-23: bigger, with the avatar, tappable).
          The mission page's host line, in the app's Avatar — the disc the
          Discover brand cards wear. The brand page's Back comes back here. */}
      {p.brand && (
        <p className="pd__brand">
          <Link to={brandPath(p.brandId)} state={{ from: location.pathname }} className="pd__brand-link" data-testid="pd-brand">
            <Avatar name={p.brand} size={32} />
            <span className="pd__brand-name">{p.brand}</span>
          </Link>
        </p>
      )}
      <h1 className="pd__title">{p.title}</h1>

      {/* No price here any more: the bar states the total, and two copies of
          the same number a screen apart is the pair that goes out of step. The
          credit moved to the bar with it, beside the figure it is a share of. */}
      {(locked || !sizedStock || size || everySizeGone) && (
      <p className="pd__stock">
        {locked
          ? `${unitStock.toLocaleString('en-US')} only · drops ${opens}`
          : (sizedStock ? everySizeGone : p.soldOut) && !size
            ? 'Back next drop'
            : sizeGone
              ? 'Sold out'
              : `${unitStock.toLocaleString('en-US')} left`}
      </p>
      )}


      {/* Size on the left, quantity on the right, one row — the reference puts
          the two choices together and leaves the action to the bar below. */}
      {(needsSize || (!p.soldOut && !locked)) && (
        <div className="pd__choose">
        {needsSize && (
        <div className="pd__sizes">
          <p className="pd__field-label" id="pd-size-label">{p.sizeLabel || 'Size'}</p>
          <div className="pd__size-row" role="group" aria-labelledby="pd-size-label">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={`pd__size${s === size ? ' is-on' : ''}`}
                aria-pressed={s === size}
                onClick={() => {
                  setSize(s);
                  const cap = Math.max(1, Math.min(stockFor(p, s) || 1, 10));
                  setQty((q) => Math.min(q, cap));
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        )}

        {!locked && (
        <div className="pd__qty-row" role="group" aria-label="Quantity">
          <button
            type="button"
            className="pd__pm"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="One fewer"
          >
            −
          </button>
          <span className="pd__qty-n" aria-live="polite">{qty}</span>
          <button
            type="button"
            className="pd__pm"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            aria-label="One more"
          >
            +
          </button>
        </div>
        )}
        </div>
      )}

      <ul className="pd__promises">
        <li className="pd__promise">
          <Icon name="bag-line" size={19} className="pd__promise-ico" />
          <span>{p.cashbackPct}% cashback when it ships</span>
        </li>
        {ASSURANCES.map((a) => (
          <li key={a.text} className="pd__promise">
            <Icon name={a.icon} size={19} className="pd__promise-ico" />
            <span>{a.text}</span>
          </li>
        ))}
      </ul>

      <Intro html={p.introHtml} text={p.desc} />

      {/* Specs after the promises, not before the buy row: what it costs and
          how to get it comes first, and the spec table is what you read once
          you are already interested. */}
      {p.details?.length > 0 && (
        <dl className="pd__details">
          {p.details.map((d) => (
            <div className="pd__detail" key={d.label}>
              <dt className="pd__detail-k">{d.label}</dt>
              <dd className="pd__detail-v">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="pd__reviews" aria-labelledby="pd-reviews-h">
          <div className="pd__reviews-head">
            <div className="pd__reviews-top">
              <h2 id="pd-reviews-h" className="pd__reviews-h">Reviews</h2>
              {reviews.length > 0 && (
                <span className="pd__reviews-sum">
                  <Stars rating={avg} label={`${avg.toFixed(1)} out of 5`} />
                  <span className="pd__reviews-avg">{avg.toFixed(1)}</span>
                  <span className="pd__reviews-n">
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </span>
                </span>
              )}
            </div>
            {/* No write control here. Order history is the one way in: it is
                where "a thing you bought" is a fact rather than a lookup, and
                one entry point cannot disagree with another about who may
                write. This page still SHOWS a review written this session. */}
          </div>
          {reviews.length === 0 && !mine
            ? <p className="pd__review-empty">No reviews yet.</p>
            : (
          <ul className="pd__review-list">
            {/* This session's own review, alongside the fixture's — not folded
                into the average above, which stays the curated fixture's own
                figure. */}
            {mine && (
              <li className="pd__review" data-testid="review-mine">
                <div className="pd__review-top">
                  <span className="pd__review-who">You</span>
                  <Stars rating={mine.rating} />
                  <span className="pd__review-date">Just now</span>
                </div>
                {mine.body && <p className="pd__review-body">{mine.body}</p>}
              </li>
            )}
            {reviews.map((r) => (
              <li key={`${r.name}-${r.date}`} className="pd__review" data-testid="review">
                <div className="pd__review-top">
                  <span className="pd__review-who">{r.name}</span>
                  <Stars rating={r.rating} />
                  <span className="pd__review-date">{r.date}</span>
                </div>
                <p className="pd__review-body">{r.body}</p>
              </li>
            ))}
          </ul>
            )}
        </section>

      <GiftSheet product={gifting ? p : null} initialSize={size || ''} onClose={() => setGifting(false)} />

      {/* The bar replaces the tab bar on this screen rather than stacking over
          it — TabBar and CartFab both stand down here. It carries the TOTAL,
          not the unit price: the quantity is picked above, so a bar that kept
          saying $39 while the row said 3 would be the one lying. */}
      <div className="pd__bar" data-testid="buy-bar">
        <div className="pd__bar-row">
          <span className="pd__bar-total">
            <span className="pd__bar-lab">Total price</span>
            <span className="pd__bar-fig">
              {from != null && <span className="pd__bar-from">from </span>}
              {usd((from ?? unitPrice) * qty)}
            </span>
            {/* R1: a bare percentage does not name what it pays in. A rate,
                not a computed figure — the shop card and the promises row both
                state the rate, and three ways of saying one thing is two too
                many. */}
            <span className="pd__bar-credit">{p.cashbackPct}% cashback</span>
          </span>

          {locked ? (
            /* The cart, locked: the system's button in its disabled state with
               the app's own padlock, saying when it opens. Not a link and not a
               waitlist — nothing happens here until the drop does. */
            <Button variant="secondary" size="md" className="pd__bar-act pd__bar-act--locked" disabled data-testid="drop-locked">
              <Icon name="lock" set="app" size={16} /> Drops {opens}
            </Button>
          ) : unavailable && !size ? (
            <Button variant="secondary" size="md" className="pd__bar-act">Waitlist me »</Button>
          ) : null}
        </div>
        {!locked && !(unavailable && !size) && (
          <div className="pd__bar-acts">
            {/* The set had no present in it, so one was drawn and added to
                the design system (`gift`, outline). Icon only now: the word
                was standing in for a glyph that did not exist, and the space
                it took is the credit line's. */}
            <button
              type="button"
              className="pd__bar-gift"
              aria-label={`Send ${p.title} as a gift`}
              onClick={() => setGifting(true)}
            >
              <Icon name="gift" size={20} />
            </button>
            <Button
              variant="secondary"
              size="md"
              className="pd__bar-act pd__bar-act--quiet"
              disabled={!canBuy}
              onClick={addToCart}
            >
              Add to cart
            </Button>
            <Button
              variant="primary"
              size="md"
              className="pd__bar-act"
              disabled={!canBuy}
              onClick={buyNow}
            >
              Buy now
            </Button>
          </div>
        )}
        {/* The reason sits under the row, not beside the button: .pd__act was a
            flex row once and this line squeezed in next to it. */}
        {!unavailable && !locked && needsSize && !size && (
          <p className="pd__act-why">Pick a {choice} first.</p>
        )}
        {locked && <p className="pd__act-why">The cart opens {opens}. Contributors get the early window.</p>}
      </div>
    </div>
  );
}
