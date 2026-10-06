import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MarkerBar } from 'axelerate-design-system';
import AppHeader from '../AppHeader.jsx';
import Icon from '../../components/Icon.jsx';
import Doodle from '../../components/Doodle.jsx';
import { ME, LEVEL_XP, distanceTo, standingFrom } from '../me.js';
import { isLiveBackend } from '../../lib/supabase.js';
import { useAccount } from '../account.jsx';
import levels from '../../data/levels.example.json';
import './unlock.css';

const num = (n) => n.toLocaleString('en-US');

// The gate arrives from levels.example.json as one line with middots between
// its clauses. Split rather than re-entered, so a gate edited on the ladder
// cannot go stale here — the same reason the perks are read and not restated.
// A gate written without middots (level 1's is a sentence) simply stays one row.
const gateParts = (gate) => gate.split('·').map((s) => s.trim()).filter(Boolean);

// Which clauses the student has already cleared (owner, 2026-09-18: tick the
// done ones, leave the rest as they were). The gate is prose on the ladder, so
// the only honest way to tick a clause is to recognise the shapes the ladder
// actually writes and measure those against ME.
//
// Everything else stays unticked. "4.5+ star rating" and "no violations" have
// no figure behind them in this app yet, and an edited gate string that stops
// matching falls through to the same place — which is the direction this has
// to fail. A missing tick understates a student's progress; a false one tells
// them they have cleared a promotion gate they have not.
function gateMet(clause, standing) {
  const checks = [
    [/^([\d,]+)\s*XP$/i, (m) => standing.xp >= Number(m[1].replace(/,/g, ''))],
    [/^(\d+)\+?\s*(?:completed\s+)?missions?$/i, (m) => standing.missionsDone >= Number(m[1])],
    [/^(\d+)\+?\s*brands?$/i, (m) => standing.brands >= Number(m[1])],
    [/^≥\s*(\d+)%\s*on-time$/i, (m) => standing.onTimePct != null && standing.onTimePct >= Number(m[1])],
  ];
  for (const [re, test] of checks) {
    const m = clause.match(re);
    if (m) return test(m);
  }
  return false;
}

// One hue per rung — the ladder's identity colour (owner, 2026-09-18). A perk
// is marked with the colour of the level that opened it, and each card wears
// its own rung's, so the same colour means the same thing in both places.
//
// Five of the system's six accents, in an order that never seats neighbouring
// hues beside each other — the token file's own rule. Lavender is the one left
// out: it is the violet family the owner cut from this deck.
//
// Full strength on the rung you are standing on, and the -soft variant (each
// hue at 22% over white) on every rung above it, so what is yours is solid and
// what is not is drained of it. unlock.css holds that switch.
export const LEVEL_HUE = { 1: 'yellow', 2: 'coral', 3: 'pink', 4: 'orange', 5: 'blush' };

// An icon per perk, for the card you are standing on. Keyed by the perk's own
// words rather than carried in levels.example.json, which stays content: the
// ladder is the same list on /app/unlock/levels, where it is read as text and
// wants no icon at all.
//
// Keying on copy is fragile, so it is not allowed to fail quietly: every perk
// in the fixture must appear here, and tests/unit/unlock.test.jsx fails if one
// does not. A renamed perk breaks the build's tests rather than shipping a
// silent fallback glyph.
export const PERK_ICON = {
  // Explorer
  'Student-exclusive shop': 'bag-line',
  'Drops and free samples': 'gift',
  'Open events': 'calendar',
  // Contributor
  'Public profile goes live': 'user',
  'Early drop window': 'clock',
  'Creator events': 'coffee-cup-2',
  'Limited products': 'crown',
  'Brand badges': 'bookmark',
  'Application priority': 'trend-up',
  // Insider
  '24 hr early drop access': 'clock',
  'Closed events': 'flag-line',
  'Skip review on selected missions': 'tick-2',
  'Pitch your own mission idea': 'bulb',
  'Drops open to you an hour early': 'bell',
  // Trusted
  'Invite-only launches': 'mail',
  'Executive and founder networking': 'message',
  'Internship pipeline': 'rocket',
  'Brand advisory panels': 'analytics',
  'Verified references': 'tick',
  'Creator dinners': 'coffee-cup-2',
  // Partner
  'Direct brand introductions': 'send-2',
  'Internships': 'rocket',
  'Paid retainers': 'trend-up',
  'National campaigns': 'globe',
  'Conferences': 'message',
  'Recommendation letters': 'mail',
  'Campus Lead title': 'crown',
  'Partner-only community': 'heart',
  'Annual Creator Summit': 'star',
};

