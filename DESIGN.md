---
name: Axelerate
description: Paid brand missions for verified college students, on a phone, between classes.
colors:
  brand-violet: "#6E2BEE"
  brand-violet-strong: "#5A1BCF"
  brand-violet-soft: "#F6F3FF"
  brand-butter: "#FFC93C"
  lilac: "#C2A4FF"
  lilac-soft: "#EDE5FF"
  coral: "#FF6B4A"
  cyan: "#28C3EE"
  lime: "#9BD22B"
  pink: "#E5237E"
  ink: "#171029"
  page: "#FFFFFF"
  ground: "#F8F7F4"
  rule: "#EFEDE7"
  pencil: "#A5A093"
  text-secondary: "#615D53"
  text-muted: "#767166"
  danger: "#C7333B"
typography:
  display:
    fontFamily: "DynaPuff, Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Bricolage Grotesque, Instrument Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, Instrument Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Instrument Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Gabarito, Instrument Sans, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.09em"
  annotation:
    fontFamily: "Lacquer, Bricolage Grotesque, cursive"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  hand-sm: "9px 11px 8px 12px/11px 9px 12px 8px"
  hand: "14px 17px 13px 18px/17px 14px 18px 13px"
  hand-lg: "18px 22px 17px 23px/22px 18px 23px 17px"
  ground: "22px 22px 0 0/18px 18px 0 0"
  pill: "999px"
spacing:
  "2xs": "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand-violet}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
    typography: "{typography.title}"
  button-secondary:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.brand-violet-strong}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  card:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hand}"
    padding: "{spacing.lg}"
  card-flat:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hand}"
    padding: "{spacing.md}"
  ground-panel:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ground}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hand-sm}"
    padding: "0 12px"
    height: "44px"
  badge:
    backgroundColor: "{colors.lilac-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 11px"
    height: "24px"
  tab-bar-blob:
    backgroundColor: "{colors.lilac-soft}"
    rounded: "58% 42% 52% 48%/48% 60% 40% 52%"
    size: "40px"
---

# Design System: Axelerate

## 1. Overview

**Creative North Star: "The Campus Bulletin Board"**

A cork board outside a lecture hall, three weeks into term. Flyers overlap at slight
angles because someone pinned them in a hurry. A drop is announced on a card that is
literally a card. Someone has circled a number in marker. A note in the margin says
"takes 30 seconds, promise" in handwriting that is not the flyer's handwriting. Nothing
on the board is generated; every piece was made by a person and put there by a person.

That is the whole thesis. This is a phone-first H5 for students between classes, so the
board is dense and everything on it is legible in one pass, but density never becomes
uniformity: a mission tile, a quest card, a folder and a ticket stub are four different
objects and they look like four different objects. Colour is carried by the paper, not
by the wall. The wall is white; the ground under a list is a warm off-white; the colour
is on the things pinned to it.

The system rejects three specific things, named by the owner. It is not **a job board**:
never rows of near-identical listings with a filter rail outweighing the content. It is
not **a creator-commerce feed**: never cover images wall-to-wall with follower counts as
the headline. It is not **an enterprise SaaS admin**: never a grey sidebar, never data
tables, never dashboard cards, never navy. The third is the easiest to drift into when
building app screens rather than marketing pages, and it is the one to check for.

Gamification is deliberately **not** rejected. XP, levels, streaks and quests are wanted
and should be pushed with confidence.

**Key Characteristics:**

- Hand-drawn geometry: wobbly radii, flat offset shadows, marker circles, tally strokes
- Colour lives on paper objects, never on page backgrounds or navigation chrome
- Five type families, each with one job, and a five-rung size ladder
- Nothing in the system blurs and nothing moves on hover
- Every control clears a 44px touch target, whatever the drawn ink measures

## 2. Colors

One brand purple, one brand yellow, an ink, a warm neutral ramp, and eight punchy
accents that belong exclusively to paper objects.

### Primary
- **Marker Violet** (`#6E2BEE`): The brand. Primary buttons, the active tab, quest
  cards, links, the circle drawn around a figure that matters. On a white page it is
  6.53:1, so it carries text as well as fills.
- **Deep Violet** (`#5A1BCF`): Text-weight violet. Every violet that has to be *read*
  rather than seen, and the ghost button's label.
