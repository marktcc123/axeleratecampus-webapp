import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import { bucketTotals } from '../../src/app/admin/buckets.js';
import admin from '../../src/data/admin.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('admin analytics — tiles', () => {
  beforeEach(() => { sessionStorage.clear(); setUnlocked(true); });

  test('four tiles, each labelled', () => {
    at('/app/me/admin/analytics');
    // StatBlock uppercases its label in CSS, so the DOM text is title case.
    for (const label of ['Total GMV', 'Daily active', 'Pending payouts', 'Total users']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test('GMV is the sum of the daily cash, in dollars', () => {
    at('/app/me/admin/analytics');
    const gmv = admin.daily_totals.reduce((n, d) => n + d.cash_paid, 0);
    expect(screen.getByTestId('tile-gmv')).toHaveTextContent(`$${Math.round(gmv).toLocaleString('en-US')}`);
  });

  test('the credit figure never stands as a bare number', () => {
    at('/app/me/admin/analytics');
    expect(screen.getByTestId('tile-gmv')).toHaveTextContent(/credit · \$\d/);
  });

  test('pending payouts counts only the pending ones', () => {
    at('/app/me/admin/analytics');
    const pending = admin.withdrawals.filter((w) => w.status === 'pending');
    const total = pending.reduce((n, w) => n + w.amount, 0);
    expect(screen.getByTestId('tile-payouts')).toHaveTextContent(`$${total.toLocaleString('en-US')}`);
    expect(screen.getByTestId('tile-payouts')).toHaveTextContent(`${pending.length}`);
  });

  test('no Est. CAC tile — the DS forbids an invented denominator', () => {
    at('/app/me/admin/analytics');
    expect(screen.queryByText(/CAC/i)).toBeNull();
    expect(screen.queryByText('N/A')).toBeNull();
  });
});

describe('bucketTotals', () => {
  const days = admin.daily_totals;

  test('7 days is one row per day', () => {
    const rows = bucketTotals(days, 7);
    expect(rows).toHaveLength(7);
    expect(rows.at(-1).cash_paid).toBeCloseTo(days.at(-1).cash_paid, 2);
  });

  test('30 days is five 6-day rows, and they sum to the window', () => {
    const rows = bucketTotals(days, 30);
    expect(rows).toHaveLength(5);
    const windowSum = days.slice(-30).reduce((n, d) => n + d.cash_paid, 0);
    const rowSum = rows.reduce((n, r) => n + r.cash_paid, 0);
    expect(rowSum).toBeCloseTo(windowSum, 2);
  });

  test('90 days is six 15-day rows', () => {
    expect(bucketTotals(days, 90)).toHaveLength(6);
  });

  test('every bucket in a range holds the same number of days', () => {
    // A short trailing bucket plotted as an equal point reads as a cliff. This
    // is the guard for that: it is how a $1,600 week and a $485 two-day tail
    // ended up next to each other looking like a crash.
    for (const range of [7, 30, 90]) {
      const sizes = new Set(bucketTotals(days, range).map((r) => r.days));
      expect(sizes.size, `range ${range} has uneven buckets`).toBe(1);
    }
  });

  test('a stack is never more than seven rows, whatever the range', () => {
    for (const range of [7, 30, 90]) {
      expect(bucketTotals(days, range).length).toBeLessThanOrEqual(7);
    }
  });
});

describe('admin analytics — the charts', () => {
  beforeEach(() => { sessionStorage.clear(); setUnlocked(true); });

  test('the revenue chart plots both series on ONE axis', () => {
    at('/app/me/admin/analytics');
    const chart = screen.getByRole('img', { name: /Cash and credit spend/ });
    // Two polylines, one per series, inside a single plot frame.
    expect(chart.querySelectorAll('polyline')).toHaveLength(2);
    // Both series read in dollars, which is what makes one axis honest: a
    // second scale would invent a crossing point. Scoped to the legend — the
    // sr-only table repeats both names as column headers.
    const legend = document.querySelector('.adm-lc__legend');
    expect(legend.textContent).toMatch(/Cash/);
    expect(legend.textContent).toMatch(/Credits, at shop value/);
  });

  test('a legend names both series, so identity is never colour alone', () => {
    at('/app/me/admin/analytics');
    const swatches = document.querySelectorAll('.adm-lc__swatch');
    expect(swatches).toHaveLength(2);
    for (const s of swatches) expect(s).toHaveAttribute('aria-hidden', 'true');
  });

  test('the range toggle changes the bucket, not just the window', async () => {
    const user = userEvent.setup();
    at('/app/me/admin/analytics');
    const points = () => document.querySelectorAll('.adm-lc__svg circle').length;
    await user.click(screen.getByRole('button', { name: '7d' }));
    expect(points()).toBe(14); // 7 buckets × 2 series
    await user.click(screen.getByRole('button', { name: '90d' }));
    expect(points()).toBe(12); // 6 buckets × 2 series
  });

  test('the chart carries a table view of the same numbers', async () => {
    const user = userEvent.setup();
    at('/app/me/admin/analytics');
    await user.click(screen.getByRole('button', { name: '7d' }));
    const table = screen.getByRole('table', { name: /Cash and credit spend/ });
    // The wrapper carries sr-only, not the table: width:1px is a minimum on a
    // display:table box, so the table escaped its own clip at 388px wide.
    expect(table.closest('.sr-only')).not.toBeNull();
    expect(table.classList.contains('sr-only')).toBe(false);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(7);
  });

  test('campus share is a donut whose every slice is named', () => {
    at('/app/me/admin/analytics');
    expect(screen.getByRole('img', { name: /Share of verified students/ })).toBeInTheDocument();
    expect(screen.getAllByTestId('donut-key')).toHaveLength(admin.campuses.length);
    for (const c of admin.campuses) {
      expect(screen.getByText(c.name)).toBeInTheDocument();
    }
  });

  test('the donut ranks slices biggest first and states the real total', () => {
    at('/app/me/admin/analytics');
    const names = screen.getAllByTestId('donut-key').map((li) => li.querySelector('.adm-dn__name').textContent);
    const expected = [...admin.campuses].sort((a, b) => b.student_count - a.student_count).map((c) => c.name);
    expect(names).toEqual(expected);
    // The denominator in the hole is the sum of the slices, not an invention.
    const total = admin.campuses.reduce((n, c) => n + c.student_count, 0);
    expect(screen.getByText(total.toLocaleString('en-US'))).toBeInTheDocument();
  });

  test('the campus ramp is one hue light-to-dark, not four invented ones', () => {
    at('/app/me/admin/analytics');
    const fills = [...document.querySelectorAll('.adm-dn__swatch')].map((s) => s.style.background);
    // Sequential: the six-hue accent ramp cannot supply four categorical hues
    // (coral vs butter is deltaE 0.2 under deuteranopia), so this is the violet
    // ramp stepping darkest-to-lightest as the slices shrink.
    expect(fills).toEqual([
      'var(--violet-800)', 'var(--violet-600)', 'var(--violet-400)', 'var(--violet-200)',
    ]);
  });
});
