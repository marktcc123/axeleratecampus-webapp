# Axelerate Admin Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status (2026-08-31):** all three phases built on branch `admin-console`. 413 unit tests, 226 e2e. Two things went differently from this plan and the plan below has NOT been rewritten to match — the spec's §2 override block and the commit log are the record:

1. **Analytics plots.** Tasks 6–7 built the hatched `MarkerBar` stacks this plan specifies; the owner reversed that on sight, and Analytics is now a line chart and a donut in brand colours. The design system's "hand-drawn, never plotted" rule governs the student-facing product, not an internal operator tool. Two constraints survived because neither is a design-system rule: one y axis, and no invented denominators.
2. **The tab strip is the mission board's folder tabs**, not the pill scroller Task 4 describes, at the owner's request — with the scroll kept, since nine tabs still cannot fit 520px.

Also removed at the owner's request: the header's "campus lead" note and the "Example data" line.

**Goal:** Put a password dialog in front of `Admin account` in the Me hub, and behind it a nine-tab admin console — Analytics plus eight working queues and editors — running on example data inside the app's 520px phone column.

**Architecture:** A `sessionStorage`-backed unlock hook gates a nested route group under `/me/admin/*`. One `AdminShell` draws the header, the honesty note, a horizontally scrolling tab strip and an `<Outlet/>`; nine panel components render under it. A single `AdminDataProvider` loads one fixture into React state and exposes every queue plus the mutations that empty it — the seam Supabase replaces later. All data display uses the design system's hand-drawn vocabulary (`StatBlock`, `MarkerBar`, `Badge`); nothing is plotted, tabular, or dark.

**Tech Stack:** Vite 5 + React 18, React Router (`BrowserRouter`, nested routes), `axelerate-design-system` pinned at `#4f70d96`, Vitest + Testing Library (jsdom), Playwright for the responsive sweep.

**Spec:** `.superpowers/specs/2026-08-31-axelerate-admin-console-design.md` — read it before Task 1. The plan argues from it; where they disagree, the spec is right.

## Global Constraints

Every task's requirements implicitly include all of these.

- **Single repo.** No change to `axelerate-design-system`, no token additions, no pin bump. A component-layer change needs the owner's approval first and lands in both repos — not in this plan.
- **No plotted charts.** DS readme, "Data display": *"hand-drawn, never plotted… No pie charts, no gridlines, no solid progress bars, and no invented denominators."* Use `TallyCount` (counts under ~30), `MarkerBar` (shares and comparisons), `StatBlock` (figure + label).
- **Never a dual-axis chart.** Two measures at different scales get two separate frames.
- **Every credit figure goes through `credit()`** from `src/app/parts/Money.jsx`. `tests/unit/money.test.js` fails any file under `src/app` that pairs a literal number with the word "credit" (regex `/\d[\d,]*\s*credit\b|\bcredit\s*[·:]\s*\$/i`).
- **Never pass `hint` to `Input` or `Select`.** DS issue #2 — hint/error render inside the `<label>` and pollute the accessible name. Render help as a sibling `<p id>` + `aria-describedby` on the field. Keep passing `error`.
- **Cascade race.** Every DS component injects its `<style>` at JS-execution time, *after* the app's bundled CSS. An app rule at (0,1,0) on an element that also wears an `ax-*` class loses the tie. Scope under a parent (`.adm .adm__tab`) to reach (0,2,0). Never `!important`, never target `.ax-*`.
- **No blurred shadows anywhere.** Every shadow in this system is a hard offset (`--shadow-paper` is `2px 3px 0`). An e2e already fails any non-zero blur on Applications; do not introduce one here.
- **Touch floor 44×44**, measured on the element's own box. Pad the button, not a pseudo-element. `Button` `size="sm"` (32px) and `IconButton` `size="sm"` (28px) are below the floor and are not for touch.
- **`Button` is not polymorphic** — there is no `as` prop. Navigation affordances are plain `<Link>`/`<NavLink>` styled in app CSS. Never borrow `.ax-btn`.
- **Voice:** sentence case, verbs first, numerals, no emoji in chrome, never "the user", never blame in an error. Banned register: cutting-edge, world-class, seamless, supercharge.
- **Status is never colour alone.** A `Badge` always carries the word.
- **Screenshot every panel before calling it done.** jsdom does no layout; two bugs shipped with every unit test green. Check that every CSS selector's ancestor scope still exists in the markup.
- **Every `font-size` under `src/app/` must name a ladder rung** — `var(--text-3xs|xs|sm|lg|xl|2xl)`, i.e. 10·12·15·18·22. `tests/unit/type-scale.test.js` fails any hardcoded px value and any rung outside that set. Found the hard way in Task 4: seven hardcoded sizes, all rejected.
- **The phone column is `.app__col` with 16px of padding.** A full-bleed row's negative margin is exactly `-16px`; `-18px` overflows the page by 2px a side.
- **Commands:** `npm test` (Vitest, all), `npx vitest run tests/unit/<file>` (one file), `npm run test:e2e` (Playwright), `npm run dev` (dev server on 5173).

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/data/admin.example.json` | The one fixture. Supabase-shaped snake_case rows; future seed. |
| `src/app/admin/gate.jsx` | Unlock state (`sessionStorage`), password check, the gate `Dialog`. |
| `src/app/admin/store.jsx` | `AdminDataProvider` + `useAdmin()` — queues, counts, mutations, toast. |
| `src/app/admin/AdminShell.jsx` | Route guard, header, honesty note, tab strip, `<Outlet/>`. |
| `src/app/admin/AdminTabs.jsx` | The nine-tab horizontal scroller (`NavLink`s + counts). |
| `src/app/admin/buckets.js` | `bucketTotals(dailyTotals, range)` — daily/weekly/monthly aggregation. |
| `src/app/admin/admin.css` | All admin layout, scoped under `.adm`. Includes the local textarea. |
| `src/app/admin/parts/QueueRow.jsx` | The expandable flat-`Card` row every queue is built from. |
| `src/app/admin/parts/RejectDialog.jsx` | Reason-required rejection dialog (local textarea). |
| `src/app/admin/parts/Trend.jsx` | One labelled `MarkerBar` stack for one measure. |
| `src/app/admin/panels/Analytics.jsx` | Tiles + two trend stacks + campus share. |
| `src/app/admin/panels/Tasks.jsx` | Order queue. |
| `src/app/admin/panels/Ugc.jsx` | UGC submission queue. |
| `src/app/admin/panels/Gigs.jsx` | Physical gig applicants. |
| `src/app/admin/panels/Events.jsx` | Event applicants. |
| `src/app/admin/panels/Withdrawals.jsx` | W-9 verification + payouts. |
| `src/app/admin/panels/Campuses.jsx` | School list + add-school dialog. |
| `src/app/admin/panels/Career.jsx` | Claim queue + roles/pathways lists. |
| `src/app/admin/panels/Cashback.jsx` | Rate editor. |
| `tests/unit/admin-gate.test.jsx` | Gate behaviour. |
| `tests/unit/admin-shell.test.jsx` | Routing, redirect, tab strip. |
| `tests/unit/admin-analytics.test.jsx` | Tiles, buckets, campus share. |
| `tests/unit/admin-queues.test.jsx` | The five queue panels. |
| `tests/unit/admin-editors.test.jsx` | Campuses, Career, Cashback. |
| `tests/unit/admin-fixture.test.js` | Fixture shape and referential integrity. |
| `.env.example` | `VITE_ADMIN_PASSWORD`. |

**Modified**

| File | Change |
|---|---|
| `src/App.jsx` | `/me/admin` redirect + nine nested routes under `AdminShell`. |
| `src/app/screens/Me.jsx` | `Admin account` row becomes a button that opens the gate. |
| `src/data/hub.example.json` | Delete `admin.can` and `admin.note`; keep `admin.account`. |
| `tests/unit/admin.test.jsx` | **Deleted** — replaced by the three admin test files. |
| `tests/e2e/responsive.spec.js` | Nine admin routes join the sweep. |
| `README.md` | Admin console section + `VITE_ADMIN_PASSWORD`. |

**Deleted**

- `src/app/screens/Admin.jsx` — superseded. Its "what it opens" list *is* the tab strip now.

---

# Phase 1 — Gate, shell, Analytics

Phase 1 leaves the app coherent on its own: the gate works, Analytics is real, and the other eight tabs say plainly that they are not built yet.

### Task 1: The fixture

**Files:**
- Create: `src/data/admin.example.json`
- Create: `tests/unit/admin-fixture.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: the fixture's shape, which every later task reads. Collections and their key columns:
  - `orders`: `id, order_no, user_id, full_name, shipping_email, status ('placed'|'packed'|'shipped'|'delivered'), cash_paid, credits_used, created_at, needs ('return'|'cancellation'|'shipping'), items[{name, brand, quantity, price}]`
  - `ugc_submissions`: `id, user_id, full_name, avatar_url, mission_title, platform, ugc_link, notes, status ('pending'|'submitted'|'approved'|'rejected'), reward_cash, reward_credits, xp_reward, created_at`
  - `gig_applications`: `id, user_id, full_name, phone, email, gig_title, location, gig_date, reward_cash, reward_credits, status ('pending'|'approved'|'complete'|'rejected')`
  - `event_applications`: `id, user_id, full_name, event_title, campus, tier, status ('pending'|'approved'|'declined')`
  - `w9_submissions`: `id, user_id, full_name, w9_submitted_at, verified (bool)`
  - `withdrawals`: `id, user_id, full_name, amount, fee, net_amount, method, account_info, status ('pending'|'completed'|'rejected')`
  - `campuses`: `id, name, primary_color, logo_url, student_count`
  - `career_claims`: `id, user_id, full_name, reward_summary, reward_key, claimed_at, certificate_name, status ('pending'|'approved'|'rejected')`
  - `career_roles`: `id, name, updated_at`
  - `career_pathways`: `id, title, blurb`
  - `cashback_rates`: `id, category, pct`
  - `daily_totals`: `date ('YYYY-MM-DD'), cash_paid, credits_used, active_users`
  - `stats`: `total_users, verified_users, active_today`

- [ ] **Step 1: Write the failing fixture test**

Create `tests/unit/admin-fixture.test.js`:

```js
import admin from '../../src/data/admin.example.json';

const COLLECTIONS = [
  'orders', 'ugc_submissions', 'gig_applications', 'event_applications',
  'w9_submissions', 'withdrawals', 'campuses', 'career_claims',
  'career_roles', 'career_pathways', 'cashback_rates', 'daily_totals',
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
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/admin-fixture.test.js`
Expected: FAIL — `Cannot find module '../../src/data/admin.example.json'`.

- [ ] **Step 3: Write the fixture's hand-authored collections**

Create `src/data/admin.example.json`. Write every collection *except* `daily_totals`, which Step 4 generates. Use exactly this content:

```json
{
  "stats": { "total_users": 1284, "verified_users": 1107, "active_today": 213 },
  "campuses": [
    { "id": "cmp1", "name": "UCLA", "primary_color": "#2774AE", "logo_url": "", "student_count": 412 },
    { "id": "cmp2", "name": "Cornell Tech", "primary_color": "#B31B1B", "logo_url": "", "student_count": 188 },
    { "id": "cmp3", "name": "NYU", "primary_color": "#57068C", "logo_url": "", "student_count": 331 },
    { "id": "cmp4", "name": "UT Austin", "primary_color": "#BF5700", "logo_url": "", "student_count": 246 }
  ],
  "orders": [
    { "id": "ord1", "order_no": "AX-1042", "user_id": "u_8841", "full_name": "Maya Ortiz", "shipping_email": "maya.o@example.com", "status": "packed", "cash_paid": 32, "credits_used": 800, "created_at": "2026-08-24", "needs": "shipping", "items": [{ "name": "The Five Minute Journal", "brand": "Intelligent Change", "quantity": 1, "price": 32 }] },
    { "id": "ord2", "order_no": "AX-1037", "user_id": "u_2190", "full_name": "Devon Park", "shipping_email": "devon.p@example.com", "status": "shipped", "cash_paid": 39, "credits_used": 0, "created_at": "2026-08-21", "needs": "return", "items": [{ "name": "Nautilus towels", "brand": "Italic", "quantity": 1, "price": 39 }] },
    { "id": "ord3", "order_no": "AX-1051", "user_id": "u_7734", "full_name": "Priya Raman", "shipping_email": "priya.r@example.com", "status": "placed", "cash_paid": 27.22, "credits_used": 1200, "created_at": "2026-08-29", "needs": "cancellation", "items": [{ "name": "BiBi star print stripe combo top", "brand": "Trendsi", "quantity": 1, "price": 27.22 }] },
    { "id": "ord4", "order_no": "AX-1055", "user_id": "u_5512", "full_name": "Jonah Reed", "shipping_email": "jonah.r@example.com", "status": "placed", "cash_paid": 62, "credits_used": 0, "created_at": "2026-08-30", "needs": "shipping", "items": [{ "name": "Shadmoor towels", "brand": "Italic", "quantity": 2, "price": 31 }] }
  ],
  "ugc_submissions": [
    { "id": "ugc1", "user_id": "u_8841", "full_name": "Maya Ortiz", "avatar_url": "", "mission_title": "Solra — unboxing reel on your feed", "platform": "Instagram", "ugc_link": "https://example.com/ugc/solra-reel-8841", "notes": "Posted Thursday night, tagged @solra.", "status": "submitted", "reward_cash": 25, "reward_credits": 0, "xp_reward": 80, "created_at": "2026-08-28" },
    { "id": "ugc2", "user_id": "u_2190", "full_name": "Devon Park", "avatar_url": "", "mission_title": "Notely — chalk the quad before the drop", "platform": "TikTok", "ugc_link": "https://example.com/ugc/notely-quad-2190", "notes": "", "status": "pending", "reward_cash": 18, "reward_credits": 600, "xp_reward": 60, "created_at": "2026-08-29" },
    { "id": "ugc3", "user_id": "u_7734", "full_name": "Priya Raman", "avatar_url": "", "mission_title": "Klar — study-break booth story set", "platform": "Instagram", "ugc_link": "https://example.com/ugc/klar-booth-7734", "notes": "Three stories, one static.", "status": "submitted", "reward_cash": 0, "reward_credits": 2400, "xp_reward": 100, "created_at": "2026-08-30" },
    { "id": "ugc4", "user_id": "u_5512", "full_name": "Jonah Reed", "avatar_url": "", "mission_title": "Vera — pop-up recap reel", "platform": "TikTok", "ugc_link": "", "notes": "Link to follow.", "status": "pending", "reward_cash": 40, "reward_credits": 0, "xp_reward": 120, "created_at": "2026-08-31" }
  ],
  "gig_applications": [
    { "id": "gig1", "user_id": "u_3301", "full_name": "Alex Chen", "phone": "555-0114", "email": "alex.c@example.com", "gig_title": "Vera — scan tickets at Friday's pop-up", "location": "Warehouse 12, Brooklyn", "gig_date": "2026-09-04", "reward_cash": 40, "reward_credits": 0, "status": "pending" },
    { "id": "gig2", "user_id": "u_9027", "full_name": "Sam Whitfield", "phone": "555-0188", "email": "sam.w@example.com", "gig_title": "Notely — chalk the quad", "location": "Royce Quad, UCLA", "gig_date": "2026-09-02", "reward_cash": 18, "reward_credits": 600, "status": "pending" },
    { "id": "gig3", "user_id": "u_4419", "full_name": "Nina Adeyemi", "phone": "555-0132", "email": "nina.a@example.com", "gig_title": "Klar — study-break booth", "location": "Olin lobby", "gig_date": "2026-08-27", "reward_cash": 30, "reward_credits": 0, "status": "approved" }
  ],
  "event_applications": [
    { "id": "eva1", "user_id": "u_8841", "full_name": "Maya Ortiz", "event_title": "Vera pop-up — door crew", "campus": "Cornell Tech", "tier": "Trusted", "status": "pending" },
    { "id": "eva2", "user_id": "u_3301", "full_name": "Alex Chen", "event_title": "Axelerate campus mixer", "campus": "UCLA", "tier": "Contributor", "status": "pending" },
    { "id": "eva3", "user_id": "u_9027", "full_name": "Sam Whitfield", "event_title": "Axelerate campus mixer", "campus": "UCLA", "tier": "Explorer", "status": "pending" },
    { "id": "eva4", "user_id": "u_7734", "full_name": "Priya Raman", "event_title": "Klar study-break booth", "campus": "NYU", "tier": "Insider", "status": "approved" }
  ],
  "w9_submissions": [
    { "id": "w91", "user_id": "u_8841", "full_name": "Maya Ortiz", "w9_submitted_at": "2026-08-26", "verified": false },
    { "id": "w92", "user_id": "u_2190", "full_name": "Devon Park", "w9_submitted_at": "2026-08-19", "verified": true },
    { "id": "w93", "user_id": "u_4419", "full_name": "Nina Adeyemi", "w9_submitted_at": "2026-08-30", "verified": false }
  ],
  "withdrawals": [
    { "id": "wd1", "user_id": "u_2190", "full_name": "Devon Park", "amount": 180, "fee": 3.6, "net_amount": 176.4, "method": "ACH", "account_info": "•••• 4471", "status": "pending" },
    { "id": "wd2", "user_id": "u_8841", "full_name": "Maya Ortiz", "amount": 95, "fee": 1.9, "net_amount": 93.1, "method": "PayPal", "account_info": "maya.o@example.com", "status": "pending" },
    { "id": "wd3", "user_id": "u_4419", "full_name": "Nina Adeyemi", "amount": 240, "fee": 4.8, "net_amount": 235.2, "method": "ACH", "account_info": "•••• 9002", "status": "completed" }
  ],
  "career_claims": [
    { "id": "clm1", "user_id": "u_8841", "full_name": "Maya Ortiz", "reward_summary": "Insider — 12 missions cleared, 4 brands", "reward_key": "insider_certificate", "claimed_at": "2026-08-29", "certificate_name": "", "status": "pending" },
    { "id": "clm2", "user_id": "u_3301", "full_name": "Alex Chen", "reward_summary": "Contributor — 6 missions cleared", "reward_key": "contributor_certificate", "claimed_at": "2026-08-30", "certificate_name": "", "status": "pending" }
  ],
  "career_roles": [
    { "id": "rol1", "name": "Campus lead", "updated_at": "2026-08-20" },
    { "id": "rol2", "name": "Field crew captain", "updated_at": "2026-08-12" },
    { "id": "rol3", "name": "Content reviewer", "updated_at": "2026-07-30" }
  ],
  "career_pathways": [
    { "id": "pth1", "title": "Field operations", "blurb": "Run campus gigs, then run the crew that runs them." },
    { "id": "pth2", "title": "Creator partnerships", "blurb": "Brief brands, review the work, sign the next cohort." }
  ],
  "cashback_rates": [
    { "id": "rate1", "category": "Dorm", "pct": 20 },
    { "id": "rate2", "category": "Beauty", "pct": 15 },
    { "id": "rate3", "category": "Tea & snacks", "pct": 10 },
    { "id": "rate4", "category": "Apparel", "pct": 10 }
  ],
  "daily_totals": []
}
```

