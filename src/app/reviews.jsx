import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import hub from '../data/hub.example.json';
import { isLiveBackend } from '../lib/supabase.js';
import { loadMyReviewIds, saveReview } from '../lib/reviews.js';
import { useAccount } from './account.jsx';

// Reviews, session-only, like the cart. Mounted next to CartProvider in
// App.jsx's CartRoot — see the comment there for why that layout route
// exists rather than the app shell: /user/:handle sits outside the shell and
// would otherwise unmount a provider mounted inside it.
//
// The link back to a purchase is hub.orders[].productId, added alongside this
// file: the fixture used to carry only a name and a brand, which cannot be
// trusted to match a product's title (an order reads "The Five Minute
// Journal"; the product's own title is "The Five Minute Journal — original
// linen"). Nothing here reads that string; canReview walks the id instead.
const ReviewsContext = createContext(null);

// Delivered only, as of 2026-09-03: a review is about the thing in your hands,
// and `shipped` means it is still in a van. It is an ALLOWLIST, so any status
// the fixture grows later is non-reviewable until it is named here. The
// fixture's two shipped orders are now the rule's counter-examples, which is
// what makes it testable against real data rather than by assertion alone.
export const REVIEWABLE_STATUSES = new Set(['delivered']);

// Offline, only a delivered order counts. Live orders stay "processing" until
// a shipment is recorded, so a purchase that was not cancelled is enough —
// the same rule the old product page used.
export function reviewableOrder(order, { live = false } = {}) {
  if (!order?.productId || order.gift) return false;
  if (live) return order.status !== 'cancelled';
  return REVIEWABLE_STATUSES.has(order.status);
}

export function ReviewsProvider({ children }) {
  const live = isLiveBackend();
  const { orders, ready } = useAccount();
  const [added, setAdded] = useState({});
  const [savedIds, setSavedIds] = useState(() => new Set());

  useEffect(() => {
    if (!live) return undefined;
    let alive = true;
    loadMyReviewIds().then((ids) => {
      if (alive && ids) setSavedIds(new Set(ids));
    });
    return () => { alive = false; };
  }, [live]);

  const addReview = useCallback((productId, { rating, body }) => {
    if (!live) {
      setAdded((a) => ({ ...a, [productId]: { rating, body } }));
      return undefined;
    }
    return saveReview({ productId, rating, comment: body }).then((result) => {
      if (result?.ok) {
        setAdded((a) => ({ ...a, [productId]: { rating, body } }));
        setSavedIds((ids) => new Set(ids).add(productId));
      }
      return result;
    });
  }, [live]);

  const canReview = useCallback((productId) => {
    const list = live ? (ready ? (orders ?? []) : []) : hub.orders;
    return list.some((order) => order.productId === productId && reviewableOrder(order, { live }));
  }, [live, ready, orders]);

  const hasReviewed = useCallback(
    (productId) => Boolean(added[productId]) || savedIds.has(productId),
    [added, savedIds],
  );

  const value = useMemo(
    () => ({ added, addReview, canReview, hasReviewed }),
    [added, addReview, canReview, hasReviewed],
  );

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) {
    throw new Error('useReviews() needs a <ReviewsProvider> above it — see CartRoot in src/App.jsx');
  }
  return ctx;
}
