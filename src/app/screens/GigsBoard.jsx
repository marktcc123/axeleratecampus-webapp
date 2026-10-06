import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Dialog } from 'axelerate-design-system';
import AppHeader from '../AppHeader.jsx';
import FeaturedCard from '../parts/FeaturedCard.jsx';
import { useContent } from '../content.jsx';
import { pickForYou } from '../parts/when.js';
import FormatTabs from '../parts/FormatTabs.jsx';
import FilterChips from '../parts/FilterChips.jsx';
import MissionTile from '../parts/MissionTile.jsx';
import Icon from '../../components/Icon.jsx';
import quests from '../../data/quests.example.json';
import { distanceTo } from '../me.js';
import { useStanding } from '../account.jsx';
import './gigs-board.css';

const CHIPS = ['$25+', 'Under 1 hr', 'This week'];

// The design's format tabs. "Digital" and "Physical" map onto the product
// spec's four mission formats (R3); "K-beauty" is a fourth, design-drawn tab
// that filters by tag instead — a mission's format and its K-beauty tag are
// independent, so this stays a lookup table plus one tag check, not a fifth
// format.
const FORMAT_OF = { content: 'Digital', sales: 'Digital', field: 'Physical', event: 'Physical' };
const isKBeauty = (m) => m.tags.some((t) => t.label === 'K-beauty');

function matchesTab(m, id) {
  if (id === 'All') return true;
  if (id === 'K-beauty') return isKBeauty(m);
  return FORMAT_OF[m.format] === id;
}

// The tile that carries the "new" badge is pinned to a real mission, not a
// list position — index 0 used to move the badge around as filters changed.
const NEW_SLUG = 'fable-coffee-morning-routine';

function lockFor(m, standing) {
  return m.minLevel <= standing.level ? undefined : distanceTo(m.minLevel, standing.xp);
}

// The empty state names what is switched on, so a student who filtered the
// board to nothing can see the cause rather than a void. "All" is the absence
// of a format filter, so it never appears in the list.
function activeFilters(fmt, chips) {
  return [...(fmt === 'All' ? [] : [fmt]), ...CHIPS.filter((c) => chips.has(c))];
}

