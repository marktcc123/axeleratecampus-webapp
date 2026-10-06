# Axelerate app (H5) — technical design

**Date:** 2026-08-26
**Status:** Approved.
**Repo:** `~/axelerate-website-h5` (joins the existing marketing site; see §3.1 for why not a new repo)
**Builds on:** `.superpowers/specs/2026-08-25-axelerate-website-h5-design.md` (the marketing site). That spec's rules — token override layer, no app selector targets `.ax-*`, voice mechanics, honesty — all still bind unless overridden here.

## 1. Purpose

The auth-gated Axelerate app as a mobile web (H5) surface: four tabs — **Gigs · Perks · Application · Me** — where a student browses paid brand missions, opens one, sees what it pays, and tracks their own pipeline and progress. v1 has no backend and no auth; it is a navigable, honest preview built on the published design system.

## 2. Authority — which document wins where

| Concern | Authority |
| --- | --- |
| The Gigs board and mission detail — layout, hierarchy, interaction, copy | **`Missions Board H5.dc.html`** in Claude Design project `d024eb9f-078b-4ba6-83bb-686203fc8209`. Built as drawn. |
| Perks, Application, Me — content and structure | **Product spec** `.superpowers/specs/2026-08-25-axelerate-product-specification.md` (§2.2.2, §3.2, §4.2, §4.3) |
| Visual language — colour, type, paper, components, motion | **Design system** `axelerate-design-system`, used as shipped |
| Voice mechanics — sentence case, numerals, no emoji, banned words, "unlock" only as a noun | Design system `readme.md` → Content fundamentals. **These are not waived for client copy** (§5.3). |
| Business rules R1–R9 | Product spec §2.0 |

### 2.1 Supersessions, recorded

- **§4.2's three tabs (Earn · Shop · Me) are superseded** by the design's four. Mapping: **Gigs** ← Earn · **Perks** ← Shop · **Application** ← `/app/earn/mine` (the pipeline view) · **Me** ← `/app/me`. The spec's "There is no Home tab" still holds: the app opens on Gigs.
- **§3.6's XP ring and level-up takeover are superseded** by §6.3's ruling.

## 3. Architecture

### 3.1 One repo, two surfaces

The app joins the marketing site's repo rather than getting its own: it needs the same design-system dependency, the same responsive token layer (`src/styles/responsive.css`), the same `Icon` helper, and the same test rig, and `/join` hands off to it. A second repo would duplicate all four and fork the token layer.

```
src/
├── app/                        NEW — the auth-gated app
│   ├── AppShell.jsx            phone column + TabBar + preview marker; wraps every /app route
│   ├── TabBar.jsx              4 pill buttons, fixed floating, safe-area aware
│   ├── PreviewMarker.jsx       the "Preview · example data" strip (§6.4)
│   ├── ImageSlot.jsx           dashed placeholder replacing the prototype's <image-slot>
│   ├── app.css                 shell + tabbar, token-based
│   ├── screens/
│   │   ├── GigsBoard.jsx  gigs-board.css       ← the design, as drawn
│   │   ├── GigsDetail.jsx gigs-detail.css      ← the design, as drawn
│   │   ├── Perks.jsx
│   │   ├── Application.jsx
│   │   └── Me.jsx
│   └── parts/
│       ├── QuestDeck.jsx       the stacked, tappable quest cards
│       ├── FormatTabs.jsx      folder tabs with counts
│       ├── FilterChips.jsx     scribble-underline chips
│       ├── MissionTile.jsx     the board's 2-col card (distinct from marketing's MissionCard)
│       └── Money.jsx           the R1 formatter (§6.2)
├── data/
│   ├── missions.example.json   EXTENDED (§4.1)
│   ├── quests.example.json     NEW
│   ├── perks.example.json      NEW
│   └── applications.example.json NEW
└── … marketing site unchanged …
```

`MissionTile` (app) and `MissionCard` (marketing) stay separate components. They render different layouts for different audiences from the same fixture; merging them would produce one component with two modes and no clear owner.