- **Violet Wash** (`#F6F3FF`): The soft ground under a violet-tinted surface.

### Secondary
- **Butter** (`#FFC93C`): The second brand colour and the only one that competes with
  violet. Highlighter scribbles, the tape across a dialog, the Levels band, sparkle
  doodles. Ink text on it, never white.

### Tertiary
The accent family. Each one is a single saturated hue with a soft companion, and each
appears on **paper objects only**: folders, bubbles, sticky notes, stickers, the blob
behind a tab icon.

- **Lilac** (`#C2A4FF`) and **Lilac Wash** (`#EDE5FF`): Co-creations, the Gigs tab, the
  numbered circles on a ladder.
- **Coral** (`#FF6B4A`): Invite. Carries **ink** text, never white: white on coral is
  2.82:1, under even the 3:1 large-text bar.
- **Cyan** (`#28C3EE`): Career, the Application tab.
- **Lime** (`#9BD22B`): Crew and "done" states.
- **Pink** (`#E5237E`): The deepest application folder; the one accent allowed to be
  loud.

### Neutral
- **Ink** (`#171029`): All primary text, the Syndicate hero, the shop's cart button.
  Violet-black, not neutral-black.
- **Page** (`#FFFFFF`): The wall. Every screen starts here.
- **Ground** (`#F8F7F4`): The warm off-white under a full-bleed panel: the missions
  board, the shop grid, the Me menu, a ticket stub.
- **Rule** (`#EFEDE7`) and **Pencil** (`#A5A093`): List dividers and drawn strokes.
- **Text Secondary** (`#615D53`) and **Text Muted** (`#767166`): The two greys that
  clear AA on both Page and Ground. Nothing lighter is allowed to carry words.

### Named Rules

**The Paper Objects Rule.** Accents belong to things you could pick up: folders,
bubbles, notes, stickers, cards. They are never a page background and never navigation
chrome. The wall stays white.

**The Navigation Stays Core Rule, and its one exception.** Tabs, segmented switches and
nav chrome use violet, white and ink only. The bottom tab bar is the exception: each of
its four fixed destinations carries its own soft accent behind the active icon (lilac /
butter / cyan / coral), so a glance at the colour says where you are before the icon is
read. Four destinations that never reorder can be learned as colours; a variable nav
cannot, which is why the exception stops there.

**The Measured Band Rule.** Text on a coloured band is measured, never assumed. Four of
the five bands in this app failed AA as first drawn, and coral with white text was
2.82:1. If a band is new, compute the ratio before shipping it: large text needs 3:1,
everything else 4.5:1.

## 3. Typography

**Display Font:** DynaPuff (with Bricolage Grotesque, system-ui)
**Body Font:** Instrument Sans (with system-ui, -apple-system)
**Headline Font:** Bricolage Grotesque (with Instrument Sans, system-ui)
**Label Font:** Gabarito (with Instrument Sans, system-ui)
**Annotation Font:** Lacquer (with Bricolage Grotesque, cursive)

**Character:** Five families is two more than most systems should carry, and it is a
committed choice rather than an accident: each family has exactly one job and they never
substitute for one another. DynaPuff is a soft, round, almost inflated display face used
only for the name of the screen you are on. Bricolage does the numbers and the headings,
tightly tracked. Instrument Sans reads. Gabarito stamps caps labels and tallies.
Lacquer is the only handwriting, and it is only ever a note in the margin.

### Hierarchy

The app commits to **five rungs**, in rem so a reader's own browser size and 200% zoom
both work: 10 / 12 / 15 / 18 / 22px at ratios 1.20-1.25. Weight, family and colour carry
the rest of the hierarchy.

- **Display** (DynaPuff, 600, 1.375rem/22px, uppercase, +0.01em): The screen's own name.
  One per screen, always the h1, never inside a component.
- **Headline** (Bricolage, 800, 1.125rem/18px, -0.02em): Money, XP, prices, counts. The
  figures a student came for.
- **Title** (Bricolage, 700, 1.125rem/18px, -0.01em): Section headings and card titles.
- **Body** (Instrument Sans, 400, 0.9375rem/15px, 1.55): Prose, list rows, UI text. The
  workhorse. `--text-md` (16px) is its wide-measure alternate for the gate and legal
  pages, not a step above it.
