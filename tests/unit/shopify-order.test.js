import {
  decrementStock,
  mirrorOrderBody,
  moveFulfillmentToVendor,
  postMirrorOrder,
  pullTrackingNumber,
  shippingFromProfile,
  shopifyOrderIdFrom,
  stampShopifyOrderId,
  trackingNumberFrom,
  variantRestId,
  vendorLocationTarget,
} from '../../server/shopify-order.mjs';

describe('shopify order mirror', () => {
  test('reads a variant GID or a number', () => {
    expect(variantRestId('gid://shopify/ProductVariant/99')).toBe(99);
    expect(variantRestId('42')).toBe(42);
  });

  test('builds a paid wallet order whose sale matches the line prices', () => {
    const body = mirrorOrderBody({
      email: 'buyer@example.com',
      lines: [{ shopifyVariantId: 'gid://shopify/ProductVariant/15', quantity: 1, unitUsd: 4.99 }],
      cashPaidUsd: 3.99,
      creditsUsed: 100,
      paymentSource: 'wallet',
      reference: 'wallet:order-1',
      orderId: 'order-1',
      userId: 'user-1',
      shipping: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        address1: '1 Example Street',
        city: 'Los Angeles',
        province: 'CALIFORNIA',
        country: 'US',
        zip: '90001',
      },
    });
    const order = body.order;
    expect(order.financial_status).toBe('paid');
    expect(order.send_receipt).toBe(false);
    expect(order.line_items[0].variant_id).toBe(15);
    expect(order.line_items[0].price).toBe('4.99');
    expect(order.transactions[0]).toMatchObject({ gateway: 'Axelerate', amount: '4.99', status: 'success' });
    expect(order.shipping_address.province).toBe('CALIFORNIA');
    expect(order.note_attributes.map((row) => row.name)).toContain('supabase_order_id');
    expect(order.tags).toContain('axelerate-mirror');
  });

  test('skips a cart with no Shopify variant', () => {
    expect(mirrorOrderBody({
      email: 'buyer@example.com',
      lines: [{ shopifyVariantId: '', quantity: 1, unitUsd: 10 }],
      cashPaidUsd: 10,
    })).toBeNull();
  });

  test('maps a saved address and leaves a blank one off the order', () => {
    expect(shippingFromProfile({
      full_name: 'Ada Lovelace',
      shipping_address: { address_line1: '1 Example Street', city: 'Los Angeles', state: 'CALIFORNIA', zip_code: '90001' },
    })).toMatchObject({ address1: '1 Example Street', province: 'CALIFORNIA', last_name: 'Lovelace' });
    expect(shippingFromProfile({ full_name: 'Ada Lovelace', shipping_address: {} })).toBeNull();
  });

  test('reads a fulfillment tracking number', () => {
    expect(trackingNumberFrom({ fulfillments: [{ tracking_numbers: ['1Z999'] }] })).toBe('1Z999');
    expect(trackingNumberFrom({ fulfillments: [] })).toBe('');
  });

  test('keeps the Shopify order id on the first line', () => {
    const items = stampShopifyOrderId([{ id: 'tea', quantity: 1 }], '555');
    expect(shopifyOrderIdFrom(items)).toBe('555');
    expect(items[0].id).toBe('tea');
  });

  test('decrements the chosen variant and does not go below zero', () => {
    const next = decrementStock({
      id: 'tea',
      stock_count: 0,
      specifications: {
        shopify_variants: [
          { id: 'v1', title: '4 cup', inventory_quantity: 2 },
          { id: 'v2', title: '15 cup', inventory_quantity: 0 },
        ],
      },
    }, [{ id: 'tea', shopifyVariantId: 'v1', size: '4 cup', quantity: 5 }]);
    expect(next.specifications.shopify_variants[0].inventory_quantity).toBe(0);
    expect(next.specifications.shopify_variants[1].inventory_quantity).toBe(0);
    expect(next.stock_count).toBe(0);
  });

  test('posts the order body and reads tracking without using a live store', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      if (String(url).endsWith('/orders.json')) {
        return { ok: true, text: async () => JSON.stringify({ order: { id: 555, name: '#1001' } }) };
      }
      return {
        ok: true,
        text: async () => JSON.stringify({ order: { id: 555, fulfillments: [{ tracking_number: '1Z999' }] } }),
      };
    };
    const created = await postMirrorOrder({
      domain: 'example.myshopify.com',
      token: 'test-token',
      body: { order: { email: 'buyer@example.com' } },
      fetchImpl,
    });
    expect(created).toEqual({ orderId: '555', orderName: '#1001' });
    expect(calls[0].init.headers['X-Shopify-Access-Token']).toBe('test-token');
    expect(calls[0].url).toBe('https://example.myshopify.com/admin/api/2024-10/orders.json');
    const number = await pullTrackingNumber({
      domain: 'example.myshopify.com',
      token: 'test-token',
      orderId: '555',
      fetchImpl,
    });
    expect(number).toBe('1Z999');
  });

  test('moves an open fulfillment order to a numeric vendor location', async () => {
    expect(vendorLocationTarget({})).toBeNull();
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push(JSON.parse(init?.body || '{}'));
      const query = calls.at(-1).query || '';
      if (query.includes('fulfillmentOrders')) {
        return {
          ok: true,
          text: async () => JSON.stringify({
            data: {
              order: {
                fulfillmentOrders: {
                  nodes: [
                    { id: 'gid://shopify/FulfillmentOrder/1', status: 'OPEN', assignedLocation: { location: { id: 'gid://shopify/Location/9' } } },
                    { id: 'gid://shopify/FulfillmentOrder/2', status: 'CLOSED', assignedLocation: { location: { id: 'gid://shopify/Location/9' } } },
                    { id: 'gid://shopify/FulfillmentOrder/3', status: 'OPEN', assignedLocation: { location: { id: 'gid://shopify/Location/44' } } },
                  ],
                },
              },
            },
          }),
        };
      }
      return {
        ok: true,
        text: async () => JSON.stringify({ data: { fulfillmentOrderMove: { userErrors: [] } } }),
      };
    };
    const result = await moveFulfillmentToVendor({
      domain: 'example.myshopify.com',
      token: 'test-token',
      orderId: '555',
      locationId: '44',
      fetchImpl,
      sleep: async () => {},
    });
    expect(result).toEqual({ moved: 1, skipped: false });
    const move = calls.find((call) => String(call.query).includes('fulfillmentOrderMove'));
    expect(move.variables).toEqual({
      id: 'gid://shopify/FulfillmentOrder/1',
      newLocationId: 'gid://shopify/Location/44',
    });
  });

  test('looks up a location by name and stops when the list is refused', async () => {
    const calls = [];
    const named = await moveFulfillmentToVendor({
      domain: 'example.myshopify.com',
      token: 'test-token',
      orderId: '555',
      assignByName: true,
      fetchImpl: async (url, init) => {
        if (String(url).includes('locations.json')) {
          return { ok: true, text: async () => JSON.stringify({ locations: [{ id: 44, name: 'Vendor' }] }) };
        }
        const body = JSON.parse(init.body);
        calls.push(body.query);
        if (body.query.includes('fulfillmentOrders')) {
          return {
            ok: true,
            text: async () => JSON.stringify({
              data: {
                order: {
                  fulfillmentOrders: {
                    nodes: [{ id: 'gid://shopify/FulfillmentOrder/9', status: 'OPEN', assignedLocation: { location: { id: 'gid://shopify/Location/1' } } }],
                  },
                },
              },
            }),
          };
        }
        return { ok: true, text: async () => JSON.stringify({ data: { fulfillmentOrderMove: { userErrors: [] } } }) };
      },
      sleep: async () => {},
    });
    expect(named).toEqual({ moved: 1, skipped: false });
    expect(calls.some((query) => query.includes('newLocationId'))).toBe(true);
    const refused = await moveFulfillmentToVendor({
      domain: 'example.myshopify.com',
      token: 'test-token',
      orderId: '555',
      locationName: 'Vendor',
      fetchImpl: async (url) => {
        if (String(url).includes('locations.json')) return { ok: false, status: 403, text: async () => '' };
        return { ok: true, text: async () => JSON.stringify({ data: {} }) };
      },
      sleep: async () => {},
    });
    expect(refused).toEqual({ moved: 0, skipped: true });
  });
});