// One oversized doodle per card, bleeding off a corner at low opacity — the
// quest deck's own treatment, with its placement geometry. The mask takes the
// card's own colour, so these read as ink drawn on the tint rather than as a
// sticker pasted over it. Anchored per art, not per index: a circle wants to
// sit off the corner, an underline wants to run along the foot.
const MARKS = [
  { name: 'circle-violet', style: { top: '-34px', right: '-44px', width: '168px' } },
  { name: 'sparkle-butter', style: { top: '-16px', right: '-14px', width: '92px' } },
  { name: 'underline-volt', style: { right: '-28px', bottom: '16px', width: '178px' } },
];

// The whole ladder as one deck you swipe, your own rung first (owner,
// 2026-09-18). Everything is derived from levels.example.json rather than
// restated beside it, so Unlock and /app/unlock/levels cannot drift apart:
// one of them would have to be edited for the other to be wrong, and there is
// nothing here to edit.
//
// The cards carry a rung and its distance only; what each rung opens is said
// once, below the deck.
function deckFor(level, xp = ME.xp) {
  const next = levels.find((l) => l.level === level + 1) ?? null;

  // Every rung is a card, the ones behind you included (owner, 2026-09-18) —
  // the deck simply opens on the one you are standing on and you can swipe
  // back to what you have already passed.
  const cards = levels.map((r) => {
    const done = r.level <= level;
    const gap = done ? null : distanceTo(r.level, xp);
    return {
      key: r.level,
      level: r.level,
      name: r.name,
      hue: LEVEL_HUE[r.level],
      state: r.level < level ? 'passed' : r.level === level ? 'held' : 'locked',
      held: r.level === level,
      // The level number rides the tab: it was the standing panel's, and the
      // panel came off on 2026-09-18. The rung you are reaching for says so;
      // the ones past it wear the distance instead (R8) — a rung with no
      // number on it reads as a wall rather than a target.
      tab: r.level < level ? `Level ${r.level} · unlocked`
        : r.level === level ? `Level ${r.level} · yours now`
          : r.level === level + 1 ? 'Next up'
            : `${num(distanceTo(r.level, xp).xpAway)} XP away`,
      // Every card carries a bar and a line under it (owner, 2026-09-18), and
      // each one measures YOUR XP against THAT rung's own threshold — so the
      // deck reads as one ladder seen from where you stand rather than as five
      // unrelated meters. A rung you have passed is full: 1/1 rather than
      // ME.xp/LEVEL_XP, because LEVEL_XP[1] is 0 and a bar over a zero total
      // divides to nothing.
      bar: done ? { value: 1, total: 1 } : { value: xp, total: LEVEL_XP[r.level] },
      fig: done ? `${num(xp)} XP` : `${num(xp)} / ${num(LEVEL_XP[r.level])} XP`,
      // R8's unit on every card: the distance in the thing the student
      // actually controls, not XP alone.
      foot: done ? 'Unlocked'
        : `about ${gap.missionsAway} ${gap.missionsAway === 1 ? 'mission' : 'missions'} to ${r.name}`,
    };
  });
  return { cards, next };
}

