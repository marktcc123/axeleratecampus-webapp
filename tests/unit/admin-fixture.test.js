import admin from '../../src/data/admin.example.json';
import shop from '../../src/data/shop.example.json';

const COLLECTIONS = [
  'orders', 'ugc_submissions', 'reviews', 'gig_applications', 'event_applications',
  'w9_submissions', 'withdrawals', 'campuses', 'career_claims',
  'career_roles', 'career_pathways', 'daily_totals',
];

describe('admin fixture', () => {
  test('every collection is present and non-empty', () => {
    for (const key of COLLECTIONS) {
      expect(Array.isArray(admin[key]), `${key} is an array`).toBe(true);
      expect(admin[key].length, `${key} has rows`).toBeGreaterThan(0);
    }
    expect(admin.stats.total_users).toBeGreaterThan(0);
  });

  test('columns stay snake_case so the fixture drops in as a Supabase seed', () => {
    const camel = /[a-z][A-Z]/;
    for (const key of COLLECTIONS) {
      for (const row of admin[key]) {
        for (const col of Object.keys(row)) {
          expect(camel.test(col), `${key}.${col} is snake_case`).toBe(false);
        }
      }
    }
  });

  test('daily_totals covers 90 consecutive days and is not flat', () => {
    expect(admin.daily_totals).toHaveLength(90);
    const days = admin.daily_totals.map((d) => d.date);
    expect([...days].sort()).toEqual(days); // already ascending
    for (let i = 1; i < days.length; i += 1) {
      const gap = (new Date(days[i]) - new Date(days[i - 1])) / 86400000;
      expect(gap, `${days[i - 1]} → ${days[i]}`).toBe(1);
    }
    const cash = admin.daily_totals.map((d) => d.cash_paid);
    expect(Math.max(...cash)).toBeGreaterThan(Math.min(...cash));
  });

  test('no orphan references', () => {
    const campuses = new Set(admin.campuses.map((c) => c.name));
    for (const a of admin.event_applications) {
      expect(campuses.has(a.campus), `${a.campus} is a known campus`).toBe(true);
    }
    const w9 = new Set(admin.w9_submissions.map((w) => w.user_id));
    for (const w of admin.withdrawals) {
      expect(w9.has(w.user_id), `${w.user_id} submitted a W-9`).toBe(true);
    }
  });

  test('UGC links never point at a real person on a real platform', () => {
    for (const s of admin.ugc_submissions) {
      if (!s.ugc_link) continue;
      expect(s.ugc_link).toMatch(/^https:\/\/example\.com\//);
    }
  });

  test('every order that needs attention names what it needs', () => {
    for (const o of admin.orders) {
      expect(['return', 'cancellation', 'shipping', null]).toContain(o.needs ?? null);
    }
  });

  // The console is for packing and deciding (owner, 2026-09-23): an order
  // carries what a packer needs to ship it and what a reviewer needs to decide.
  test('every order carries a shipping address, a phone, and items that point at products', () => {
    const products = new Set(shop.products.map((p) => p.id));
    for (const o of admin.orders) {
      for (const k of ['line1', 'city', 'state', 'zip']) expect(o.shipping_address?.[k], `${o.order_no} address ${k}`).toBeTruthy();
      expect(o.phone, `${o.order_no} phone`).toBeTruthy();
      for (const it of o.items) expect(products.has(it.product_id), `${o.order_no} item ${it.name} → ${it.product_id}`).toBe(true);
    }
  });

  test('what was paid adds up to what was bought: cash plus the credits\' shop value equals the items', () => {
    for (const o of admin.orders) {
      const items = o.items.reduce((n, it) => n + it.quantity * it.price, 0);
      const paid = o.cash_paid + o.credits_used / 100;
      expect(Math.round(paid * 100), `${o.order_no}: ${o.cash_paid} cash + ${o.credits_used} credits vs ${items}`).toBe(Math.round(items * 100));
    }
  });

  test('a return or a cancellation says what the student asked for', () => {
    const asks = admin.orders.filter((o) => o.needs === 'return' || o.needs === 'cancellation');
    expect(asks.length).toBeGreaterThan(0);
    for (const o of asks) expect(o.request_reason, `${o.order_no} request_reason`).toBeTruthy();
  });
});