### 3.2 Routes

| Route | Screen |
| --- | --- |
| `/app` | redirect → `/app/gigs` |
| `/app/gigs` | GigsBoard |
| `/app/gigs/:slug` | GigsDetail |
| `/app/perks` | Perks |
| `/app/application` | Application |
| `/app/me` | Me |

Nested under one `<Route path="/app" element={<AppShell/>}>` so the shell, tab bar and preview marker mount once. Unknown `/app/*` paths render the existing shared `NotFoundPage` inside the app shell.

The marketing site's `Nav` and `Footer` do **not** render on `/app/*`, and the app's `TabBar` does not render outside it. `App.jsx` splits on the route prefix.

### 3.3 The app shell is a phone column

Per the design: `max-width: 520px`, centred, `--surface-page` ground with the `.ax-grid-paper` utility. The tab bar is a floating pill, `position: fixed`, bottom `calc(16px + env(safe-area-inset-bottom, 0px))`, with content padded to clear it. On desktop this is a centred phone-width column — the standard H5 treatment, and what the design specifies.

The nine responsive tokens still apply inside the column, so **320px remains the tested floor**.

## 4. Data

### 4.1 Missions fixture — extended, not replaced

The marketing site's `Missions` section already consumes `missions.example.json`. The app needs more per mission. Existing fields stay (they encode R8/R9); these are added:

| Field | Type | Purpose |
| --- | --- | --- |
| `tags` | `[{ tone, icon, label }]` | the design's Tag row — e.g. `{tone:'cyan', icon:'play', label:'Digital'}` |
| `meta` | string | the design's line under the title — "45 min · flexible this week" |
| `perk` | string | "+ keep the 12-pack"; `""` when none |
| `photoLabel` | string | ImageSlot caption — "Solra product shot" |
| `desc` | string | detail-view prose |
| `steps` | `[string]` | numbered field-execution steps |
| `creditPts` | number \| null | credit award; rendered per §6.2, never bare |
| `spots` | `{ taken, total }` \| null | "10/10" |
| `deadline` | string | "Ongoing", "Fri 6–9pm" |
| `host` | `{ name, role }` | "Axelerate Beauty" / "Host" |

The three fictional brands and the spec's Dermabell example stay. The Dermabell mission gains the design's full detail content (§5.3 governs its register). Shape remains flat records — still a future Supabase `missions` seed.

### 4.2 New fixtures

- **`quests.example.json`** — the design's three quests: `{ tab, title, desc, reward, color }`. `color` is a token name (`violet-600`, `accent-pink`, `ink-900`), resolved to `var(--…)` at render; raw hex never appears in app code.
- **`perks.example.json`** — from product spec §3.2's "What each level opens": `{ level, name, perks[] }` for all five levels.
- **`applications.example.json`** — `{ missionSlug, status, appliedAt, note }` with `status ∈ applied | doing | submitted | approved | paid`, matching §1's loop.

## 5. Screens

### 5.1 Gigs board — as drawn

Header (wordmark · inbox bell · avatar) → **Active quests** deck → **Missions** heading → **format tabs** (All · Digital · Physical · K-beauty, with counts, drawn as folder tabs that sit on the panel) → a `--surface-quiet` panel with asymmetric top radius → **filter chips** (`$25+`, `Under 1 hr`, `This week`; butter scribble underline when active) → **2-column mission tiles**.

Interactions from the prototype's `DCLogic`, preserved: tapping a quest strip brings it to the front of the deck; format tabs filter the tile set and are single-select; filter chips toggle independently; tapping a tile routes to detail. One tile renders **locked** (`Card variant="sketch"`) showing `LV.4 · N XP away` — R8.

### 5.2 Gigs detail — as drawn

Back · "Mission" label · Apply button → a taped paper sheet (`rotate(-0.4deg)`, tape strip, `--sticker-cut`) holding image, tags, title, host row with overlapping initial avatars and "10 going", and a `StickyNote` "You earn" → then the accordion: "The mission" prose, "What you'll do (field execution)" with numbered butter step markers, "What's in it for you?" with icon bullets, "Support & training". One section open at a time, as the prototype does.

