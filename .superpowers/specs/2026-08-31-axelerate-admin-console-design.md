# Axelerate admin console — design

**Date:** 2026-08-31
**Repo:** `axelerate-website-h5` (app-only, single repo — no design-system change in this pass)
**Status:** approved by the owner 2026-08-31, ahead of implementation planning

---

## 1. What this builds

Tapping **Admin account** in the Me hub opens a password dialog. Past it sits an
admin console with nine tabs — Analytics, Tasks, UGC Review, Physical Gigs,
Events, Withdrawals, Campuses, Career, Cashback % — each a working queue or
editor running on example data, inside the app's 520px phone column and drawn
entirely in the Axelerate design system.

### The source of truth

The reference is a saved page the owner supplied:
`~/Downloads/Axelerate - Pioneer Campus Platform.html` plus its `_files/`
bundle — a Next.js admin console reading Supabase tables. The rendered snapshot
captured only the Analytics tab; the other eight were recovered from the client
chunk `e67eda075a21f2bc.js`, which carries every panel's labels, actions and
confirmation dialogs.

**The canvas is not the source here.** `H5.dc.html` in Claude Design project
`d024eb9f-078b-4ba6-83bb-686203fc8209` has no admin screen at all — its `meSub`
states are wallet, orders, synd, cocreate, events, level, invite, career,
settings. Nothing about admin needs to be reconciled with it.

### Information from the reference, form from the design system

`PRODUCT.md` lists "an enterprise SaaS admin — grey sidebar, data tables,
dashboard cards, navy" among the things Axelerate is not, and today's
`Admin.jsx` cites that line as its reason for being a plain account screen. The
reference is exactly that excluded thing: near-black ground, red accent,
1440px, cards and tables, plotted charts.

**Ruling (owner, 2026-08-31): take the information, not the form.** Every
number, queue, status and action from the reference survives; its visual
language does not. `PRODUCT.md` stands unamended and needs no exception,
because nothing dark, red, tabular or plotted ships.

---

## 2. Two rules that reshaped the reference — and the owner's override

> **Override, owner, 2026-08-31 (after Phase 1 shipped).** Everything in this
> section was implemented as written and then reversed on sight: *"analytics
> doesn't need this presentation. Line chart and pie chart are still fine.
> Don't use the same progress-bar presentation as the rest of the app — the
> information efficiency is too low. This is an admin dashboard; clear charts
> are the point. Just change the colours."*
>
> **The ruling now:** the design system's "hand-drawn, never plotted" rule and
> its ban on pie charts and gridlines govern the **student-facing product**,
> where the job is charm. The console is an internal operator tool, where
> density wins. So Analytics plots: a two-series line chart and a donut, drawn
> in the brand's violet and butter instead of the reference's red.
>
> The exception is scoped and stated in code at the top of
> `src/app/admin/panels/Analytics.jsx`: nothing outside `src/app/admin` plots
> anything. Two things from the section below survive the override because they
> are not design-system rules at all — **one y axis** (both series are
> denominated in dollars, so a second scale would invent a crossing point) and
> **no invented denominators** (the donut's centre total is the sum of its own
> slices).
>
> A third constraint emerged from the override, and it is the interesting one:
> **the brand's six-hue accent ramp cannot supply a four-way categorical
> palette.** Validated, not eyeballed — coral↔butter is ΔE 0.2 under
> deuteranopia and coral↔pink is 12.9 in normal vision, under the floor of 15.
> Campus share is part-to-whole of one measure, so it takes a **sequential**
> violet ramp, darkest slice largest, every slice named in the legend.

### The rules as originally applied (superseded above)

### The design system forbids plotted charts

The design-system readme, "Data display":

> hand-drawn, never plotted. Tally marks (`TallyCount`) for counts under ~30;
> hatched stroke rows (`MarkerBar` — 18–26 slanted pencil strokes, or
> `shape="dot"` wobbly dots, filled up to the value) for shares and
> comparisons; `StatBlock` for figure + label + a Lacquer aside; the marker
> circle on the ONE figure that matters. **No pie charts, no gridlines, no
> solid progress bars, and no invented denominators** — a figure with no honest
> proportion just stands as type.

