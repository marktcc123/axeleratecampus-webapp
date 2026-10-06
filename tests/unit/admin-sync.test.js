import { describe, expect, test } from 'vitest';
import {
  campusesFrom,
  dailyFrom,
  mapEventApps,
  mapOrders,
  splitUserGigs,
  uiEventStatus,
  uiGigStatus,
} from '../../server/admin-sync.mjs';

test('a field application and a content post land in different queues', () => {
  const split = splitUserGigs([
    {
      id: 'a',
      user_id: 'u1',
      status: 'applied',
      applied_at: '2026-09-01T00:00:00Z',
      gig: { id: 'g1', type: 'o2o_delivery', reward_cash: 50, reward_credits: 0 },
      user: { full_name: 'Mark Tao', campus: 'UCLA' },
    },
    {
      id: 'b',
      user_id: 'u1',
      status: 'submitted',
      ugc_link: 'https://example.com/post',
      platform: 'TikTok',
      created_at: '2026-09-02T00:00:00Z',
      gig: { id: 'g2', type: 'ugc_post', reward_cash: 0, reward_credits: 5000, xp_reward: 300 },
      user: { full_name: 'Mark Tao' },
    },
  ]);
  expect(split.gig_applications).toHaveLength(1);
  expect(split.gig_applications[0]).toMatchObject({
    mission_slug: 'g1',
    status: 'pending',
    full_name: 'Mark Tao',
    location: 'UCLA',
  });
  expect(split.ugc_submissions[0]).toMatchObject({
    mission_slug: 'g2',
    status: 'submitted',
    platform: 'TikTok',
  });
});

test('completed work reads as complete, and a held seat stays pending until approved', () => {
  expect(uiGigStatus('completed')).toBe('complete');
  expect(uiGigStatus('submitted', { physical: true })).toBe('pending');
  expect(uiEventStatus('applied')).toBe('pending');
  expect(uiEventStatus('approved')).toBe('approved');
  expect(mapEventApps([{ id: 'e', user_id: 'u', event_id: 'ev', status: 'applied', profile: { full_name: 'A', campus: 'UCLA' } }])[0].status).toBe('pending');
});

test('a processing order waits on shipping, and the line price follows the chosen option', () => {
  const products = new Map([['p1', {
    id: 'p1',
    title: 'Tea',
    brand_id: 'b1',
    specifications: { shopify_variants: [{ title: '4 cup', price: '4.99' }, { title: '15 cup', price: '14.09' }] },
  }]]);
  const brands = new Map([['b1', { name: 'Southern' }]]);
  const [order] = mapOrders([{
    id: 'abcdef12-0000-0000-0000-000000000000',
    status: 'processing',
    cash_paid: 4.99,
    credits_used: 0,
    items: [{ id: 'p1', quantity: 1, size: '4 cup' }],
    created_at: '2026-09-20T00:00:00Z',
    profile: { full_name: 'Mark Tao', shipping_address: { address_line1: '1 Main', city: 'LA', state: 'CA', zip_code: '90024' } },
  }], products, brands);
  expect(order.needs).toBe('shipping');
  expect(order.order_no).toBe('AX-ABCDEF12');
  expect(order.items[0]).toMatchObject({ name: 'Tea', brand: 'Southern', price: 4.99 });
  expect(order.shipping_address.city).toBe('LA');
});

test('schools are counted from profiles, and the revenue series is a full window', () => {
  expect(campusesFrom([{ campus: 'UCLA' }, { campus: 'UCLA' }, { campus: '' }])).toEqual([
    { id: 'UCLA', name: 'UCLA', logo_url: '', student_count: 2 },
  ]);
  const days = dailyFrom([{ created_at: '2026-09-01T00:00:00Z', cash_paid: 10, credits_used: 100 }]);
  expect(days).toHaveLength(90);
  expect(days.every((d) => typeof d.cash_paid === 'number')).toBe(true);
});

describe('status words', () => {
  test('rejected stays rejected', () => {
    expect(uiGigStatus('rejected')).toBe('rejected');
    expect(uiEventStatus('rejected')).toBe('declined');
  });
});
