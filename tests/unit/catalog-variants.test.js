import { fromPrice, toProduct } from '../../src/lib/adapters/catalog.js';

const tea = {
  id: 'tea',
  title: 'Southern Gothic',
  stock_count: 0,
  discount_price: 14.09,
  original_price: 14.09,
  specifications: {
    shopify_variants: [
      { id: 'v1', title: '4 cup deluxe sample', price: '4.99', inventory_quantity: 11, position: 1 },
      { id: 'v2', title: '15 cup bag', price: '14.09', inventory_quantity: 0, position: 2 },
    ],
  },
};

describe('toProduct stock', () => {
  test('a sized product stays on sale while any option has stock', () => {
    const product = toProduct(tea);
    expect(product.soldOut).toBe(false);
    expect(product.stock).toBe(11);
    expect(product.variantStock['15 cup bag']).toBe(0);
  });

  test('a sized product is sold out only when every option is', () => {
    const row = structuredClone(tea);
    row.specifications.shopify_variants[0].inventory_quantity = 0;
    expect(toProduct(row).soldOut).toBe(true);
  });

  test('the shop card price is the cheapest option', () => {
    expect(fromPrice(toProduct(tea))).toBe(4.99);
    const same = structuredClone(tea);
    same.specifications.shopify_variants[1].price = '4.99';
    expect(fromPrice(toProduct(same))).toBeNull();
    expect(fromPrice(toProduct({ id: 'tee', title: 'Tee', stock_count: 10, discount_price: 0.1 }))).toBeNull();
  });

  test('a product without options still uses the row count', () => {
    const row = { id: 'tee', title: 'Tee', stock_count: 0, discount_price: 0.1 };
    expect(toProduct(row).soldOut).toBe(true);
  });
});