The "You earn" grid is **cash · credit · XP** (§6.2), plus Deadline and Spots.

### 5.3 Client copy and register

The design's Dermabell content is real client copy. Its substance is authoritative and kept: Axelerate Beauty as Dermabell's US operating partner, the AI Skin Analyzer and 40-minute express K-facial, 10% commission on an initial order, a ~$10,000 clinical package, the three field-execution steps, the training materials.

Its **register is brought into line** with the design system's Content fundamentals, which the design does not override. Specifically: "Killer communication skills and hungry for real earning potential? Hit apply and get started." becomes verb-first and sentence-case without the hype. Claims that are the client's own (commission rates, package price) are reproduced exactly — they are facts, not tone.

### 5.4 Perks — from the spec

No product catalog: Shopify will own commerce, so inventing products here would be work to delete. Instead the five levels' perks from §3.2, the student's current level marked, locked levels carrying R8 distance, and the credit balance in §6.2 form. One `StickyNote` states the shop's single gate — verification (R4).

### 5.5 Application — from the spec

The student's own pipeline (§4.2 `/app/earn/mine`): each application as a row with mission, brand, pay, and status along §1's loop — applied → doing → submitted → approved → paid. Status uses the design system's `Tag` tones, not invented colours. Empty state uses `Card variant="sketch"` with a link to Gigs.

### 5.6 Me — from the spec

Level and identity (§3.2), XP progress per §6.3, streak (§3.4) as week pips with the live multiplier, active quests, track record (missions completed, on-time rate, brands worked), wallet summary (cash withdrawable, credit per §6.2), and a link to the public profile preview. No settings, no orders — those are §4.2 sub-screens, out of scope (§8).

## 6. Rulings

### 6.1 Design-system assets — additive commit, then re-pin

The Claude Design project's `_ds` export and the pinned `#7cf20a6` **diverge**; neither is strictly newer. `spacing.css` is byte-identical. `typography.css` differs in exactly two lines: the pin has `--font-label: 'Gabarito'` / `--font-hand: 'Lacquer'`, the export has `'Space Grotesk'` / `'Caveat'`. Every `--text-*`, `--leading-*`, `--tracking-*` and `--weight-*` matches, so the responsive layer is unaffected either way. The pin's own `readme.md` still praises "Space Grotesk's letterforms" while defining Gabarito — a leftover indicating **the pin is the newer typography**.

Therefore: **do not adopt the export's typography.** Take only what is additive — **18 files**: `assets/icons-solid/{bag,bell,bookmark,calendar,checklist,coffee-cup-2,crown,fire,pin,play,rocket,star,tick-2,trophy,user,zap}.svg` (16) and `assets/doodles/{sparkle-volt,underline-volt}.svg` (2). `bag.svg` has no outline counterpart in either export and is required by the Perks tab.

**Verified 2026-08-26:** every CSS custom property the design references already exists in the pinned version — `--accent-yellow`, `--accent-yellow-soft`, `--accent-cyan-soft`, `--accent-pink`, `--tint-lilac-soft`, `--butter-200`, `--gray-500/700`, `--violet-700`, `--surface-quiet`, `--scribble-butter`, `--sticker-cut`, `--radius-hand`, `--radius-hand-lg`, `--radius-pill`, `--shadow-paper`, `--shadow-paper-lg`, `--shadow-paper-inset`, `--ease-launch`, `--tracking-caps`, `--text-brand`, `--text-muted`. Likewise every component (`Card` variants `sheet`/`sketch`, `Badge tone="yellow"`, `Tag` tones `cyan`/`lilac`/`lime`, `StickyNote tint="yellow"`, `Button`). **The 18 asset files are the entire gap** — no token or component work is needed.

These land in the **design-system repo** as one additive commit — the "deliberate re-export or documented exception" its own frozen rule contemplates — not vendored into the app, which would be the fork avoided throughout. The website's dependency is then re-pinned to that commit. The design system's 38 outline icons and its fonts are untouched.

