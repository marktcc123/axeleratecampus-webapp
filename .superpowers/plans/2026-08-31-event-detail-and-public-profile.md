# Event Detail and Public Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the board's event cards a destination — an event detail page with a guest list — and give each guest a link-only public profile at `/user/:handle`.

**Architecture:** Two new routes. `/app/earn/events/:id` renders inside the app shell from `events.example.json`; `/user/:handle` renders standalone from a new `people.example.json`, outside both the shell and the `/app` prefix, because it is shown to people who may never have an account. Guests are stored as handle references, never embedded people, so one person appears on several events without their details being copied. The seat CTA holds session state exactly as the cart does.

**Tech Stack:** Vite 5 + React 18, React Router nested routes, `axelerate-design-system` pinned at `#ea6b1d0`, Vitest + Testing Library (jsdom), Playwright.

**Spec:** `.superpowers/specs/2026-08-31-event-detail-and-public-profile-design.md` — read it before Task 1. The plan argues from the spec; where they disagree, the spec is right.

## Global Constraints

Every task's requirements implicitly include all of these.

- **Money never appears on a public profile, and `people.example.json` carries no money field at all.** Data that does not exist cannot leak through a later careless render. A unit test asserts the absence.
- **No missions, brands, streak, on-time rate or age on the profile.** Owner's choice; the profile is identity plus level.
- **The profile is link-only, not access-controlled.** Anyone with the URL reads it. No copy on the page may imply otherwise.
- **Every `font-size` under `src/app/` and `src/pages/` must name a ladder rung** — `var(--text-3xs|xs|sm|lg|xl|2xl)` = 10·12·14·17·21px. `tests/unit/type-scale.test.js` fails hardcoded values.
- **`min-height` and `height` stack on padding for content-box elements.** `<button>` is border-box by UA default; `<div>`, `<a>` and `<li>` are not. Set `box-sizing: border-box` whenever you set either alongside vertical padding — an `@guard` e2e enforces this.
- **Touch floor 44×44 on both axes**, measured on the element's own box. Pad the button, not a pseudo-element.
- **Cascade race.** DS components inject their `<style>` after the app's bundle, so an app rule at (0,1,0) on an element wearing an `ax-*` class loses. Scope under a parent to reach (0,2,0). Never `!important`, never target `.ax-*`.
- **No blurred shadows.** Every shadow in this system is a hard offset (`--shadow-paper` is `2px 3px 0`).
- **`Button` is not polymorphic** — no `as` prop. Navigation is a `<Link>` styled in app CSS, never `.ax-btn` borrowed.
- **Voice:** sentence case, verb-first, numerals, no emoji in chrome, never "the user". Banned register: cutting-edge, world-class, seamless, supercharge.
- **Screenshot every new screen at 320 and 390 before calling it done.** jsdom does no layout; every layout defect in this repo was found this way.
- **Commands:** `npm test` · `npx vitest run tests/unit/<file>` · `npm run test:e2e:guards` (~4s) · `npm run test:e2e` (~3min) · `npm run dev`.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/data/people.example.json` | The people a guest list points at. Handle, name, campus, level, XP. No money. |
| `src/app/screens/EventDetail.jsx` | One event: when, where, blurb, seats, guest list, CTA. |
| `src/app/screens/event-detail.css` | Its layout, including the guest grid. |
| `src/app/parts/GuestGrid.jsx` | The guest tiles. Own file because the ticket screen is a plausible second caller. |
| `src/pages/PublicProfile.jsx` | `/user/:handle`, standalone. Lives in `pages/` with the other non-shell screens. |
| `src/pages/public-profile.css` | Its layout. |
| `src/app/useNoIndex.js` | Injects and removes the robots meta tag. |
| `public/robots.txt` | Disallows `/user/`. |
| `tests/unit/event-detail.test.jsx` | Detail screen and guest grid. |
| `tests/unit/public-profile.test.jsx` | Profile, including the money-absence guard. |

**Modified**

| File | Change |
|---|---|
| `src/data/events.example.json` | `date`, `time`, `venue`, `blurb`, `guests[]`; one event to `seatsLeft: 0`. |
| `src/App.jsx` | Two routes. |
| `src/app/screens/GigsBoard.jsx` | Event cards become `<Link>`s. |
| `tests/unit/gigs-board.test.jsx` | The cards-are-not-links assertion inverts. |
| `tests/unit/fixtures.test.js` | Handle resolution and level-name pairing. |
| `tests/e2e/responsive.spec.js` | Both routes join the sweeps; a `@guard` for noindex. |
| `README.md` | The routes, and the `X-Robots-Tag` a real deployment needs. |

---

### Task 1: The people fixture, and events that know their guests

**Files:**
- Create: `src/data/people.example.json`
- Modify: `src/data/events.example.json`, `tests/unit/fixtures.test.js`

**Interfaces:**
- Produces: a person is `{ handle, name, campus, level, levelName, xp, xpToNext, verified }`. `handle` is the URL segment. `xpToNext` is the **absolute XP the next level starts at**, so a bar is `value={xp} total={xpToNext}`. An event gains `{ date, time, venue, blurb, guests: string[] }`.

- [ ] **Step 1: Write the failing fixture tests**

Append to `tests/unit/fixtures.test.js`:

```js
import people from '../../src/data/people.example.json';
import boardEvents from '../../src/data/events.example.json';
import levels from '../../src/data/levels.example.json';

