# Product

## Register

product

## Users

Verified US college students, `.edu` address required. They are on a phone, between
classes, looking for paid work that fits around a schedule they do not control.

The job to be done: find a brand mission they can actually complete, apply, do it, get
paid, and climb toward missions that pay more. A student's context is short sessions and
low patience. They arrive with a question ("is there anything worth my time today?") and
should get an answer before they put the phone down.

Brands are the other half of the marketplace but they are **not users of this surface**.
The app is student-facing only. Client-facing copy that appears here (mission briefs,
commission terms) is written *for* the student, about the brand.

## Product Purpose

Axelerate pays students to run real missions for real brands: physical field work,
digital content, sampling, and referrals. This app is the student's entire surface.

Eighteen screens carry it behind four tabs. Gigs is the board and the mission detail.
Perks is the shop. Application is the student's own pipeline. Me is a hub, and ten
sub-screens hang off it: wallet, orders, levels, syndicate, co-creations, events, one
event's ticket, invite, inbox and settings. The gate and verification sit outside the
app shell.

Success is not a signup. Success is a **first paid mission completed**, then a second.
Everything on the board is in service of getting a student to a mission they will finish.

## Brand Personality

Voice is **playful confidence**, defined authoritatively in the design system's Content
fundamentals (`readme.md` §Content fundamentals). That document wins on tone; this
section points at it rather than restating it.

The three words: **playful, confident, warm.**

The rules that bind, quoted from the source:

- Short sentences. Verbs first. Warm, quick, a little cheeky. Never corporate, never smug.
- **Sentence case everywhere**, including headlines and buttons. No Title Case, no ALL
  CAPS except mono data labels.
- **We/you.** The product speaks as "we" and talks to "you". Never "the user", never
  passive voice.
- **Verb-first labels.** "Get verified", not "Submit".
- **Numerals, always.** "8 seats", not "eight seats".
- **Speed is the metaphor**, used lightly, once per view.
- **Exclusive but warm.** Invite and member language with zero gatekeeping sneer.

### One conflict, recorded

The impeccable skill bans em dashes in interface copy. This project's established voice
uses them heavily, and the design system's own documentation is written that way. **The
design system wins on this project.** Do not sweep em dashes out of existing copy as a
"fix"; that would be an unrequested rewrite of a voice the owner already approved.

## Anti-references

Confirmed by the owner, 2026-08-26. This app must not read as:

- **A job board.** Indeed / LinkedIn / Boss 直聘 density: rows of near-identical
  listings, a filter rail that outweighs the content, everything the same size. A student
  should feel they are picking something good, not submitting a résumé into a queue.
- **A creator-commerce feed.** TikTok Shop / RedNote: cover images wall-to-wall, follower
  counts as the headline. The offer here is paid work, not influencer status.
- **An enterprise SaaS admin.** Grey sidebar, data tables, dashboard cards, navy. The
  exact opposite of the design system's hand-drawn desk, and the single easiest thing to
  drift into when building app screens rather than marketing pages.

**Gamification is deliberately NOT an anti-reference.** XP, levels, streaks and quests
are wanted. The owner declined to list "over-gamified" as something to avoid. Push the
game layer with confidence; the guardrail is Design Principle 3 below, not restraint for
its own sake.

## Design Principles

1. **Cash leads. Credit never stands alone.** Money is why a student is here, so the
   dollar figure is the headline. Credit is never a bare number: it always carries its
   shop value, as in `2,400 credit · $24 in shop`, at 100 credit = $1. (Product spec R1.)

2. **A locked thing states its distance.** Nothing is only "locked". It says how far:
   `LV.4 · 320 XP away`. A closed door with no distance on it reads as a wall; with a
   number on it, it reads as a target. (R8.)

3. **Levels buy access and status, never a higher rate.** Climbing opens missions,
   perks and shop tiers. It never multiplies pay. This is what keeps the earnings
   claims honest and the game layer safe to push hard. (R7.)