### 6.2 Credit is never a bare number (R1)

The design's `+8,000 pts` is credit. Rendered only as the product spec's one-string form: **`8,000 credit · $80 in shop`**. The rate is 100 credit = $1, derived from §2.1.1's own example (`2,400 credit · $24 in shop`).

A single `Money.jsx` owns this: `credit(pts)` returns the full string; nothing else in the app formats credit. A unit test asserts no screen renders a credit figure without its dollar equivalence.

### 6.3 XP progress uses the brand's own vocabulary, not a ring

Product spec §3.6 wants an XP ring "always on screen" and a ~2.5s level-up takeover. The design system forbids both absolutely: *"No solid progress bars… data drawn by hand"* and *"no bounces, no springs, nothing >320ms"*. This is design-system issue #1 becoming live.

**Ruling:** XP progress renders as the design system's `MarkerBar` — "18–26 slanted pencil strokes… filled up to the value" — which is the brand's stated progress vocabulary. Its props carry the requirement exactly: `value={340} total={500} label="XP to LV.3" figure="340 / 500" note="about 1 mission" color="violet"`. The `note` is where R8's near-miss distance goes, in the brand's handwriting. Transitions stay ≤320ms; there is no takeover. §3.3's intent (the student always sees the distance) is met; the design system's rules are not broken. A literal ring and takeover would be a design-system extension and separate work.

### 6.4 The app must not read as a real account

Every `/app/*` screen shows money and spots with no backend behind them. A persistent, quiet marker — one strip reading **"Preview · example data"** in the shell, above the first screen content — states this once per screen without shouting. The Apply button opens a sheet saying applications open at launch; it never pretends to submit. This is the same rule the `/join` form follows.

## 7. Testing

**Unit (Vitest + Testing Library):**
- Every screen renders; `AppShell` renders the tab bar and the preview marker.
- `Money.credit()` — `8000 → "8,000 credit · $80 in shop"`, `2400 → "2,400 credit · $24 in shop"` (the spec's own example), and a scan asserting no screen emits a bare credit number.
- `TabBar` — 4 tabs, correct active tab per route, each linking to its route.
- `QuestDeck` — tapping a strip brings it to front and reorders.
- `FormatTabs` — single-select, filters the tile set, counts render.
- `FilterChips` — independent toggles.
- `MissionTile` — leads with the dollar figure (R1); locked tile shows XP distance, never "locked" alone (R8).
- `GigsDetail` — one accordion section open at a time; Apply does not submit (assert `fetch` never called).
- Marketing site's existing 84 tests keep passing — the fixture is extended, not reshaped.

**End-to-end (Playwright):** the overflow guard extends from 7 routes to **12**, at 320/375/414/768/1024/1280 — the 520px column makes 320 the real risk. Plus: the tab bar is reachable and switches screens; a tile opens detail and back returns; the detail's Apply sheet opens; the tab bar never overlaps the last content element at 320px.

## 8. Out of scope for v1

- Auth, backend, submission. The Supabase and Shopify seams stay as they are.
- §4.2 sub-screens: `/app/earn/quests`, `/app/me/level`, `/app/me/wallet`, `/app/me/orders`, `/app/me/content`, `/app/me/referrals`, `/app/me/settings`, `/app/shop/drops`, cart, checkout, `/app/verify`.
- The shop catalog (Shopify's).
- Campus theming (§5.1) — needs the dark canvas the design system does not have; design-system issue #1.
- Real photography; `ImageSlot` placeholders throughout.
- The literal XP ring and level-up takeover (§6.3).
- CI (still blocked on the private dependency's credentials).

## 9. Open items the owner must supply

- Whether the Dermabell mission is a live listing or an example. v1 treats it as example data under §6.4's marker.
- Real mission photography for the ImageSlots.
- Whether "Application" should be singular (as drawn) or plural in the tab label; v1 follows the design.
- The inbox destination for the header's bell — v1 renders it inert with an accessible label, per the placeholder pattern already used for "Book a call".