// The block under the deck describes whichever card you have swiped to (owner,
// 2026-09-18). Pure, and exported, because the thing worth testing here is the
// rule — jsdom has no layout, so the scroll that chooses `active` cannot be
// exercised in a unit test and the arithmetic that reads it would be the only
// thing a rendering test could reach.
//
// A rung you hold shows everything you hold, each perk in the colour of the
// rung that opened it: swiping between Explorer and Contributor should not
// change what you own. A rung you have not reached shows only its own, all in
// its own colour, because that is the question the card is asking.
// Which rung's gate the block at the foot is showing. It follows the deck for
// the same reason the grid does: the heading stopped naming a rung on
// 2026-09-18, so a gate that did not follow would sit under another rung's
// perks and read as that rung's requirements. Swiped to Trusted, it listed
// Insider's 1,200 XP directly beneath Trusted's unlocks.
//
// On a rung you already hold there is no gate left to meet, so it falls back to
// the next one — which is what the page opens on, and the actionable one.
export function gateRungFor(level, active) {
  return levels.find((l) => l.level === (active > level ? active : level + 1)) ?? null;
}

export function holdingsFor(level, active) {
  if (active > level) {
    const rung = levels.find((l) => l.level === active);
    return {
      heading: 'Unlock next',
      items: rung.perks.map((perk) => ({ perk, level: rung.level, hue: LEVEL_HUE[rung.level] })),
    };
  }
  return {
    heading: 'Available now',
    items: levels.filter((l) => l.level <= level)
      .flatMap((l) => l.perks.map((perk) => ({ perk, level: l.level, hue: LEVEL_HUE[l.level] }))),
  };
}