describe('people and guests', () => {
  test('a person carries identity and level, and no money at all', () => {
    expect(people.length).toBeGreaterThan(5);
    const MONEY = /(usd|cash|paid|earn|payout|price|amount|credit)/i;
    for (const p of people) {
      expect(Object.keys(p).sort()).toEqual(
        ['campus', 'handle', 'level', 'levelName', 'name', 'verified', 'xp', 'xpToNext'],
      );
      // Belt and braces: a field added later that merely LOOKS like money
      // fails here too, because this page must never grow one.
      for (const k of Object.keys(p)) expect(k).not.toMatch(MONEY);
    }
  });

  test('handles are URL-safe and unique', () => {
    const seen = new Set();
    for (const p of people) {
      expect(p.handle).toMatch(/^[a-z0-9][a-z0-9-]{1,29}$/);
      expect(seen.has(p.handle), `${p.handle} twice`).toBe(false);
      seen.add(p.handle);
    }
  });

  test('every level name matches the ladder', () => {
    const byLevel = new Map(levels.map((l) => [l.level, l.name]));
    for (const p of people) expect(p.levelName).toBe(byLevel.get(p.level));
  });

  test('xpToNext is a threshold above xp, not a remainder', () => {
    for (const p of people) expect(p.xpToNext).toBeGreaterThan(p.xp);
  });

  test('every guest handle resolves to a person', () => {
    const handles = new Set(people.map((p) => p.handle));
    for (const e of boardEvents) {
      expect(Array.isArray(e.guests), `${e.id} has guests`).toBe(true);
      for (const h of e.guests) expect(handles.has(h), `${e.id} → ${h}`).toBe(true);
    }
  });

  test('every event carries when, where and a blurb', () => {
    for (const e of boardEvents) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.time).toBeTruthy();
      expect(e.venue).toBeTruthy();
      expect(e.blurb.length).toBeGreaterThan(20);
    }
  });

  test('one event is sold out, so the state is real and not theoretical', () => {
    expect(boardEvents.some((e) => e.seatsLeft === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/fixtures.test.js`
Expected: FAIL — `Cannot find module '../../src/data/people.example.json'`.

- [ ] **Step 3: Write the people fixture**

Create `src/data/people.example.json`:

```json
[
  { "handle": "marktao", "name": "Mark Tao", "campus": "UCLA", "level": 3, "levelName": "Insider", "xp": 2400, "xpToNext": 3600, "verified": true },
  { "handle": "mayaortiz", "name": "Maya Ortiz", "campus": "Cornell Tech", "level": 4, "levelName": "Trusted", "xp": 4120, "xpToNext": 6000, "verified": true },
  { "handle": "devonpark", "name": "Devon Park", "campus": "NYU", "level": 2, "levelName": "Contributor", "xp": 980, "xpToNext": 1800, "verified": true },
  { "handle": "priyaraman", "name": "Priya Raman", "campus": "NYU", "level": 3, "levelName": "Insider", "xp": 2050, "xpToNext": 3600, "verified": true },
  { "handle": "alexchen", "name": "Alex Chen", "campus": "UCLA", "level": 2, "levelName": "Contributor", "xp": 1240, "xpToNext": 1800, "verified": true },
  { "handle": "samwhitfield", "name": "Sam Whitfield", "campus": "UCLA", "level": 1, "levelName": "Explorer", "xp": 320, "xpToNext": 800, "verified": false },
  { "handle": "ninaadeyemi", "name": "Nina Adeyemi", "campus": "UT Austin", "level": 4, "levelName": "Trusted", "xp": 5210, "xpToNext": 6000, "verified": true },
  { "handle": "jonahreed", "name": "Jonah Reed", "campus": "UT Austin", "level": 1, "levelName": "Explorer", "xp": 140, "xpToNext": 800, "verified": false }
]
```

- [ ] **Step 4: Add the event fields**

Run this once from the repo root. It is a script rather than hand-editing so the eight events stay consistent:

```bash
node -e "
const fs = require('fs');
const p = 'src/data/events.example.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const EXTRA = {
  ev1: { date: '2026-09-08', time: '6–7pm', venue: 'Student union, room 2B', guests: ['marktao','mayaortiz','alexchen','samwhitfield'],
         blurb: 'Forty minutes with the founder of Axelerate Beauty on what a brand actually wants from a campus creator, then open questions.' },
  ev2: { date: '2026-09-11', time: '7–9pm', venue: 'Dorm commons, Hedrick', guests: ['devonpark','priyaraman','jonahreed'],
         blurb: 'Six student startups, one mic, five minutes each. Stay for the pizza and the arguing afterwards.' },
  ev3: { date: '2026-09-15', time: '8–11am', venue: 'Olin lobby', guests: ['mayaortiz','ninaadeyemi','marktao','priyaraman','alexchen','devonpark','samwhitfield'],
         blurb: 'Hand out Solra samples to the morning rush. Two hours, coffee provided, and you keep what is left in the box.' },
  ev4: { date: '2026-09-17', time: '12–1pm', venue: 'Zoom', guests: ['alexchen','jonahreed'],
         blurb: 'Bring a draft. We read it back, say what a brand would cut, and you leave with a reel worth posting.' },
  ev5: { date: '2026-09-19', time: '6–9pm', venue: 'Warehouse 12, Brooklyn', guests: ['marktao','ninaadeyemi','devonpark'],
         blurb: 'Work the door at Loop\\'s warehouse set: scan tickets, hand out wristbands, keep the line moving.' },
  ev6: { date: '2026-09-24', time: '7pm', venue: 'Tata Hall rooftop', guests: ['mayaortiz','priyaraman','samwhitfield','alexchen','ninaadeyemi'],
         blurb: 'Four founders, an open floor and no panel. Come with a question you actually want answered.' },
  ev7: { date: '2026-09-26', time: '4–5pm', venue: 'Discord', guests: ['jonahreed'],
         blurb: 'Drop in with anything: a mission you are stuck on, a brief you cannot read, or how the levels work.' },
  ev8: { date: '2026-09-29', time: '7–9am', venue: 'Royce quad', guests: ['devonpark','marktao'],
         blurb: 'Chalk three Notely drops across the quad before the campus wakes up. Stencils provided.' },
};
for (const e of d) Object.assign(e, EXTRA[e.id]);
// One sold out, so the state is real rather than theoretical.
d.find((e) => e.id === 'ev8').seatsLeft = 0;
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
console.log(d.length, 'events;', d.filter((e) => e.seatsLeft === 0).length, 'sold out');
"
```

Expected: `8 events; 1 sold out`

- [ ] **Step 5: Run the fixture tests**

Run: `npx vitest run tests/unit/fixtures.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/people.example.json src/data/events.example.json tests/unit/fixtures.test.js
git commit -m "Give events a guest list, and guests a person to be"
```

---

### Task 2: The public profile

**Files:**
- Create: `src/pages/PublicProfile.jsx`, `src/pages/public-profile.css`, `src/app/useNoIndex.js`, `public/robots.txt`, `tests/unit/public-profile.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `people.example.json` from Task 1.
- Produces: route `/user/:handle`; `useNoIndex()` from `src/app/useNoIndex.js`, which takes no arguments and returns nothing.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/public-profile.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import people from '../../src/data/people.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const mark = people.find((p) => p.handle === 'marktao');

describe('the public profile', () => {
  test('states who this is, where, and how far up the ladder', () => {
    at('/user/marktao');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(mark.name);
    expect(screen.getByText(mark.campus)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mark.levelName))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mark.xp.toLocaleString('en-US')))).toBeInTheDocument();
  });

  test('shows no money, in any form', () => {
    at('/user/marktao');
    // The fixture has no money field, so this is the second line of defence:
    // a currency symbol reaching this page at all is the bug.
    expect(document.body.textContent).not.toMatch(/\$|USD|earned|payout|paid/i);
  });

  test('carries none of the app chrome', () => {
    at('/user/marktao');
    // No tab bar: this page is shown to people who have no account, and four
    // destinations they cannot use is worse than none.
    expect(screen.queryByRole('navigation', { name: /App/i })).toBeNull();
  });

  test('an unknown handle is a 404, not an empty card', () => {
    at('/user/nobody');
    // An empty card invites guessing at handles.
    expect(screen.queryByRole('heading', { level: 1 })).not.toHaveTextContent('Nobody');
    expect(document.body.textContent).toMatch(/not found/i);
  });

  test('asks not to be indexed while it is mounted', () => {
    const view = at('/user/marktao');
    const meta = document.head.querySelector('meta[name="robots"]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('content')).toMatch(/noindex/);
    view.unmount();
    // And takes the tag with it: this is a SPA, and a tag left behind would
    // de-index the app itself on the next route.
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/public-profile.test.jsx`
Expected: FAIL — `/user/marktao` renders the 404, so the heading assertion fails.

- [ ] **Step 3: Write the noindex hook**

Create `src/app/useNoIndex.js`:

```js
import { useEffect } from 'react';

// Adds <meta name="robots" content="noindex"> while the calling screen is
// mounted, and removes it on the way out.
//
// A static tag in index.html cannot do this job: the app is one HTML document
// served for every path, so a tag there would de-index the whole product. And
// this alone is not enough either — a crawler that does not run JavaScript
// never sees it, which is why public/robots.txt disallows /user/ as well.
//
// Neither is access control. Anyone holding the link reads the page.
export function useNoIndex() {
  useEffect(() => {
    const existing = document.head.querySelector('meta[name="robots"]');
    if (existing) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
```

- [ ] **Step 4: Write robots.txt**

Create `public/robots.txt`:

```
# Public profiles are reachable by link and are not for indexing.
# The route also sets <meta name="robots" content="noindex"> while mounted;
# a real deployment should add an X-Robots-Tag: noindex response header for
# /user/*, which neither of those two can supply from the client.
User-agent: *
Disallow: /user/
```

- [ ] **Step 5: Write the profile screen**

Create `src/pages/PublicProfile.jsx`:

```jsx
import { Link, useParams } from 'react-router-dom';
import { MarkerBar } from 'axelerate-design-system';
import Icon from '../components/Icon.jsx';
import ImageSlot from '../app/ImageSlot.jsx';
import { useNoIndex } from '../app/useNoIndex.js';
import people from '../data/people.example.json';
import NotFoundPage from './NotFoundPage.jsx';
import './public-profile.css';

// One student's public card, at /user/:handle.
//
// Outside the app shell and outside /app on purpose: this is shown to someone
// who may never have an account, and a tab bar would offer them four
// destinations they cannot use.
//
// What is NOT here is the design: no earnings in any form, no mission history,
// no streak, no age. The fixture behind it carries no money field at all, so
// there is nothing for a careless render to leak.
export default function PublicProfile() {
  const { handle } = useParams();
  const person = people.find((p) => p.handle === handle);
  useNoIndex();

  if (!person) return <NotFoundPage />;

  const away = Math.max(0, person.xpToNext - person.xp);

  return (
    <main className="pp">
      <div className="pp__inner">
        <Link to="/" className="pp__brand">axelerate</Link>

        <div className="pp__avatar"><ImageSlot label={person.name} radius={999} /></div>

        <h1 className="pp__name">
          {person.name}
          {person.verified && (
            <Icon name="tick-2" size={18} className="pp__tick" aria-label="Verified student" />
          )}
        </h1>
        <p className="pp__campus">{person.campus}</p>

        <div className="pp__level">
          <p className="pp__level-name">LV.{person.level} · {person.levelName}</p>
          <MarkerBar
            color="violet"
            ticks={26}
            height={18}
            total={person.xpToNext}
            value={person.xp}
            style={{ width: '100%' }}
          />
          <p className="pp__xp">
            {person.xp.toLocaleString('en-US')} XP · {away.toLocaleString('en-US')} to LV.{person.level + 1}
          </p>
        </div>

        {/* Says what the page is without implying a CV it does not carry. */}
        <p className="pp__foot">An Axelerate profile. Students run paid brand missions and climb.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Write its CSS**

Create `src/pages/public-profile.css`:

```css
/* The public profile. Centred and narrow: it is one card about one person,
   read by someone who arrived from a link with no other context. */
.pp { min-height: 100vh; padding: 28px 16px 44px; background: var(--surface-page); }
.pp__inner { max-width: 420px; margin: 0 auto; text-align: center; }

.pp__brand {
  display: inline-block;
  margin-bottom: 26px;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--violet-600);
  text-decoration: none;
}

.pp__avatar { width: 108px; height: 108px; margin: 0 auto 14px; }

.pp__name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 0;
  font-family: var(--font-title);
  font-size: var(--text-xl);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  color: var(--text-primary);
}
.pp__tick { color: var(--violet-600); flex: none; }
.pp__campus { margin: 5px 0 0; font-size: var(--text-sm); color: var(--gray-600); }

.pp__level { margin-top: 26px; text-align: left; }
.pp__level-name {
  margin: 0 0 8px;
  font-family: var(--font-label);
  font-size: var(--text-3xs);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-brand);
}
.pp__xp {
  margin: 8px 0 0;
  font-family: var(--font-label);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--gray-600);
}

.pp__foot { margin: 30px 0 0; font-size: var(--text-xs); color: var(--gray-600); }
```

- [ ] **Step 7: Add the route**

In `src/App.jsx`, import `PublicProfile` and add the route beside `/verify`, **outside** the `<Route element={<AppShell />}>` group:

```jsx
      <Route path="/user/:handle" element={<PublicProfile />} />
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run tests/unit/public-profile.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 9: Screenshot it**

```bash
npm run dev
```

then, in a second shell:

```bash
node --input-type=module -e "
import { chromium } from 'playwright';
const b = await chromium.launch();
for (const w of [320, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('http://localhost:5173/user/marktao');
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'pp-' + w + '.png', fullPage: true });
  const d = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(w, 'overflow:', d.sw > d.cw);
  await p.close();
}
await b.close();
"
```

Look at both. The name must not collide with the tick, the XP line must not wrap mid-figure, and there must be no tab bar. Delete the PNGs before committing.

- [ ] **Step 10: Commit**

```bash
git add src/pages/PublicProfile.jsx src/pages/public-profile.css src/app/useNoIndex.js public/robots.txt src/App.jsx tests/unit/public-profile.test.jsx
git commit -m "Add the public profile at /user/:handle"
```

---

### Task 3: The event detail screen

**Files:**
- Create: `src/app/screens/EventDetail.jsx`, `src/app/screens/event-detail.css`, `tests/unit/event-detail.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: the event fields from Task 1.
- Produces: route `/app/earn/events/:id`. Task 4 adds the guest grid to this screen; Task 5 adds the CTA.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/event-detail.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import boardEvents from '../../src/data/events.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const ev = boardEvents.find((e) => e.seatsLeft > 0);

describe('event detail', () => {
  test('states what it is, when, where and how many seats are left', () => {
    at(`/app/earn/events/${ev.id}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ev.title);
    expect(screen.getByText(new RegExp(ev.venue))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(ev.time))).toBeInTheDocument();
    expect(screen.getByText(ev.blurb)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${ev.seatsLeft} seats left`))).toBeInTheDocument();
  });

  test('the date reads as a date, not as an ISO string', () => {
    at(`/app/earn/events/${ev.id}`);
    // 2026-09-08 breaks across lines in a 320px row and the year is noise.
    expect(document.body.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(screen.getByText(/Sep \d+/)).toBeInTheDocument();
  });

  test('back returns to the board', () => {
    at(`/app/earn/events/${ev.id}`);
    expect(screen.getByRole('link', { name: /Back/ })).toHaveAttribute('href', '/app/earn');
  });

  test('an unknown event is a 404', () => {
    at('/app/earn/events/nope');
    expect(document.body.textContent).toMatch(/not found/i);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/event-detail.test.jsx`
Expected: FAIL — the route renders the app's 404.

- [ ] **Step 3: Write the screen**

Create `src/app/screens/EventDetail.jsx`:

```jsx
import { Link, useParams } from 'react-router-dom';
import ImageSlot from '../ImageSlot.jsx';
import Icon from '../../components/Icon.jsx';
import boardEvents from '../../data/events.example.json';
import NotFoundPage from '../../pages/NotFoundPage.jsx';
import './event-detail.css';
import './screens.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Sep 8", not 2026-09-08: an ISO date breaks across lines in a 320px row and
// the year is noise on a board where everything is this term.
function when(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}` : String(iso);
}

// One open event, from the board. This is the destination the board's event
// cards were waiting for — GigsBoard's own comment records that they were
// deliberately not links while there was nowhere to go.
export default function EventDetail() {
  const { id } = useParams();
  const ev = boardEvents.find((e) => e.id === id);

  if (!ev) return <NotFoundPage bare />;

  const soldOut = ev.seatsLeft === 0;

  return (
    <div className="scr edp">
      <div className="edp__top">
        <Link to="/app/earn" className="edp__back" aria-label="Back">
          <span className="edp__chev" />
        </Link>
      </div>

      <div className="edp__photo"><ImageSlot label={ev.photo} radius={18} /></div>

      <p className="edp__caps">{ev.kind} · {ev.place}</p>
      <h1 className="edp__title">{ev.title}</h1>

      <ul className="edp__facts">
        <li className="edp__fact">
          <Icon name="calendar" size={17} className="edp__fact-ico" />
          <span>{when(ev.date)} · {ev.time}</span>
        </li>
        <li className="edp__fact">
          <Icon name="pin" size={17} className="edp__fact-ico" />
          <span>{ev.venue}</span>
        </li>
      </ul>

      <p className="edp__blurb">{ev.blurb}</p>

      <p className="edp__seats">
        {soldOut ? 'No seats left' : `${ev.seatsLeft} seats left`}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Write its CSS**

Create `src/app/screens/event-detail.css`:

```css
/* Event detail. The shape follows perk detail, which is the app's other
   "one thing, in full" screen, so the two read as siblings. */
.edp__top { display: flex; align-items: center; min-height: 44px; margin-bottom: 6px; }
.edp .edp__back {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-left: -10px;
  color: var(--text-primary);
}
/* A CSS chevron, the same trick gigs-detail and perk detail use. */
.edp__chev {
  width: 10px;
  height: 10px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  border-radius: 1px;
  transform: rotate(45deg);
  margin-left: 3px;
}

.edp__photo { aspect-ratio: 4 / 3; }

.edp__caps {
  margin: 16px 0 0;
  font-family: var(--font-label);
  font-size: var(--text-3xs);
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--gray-600);
}
.edp__title {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--text-primary);
}

.edp__facts { list-style: none; margin: 16px 0 0; padding: 0; }
.edp__fact {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  font-size: var(--text-sm);
  color: var(--text-primary);
}
.edp__fact-ico { color: var(--gray-600); flex: none; }

.edp__blurb { margin: 14px 0 0; font-size: var(--text-sm); line-height: 1.55; color: var(--gray-700); }
.edp__seats {
  margin: 14px 0 0;
  font-family: var(--font-label);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-brand);
}
```

- [ ] **Step 5: Add the route**

In `src/App.jsx`, import `EventDetail` and add it inside the `<Route element={<AppShell />}>` group, next to the other `/app/earn` routes:

```jsx
        <Route path="/app/earn/events/:id" element={<EventDetail />} />
```

**Order matters**: it must come after `/app/earn/:slug` is defined but the two do not collide, because `events` is a literal segment and React Router ranks a static segment above a dynamic one. Verify with the Task 3 Step 6 test run — if a mission detail renders instead, the routes are ambiguous and `/app/earn/events/:id` needs to be declared first.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/unit/event-detail.test.jsx`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/app/screens/EventDetail.jsx src/app/screens/event-detail.css src/App.jsx tests/unit/event-detail.test.jsx
git commit -m "Give an open event a page of its own"
```

---

### Task 4: The guest list

**Files:**
- Create: `src/app/parts/GuestGrid.jsx`
- Modify: `src/app/screens/EventDetail.jsx`, `src/app/screens/event-detail.css`, `tests/unit/event-detail.test.jsx`

**Interfaces:**
- Consumes: `people.example.json`, an event's `guests: string[]`.
- Produces: `GuestGrid({ handles })` — renders up to six tiles, then a "See all N" button that reveals the rest in place.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/event-detail.test.jsx`:

```jsx
import userEvent from '@testing-library/user-event';
import people from '../../src/data/people.example.json';

describe('the guest list', () => {
  const big = boardEvents.reduce((a, b) => (b.guests.length > a.guests.length ? b : a));
  const small = boardEvents.reduce((a, b) => (b.guests.length < a.guests.length ? b : a));

  test('every guest is a link to their profile', () => {
    at(`/app/earn/events/${small.id}`);
    const tiles = screen.getAllByTestId('guest');
    expect(tiles).toHaveLength(small.guests.length);
    for (const h of small.guests) {
      const person = people.find((p) => p.handle === h);
      const link = screen.getByRole('link', { name: new RegExp(person.name) });
      // A link, not a card with a click handler: it opens in a new tab and
      // assistive tech reads it as what it is.
      expect(link).toHaveAttribute('href', `/user/${h}`);
    }
  });

  test('a long list shows six, then reveals the rest in place', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${big.id}`);
    expect(big.guests.length).toBeGreaterThan(6);
    expect(screen.getAllByTestId('guest')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: new RegExp(`See all ${big.guests.length}`) }));
    expect(screen.getAllByTestId('guest')).toHaveLength(big.guests.length);
    // Revealed in place, not on a second route.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(big.title);
  });

  test('a short list offers no reveal', () => {
    at(`/app/earn/events/${small.id}`);
    expect(screen.queryByRole('button', { name: /See all/ })).toBeNull();
  });

  test('a verified guest is marked, and the mark is not colour alone', () => {
    at(`/app/earn/events/${boardEvents[0].id}`);
    const verified = boardEvents[0].guests
      .map((h) => people.find((p) => p.handle === h))
      .filter((p) => p.verified);
    expect(verified.length).toBeGreaterThan(0);
    for (const p of verified) {
      expect(screen.getByRole('link', { name: new RegExp(`${p.name}.*[Vv]erified`) })).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/event-detail.test.jsx -t 'guest list'`
Expected: FAIL — no `guest` testids on the page.

- [ ] **Step 3: Write the grid**

Create `src/app/parts/GuestGrid.jsx`:

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ImageSlot from '../ImageSlot.jsx';
import Icon from '../../components/Icon.jsx';
import people from '../../data/people.example.json';

// Who is going. Handles rather than embedded people, so one person can appear
// on several events without their name and level being copied into each.
//
// Six then the rest in place: the lists here are short enough that a second
// route for them would be ceremony.
const SHOWN = 6;

export default function GuestGrid({ handles }) {
  const [all, setAll] = useState(false);
  const guests = handles
    .map((h) => people.find((p) => p.handle === h))
    .filter(Boolean);
  const shown = all ? guests : guests.slice(0, SHOWN);

  if (!guests.length) return null;

  return (
    <div className="gg">
      <ul className="gg__grid">
        {shown.map((p) => (
          <li key={p.handle}>
            {/* A link, so it opens in a new tab and reads as navigation. The
                accessible name carries the verified state, because a tick that
                only exists as a glyph is a state told in colour and shape. */}
            <Link
              to={`/user/${p.handle}`}
              className="gg__tile"
              data-testid="guest"
              aria-label={p.verified ? `${p.name}, verified student` : p.name}
            >
              <span className="gg__photo"><ImageSlot label={p.name} radius={12} /></span>
              <span className="gg__name">
                {p.name}
                {p.verified && <Icon name="tick-2" size={13} className="gg__tick" />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!all && guests.length > SHOWN && (
        <button type="button" className="gg__more" onClick={() => setAll(true)}>
          See all {guests.length}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Put it on the screen**

In `src/app/screens/EventDetail.jsx`, import `GuestGrid` and add this after the seats line:

```jsx
      <section className="edp__guests" aria-labelledby="guests-h">
        <h2 id="guests-h" className="edp__h2">Guest list</h2>
        <GuestGrid handles={ev.guests} />
      </section>
```

- [ ] **Step 5: Style it**

Append to `src/app/screens/event-detail.css`:

```css
.edp__guests { margin-top: 26px; }
.edp__h2 {
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

/* Three across at every width the app supports. The tiles are square and the
   name sits under them, so a fourth column would put the names at a size the
   ladder does not have. */
.gg__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.gg .gg__tile {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}
.gg__photo { display: block; }
.gg__name {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}
.gg__tick { color: var(--violet-600); flex: none; }

.gg .gg__more {
  box-sizing: border-box;
  min-height: 44px;
  margin-top: 12px;
  padding: 0 4px;
  border: none;
  background: none;
  font-family: var(--font-label);
  font-size: var(--text-3xs);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-brand);
  cursor: pointer;
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/unit/event-detail.test.jsx`
Expected: PASS, 8 tests.

- [ ] **Step 7: Screenshot the grid**

Use the Task 2 Step 9 snippet against `http://localhost:5173/app/earn/events/ev3` (the seven-guest event) at 320 and 390. Check that three columns fit, that a long name wraps rather than widening its tile, and that the tick sits on the name's baseline.

- [ ] **Step 8: Commit**

```bash
git add src/app/parts/GuestGrid.jsx src/app/screens/EventDetail.jsx src/app/screens/event-detail.css tests/unit/event-detail.test.jsx
git commit -m "Show who is going, and let a name lead somewhere"
```

---

### Task 5: The seat CTA

**Files:**
- Modify: `src/app/screens/EventDetail.jsx`, `src/app/screens/event-detail.css`, `tests/unit/event-detail.test.jsx`

**Interfaces:**
- Consumes: the event's `seatsLeft`.
- Produces: nothing later tasks read.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/event-detail.test.jsx`:

```jsx
describe('saving a seat', () => {
  const open = boardEvents.find((e) => e.seatsLeft > 0);
  const gone = boardEvents.find((e) => e.seatsLeft === 0);

  test('taking a seat says so and takes one off the count', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await user.click(screen.getByRole('button', { name: 'Save me a seat' }));
    expect(screen.getByText(/You're on the list/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${open.seatsLeft - 1} seats left`))).toBeInTheDocument();
  });

  test('it cannot be taken twice', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await user.click(screen.getByRole('button', { name: 'Save me a seat' }));
    expect(screen.queryByRole('button', { name: 'Save me a seat' })).toBeNull();
  });

  test('a sold-out event offers the waitlist, not a seat', () => {
    at(`/app/earn/events/${gone.id}`);
    expect(screen.getByText('No seats left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join the waitlist/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save me a seat' })).toBeNull();
  });

  test('nothing claims a seat was really booked', () => {
    at(`/app/earn/events/${open.id}`);
    expect(document.body.textContent).not.toMatch(/confirm|we('| wi)ll email|see you there/i);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/event-detail.test.jsx -t 'saving a seat'`
Expected: FAIL — no `Save me a seat` button.

- [ ] **Step 3: Add the CTA**

In `src/app/screens/EventDetail.jsx`, add the import and state:

```jsx
import { useState } from 'react';
import { Button } from 'axelerate-design-system';
```

```jsx
  const [saved, setSaved] = useState(false);
  const seats = Math.max(0, ev.seatsLeft - (saved ? 1 : 0));
  const soldOut = seats === 0 && !saved;
```

Replace the seats line and add the action below it:

```jsx
      <p className="edp__seats">
        {ev.seatsLeft === 0 ? 'No seats left' : `${seats} seats left`}
      </p>

      <div className="edp__act">
        {ev.seatsLeft === 0 ? (
          <Button variant="secondary" size="md" fullWidth>Join the waitlist »</Button>
        ) : saved ? (
          // Session state, like the cart and the admin queues: a reload puts
          // the seat back, and this app makes that promise everywhere.
          <p className="edp__saved">You're on the list.</p>
        ) : (
          <Button variant="primary" size="md" fullWidth onClick={() => setSaved(true)}>
            Save me a seat
          </Button>
        )}
      </div>
```

- [ ] **Step 4: Style the confirmation**

Append to `src/app/screens/event-detail.css`:

```css
.edp__act { margin-top: 18px; display: flex; flex-direction: column; }
.edp__saved {
  margin: 0;
  padding: 13px 0;
  text-align: center;
  font-family: var(--font-label);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-brand);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/unit/event-detail.test.jsx`
Expected: PASS, 12 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/screens/EventDetail.jsx src/app/screens/event-detail.css tests/unit/event-detail.test.jsx
git commit -m "Let someone take a seat, and say plainly that nothing was booked"
```

---

### Task 6: The board's cards become links

**Files:**
- Modify: `src/app/screens/GigsBoard.jsx`, `tests/unit/gigs-board.test.jsx`

**Interfaces:**
- Consumes: route `/app/earn/events/:id` from Task 3.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/gigs-board.test.jsx`:

```jsx
describe('board events lead somewhere', () => {
  test('each card is a link to its detail', () => {
    const { container } = wrapBoard();
    const cards = [...container.querySelectorAll('[data-testid="board-event"]')];
    expect(cards).toHaveLength(boardEvents.length);
    for (const [i, card] of cards.entries()) {
      // The card IS the link now, not a div wrapped in one: a nested
      // interactive element inside an anchor is invalid markup.
      expect(card.tagName).toBe('A');
      expect(card).toHaveAttribute('href', `/app/earn/events/${boardEvents[i].id}`);
    }
  });
});
```

- [ ] **Step 2: Find the assertion this inverts**

Run: `grep -n "not.*link\|queryByRole('link'" tests/unit/gigs-board.test.jsx`

An existing test asserts the cards are **not** links, because there was nowhere to go. Delete that assertion and leave a comment where it was:

```jsx
    // The "these are not links" assertion lived here. It was right while the
    // cards had no destination; Task 3 gave them one.
```

- [ ] **Step 3: Run and watch it fail**

Run: `npx vitest run tests/unit/gigs-board.test.jsx`
Expected: FAIL — `expect(card.tagName).toBe('A')` receives `DIV`.

- [ ] **Step 4: Make the card a link**

In `src/app/screens/GigsBoard.jsx`, replace the event card's wrapper:

```jsx
            <li key={e.id}>
              <Link
                to={`/app/earn/events/${e.id}`}
                className="ev-c"
                data-testid="board-event"
              >
                <div className="ev-c__photo"><ImageSlot label={e.photo} radius={10} /></div>
                <div className="ev-c__text">
                  <p className="ev-c__caps">{e.kind} · {e.place}</p>
                  <h3 className="ev-c__title">{e.title}</h3>
                  <p className="ev-c__seats">
                    {e.seatsLeft === 0
                      ? 'No seats left'
                      : `${e.seatsLeft} ${e.seatsLeft === 1 ? 'seat' : 'seats'} left`}
                  </p>
                </div>
              </Link>
            </li>
```

Also update the section's header comment, which currently explains why these are *not* interactive.

Add to `src/app/screens/gigs-board.css`:

```css
.gb .ev-c { text-decoration: none; color: inherit; }
```

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS. If a test asserted the old sold-out-free seat copy, update it to the new conditional rather than weakening it.

- [ ] **Step 6: Commit**

```bash
git add src/app/screens/GigsBoard.jsx src/app/screens/gigs-board.css tests/unit/gigs-board.test.jsx
git commit -m "Point the board's event cards at their detail"
```

---

### Task 7: Guards, sweeps and the deployment note

**Files:**
- Modify: `tests/e2e/responsive.spec.js`, `README.md`

- [ ] **Step 1: Add both routes to the sweeps**

In `tests/e2e/responsive.spec.js`, add to `ROUTES`:

```js
  '/app/earn/events/ev3', '/user/marktao',
```

`ev3` is the seven-guest event, so the sweep sees the reveal control too.

- [ ] **Step 2: Add the noindex guard**

Append to the same file:

```js
test('@guard the public profile asks not to be indexed, and the app does not', async ({ page }) => {
  await page.goto('/user/marktao');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  // The tag must not survive the route: this is one HTML document served for
  // every path, so a tag left behind would de-index the whole product.
  await page.goto('/app/earn');
  expect(await page.locator('meta[name="robots"]').count()).toBe(0);
});

test('@guard a public profile shows no money', async ({ page }) => {
  await page.goto('/user/marktao');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/\$|USD|earned|payout/i);
});
```

- [ ] **Step 3: Run the guards**

Run: `npm run test:e2e:guards`
Expected: PASS, 15 tests, about four seconds.

- [ ] **Step 4: Run the full suite**

Run: `npm run test:e2e`
Expected: PASS. The two new routes add 12 overflow checks.

- [ ] **Step 5: Document the routes and the header a deployment needs**

In `README.md`, add the two rows to the Pages table:

```markdown
| `/app/earn/events/:id` | app | One open event: when, where, who is going, and a seat |
| `/user/:handle` | — | A student's public profile. Link-only, outside the app shell |
```

And add this under the Deploy section:

```markdown
**`/user/*` needs a `noindex` response header.** The route sets
`<meta name="robots" content="noindex">` while it is mounted and
`public/robots.txt` disallows the path, but a crawler that does not run
JavaScript sees only the second, and `robots.txt` does not stop a URL someone
already knows from being indexed. Add `X-Robots-Tag: noindex` for `/user/*` at
the host. None of this is access control: anyone with the link can read the
page.
```

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/responsive.spec.js README.md
git commit -m "Sweep the two new routes, and guard the noindex"
```

---

## Self-review

**Spec coverage.** §1 both screens → Tasks 2–5. §2 privacy: the money-absence guard is in Tasks 1, 2 and 7; the field list is Task 1; noindex is Task 2 (meta + robots.txt) and Task 7 (guard + deploy note). §3 routing → Tasks 2 and 3, including the profile being outside the shell. §4 data → Task 1, with the `xpToNext`-is-a-threshold assertion and handle resolution. §5 detail screen → Tasks 3, 4 and 5: guest grid of six with reveal, tiles as links, "Save me a seat", sold-out waitlist. §6 profile → Task 2, including the 404 for an unknown handle and `MarkerBar` for XP. §7 out of scope: no task adds a share control, a backend, or missions/brands. §8 testing → each task's tests plus Task 7.

**Placeholders.** None. Every code step carries its code, every test step its assertions, every command its expected output.

**Type consistency.** A person is `{ handle, name, campus, level, levelName, xp, xpToNext, verified }` in Task 1's fixture, Task 1's tests, Task 2's screen and Task 4's grid. An event's added fields are `date, time, venue, blurb, guests` throughout. `GuestGrid` takes `{ handles }` — an array of strings — in Task 4's definition and its one call site. `useNoIndex()` takes nothing and returns nothing in Task 2's hook and its caller. Routes are written `/app/earn/events/:id` and `/user/:handle` in Tasks 2, 3, 4, 6 and 7 without variation.