So the reference's campus donut is out (pie chart), its dashed gridlines are
out, and its revenue chart is out as a plotted line/area.

### A dual-axis chart is wrong independently

The reference plots `cash_paid` on a left axis and `credits_used` on a right
one. Two y-scales in one frame invent a crossing point that means nothing.
Two measures at different scales become **two charts**, never two axes.

Both rules point the same way, and Analytics is designed around them in §5.

---

## 3. The gate

### Behaviour

1. `Admin account` in the Me hub is a **button**, not a link.
2. It opens a design-system `Dialog` titled "Admin access" holding one password
   `Input` and a footer of Cancel / Unlock.
3. Right password → unlock, navigate to `/me/admin/analytics`.
4. Wrong password → `error` on the Input and a light line in the product's
   voice: *"That's not it. Give it another go?"* Never blame, never "invalid
   credentials".
5. Unlocked state lives in `sessionStorage` and lasts the browser tab. A new
   tab asks again.
6. Reaching any `/me/admin/*` URL while locked redirects to `/me` and opens the
   dialog, so the console is never rendered locked.

`Dialog` already owns focus-trap, Escape-to-close and focus-return — it is used
this way by `GigsBoard`. Do not hand-roll any of it. Pass `initialFocus` so the
password field takes focus on open.

### This is a preview lock, not security

There is no backend. The password is compared in the browser against
`import.meta.env.VITE_ADMIN_PASSWORD`, which means **it ships inside the client
bundle and anyone who opens devtools can read it**. Bypassing it needs no skill
beyond clearing a `sessionStorage` key.

It exists so the console is not stumbled into during a demo. Nothing in the UI
or the docs may describe it as protecting anything. The real check belongs in
Supabase later, and `gate.jsx` is shaped as the seam for it.

### Configuration

- `VITE_ADMIN_PASSWORD` in `.env.example`, documented in the readme, set in
  Vercel's project env.
- A development default so a fresh clone works without a `.env`.

---

## 4. Routing and shell

```
/me/admin                  → redirect to /me/admin/analytics
/me/admin/analytics        AdminShell + AnalyticsPanel
/me/admin/tasks            AdminShell + TasksPanel
/me/admin/ugc              AdminShell + UgcPanel
/me/admin/gigs             AdminShell + GigsPanel
/me/admin/events           AdminShell + EventsPanel
/me/admin/withdrawals      AdminShell + WithdrawalsPanel
/me/admin/campuses         AdminShell + CampusesPanel
/me/admin/career           AdminShell + CareerPanel
/me/admin/cashback         AdminShell + CashbackPanel
```

Nine addresses, so a panel is linkable and the back button steps through tabs
the way a reader expects. The gate guards `AdminShell`, which covers all nine at
once.

`/me/admin/career` and the student's own `/me/career` are different screens at
different paths; no collision.

### AdminShell

Draws, in order:

- `ScreenHeader` with `back={{ as: Link, to: '/me', label: 'Back to me' }}`,
  title **Admin**, note **campus lead**.
- The signed-in identity as one line, from `hub.admin.account` (role, campus,
  email).
- ~~The honesty note: "Example data. Nothing here reaches a real order."~~
  **Removed at the owner's request, 2026-08-31**, together with the header's
  "campus lead" note. The data is still example data; that fact now lives in
  `README.md` and in this spec rather than on screen.
- The tab strip.
- `<Outlet />`.

### The tab strip

Nine tabs do not fit a 520px column, and neither existing pattern is right as
is: the design-system `Tabs` component draws folder tabs sized for four, and
the app's `FormatTabs` (`.ft`) is a plain flex row with no overflow handling —
it has only ever held four.

Build the strip on the **`FilterChips` (`.fc`) pattern**, which already scrolls
horizontally with hidden scrollbars: `overflow-x: auto`, `scrollbar-width:
none`, negative margins so the row bleeds to the column edge and reads as
scrollable. Each tab is a `NavLink` so the active state comes from the router,
and clears 44px of touch height.

