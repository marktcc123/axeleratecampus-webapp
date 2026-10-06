# Axelerate website

The public website for Axelerate — paid brand missions for verified college students.
**Shape what's next.**

Fully responsive from 320px to 1280px+, built on
[`axelerate-design-system`](https://github.com/cakkrie/axelerate-design-system) without
editing or forking it.

## Run it

```bash
npm install          # needs git access to the private design-system repo
npm run dev          # http://localhost:5173
npm test             # Vitest unit tests
npm run test:e2e:setup   # once — downloads Chromium for Playwright
npm run test:e2e:guards  # ~4s — the 13 guards that catch real defects
npm run test:e2e     # ~3min — the above plus ~200 overflow permutations
npm run build        # dist/
```

### Run the guards before you push

`npm run test:e2e` takes about three minutes, and roughly 200 of its tests are
one overflow check repeated across every route and width. The tests that
actually catch defects — WCAG contrast, the 44px touch floor, the box-sizing
trap, blurred shadows, chart honesty, the layout guards written after real bugs
shipped — are tagged `@guard` and run in about four seconds:

```bash
npm run test:e2e:guards
```

This exists because the contrast sweep sat near the end of a three-minute run
and twice caught a real problem only after the code was already pushed. Guards
first, then the full suite.

## Deploy

Four things any host needs. The first is the one that bites, because it looks
like someone else's problem until the build dies.

**1. The install step must rewrite git to HTTPS.** npm always writes a GitHub
dependency's `resolved` as `git+ssh://` however the spec is written, and
github.com authenticates the *user* over SSH even for a public repo. A build
container has no key, so a plain `npm ci` stops at "Installing dependencies"
with `Permission denied (publickey)`. Point the host's install command at
**`scripts/ci-install.sh`**, which does the two rewrites and then installs.
`axelerate-design-system` is public, so no token or deploy key is involved.

**2. SPA fallback.** This is a `BrowserRouter` app: every path must be served
`dist/index.html`, or a refresh on `/app/me/admin/analytics` returns 404.

- Vercel — the `rewrites` entry in `vercel.json` (committed)
- Netlify — `public/_redirects` containing `/*  /index.html  200`
- Cloudflare Pages — handled by default
- nginx — `try_files $uri /index.html;`
- Any other host — enable its SPA / history-API fallback

**3. `VITE_ADMIN_PASSWORD`.** Build-time, so it has to be set in the build
environment and a change needs a rebuild to take effect. Unset means the
development default `campus-lead`, which is public in the bundle. See
"Admin console" below for why that is a preview lock and not security.

**4. Node 20 or newer** (`engines`, and `.nvmrc`). Some hosts still default to
18, where the install fails.

Build command `npm run build`, output `dist/` — Vite's defaults.

### Follow-ups

Things to carry forward rather than fix here.

**`/u/*` needs a `noindex` response header — and it and `robots.txt` have to
change together.** Today `public/robots.txt` carries `Disallow: /u/` (and
`/user/`, the path the page had until 2026-09-08, which now only redirects) and
the route sets `<meta name="robots" content="noindex">` while it is mounted. Those
two do not cover for each other: a crawler that obeys the `Disallow` never
fetches the page, so it never reads the meta tag — and would not read an
`X-Robots-Tag` header either. The meta tag is, as shipped, unreachable by any
compliant crawler.

The `Disallow` stays anyway, because it is the half that works. Drop it and a
crawler fetches the page and finds only a tag injected by JavaScript, which
anything that does not run JavaScript ignores: that trades a URL someone can
list for the full indexing of a student's name, campus and level. URL-only is
the smaller exposure, and the only one avoidable without server config.

So this is one atomic change at the host, not two: add `X-Robots-Tag: noindex`
for `/u/*` **and** remove both `Disallow` lines in the same deploy. The header
is only read by a crawler that fetches the page, and the `Disallow` is what
stops it fetching, so either half alone leaves the page less protected than it
is now. On the current host that is a `headers` entry in `vercel.json` beside
the rewrite.

None of this is access control: anyone with the link can read the page.
`tests/unit/robots.test.js` reads the path off `App.jsx` — every route whose
component calls `useNoIndex()` must be disallowed — because the `Disallow` sat
on `/user/` for two weeks after the page moved to `/u/`, guarding a redirect.

**One profile link ships every profile.** `src/data/people.example.json` is a
static client import, so `/user/marktao` puts all eight person records in the
bundle any visitor downloads. The unknown-handle 404 is still the right shape —
it will do real work once a backend answers for one handle at a time — but
today it prevents no enumeration, and it should not be mistaken for a control
that does.

**Two controls hand focus off explicitly instead of dropping it.** The
`See all N` button in `src/app/parts/GuestGrid.jsx` and the `Save me a seat`
button in `src/app/screens/EventDetail.jsx` each render conditionally on their
own state and flip that state on click, so each one unmounts itself the moment
someone activates it — without help, focus falls to `<body>`: a keyboard user
gets dropped at the top of the document, and a screen reader announces nothing
about the content that just appeared. Both now move focus somewhere that says
what happened, synchronously (not `requestAnimationFrame` — jsdom's RAF makes
`toHaveFocus()` assertions flaky, same rule `Nav.jsx`'s `close()` and
`GigsDetail.jsx`'s `closeApply` already followed):

- `See all N` moves focus to the first newly-revealed guest tile, so a
  keyboard user lands at the start of the new content instead of back at the
  top of the screen.
- `Save me a seat` moves focus to the confirmation paragraph (`tabIndex={-1}`)
  that replaces it. That paragraph reads "You're on the list," a different
  string from the seats-left status region beside it (`role="status"`, still
  unchanged) — the two announcements say different things rather than one
  echoing the other.

This said three controls until the applications screen lost its drawer. That
screen now stacks every folder and scrolls, so the toggle that used to unmount
itself — and the `aria-expanded`/`aria-controls` repair it needed — no longer
exists. The count is two because the third control is gone, not because it was
left unfixed.

(Named by control and file, not by line: this note carried line numbers twice
and both times they expired within the same branch that wrote them.)

## How responsiveness works

The design system has no media queries; every token sits on a bare `:root{}`.
`src/styles/responsive.css` is loaded **after** the system's `styles.css` and redefines
nine typographic/spacing tokens across three mobile-first tiers (≤640, 641–1024, ≥1025).
Same specificity, later source order — ours wins. The `lg` tier is the system's own
values, so desktop renders exactly as the system intends.

**The import order in `src/main.jsx` is load-bearing.** A test asserts it.

**No app selector ever targets an `.ax-*` class.** We never restyle a design-system component — its colours, shape, type, and motion are its own. Layout and visibility of *our* elements are ours: `.toast-slot` positions the toast, and `.nav .nav__cta` / `.nav .nav__toggle` show or hide the nav's controls by breakpoint. One trap: the design system injects each component's `<style>` at JS-execution time, *after* our bundled stylesheet, so an app rule at (0,1,0) that competes with an `ax-*` class on the same element loses the tie. Every such rule is scoped under its container to reach (0,2,0) — see the comment at the top of `src/components/shell.css`. Anything that would need more than that is raised against the design-system repo.

## Pages

This is a web app, not a marketing site. Every route below is the app except the
last one: `/user/:handle` is a public page, shown to people who may have no
account, and it is outside the app shell on purpose.

| Route | Shell | What |
| --- | --- | --- |
| `/` | — | The gate: wordmark and one "Sign up / log in" button |
| `/verify` | — | Verification — the 4 steps from product spec §4.3. **UI only, nothing is submitted** |
| `/app/earn` | app | Missions board — quest carousel, format tabs, filter chips, mission rows |
| `/app/earn/:slug` | app | Mission detail. Above the student's level it states its distance instead of offering Apply |
| `/app/earn/events/:id` | app | One open event: when, where, who is going, and a seat |
| `/app/perks` | app | The perks shop — products, cashback, stock, and a live Friday-drop countdown |
| `/app/perks/:id` | app | One product — photo, price, cashback, stock, description, add to cart |
| `/app/cart` | app | The cart — lines with quantity steppers, subtotal, the credit it pays back, and a local checkout |
| `/app/join` | app | The student's own pipeline |
| `/app/me` | app | The hub: identity, XP, wallet folders, and the menu below |
| `/app/me/levels` | app | The five levels and what each opens (R7, R8, R9 live here) |
| `/app/me/wallet` | app | Cash, credit, where payouts land, and a month-grouped ledger |
| `/app/me/orders` | app | Shop orders and their status |
| `/app/me/syndicate` | app | The top tier: distance to it, and what it opens |
| `/app/me/co-creations` | app | Open briefs a member can vote on or submit to |
| `/app/me/events` | app | Coming up and past |
| `/app/me/invite` | app | Invite code, how it works, codes used |
| `/app/me/career` | app | Roles on the Axelerate team |
| `/app/me/settings` | app | Account, notifications, payout method |
| `/app/me/admin/*` | app | The admin console — nine tabs behind a password dialog. See below |
| `/legal/terms` · `/legal/privacy` · `/legal/payouts` | app | Headed drafts; legal text to follow |
| `/user/:handle` | — | Not the app: a student's public profile, link-only, no account needed to read one |

Eighteen screens, four tabs. Me's eight sub-screens are nested under it rather
than promoted, which is how the design routes them.

**The gate is not authentication.** There is no backend to authenticate against, so
typing `/app/earn` walks straight in. It is the shape a sign-in will take, not a lock.

### Admin console

`/app/me/admin/*` — nine tabs behind a password dialog opened from **Admin account**
in the Me hub. Set `VITE_ADMIN_PASSWORD` (see `.env.example`); with nothing set,
the development default `campus-lead` applies.

**The password is not security.** There is no backend, so it is compared in the
browser against a value compiled into the client bundle, and clearing one
`sessionStorage` key walks past it. It exists so the console is not opened by
accident during a demo. `src/app/admin/gate.jsx` is the seam a real Supabase
check replaces.

The queues run on `src/data/admin.example.json`, whose columns are snake_case so
the fixture drops in as a Supabase seed. Actions mutate React state for the
session and a reload restores the fixture — nothing here persists, because
nothing here is real.

**The catalogue is shared with the app.** Brands, missions, board events and
shop products live in one store, `src/app/content.jsx`, mounted above the
router: the console's Brands, Missions, Shop and Events panels write it and the
board, the brand pages and the shop read it, so publishing a mission in the
console puts it on the board on the next render. Everything joins by id —
a mission and a product name their brand with `brandId` and carry no copy of its
name, and the queues name a `mission_slug`, `event_id` or `product_id` — so
renaming a brand or a mission in the console reaches every screen at once.
`useContent()` falls back to the raw fixtures when no provider is above it,
which is what lets a unit test render one screen on its own.

The reference for it is a saved page of a separate Next.js console the owner
supplied: dark, red-accented, 1440px. The ruling was to take its information and
leave its form — see
`.superpowers/specs/2026-08-31-axelerate-admin-console-design.md`.

**Analytics is the one screen in this app that plots.** The design system's
"hand-drawn, never plotted" rule and its ban on pie charts and gridlines govern
the student-facing product, where the job is charm; an operator reading a
dashboard needs density. The owner made that exception deliberately on
2026-08-31 and it is scoped: nothing outside `src/app/admin` plots anything.
The charts are hand-rolled SVG (`parts/LineChart.jsx`, `parts/DonutChart.jsx`),
not a charting dependency.

Two rules the exception did not lift, because neither belongs to the design
system. **One y axis** — both series are denominated in dollars, so a second
scale would invent a crossing point, which is what the reference's dual axis
did. And **no invented denominators** — the donut's centre total is the sum of
its own slices. Campus share uses a *sequential* violet ramp rather than four
categorical hues, because the six-hue accent ramp cannot supply four: coral
against butter is ΔE 0.2 under deuteranopia.

### The marketing site is dormant, not deleted

`src/pages/{LandingPage,ForBrandsPage}.jsx`, `src/sections/*` and
`src/components/{Nav,NavSheet,Footer,MissionCard,ScrollToHash}.jsx` are still in the
repo and still covered by their own tests, but nothing routes to them, so Vite
tree-shakes them out of the bundle. `src/App.jsx` carries the note on how to bring
them back.

The app is a phone-width column (520px, centred) with its own bottom tab bar. The gate
and `/verify` sit outside that shell — no tab bar, because you are not in the app yet.

**There is no app-wide "Preview · example data" marker.** This file claimed one for a
while and no screen ever carried it; a grep on 2026-08-31 found only a stray CSS comment.
Every screen does run on example data and Apply never submits, so a screen that needs to
say so has to say it itself.

Five product-spec requirements are deliberately not built as written: the app's four
tabs supersede the spec's three (§4.2); XP progress uses the design system's
`MarkerBar` rather than the ring §3.6 asks for, because the design system forbids solid
progress bars and motion over 320ms; the near-miss XP distance (R8) renders in the
screen's own wrapping paragraph rather than inside `MarkerBar`'s note slot, because that
slot is `white-space: nowrap` (design-system defect #5) and, being inside the bar's
`role="img"` container, hid the distance from assistive tech entirely; and the K-beauty
tab on the missions board filters by tag rather than by one of R3's four mission
formats, because K-beauty is a tag on Physical missions, not a fifth format; and the
public marketing site of §4.1 is dormant, leaving the app as the whole surface. All are
recorded in `.superpowers/specs/2026-08-26-axelerate-app-h5-design.md` §2.1 and §6.3.

## What's deliberately not here

- **No backend.** The owner will connect **Supabase** (auth, missions, profiles) and
  **Shopify** (shop, drops, checkout) later. Two seams are shaped for them:
  `src/lib/join.js` → `submitJoin()` is the join form's only exit (becomes
  `supabase.auth.signInWithOtp`); `src/data/missions.example.json` is flat records that
  become the `missions` seed.
- **No dynamic routes** (`/u/…`, `/m/…`, `/shop/…`). They need data and indexability; the
  SSG/SSR framework decision is reopened when they arrive.
- **No CI.** The design-system dependency is private; CI needs a deploy key first.
- **No campus theming, dark canvas, XP ring, or level-up motion.** Those belong to the
  auth-gated app and conflict with the design system as shipped — tracked in
  axelerate-design-system[#1](https://github.com/cakkrie/axelerate-design-system/issues/1).
- **Four design-system defects found while building this**, all filed upstream:
  [#2](https://github.com/cakkrie/axelerate-design-system/issues/2) — `Input`/`Select` render
  hint and error text inside the `<label>`, polluting the accessible name;
  [#3](https://github.com/cakkrie/axelerate-design-system/issues/3) — `Button` is a plain
  function component with no `forwardRef` (the repo is on React 18, where refs on function
  components are simply dropped), so a ref placed on it never reaches the real `<button>`;
  [#4](https://github.com/cakkrie/axelerate-design-system/issues/4) — `validate.mjs` never
  scans `assets/icons-solid`, so new solid icons ship unvalidated despite "All checks passed";
  [#5](https://github.com/cakkrie/axelerate-design-system/issues/5) — `MarkerBar`'s note slot
  is `white-space: nowrap` and overflows below the 320px floor. The `/join` form works around
  #2 with a sibling hint linked by `aria-describedby`; `GigsDetail`'s Apply-sheet focus return
  works around #3 by reaching the real `<button>` via `querySelector`; `Me` works around #5 by
  rendering the away-distance in its own wrapping paragraph instead of the note slot.

## Content authority

Copy, audience, and business rules come from the owner's product specification
(`.superpowers/specs/2026-08-25-axelerate-product-specification.md`), **not** from the
design system's `readme.md`, whose positioning describes an earlier concept. Voice
mechanics (sentence case, verb-first, numerals, no emoji) still follow the design system.

## Owner to supply

- "Book a call" destination · real legal text · the campus list for `/join`.

## Deploying

Currently Vercel, with the two keys in `vercel.json`. Nothing about the setup is
Vercel-specific: see **Deploy** at the top for the four things any host needs.

**Install.** `scripts/ci-install.sh` rewrites git to anonymous HTTPS and then
runs `npm ci`. It was called `vercel-install.sh` until 2026-08-31, which read
as host-specific; it is not, and every keyless build container needs it.
Bumping the pinned design-system SHA needs no change here.

**Routing.** The app is a `BrowserRouter` SPA, so every path has to be served
`index.html` or a refresh on `/app/earn` returns 404. The `rewrites` entry does
that; Vercel checks the filesystem before rewrites, so hashed assets under
`/assets/` still resolve to real files.

Build command and output directory are Vercel's Vite defaults (`vite build` →
`dist`).
