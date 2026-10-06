import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import hub from '../../src/data/hub.example.json';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import { TABS } from '../../src/app/admin/AdminTabs.jsx';
import { AdminDataProvider, useAdmin } from '../../src/app/admin/store.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('admin shell', () => {
  beforeEach(() => sessionStorage.clear());

  test('a locked URL lands on Settings with the gate up, not on the console', () => {
    at('/app/me/admin/withdrawals');
    expect(screen.queryByRole('navigation', { name: /Admin sections/ })).toBeNull();
    // Settings is where the gate lives now. A redirect to a screen that does
    // not listen for the flag would be a bounce with no explanation, so this
    // asserts the dialog is actually up rather than only that the console is not.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/profile setting/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  test('unlocked, /me/admin redirects to Analytics', () => {
    setUnlocked(true);
    at('/app/me/admin');
    expect(screen.getByRole('link', { name: /Analytics/ })).toHaveAttribute('aria-current', 'page');
  });

  test('every tab is reachable and named, catalogue before queues', () => {
    setUnlocked(true);
    at('/app/me/admin/analytics');
    const strip = screen.getByRole('navigation', { name: /Admin sections/ });
    // 13 since 2026-09-10: Brands, Missions and Shop joined, so the console can
    // publish the things its queues are about, and the brands they are for.
    expect(TABS).toHaveLength(13);
    for (const slug of ['brands', 'missions', 'shop', 'events']) {
      expect(TABS.some((t) => t.slug === slug), slug).toBe(true);
    }
    for (const tab of TABS) {
      expect(strip.querySelector(`a[href="/app/me/admin/${tab.slug}"]`), tab.slug).toBeTruthy();
    }
  });

  test('the shell says whose account it is, and back returns to the profile', () => {
    setUnlocked(true);
    at('/app/me/admin/analytics');
    expect(screen.getByText(/Your campus · you@campus\.edu/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to me/ })).toHaveAttribute('href', '/app/me');
  });

  test('it carries no on-screen preview label — removed by request', () => {
    setUnlocked(true);
    at('/app/me/admin/analytics');
    expect(screen.queryByText(/Example data/)).toBeNull();
    expect(screen.queryByText(/campus lead/i)).toBeNull();
  });

  test('it draws no visible table, and no emoji', () => {
    setUnlocked(true);
    at('/app/me/admin/analytics');
    // The charts each carry a data table for screen readers. That is the
    // accessible fallback, not the enterprise data-grid PRODUCT.md rules out,
    // so every table here must be visually hidden.
    for (const table of screen.getAllByRole('table')) {
      expect(table.closest('.sr-only'), 'a visible table').not.toBeNull();
    }
    expect(document.querySelectorAll('.adm table.sr-only')).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('admin store', () => {
  const hook = () => renderHook(() => useAdmin(), { wrapper: AdminDataProvider });

  test('counts only the rows that are waiting on someone', () => {
    const { result } = hook();
    const { counts, orders, ugcSubmissions } = result.current;
    expect(counts.tasks).toBe(orders.filter((o) => o.needs).length);
    expect(counts.ugc).toBe(ugcSubmissions.filter((s) => s.status === 'pending' || s.status === 'submitted').length);
    expect(counts.withdrawals).toBeGreaterThan(0);
  });

  test('approving a return takes the order out of the queue and says so', () => {
    const { result } = hook();
    const target = result.current.orders.find((o) => o.needs === 'return');
    const before = result.current.counts.tasks;
    act(() => result.current.approveReturn(target.id));
    expect(result.current.counts.tasks).toBe(before - 1);
    expect(result.current.toast.title).toMatch(/Return approved/);
  });

  test('rejecting UGC keeps the reason on the row', () => {
    const { result } = hook();
    const target = result.current.ugcSubmissions.find((s) => s.status !== 'approved');
    act(() => result.current.rejectUgc(target.id, 'Missing the brand tag.'));
    const after = result.current.ugcSubmissions.find((s) => s.id === target.id);
    expect(after.status).toBe('rejected');
    expect(after.reject_reason).toBe('Missing the brand tag.');
  });

  test('a new campus joins the list and keeps its colour', () => {
    const { result } = hook();
    const before = result.current.campuses.length;
    act(() => result.current.addCampus({ name: 'Rice', primary_color: '#00205B' }));
    expect(result.current.campuses).toHaveLength(before + 1);
    expect(result.current.campuses.at(-1)).toMatchObject({ name: 'Rice', primary_color: '#00205B' });
  });

  test('nothing persists — a fresh provider is back to the fixture', () => {
    const first = hook();
    const target = first.result.current.orders.find((o) => o.needs === 'return');
    act(() => first.result.current.approveReturn(target.id));
    const second = hook();
    expect(second.result.current.counts.tasks).toBeGreaterThan(first.result.current.counts.tasks);
  });
});

describe('the old admin account screen is gone', () => {
  test('the fixture no longer claims the console is absent', () => {
    expect(hub.admin.note).toBeUndefined();
    expect(hub.admin.can).toBeUndefined();
  });

  test('but the account it is signed under still shows', () => {
    sessionStorage.clear();
    setUnlocked(true);
    at('/app/me/admin/analytics');
    expect(screen.getByText(/Your campus · you@campus\.edu/)).toBeInTheDocument();
  });
});

describe('the console starts at the top', () => {
  // The app has no global scroll reset (ScrollToHash is dormant), so a tab
  // switch would otherwise leave you wherever the last panel was scrolled to.
  // The canvas calls window.scrollTo(0, 0) on every navigation; so does this.
  test('switching panels scrolls back to the top', async () => {
    const user = userEvent.setup();
    sessionStorage.clear();
    setUnlocked(true);
    const spy = vi.spyOn(window, 'scrollTo');
    at('/app/me/admin/analytics');
    spy.mockClear();
    await user.click(screen.getByRole('link', { name: /Withdrawals/ }));
    expect(spy).toHaveBeenCalledWith(0, 0);
    spy.mockRestore();
  });
});
