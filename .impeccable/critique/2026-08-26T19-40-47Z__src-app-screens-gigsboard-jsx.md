---
target: /gigs
total_score: 20
p0_count: 0
p1_count: 4
timestamp: 2026-08-26T19-40-47Z
slug: src-app-screens-gigsboard-jsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Filtering to zero results renders an empty void: `#gigs-grid` measured 0 children, 0px tall, no text |
| 2 | Match System / Real World | 4 | "LV.4 · 2,620 XP away · about 13 missions" translates an abstract number into the student's own unit |
| 3 | User Control and Freedom | 2 | No "clear filters"; the dead end offers no exit |
| 4 | Consistency and Standards | 2 | Format tabs and filter chips are two visual vocabularies for one job; every font size bypasses the token scale |
| 5 | Error Prevention | 3 | Nothing destructive here; filters can silently produce a dead end |
| 6 | Recognition Rather Than Recall | 1 | Tab bar is icon-only for sighted users (`.app__tab-label` is `clip-path: inset(50%)`); chips look like static text at rest |
| 7 | Flexibility and Efficiency | 1 | No search, no sort; `role="tab"` without roving tabindex |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely characterful; undercut by 10.5px type and placeholder boxes filling ~40% of each tile |
| 9 | Error Recovery | 1 | The one failure state offers no recovery |
| 10 | Help and Documentation | 1 | Nothing explains what XP buys or why a tile is locked beyond its distance |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**Not AI-generated.** No eyebrows, no gradient text, no glassmorphism, no hero-metric template, no identical card grid (locked tiles differ structurally, not just in colour). The quest-deck fan, hand-drawn placeholders, scribble-underline chip states and the "about 13 missions" phrasing are specific decisions, not defaults.

Against the product-register test ("would a user fluent in Linear or Stripe trust this?"): mostly yes. The icon-only nav and the affordance-free chips are the two components that would make them pause.

**Deterministic scan** (`detect.mjs`, 2 findings):
- `src/app/parts/parts.css:92` — `transition: padding` on `.ft__tab`, which `[aria-selected]` changes to `10px 10px 18px`. Real: every tab switch reflows the row.
- `src/app/screens/gigs-detail.css:106` — flagged `border-left: 2px solid` as a side-stripe. **False positive**: it is a CSS chevron (`border-left` + `border-bottom` + `rotate(135deg)`), and it is on `/gigs/:slug`, not the board.

**Visual overlay**: not presented. The overlay flow needs a browser window shown to the user; this environment runs headless. Evidence came from headless measurement instead (contrast, touch targets, empty-state DOM).

## What's Working

1. **The price hierarchy is right.** `$15` at 20px/800 next to `+150 XP` at 11px/700 violet. Cash leads, XP supports, and the DOM order puts price first so a screen reader hears it first while CSS `order` restores the drawn layout. Principle 1 holds in both channels.
2. **The locked tile is the best thing on the screen.** Dashed sketch card, greyed price, `LV.4 · 2,620 XP away · about 13 missions`. It states the distance in two units, one of which is the unit the student actually thinks in.
3. **The quest deck earns its space.** Three overlapping cards, violet over pink over ink, tap-to-front. It is the one moment of brand personality above the fold and it does not cost usability.

## Priority Issues

**[P1] Filtering to zero renders nothing at all**
- Measured: all three chips on → `#gigs-grid` has 0 children, height 0px, textContent empty. The student sees the filter row, a void, then the tab bar.
- Why: the most likely reason a board looks broken is a filter the user forgot they set. Nothing names the cause or offers a way back.
- Fix: an empty state that says which filters are active and carries a "Clear filters" button.
- Command: `/impeccable onboard`

**[P1] The tab bar is icon-only for sighted users**
- `.app__tab-label` is `position:absolute; width:1px; clip-path:inset(50%)`. Labels reach screen readers, never eyes.
- Why: bag = Perks and checklist = Application are not guessable. A first-timer taps to find out, which is exactly the recall cost tab bars exist to remove.
- Fix: show the labels at 10-11px under each icon.
- Command: `/impeccable clarify`

**[P1] Filter chips are half the minimum touch target and have no resting affordance**
- Measured 30×22, 60×22, 56×22 against the 44×44 floor. `background: none; border: none` at rest.
- Why: on a phone-only product these are the primary refinement control, and they read as plain text until pressed.
- Fix: resting chip shape (tint fill or hairline), 44px tall including padding.
- Command: `/impeccable adapt`

**[P1] `--text-muted` fails AA everywhere it appears here**
- `#a5a093` = 2.61:1 on white. `.mt__perk` at 10.5px/400 needs 4.5:1. `.mt--locked .mt__pay` at 20px/800 needs 3:1. Both fail.
- Why: PRODUCT.md sets AA as the target, and one of the two casualties is a perk line, which is earnings information.
- Fix: darken the token, or stop using it for text.
- Command: `/impeccable audit`

**[P2] Every font size on the board bypasses the type scale, and eight sit below its floor**
- 10px, 10.5px ×4, 11px ×2, 11.5px, against `--text-xs: 12px`. The design system readme specifies body at 14-16px.
- Why: it is why the board reads as cramped, and it means a scale change in the system will not reach this screen.
- Fix: map each size onto a token; raise anything under 12px.
- Command: `/impeccable typeset`

## Persona Red Flags

**Casey (distracted mobile)**: chips at 22px tall are a miss-tap risk one-handed. Filter state is component-local `useState`, so backgrounding the app and returning resets every filter with no warning. Primary content sits in the top two-thirds; the thumb zone holds only the tab bar.

**Jordan (first-timer)**: four unlabelled icons at the bottom. Nothing on the screen explains what XP is for, why a mission is locked, or what "K-beauty" filters. Taps a chip, the board empties, and there is no message: reads as a broken app, not an over-narrow filter.

**Sam (accessibility)**: `role="tab"` on the format tabs without arrow-key roving tabindex, so all four take a tab stop each instead of behaving as a tablist. Two text colours below AA. The tab bar labels are correctly exposed to assistive tech, which is the one place this screen is ahead of its sighted experience.

**The student between classes** (from PRODUCT.md): arrives asking "is there anything worth my time today?" and gets four tiles with no sort by pay, no sort by time, and no search. `$25+` and `Under 1 hr` are the closest thing, and they are the least visible controls on the screen.

## Minor Observations

- The crown icon on the locked tile aligns to the wrapped second line instead of the first.
- "Sampling ambassador · 2 hours" repeats the "2 hr" already in the meta line below it.
- Format tabs measure 39-43px tall, just under the 44px floor.
- Placeholder art fills roughly 40% of every tile, so tile composition cannot be judged until photography lands.
- `ImageSlot` labels are set in all caps, which the type guidance reserves for mono data labels.