- **Label** (Gabarito, 700, 0.625rem/10px, uppercase, +0.09em): Caps labels, stamps,
  stock counts, metadata. `tabular-nums` on anything that counts.
- **Annotation** (Lacquer, 0.9375rem/15px, rotated -1.5° to -2°): The margin voice.

### Named Rules

**The Five Rungs Rule.** Every font size names a rung; no stylesheet writes a number.
Picking a size by eye is what produced 130 hardcoded values across 25 sizes down to 9px
before the ladder existed.

**The One Note Rule.** Lacquer is one short phrase per view, tilted off the baseline,
never a sentence, and never anything the screen cannot be read without. If it carries
information, it is a lede in body type, not a note.

**The Sentence Case Rule.** Sentence case everywhere, headlines and buttons included. The
only uppercase in the system is the DynaPuff screen title and the Gabarito caps label,
both of which are stamps rather than sentences.

## 4. Elevation

Nothing in this system blurs. Every shadow is a **flat offset**: an ink or violet copy of
the shape, moved down and right by two or three pixels with a blur radius of zero, the
way one sheet of paper sits on another under a hard light. There is no ambient shadow, no
elevation ramp, and no `filter: blur()` anywhere in the component layer.

Depth is therefore not a gradient of altitude but a binary: a thing is either lying flat
on the ground or it is a separate sheet resting on top.

### Shadow Vocabulary
- **Paper** (`box-shadow: 2px 3px 0 rgba(23,16,41,.10)`): One sheet on another. Cards,
  badges, buttons, ticket stubs.
- **Paper Lifted** (`box-shadow: 4px 6px 0 rgba(23,16,41,.13)`): The hover state, and
  the only thing hover changes.
- **Paper Inset** (`box-shadow: 2px 2px 0 rgba(23,16,41,.05)`): A sheet pressed into the
  surface.
- **Die-cut** (`box-shadow: 0 0 0 2.5px #FFFFFF`): Not a shadow. The white keyline of a
  cut sticker, always composed *before* a paper shadow in the same declaration.
- **Hand** (`box-shadow: 3px 4px 0 rgba(110,43,238,.16)`): The violet variant, for
  objects that sit on a violet ground.

### Named Rules

**The Ground Casts No Shadow Rule.** A full-bleed panel is the ground the screen stands
on, and ground does not cast a shadow: the missions board, the shop grid and the Me menu
all set `box-shadow: none`. Only things resting on that ground cast. When a panel runs
edge to edge, a shadow shows along its top lip only, and that reads as a stray line
rather than as depth.

**The Nothing Moves Rule.** Hover raises the shadow and may wash the surface. It never
translates, never tilts, never scales. Tilt is a *resting* property in this system: cards
and folders are drawn at ±1-4° and stay there. If an element moves under the cursor, it
is wrong.

## 5. Components

**Character: die-cut and stuck on.** Buttons and badges carry a 2.5px white keyline plus
a flat shadow, which is literally the anatomy of a sticker peeled off a sheet. Corners are
wobbly because a person cut them.

### Buttons
- **Shape:** Fully round (`999px`). One corner style, no exceptions.
- **Primary:** Marker Violet fill, white label, die-cut keyline over a paper shadow.
  44px tall (`md`), 18px horizontal padding, Bricolage 700.
- **Secondary:** White fill, ink label, a 4px pencil-grey ring standing in for a border.
- **Ghost:** No fill, Deep Violet label, 2px of bottom padding so the label sits on an
  implied baseline.
- **Hover / Focus:** The shadow lifts to Paper Lifted. Nothing moves. Focus draws a 2px
  violet outline at 2px offset.
- **Sizes:** `sm` 32px, `md` 44px, `lg` 48px. **`sm` is below the touch floor and is
  forbidden as a screen's only route forward**; it exists for controls that sit beside a
  larger target.

### Chips
- **Style:** White pill on the ground panel with a hairline inset ring, 44px tall.
- **State:** Selected draws a butter highlighter scribble underneath, not a fill swap.

### Cards / Containers
- **Corner Style:** Wobbly (`--radius-hand`, four different radii per corner). Small and
  large variants exist; nothing uses a uniform radius.
- **Background:** White by default; `quiet` for the warm off-white; `tint` for a whole-card
  accent; `ink` for the inverse; `sketch` for a dashed empty slot.