- [ ] **Step 4: Generate the 90 daily rows deterministically**

Run this once from the repo root. It is seeded, so it produces the same numbers every time and the fixture stays stable across reruns:

```bash
node -e "
const fs = require('fs');
const p = 'src/data/admin.example.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
// Mulberry32 — a seeded PRNG, so this fixture is reproducible.
let s = 20260831;
const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const end = new Date('2026-08-31T00:00:00Z');
const rows = [];
for (let i = 89; i >= 0; i -= 1) {
  const day = new Date(end.getTime() - i * 86400000);
  const dow = day.getUTCDay();
  const weekend = dow === 0 || dow === 6;
  // A term ramps up: later days carry more traffic than the first weeks.
  const ramp = 0.45 + 0.55 * ((90 - i) / 90);
  const base = weekend ? 60 : 210;
  const cash = Math.round((base + rnd() * 190) * ramp * 100) / 100;
  const credits = Math.round((weekend ? 400 : 1600) * ramp + rnd() * 900);
  rows.push({
    date: day.toISOString().slice(0, 10),
    cash_paid: cash,
    credits_used: credits,
    active_users: Math.round((weekend ? 70 : 190) * ramp + rnd() * 60),
  });
}
d.daily_totals = rows;
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
console.log('wrote', rows.length, 'daily rows,', rows[0].date, '→', rows[rows.length - 1].date);
"
```

Expected: `wrote 90 daily rows, 2026-06-03 → 2026-08-31`

- [ ] **Step 5: Run the fixture test to verify it passes**

Run: `npx vitest run tests/unit/admin-fixture.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/data/admin.example.json tests/unit/admin-fixture.test.js
git commit -m "Seed the admin console's example data"
```

---

### Task 2: The unlock hook

**Files:**
- Create: `src/app/admin/gate.jsx`
- Create: `tests/unit/admin-gate.test.jsx`
- Create: `.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ADMIN_SESSION_KEY = 'ax-admin-unlocked'`
  - `adminPassword(): string` — env value or the dev default
  - `checkPassword(value: string): boolean`
  - `isUnlocked(): boolean`, `setUnlocked(on: boolean): void` — `sessionStorage`, both wrapped in try/catch
  - `useAdminUnlock(): { unlocked: boolean, tryPassword(value: string): boolean, relock(): void }`
  - `AdminGateDialog({ open, onClose, onUnlocked })` — default export

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin-gate.test.jsx`:

```jsx
import { render, screen, act } from '@testing-library/react';
import { checkPassword, isUnlocked, setUnlocked, ADMIN_SESSION_KEY } from '../../src/app/admin/gate.jsx';

