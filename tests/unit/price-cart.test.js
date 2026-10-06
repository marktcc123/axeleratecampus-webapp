import { quoteCart } from '../../server/price-cart.mjs';

const tea = {
  id: 'tea',
  discount_price: 14.09,
  original_price: 14.09,
  stock_count: 3,
  credit_cashback_percent: 10,
  specifications: {
    shopify_variants: [
      { id: 'v1', title: '4 cup deluxe sample', price: '4.99', inventory_quantity: 11 },
      { id: 'v2', title: '15 cup bag', price: '14.09', inventory_quantity: 3 },
    ],
  },
};

describe('quoteCart', () => {
  test('charges the chosen variant, not the product row price', () => {
    const quote = quoteCart([tea], [{ id: 'tea', quantity: 1, size: '4 cup deluxe sample' }], {
      creditBalance: 500,
      creditsToUse: 100,
    });
    expect(quote.ok).toBe(true);
    expect(quote.totalUsd).toBe(4.99);
    expect(quote.amountToPayUsd).toBe(3.99);
    expect(quote.actualCreditsUsed).toBe(100);
    expect(quote.lines[0].shopifyVariantId).toBe('v1');
  });

  test('refuses a sized product with no size', () => {
    const quote = quoteCart([tea], [{ id: 'tea', quantity: 1, size: '' }]);
    expect(quote.ok).toBe(false);
  });

  test('refuses a quantity the variant does not have', () => {
    const quote = quoteCart([tea], [{ id: 'tea', quantity: 12, size: '4 cup deluxe sample' }]);
    expect(quote).toEqual({ ok: false, error: 'Out of stock.' });
  });
});