Counts appear only on tabs that hold a queue with a pending total — Tasks, UGC
Review, Physical Gigs, Events, Withdrawals, Career. Analytics, Campuses and
Cashback % carry no number, because a count of editable rows is not work
waiting.

---

## 5. Analytics without charts

### Four stat tiles

`StatBlock` (figure + label + note), two across:

| Figure | Label | Note |
|---|---|---|
| Total GMV | TOTAL GMV | total credits used, via `credit()` |
| Daily active | DAILY ACTIVE | signed in today |
| Pending payouts | PENDING PAYOUTS | count awaiting release |
| Total users | TOTAL USERS | verified students |

Each note says something the tile above it does not; no figure appears twice
across the four.

The reference's fourth tile is "Est. CAC — N/A, requires marketing spend data".
A tile whose only content is N/A is a tile that says nothing, and the readme
forbids invented denominators, so it is replaced by Total Users, which the
fixture can state honestly.

### The trend: two stacks, never two axes

Cash and credits each get their **own** `MarkerBar` stack, one under the other,
each with its own heading and its own single hue — cash `color="violet"`,
credits `color="yellow"` (which `MarkerBar` maps to butter-500). One measure per
frame, so no dual axis and no invented crossing point.

The 7 / 30 / 90-day toggle changes the **bucket**, not just the window:

| Range | Buckets | Rows |
|---|---|---|
| 7 days | one per day | 7 |
| 30 days | one per week | 5 |
| 90 days | one per month | 3 |

A stack never exceeds ~7 rows, which is what a 520px column can label without
collision. `MarkerBar`'s hatched strokes are the design system's sanctioned
form for "shares and comparisons" and are explicitly not a solid progress bar.

### Campus share: three labelled rows

Three `MarkerBar` rows, one per campus, each directly labelled with its name
and count. No pie. One hue for all three: identity comes from the row label, so
colour carries nothing, which also avoids the readme's "never two neighbouring
hues side by side".

Because identity is never colour-alone here, **no categorical palette exists in
this build** — there is nothing for a palette validator to check, and none is
required.

---

## 6. The eight queue and editor panels

Every panel is one component in `src/app/admin/panels/`. Rows are flat `Card`s
that expand on tap to show detail, following the pattern the reference uses and
the app already uses in Orders. No `<table>` anywhere.

Status wears `Badge` or `Tag` with a **word**, never a colour alone. Actions are
design-system `Button`s at md or larger, so every one clears 44×44.

| Panel | Rows | Actions |
|---|---|---|
| **Tasks** | Orders needing attention. Expanded: shipping email, line items, credits used | Approve return · Approve cancellation · Mark shipped |
| **UGC Review** | Submissions with status filter chips. Avatar, mission title, reward cash/credits/XP, platform, external link, notes | Approve · Reject with reason |
| **Physical Gigs** | Applicants with status chips. Phone, email, location, date, reward | Approve · Reject · Mark complete |
| **Events** | Applicants grouped by event. Campus, tier | Approve · Decline |
| **Withdrawals** | Two sections: W-9 verification (submitted date) and payouts (amount, fee, net, method, account) | Mark verified · Mark completed · Reject |
| **Campuses** | Schools — colour dot, name, logo | Add school (dialog: name, primary colour, logo URL) · Edit · Remove |
| **Career** | Claims — reward summary, claimed date, certificate upload. Plus two editable reference lists below the queue | Approve · Reject with reason · Save (per list row) |
| **Cashback %** | Rate per category | Edit · Save |

### Two links the reference has that this build does not

- **The W-9 document.** The reference opens a stored PDF in a new tab. There is
  no storage here, so the row states "document not in this preview" instead of
  offering a link that goes nowhere.
- **UGC submission links.** `ugc_link` values in the fixture point at
  `example.com` paths, never at a real post on a real platform. A fixture that
  links to a stranger's actual profile is a fixture that publishes someone.

### Rejection reasons need a multi-line field

The design system has **no `Textarea`**. Adding one is a component-layer change,
which under the standing rule means both repos, a pin bump and the owner's
approval before the fact.