- **Shadow Strategy:** Paper at rest, Paper Lifted on hover. `flat` rests with no shadow
  at all, for a card sitting on a panel that already carries one.
- **Hover:** `interactive` raises the shadow and washes the surface 5% toward ink;
  `interactive="shadow"` raises the shadow alone, for a card whose only click target is a
  control inside it.
- **Internal Padding:** 16 / 24 / 32px (`sm` / `md` / `lg`).

### Inputs / Fields
- **Style:** No box. A warm off-white fill with a 2px pencil line along the bottom edge
  only, and wobbly corners at the top. 44px tall.
- **Focus:** The bottom line turns violet and a butter highlighter sweeps across the
  bottom 9px of the field, `inset 0 -9px 0`. This is the system's signature interaction.
- **Label:** Gabarito caps, 10.5px, +0.07em, above the field. The hint or error is a
  sibling of the label, never nested inside it, so the accessible name stays the label
  alone.

### Navigation
- **Bottom tab bar:** A floating white pill, 16px off the floor. Four transparent 52px
  buttons carrying outline icons at 30-32px. The current tab grows a hand-drawn blob
  behind its icon in that tab's own tint, rotated -8° and scaled from 0. Labels are
  visually hidden; the blob and the icon carry the state.
- **Screen header:** A back chevron drawn from two rotated borders, the name of the place
  you came from in caps, the screen title in DynaPuff, and one Lacquer note. On a coloured
  band its colours come from `--sh-ink` / `--sh-muted` / `--sh-note`.

### Paper Objects
The playful layer, and the reason the board reads as a board. **Folders** (`FileCard`)
fan 3-5 across a section, overlapping -14 to -18px with alternating ±1-4° tilts, each a
different tint, tab label in caps. **Speech bubbles** carry quotes with the tail pointing
back at the speaker. **Sticky notes** hold one aside per view. **Die-cut stickers**
punctuate, 2-3 per view, always overlapping an edge. Never stack all four in one section.

### Data, drawn by hand
Counts are **tally marks** (`TallyCount`) under about 30. Shares are **hatched stroke
rows** (`MarkerBar`), 18-26 slanted pencil strokes. The one figure that matters gets a
**marker circle** drawn around it. No pie charts, no gridlines, no solid progress bars,
and no invented denominators.

## 6. Do's and Don'ts

### Do:
- **Do** name a rung for every font size: 10 / 12 / 15 / 18 / 22px. Never write a number
  into a stylesheet.
- **Do** give every control a 44px target even when the drawn ink is smaller. Use
  transparent padding or a `::before` circle; the target is sized, not the ink.
- **Do** measure contrast on any new coloured band before shipping it. Four of this app's
  five bands failed AA as first drawn.
- **Do** keep tilt as a resting property. Cards and folders are drawn at ±1-4° and stay
  there.
- **Do** let a full-bleed panel run off the bottom of the screen. It is the ground; it
  reaches the floor.
- **Do** change components in `axelerate-design-system` and reach the app by bumping the
  pinned SHA. An app rule at (0,1,0) competing with an `ax-*` class loses the tie, because
  the system injects each component's style at JS-execution time, after the bundle.

### Don't:
- **Don't** build **a job board**. No rows of near-identical listings, no filter rail that
  outweighs the content, never everything the same size.
- **Don't** build **a creator-commerce feed**. No cover images wall-to-wall, no follower
  counts as the headline.
- **Don't** build **an enterprise SaaS admin**. No grey sidebar, no data tables, no
  dashboard cards, no navy. This is the easiest drift when building app screens rather
  than marketing pages.
- **Don't** move anything on hover. No translate, no tilt, no scale. The shadow lifts and
  that is all.
- **Don't** blur. If a shadow has a blur radius, it is not from this system.
- **Don't** put an accent on a page background or on navigation chrome. Accents are for
  paper objects. The bottom tab bar's four tints are the one recorded exception.
- **Don't** put white text on coral (2.82:1) or any other band colour you have not
  measured.
- **Don't** use `border-left` or `border-right` greater than 1px as a coloured stripe.
- **Don't** let Lacquer carry information. If the screen cannot be read without it, it is
  not a note.
- **Don't** hold gamification back. XP, levels, streaks and quests are wanted; the
  guardrail is that a level never buys a higher rate, not restraint for its own sake.
