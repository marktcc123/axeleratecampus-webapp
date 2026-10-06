# Axelerate website — technical design (H5 / fully responsive)

**Date:** 2026-08-25
**Status:** Approved.
**Depends on:** `github:cakkrie/axelerate-design-system` (private), at or after commit `7cf20a6`.
**Content authority:** `Axelerate-Product-Specification.docx` (owner-supplied, 2026-08-25). A text conversion is committed beside this file as `2026-08-25-axelerate-product-specification.md`; section numbers below (§4.1, R8, etc.) refer to it.

## 1. Purpose

The public website for Axelerate — a gamified campus creator marketplace where brands post paid **missions** and verified college students complete them for USD, earn XP, and climb a five-level ladder. Slogan: **"Shape what's next."**

This project builds the **static core** of the public site (product spec §4.1): five routes, no dynamic data, fully responsive from a 320px phone to 1280px+ desktop, on the published design system without editing or forking it. "H5" in the original request names the mobile-web delivery target; the owner chose full responsive.

### 1.1 Two sources of truth, and which wins where

| Concern | Authority | Notes |
| --- | --- | --- |
| Visual language — colour, type, paper, hand-drawn motifs, components, motion | **Design system** (`axelerate-design-system`) | Used as shipped. Never edited. |
| Product, audience, positioning, copy, voice, page content, business rules | **Product spec** (this repo, `.superpowers/specs/…product-specification.md`) | The design system's `readme.md` describes a *different product* — an "invite-only business network for founders, operators, and backers." That positioning, its example copy ("Request invite", "Grab a seat", "The inside track for people who build"), and its audience are **superseded** and must not be used. |
| Typographic and tonal rules — sentence case, verb-first labels, numerals always, we/you, no emoji in chrome, banned words | **Design system** `readme.md` → Content fundamentals | These are voice *mechanics*, not positioning, and they transfer intact. |

**Ruling recorded 2026-08-25:** keep the visual system, replace the voice. The four places the product spec contradicts the design system's absolute rules — dark canvas (§5.1), campus accent on navigation (§5.1), XP progress rings and count-ups (§3.6), motion longer than 320ms (§3.6) — all live in the **auth-gated app** (§4.2), which is out of scope for this project. The public website has no such conflict. Follow-up filed: axelerate-design-system#1 to rewrite `readme.md`'s stale positioning.

## 2. The constraint this design is built around

The design system has **no responsive story of its own** — verified:

- Zero `@media` rules in `tokens/`, in any of the 22 components, or in `ui_kits/website/`.
- `--container-max: 1160px` and `--gutter: 24px` are fixed.
- The type scale is fixed pixels, `--text-xs: 12px` through `--text-6xl: 80px`. A `--text-5xl` (60px) headline overflows a 375px viewport.

Two properties make this solvable **without touching the system**:

1. **Tokens are defined on a bare, unguarded `:root{}`.** Any stylesheet loaded after `styles.css` can redefine a token inside a media query at equal specificity and win on source order.
2. **Components are overwhelmingly token-driven.** Measured `var()` vs hardcoded `px`: Card 42/22, Button 35/20, Tag 34/10, Tabs 34/22, FileCard 31/21. Residual pixels are control heights (32/40/48px) and icon sizes — already correct on a phone.

Only **Toast** carries a three-digit fixed width (`width:340px`), and it already declares `max-width:100%`, so it yields to its container. Dialog's panel has no fixed width — its only three-digit pixel value is a decorative 104px tape strip. **No component needs overriding.**

## 3. Architecture

```
axelerate-website-h5/
├── index.html                    Vite entry; preconnect hints for Google Fonts
├── package.json                  vite, react 18, react-router, axelerate-design-system (git dep)
├── vite.config.js
├── src/
│   ├── main.jsx                  mounts <App/>; imports styles in the ORDER below
│   ├── App.jsx                   router + shared shell (Nav, Footer)
│   ├── styles/
│   │   └── responsive.css        TOKEN OVERRIDE LAYER — the responsive strategy
│   ├── pages/                    one file per route (§4)
│   ├── sections/                 landing-page sections, one file each
│   ├── components/               app-only components not in the design system (NavSheet, MissionCard)
│   ├── lib/
│   │   └── join.js               submitJoin() — the ONLY exit for the /join form; Supabase swaps in here
│   └── data/
│       └── missions.example.json sample missions for the landing page — labelled as examples
├── tests/
│   ├── unit/                     Vitest + Testing Library
│   └── e2e/                      Playwright — overflow guard across every route
└── .superpowers/specs/
```