**Decision (owner-approved 2026-08-31):** keep this pass single-repo. Build the
textarea in the admin's own CSS from design-system tokens — 1.5px gray-300
border, `--shadow-paper-inset`, gray-400 on hover, matching `Input` exactly —
and file a design-system issue for a real `Textarea` component. When it lands,
the admin swaps to it and deletes the local styles.

### ~~Do not pass `hint` to any field~~ — withdrawn 2026-08-31

This section claimed `Input` and `Select` render hint text *inside* the wrapping
`<label>`, polluting the accessible name, and told every admin field to
hand-roll a sibling `<p id>` with `aria-describedby`. **It was already false when
this spec was written.** The design system had fixed it: the message is rendered
as a sibling of the `<label>`, with a comment in `Input.jsx` explaining why.

Verified empirically on 2026-08-31 — the `.edu` field's accessible name is
exactly "School email", `aria-describedby` is set, and an exact-match
`getByLabelText` finds it. `Verify.jsx` was never wrong to pass `hint`; the rule
was. Pass `hint` and `error` normally.

### Credit figures

Every credit number goes through `credit()` from `src/app/parts/Money.jsx`,
which renders R1's required pairing — `2,400 credit · $24 in shop`. A bare
credit number is the one thing the product spec says makes the system read as
fake. `tests/unit/money.test.js` fails any file that pairs a literal number
with the word "credit".

---

## 7. Data and state

### The fixture

One new file, `src/data/admin.example.json`, using the reference's **exact
snake_case column names** so it drops in as a Supabase seed:
`cash_paid`, `credits_used`, `w9_submitted_at`, `net_amount`, `reward_key`,
`reward_cash`, `reward_credits`, `xp_reward`, `ugc_link`, `shipping_email`,
`primary_color`, `logo_url`, `claimed_at`, `full_name`, `user_id`.

Collections: `orders`, `ugc_submissions`, `gig_applications`,
`event_applications`, `withdrawals`, `w9_submissions`, `campuses`,
`career_claims`, `cashback_rates`, `daily_totals`.

**Invented figures, not the reference's.** The reference is a development
instance — $52.47 GMV, 14 users, 79% of them "Unknown" campus, and a chart with
no data in it. Copied over, every stack would render empty and the console
would demonstrate nothing. The fixture instead carries plausible
campus-marketplace numbers across ~90 days so the buckets and queues have
something to show. (Owner-approved; say the word to mirror the real instance
instead.)

### The store

`src/app/admin/store.jsx` — an `AdminDataProvider` that loads the fixture into
React state once and exposes the queues plus the mutations:

```
approveReturn(orderId)      approveCancellation(orderId)   markShipped(orderId)
approveUgc(id)              rejectUgc(id, reason)
approveGig(id)              rejectGig(id, reason)          completeGig(id)
approveEventApp(id)         declineEventApp(id)
verifyW9(id)                completePayout(id)             rejectPayout(id)
addCampus(fields)           updateCampus(id, fields)       removeCampus(id)
approveClaim(id)            rejectClaim(id, reason)
setCashbackRate(id, pct)
```

Each mutation removes the row from its queue (or updates it in place), fires a
`Toast`, and recomputes the counts the tab strip shows. **State is
session-only** — a reload restores the fixture. That is deliberate: nothing
here persists because nothing here is real.

This provider is the single seam Supabase replaces, the same role
`src/lib/join.js` `submitJoin()` plays for the join form. Keep every mutation a
plain async-ready function so swapping the body for a query changes no caller.

### Certificate upload

The reference's career panel records only the selected file's **name**,
client-side. Ours does the same — an `<input type="file">` whose `onChange`
stores `files[0].name`. No upload, no persistence, and the UI says so.

---

## 8. What changes in existing files

