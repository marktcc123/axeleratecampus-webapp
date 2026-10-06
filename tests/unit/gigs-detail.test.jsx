import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import GigsDetail from '../../src/app/screens/GigsDetail.jsx';
// The catalogue as a screen sees it: the fixtures with the brand's name joined
// in from the brands table. The raw JSON carries `brandId` and no display name.
import { FIXTURES } from '../../src/app/content.jsx';
import people from '../../src/data/people.example.json';
import { brandPath } from '../../src/app/parts/Brands.jsx';

const missions = FIXTURES.missions;

const at = (slug) =>
  render(
    <MemoryRouter initialEntries={[`/app/gigs/${slug}`]}>
      <Routes><Route path="/app/gigs/:slug" element={<GigsDetail />} /></Routes>
    </MemoryRouter>
  );

const d = missions.find((m) => m.slug === 'dermabell-campus-launch');
const open = missions.find((m) => m.slug === 'solra-unboxing-reel');

describe('GigsDetail', () => {
  test('the page shows its own cover, not the tile\'s (owner, 2026-09-09)', () => {
    for (const m of missions) {
      expect(m.detailCover, `${m.slug} needs a detailCover`).toBeTruthy();
      expect(m.detailCover).not.toBe(m.cover);
    }
    at(d.slug);
    const img = document.querySelector('.gd__cover img');
    expect(img.getAttribute('src')).toContain(d.detailCover);
    expect(img.getAttribute('src')).not.toContain(d.cover);
  });

  test('the host line opens the brand page and remembers where it came from', () => {
    at(d.slug);
    const link = screen.getByRole('link', { name: d.host.name });
    expect(link).toHaveAttribute('href', brandPath(d.brandId));
  });

  test('renders the mission title, host and tags', () => {
    at(d.slug);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(d.title);
    expect(screen.getByText('Axelerate Beauty')).toBeInTheDocument();
    // A mark and the brand's name, and nothing else. The role used to sit
    // under the name — "US operating partner for Dermabell" — and the block
    // read as a second title.
    expect(document.querySelector('.gd__host-role')).toBeNull();
    const host = document.querySelector('.gd__host');
    expect(host).toHaveTextContent('Axelerate Beauty');
    // Scoped to the host block: the role's own wording also appears in the
    // mission description, which is where it belongs.
    expect(host).not.toHaveTextContent(/US operating partner/);
    // One caps line now, not Tag stickers — the swap the board made first.
    expect(document.querySelector('.gd__caps'))
      .toHaveTextContent(d.tags.map((t) => t.label).join(' · '));
    expect(screen.queryByText('K-beauty')).toBeNull();
  });

  test('the earn note shows cash, credit and XP in three columns', () => {
    at(d.slug);
    const earn = screen.getByTestId('earn');
    expect(within(earn).getByText('$50')).toBeInTheDocument();
    // The credit column's sublabel used to carry "credit · $80 in shop",
    // because money rule R1 does not let a credit figure stand alone. The
    // owner asked for the shop value off this note on 2026-09-02; the wallet,
    // the cart and the gift sheet all still spell it out, and so does the
    // fixture's own perk bullet further down this page.
    expect(within(earn).getByText('+8,000')).toBeInTheDocument();
    expect(within(earn).getByText('credit')).toBeInTheDocument();
    expect(within(earn).queryByText(/in shop/)).toBeNull();
    expect(within(earn).getByText('+1,000')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b8,000 pts\b/);
  });

  test('shows the deadline and spots', () => {
    at(d.slug);
    expect(screen.getByText('Ongoing')).toBeInTheDocument();
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });

  test('the whole brief is open — no section is behind a tap', () => {
    at(d.slug);
    // These were an exclusive accordion: one section open, the other two
    // hidden behind a 44px button with a chevron.
    expect(document.querySelectorAll('.gd__acc-btn')).toHaveLength(0);
    for (const name of ["What you'll do", "What's in it for you?", 'Support & training']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    // And the bodies of all three are on the page at once.
    expect(screen.getByText(d.steps[0])).toBeInTheDocument();
    expect(screen.getByText(d.support[0])).toBeInTheDocument();
  });

  test('the apply bar carries the deadline and the action, in the tab bar\'s place', () => {
    at(open.slug);
    const bar = screen.getByTestId('apply-bar');
    expect(within(bar).getByText('Apply by')).toBeInTheDocument();
    const when = new Date(`${open.deadlineOn}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    expect(within(bar).getByText(when)).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  test('a rolling mission says so instead of inventing a date', () => {
    // "Ongoing" and "your dorm, your night" carry no deadline in the fixture,
    // and a made-up date on a pass students act on is worse than no date.
    const rolling = missions.find((m) => !m.deadlineOn);
    at(rolling.slug);
    const bar = screen.getByTestId('apply-bar');
    expect(within(bar).getByText('Open until it fills')).toBeInTheDocument();
    expect(within(bar).queryByText('Apply by')).toBeNull();
  });

  test('who is going opens a list, and each row is that student\'s profile', async () => {
    const user = userEvent.setup();
    at(open.slug);
    // The count is a control, not a caption: the pips are three coloured
    // initials standing for however many people, so they are aria-hidden and
    // the button carries the name.
    const go = screen.getByRole('button', { name: `${open.spots.taken} going — see who` });
    await user.click(go);

    const rows = screen.getAllByTestId('crew-row');
    expect(rows).toHaveLength(open.going.length);
    for (const [i, handle] of open.going.entries()) {
      const person = people.find((x) => x.handle === handle);
      expect(person, `${handle} is not in people.example.json`).toBeTruthy();
      expect(rows[i]).toHaveTextContent(person.name);
      expect(rows[i]).toHaveTextContent(person.campus);
      expect(rows[i]).toHaveAttribute('href', `/u/${handle}`);
    }
  });

  test('every mission counts its crew rather than storing a second number', () => {
    // `spots.taken` and `going` are the same fact written twice, which is how
    // the events fixture ended up with three wrong weekdays.
    for (const m of missions.filter((x) => x.spots)) {
      expect(m.going, `${m.slug} has spots but nobody in them`).toBeTruthy();
      expect(m.spots.taken, m.slug).toBe(m.going.length);
      expect(m.spots.taken, `${m.slug} claims more crew than spots`)
        .toBeLessThanOrEqual(m.spots.total);
    }
  });

  test('the three facts lead the body, then About the mission and the brief', () => {
    const { container } = at(open.slug);
    const prose = container.querySelector('.gd__prose');
    const meta = container.querySelector('.gd__earn-meta');
    // The whole brief sits on the one paper now (2026-09-08), so "off the
    // sheet" stopped meaning anything; what still matters is that the facts
    // are in the body, not on the header block above it.
    expect(container.querySelector('.gd__body').contains(meta), 'the meta row is in the body').toBe(true);
    expect(container.querySelector('.gd__host')?.contains(meta) ?? false).toBe(false);
    const follows = (a, b) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    // The terms first, then "About the mission" over the copy (owner, 2026-09-09).
    expect(follows(meta, prose)).toBe(true);
    const about = [...container.querySelectorAll('.gd__section-label')].find((h) => /About the mission/.test(h.textContent));
    expect(about).toBeTruthy();
    expect(follows(meta, about)).toBe(true);
    expect(follows(about, prose)).toBe(true);
  });

  test('each earn column reads label then figure', () => {
    const { container } = at(open.slug);
    for (const col of container.querySelectorAll('[data-testid="earn"] > div')) {
      expect(col.firstElementChild.className).toContain('gd__earn-lab');
      expect(col.lastElementChild.className).toContain('gd__earn-fig');
    }
  });

  test('the deadline row shows a date, and a duration beside it', () => {
    at(open.slug);
    const meta = document.querySelector('.gd__earn-meta');
    expect(meta).toHaveTextContent('Duration');
    expect(meta).toHaveTextContent('45 min');   // 0.75 hours, not "0.75 hr"
    expect(meta).toHaveTextContent('Sun, Sep 6');
    expect(meta).not.toHaveTextContent('This week');
  });

  test('the three field-execution steps render, numbered', () => {
    at(d.slug);
    // Scoped to the steps list: with every section open the page also carries
    // the perk bullets, so getAllByRole('listitem') is no longer these three.
    const steps = [...document.querySelectorAll('.gd__steps .gd__step')];
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent(/Target & scout/);
    expect(steps[2]).toHaveTextContent(/training materials/);
    expect(steps.map((s) => s.querySelector('.gd__step-n').textContent)).toEqual(['1', '2', '3']);
  });

  test('Apply opens a sheet saying applications are not live, and never submits', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    at(open.slug);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const sheet = screen.getByRole('dialog', { name: 'Apply' });
    expect(within(sheet).getByText(/opens at launch/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Apply' })).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  test('closing the apply sheet returns focus to the Apply button', async () => {
    const user = userEvent.setup();
    at(open.slug);
    const applyBtn = screen.getByRole('button', { name: 'Apply' });
    await user.click(applyBtn);
    await user.click(within(screen.getByRole('dialog', { name: 'Apply' })).getByRole('button', { name: 'Close' }));
    expect(applyBtn).toHaveFocus();
  });

  test('Escape closes the apply sheet and also returns focus', async () => {
    const user = userEvent.setup();
    at(open.slug);
    const applyBtn = screen.getByRole('button', { name: 'Apply' });
    await user.click(applyBtn);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Apply' })).not.toBeInTheDocument();
    expect(applyBtn).toHaveFocus();
  });

  test('focus is trapped inside the open apply sheet', async () => {
    const user = userEvent.setup();
    at(open.slug);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const sheet = screen.getByRole('dialog', { name: 'Apply' });
    const focusables = [...sheet.querySelectorAll('a[href], button:not([disabled])')];
    expect(focusables[0]).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(focusables[focusables.length - 1]).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(focusables[0]).toHaveFocus();
  });

  test('the back link returns to the board', () => {
    at(d.slug);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/app/earn');
  });

  test('an unknown slug renders not-found copy rather than crashing', () => {
    at('no-such-mission');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/isn't here/);
  });

  test('a mission above the student\'s level states its distance where Apply would be (R8)', () => {
    at(d.slug);
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(document.querySelector('.gd__locked')).toHaveTextContent(/LV\.4 · [\d,]+ XP away/);
    // Still readable: the brief, the pay and the perks are all there.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(d.title);
    expect(document.body.textContent).not.toMatch(/\blocked\b/i);
  });

  test('an in-reach mission still offers Apply', () => {
    at(open.slug);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(document.querySelector('.gd__locked')).toBeNull();
  });

  test('renders no emoji and no banned words', () => {
    at(d.slug);
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(document.body.textContent).not.toMatch(/\b(synergy|leverage|ecosystem|empower|successfully)\b/i);
  });

  test("a non-Dermabell mission shows its own perks and support, never Dermabell's (Critical 1)", () => {
    const fable = missions.find((m) => m.slug === 'solra-unboxing-reel');
    at(fable.slug);
    for (const b of fable.perkBullets) {
      expect(screen.getByText(new RegExp(b.lead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    }
    for (const p of fable.support) {
      expect(screen.getByText(p)).toBeInTheDocument();
    }
    expect(document.body.textContent).not.toMatch(/\b(commission|salon|B2B)\b/i);
  });
});

describe('a mission that has left the board', () => {
  test("an application's slug that is no longer on the board shows the ended page, not a 404", () => {
    at('halo-sampling-table');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This mission has ended');
    expect(screen.getByText(/Halo — sampling table/)).toBeInTheDocument();
    // /app/me/missions, where the tracker moved (owner, 2026-09-17). It read
    // /app/join until 2026-09-18, which still resolves — as a redirect to the
    // Unlock tab, so the link named one screen and opened another.
    expect(screen.getByRole('link', { name: /Back to mission tracker/ })).toHaveAttribute('href', '/app/me/missions');
    expect(screen.queryByRole('button', { name: /Apply/ })).toBeNull();
  });

  test('a slug nobody applied to is still a wrong URL', () => {
    at('definitely-not-a-mission');
    expect(screen.queryByText('This mission has ended')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent('This mission has ended');
  });
});

describe('Back and Share over the cover (owner, 2026-09-09)', () => {
  test('Share hands out this mission\'s own address through the platform sheet', async () => {
    const user = userEvent.setup();
    at(open.slug);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/app/earn');
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    await user.click(screen.getByTestId('share-page'));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining(open.slug) }));   // the harness mounts at /app/gigs/:slug
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
});