4. **Data is drawn by hand, never plotted — in the student-facing app.** Tally marks for
   counts, hatched stroke rows for shares, a marker circle around the one figure that
   matters. No pie charts, no gridlines, no solid progress bars, and no invented
   denominators. A figure with no honest proportion just stands as type.

   **One scoped exception, owner's decision 2026-08-31: the admin console plots.**
   `/app/me/admin/analytics` draws a line chart and a donut, because an operator reading a
   dashboard needs information density where a student needs charm, and the hatched
   version carried too little per inch. The exception lives in `src/app/admin` and
   nowhere else; the panel's own header comment states it. Two parts of this principle
   still bind there because they are about honesty rather than style: **no invented
   denominators** (the donut's centre total is the sum of its own slices) and one y axis
   per frame. A related finding: the six-hue accent ramp **cannot** supply a four-way
   categorical palette (coral against butter is ΔE 0.2 under deuteranopia), so a share of
   one measure takes a sequential violet ramp, darkest slice largest.

5. **Components change in the design system, not in the app.** The app never patches an
   `ax-*` component from its own CSS. A component-layer change lands in
   `axelerate-design-system`, gets pushed, and arrives here by bumping the pinned SHA.
   (Owner's standing instruction, 2026-08-26.) Local overrides are fragile anyway: the
   system injects each component's `<style>` at JS-execution time, *after* the bundled
   stylesheet, so an app rule at specificity (0,1,0) competing with an `ax-*` class on the
   same element loses the tie.

6. **Every font size names a rung. No stylesheet writes a number.** The app ladder is
   `--text-3xs` · `--text-xs` · `--text-sm` · `--text-lg` · `--text-xl` = 10 · 12 · 15 · 18 · 22px,
   at ratios 1.20-1.25; weight, family and colour carry the rest of the hierarchy.
   `--text-md` (16) is the wide-measure prose alternate to `--text-sm`, used by the gate
   and legal pages, never as a step above it. Rungs are rem, so a reader's own browser
   font size and 200% zoom work. Picking a size by eye is what produced 130 hardcoded
   values across 25 sizes down to 9px; `tests/unit/type-scale.test.js` is the guard.


7. **Me's sub-screens come in two families.** Five sit on a full-bleed colour band
   (co-creations lilac, levels yellow, events violet, invite coral, career cyan); the rest
   sit on white. `SubScreen`'s `band` prop is the whole difference, and each band's
   watermark is its own screen's subject. Contrast on a band is measured, never assumed:
   the source design draws four of the five with text that misses AA, and coral with white
   text misses even the 3:1 large-text bar at 2.82:1, which is why coral carries ink.

## Accessibility & Inclusion

**Target: WCAG AA, with motion restraint treated as a first-class stance rather than a
fallback.**

- Body text ≥ 4.5:1 against its background. Large text (≥18px, or bold ≥14px) ≥ 3:1.
  Placeholder text gets the same 4.5:1 as body, not a muted-grey default. This is the
  standard that caught the gate button rendering violet-on-violet at 1.85:1.
- Every interactive element is keyboard reachable and shows a visible focus ring. The
  system's global `:focus-visible` is load-bearing; do not remove it when trimming states.
- **No movement on hover, anywhere.** Owner's decision, 2026-08-26: every `translate` and
  `rotate` was stripped from every hover in the design system. Colour, background and
  shadow feedback stay, so a hoverable thing still reads as hoverable. Press feedback
  (`:active` scale) stays, because on touch it is the only acknowledgement a tap gets.
- Transitions stay ≤ 320ms. Nothing bounces, springs, or blurs.
- `prefers-reduced-motion: reduce` gets a real alternative (crossfade or instant), never
  a broken or blank state.
- Reveal animations must enhance an already-visible default. Never gate content
  visibility on a class-triggered transition; it will not fire in a headless renderer or
  a background tab, and the section ships blank.

## The design is re-imported, not guessed

The Claude Design project `d024eb9f-078b-4ba6-83bb-686203fc8209`
(`Missions Board H5.dc.html`) is the layout authority. It was re-imported on
2026-08-27 and had moved a long way from the first build: thirteen screens where
there had been five, a product shop where Perks had been the level ladder, new
mission data, a new title font and new icons.

Four decisions the owner made against it, all binding:

1. **The five levels stay.** The design file mocks one persona and does not
   happen to draw them; that is not the same as retiring them. R7, R8 and R9
   still hold, and the ladder lives at `/app/me/levels`.
2. **Names are placeholders.** The design mocks a named student with a wallet
   balance, a Venmo handle and an email. Nothing here has an account behind it,
   so the screens read "Your name", "Your campus", "you@campus.edu",
   "YOURCODE-24". (This clause used to promise a preview marker on every screen
      inside the shell; no screen ever carried one. See "Current state" below.)
3. **DynaPuff joins as `--font-title`.** It takes the family count to five, past
   the usual cap of three, with that trade-off on the table.
4. **Nothing moves on hover, still.** The design slides and rotates the arrow
   that appears on a mission row. The fade survives; the movement does not.

Where the design and the design system disagree, the design system wins on tone
and on accessibility, and the departure gets recorded in the commit. Three so
far: the "cutting-edge" lede, cashback naming its unit, and `MarkerBar` at 40
ticks (readme.md specifies 18-26, and 40 overflows 320px).

## Current state, for anyone picking this up

There is **no backend**. `src/lib/join.js` `submitJoin()` is the seam a Supabase magic
link will replace; Shopify will back the shop later. Nothing is stored, nothing is
charged, no account exists.

Two consequences bind design work today:

- Apply never submits, and the app must not read as a real account. (Spec §6.4.)
  **There is no app-wide "Preview · example data" marker**, although this file and the
  readme both claimed one for a while: a grep on 2026-08-31 found it in no screen, only in
  a stray CSS comment. A screen that needs to say it runs on example data has to say so
  itself.
- `/` and `/verify` sit **outside** that shell and carry no marker. `/verify` collects an
  email, a name and a campus and says nothing about their fate, because the owner removed
  both explanatory notes on 2026-08-26. If a disclosure is wanted back, that is a
  content decision, not a bug.

The marketing site is **dormant, not deleted**: `src/pages/{LandingPage,ForBrandsPage}`,
`src/sections/*` and `src/components/{Nav,NavSheet,Footer,MissionCard,ScrollToHash}` still
exist and still pass their tests, but nothing routes to them. `src/App.jsx` holds the
restore instructions.

**Content authority**, in order: the product specification
(`.superpowers/specs/2026-08-25-axelerate-product-specification.md`) for what is true, the
design system readme for how it sounds and looks, and the app design spec
(`.superpowers/specs/2026-08-26-axelerate-app-h5-design.md`) for recorded departures from
both. The design system's readme describes a different product positioning than the real
spec; take visuals and voice from it, never product claims.