| File | Change |
|---|---|
| `src/App.jsx` | Nine nested admin routes under an `AdminShell`, plus the `/me/admin` redirect |
| `src/app/screens/Me.jsx` | The `Admin account` row becomes a button that opens the gate dialog |
| `src/app/screens/Admin.jsx` | **Retired.** Superseded by the console — the "what it opens" list is now literally the tab strip |
| `src/data/hub.example.json` | `admin.can` and `admin.note` removed (both were about not having a console). `admin.account` stays and renders in the shell header |
| `tests/unit/admin.test.jsx` | Rewritten for the gate and the shell |
| `tests/e2e/responsive.spec.js` | Nine routes added to the overflow sweep |
| `.env.example`, `README.md` | `VITE_ADMIN_PASSWORD` |

`hub.admin.note` today reads "The console itself is not part of this preview."
Once the console exists that sentence is false, which is why it goes.

---

## 9. Testing

### Unit

- **Gate:** wrong password shows the error and does not navigate; right
  password navigates to Analytics; unlock survives a remount within the
  session; a direct `/me/admin/ugc` while locked lands on `/me` with the dialog
  open; Escape closes without unlocking.
- **Per panel:** the queue renders one row per fixture record; one action per
  panel mutates the queue, fires the toast, and drops the count by one;
  reject-with-reason requires a reason before it will submit.
- **Analytics:** four tiles render their figures; the range toggle changes the
  bucket count (7 → 7 rows, 30 → 5, 90 → 3); no `<table>`, no pie, no element
  named like a gridline.
- **Fixture shape:** every collection present, snake_case keys intact, no
  orphan foreign ids, every referenced campus exists.
- **House rules:** no emoji, no banned register, every credit figure via
  `credit()`, no `hint` prop on any admin field.

### End-to-end

The nine routes join the overflow sweep — 9 routes × 6 widths, roughly +54
checks on top of the existing 47. Plus the guards that exist because sweeps
alone missed real breakage: the tab strip scrolls rather than overflowing the
column, action buttons clear the 44px touch floor measured on their **own** box
(pad the button, not a pseudo-element), and no shadow anywhere carries a blur —
every shadow in this system is a hard offset.

### Screenshot every panel

Non-negotiable, and the reason is on the record: jsdom does no layout, so a
screen can be unreadable with every unit test green. Two bugs shipped exactly
that way — `.pd__back` used for two different elements, and `.ord .ord__row`
scoped under a class the markup no longer had. When a panel is built, screenshot
it, and check that every selector's ancestor scope still exists in the markup.

---

## 10. Out of scope

- **Any backend.** No Supabase, no Shopify, no real auth, no persistence.
- **Any design-system change.** No `Textarea` component, no new tokens, no pin
  bump. Single repo this pass.
- **Real file upload.** Filenames only.
- **Desktop layout.** The console lives in the 520px phone column like every
  other screen; it does not widen into the reference's multi-column grid.
- **`PRODUCT.md` amendment.** Nothing ships that its "not an enterprise admin"
  line excludes.

---

## 11. Sequencing

Three phases, each independently reviewable:

1. **Gate, shell, Analytics** — `gate.jsx`, `store.jsx`, routes, `AdminShell`,
   the tab strip, the fixture, `AnalyticsPanel`. Me's row becomes a button.
   Admin.jsx retired.
2. **The five queues** — Tasks, UGC Review, Physical Gigs, Events,
   Withdrawals, including the reject-with-reason dialog and the local textarea.
3. **The three editors** — Campuses, Career, Cashback %, including the add-school
   dialog and the certificate file input.

Phase 1 leaves the app coherent on its own: the gate works and one panel is
real, with the other eight tabs stating plainly that they are not built yet.

---

## 12. Open items for the owner

- ~~**Design-system issue to file:** `Textarea` component.~~ **Shipped in DS
  `ea6b1d0` and adopted here**; the local control and its styles are deleted.
- **Career's two editable lists.** The reference's career panel carries the
  claim queue plus two editable lists below it — one of named items with an
  "Updated" stamp, one of titled items with a per-row Save. The minified bundle
  gives their shape but not their subject. Implemented as **roles** and
  **pathways** on that reading; correct me if they are something else and the
  labels change with no structural rework.
- Nothing is blocked. Both items can be settled while phase 1 is built.
