import { render, screen, within } from '@testing-library/react';
import { usd } from '../../src/app/parts/Money.jsx';
import { MemoryRouter } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import Levels from '../../src/app/screens/Levels.jsx';
import Application from '../../src/app/screens/Application.jsx';
import levels from '../../src/data/levels.example.json';
import applications from '../../src/data/applications.example.json';
import missions from '../../src/data/missions.example.json';
import { ME } from '../../src/app/me.js';

const wrap = (ui) => render(<ProfileProvider><WalletProvider><MemoryRouter>{ui}</MemoryRouter></WalletProvider></ProfileProvider>);

describe('Levels — the ladder, now at /me/levels', () => {
  test('lists all five levels in order, with the Syndicate after them and not among them', () => {
    wrap(<Levels />);
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    // R9's five, in order, then the Syndicate — which sits above Partner and is
    // not a level you climb to, so it must never be counted as a sixth.
    expect(names).toEqual(['Explorer', 'Contributor', 'Insider', 'Trusted', 'Partner', 'Syndicate']);
    expect(screen.queryByTestId('level-6')).toBeNull();
    for (const p of levels[0].perks) expect(screen.getByText(p)).toBeInTheDocument();
  });

  test("marks the student's current level and shows distance on locked ones (R8)", () => {
    wrap(<Levels />);
    const mine = screen.getByTestId(`level-${ME.level}`);
    expect(mine.dataset.state).toBe('current');
    const locked = screen.getByTestId(`level-${ME.level + 1}`);
    expect(locked.dataset.state).toBe('locked');
    expect(within(locked).getByText(/XP away/)).toBeInTheDocument();
    expect(locked.textContent).not.toMatch(/^locked$/i);
  });

  // The lilac note that carried R4 and the credit balance was removed at the
  // owner's request. R4 is now stated nowhere in the app; R1 stays covered by
  // the wallet and hub screens and by tests/unit/money.test.js.

  test('promises no extra pay (R7)', () => {
    wrap(<Levels />);
    expect(document.body.textContent).not.toMatch(/earn more|higher pay|more pay|pay multiplier/i);
  });
});

describe('Mission tracker (was Applications)', () => {
  const rows = () => screen.getAllByTestId('application-row');

  test('lists every application with its mission, pay and status', () => {
    wrap(<Application />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mission tracker');
    expect(rows()).toHaveLength(applications.length);
    for (const a of applications) {
      expect(screen.getByText(a.title)).toBeInTheDocument();
      expect(screen.getByText(usd(a.payUsd))).toBeInTheDocument();
    }
  });

  test('every folder arrives shut, so none of them picks for the reader', () => {
    wrap(<Application />);
    for (const b of screen.getAllByRole('button', { expanded: false })) expect(b).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0);
  });

  test("the tab's colour and its word follow the status, not the row", () => {
    wrap(<Application />);
    const label = { applied: 'In review', submitted: 'Submitted', paid: 'Paid' };
    for (const row of rows()) {
      expect(row.className).toMatch(/af--(blush|lavender|orange)/);
      expect(row.querySelector('.af__tab')).toHaveTextContent(label[row.dataset.status]);
    }
    // "Completed" became "Paid" on 2026-09-08; the fixture no longer carries a
    // `tab` of its own for the word to disagree with.
    expect(screen.queryByText('Completed')).toBeNull();
    for (const a of applications) expect(a).not.toHaveProperty('tab');
  });

  test('paid ones sink to the bottom; the rest keep the fixture order', () => {
    wrap(<Application />);
    const statuses = rows().map((r) => r.dataset.status);
    const firstPaid = statuses.indexOf('paid');
    expect(firstPaid).toBeGreaterThan(0);
    expect(statuses.slice(firstPaid).every((s) => s === 'paid')).toBe(true);
    expect(statuses.slice(0, firstPaid).every((s) => s !== 'paid')).toBe(true);
  });

  test('every row opens its mission — the list never says one has left the board', () => {
    wrap(<Application />);
    const links = screen.getAllByRole('link', { name: /Open the mission/ });
    expect(links).toHaveLength(applications.length);
    for (const [i, a] of applications.entries()) {
      expect(screen.getAllByRole('link', { name: /Open the mission/ }).some((l) => l.getAttribute('href') === `/app/earn/${a.missionSlug}`), a.title).toBe(true);
    }
    expect(screen.queryByText(/left the board/)).toBeNull();
    // Two of them point at missions the board no longer carries. That is the
    // mission page's news to break (see gigs-detail.test), not the tracker's.
    const onBoard = new Set(missions.map((m) => m.slug));
    expect(applications.filter((a) => !onBoard.has(a.missionSlug)).length).toBeGreaterThan(0);
  });

  test('nothing implies a real submission', () => {
    wrap(<Application />);
    // The folder heads are buttons and one of them reads "Submitted", so the
    // check is for a control that would ACT, not a word: no form, and no
    // button whose name starts with a submitting verb.
    expect(document.querySelector('form')).toBeNull();
    for (const b of screen.getAllByRole('button')) expect(b).not.toHaveAccessibleName(/^(submit|send|apply)\b/i);
  });
});