describe('admin unlock state', () => {
  beforeEach(() => { sessionStorage.clear(); vi.unstubAllEnvs(); });

  test('the password comes from the environment', () => {
    vi.stubEnv('VITE_ADMIN_PASSWORD', 'letmein');
    expect(checkPassword('letmein')).toBe(true);
    expect(checkPassword('Letmein')).toBe(false);
    expect(checkPassword('')).toBe(false);
  });

  test('it falls back to a development default so a fresh clone runs', () => {
    vi.stubEnv('VITE_ADMIN_PASSWORD', '');
    expect(checkPassword('campus-lead')).toBe(true);
  });

  test('unlock survives inside the session and is off by default', () => {
    expect(isUnlocked()).toBe(false);
    setUnlocked(true);
    expect(isUnlocked()).toBe(true);
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe('1');
    setUnlocked(false);
    expect(isUnlocked()).toBe(false);
  });

  test('a storage that throws does not take the app down', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(isUnlocked()).toBe(false);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/admin-gate.test.jsx`
Expected: FAIL — `Cannot find module '../../src/app/admin/gate.jsx'`.

- [ ] **Step 3: Write the module (state half only)**

Create `src/app/admin/gate.jsx`:

```jsx
import { useCallback, useState } from 'react';

// The admin console's preview lock.
//
// This is NOT security. There is no backend, so the password is compared in
// the browser against a build-time env var, which means it ships inside the
// client bundle and anyone who opens devtools can read it. Bypassing it needs
// nothing more than clearing one sessionStorage key.
//
// It exists so the console is not stumbled into during a demo. When Supabase
// arrives, checkPassword() is the seam a real check replaces — every caller
// goes through it.
export const ADMIN_SESSION_KEY = 'ax-admin-unlocked';

// A fresh clone with no .env still runs.
const DEV_PASSWORD = 'campus-lead';

export function adminPassword() {
  const fromEnv = import.meta.env.VITE_ADMIN_PASSWORD;
  return fromEnv ? String(fromEnv) : DEV_PASSWORD;
}

export function checkPassword(value) {
  if (!value) return false;
  return String(value) === adminPassword();
}

// Storage throws outright in some contexts (private windows, blocked site
// data), so every read and write is guarded and a failure just reads locked.
export function isUnlocked() {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setUnlocked(on) {
  try {
    if (on) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* a locked console is the safe failure */
  }
}

export function useAdminUnlock() {
  const [unlocked, setState] = useState(isUnlocked);

  const tryPassword = useCallback((value) => {
    if (!checkPassword(value)) return false;
    setUnlocked(true);
    setState(true);
    return true;
  }, []);

  const relock = useCallback(() => {
    setUnlocked(false);
    setState(false);
  }, []);

  return { unlocked, tryPassword, relock };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/admin-gate.test.jsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Document the variable**

Create `.env.example`:

```
# The admin console's preview lock (src/app/admin/gate.jsx).
#
# Not security: this value is compiled into the client bundle and is readable
# by anyone who opens devtools. It only stops the console being opened by
# accident during a demo. Leave it unset in development and the dev default
# `campus-lead` applies.
VITE_ADMIN_PASSWORD=
```

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/gate.jsx tests/unit/admin-gate.test.jsx .env.example
git commit -m "Add the admin console's preview lock"
```

---

### Task 3: The gate dialog, and Me's row that opens it

**Files:**
- Modify: `src/app/admin/gate.jsx` (add `AdminGateDialog`)
- Modify: `src/app/screens/Me.jsx:29-33` (the Settings group) and its render
- Modify: `tests/unit/admin-gate.test.jsx` (append)
- Delete: `tests/unit/admin.test.jsx`

**Interfaces:**
- Consumes: `useAdminUnlock`, `checkPassword` from Task 2.
- Produces: `AdminGateDialog({ open, onClose, onUnlocked })`. `onUnlocked` fires after a correct password; the caller navigates.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/admin-gate.test.jsx`:

```jsx
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('the gate in front of the console', () => {
  beforeEach(() => { sessionStorage.clear(); vi.stubEnv('VITE_ADMIN_PASSWORD', 'letmein'); });

  test('Admin account is a button, not a link', () => {
    at('/me');
    expect(screen.getByRole('button', { name: /Admin account/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Admin account/ })).toBeNull();
  });

  test('it opens a dialog asking for a password', async () => {
    const user = userEvent.setup();
    at('/me');
    await user.click(screen.getByRole('button', { name: /Admin account/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  test('a wrong password says so kindly and does not let you in', async () => {
    const user = userEvent.setup();
    at('/me');
    await user.click(screen.getByRole('button', { name: /Admin account/ }));
    await user.type(screen.getByLabelText('Password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(screen.getByText(/That's not it/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(isUnlocked()).toBe(false);
  });

  test('the right password unlocks and lands on Analytics', async () => {
    const user = userEvent.setup();
    at('/me');
    await user.click(screen.getByRole('button', { name: /Admin account/ }));
    await user.type(screen.getByLabelText('Password'), 'letmein');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(isUnlocked()).toBe(true);
    expect(await screen.findByRole('heading', { name: /Admin/ })).toBeInTheDocument();
  });

  test('Escape closes it without unlocking', async () => {
    const user = userEvent.setup();
    at('/me');
    await user.click(screen.getByRole('button', { name: /Admin account/ }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(isUnlocked()).toBe(false);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-gate.test.jsx`
Expected: FAIL — `Admin account` is still a link.

- [ ] **Step 3: Add the dialog to `gate.jsx`**

Append to `src/app/admin/gate.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import { Button, Dialog, Input } from 'axelerate-design-system';

// The password field renders its own help as a sibling <p>, never Input's
// `hint` prop: DS issue #2 puts hint text inside the <label>, which makes the
// accessible name "Password Ask the campus lead…". `error` is safe to pass.
export default function AdminGateDialog({ open, onClose, onUnlocked }) {
  const { tryPassword } = useAdminUnlock();
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const field = useRef(null);

  useEffect(() => {
    if (!open) { setValue(''); setWrong(false); }
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    if (tryPassword(value)) { onUnlocked(); return; }
    setWrong(true);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Admin access"
      width={380}
      initialFocus={field}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Unlock</Button>
        </>
      )}
    >
      <form onSubmit={submit}>
        <Input
          ref={field}
          label="Password"
          type="password"
          name="admin-password"
          autoComplete="off"
          aria-describedby="admin-gate-help"
          error={wrong ? "That's not it. Give it another go?" : undefined}
          value={value}
          onChange={(e) => { setValue(e.target.value); setWrong(false); }}
        />
        <p id="admin-gate-help" className="adm-gate__help">
          Ask the campus lead. This console runs on example data.
        </p>
      </form>
    </Dialog>
  );
}
```

If `Input` does not forward a ref, drop the `ref` and the `initialFocus` prop and let `Dialog` focus its own container — do not patch the design system.

- [ ] **Step 4: Turn Me's row into a button**

In `src/app/screens/Me.jsx`, remove `{ to: '/me/admin', icon: 'crown', label: 'Admin account' }` from the Settings group and give that group an `action` entry instead:

```jsx
  {
    label: 'Settings',
    items: [
      { to: '/me/settings', icon: 'magic-wand', label: 'Settings' },
      { action: 'admin', icon: 'crown', label: 'Admin account' },
    ],
  },
```

In the component, add the gate state and render an `action` item as a button with the same row markup a `<Link>` row uses (same classes, so the row looks identical):

```jsx
import { useNavigate, useLocation } from 'react-router-dom';
import AdminGateDialog from '../admin/gate.jsx';

  const navigate = useNavigate();
  const location = useLocation();
  // AdminShell redirects here with this flag when a /me/admin URL is opened
  // locked, so the dialog comes up instead of a bounce with no explanation.
  const [gate, setGate] = useState(Boolean(location.state?.adminGate));
```

and in the row map:

```jsx
  item.action === 'admin' ? (
    <li key={item.label} className="hub__row-wrap">
      <button type="button" className="hub__row" onClick={() => setGate(true)}>
        <Icon name={item.icon} size={18} className="hub__row-icon" />
        <span className="hub__row-label">{item.label}</span>
      </button>
    </li>
  ) : ( /* the existing <Link> row, unchanged */ )
```

Then render the dialog once, after the groups:

```jsx
  <AdminGateDialog
    open={gate}
    onClose={() => setGate(false)}
    onUnlocked={() => { setGate(false); navigate('/me/admin/analytics'); }}
  />
```

Match the existing row's classes exactly, and add a `.hub .hub__row` button reset in `me-hub.css` (scoped under `.hub` to clear the cascade race): `background:none;border:none;width:100%;text-align:left;cursor:pointer;font:inherit`.

- [ ] **Step 5: Delete the superseded test**

```bash
git rm tests/unit/admin.test.jsx
```

Its assertions are replaced: the link-shape test by Step 1's button test, and the account-screen tests by Task 4's shell tests.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/unit/admin-gate.test.jsx tests/unit/me.test.jsx`
Expected: the gate file passes 9 tests. `me.test.jsx` may fail where it asserts an `Admin account` **link** — update those assertions to the button, and do not weaken any other assertion.

- [ ] **Step 7: Commit**

```bash
git add -A src/app/admin/gate.jsx src/app/screens/Me.jsx src/app/screens/me-hub.css tests/unit
git commit -m "Ask for a password before the console opens"
```

---

### Task 4: Routes, shell, tab strip

**Files:**
- Create: `src/app/admin/AdminShell.jsx`, `src/app/admin/AdminTabs.jsx`, `src/app/admin/admin.css`
- Create: `tests/unit/admin-shell.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useAdminUnlock` (Task 2), `useAdmin().counts` (Task 5 — until it exists, `AdminTabs` accepts `counts` as a prop and `AdminShell` passes `{}`).
- Produces: `TABS` — the ordered tab list, exported from `AdminTabs.jsx` as `[{ slug, label, countKey }]`, read by the tests and the e2e sweep.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/admin-shell.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import { TABS } from '../../src/app/admin/AdminTabs.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('admin shell', () => {
  beforeEach(() => sessionStorage.clear());

  test('a locked URL lands on the profile, not on the console', () => {
    at('/me/admin/withdrawals');
    expect(screen.queryByRole('tablist', { name: /Admin sections/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Admin account/ })).toBeInTheDocument();
  });

  test('unlocked, /me/admin redirects to Analytics', () => {
    setUnlocked(true);
    at('/me/admin');
    expect(screen.getByRole('link', { name: /Analytics/ })).toHaveAttribute('aria-current', 'page');
  });

  test('all nine tabs are reachable and named', () => {
    setUnlocked(true);
    at('/me/admin/analytics');
    const strip = screen.getByRole('tablist', { name: /Admin sections/ });
    expect(TABS).toHaveLength(9);
    for (const tab of TABS) {
      expect(strip.querySelector(`a[href="/me/admin/${tab.slug}"]`), tab.slug).toBeTruthy();
    }
  });

  test('the shell says whose account it is and that the data is example data', () => {
    setUnlocked(true);
    at('/me/admin/analytics');
    expect(screen.getByText(/Your campus · you@campus\.edu/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to me/ })).toHaveAttribute('href', '/me');
  });

  test('it draws no table and no emoji', () => {
    setUnlocked(true);
    at('/me/admin/analytics');
    expect(screen.queryByRole('table')).toBeNull();
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-shell.test.jsx`
Expected: FAIL — `Cannot find module '../../src/app/admin/AdminTabs.jsx'`.

- [ ] **Step 3: Write the tab strip**

Create `src/app/admin/AdminTabs.jsx`:

```jsx
import { NavLink } from 'react-router-dom';

// Nine tabs do not fit a 520px column, and neither existing pattern fits:
// the DS Tabs component draws folder tabs sized for four, and the app's
// FormatTabs (.ft) is a plain flex row with no overflow handling. This is the
// FilterChips (.fc) pattern instead — a horizontal scroller with the
// scrollbar hidden and negative margins so the row bleeds to the column edge
// and reads as scrollable.
//
// Counts appear only where a queue holds work waiting. A count of editable
// rows (Campuses, Cashback) is not a to-do, so those carry none.
export const TABS = [
  { slug: 'analytics', label: 'Analytics', countKey: null },
  { slug: 'tasks', label: 'Tasks', countKey: 'tasks' },
  { slug: 'ugc', label: 'UGC review', countKey: 'ugc' },
  { slug: 'gigs', label: 'Physical gigs', countKey: 'gigs' },
  { slug: 'events', label: 'Events', countKey: 'events' },
  { slug: 'withdrawals', label: 'Withdrawals', countKey: 'withdrawals' },
  { slug: 'campuses', label: 'Campuses', countKey: null },
  { slug: 'career', label: 'Career', countKey: 'career' },
  { slug: 'cashback', label: 'Cashback %', countKey: null },
];

export default function AdminTabs({ counts = {} }) {
  return (
    <div className="adm__tabs" role="tablist" aria-label="Admin sections">
      {TABS.map((tab) => {
        const n = tab.countKey ? counts[tab.countKey] : null;
        return (
          <NavLink key={tab.slug} to={`/me/admin/${tab.slug}`} className="adm__tab" role="tab">
            {tab.label}
            {n ? <span className="adm__tab-n">{n}</span> : null}
          </NavLink>
        );
      })}
    </div>
  );
}
```

`NavLink` sets `aria-current="page"` and an `active` class itself; do not compute either by hand.

- [ ] **Step 4: Write the shell**

Create `src/app/admin/AdminShell.jsx`:

```jsx
import { Link, Navigate, Outlet } from 'react-router-dom';
import { ScreenHeader } from 'axelerate-design-system';
import hub from '../../data/hub.example.json';
import { useAdminUnlock } from './gate.jsx';
import AdminTabs from './AdminTabs.jsx';
import './admin.css';

export default function AdminShell() {
  const { unlocked } = useAdminUnlock();

  // Locked, a URL bounces to the profile with a flag so Me opens the gate
  // dialog. Rendering the console behind a dialog would put real rows one
  // devtools node away from a reader who has not entered anything.
  if (!unlocked) return <Navigate to="/me" replace state={{ adminGate: true }} />;

  const account = Object.fromEntries(hub.admin.account.map((a) => [a.label, a.value]));

  return (
    <div className="adm">
      <ScreenHeader
        back={{ as: Link, to: '/me', label: 'Back to me' }}
        kicker="Me"
        title="Admin"
      />
      {/* The role is already the header's note, so this line carries only what
          the note does not: which campus, and which address it is signed under. */}
      <p className="adm__who">
        {account.Campus} · {account['Admin email']}
      </p>
      <AdminTabs />
      <div className="adm__panel">
        <Outlet />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire the routes**

In `src/App.jsx`, import `AdminShell` and the panels, and replace the single `/me/admin` route with:

```jsx
        {/* The console is nine addresses so a panel is linkable and the back
            button steps through tabs. AdminShell holds the gate, so one guard
            covers all nine. */}
        <Route path="/me/admin" element={<AdminShell />}>
          <Route index element={<Navigate to="analytics" replace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="tasks" element={<NotBuilt name="Tasks" />} />
          <Route path="ugc" element={<NotBuilt name="UGC review" />} />
          <Route path="gigs" element={<NotBuilt name="Physical gigs" />} />
          <Route path="events" element={<NotBuilt name="Events" />} />
          <Route path="withdrawals" element={<NotBuilt name="Withdrawals" />} />
          <Route path="campuses" element={<NotBuilt name="Campuses" />} />
          <Route path="career" element={<NotBuilt name="Career" />} />
          <Route path="cashback" element={<NotBuilt name="Cashback %" />} />
        </Route>
```

Add `Navigate` to the `react-router-dom` import. Define `NotBuilt` in `src/app/admin/panels/NotBuilt.jsx`:

```jsx
// Phase 1 ships Analytics only. A tab that says nothing is worse than a tab
// that says what it will be, so each unbuilt panel names itself.
export default function NotBuilt({ name }) {
  return (
    <div className="adm__empty">
      <p className="adm__empty-title">{name}</p>
      <p className="adm__empty-note">Not built yet. Coming in the next pass.</p>
    </div>
  );
}
```

Later tasks replace these one at a time; `NotBuilt.jsx` is deleted in Task 18.

- [ ] **Step 6: Write the CSS**

Create `src/app/admin/admin.css`. Every rule is scoped under `.adm` — at (0,2,0) it beats the DS's own injected (0,1,0) rules, which land after the bundle:

```css
/* The admin console. All rules scoped under .adm: DS components inject their
   styles at JS-execution time, after this stylesheet, so an unscoped (0,1,0)
   rule on an element wearing an ax-* class loses the tie. */
.adm { padding-bottom: 26px; }

.adm__who {
  margin: 2px 0 0;
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--gray-600);
}
.adm__note {
  margin: 10px 0 0;
  font-family: var(--font-hand);
  font-size: 17px;
  color: var(--gray-600);
  transform: rotate(-0.6deg);
}

/* The FilterChips scroller, not the FormatTabs flex row. */
.adm__tabs {
  display: flex;
  gap: 6px;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;
  /* Full-bleed: .app__col carries 16px of padding, so -16px exactly. -18px
     overflows the page by 2px a side and the sweep fails it. */
  margin: 16px -16px 0;
  padding: 2px 16px 6px;
}
.adm__tabs::-webkit-scrollbar { display: none; }

.adm .adm__tab {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 15px;
  border-radius: var(--radius-pill);
  background: var(--gray-0);
  box-shadow: inset 0 0 0 1.5px var(--gray-300);
  font-family: var(--font-display);
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--gray-600);
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--dur-fast), box-shadow var(--dur-fast);
}
.adm .adm__tab:hover { color: var(--text-primary); box-shadow: inset 0 0 0 1.5px var(--gray-400); }
.adm .adm__tab.active {
  background: var(--ink-900);
  box-shadow: none;
  color: var(--gray-0);
}
.adm__tab-n {
  font-family: var(--font-label);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}

.adm__panel { margin-top: 20px; }

.adm__empty { padding: 34px 0; }
.adm__empty-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.adm__empty-note { margin: 6px 0 0; font-size: 15px; color: var(--gray-600); }
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run tests/unit/admin-shell.test.jsx`
Expected: PASS, 5 tests. (The Analytics route renders `Analytics` — until Task 6 exists, point it at `NotBuilt` too and flip it in Task 6.)

- [ ] **Step 8: Screenshot it**

```bash
npm run dev
```

Then, in a second shell:

```bash
node --input-type=module -e "
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:5173/me');
await p.getByRole('button', { name: /Admin account/ }).click();
await p.getByLabel('Password').fill('campus-lead');
await p.getByRole('button', { name: 'Unlock' }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: 'admin-shell.png', fullPage: true });
await b.close();
"
```

Look at `admin-shell.png`: the tab strip must scroll rather than overflow the column, the active tab must be legible, and the header must not collide with the note. Delete the PNG before committing.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin src/App.jsx tests/unit/admin-shell.test.jsx
git commit -m "Give the console its nine addresses and a scrolling tab strip"
```

---

### Task 5: The store

**Files:**
- Create: `src/app/admin/store.jsx`
- Modify: `src/app/admin/AdminShell.jsx` (wrap in the provider, feed `AdminTabs`)
- Modify: `tests/unit/admin-shell.test.jsx` (append)

**Interfaces:**
- Consumes: `src/data/admin.example.json` (Task 1).
- Produces:
  - `AdminDataProvider({ children, seed })` — `seed` defaults to the fixture; tests pass their own.
  - `useAdmin()` returns:
    - data: `orders, ugcSubmissions, gigApplications, eventApplications, w9Submissions, withdrawals, campuses, careerClaims, careerRoles, careerPathways, cashbackRates, dailyTotals, stats`
    - `counts: { tasks, ugc, gigs, events, withdrawals, career }` — pending rows only
    - `toast: { title, description } | null`, `dismissToast()`
    - mutations, every one `(id, ...args) => void`:
      `approveReturn, approveCancellation, markShipped, approveUgc, rejectUgc(id, reason), approveGig, rejectGig(id, reason), completeGig, approveEventApp, declineEventApp, verifyW9, completePayout, rejectPayout(id, reason), addCampus(fields), updateCampus(id, fields), removeCampus, approveClaim, rejectClaim(id, reason), setClaimCertificate(id, name), saveRole(id, name), savePathway(id, fields), setCashbackRate(id, pct)`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-shell.test.jsx`:

```jsx
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { AdminDataProvider, useAdmin } from '../../src/app/admin/store.jsx';

const hook = () => renderHook(() => useAdmin(), { wrapper: AdminDataProvider });

describe('admin store', () => {
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
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-shell.test.jsx`
Expected: FAIL — `Cannot find module '../../src/app/admin/store.jsx'`.

- [ ] **Step 3: Write the store**

Create `src/app/admin/store.jsx`:

```jsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import seedData from '../../data/admin.example.json';

// The console's whole data layer.
//
// One fixture in, React state out, and every mutation is a plain function
// that returns nothing — the same shape a Supabase call will have once it
// exists. This provider is the single seam: swapping a body for a query
// changes no caller. Cf. src/lib/join.js, which plays the same role for the
// join form.
//
// State is session-only, on purpose. A reload restores the fixture, because
// nothing here is real and pretending otherwise would be the lie.
const AdminContext = createContext(null);

const PENDING_UGC = new Set(['pending', 'submitted']);

export function AdminDataProvider({ children, seed = seedData }) {
  const [data, setData] = useState(() => structuredClone(seed));
  const [toast, setToast] = useState(null);

  const say = useCallback((title, description) => setToast({ title, description }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // One helper behind every mutation: replace the matching row in one
  // collection, leaving the rest of the fixture untouched.
  const patch = useCallback((key, id, fields) => {
    setData((d) => ({
      ...d,
      [key]: d[key].map((row) => (row.id === id ? { ...row, ...fields } : row)),
    }));
  }, []);

  const value = useMemo(() => {
    const orders = data.orders;
    const ugcSubmissions = data.ugc_submissions;
    const gigApplications = data.gig_applications;
    const eventApplications = data.event_applications;
    const w9Submissions = data.w9_submissions;
    const withdrawals = data.withdrawals;
    const careerClaims = data.career_claims;

    return {
      orders,
      ugcSubmissions,
      gigApplications,
      eventApplications,
      w9Submissions,
      withdrawals,
      campuses: data.campuses,
      careerClaims,
      careerRoles: data.career_roles,
      careerPathways: data.career_pathways,
      cashbackRates: data.cashback_rates,
      dailyTotals: data.daily_totals,
      stats: data.stats,

      counts: {
        tasks: orders.filter((o) => o.needs).length,
        ugc: ugcSubmissions.filter((s) => PENDING_UGC.has(s.status)).length,
        gigs: gigApplications.filter((g) => g.status === 'pending').length,
        events: eventApplications.filter((e) => e.status === 'pending').length,
        withdrawals:
          withdrawals.filter((w) => w.status === 'pending').length +
          w9Submissions.filter((w) => !w.verified).length,
        career: careerClaims.filter((c) => c.status === 'pending').length,
      },

      toast,
      dismissToast,

      approveReturn: (id) => {
        patch('orders', id, { needs: null, status: 'delivered' });
        say('Return approved', 'Cash and credits go back to the student.');
      },
      approveCancellation: (id) => {
        patch('orders', id, { needs: null, status: 'delivered' });
        say('Cancellation approved', 'The order is cancelled and refunded.');
      },
      markShipped: (id) => {
        patch('orders', id, { needs: null, status: 'shipped' });
        say('Marked shipped', 'The student gets the tracking note.');
      },

      approveUgc: (id) => {
        patch('ugc_submissions', id, { status: 'approved' });
        say('UGC approved', 'Reward released to the creator.');
      },
      rejectUgc: (id, reason) => {
        patch('ugc_submissions', id, { status: 'rejected', reject_reason: reason });
        say('UGC rejected', 'The reason goes to the creator.');
      },

      approveGig: (id) => {
        patch('gig_applications', id, { status: 'approved' });
        say('Applicant approved', 'They are on the crew list.');
      },
      rejectGig: (id, reason) => {
        patch('gig_applications', id, { status: 'rejected', reject_reason: reason });
        say('Applicant rejected', 'The reason goes to the applicant.');
      },
      completeGig: (id) => {
        patch('gig_applications', id, { status: 'complete' });
        say('Gig complete', 'Payout queued.');
      },

      approveEventApp: (id) => {
        patch('event_applications', id, { status: 'approved' });
        say('Applicant approved', 'They are on the door list.');
      },
      declineEventApp: (id) => {
        patch('event_applications', id, { status: 'declined' });
        say('Applicant declined', 'The seat goes back to the pool.');
      },

      verifyW9: (id) => {
        patch('w9_submissions', id, { verified: true });
        say('W-9 verified', 'Payouts can be released for this student.');
      },
      completePayout: (id) => {
        patch('withdrawals', id, { status: 'completed' });
        say('Payout completed', 'Marked as sent.');
      },
      rejectPayout: (id, reason) => {
        patch('withdrawals', id, { status: 'rejected', reject_reason: reason });
        say('Payout rejected', 'The reason goes to the student.');
      },

      addCampus: (fields) => {
        setData((d) => ({
          ...d,
          campuses: [
            ...d.campuses,
            { id: `cmp${d.campuses.length + 1}`, logo_url: '', student_count: 0, ...fields },
          ],
        }));
        say('School added', `${fields.name} is on the list.`);
      },
      updateCampus: (id, fields) => {
        patch('campuses', id, fields);
        say('School saved', '');
      },
      removeCampus: (id) => {
        setData((d) => ({ ...d, campuses: d.campuses.filter((c) => c.id !== id) }));
        say('School removed', '');
      },

      approveClaim: (id) => {
        patch('career_claims', id, { status: 'approved' });
        say('Claim approved', 'The certificate goes out.');
      },
      rejectClaim: (id, reason) => {
        patch('career_claims', id, { status: 'rejected', reject_reason: reason });
        say('Claim rejected', 'They can submit again.');
      },
      setClaimCertificate: (id, name) => patch('career_claims', id, { certificate_name: name }),

      saveRole: (id, name) => {
        patch('career_roles', id, { name, updated_at: '2026-08-31' });
        say('Role saved', '');
      },
      savePathway: (id, fields) => {
        patch('career_pathways', id, fields);
        say('Pathway saved', '');
      },

      setCashbackRate: (id, pct) => {
        patch('cashback_rates', id, { pct: Number(pct) });
        say('Rate saved', '');
      },
    };
  }, [data, toast, patch, say, dismissToast]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminDataProvider');
  return ctx;
}
```

- [ ] **Step 4: Wrap the shell and feed the tab counts**

In `AdminShell.jsx`, wrap everything below the guard in `<AdminDataProvider>`, and split the inner markup into a child component so it can call `useAdmin()`:

```jsx
function AdminShellInner() {
  const { counts, toast, dismissToast } = useAdmin();
  /* header, note, <AdminTabs counts={counts} />, <Outlet />, and the toast */
}
```

Render the toast fixed above the dock, inside `.adm`:

```jsx
      {toast && (
        <div className="adm__toast">
          <Toast tone="success" title={toast.title} description={toast.description} onDismiss={dismissToast} />
        </div>
      )}
```

Add to `admin.css`:

```css
/* Above the dock, which owns the bottom 82px. */
.adm__toast { position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%); z-index: 40; width: min(340px, calc(100vw - 36px)); }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/unit/admin-shell.test.jsx`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin tests/unit/admin-shell.test.jsx
git commit -m "Load the console's data once and let the panels mutate it"
```

---

### Task 6: Analytics — the four tiles

**Files:**
- Create: `src/app/admin/panels/Analytics.jsx`
- Create: `tests/unit/admin-analytics.test.jsx`
- Modify: `src/App.jsx` (point `analytics` at the real panel)
- Modify: `src/app/admin/admin.css`

**Interfaces:**
- Consumes: `useAdmin()` — `stats`, `withdrawals`, `dailyTotals`, `campuses` (Task 5); `usd`, `credit` from `src/app/parts/Money.jsx`.
- Produces: nothing later tasks read.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin-analytics.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import admin from '../../src/data/admin.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('admin analytics — tiles', () => {
  beforeEach(() => { sessionStorage.clear(); setUnlocked(true); });

  test('four tiles, each labelled', () => {
    at('/me/admin/analytics');
    // StatBlock uppercases its label in CSS, so the DOM text is title case.
    for (const label of ['Total GMV', 'Daily active', 'Pending payouts', 'Total users']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test('GMV is the sum of the daily cash, in dollars', () => {
    at('/me/admin/analytics');
    const gmv = admin.daily_totals.reduce((n, d) => n + d.cash_paid, 0);
    expect(screen.getByTestId('tile-gmv')).toHaveTextContent(`$${Math.round(gmv).toLocaleString('en-US')}`);
  });

  test('the credit figure never stands as a bare number', () => {
    at('/me/admin/analytics');
    expect(screen.getByTestId('tile-gmv')).toHaveTextContent(/credit · \$\d/);
  });

  test('pending payouts counts only the pending ones', () => {
    at('/me/admin/analytics');
    const pending = admin.withdrawals.filter((w) => w.status === 'pending');
    const total = pending.reduce((n, w) => n + w.amount, 0);
    expect(screen.getByTestId('tile-payouts')).toHaveTextContent(`$${total.toLocaleString('en-US')}`);
    expect(screen.getByTestId('tile-payouts')).toHaveTextContent(`${pending.length}`);
  });

  test('no Est. CAC tile — the DS forbids an invented denominator', () => {
    at('/me/admin/analytics');
    expect(screen.queryByText(/CAC/i)).toBeNull();
    expect(screen.queryByText('N/A')).toBeNull();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-analytics.test.jsx`
Expected: FAIL — the route still renders `NotBuilt`.

- [ ] **Step 3: Write the tiles**

Create `src/app/admin/panels/Analytics.jsx`:

```jsx
import { StatBlock } from 'axelerate-design-system';
import { usd, credit } from '../../parts/Money.jsx';
import { useAdmin } from '../store.jsx';

// Four figures, then the trends. No plotted chart anywhere: the design system
// asks for figures, tally marks and hatched rows, and forbids pie charts,
// gridlines and solid progress bars outright.
//
// The reference's fourth tile is "Est. CAC — N/A, requires marketing spend
// data". A tile whose only content is N/A states nothing, and an invented
// denominator is exactly what the readme rules out, so Total Users takes the
// slot and says something true.
export default function Analytics() {
  const { stats, withdrawals, dailyTotals } = useAdmin();

  const gmv = dailyTotals.reduce((n, d) => n + d.cash_paid, 0);
  const creditsUsed = dailyTotals.reduce((n, d) => n + d.credits_used, 0);
  const pending = withdrawals.filter((w) => w.status === 'pending');
  const pendingTotal = pending.reduce((n, w) => n + w.amount, 0);
  const verifiedShare = Math.round((stats.verified_users / stats.total_users) * 100);

  return (
    <div className="adm-an">
      <div className="adm-an__tiles">
        <StatBlock
          data-testid="tile-gmv"
          figure={usd(Math.round(gmv))}
          label="Total GMV"
          note={credit(creditsUsed)}
        />
        <StatBlock
          data-testid="tile-dau"
          figure={stats.active_today.toLocaleString('en-US')}
          label="Daily active"
          note="signed in today"
        />
        <StatBlock
          data-testid="tile-payouts"
          figure={usd(pendingTotal)}
          label="Pending payouts"
          note={`${pending.length} awaiting release`}
        />
        <StatBlock
          data-testid="tile-users"
          figure={stats.total_users.toLocaleString('en-US')}
          label="Total users"
          note={`${verifiedShare}% verified students`}
        />
      </div>
    </div>
  );
}
```

Point the `analytics` route at it in `src/App.jsx`.

- [ ] **Step 4: Lay the tiles out two-up**

Add to `admin.css`:

```css
.adm-an__tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 16px;
}
/* StatBlock's figure is 38px display type; at 320px two columns leave ~140px
   a side, which a five-figure dollar amount overruns. One column below 360. */
@media (max-width: 359px) {
  .adm-an__tiles { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/unit/admin-analytics.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin src/App.jsx tests/unit/admin-analytics.test.jsx
git commit -m "State the four figures Analytics leads with"
```

---

### Task 7: Analytics — two trend stacks and the campus share

**Files:**
- Create: `src/app/admin/buckets.js`, `src/app/admin/parts/Trend.jsx`
- Modify: `src/app/admin/panels/Analytics.jsx`, `src/app/admin/admin.css`
- Modify: `tests/unit/admin-analytics.test.jsx` (append)

**Interfaces:**
- Consumes: `dailyTotals`, `campuses` from `useAdmin()`.
- Produces:
  - `bucketTotals(dailyTotals, range: 7 | 30 | 90): Array<{ label, cash_paid, credits_used }>`
  - `Trend({ title, rows, measure: 'cash_paid' | 'credits_used', color, format })`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-analytics.test.jsx`:

```jsx
import userEvent from '@testing-library/user-event';
import { bucketTotals } from '../../src/app/admin/buckets.js';

describe('bucketTotals', () => {
  const days = admin.daily_totals;

  test('7 days is one row per day', () => {
    const rows = bucketTotals(days, 7);
    expect(rows).toHaveLength(7);
    expect(rows.at(-1).cash_paid).toBeCloseTo(days.at(-1).cash_paid, 2);
  });

  test('30 days is five weekly rows, and they sum to the window', () => {
    const rows = bucketTotals(days, 30);
    expect(rows).toHaveLength(5);
    const windowSum = days.slice(-30).reduce((n, d) => n + d.cash_paid, 0);
    const rowSum = rows.reduce((n, r) => n + r.cash_paid, 0);
    expect(rowSum).toBeCloseTo(windowSum, 2);
  });

  test('90 days is three monthly rows', () => {
    expect(bucketTotals(days, 90)).toHaveLength(3);
  });

  test('a stack is never more than seven rows, whatever the range', () => {
    for (const range of [7, 30, 90]) {
      expect(bucketTotals(days, range).length).toBeLessThanOrEqual(7);
    }
  });
});

describe('admin analytics — trends and share', () => {
  beforeEach(() => { sessionStorage.clear(); setUnlocked(true); });

  test('cash and credits are two separate stacks, never one dual-axis frame', () => {
    at('/me/admin/analytics');
    expect(screen.getByRole('heading', { name: /Cash/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Credits/ })).toBeInTheDocument();
    expect(screen.getAllByTestId('trend-stack')).toHaveLength(2);
  });

  test('the range toggle changes the bucket, not just the window', async () => {
    const user = userEvent.setup();
    at('/me/admin/analytics');
    expect(screen.getAllByTestId('trend-row')).toHaveLength(14); // 7 rows × 2 stacks
    await user.click(screen.getByRole('button', { name: '90 days' }));
    expect(screen.getAllByTestId('trend-row')).toHaveLength(6); // 3 rows × 2 stacks
  });

  test('campus share is labelled rows, not a pie', () => {
    at('/me/admin/analytics');
    for (const c of admin.campuses) {
      expect(screen.getByText(c.name)).toBeInTheDocument();
    }
    expect(document.querySelector('svg circle')).toBeNull();
    expect(document.querySelector('canvas')).toBeNull();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-analytics.test.jsx`
Expected: FAIL — `Cannot find module '../../src/app/admin/buckets.js'`.

- [ ] **Step 3: Write the bucketer**

Create `src/app/admin/buckets.js`:

```js
// The range toggle changes the bucket, not just the window.
//
// 90 daily rows in a 520px column is a wall of unlabelled marks, so a longer
// range means a coarser bucket and the row count stays readable: 7 days →
// daily, 30 → weekly, 90 → monthly. A stack is never more than 7 rows.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const empty = (label) => ({ label, cash_paid: 0, credits_used: 0 });

function add(bucket, day) {
  bucket.cash_paid += day.cash_paid;
  bucket.credits_used += day.credits_used;
  return bucket;
}

export function bucketTotals(dailyTotals, range) {
  const window = dailyTotals.slice(-range);

  if (range <= 7) {
    return window.map((d) => {
      const day = new Date(`${d.date}T00:00:00Z`);
      return add(empty(`${day.getUTCMonth() + 1}/${day.getUTCDate()}`), d);
    });
  }

  if (range <= 30) {
    // Weeks counted back from the most recent day, so the last bucket always
    // ends today rather than on an arbitrary calendar boundary.
    const weeks = [];
    for (let i = 0; i < window.length; i += 7) {
      const chunk = window.slice(i, i + 7);
      const first = new Date(`${chunk[0].date}T00:00:00Z`);
      const bucket = empty(`${first.getUTCMonth() + 1}/${first.getUTCDate()}`);
      chunk.forEach((d) => add(bucket, d));
      weeks.push(bucket);
    }
    return weeks;
  }

  const byMonth = new Map();
  for (const d of window) {
    const day = new Date(`${d.date}T00:00:00Z`);
    const key = `${day.getUTCFullYear()}-${day.getUTCMonth()}`;
    if (!byMonth.has(key)) byMonth.set(key, empty(MONTHS[day.getUTCMonth()]));
    add(byMonth.get(key), d);
  }
  return [...byMonth.values()];
}
```

A 30-day window over 90 sorted days yields 5 chunks (7+7+7+7+2), which is what the test asserts.

- [ ] **Step 4: Write the stack**

Create `src/app/admin/parts/Trend.jsx`:

```jsx
import { MarkerBar } from 'axelerate-design-system';

// One measure, one frame. Cash and credits never share a frame with two
// y-scales — a dual-axis chart invents a crossing point that means nothing.
//
// MarkerBar's hatched strokes are the design system's sanctioned form for
// shares and comparisons, and are explicitly not a solid progress bar.
export default function Trend({ title, rows, measure, color, format }) {
  const peak = Math.max(...rows.map((r) => r[measure]), 1);

  return (
    <section className="adm-tr" data-testid="trend-stack">
      <h2 className="adm-tr__title">{title}</h2>
      <div className="adm-tr__rows">
        {rows.map((row) => (
          <div key={row.label} className="adm-tr__row" data-testid="trend-row">
            <MarkerBar
              value={row[measure]}
              total={peak}
              color={color}
              label={row.label}
              figure={format(row[measure])}
              height={20}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Assemble the panel**

In `Analytics.jsx`, add the range state and render the two stacks plus the campus share:

```jsx
import { useState } from 'react';
import { bucketTotals } from '../buckets.js';
import Trend from '../parts/Trend.jsx';

const RANGES = [7, 30, 90];

  const [range, setRange] = useState(7);
  const rows = bucketTotals(dailyTotals, range);
  const studentTotal = campuses.reduce((n, c) => n + c.student_count, 0);
```

then, after the tiles:

```jsx
      <div className="adm-an__ranges" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            className={`adm-an__range${r === range ? ' is-on' : ''}`}
            aria-pressed={r === range}
            onClick={() => setRange(r)}
          >
            {r} days
          </button>
        ))}
      </div>

      <Trend title="Cash" rows={rows} measure="cash_paid" color="violet" format={(n) => usd(Math.round(n))} />
      <Trend
        title="Credits"
        rows={rows}
        measure="credits_used"
        color="yellow"
        format={(n) => credit(Math.round(n))}
      />

      <section className="adm-tr">
        <h2 className="adm-tr__title">Campus share</h2>
        {/* Labelled rows, not a pie: the design system forbids pie charts, and
            a share is a comparison, which is what MarkerBar is for. One hue,
            because the row label carries identity — colour carries nothing
            here, so there is no categorical palette to get wrong. */}
        <div className="adm-tr__rows">
          {campuses.map((c) => (
            <div key={c.id} className="adm-tr__row">
              <MarkerBar
                value={c.student_count}
                total={studentTotal}
                color="lavender"
                label={c.name}
                figure={`${c.student_count}`}
                note={`${Math.round((c.student_count / studentTotal) * 100)}%`}
                height={20}
              />
            </div>
          ))}
        </div>
      </section>
```

Add `campuses` to the `useAdmin()` destructure.

- [ ] **Step 6: Style the range buttons and rows**

Add to `admin.css`:

```css
.adm-an__ranges { display: flex; gap: 8px; margin: 26px 0 4px; }
.adm .adm-an__range {
  min-height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--gray-300);
  border-radius: var(--radius-pill);
  background: var(--gray-0);
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  cursor: pointer;
}
.adm .adm-an__range.is-on { border-color: var(--ink-900); background: var(--ink-900); color: var(--gray-0); }

.adm-tr { margin-top: 26px; }
.adm-tr__title {
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.adm-tr__rows { display: flex; flex-direction: column; gap: 14px; }
```

`MarkerBar`'s `note` slot is `white-space: nowrap` (DS issue #5), so keep the percentage short — it fits; do not put a sentence there.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run tests/unit/admin-analytics.test.jsx`
Expected: PASS, 12 tests.

- [ ] **Step 8: Screenshot it, at 320 and 390**

Use the Task 4 Step 8 snippet, navigating to `/me/admin/analytics`, once at `width: 320` and once at `390`. Check: tiles do not clip their figures, no trend row's label collides with its figure, the credits figure (`8,000 credit · $80 in shop`) is not truncated, and the page does not scroll sideways.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin tests/unit/admin-analytics.test.jsx
git commit -m "Draw the trends as two hatched stacks, and the campus share as rows"
```

---

### Task 8: Retire the old admin screen, tidy the fixture, document it

**Files:**
- Delete: `src/app/screens/Admin.jsx`
- Modify: `src/data/hub.example.json`, `README.md`
- Modify: `tests/unit/fixtures.test.js` if it references `hub.admin.can` or `hub.admin.note`

- [ ] **Step 1: Check what still references them**

```bash
grep -rn "admin.can\|admin\.note\|screens/Admin" src tests
```

Every hit must be gone or updated by the end of this task.

- [ ] **Step 2: Write the failing test**

Append to `tests/unit/admin-shell.test.jsx`:

```jsx
describe('the old admin account screen is gone', () => {
  test('the fixture no longer claims the console is absent', () => {
    expect(hub.admin.note).toBeUndefined();
    expect(hub.admin.can).toBeUndefined();
  });

  test('but the account it is signed under still shows', () => {
    sessionStorage.clear();
    setUnlocked(true);
    at('/me/admin/analytics');
    expect(screen.getByText(/Your campus · you@campus\.edu/)).toBeInTheDocument();
  });
});
```

Add `import hub from '../../src/data/hub.example.json';` at the top.

- [ ] **Step 3: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-shell.test.jsx`
Expected: FAIL — `hub.admin.note` is still `"The console itself is not part of this preview."`

- [ ] **Step 4: Delete the keys and the screen**

In `src/data/hub.example.json`, reduce `admin` to its `account` array only — drop `can` and `note`. That sentence stops being true the moment the console exists, and `can` ("approve field-visit logs", "publish campus missions", "see the roster") is now literally the tab strip.

```bash
git rm src/app/screens/Admin.jsx
```

- [ ] **Step 5: Document it**

Add to `README.md`, after the existing routes section:

```markdown
### Admin console

`/me/admin/*` — nine tabs behind a password dialog opened from **Admin account**
in the Me hub. Set `VITE_ADMIN_PASSWORD` (see `.env.example`); with nothing set,
the development default `campus-lead` applies.

**The password is not security.** There is no backend, so it is compared in the
browser against a value compiled into the client bundle, and clearing one
`sessionStorage` key walks past it. It exists so the console is not opened by
accident during a demo. `src/app/admin/gate.jsx` is the seam a real Supabase
check replaces.

Every panel runs on `src/data/admin.example.json`, whose columns are snake_case
so the fixture drops in as a Supabase seed. Actions mutate React state for the
session and a reload restores the fixture — nothing here persists, because
nothing here is real.
```

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS. Fix any test that referenced the deleted screen or keys; do not weaken an assertion to make it pass.

- [ ] **Step 7: Commit**

```bash
git add -A src tests README.md
git commit -m "Retire the admin account screen the console replaces"
```

---

### Task 9: The nine routes join the responsive sweep

**Files:**
- Modify: `tests/e2e/responsive.spec.js`

- [ ] **Step 1: Read how the sweep is built**

```bash
sed -n '1,60p' tests/e2e/responsive.spec.js
```

Find the route list and the width list, and follow their existing shape exactly.

- [ ] **Step 2: Add the admin routes behind an unlock**

The console redirects when locked, so the sweep must set the session key before navigating. Add, following the file's own conventions:

```js
// The console is nine addresses and every one has to survive 320px. The gate
// would bounce each of them, so unlock in the browser context first — the same
// key gate.jsx writes.
const ADMIN_ROUTES = [
  '/me/admin/analytics', '/me/admin/tasks', '/me/admin/ugc',
  '/me/admin/gigs', '/me/admin/events', '/me/admin/withdrawals',
  '/me/admin/campuses', '/me/admin/career', '/me/admin/cashback',
];

async function unlockAdmin(page) {
  await page.addInitScript(() => sessionStorage.setItem('ax-admin-unlocked', '1'));
}
```

and extend the existing overflow sweep over `ADMIN_ROUTES`, calling `unlockAdmin(page)` before `page.goto`.

- [ ] **Step 3: Add the guards a sweep alone would miss**

The overflow sweep only catches horizontal overflow and small touch targets — a collapsed layout never trips either. Add:

```js
test('the admin tab strip scrolls instead of overflowing the column', async ({ page }) => {
  await unlockAdmin(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/me/admin/analytics');
  const strip = page.locator('.adm__tabs');
  const box = await strip.boundingBox();
  expect(box.width).toBeLessThanOrEqual(320);
  // The row must actually be scrollable, not clipped.
  const [scrollW, clientW] = await strip.evaluate((el) => [el.scrollWidth, el.clientWidth]);
  expect(scrollW).toBeGreaterThan(clientW);
});

test('no admin shadow carries a blur', async ({ page }) => {
  await unlockAdmin(page);
  await page.goto('/me/admin/analytics');
  const blurred = await page.evaluate(() => [...document.querySelectorAll('.adm *')]
    .map((el) => getComputedStyle(el).boxShadow)
    .filter((s) => s && s !== 'none')
    .filter((s) => {
      const m = s.match(/(-?\d+(?:\.\d+)?)px/g);
      return m && m.length >= 3 && parseFloat(m[2]) > 0;
    }));
  expect(blurred).toEqual([]);
});
```

- [ ] **Step 4: Run the e2e suite**

Run: `npm run test:e2e`
Expected: PASS. If Chromium is missing, `npm run test:e2e:setup` first.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/responsive.spec.js
git commit -m "Sweep the console's nine routes at every width"
```

**Phase 1 is complete here.** The gate works, Analytics is real, eight tabs say what they will be, and the whole suite is green. Stop for review before Phase 2.

---

# Phase 2 — The five queues

Every queue is the same shape: rows that expand, a `Badge` carrying the status word, and one or more actions that mutate the store and fire a toast. Task 10 builds the two pieces they share; Tasks 11–15 build one panel each.

### Task 10: The row and the rejection dialog

**Files:**
- Create: `src/app/admin/parts/QueueRow.jsx`, `src/app/admin/parts/RejectDialog.jsx`
- Create: `tests/unit/admin-queues.test.jsx`
- Modify: `src/app/admin/admin.css`

**Interfaces:**
- Consumes: `Badge`, `Button`, `Card`, `Dialog` from the design system.
- Produces:
  - `QueueRow({ title, meta, status, tone, open, onToggle, actions, children })` — a flat `Card` whose header is a button; `children` render only when `open`. `actions` is a node, rendered under the detail.
  - `RejectDialog({ open, title, placeholder, onClose, onSubmit })` — `onSubmit(reason)` fires only with a non-empty reason.
  - `TONES` — the status→`Badge` tone map, exported from `QueueRow.jsx`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin-queues.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import admin from '../../src/data/admin.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const go = (path) => { sessionStorage.clear(); setUnlocked(true); at(path); };

describe('the rejection dialog', () => {
  test('it will not send an empty reason', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { RejectDialog } = await import('../../src/app/admin/parts/RejectDialog.jsx');
    render(<RejectDialog open title="Reject UGC submission" onClose={() => {}} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Say why/)).toBeInTheDocument();
  });

  test('with a reason it sends it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { RejectDialog } = await import('../../src/app/admin/parts/RejectDialog.jsx');
    render(<RejectDialog open title="Reject UGC submission" onClose={() => {}} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Reason'), 'Missing the brand tag.');
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(onSubmit).toHaveBeenCalledWith('Missing the brand tag.');
  });

  test('the reason field is multi-line, and is not a DS component', async () => {
    const { RejectDialog } = await import('../../src/app/admin/parts/RejectDialog.jsx');
    render(<RejectDialog open title="x" onClose={() => {}} onSubmit={() => {}} />);
    const field = screen.getByLabelText('Reason');
    expect(field.tagName).toBe('TEXTAREA');
    // The design system has no Textarea; this one is local until it does.
    expect(field.className).not.toMatch(/\bax-/);
  });
});

describe('a queue row', () => {
  test('it is collapsed until you open it', async () => {
    const user = userEvent.setup();
    go('/me/admin/tasks');
    const first = screen.getAllByTestId('queue-row')[0];
    expect(first.querySelector('.adm-row__body')).toBeNull();
    await user.click(first.querySelector('.adm-row__head'));
    expect(first.querySelector('.adm-row__body')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-queues.test.jsx`
Expected: FAIL — `Cannot find module '.../RejectDialog.jsx'`.

- [ ] **Step 3: Write the row**

Create `src/app/admin/parts/QueueRow.jsx`:

```jsx
import { Badge, Card } from 'axelerate-design-system';

// Every queue in the console is this row. A flat Card (the panel it sits on
// already carries the shadow), a header that is a button, and a body that only
// exists when open — not hidden with CSS, so a collapsed row costs a screen
// reader nothing.
//
// Status always carries its word. A Badge tone alone would put the whole
// meaning in colour.
export const TONES = {
  pending: 'warning',
  submitted: 'brand',
  approved: 'success',
  complete: 'success',
  delivered: 'success',
  shipped: 'brand',
  packed: 'neutral',
  placed: 'neutral',
  rejected: 'danger',
  declined: 'danger',
  return: 'warning',
  cancellation: 'danger',
  shipping: 'brand',
};

export default function QueueRow({ title, meta, status, open, onToggle, actions, children }) {
  return (
    <Card variant="flat" className="adm-row" data-testid="queue-row">
      <button type="button" className="adm-row__head" onClick={onToggle} aria-expanded={open}>
        <span className="adm-row__mid">
          <span className="adm-row__title">{title}</span>
          {meta && <span className="adm-row__meta">{meta}</span>}
        </span>
        {status && <Badge tone={TONES[status] ?? 'neutral'} tilt={0}>{status}</Badge>}
        <span className={`adm-row__chev${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="adm-row__body">
          {children}
          {actions && <div className="adm-row__actions">{actions}</div>}
        </div>
      )}
    </Card>
  );
}

// The detail lines every panel writes: a caps label over its value.
export function RowFact({ label, value }) {
  return (
    <p className="adm-row__fact">
      <span className="adm-row__fact-l">{label}</span>
      <span className="adm-row__fact-v">{value}</span>
    </p>
  );
}
```

- [ ] **Step 4: Write the rejection dialog**

Create `src/app/admin/parts/RejectDialog.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Button, Dialog } from 'axelerate-design-system';

// A rejection has to say why, so the field is required and the button will not
// send without it.
//
// The textarea is local, not a design-system component: the DS has no Textarea
// and adding one is a component-layer change needing the owner's approval and
// a matching commit in the other repo. Styled from DS tokens to match Input
// exactly (1.5px gray-300, inset paper shadow, gray-400 on hover) so it reads
// as part of the system. A DS issue is filed; when a real Textarea lands, swap
// it in and delete .adm-rej__field from admin.css.
export function RejectDialog({ open, title, placeholder, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [blank, setBlank] = useState(false);

  useEffect(() => {
    if (!open) { setReason(''); setBlank(false); }
  }, [open]);

  const send = () => {
    const text = reason.trim();
    if (!text) { setBlank(true); return; }
    onSubmit(text);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width={400}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send}>Reject &amp; notify</Button>
        </>
      )}
    >
      <label className="adm-rej__label" htmlFor="adm-reject-reason">Reason</label>
      <textarea
        id="adm-reject-reason"
        className="adm-rej__field"
        rows={3}
        placeholder={placeholder}
        aria-describedby="adm-reject-help"
        value={reason}
        onChange={(e) => { setReason(e.target.value); setBlank(false); }}
      />
      <p id="adm-reject-help" className="adm-rej__help">
        {blank ? 'Say why, and it goes to them as written.' : 'This goes to them as written.'}
      </p>
    </Dialog>
  );
}

export default RejectDialog;
```

The label is a plain `<label htmlFor>` with the help text outside it — the same shape the `hint` rule requires, for the same reason.

- [ ] **Step 5: Style them**

Add to `admin.css`:

```css
.adm .adm-row { padding: 0; margin-bottom: 12px; }
.adm .adm-row__head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  padding: 12px 14px;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.adm-row__mid { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.adm-row__title {
  font-family: var(--font-display);
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}
.adm-row__meta { font-size: 13px; color: var(--gray-600); }
.adm-row__chev {
  flex: none;
  width: 9px;
  height: 9px;
  border-right: 2px solid var(--gray-500);
  border-bottom: 2px solid var(--gray-500);
  border-radius: 1px;
  transform: rotate(45deg);
  transition: transform var(--dur-med) var(--ease-launch);
}
.adm-row__chev.is-open { transform: rotate(-135deg); }

.adm-row__body { padding: 0 14px 14px; border-top: 1px solid var(--gray-100); padding-top: 12px; }
.adm-row__fact { display: flex; justify-content: space-between; gap: 14px; margin: 0 0 8px; }
.adm-row__fact-l {
  flex: none;
  font-family: var(--font-label);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--gray-600);
  padding-top: 3px;
}
.adm-row__fact-v { font-size: 13.5px; color: var(--text-primary); text-align: right; min-width: 0; }
.adm-row__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }

/* Local textarea — the design system has no Textarea component. Matches
   Input's own border, shadow and hover exactly. Delete when the DS ships one. */
.adm .adm-rej__label {
  display: block;
  margin-bottom: 6px;
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--gray-600);
}
.adm .adm-rej__field {
  display: block;
  width: 100%;
  padding: 11px 12px;
  border: 1.5px solid var(--gray-300);
  border-radius: var(--radius-hand);
  box-shadow: var(--shadow-paper-inset);
  background: var(--gray-0);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-primary);
  resize: vertical;
  box-sizing: border-box;
}
.adm .adm-rej__field:hover { border-color: var(--gray-400); }
.adm .adm-rej__field:focus-visible { outline: 2px solid var(--brand-primary); outline-offset: 1px; }
.adm .adm-rej__help { margin: 7px 0 0; font-size: 13px; color: var(--gray-600); }

.adm__queue-empty { padding: 30px 0; font-size: 15px; color: var(--gray-600); }
```

`--shadow-paper-inset` is `2×2` with no blur, so this adds no blurred shadow.

- [ ] **Step 6: Run the dialog tests only**

Run: `npx vitest run tests/unit/admin-queues.test.jsx -t 'rejection dialog'`
Expected: PASS, 3 tests. The queue-row test still fails — Task 11 supplies the Tasks panel it reads.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin tests/unit/admin-queues.test.jsx
git commit -m "Build the row and the rejection dialog every queue shares"
```

---

### Task 11: Tasks — the order queue

**Files:**
- Create: `src/app/admin/panels/Tasks.jsx`
- Modify: `src/App.jsx`, `tests/unit/admin-queues.test.jsx`

**Interfaces:**
- Consumes: `QueueRow`, `RowFact` (Task 10); `useAdmin()` → `orders`, `approveReturn`, `approveCancellation`, `markShipped`; `usd`, `credit`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-queues.test.jsx`:

```jsx
describe('Tasks', () => {
  test('it lists only the orders waiting on someone', () => {
    go('/me/admin/tasks');
    const waiting = admin.orders.filter((o) => o.needs);
    expect(screen.getAllByTestId('queue-row')).toHaveLength(waiting.length);
  });

  test('an order that needs shipping offers Mark shipped, and taking it clears the row', async () => {
    const user = userEvent.setup();
    go('/me/admin/tasks');
    const before = screen.getAllByTestId('queue-row').length;
    const target = admin.orders.find((o) => o.needs === 'shipping');
    const row = screen.getByText(target.order_no).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    await user.click(within(row).getByRole('button', { name: 'Mark shipped' }));
    expect(screen.getByText(/Marked shipped/)).toBeInTheDocument();
    expect(screen.getAllByTestId('queue-row')).toHaveLength(before - 1);
  });

  test('a return offers Approve return and nothing else', async () => {
    const user = userEvent.setup();
    go('/me/admin/tasks');
    const target = admin.orders.find((o) => o.needs === 'return');
    const row = screen.getByText(target.order_no).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByRole('button', { name: 'Approve return' })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Mark shipped' })).toBeNull();
  });

  test('the expanded row shows the shipping email and the line items', async () => {
    const user = userEvent.setup();
    go('/me/admin/tasks');
    const target = admin.orders.find((o) => o.needs);
    const row = screen.getByText(target.order_no).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByText(target.shipping_email)).toBeInTheDocument();
    expect(within(row).getByText(new RegExp(target.items[0].name))).toBeInTheDocument();
  });

  test('credits on an order never read as a bare number', async () => {
    const user = userEvent.setup();
    go('/me/admin/tasks');
    const target = admin.orders.find((o) => o.needs && o.credits_used > 0);
    const row = screen.getByText(target.order_no).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByText(/credit · \$/)).toBeInTheDocument();
  });
});
```

Add `within` to the `@testing-library/react` import.

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-queues.test.jsx -t 'Tasks'`
Expected: FAIL — the route renders `NotBuilt`.

- [ ] **Step 3: Write the panel**

Create `src/app/admin/panels/Tasks.jsx`:

```jsx
import { useState } from 'react';
import { Button } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { useAdmin } from '../store.jsx';
import { usd, credit } from '../../parts/Money.jsx';

// Orders waiting on someone. `needs` is what the order is waiting for, and it
// decides which action the row offers — a return does not offer Mark shipped.
const ACTION = {
  return: { label: 'Approve return', key: 'approveReturn' },
  cancellation: { label: 'Approve cancellation', key: 'approveCancellation' },
  shipping: { label: 'Mark shipped', key: 'markShipped' },
};

export default function Tasks() {
  const store = useAdmin();
  const [open, setOpen] = useState(null);
  const waiting = store.orders.filter((o) => o.needs);

  if (!waiting.length) {
    return <p className="adm__queue-empty">Nothing waiting. The queue is clear.</p>;
  }

  return (
    <div>
      {waiting.map((o) => {
        const action = ACTION[o.needs];
        return (
          <QueueRow
            key={o.id}
            title={o.order_no}
            meta={`${o.full_name} · ${usd(o.cash_paid)} · ${o.created_at}`}
            status={o.needs}
            open={open === o.id}
            onToggle={() => setOpen(open === o.id ? null : o.id)}
            actions={<Button onClick={() => store[action.key](o.id)}>{action.label}</Button>}
          >
            <RowFact label="Ships to" value={o.shipping_email} />
            <RowFact label="Status" value={o.status} />
            {o.credits_used > 0 && <RowFact label="Credits" value={credit(o.credits_used)} />}
            <RowFact
              label="Items"
              value={o.items.map((i) => `${i.quantity}× ${i.name} (${i.brand})`).join(', ')}
            />
          </QueueRow>
        );
      })}
    </div>
  );
}
```

Point the `tasks` route at it.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/admin-queues.test.jsx`
Expected: PASS — the 3 dialog tests, the queue-row test, and 5 Tasks tests.

- [ ] **Step 5: Screenshot it**

Screenshot `/me/admin/tasks` at 320 and 390, collapsed and with a row open. Check that the `Items` fact wraps rather than pushing the row wide, and that the badge does not collide with the title.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin src/App.jsx tests/unit/admin-queues.test.jsx
git commit -m "Work the order queue: returns, cancellations, shipping"
```

---

### Task 12: UGC review

**Files:**
- Create: `src/app/admin/panels/Ugc.jsx`
- Modify: `src/App.jsx`, `tests/unit/admin-queues.test.jsx`, `src/app/admin/admin.css`

**Interfaces:**
- Consumes: `QueueRow`, `RowFact`, `RejectDialog`; `useAdmin()` → `ugcSubmissions`, `approveUgc`, `rejectUgc`; the app's existing `FilterChips` part.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-queues.test.jsx`:

```jsx
describe('UGC review', () => {
  test('the status filter narrows the list and counts each state', async () => {
    const user = userEvent.setup();
    go('/me/admin/ugc');
    expect(screen.getAllByTestId('queue-row')).toHaveLength(admin.ugc_submissions.length);
    await user.click(screen.getByRole('button', { name: /^Pending/ }));
    const pending = admin.ugc_submissions.filter((s) => s.status === 'pending');
    expect(screen.getAllByTestId('queue-row')).toHaveLength(pending.length);
  });

  test('approving releases the reward and moves the row out of Pending', async () => {
    const user = userEvent.setup();
    go('/me/admin/ugc');
    const target = admin.ugc_submissions.find((s) => s.status === 'submitted');
    const row = screen.getByText(target.mission_title).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    await user.click(within(row).getByRole('button', { name: 'Approve' }));
    expect(screen.getByText(/UGC approved/)).toBeInTheDocument();
  });

  test('rejecting demands a reason, then records it', async () => {
    const user = userEvent.setup();
    go('/me/admin/ugc');
    const target = admin.ugc_submissions.find((s) => s.status === 'submitted');
    const row = screen.getByText(target.mission_title).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(screen.getByText(/Say why/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reason'), 'Brand tag is missing.');
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(screen.getByText(/UGC rejected/)).toBeInTheDocument();
  });

  test('a submission link goes to example.com, never a real platform', async () => {
    const user = userEvent.setup();
    go('/me/admin/ugc');
    const target = admin.ugc_submissions.find((s) => s.ugc_link);
    const row = screen.getByText(target.mission_title).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    const link = within(row).getByRole('link', { name: /View the post/ });
    expect(link).toHaveAttribute('href', target.ugc_link);
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  test('a submission with no link says so instead of offering a dead one', async () => {
    const user = userEvent.setup();
    go('/me/admin/ugc');
    const target = admin.ugc_submissions.find((s) => !s.ugc_link);
    const row = screen.getByText(target.mission_title).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByText(/No link yet/)).toBeInTheDocument();
    expect(within(row).queryByRole('link', { name: /View the post/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-queues.test.jsx -t 'UGC review'`
Expected: FAIL — the route renders `NotBuilt`.

- [ ] **Step 3: Write the panel**

Create `src/app/admin/panels/Ugc.jsx`:

```jsx
import { useState } from 'react';
import { Button } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { usd, credit } from '../../parts/Money.jsx';

const FILTERS = ['All', 'Pending', 'Submitted', 'Approved', 'Rejected'];

export default function Ugc() {
  const store = useAdmin();
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const rows = store.ugcSubmissions.filter(
    (s) => filter === 'All' || s.status === filter.toLowerCase(),
  );
  const countFor = (f) =>
    f === 'All'
      ? store.ugcSubmissions.length
      : store.ugcSubmissions.filter((s) => s.status === f.toLowerCase()).length;

  return (
    <div>
      <div className="adm__chips" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`adm__chip${f === filter ? ' is-on' : ''}`}
            aria-pressed={f === filter}
            onClick={() => setFilter(f)}
          >
            {f} <span className="adm__chip-n">{countFor(f)}</span>
          </button>
        ))}
      </div>

      {!rows.length && <p className="adm__queue-empty">Nothing in this state.</p>}

      {rows.map((s) => {
        const settled = s.status === 'approved' || s.status === 'rejected';
        return (
          <QueueRow
            key={s.id}
            title={s.mission_title}
            meta={`${s.full_name} · ${s.platform} · ${s.created_at}`}
            status={s.status}
            open={open === s.id}
            onToggle={() => setOpen(open === s.id ? null : s.id)}
            actions={settled ? null : (
              <>
                <Button onClick={() => store.approveUgc(s.id)}>Approve</Button>
                <Button variant="secondary" onClick={() => setRejecting(s.id)}>Reject</Button>
              </>
            )}
          >
            {s.reward_cash > 0 && <RowFact label="Cash" value={usd(s.reward_cash)} />}
            {s.reward_credits > 0 && <RowFact label="Credits" value={credit(s.reward_credits)} />}
            <RowFact label="XP" value={`+${s.xp_reward} XP`} />
            <RowFact
              label="Post"
              value={s.ugc_link ? (
                /* The fixture points at example.com on purpose — a fixture that
                   links to a real profile publishes a real person. */
                <a href={s.ugc_link} target="_blank" rel="noopener noreferrer">View the post</a>
              ) : 'No link yet'}
            />
            {s.notes && <RowFact label="Notes" value={s.notes} />}
            {s.reject_reason && <RowFact label="Rejected for" value={s.reject_reason} />}
          </QueueRow>
        );
      })}

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject UGC submission"
        placeholder="e.g. Missing brand tag, poor lighting, or the link is private"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectUgc(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
```

Point the `ugc` route at it.

- [ ] **Step 4: Style the chips**

Add to `admin.css`:

```css
.adm__chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -16px 16px;
  padding: 2px 16px 4px;
}
.adm__chips::-webkit-scrollbar { display: none; }
.adm .adm__chip {
  flex: none;
  min-height: 44px;
  padding: 0 13px;
  border: 1.5px solid var(--gray-300);
  border-radius: var(--radius-pill);
  background: var(--gray-0);
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
}
.adm .adm__chip.is-on { border-color: var(--ink-900); background: var(--ink-900); color: var(--gray-0); }
.adm__chip-n { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/unit/admin-queues.test.jsx`
Expected: PASS, all Tasks and UGC tests.

- [ ] **Step 6: Screenshot and commit**

Screenshot `/me/admin/ugc` at 320 with a row open. Check the chips scroll and the reward facts do not wrap mid-figure.

```bash
git add src/app/admin src/App.jsx tests/unit/admin-queues.test.jsx
git commit -m "Review UGC: filter by state, approve, or reject with a reason"
```

---

### Task 13: Physical gigs

**Files:**
- Create: `src/app/admin/panels/Gigs.jsx`
- Modify: `src/App.jsx`, `tests/unit/admin-queues.test.jsx`

**Interfaces:**
- Consumes: `QueueRow`, `RowFact`, `RejectDialog`; `useAdmin()` → `gigApplications`, `approveGig`, `rejectGig`, `completeGig`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-queues.test.jsx`:

```jsx
describe('Physical gigs', () => {
  test('a pending applicant can be approved or rejected', async () => {
    const user = userEvent.setup();
    go('/me/admin/gigs');
    const target = admin.gig_applications.find((g) => g.status === 'pending');
    const row = screen.getByText(target.gig_title).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Mark complete' })).toBeNull();
  });

  test('an approved applicant can be marked complete, not approved twice', async () => {
    const user = userEvent.setup();
    go('/me/admin/gigs');
    const target = admin.gig_applications.find((g) => g.status === 'approved');
    const row = screen.getByText(target.gig_title).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).queryByRole('button', { name: 'Approve' })).toBeNull();
    await user.click(within(row).getByRole('button', { name: 'Mark complete' }));
    expect(screen.getByText(/Gig complete/)).toBeInTheDocument();
  });

  test('the row carries the contact details a lead needs on the day', async () => {
    const user = userEvent.setup();
    go('/me/admin/gigs');
    const target = admin.gig_applications[0];
    const row = screen.getByText(target.gig_title).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByText(target.phone)).toBeInTheDocument();
    expect(within(row).getByText(target.email)).toBeInTheDocument();
    expect(within(row).getByText(target.location)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-queues.test.jsx -t 'Physical gigs'`
Expected: FAIL — the route renders `NotBuilt`.

- [ ] **Step 3: Write the panel**

Create `src/app/admin/panels/Gigs.jsx`:

```jsx
import { useState } from 'react';
import { Button } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { usd, credit } from '../../parts/Money.jsx';

// Applicants for field work. The actions follow the status: pending decides
// yes or no, approved has one more step (the shift actually happened), and a
// settled row offers nothing.
export default function Gigs() {
  const store = useAdmin();
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  return (
    <div>
      {!store.gigApplications.length && <p className="adm__queue-empty">No applicants yet.</p>}

      {store.gigApplications.map((g) => (
        <QueueRow
          key={g.id}
          title={g.gig_title}
          meta={`${g.full_name} · ${g.gig_date}`}
          status={g.status}
          open={open === g.id}
          onToggle={() => setOpen(open === g.id ? null : g.id)}
          actions={(
            <>
              {g.status === 'pending' && (
                <>
                  <Button onClick={() => store.approveGig(g.id)}>Approve</Button>
                  <Button variant="secondary" onClick={() => setRejecting(g.id)}>Reject</Button>
                </>
              )}
              {g.status === 'approved' && (
                <Button onClick={() => store.completeGig(g.id)}>Mark complete</Button>
              )}
            </>
          )}
        >
          <RowFact label="Phone" value={g.phone} />
          <RowFact label="Email" value={g.email} />
          <RowFact label="Where" value={g.location} />
          <RowFact label="Cash" value={usd(g.reward_cash)} />
          {g.reward_credits > 0 && <RowFact label="Credits" value={credit(g.reward_credits)} />}
          {g.reject_reason && <RowFact label="Rejected for" value={g.reject_reason} />}
        </QueueRow>
      ))}

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject physical gig"
        placeholder="e.g. The shift is already covered"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectGig(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
```

Point the `gigs` route at it.

- [ ] **Step 4: Run, screenshot, commit**

Run: `npx vitest run tests/unit/admin-queues.test.jsx` — expected PASS.
Screenshot `/me/admin/gigs` at 320 with a row open.

```bash
git add src/app/admin src/App.jsx tests/unit/admin-queues.test.jsx
git commit -m "Approve, reject and close out physical gig applicants"
```

---

### Task 14: Events

**Files:**
- Create: `src/app/admin/panels/Events.jsx`
- Modify: `src/App.jsx`, `tests/unit/admin-queues.test.jsx`, `src/app/admin/admin.css`

**Interfaces:**
- Consumes: `QueueRow`, `RowFact`; `useAdmin()` → `eventApplications`, `approveEventApp`, `declineEventApp`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-queues.test.jsx`:

```jsx
describe('Events', () => {
  test('applicants are grouped under their event, each group named once', () => {
    go('/me/admin/events');
    const events = [...new Set(admin.event_applications.map((a) => a.event_title))];
    for (const title of events) {
      expect(screen.getAllByRole('heading', { name: title })).toHaveLength(1);
    }
  });

  test('a row shows the campus and the tier', async () => {
    const user = userEvent.setup();
    go('/me/admin/events');
    const target = admin.event_applications[0];
    const row = screen.getByText(target.full_name).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByText(target.campus)).toBeInTheDocument();
    expect(within(row).getByText(target.tier)).toBeInTheDocument();
  });

  test('declining an applicant frees the seat and says so', async () => {
    const user = userEvent.setup();
    go('/me/admin/events');
    const target = admin.event_applications.find((a) => a.status === 'pending');
    const row = screen.getByText(target.full_name).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    await user.click(within(row).getByRole('button', { name: 'Decline' }));
    expect(screen.getByText(/Applicant declined/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-queues.test.jsx -t 'Events'`
Expected: FAIL — the route renders `NotBuilt`.

- [ ] **Step 3: Write the panel**

Create `src/app/admin/panels/Events.jsx`:

```jsx
import { useState } from 'react';
import { Button } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { useAdmin } from '../store.jsx';

// Grouped by event, because a lead works one door list at a time. The group
// heading names the event once; the rows below it are people.
export default function Events() {
  const store = useAdmin();
  const [open, setOpen] = useState(null);

  const groups = store.eventApplications.reduce((map, a) => {
    if (!map.has(a.event_title)) map.set(a.event_title, []);
    map.get(a.event_title).push(a);
    return map;
  }, new Map());

  if (!groups.size) return <p className="adm__queue-empty">No applicants yet.</p>;

  return (
    <div>
      {[...groups.entries()].map(([title, people]) => (
        <section key={title} className="adm-grp">
          <h2 className="adm-grp__title">{title}</h2>
          {people.map((a) => (
            <QueueRow
              key={a.id}
              title={a.full_name}
              meta={a.campus}
              status={a.status}
              open={open === a.id}
              onToggle={() => setOpen(open === a.id ? null : a.id)}
              actions={a.status === 'pending' ? (
                <>
                  <Button onClick={() => store.approveEventApp(a.id)}>Approve</Button>
                  <Button variant="secondary" onClick={() => store.declineEventApp(a.id)}>Decline</Button>
                </>
              ) : null}
            >
              <RowFact label="Campus" value={a.campus} />
              <RowFact label="Tier" value={a.tier} />
            </QueueRow>
          ))}
        </section>
      ))}
    </div>
  );
}
```

Point the `events` route at it. Note the campus appears both as the row's `meta` and as a fact — the test uses `getByText` on the expanded row, so render the meta value and the fact value in different elements (they are) and keep the assertion scoped to the row.

Add to `admin.css`:

```css
.adm-grp { margin-bottom: 26px; }
.adm-grp__title {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
```

- [ ] **Step 4: Run, screenshot, commit**

Run: `npx vitest run tests/unit/admin-queues.test.jsx` — expected PASS. If the campus assertion is ambiguous because `meta` and the fact both match, tighten the test to `within(row).getAllByText(target.campus).length` ≥ 1 rather than changing the markup.

Screenshot `/me/admin/events` at 320.

```bash
git add src/app/admin src/App.jsx tests/unit/admin-queues.test.jsx
git commit -m "Work the door lists: approve or decline event applicants"
```

---

### Task 15: Withdrawals

**Files:**
- Create: `src/app/admin/panels/Withdrawals.jsx`
- Modify: `src/App.jsx`, `tests/unit/admin-queues.test.jsx`

**Interfaces:**
- Consumes: `QueueRow`, `RowFact`, `RejectDialog`; `useAdmin()` → `w9Submissions`, `withdrawals`, `verifyW9`, `completePayout`, `rejectPayout`; `usdExact`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-queues.test.jsx`:

```jsx
describe('Withdrawals', () => {
  test('two sections: W-9 verification and payouts', () => {
    go('/me/admin/withdrawals');
    expect(screen.getByRole('heading', { name: /W-9 verification/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Payouts/ })).toBeInTheDocument();
  });

  test('an unverified W-9 can be marked verified; a verified one cannot again', async () => {
    const user = userEvent.setup();
    go('/me/admin/withdrawals');
    const pending = admin.w9_submissions.find((w) => !w.verified);
    const row = screen.getAllByTestId('w9-row').find((r) => r.textContent.includes(pending.full_name));
    await user.click(within(row).getByRole('button', { name: 'Mark verified' }));
    expect(screen.getByText(/W-9 verified/)).toBeInTheDocument();
  });

  test('the W-9 row does not offer a document link there is no document for', () => {
    go('/me/admin/withdrawals');
    const row = screen.getAllByTestId('w9-row')[0];
    expect(within(row).getByText(/document not in this preview/i)).toBeInTheDocument();
    expect(within(row).queryByRole('link')).toBeNull();
  });

  test('a payout shows amount, fee and net, each to the cent', async () => {
    const user = userEvent.setup();
    go('/me/admin/withdrawals');
    const target = admin.withdrawals.find((w) => w.status === 'pending');
    const row = screen.getByText(target.method, { exact: false }).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByText('$180.00')).toBeInTheDocument();
    expect(within(row).getByText('$3.60')).toBeInTheDocument();
    expect(within(row).getByText('$176.40')).toBeInTheDocument();
  });

  test('rejecting a payout demands a reason', async () => {
    const user = userEvent.setup();
    go('/me/admin/withdrawals');
    const target = admin.withdrawals.find((w) => w.status === 'pending');
    const row = screen.getByText(target.full_name).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    await user.click(within(row).getByRole('button', { name: 'Reject' }));
    await user.type(screen.getByLabelText('Reason'), 'Account details do not match the W-9.');
    await user.click(screen.getByRole('button', { name: /Reject & notify/ }));
    expect(screen.getByText(/Payout rejected/)).toBeInTheDocument();
  });
});
```

The `$180.00` figures come from fixture row `wd1`; if that row changes, change these numbers with it.

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-queues.test.jsx -t 'Withdrawals'`
Expected: FAIL — the route renders `NotBuilt`.

- [ ] **Step 3: Write the panel**

Create `src/app/admin/panels/Withdrawals.jsx`:

```jsx
import { useState } from 'react';
import { Badge, Button, Card } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { usdExact } from '../../parts/Money.jsx';

// Money leaving the platform, in the order it has to be checked: the W-9 is
// verified first, then the payout is released.
//
// The reference opens a stored W-9 PDF in a new tab. There is no storage here,
// so the row says so rather than offering a link that goes nowhere.
export default function Withdrawals() {
  const store = useAdmin();
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  return (
    <div>
      <section className="adm-grp">
        <h2 className="adm-grp__title">W-9 verification</h2>
        {store.w9Submissions.map((w) => (
          <Card variant="flat" className="adm-row" key={w.id} data-testid="w9-row">
            <div className="adm-w9">
              <div className="adm-row__mid">
                <span className="adm-row__title">{w.full_name}</span>
                <span className="adm-row__meta">
                  Submitted {w.w9_submitted_at} · document not in this preview
                </span>
              </div>
              {w.verified
                ? <Badge tone="success" tilt={0}>verified</Badge>
                : <Button onClick={() => store.verifyW9(w.id)}>Mark verified</Button>}
            </div>
          </Card>
        ))}
      </section>

      <section className="adm-grp">
        <h2 className="adm-grp__title">Payouts</h2>
        {store.withdrawals.map((w) => (
          <QueueRow
            key={w.id}
            title={w.full_name}
            meta={`${w.method} · ${usdExact(w.net_amount)} net`}
            status={w.status}
            open={open === w.id}
            onToggle={() => setOpen(open === w.id ? null : w.id)}
            actions={w.status === 'pending' ? (
              <>
                <Button onClick={() => store.completePayout(w.id)}>Mark completed</Button>
                <Button variant="secondary" onClick={() => setRejecting(w.id)}>Reject</Button>
              </>
            ) : null}
          >
            <RowFact label="Amount" value={usdExact(w.amount)} />
            <RowFact label="Fee" value={usdExact(w.fee)} />
            <RowFact label="Net" value={usdExact(w.net_amount)} />
            <RowFact label="Method" value={`${w.method} · ${w.account_info}`} />
            {w.reject_reason && <RowFact label="Rejected for" value={w.reject_reason} />}
          </QueueRow>
        ))}
      </section>

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject payout"
        placeholder="e.g. Account details do not match the W-9"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectPayout(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
```

Point the `withdrawals` route at it. Add to `admin.css`:

```css
.adm-w9 { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
```

`usdExact` renders two decimals always, which is what a ledger column needs — `$40.00` over `$25.00` aligns where `$40` over `$25.00` does not.

- [ ] **Step 4: Run the whole unit suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Screenshot and commit**

Screenshot `/me/admin/withdrawals` at 320 with a payout open. Check the amount/fee/net column aligns and the W-9 button clears 44px.

```bash
git add src/app/admin src/App.jsx tests/unit/admin-queues.test.jsx
git commit -m "Verify W-9s and release the payouts behind them"
```

**Phase 2 is complete here.** Stop for review before Phase 3.

---

# Phase 3 — The three editors

These three write rather than triage. All three go in one test file.

### Task 16: Campuses

**Files:**
- Create: `src/app/admin/panels/Campuses.jsx`
- Create: `tests/unit/admin-editors.test.jsx`
- Modify: `src/App.jsx`, `src/app/admin/admin.css`

**Interfaces:**
- Consumes: `useAdmin()` → `campuses`, `addCampus`, `updateCampus`, `removeCampus`; `Button`, `Card`, `Dialog`, `Input`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin-editors.test.jsx`:

```jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import admin from '../../src/data/admin.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const go = (path) => { sessionStorage.clear(); setUnlocked(true); at(path); };

describe('Campuses', () => {
  test('every school in the fixture is listed with its student count', () => {
    go('/me/admin/campuses');
    for (const c of admin.campuses) {
      const row = screen.getByText(c.name).closest('[data-testid="campus-row"]');
      expect(within(row).getByText(String(c.student_count), { exact: false })).toBeInTheDocument();
    }
  });

  test('Add school will not save without a name', async () => {
    const user = userEvent.setup();
    go('/me/admin/campuses');
    await user.click(screen.getByRole('button', { name: 'Add school' }));
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    await user.type(screen.getByLabelText('Name'), 'Rice');
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  test('a new school joins the list', async () => {
    const user = userEvent.setup();
    go('/me/admin/campuses');
    const before = screen.getAllByTestId('campus-row').length;
    await user.click(screen.getByRole('button', { name: 'Add school' }));
    await user.type(screen.getByLabelText('Name'), 'Rice');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getAllByTestId('campus-row')).toHaveLength(before + 1);
    expect(screen.getByText('Rice')).toBeInTheDocument();
  });

  test('removing a school takes it out', async () => {
    const user = userEvent.setup();
    go('/me/admin/campuses');
    const before = screen.getAllByTestId('campus-row').length;
    const row = screen.getByText(admin.campuses[0].name).closest('[data-testid="campus-row"]');
    await user.click(within(row).getByRole('button', { name: /Remove/ }));
    expect(screen.getAllByTestId('campus-row')).toHaveLength(before - 1);
  });

  test('the colour is shown as a swatch, never as the only way to tell schools apart', () => {
    go('/me/admin/campuses');
    const row = screen.getByText(admin.campuses[0].name).closest('[data-testid="campus-row"]');
    const swatch = row.querySelector('.adm-cmp__dot');
    expect(swatch).toBeTruthy();
    expect(swatch).toHaveAttribute('aria-hidden', 'true');
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-editors.test.jsx`
Expected: FAIL — the route renders `NotBuilt`.

- [ ] **Step 3: Write the panel**

Create `src/app/admin/panels/Campuses.jsx`:

```jsx
import { useState } from 'react';
import { Button, Card, Dialog, Input } from 'axelerate-design-system';
import { useAdmin } from '../store.jsx';

// The school list. Colour is decoration here — the name is what tells two
// schools apart — so the swatch is aria-hidden and never the only signal.
const BLANK = { name: '', primary_color: '#6E2BEE', logo_url: '' };

export default function Campuses() {
  const store = useAdmin();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(BLANK);

  const close = () => { setAdding(false); setDraft(BLANK); };
  const create = () => {
    if (!draft.name.trim()) return;
    store.addCampus({ ...draft, name: draft.name.trim() });
    close();
  };

  return (
    <div>
      <div className="adm-cmp__top">
        <Button onClick={() => setAdding(true)}>Add school</Button>
      </div>

      {store.campuses.map((c) => (
        <Card variant="flat" className="adm-row" key={c.id} data-testid="campus-row">
          <div className="adm-cmp__row">
            <span className="adm-cmp__dot" aria-hidden="true" style={{ background: c.primary_color }} />
            <div className="adm-row__mid">
              <span className="adm-row__title">{c.name}</span>
              <span className="adm-row__meta">{c.student_count} students</span>
            </div>
            <Button variant="ghost" onClick={() => store.removeCampus(c.id)}>Remove</Button>
          </div>
        </Card>
      ))}

      <Dialog
        open={adding}
        onClose={close}
        title="Add school"
        width={400}
        footer={(
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button disabled={!draft.name.trim()} onClick={create}>Create</Button>
          </>
        )}
      >
        <div className="adm-cmp__form">
          <Input
            label="Name"
            value={draft.name}
            placeholder="e.g. University of Virginia"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            label="Primary colour"
            value={draft.primary_color}
            onChange={(e) => setDraft({ ...draft, primary_color: e.target.value })}
          />
          <Input
            label="Logo URL"
            value={draft.logo_url}
            onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })}
          />
        </div>
      </Dialog>
    </div>
  );
}
```

No `hint` on any of the three fields — that is the rule, and none of them needs one.

Point the `campuses` route at it. Add to `admin.css`:

```css
.adm-cmp__top { margin-bottom: 16px; }
.adm-cmp__row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.adm-cmp__dot {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 56% 44% 52% 48% / 48% 52% 44% 56%;
  box-shadow: inset 0 0 0 1.5px rgba(23, 16, 41, 0.1);
}
.adm-cmp__form { display: flex; flex-direction: column; gap: 14px; }
```

- [ ] **Step 4: Run, screenshot, commit**

Run: `npx vitest run tests/unit/admin-editors.test.jsx` — expected PASS, 5 tests.
Screenshot `/me/admin/campuses` at 320 and with the dialog open.

```bash
git add src/app/admin src/App.jsx tests/unit/admin-editors.test.jsx
git commit -m "Keep the school list, and let a lead add one"
```

---

### Task 17: Career

**Files:**
- Create: `src/app/admin/panels/Career.jsx`
- Modify: `src/App.jsx`, `tests/unit/admin-editors.test.jsx`, `src/app/admin/admin.css`

**Interfaces:**
- Consumes: `QueueRow`, `RowFact`, `RejectDialog`; `useAdmin()` → `careerClaims`, `careerRoles`, `careerPathways`, `approveClaim`, `rejectClaim`, `setClaimCertificate`, `saveRole`, `savePathway`.

**Note:** the reference's career panel carries the claim queue plus two editable lists whose subject the minified bundle does not reveal. They are implemented as **roles** and **pathways**; if the owner names them differently, only the headings and the fixture keys change.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-editors.test.jsx`:

```jsx
describe('Career', () => {
  test('the claim queue comes first, then the two lists', () => {
    go('/me/admin/career');
    const heads = [...document.querySelectorAll('.adm-grp__title')].map((h) => h.textContent);
    expect(heads).toEqual(['Certificate claims', 'Roles', 'Pathways']);
  });

  test('a claim shows what it is for and when it was claimed', async () => {
    const user = userEvent.setup();
    go('/me/admin/career');
    const target = admin.career_claims[0];
    const row = screen.getByText(target.full_name).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByText(target.reward_summary)).toBeInTheDocument();
    expect(within(row).getByText(target.claimed_at, { exact: false })).toBeInTheDocument();
  });

  test('choosing a certificate records its name and nothing else', async () => {
    const user = userEvent.setup();
    go('/me/admin/career');
    const target = admin.career_claims[0];
    const row = screen.getByText(target.full_name).closest('[data-testid="queue-row"]');
    await user.click(row.querySelector('.adm-row__head'));
    const file = new File(['x'], 'insider-cert.pdf', { type: 'application/pdf' });
    await user.upload(within(row).getByLabelText(/Certificate/), file);
    expect(within(row).getByText('insider-cert.pdf')).toBeInTheDocument();
    expect(within(row).getByText(/filename only/i)).toBeInTheDocument();
  });

  test('a role can be renamed and saved', async () => {
    const user = userEvent.setup();
    go('/me/admin/career');
    const field = screen.getByLabelText(`Role: ${admin.career_roles[0].name}`);
    await user.clear(field);
    await user.type(field, 'Regional lead');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    expect(screen.getByText(/Role saved/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-editors.test.jsx -t 'Career'`
Expected: FAIL — the route renders `NotBuilt`.

- [ ] **Step 3: Write the panel**

Create `src/app/admin/panels/Career.jsx`:

```jsx
import { useState } from 'react';
import { Button, Input } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';

// Certificate claims, then the two lists the reference keeps under them.
//
// The upload records the file's NAME and nothing else — there is no storage
// here, and a control that looks like it uploaded something when it did not is
// the kind of lie this app does not tell. The row says so.
export default function Career() {
  const store = useAdmin();
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [roleDraft, setRoleDraft] = useState({});

  const roleValue = (r) => (roleDraft[r.id] ?? r.name);

  return (
    <div>
      <section className="adm-grp">
        <h2 className="adm-grp__title">Certificate claims</h2>
        {store.careerClaims.map((c) => (
          <QueueRow
            key={c.id}
            title={c.full_name}
            meta={`Claimed ${c.claimed_at}`}
            status={c.status}
            open={open === c.id}
            onToggle={() => setOpen(open === c.id ? null : c.id)}
            actions={c.status === 'pending' ? (
              <>
                <Button onClick={() => store.approveClaim(c.id)}>Approve</Button>
                <Button variant="secondary" onClick={() => setRejecting(c.id)}>Reject</Button>
              </>
            ) : null}
          >
            <RowFact label="For" value={c.reward_summary} />
            <RowFact label="Key" value={c.reward_key} />
            <RowFact label="Claimed" value={c.claimed_at} />
            <p className="adm-car__file">
              <label className="adm-car__file-label" htmlFor={`cert-${c.id}`}>
                Certificate
              </label>
              <input
                id={`cert-${c.id}`}
                className="adm-car__file-input"
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => store.setClaimCertificate(c.id, e.target.files?.[0]?.name ?? '')}
              />
              <span className="adm-car__file-name">
                {c.certificate_name || 'Nothing chosen'}
              </span>
              <span className="adm-car__file-note">
                Filename only — this preview stores no file.
              </span>
            </p>
            {c.reject_reason && <RowFact label="Rejected for" value={c.reject_reason} />}
          </QueueRow>
        ))}
      </section>

      <section className="adm-grp">
        <h2 className="adm-grp__title">Roles</h2>
        {store.careerRoles.map((r) => (
          <div className="adm-car__edit" key={r.id}>
            <Input
              label={`Role: ${r.name}`}
              value={roleValue(r)}
              onChange={(e) => setRoleDraft({ ...roleDraft, [r.id]: e.target.value })}
            />
            <Button onClick={() => store.saveRole(r.id, roleValue(r))}>Save</Button>
          </div>
        ))}
      </section>

      <section className="adm-grp">
        <h2 className="adm-grp__title">Pathways</h2>
        {store.careerPathways.map((p) => (
          <div className="adm-car__path" key={p.id}>
            <p className="adm-row__title">{p.title}</p>
            <p className="adm-row__meta">{p.blurb}</p>
          </div>
        ))}
      </section>

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject certificate claim"
        placeholder="e.g. The mission count does not match the tier"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectClaim(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
```

The `Input` label carries the role's current name so each field has a unique accessible name — three fields all labelled "Role" would be three fields a screen reader cannot tell apart, and `getByLabelText` could not find one either.

Point the `career` route at it. Add to `admin.css`:

```css
.adm-car__file { display: flex; flex-direction: column; gap: 6px; margin: 14px 0 0; }
.adm-car__file-label {
  font-family: var(--font-label);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--gray-600);
}
.adm .adm-car__file-input { font-size: 13px; color: var(--text-primary); }
.adm-car__file-name { font-size: 13.5px; color: var(--text-primary); }
.adm-car__file-note { font-family: var(--font-hand); font-size: 16px; color: var(--gray-600); }

.adm-car__edit { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 14px; }
.adm-car__edit > *:first-child { flex: 1; min-width: 0; }
.adm-car__path { margin-bottom: 14px; }
```

- [ ] **Step 4: Run, screenshot, commit**

Run: `npx vitest run tests/unit/admin-editors.test.jsx` — expected PASS.
Screenshot `/me/admin/career` at 320 with a claim open. Check the Save button and the field sit on one line without the button shrinking below 44px — if it does, stack them at that width.

```bash
git add src/app/admin src/App.jsx tests/unit/admin-editors.test.jsx
git commit -m "Approve certificate claims, and keep the roles list"
```

---

### Task 18: Cashback %, and the last of the stubs

**Files:**
- Create: `src/app/admin/panels/Cashback.jsx`
- Delete: `src/app/admin/panels/NotBuilt.jsx`
- Modify: `src/App.jsx`, `tests/unit/admin-editors.test.jsx`, `src/app/admin/admin.css`

**Interfaces:**
- Consumes: `useAdmin()` → `cashbackRates`, `setCashbackRate`; `Button`, `Input`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-editors.test.jsx`:

```jsx
describe('Cashback %', () => {
  test('every category is listed with its rate', () => {
    go('/me/admin/cashback');
    for (const r of admin.cashback_rates) {
      expect(screen.getByLabelText(`${r.category} rate`)).toHaveValue(r.pct);
    }
  });

  test('a rate saves and says so', async () => {
    const user = userEvent.setup();
    go('/me/admin/cashback');
    const field = screen.getByLabelText(`${admin.cashback_rates[0].category} rate`);
    await user.clear(field);
    await user.type(field, '25');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    expect(screen.getByText(/Rate saved/)).toBeInTheDocument();
    expect(screen.getByLabelText(`${admin.cashback_rates[0].category} rate`)).toHaveValue(25);
  });

  test('a rate outside 0–100 will not save', async () => {
    const user = userEvent.setup();
    go('/me/admin/cashback');
    const field = screen.getByLabelText(`${admin.cashback_rates[0].category} rate`);
    await user.clear(field);
    await user.type(field, '140');
    expect(screen.getAllByRole('button', { name: 'Save' })[0]).toBeDisabled();
  });
});

describe('no tab is a stub any more', () => {
  test('every one of the nine renders real content', () => {
    for (const slug of ['analytics', 'tasks', 'ugc', 'gigs', 'events', 'withdrawals', 'campuses', 'career', 'cashback']) {
      const view = render(<MemoryRouter initialEntries={[`/me/admin/${slug}`]}><App /></MemoryRouter>);
      expect(view.container.textContent, slug).not.toMatch(/Not built yet/);
      view.unmount();
    }
  });
});
```

The stub test needs the session unlocked; call `setUnlocked(true)` in a `beforeEach` for that block.

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/unit/admin-editors.test.jsx -t 'Cashback'`
Expected: FAIL — the route renders `NotBuilt`.

- [ ] **Step 3: Write the panel**

Create `src/app/admin/panels/Cashback.jsx`:

```jsx
import { useState } from 'react';
import { Button, Input } from 'axelerate-design-system';
import { useAdmin } from '../store.jsx';

// The cashback rate per shop category. A rate is a percentage, so it is
// bounded: 0 to 100, and Save stays disabled outside that. The field carries
// the category in its label so four rate fields have four distinct names.
const ok = (v) => v !== '' && Number(v) >= 0 && Number(v) <= 100;

export default function Cashback() {
  const store = useAdmin();
  const [draft, setDraft] = useState({});
  const valueFor = (r) => (draft[r.id] ?? r.pct);

  return (
    <div>
      {store.cashbackRates.map((r) => (
        <div className="adm-cb__row" key={r.id}>
          <Input
            label={`${r.category} rate`}
            type="number"
            min={0}
            max={100}
            value={valueFor(r)}
            onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })}
          />
          <Button
            disabled={!ok(valueFor(r))}
            onClick={() => store.setCashbackRate(r.id, valueFor(r))}
          >
            Save
          </Button>
        </div>
      ))}
      <p className="adm-cb__note">
        The rate a student sees on a perk. Changing it here changes what the shop promises.
      </p>
    </div>
  );
}
```

Point the `cashback` route at it, then:

```bash
git rm src/app/admin/panels/NotBuilt.jsx
```

and remove its import from `src/App.jsx`. Every route now points at a real panel.

Add to `admin.css`:

```css
.adm-cb__row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 14px; }
.adm-cb__row > *:first-child { flex: 1; min-width: 0; }
.adm-cb__note { margin-top: 18px; font-family: var(--font-hand); font-size: 17px; color: var(--gray-600); }
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS. No test may still reference `NotBuilt`.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/admin src/App.jsx tests/unit/admin-editors.test.jsx
git commit -m "Set the cashback rates, and retire the last stub"
```

---

### Task 19: The whole-console pass

**Files:**
- Modify: whatever the screenshots turn up
- Modify: `README.md`, `PRODUCT.md`

- [ ] **Step 1: Screenshot all nine panels at three widths**

```bash
npm run dev
```

then:

```bash
node --input-type=module -e "
import { chromium } from 'playwright';
const SLUGS = ['analytics','tasks','ugc','gigs','events','withdrawals','campuses','career','cashback'];
const b = await chromium.launch();
for (const w of [320, 390, 520]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.addInitScript(() => sessionStorage.setItem('ax-admin-unlocked', '1'));
  for (const s of SLUGS) {
    await p.goto('http://localhost:5173/me/admin/' + s);
    await p.waitForTimeout(250);
    await p.screenshot({ path: \`shot-\${w}-\${s}.png\`, fullPage: true });
  }
  await p.close();
}
await b.close();
console.log('27 screenshots');
"
```

- [ ] **Step 2: Look at all 27**

For each, check: no horizontal scroll; no label colliding with a figure; no row where a selector's ancestor scope is missing (the symptom is inline spans growing to full column width, or a flex row that never became one); nothing clipped; every button visibly at least 44px tall. Fix what you find, and re-screenshot the ones you touched.

Both layout bugs this repo has shipped were invisible to the unit tests and obvious here. Do not skip this step because the suite is green — that is exactly the condition under which they shipped.

- [ ] **Step 3: Delete the screenshots**

```bash
rm -f shot-*.png admin-shell.png
```

- [ ] **Step 4: Run everything**

```bash
npm test && npm run test:e2e
```

Expected: both PASS. Record the counts in the commit message.

- [ ] **Step 5: Note the console in PRODUCT.md**

Add a short section stating that the admin console exists, that it is drawn in the design system rather than as the enterprise console `PRODUCT.md` excludes, and that its password is a preview lock and not security. Do not amend or soften the "not an enterprise admin" line — nothing in this build contradicts it.

- [ ] **Step 6: File the design-system issue**

Open an issue on `cakkrie/axelerate-design-system` for a `Textarea` component, citing the rejection-reason field and pointing at `.adm-rej__field` in `src/app/admin/admin.css` as the local stand-in to delete once it lands. Record the issue number in the readme's known-issues list beside #1, #2, #3 and #5.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Screenshot the console at every width and document it"
```

---

## Self-review

**Spec coverage.** Every section of the spec maps to a task: §3 gate → Tasks 2–3; §4 routing and shell → Task 4; §5 Analytics → Tasks 6–7; §6 the eight panels → Tasks 10–18, with the textarea decision in Task 10 and the two dead links in Tasks 12 and 15; §7 data and state → Tasks 1 and 5, certificate upload in Task 17; §8 existing-file changes → Tasks 3, 4, 8; §9 testing → every task's test steps, plus Task 9 for e2e and Task 19 for the screenshot pass; §10 out-of-scope → nothing in any task crosses it; §11 sequencing → the three phase boundaries; §12 open items → Task 19 Step 6, and the Task 17 note.

**Placeholders.** None. Every code step carries the code, every test step the assertions, and every command its expected output. Task 17's two lists are an owner-confirmable naming question, stated as such, not a gap in the plan.

**Type consistency.** `useAdmin()`'s returned names are used identically everywhere: `ugcSubmissions`, `gigApplications`, `eventApplications`, `w9Submissions`, `careerClaims`, `careerRoles`, `careerPathways`, `cashbackRates`, `dailyTotals`. Fixture columns stay snake_case in the JSON and in every read (`o.needs`, `s.ugc_link`, `w.net_amount`, `c.reward_key`). `TONES` covers every status any panel passes to `QueueRow`: pending, submitted, approved, complete, delivered, shipped, packed, placed, rejected, declined, plus the three `needs` values Task 11 passes as a status (return, cancellation, shipping). `bucketTotals` returns `{ label, cash_paid, credits_used }` and `Trend` reads `measure` from exactly those two keys.
