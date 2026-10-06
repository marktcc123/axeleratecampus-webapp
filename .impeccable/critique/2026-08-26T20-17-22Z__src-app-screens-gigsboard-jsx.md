---
target: /gigs
total_score: 25
p0_count: 0
p1_count: 0
timestamp: 2026-08-26T20-17-22Z
slug: src-app-screens-gigsboard-jsx
---
## Design Health Score

Second run. Four P1s from run 1 are fixed and measured; search, sort and
contextual help were deferred by the owner.

| # | Heuristic | Score | Δ | Key Issue |
|---|-----------|-------|---|-----------|
| 1 | Visibility of System Status | 3 | +1 | Empty state names the active filters; a live region carries the count. No loading states, but nothing is async yet |
| 2 | Match System / Real World | 4 | — | Still the strongest dimension |
| 3 | User Control and Freedom | 3 | +1 | Clear filters is a real exit, but only reachable from the empty state |
| 4 | Consistency and Standards | 3 | +1 | Chips and tabs now share one control vocabulary; eight font sizes still bypass the token scale |
| 5 | Error Prevention | 3 | — | Unchanged |
| 6 | Recognition Rather Than Recall | 3 | +2 | Tabs are labelled and chips read as controls; nothing yet explains what XP buys |
| 7 | Flexibility and Efficiency | 1 | — | No search or sort, deferred by the owner |
| 8 | Aesthetic and Minimalist Design | 3 | — | Controls improved; type still cramped below the scale's floor |
| 9 | Error Recovery | 3 | +2 | The one failure state now recovers in one tap |
| 10 | Help and Documentation | 1 | — | Unchanged |
| **Total** | | **25/40** | **+5** | **Acceptable — the ceiling now sits on the two deferred items** |

## What changed

**[was P1] Filtering to zero rendered nothing.** The tabpanel keeps its id and aria wiring and swaps only its layout class. Empty case names what is on ("Digital and $25+ are on. Drop one and see what opens up.") and carries a Clear filters button at 48px. A visually-hidden `role="status"` announces the count on every filter change, worded as a count so it does not repeat the visible copy.

**[was P1] The tab bar was icon-only for sighted users.** `clip-path` removed; labels render at 10px under each icon. The shape moved from pill to `--radius-hand` because a stadium curves inward exactly where "Application" sits and the ring cut through it. Bar still measures 310px, so 320px viewports fit.

**[was P1] Chips were 22px with no resting affordance.** Now 44px white pills with a hairline inset ring on the cream panel. The butter scribble survives as the pressed state, repositioned off `bottom` where the new radius clipped it.

**[was P1] `--text-muted` failed AA everywhere it appeared.** `#A5A093` (2.61:1) to `#767166` (4.86:1 on a white card, 4.53:1 on the panel), holding the ramp's hue and staying visibly lighter than `--text-secondary`. All eight text tiers on the board now clear AA, measured.

**[was P2] `transition: padding` on the format tabs** is gone, so switching tabs no longer reflows the row. That was the detector's `layout-transition` finding; the scan is now clean apart from the same false positive.

**Also fixed on the way**: format tabs were 39-43px and are now 44+, so zero controls on the board sit under the touch floor.

**Five e2e guards added**: the 44px floor across every control, visible tab labels, the bar fitting 320px, the empty state's round trip, and a WCAG AA sweep that computes each text tier's ratio against its first painted ancestor background and picks the 3:1 or 4.5:1 threshold from rendered size and weight.

## What still holds the score down

Two of the three remaining low scores are deferred by choice, not oversight:

- **Flexibility (1)**: no search, no sort. The owner deferred both until real data replaces the four-mission fixture. With four missions the cost of skipping is near zero; it grows with the catalogue.
- **Help (10) (1)**: nothing on the board explains what XP buys, why a tile is locked beyond its distance, or what K-beauty filters. This is the largest untouched gap and no command was pointed at it.
- **Type scale (inside 4 and 8)**: eight hardcoded sizes below `--text-xs` (12px), against a design system that specifies body at 14-16px. `/impeccable typeset` was scoped out of this pass.

## New finding

**The solid `checklist` icon is unusable.** Rendered at 64px through the same `.ax-icon` mask path the tab bar uses, it is a filled square with no internal detail, while rocket, bag and user all read cleanly. Filling the outline clipboard swallowed its tick marks. This is an asset defect in `axelerate-design-system/assets/icons-solid/checklist.svg`, not something the app should paper over. It cost little while the tab was unlabelled and costs less now that "Application" is written underneath, but the icon carries no meaning.