### 3.1 Stylesheet load order — load-bearing

```js
// src/main.jsx — this order is the mechanism, not a preference
import 'axelerate-design-system/styles.css';       // 1. system tokens + base
import './styles/responsive.css';                   // 2. our token overrides
```

Both target `:root`, so source order decides. Reordering silently disables the responsive layer. A unit test asserts the order (§7). There is deliberately no third stylesheet (§3.3).

### 3.2 The token override layer

`src/styles/responsive.css` is **mobile-first** with three tiers:

| Tier | Range | Role |
| --- | --- | --- |
| base | ≤ 640px | phone — new values |
| `md` | 641–1024px | tablet — new values |
| `lg` | ≥ 1025px | desktop — **exactly the system's current values**, so wide screens render as the system intends |

Tokens that move, and only these:

| Token | base | md | lg (= system) |
| --- | --- | --- | --- |
| `--text-6xl` | 44px | 60px | 80px |
| `--text-5xl` | 34px | 46px | 60px |
| `--text-4xl` | 28px | 36px | 46px |
| `--text-3xl` | 24px | 30px | 36px |
| `--text-2xl` | 20px | 24px | 28px |
| `--container-max` | 100% | 100% | 1160px |
| `--gutter` | 20px | 32px | 24px |
| `--space-4xl` | 56px | 72px | 96px |
| `--space-3xl` | 40px | 52px | 64px |

`--text-xs` … `--text-xl` (12–22px) do not move. Colour, radius, shadow, and motion tokens never move — the brand does not change shape by viewport. The file redefines **only** tokens the system already defines, so a future rename fails loudly rather than silently.

### 3.3 Component overrides — none

**The app never overrides a design-system component's CSS.** Layout problems are solved in the app's own containers and the token layer. Concretely: Toast's 340px would overflow a 320px viewport only because the desktop kit wraps it in an app-owned `position:fixed; right:24px` element with no width. Here the wrapper sets `left: var(--gutter); right: var(--gutter)` below `md` and the toast fills it. If a case ever arises that genuinely cannot be solved this way, it is raised against the design-system repo — not patched here.

**Clarified 2026-08-25, during implementation.** "Never overrides" means no app selector targets an `.ax-*` class. Setting `display` on the app's own class for breakpoint visibility of the app's own element is layout and has always been the app's. Because the design system injects component styles at JS time, after the bundle, such rules must reach (0,2,0) to win an equal-specificity tie (`.nav .nav__cta`, `.nav .nav__toggle`). Two nav bugs were found this way and fixed under one pattern; see `src/components/shell.css`.

### 3.4 Routing

`react-router` with five static routes (§4), rendered client-side. Nav and Footer are a shared shell. Unknown paths render a 404 in the same shell.

### 3.4a Backend seams — deferred, but shaped now

**Owner decision 2026-08-25:** no backend in v1. The owner will connect **Shopify** (shop, drops, cart, checkout) and **Supabase** (auth, missions, profiles, the `xp_event` table) later. v1 must not preclude either, so two seams are built deliberately:

1. **`src/lib/join.js` exports one function, `submitJoin({ email, name, campus })`.** In v1 it validates and resolves without a network call. It is the only place the `/join` form talks to the outside world, so the Supabase swap is `supabase.auth.signInWithOtp({ email })` in one file — which is exactly the `.edu` magic-link flow the product spec §4.3 requires. The form component never imports a client SDK directly.
2. **`src/data/missions.example.json` is shaped as flat records**, one per mission, with the fields the product spec puts on a card: `slug, title, brand, campus, payUsd, tier (1–5), tierName, minLevel, hours, format (content|field|event|sales), skills[], xp`. That is the shape a Supabase `missions` table will have, so the fixture becomes a seed file rather than throwaway.

What v1 deliberately does **not** build: any product, cart, price, or inventory data structure. The shop appears on `/` as copy only (§4 section 5). Shopify's Storefront API defines those shapes; inventing parallel ones now would be work to delete later.

This is a client-rendered SPA. That is acceptable for five static marketing pages and is **the wrong tool for the dynamic, indexable routes** the product spec adds later (`/u/[handle]`, `/m/[slug]`, `/b/[slug]`, `/shop/[slug]`, `/schools/[slug]`, `/verify/[receipt-id]`). When those arrive, the framework decision (Next or Astro for SSG/SSR) is reopened — recorded in §8, not pre-solved.

