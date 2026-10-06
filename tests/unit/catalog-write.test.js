import { describe, expect, test } from 'vitest';
import { brandRow, eventRow, eventStamp, missionRow, productPatch } from '../../server/catalog-write.mjs';

test('a brand keeps its words and only a real image url', () => {
  expect(brandRow({ name: ' Halo ', blurb: 'About', role: 'K-Beauty', cover: 'product-journal' })).toEqual({
    name: 'Halo',
    description: 'About',
    category: 'K-Beauty',
  });
  expect(brandRow({ name: 'Halo', cover: 'https://cdn.example/logo.png' }).logo_url).toBe('https://cdn.example/logo.png');
});

test('a mission maps onto a gig and does not shrink below seats already taken', () => {
  const row = missionRow({
    title: 'Field day',
    brandId: 'b1',
    format: 'field',
    payUsd: 50,
    creditPts: 8000,
    xp: 1000,
    spots: { total: 4 },
    desc: 'Show up',
  }, { taken: 3 });
  expect(row).toMatchObject({
    type: 'o2o_delivery',
    reward_cash: 50,
    spots_total: 4,
    spots_left: 1,
    description: 'Show up',
  });
  expect(missionRow({ title: 'Reel', brandId: 'b1', format: 'content', spots: { total: 2 }, desc: 'new' }, { keepDescription: true, taken: 0 }).description).toBeUndefined();
});

test('an event date survives a label that is not a clock time', () => {
  expect(eventStamp('2026-09-30', '6–7pm')).toBe('2026-09-30T12:00:00.000Z');
  expect(eventRow({ title: 'Night', date: '2026-09-30', time: '', seatsLeft: 12, venue: 'Pier' }, { spots_total: 40 }).spots_total).toBe(40);
  expect(eventRow({ title: 'Night', date: '2026-09-30', seatsLeft: 12 }, { spots_total: 40 }).spots_left).toBe(12);
});

describe('product patch', () => {
  test('cashback stays inside 0 to 100', () => {
    expect(productPatch({ cashbackPct: 140 }).credit_cashback_percent).toBe(100);
    expect(productPatch({ stock: -3 }).stock_count).toBe(0);
  });
});