export default function Unlock() {
  const live = isLiveBackend();
  const { xp: liveXp, applications, ready: accountReady } = useAccount();
  const ready = !live || accountReady;
  const standing = live && accountReady ? standingFrom(liveXp, applications) : ME;
  const { cards } = deckFor(standing.level, standing.xp);
  const deckRef = useRef(null);
  const hereRef = useRef(null);
  const [active, setActive] = useState(standing.level);
  const { heading, items } = holdingsFor(standing.level, active);
  const gate = gateRungFor(standing.level, active);

  // The deck opens on the rung you are standing on, with the ones you have
  // already passed behind it (owner, 2026-09-18). In an effect, not in a lazy
  // initialiser: this repo has already shipped a StrictMode bug where a lazy
  // initialiser both read and wrote, and double invocation ate the write.
  //
  // .ud is positioned so a card's offsetParent is the deck itself, which makes
  // offsetLeft the distance from the deck's padding box — the 16px that
  // scroll-padding-left insets the snapport by. Subtracting it lands the card
  // exactly on its own snap point. jsdom reports 0 for every offset, so this
  // is a no-op under test rather than a wrong scroll.
  useEffect(() => {
    setActive(standing.level);
  }, [standing.level]);

  useEffect(() => {
    if (!ready) return undefined;
    const deck = deckRef.current;
    const card = hereRef.current;
    if (!deck || !card || !card.offsetLeft) return undefined;
    deck.scrollLeft = card.offsetLeft - 16;
    return undefined;
  }, [ready, standing.level]);

  // Which card the deck is parked on: the one whose own snap point is nearest
  // the current scroll position. Read off the same offsetLeft arithmetic the
  // opening scroll uses, so the two cannot disagree about where a card starts.
  // jsdom reports 0 for every offset, which makes this pick card one and stay
  // there — inert under test rather than wrong.
  const onDeckScroll = () => {
    const deck = deckRef.current;
    if (!deck) return;
    let best = null;
    let bestGap = Infinity;
    for (const el of deck.children) {
      const gapPx = Math.abs((el.offsetLeft - 16) - deck.scrollLeft);
      if (gapPx < bestGap) { bestGap = gapPx; best = el; }
    }
    if (best) setActive(Number(best.dataset.level));
  };

  if (!ready) {
    return (
      <div className="scr ul">
        <AppHeader />
        <h1 className="sr-only">Unlock</h1>
        <p className="ul__away">Loading your ladder…</p>
      </div>
    );
  }

  return (
    <div className="scr ul">
      <AppHeader />
      {/* The tab's own word, for a screen reader. The page opens on standing,
          not on a title that repeats the tab it was reached from. */}
      <h1 className="sr-only">Unlock</h1>

      {/* No heading over the deck (owner, 2026-09-18). The panel above has just
          named the rung you are on and how far the next one is, so a heading
          here would say it twice; the cards carry their own labels. The section
          keeps an accessible name for anyone who cannot see where it sits. */}
      <section className="ul__deck" aria-label="Your ladder">
        {/* A card is a rung and its distance, and nothing else (owner,
            2026-09-18): the perks came off them. What each rung opens is said
            once, below — on the cards it was the same list twice over, and it
            made the deck a wall of text to swipe through rather than a ladder
            to read. */}
        <div className="ud" data-testid="unlock-deck" ref={deckRef} onScroll={onDeckScroll}>
          {cards.map((c, i) => (
            <article
              key={c.key}
              ref={c.held ? hereRef : undefined}
              className={`ud__card ud__card--${c.hue}`}
              data-testid="rung-card"
              data-state={c.state}
              data-level={c.level}
            >
              <Doodle name={MARKS[i % MARKS.length].name} style={{ position: 'absolute', ...MARKS[i % MARKS.length].style }} />
              <p className="ud__tab">{c.tab}</p>
              <h3 className="ud__title">{c.name}</h3>
              {/* The bar rides the card you are standing on (owner,
                  2026-09-18), which is the card it describes: it is how far
                  this rung is from the next one. Hatched strokes, not a solid
                  bar — Principle 4 holds that data in the student-facing app
                  is drawn by hand, and this is the component the ladder uses.

                  40 strokes at a 2px gap, Me's density: the gap has to come
                  down with the count, because 40 strokes at the component's
                  default 6px need 394px of min-content against a 320px
                  column's 288px. `inverse` is MarkerBar's own prop for a dark
                  ground, and --hb-on is set through `style`, which the
                  component spreads last precisely so callers can — white
                  strokes, because the level violet is invisible on coral. */}
              {/* The figures the standing panel used to carry above the deck
                  (owner, 2026-09-18: that block came off), on every card now
                  rather than only the one you stand on. The hand-set "820 XP
                  to Insider" went with the panel: the fraction already says
                  it, and it was the line the hand face rendered as "82.0".

                  Hatched strokes, not a solid bar — Principle 4 holds that
                  data in the student-facing app is drawn by hand, and this is
                  the component the ladder uses. 40 strokes at a 2px gap, Me's
                  density: the gap has to come down with the count, because 40
                  at the component's default 6px need 394px of min-content
                  against a 320px column's 288px.

                  Ink strokes on the soft cards, white on the one you hold.
                  Measured, each accent against its own -soft ground is 1.39
                  to 2.68:1 — under the 3:1 a graphic needs — so the filled
                  strokes cannot be the rung's own hue. `inverse` and --hb-on
                  are MarkerBar's own API; it spreads `style` last precisely so
                  callers can set them. */}
              <div className="ud__standing">
                <MarkerBar
                  value={c.bar.value}
                  total={c.bar.total}
                  inverse={c.held}
                  ticks={40}
                  height={16}
                  style={{
                    width: '100%',
                    '--hb-gap': '2px',
                    '--hb-on': c.held ? 'var(--text-inverse)' : 'var(--ink-900)',
                    ...(c.held ? null : { '--hb-off': 'rgba(23, 16, 41, 0.16)' }),
                  }}
                />
                <p className="ud__fig">{c.fig}</p>
                <p className="ud__away">{c.foot}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* What the card you have swiped to opens, drawn rather than listed
          (owner, 2026-09-18): a marked icon beside its name, two to a row. On a
          rung you hold that is everything you hold, each perk in the colour of
          the rung that opened it — which rung is no longer a heading, it is the
          mark. On a rung you have not reached it is that rung's own, in that
          rung's colour. */}
      <section className="ul__now" aria-labelledby="now-h">
        <h2 id="now-h" className="ul__h2" data-testid="holdings-h">{heading}</h2>
        <ul className="ul__grid">
          {items.map(({ perk, level, hue }) => (
            <li key={perk} className="ul__tile" data-state={level <= standing.level ? 'held' : 'locked'} data-testid="unlock-perk" data-level={level}>
              {/* A drawn mark, never a tick: a tick means one thing on this
                  screen — a gate requirement you have cleared — and a perk you
                  hold is not that.

                  The chip carries the rung's hue and the glyph stays ink: all
                  five accents clear 4.5:1 against ink and none of them clears
                  3:1 against white, so colouring the glyph itself would have
                  made three of the five rungs invisible. */}
              <span className={`ul__chip ul__chip--${hue}`}>
                <Icon name={PERK_ICON[perk]} size={24} className="ul__tile-icon" />
              </span>
              <span className="ul__tile-t">{perk}</span>
            </li>
          ))}
        </ul>
      </section>

      {gate && (
        /* What nothing else on the page says: XP is not the only gate. Written
           out rather than pinned to a sticky note (owner, 2026-09-18) —
           restating the distance here would only repeat the card above it, so
           this block carries the rest of the test. It is the page's one
           heading now, at the size the band headings used to be. */
        <section className="ul__gate" aria-labelledby="gate-h">
          {/* The heading and the reference on one row (owner, 2026-09-18).
              §5.1 keeps the full ladder and the published formula one level
              below this screen, and a heading row is where a "see all of it"
              belongs. R2's auditability is untouched — the XP formula is still
              published at /app/unlock/levels; the label stopped announcing it.
              "Level up", which sent the student back to the board, came off the
              same day: §8 is carried by the tab bar now, which is the one thing
              on every screen that cannot be swiped past. */}
          <div className="ul__sechead">
            {/* "To unlock next", not "What Insider asks for" (owner,
                2026-09-18). Note it sits close to the grid heading above it,
                which reads "Unlock next" whenever you have swiped to a rung you
                have not reached — the two are one word apart on the same
                screen. */}
            <h2 id="gate-h" className="ul__h2">To unlock next</h2>
            <Link to="/app/unlock/levels" className="ul__ladder">Full ladder &rarr;</Link>
          </div>
          {/* One requirement per row (owner, 2026-09-18): five clauses on one
              line read as a sentence you skim past, five rows read as five
              things to do. */}
          <ul className="ul__gate-list">
            {gateParts(gate.gate).map((g) => {
              const met = gateMet(g, standing);
              return (
                <li key={g} data-testid="gate-part" data-state={met ? 'met' : 'open'}>
                  {/* A tick for a cleared clause; the open ones keep the hollow
                      mark. Both sit in a 13px slot so the two kinds of row
                      start their text on the same edge. */}
                  {met
                    ? <Icon name="tick-2" set="solid" size={13} className="ul__gate-mark" />
                    : <span className="ul__gate-mark ul__gate-mark--open" aria-hidden="true" />}
                  <span className="ul__gate-t" data-testid="gate-clause">{g}</span>
                  {/* Icon renders aria-hidden, so the tick's meaning is said
                      rather than drawn for anyone not looking at it. */}
                  {met && <span className="sr-only">already met</span>}
                </li>
              );
            })}
          </ul>
          {/* The way to the missions that clear these rows (owner, 2026-09-21:
              "under To unlock next, Find missions to level up"). Not a button
              in the end — the filled and the framed ones were both turned down
              — but the board's own highlighter swipe (mission-tile.css
              .mt__pay): the words in the display face with the yellow marker
              behind them, chosen from six renderings (owner: "B"). "Level up"
              as a bare link came off on 2026-09-18; this is the owner putting
              the way back, under the list it serves. */}
          <Link to="/app/earn" className="ul__find" data-testid="find-missions">
            <span className="ul__find-t"><span className="ul__find-w">Find missions to level up <span aria-hidden="true">&rarr;</span></span></span>
          </Link>
        </section>
      )}


    </div>
  );
}