### 3.5 Fonts

`tokens/fonts.css` loads four families via CSS `@import` from Google Fonts — render-blocking on mobile, and a frozen system file. Mitigation at the app level in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

The system's URL already carries `display=swap`. No self-hosting in v1.

## 4. Pages

Five routes from product spec §4.1. Purposes are quoted from it.

### `/` — Student landing
> "one promise, one CTA, live missions as proof"

Sections, one file each in `src/sections/`, in order:

1. **Hero** — slogan "Shape what's next." as the promise; one sentence from §1 ("Brands post paid, well-defined pieces of work… Students… do the work, and get paid in real dollars"); one CTA → `/join`. Emphasis doodle on one phrase per the design system.
2. **The loop** — §1 "The loop" rendered as a horizontal stepper (apply → do the work → approved → cash lands / XP lands → better missions unlock), stacking vertically below `md`. Drawn with the system's `MarkerBar`/hand-drawn vocabulary, not a flowchart.
3. **Missions as proof** — exactly 4 `MissionCard`s (3 open, 1 locked) from `src/data/missions.example.json`, following the §2.2.3 card format exactly: `Dermabell Campus Launch · $280 · TRUSTED MISSION · LV.4 · 4 hours · UCLA · Brand Activation · +850 XP`. One card rendered **locked** per the near-miss rule (R8): `Trusted · LV.4 — 620 XP away · about 3 missions`, with the dollar figure still visible. The section carries a visible caption: *"Example missions — the live board opens at launch."* Never presented as live data.
4. **The ladder** — the five levels (Explorer · Contributor · Insider · Trusted · Partner) as a fanned `FileCard` stack at `md`+, a vertical stack below. Each card: level name, the one-line identity from §3.2 ("I'm not someone who signed up and vanished"), and one representative unlock. No XP numbers beyond the gate figure — the ladder is shown as *access*, per R7.
5. **The shop** — one `StickyNote` aside: student prices, cashback credit, "one gate: verification" (R4). Credit is never shown as a bare number (R1) — if a figure appears it is the one-string form `2,400 credit · $24 in shop`.
6. **For brands** — a short `Bubble` pointing at `/for-brands`.
7. **CTA band** — violet full-bleed, "Shape what's next." + `/join`.
8. **Footer** — links to `/for-brands`, `/join`, `/legal/*`. Ink background per the system.

### `/for-brands` — Brand page
> "The single brand-facing page → book a call. Thin by design"

Hero stating the brand problem from §1 ("paid social ads — expensive and distrusted by exactly this audience"); three short benefit blocks (verified students, missions as the one object — R3, work receipts as proof — R5); one CTA **"Book a call"**. The CTA's destination is a **placeholder `href="#"`** until the owner names the booking tool — recorded in §9.

### `/join` — Sign up
> "Sign up → verify. The funnel's throat"

A form: school email (`.edu` validated client-side), name, campus. **UI only — nothing is submitted** (owner ruling 2026-08-25). Submission goes through `submitJoin()` in `src/lib/join.js` (§3.4a) so the Supabase magic-link swap later touches one file. On valid submit, the success `Toast` fires. Below the form, the four verification steps from §4.3 (School · Work eligibility · Payout · Reach) as a numbered list, with a sentence explaining why each is required. Copy: "Nothing is stored yet — verification opens at launch." Honest, not a fake funnel.

### `/legal/terms`, `/legal/privacy`, `/legal/payouts`
Three pages, one shared `LegalPage` layout. **v1 ships headed placeholders** — each page has its title and the section headings the owner will fill, with a visible *"Draft — legal text to follow"* note. Real legal text is the owner's (§9).

### Business rules from the product spec that bind the website

| Rule | Effect here |
| --- | --- |
| R1 Cash is the unit | Every mission card leads with the dollar figure; credit never appears as a bare number |
| R7 Levels buy access, never a pay multiplier | The ladder section shows unlocks as access/status, never as "earn more" |
| R8 Everything locked shows its distance | The locked example card shows XP distance and mission count, not "locked" |
| R9 One tier scale T1–T5 | Mission cards use the tier vocabulary (TRUSTED MISSION · LV.4) |

## 5. Copy and voice

