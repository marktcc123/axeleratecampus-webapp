# Event detail and the public profile — design

**Date:** 2026-08-31
**Repo:** `axelerate-website-h5` (app-only; no design-system change expected)
**Status:** approved by the owner 2026-08-31, ahead of implementation planning

---

## 1. What this builds

Two screens the app does not have.

**An event detail page** at `/app/earn/events/:id`. The board's eight open
events become tappable; the detail carries the photo, the when and where, a
blurb, seats left, a **guest list** of who is going, and one call to action.

**A public profile** at `/user/:handle`. Tapping a guest opens it. It is a card
about a person — name, avatar, campus, level, XP — reachable by anyone holding
the link and readable without an account.

### The reference, and what is taken from it

The owner supplied a screenshot of an event page in the Luma/Partiful family:
dark ground, a masonry grid of guest photos with name, age and a verified tick,
`Guest List ⓘ` with `See more ›`, and an `Interested` button.

**Information, not form** — the same ruling the admin console took. What comes
across: a guest list as a photo grid, names with a verified mark, a "see all"
affordance, and one primary action. What does not: the dark ground, the age
beside each name (this product has no reason to publish a student's age), and
the word *Interested*, which is the reference product's vocabulary.

### What the app has today

Board events are **cards with no destination** — `GigsBoard` renders them and a
code comment records why they are not links: "a card that looks clickable and is
not is the exact promise MissionTile and the shop card were careful not to
make." This design is the somewhere-to-go that comment was waiting for.

`/app/me/events/:date` already exists and is **not** this. It is the ticket stub
for an event the student already holds; a guest list and a "save me a seat"
button both make no sense there. It is out of scope.

---

## 2. The privacy model

This is the part that is a product decision rather than a layout one, so it is
recorded before the screens.

**What appears on a public profile** (owner's choice, 2026-08-31):

| On the page | Deliberately absent |
|---|---|
| Name | **Earnings, in any form** |
| Avatar | Missions completed |
| Campus | Brands worked with |
| Level number and name | Streak, on-time rate |
| XP and distance to the next level | Age |

Two of those absences are worth their own sentence.

**Money never appears.** What a student has earned is between them and the
platform, not something a recruiter, a classmate, or anyone holding a link is
entitled to. The fixture backing this page carries **no money field at all** —
data that does not exist cannot leak through a later careless render.

**Work history is absent because the owner chose that**, and the cost is on the
record: missions completed and brands worked with are the only fields that
evidence the person actually did the work. Without them this page is an identity
card rather than the outward-facing CV the request described — "Level 3 · 2,400
XP" tells an outsider nothing they can read. Adding them later is additive and
needs no restructuring.

**Reachability: link-only, not indexed.** Two mechanisms, because either alone
is insufficient:

1. `public/robots.txt` disallowing `/user/`. Static, served by any host, and the
   thing crawlers actually read first.
2. A `<meta name="robots" content="noindex">` injected on mount and removed on
   unmount. This is a client-routed SPA, so a static tag in `index.html` would
   apply to every route including the app itself.

`robots.txt` alone does not stop a known URL being indexed, and a SPA meta tag
alone is not seen by crawlers that do not execute JavaScript. Together they
cover both. Neither is access control: **anyone with the link can read the
page**, which is what "link-only" means and what the copy on the page should not
overstate.

**A real deployment needs a third thing this build cannot supply**: an
`X-Robots-Tag: noindex` response header, which is server configuration. Noted
in the readme for whoever deploys, not implemented here.

---

## 3. Routing

```
/app/earn/events/:id     AppShell + EventDetail     (inside the app)
/user/:handle            PublicProfile              (standalone, no shell)
```

The profile sits **outside the app shell and outside `/app`**, next to `/` and
`/verify`. It is not part of the app: it is one page shown to someone who may
never have an account, and the tab bar would offer them four destinations they
cannot use.

**The consequence, stated because it is a real seam:** tapping a guest from
inside the app drops the tab bar. That is correct — you have left the app to
look at a card — but it is a visible jump, and the profile therefore carries its
own back affordance rather than relying on the shell's.

---

## 4. Data

### `events.example.json` gains four fields and a guest list

Existing per event: `id, kind, place, title, seatsLeft, photo`.

Added: `date` (ISO), `time` (`"6–9pm"`), `venue`, `blurb`, and
`guests: string[]` — an array of handles, not embedded people. A guest is a
reference so one person appears on several events without their name and level
being copied into each.

### `people.example.json` is new

```
{ handle, name, campus, level, levelName, xp, xpToNext, verified }
```

`handle` is the URL segment (`marktao`). `xpToNext` is the **absolute XP the
next level starts at**, not the remainder — so the bar is `value={xp}
total={xpToNext}` and the distance is subtraction at the render site. Storing a
remainder would go stale against `xp` the moment either moved.

There is no avatar URL. Faces are `ImageSlot` placeholders like every other
image in this app; a profile page is the last place to invent a stock photo of a
person who does not exist. `levelName` mirrors
`levels.example.json` (Explorer · Contributor · Insider · Trusted · Partner) and
a fixture test asserts the pairing, so a profile cannot claim a level name the
ladder does not have.

**No money field exists on this record**, per §2.

### Referential integrity

A fixture test asserts every handle in every event's `guests` resolves to a
person, and that every handle is URL-safe. A guest tile pointing at a 404 is a
broken promise on a page whose whole job is to be shared.

---

## 5. The event detail screen

Top to bottom: photo · title · `kind · place` · date and time · blurb · seats
left · **guest list** · call to action.

**The guest list** is a grid of tiles, each an `ImageSlot` with the person's
name and, when `verified`, a tick. Six tiles at most, then a `See all N` link
that reveals the rest in place — not a second route, because the list is short
enough that a page for it would be ceremony.

Every tile is a link to `/user/:handle`. **They are links, not cards with a
click handler**, so they can be opened in a new tab and read by assistive tech
as what they are.

**The call to action reads "Save me a seat"**, not the reference's *Interested*.
Verb-first, sentence case, the product's own voice. There is no backend, so it
holds session state exactly as the cart and the admin queues do: pressing it
flips the button to **"You're on the list"** and decrements the visible seat
count. A reload restores the fixture, and the app makes that promise everywhere
already.

**Sold out means `seatsLeft === 0`.** No fixture event is at zero today, so one
is set there to make the state real rather than theoretical. Those show the seat
line as `No seats left`, and the button reads `Join the waitlist` — the shop's
own sold-out treatment rather than a third pattern.

The verified tick is `tick-2`, the icon the Me hub already uses beside "verified
student", so one mark means one thing across the app.

---

## 6. The public profile

Avatar · name with verified tick · campus · level name and number · XP against
the next level, drawn with `MarkerBar` · a back affordance.

`MarkerBar` because it is the design system's own form for a share, and because
the profile is the one place an outsider meets this product's game layer — a
progress ring is what the system forbids and a bare number says nothing.

**One line of copy sets expectations**: this is a student's Axelerate profile,
and the page says so plainly rather than implying a résumé it does not carry.

**An unknown handle renders the app's 404**, not an empty profile. A page that
renders a blank card for `/user/nobody` invites guessing at handles.

---

## 7. Out of scope

- **Any backend.** No accounts, no opt-in toggle, no real sharing. The profile
  is a route over fixture data, and every visitor sees the same people.
- **The student's own share button.** The request mentioned a share control that
  generates the page. Generating implies an account and a choice to publish;
  with no backend there is nothing to generate and nothing to consent with.
  **A page that is public by default is exactly what a privacy decision should
  not be**, so the control lands with the backend, not before it.
- `/app/me/events/:date`, the ticket stub. Unchanged.
- Missions and brands on the profile — §2.

---

## 8. Testing

**Unit**: board event cards link to their detail; detail renders when/where and
seats; the guest grid renders one link per handle pointing at `/user/:handle`;
`See all` reveals the rest; the CTA flips and decrements once; a sold-out event
offers the waitlist; the profile renders name/campus/level/XP; an unknown handle
404s; **the profile renders no currency symbol and no money-shaped field**;
fixtures resolve every handle and pair every `levelName` with the ladder.

**e2e**, tagged `@guard` where they earn it: both new routes join the overflow,
touch-floor and WCAG sweeps; the profile carries `robots noindex` while mounted
and the app's own routes do not; the guest grid's tiles clear 44px.

**Screenshots** of both screens at 320 and 390 before either is called done —
every layout defect in this repo has been found that way and none by jsdom.
