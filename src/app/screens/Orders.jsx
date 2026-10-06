import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from 'axelerate-design-system';
import SubScreen from '../parts/SubScreen.jsx';
import ImageSlot from '../ImageSlot.jsx';
import { useContent } from '../content.jsx';
import { cover } from '../parts/cover.js';
import { usdExact } from '../parts/Money.jsx';
import { useReviews } from '../reviews.jsx';
import ReviewSheet from '../parts/ReviewSheet.jsx';
import hub from '../../data/hub.example.json';
import { useAccount } from '../account.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import './orders.css';

// My orders, from H5.dc.html.
//
// It was a two-up grid of photo cards. The canvas turned it into a filtered
// list, because an order is something you check the state of, and a list reads
// down in one pass where a grid makes you hunt.
//
// Prices take usdExact, not usd: they read as a column, and "$39.00" over
// "$14.09" aligns where "$39" over "$14.09" does not.


// One status, one colour. The fixture used to carry a `tone` per order, and
// its two shipped orders had been given different ones — the same status
// painted lavender on one row and blush on the next. Derived here instead, so
// the colour cannot disagree with the word it sits behind. `neutral` is the
// fallback rather than a guess, so a status added later reads plainly instead
// of borrowing a meaning it has not been given.
const STATUS_TONE = { shipped: 'lavender', delivered: 'yellow' };


// The product an order names. Orders duplicate the brand and a photo label;
// where the product exists, it is the source of truth for both.
export default function Orders() {
  const { products } = useContent();
  // The product an order names: art and brand come from it, not from the
  // order's own stale copies.
  const product = (o) => products.find((p) => p.id === o.productId);
  const { orders: liveOrders, ready } = useAccount();
  const live = isLiveBackend();
  const pending = live && !ready;
  // Every order in one list (owner, 2026-09-09): the All / On its way /
  // Delivered tabs came off — three orders do not need a filter.
  const shown = live ? (liveOrders ?? []) : hub.orders;
  const { canReview, hasReviewed } = useReviews();
  // The id, not the product itself: ReviewSheet takes the product object, but
  // holding only the id here means a session review landing on that product
  // (hasReviewed flips true) does not need this state to change at all — the
  // control that opened the sheet is already gone by then.
  const [reviewProductId, setReviewProductId] = useState(null);
  const reviewProduct = products.find((p) => p.id === reviewProductId) ?? null;

  return (
    <SubScreen
      band="pink"
      title="My orders"
    >
      {/* No lede (owner, 2026-09-09: the "10% credit lands when an order ships"
          line came off); the rate is still named on the product page. */}
      <p className="ord__count" role="status">
        {pending ? '…' : `${shown.length} ${shown.length === 1 ? 'order' : 'orders'}`}
      </p>
      {!pending && shown.length === 0 ? <p className="ord__empty">No orders yet.</p> : null}

      <ul id="ord-list" className="ord__list">
        {shown.map((o) => (
          <li key={o.id} className="ord__item">
            {/* Outside the link, not inside it — a button inside an anchor is
                invalid, the same rule PerkDetail's bag button follows. Only
                this order's own status decides it: ord1/ord2 might pay for the
                same product, and one having been delivered does not mean the
                other has.

                It sits above the card, right-aligned, rather than in the card's
                own corner. The corner is the status badge's, and a control has
                to clear 44px (the app-wide touch guard measures the element's
                own box), so a link placed there would have covered half the
                badge with its hit area or grown the card by 24px to clear it.
                Above the card it costs nothing and still reads as the card's. */}
            {canReview(o.productId) && !hasReviewed(o.productId) && (
              <button
                type="button"
                className="ord__review"
                onClick={() => setReviewProductId(o.productId)}
              >
                Write a review
              </button>
            )}
            <Link to={`/app/me/orders/${o.id}`} className="ord__row" data-testid="order-row" data-status={o.status}>
              {/* Art and brand come off the product the order names, not off the
                  order's own copies of them (2026-09-10): the copies showed
                  ImageSlot's "JOURNAL SHOT" production label where the packshot
                  should be, and called p1 "Intelligent Change" after the shop
                  had renamed it to Notely. */}
              <span className="ord__photo"><ImageSlot label={o.name} src={cover(product(o)?.covers?.[0] ?? o.cover)} radius={10} /></span>
              <span className="ord__mid">
                <span className="ord__name">{o.name}</span>
                <span className="ord__meta">{product(o)?.brand ?? o.brand} · {o.date}</span>
              </span>
              <span className="ord__end">
                <Badge tone={STATUS_TONE[o.status] ?? 'neutral'} tilt={0}>{o.status}</Badge>
                <span className="ord__price">{usdExact(o.priceUsd)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <ReviewSheet product={reviewProduct} onClose={() => setReviewProductId(null)} />
    </SubScreen>
  );
}