- **Content** from the product spec. Slogan: "Shape what's next." Audience: students (`/`, `/join`) and brands (`/for-brands`).
- **Mechanics** from the design system's Content fundamentals: sentence case everywhere including headlines and buttons; verb-first labels ("Shape what's next", "Book a call", "Get verified"); we/you; numerals always ("$280", "5 levels", "3 missions"); no emoji in chrome — the product spec's 🔒 on locked cards becomes a doodle icon; banned words (synergy, leverage, ecosystem, unlock*, empower, "successfully").
- **Dropped from the design system**: all invite/member/room/inside-track language and every example line in its readme — they belong to the superseded positioning.

*The product spec uses "unlock" freely as a product term ("levels unlock"). The design-system ban targets marketing puffery. Ruling: "unlock" is permitted **only** as the product-spec noun for a ladder perk, never as a verb in headlines or CTAs.

## 6. Dependency and install

```json
"dependencies": {
  "axelerate-design-system": "github:cakkrie/axelerate-design-system#main",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6"
}
```

- The design system ships **untranspiled `.jsx`**. `vite.config.js` configures `@vitejs/plugin-react` and `optimizeDeps` to transpile it from `node_modules`. Verified by a smoke test (§7).
- The package's `sideEffects` declaration protects its self-injected `<style>` tags from tree-shaking. If a component renders unstyled in a production build, that is the first suspect.
- **The dependency repo is private.** Install works locally through the owner's git credentials. Any CI for this repo needs a deploy key or token with read access. **v1 has no CI**; recorded as a follow-up.

## 7. Testing

**Unit (Vitest + Testing Library):**
- Every page renders without throwing; every landing section renders without throwing.
- `NavSheet` opens on hamburger tap, closes on overlay tap and Escape, traps focus while open.
- `MissionCard` renders the dollar figure first (R1) and, when `locked`, renders the XP distance and mission count (R8) with the dollar figure still present.
- `/join` form: rejects a non-`.edu` email, fires the Toast on a valid one, and performs no network request (assert `fetch` is never called). The form calls `submitJoin()` exactly once with the entered values — asserted with a mock, so the seam is proven to be the only exit.
- **Stylesheet order guard:** reads `src/main.jsx` as text and asserts the two imports appear in §3.1 order.
- Smoke: `Button` from the package renders with class `ax-btn` — proves Vite transpiles the dependency's `.jsx`.

**End-to-end (Playwright):**
- **Overflow guard — the test this project exists for.** For **every route** at viewport widths **320, 375, 414, 768, 1024, 1280**: `document.documentElement.scrollWidth <= clientWidth`.
- At 375px the hamburger is visible and inline nav links are not; at 1280px the reverse.
- The `/join` success toast at 320px lies within the viewport.
- Client-side navigation between all five routes works and the 404 renders for an unknown path.

No visual-regression snapshots in v1.

## 8. Out of scope for v1

- The auth-gated app (§4.2) and everything that conflicts with the design system there — dark canvas, campus theming, XP ring, level-up motion.
- Dynamic routes (`/u/`, `/m/`, `/b/`, `/shop`, `/schools/`, `/verify/`) and the SSG/SSR framework decision they trigger.
- Any backend, form submission, or email capture. **Shopify** (commerce) and **Supabase** (auth/data) are the owner's chosen backends and will be connected later; v1 shapes its seams for them (§3.4a) and builds nothing that would fight them.
- CI / deployment (blocked on private-dependency credentials).
- Chinese or bilingual copy; self-hosted fonts; visual-regression snapshots.
- Any edit to the design system. Gaps are raised against that repo.

## 9. Open items the owner must supply

- **"Book a call" destination** for `/for-brands` — placeholder `#` until named.
- **Legal text** for `/legal/terms`, `/legal/privacy`, `/legal/payouts` — v1 ships headed drafts.
- **Campus list** for the `/join` form — v1 uses a short example list clearly labelled.
- The product spec §3.5 contains a stray `marktcc321@gmail.com` mid-sentence; it is reproduced verbatim in the committed text conversion and should be removed from the source document.

## 10. Follow-ups filed elsewhere

- **axelerate-design-system**: rewrite `readme.md`'s positioning, audience, and example copy to match the product spec; note that the design system does not yet cover the app's dark-canvas, campus-theming, progress-indicator, and long-motion needs. (https://github.com/cakkrie/axelerate-design-system/issues/1)