// "A", "A and B", "A, B and C" — no serial comma, matching the copy elsewhere.
function joinNatural(list) {
  if (list.length < 2) return list[0] ?? '';
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export default function GigsBoard() {
  // The catalogue, from the store the console writes to (content.jsx).
  const { missions } = useContent();
  const standing = useStanding();
  const lock = (m) => lockFor(m, standing);
  const [fmt, setFmt] = useState('All');
  const [chips, setChips] = useState(() => new Set());

  const matches = (m) => {
    if (!matchesTab(m, fmt)) return false;
    if (chips.has('$25+') && m.payUsd < 25) return false;
    if (chips.has('Under 1 hr') && !(m.hours > 0 && m.hours <= 1)) return false;
    if (chips.has('This week') && !/week|Fri|Thu/i.test(m.deadline)) return false;
    return true;
  };

  const shown = missions.filter(matches);

  // Counts describe the format tabs only, so they stay stable as chips toggle.
  const formats = useMemo(
    () => ['All', 'Digital', 'Physical', 'K-beauty'].map((id) => ({
      id,
      count: missions.filter((m) => matchesTab(m, id)).length,
    })),
    []
  );

  const toggle = (c) =>
    setChips((s) => {
      const next = new Set(s);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  const clearFilters = () => {
    setFmt('All');
    setChips(new Set());
  };

  const active = activeFilters(fmt, chips);

  // The header's flame lands here as /app/earn?quests=all (owner, 2026-09-08:
  // "tapping the flame should bring up the quests"), from any tab — so the
  // dialog also opens off the URL, and closing it drops the parameter so Back
  // and a reload do not bring it straight back.
  const [params, setParams] = useSearchParams();
  const [questsOpen, setQuestsOpen] = useState(() => params.has('quests'));
  useEffect(() => { if (params.has('quests')) setQuestsOpen(true); }, [params]);

  // The quests themselves stay
  // one tap away behind the header's flame.

  // Focus in, Tab trapped, Escape, and focus back to whatever opened it are
  // all Dialog's now. This screen used to do the last two by hand and pass a
  // ref for the first, which a function component dropped on the floor.
  const closeQuests = useCallback(() => {
    setQuestsOpen(false);
    if (params.has('quests')) setParams({}, { replace: true });
  }, [params, setParams]);

  return (
    <div className="gb">
      <AppHeader />
      {/* The screen's name for a screen reader: the board draws no title of its
          own, so without this the app's home began at h2 (2026-09-10). It is the
          tab's own word, so it orients rather than inventing a second name for
          the screen — and it does not collide with the "Missions" section below. */}
      <h1 className="sr-only">Earn</h1>

      {/* The lead (owner, 2026-09-09, after the critique): one mission worth
          today, before events and the list. */}
      {/* Three to four, not one (owner, 2026-09-17). `pickForYou` caps rather
          than quotas: a thin board shows what it has instead of padding the
          row with work the student cannot take. */}
      {/* Upcoming — the passes this student holds — led the board for a day
          (2026-09-21) and then moved to Me, between Your progress and Your
          experience (owner): it is about you, not about what is on offer. */}
      <section className="gb__today" aria-labelledby="today-h">
        {/* "Featured", not "For you" (owner, 2026-09-21). The picks are still
            pickForYou's — chosen for this student's level — the word on the
            heading just stopped promising a personal algorithm the app does
            not have yet. Photo-led cards in a row you swipe (the events above
            wear the posters, swapped 2026-09-21); the rows below stay rows,
            which is the whole point. */}
        <h2 className="gb__h2" id="today-h">Featured</h2>
        <div className="fe__row">
          {pickForYou(missions, lock).map((m) => <FeaturedCard key={m.slug} mission={m} />)}
        </div>
      </section>

      {/* The whole quest list, opened by the header's flame (?quests=all). */}
      <Dialog
        open={questsOpen}
        onClose={closeQuests}
        title="All quests"
        aria-label="All quests"
      >
        <p className="qa__soon" role="status">Stay tuned. These are examples.</p>
        <ul className="qa">
          {quests.map((q) => (
            <li key={q.title} className="qa__row" data-testid="quest-row">
              <span className="qa__dot" style={{ background: `var(--${q.color})` }} aria-hidden="true" />
              <div className="qa__mid">
                <p className="qa__tab">{q.tab}</p>
                <h3 className="qa__title">{q.title}</h3>
                <p className="qa__desc">{q.desc}</p>
              </div>
              <span className="qa__reward">{q.reward}</span>
            </li>
          ))}
        </ul>
      </Dialog>

      {/* Events, from H5.dc.html's board. These are open campus events with
          seats, which is a different thing from hub.events — those are the
          tickets this student already holds, and they live on /me/events.

          Not a Card at all any more: the owner asked for no ground and no
          padding, only the gap between events. Reaching past Card to null its
          background and padding is what PRODUCT.md Principle 5 forbids, and a
          card with neither is not a card — so this is a plain div and the
          separation is the grid gap.

          Interactive now. The canvas marks these `card-hit` (cursor: pointer),
          and until Task 3 that was a promise with nothing behind it — the
          exact thing MissionTile and the shop card were careful not to do.
          The event detail route exists now, so the card is the link: not a
          div with an onClick. Making the card itself the anchor, rather than
          wrapping a div in one, is what keeps this content from growing an
          interactive child later — a button dropped into .ev-c__text would
          then nest inside the link, which is invalid markup. A test holds
          that line (tests/unit/gigs-board.test.jsx, "each card is a link to
          its detail"). */}

      <h2 className="gb__h2 gb__missions-h">Missions</h2>
      <FormatTabs formats={formats} value={fmt} onChange={setFmt} controls="gigs-grid" />
      <div className="gb__panel">
        <FilterChips chips={CHIPS} active={chips} onToggle={toggle} />

        {/* Filtering changes the tile count silently for a screen reader —
            the tabpanel's contents swap but nothing announces it. */}
        <p className="gb__count" role="status">
          {`${shown.length} ${shown.length === 1 ? 'mission' : 'missions'}`}
        </p>

        <div
          id="gigs-grid"
          role="tabpanel"
          aria-labelledby={`fmt-tab-${fmt}`}
          className={shown.length ? 'gb__grid' : 'gb__empty'}
        >
          {shown.length ? (
            shown.flatMap((m, i) => [
              <MissionTile key={m.slug} mission={m} locked={lock(m)} isNew={m.slug === NEW_SLUG && !lock(m)} />,
              /* After the third row, a way to the brands (owner, 2026-09-21,
                 from the reference build): the list is long enough by then
                 for a reader to want another way in, and short enough that
                 the card is not the last thing they see. Only where there IS
                 a fourth row — a push between the last tile and nothing is a
                 footer, and the board has one already. */
              ...(i === 2 && shown.length > 3 ? [
                <Link key="push" to="/app/shop" className="gb__push" data-testid="board-push">
                  <span className="gb__push-t">Looking for something you actually want to work on?</span>
                  {/* No small arrow after the words (owner, 2026-09-21): the big
                      ink arrow on the right is the card's one way-on mark. */}
                  <span className="gb__push-go">Discover brands on your campus</span>
                  <Icon name="arrow-right" size={22} className="gb__push-arrow" />
                </Link>,
              ] : []),
            ])
          ) : (
            <>
              <p className="gb__empty-h">No missions match</p>
              <p className="gb__empty-p">
                {active.length
                  ? `${joinNatural(active)} ${active.length === 1 ? 'is' : 'are'} on. Drop one and see what opens up.`
                  : 'The board is empty this week. New missions land on Mondays.'}
              </p>
              {/* lg, not md: md is 40px and this is the only way out of an
                  empty board on a phone. 44px is the touch floor. */}
              {active.length > 0 && (
                <Button variant="secondary" size="lg" className="gb__empty-btn" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
