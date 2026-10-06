import { act, renderHook } from '@testing-library/react';
import { REVIEWABLE_STATUSES, reviewableOrder, ReviewsProvider, useReviews } from '../../src/app/reviews.jsx';
import hub from '../../src/data/hub.example.json';

const hook = () => renderHook(() => useReviews(), { wrapper: ReviewsProvider });

describe('canReview', () => {
  test('only delivered counts, and it is an allowlist', () => {
    // Narrowed from shipped+delivered on 2026-09-03: a review is about the
    // thing in your hands. The fixture's shipped orders are the rule's
    // counter-examples now, so it is checked against real data below as well
    // as asserted directly here.
    expect([...REVIEWABLE_STATUSES]).toEqual(['delivered']);
    expect(hub.orders.some((o) => !REVIEWABLE_STATUSES.has(o.status)),
      'the fixture still carries a non-reviewable order to test against').toBe(true);
  });

  test('is false for a product whose order has only shipped', () => {
    const shipped = hub.orders.find((o) => o.status === 'shipped');
    // ...and that product has no delivered order either, or the gate would
    // rightly pass it on the other order's account.
    expect(hub.orders.some(
      (o) => o.productId === shipped.productId && o.status === 'delivered')).toBe(false);
    const { result } = hook();
    expect(result.current.canReview(shipped.productId)).toBe(false);
  });

  test('is true for a product whose order has delivered', () => {
    const delivered = hub.orders.find((o) => o.status === 'delivered');
    const { result } = hook();
    expect(result.current.canReview(delivered.productId)).toBe(true);
  });

  test('is false for a product with no order at all', () => {
    const orderedIds = new Set(hub.orders.map((o) => o.productId));
    const { result } = hook();
    expect(result.current.canReview('a-product-nobody-bought')).toBe(false);
    // p4, p5 and p6 carry no order in the fixture — the gate's more important
    // branch, since it is the common case (most products, no purchase).
    for (const id of ['p4', 'p5', 'p6']) {
      expect(orderedIds.has(id), `${id} is unordered in the fixture`).toBe(false);
      expect(result.current.canReview(id)).toBe(false);
    }
  });

  test('is derived from the fixture, not a hardcoded id list', () => {
    // Every order in the fixture agrees with canReview's verdict on its own
    // product id — if the function ever hardcodes a list instead of reading
    // hub.orders, this is the assertion that would stop catching it.
    const { result } = hook();
    for (const o of hub.orders) {
      const expected = o.status === 'delivered';
      expect(result.current.canReview(o.productId), `${o.id} (${o.status})`).toBe(expected);
    }
  });
});

describe('addReview / hasReviewed', () => {
  test('a product starts unreviewed this session', () => {
    const { result } = hook();
    expect(result.current.hasReviewed('p2')).toBe(false);
    expect(result.current.added.p2).toBeUndefined();
  });

  test('adding a review makes hasReviewed true and stores it by product id', () => {
    const { result } = hook();
    act(() => result.current.addReview('p2', { rating: 4, body: 'Good tea.' }));
    expect(result.current.hasReviewed('p2')).toBe(true);
    expect(result.current.added.p2).toEqual({ rating: 4, body: 'Good tea.' });
    // A different product is untouched.
    expect(result.current.hasReviewed('p3')).toBe(false);
  });
});

describe('reviewableOrder', () => {
  test('a live purchase that is still being packed can be reviewed', () => {
    expect(reviewableOrder({ productId: 'p1', status: 'packed' }, { live: true })).toBe(true);
    expect(reviewableOrder({ productId: 'p1', status: 'packed', gift: true }, { live: true })).toBe(false);
    expect(reviewableOrder({ productId: 'p1', status: 'cancelled' }, { live: true })).toBe(false);
    expect(reviewableOrder({ productId: 'p1', status: 'shipped' })).toBe(false);
  });
});
