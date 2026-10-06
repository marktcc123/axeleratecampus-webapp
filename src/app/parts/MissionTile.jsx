import { Link } from 'react-router-dom';
import { Card } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import { cover } from './cover.js';
import { usd } from './Money.jsx';
import { cardTitle } from './title.js';
import './mission-tile.css';

// The caps line the design puts above the title: the mission's labels —
// Digital, Physical, K-beauty — and nothing else. It replaces the Tag
// components the tile used to carry, because at this size a row of stickers
// crowded the 140px of copy that was left.
//
// `m.meta` used to trail the labels ("45 min · flexible this week"), which put
// the when and where in the one line whose job is what KIND of mission this is.
// The detail page carries the same labels-only line, so the two now agree.
const capsLine = (m) => m.tags.map((t) => t.label).join(' · ');

// `bare`: the same row with no Card under it — the brand page lists missions
// this way (owner, 2026-09-09: "the same design as outside, just no ground").
// `linkTestId` lands on the link so a page can name its rows in tests.
export default function MissionTile({ mission: m, locked, isNew, bare = false, linkTestId }) {
  const Wrap = bare ? 'div' : Card;
  // A locked tile keeps the sketch ground — the "not yet" the design draws —
  // but lifts on hover like the others: it opens too (owner, 2026-09-21).
  const cardProps = bare ? {} : {
    variant: locked ? 'sketch' : 'flat',
    padding: 'none',
    interactive: 'shadow',
    style: { height: '100%', boxSizing: 'border-box' },
  };
  const body = (
    <Wrap
      {...cardProps}
      data-testid="mission-tile"
      data-locked={locked ? 'true' : 'false'}
      className={`mt${locked ? ' mt--locked' : ''}${bare ? ' mt--bare' : ''}`}
    >
      {isNew && !locked && <span className="mt__badge">new</span>}
      <div className="mt__row">
        <div className="mt__photo"><ImageSlot label={m.photoLabel} src={cover(m.cover)} /></div>

        <div className="mt__col">
          {/* Who, then what, then what kind, then what it pays (owner,
              2026-09-22): the brand line and the title lead, the caps slot
              follows them, and the earn line closes the row as before. */}
          {/* The brand on a line of its own instead of as the first word of
              the title (owner, 2026-09-22). The name alone: it wore the app's
              Avatar disc for an hour and the owner took it off the same day
              ("不需要品牌的avatar"). Not on a bare row: the brand page names
              its brand once, in its own header. */}
          {m.brand && !bare && <p className="mt__brand"><span className="mt__brand-t">{m.brand}</span></p>}
          <h3 className="mt__title">{cardTitle(m)}</h3>

          {/* The caps slot: the format and tags — or, while the mission is out
              of reach, what unlocks it, in their place (owner, 2026-09-09).
              One line either way; a locked tile has nothing to filter by yet,
              and the distance is the thing to read. */}
          {/* The rung mark reads "LV1", not "T1" (owner, 2026-09-21): the tiers
              are the levels, and the app says "level" everywhere else. */}
          {locked ? (
            <p className="mt__caps mt__caps--gate">
              <Icon name="crown" set="solid" size={12} />
              LV.{m.minLevel} · {locked.xpAway.toLocaleString('en-US')} XP away
              <span className="mt__tier">LV{m.tier}<span className="sr-only"> — level {m.tier}, {m.tierName}</span></span>
            </p>
          ) : (
            <p className="mt__caps"><span className="mt__caps-t">{capsLine(m)}</span><span className="mt__tier">LV{m.tier}<span className="sr-only"> — level {m.tier}, {m.tierName}</span></span></p>
          )}

          {/* The price leads in the DOM as well as the eye — R1. The pill is
              the design's; the XP trails it. */}
          <p className="mt__earn">
            {/* The figure with a highlighter swipe behind it (owner, 2026-09-21,
                chosen over a marker ring, a sticker, a tag and a plain pill from
                a rendered comparison): the ink box read as dead, and a ring read
                as odd. The swipe is CSS — one yellow bar a degree and a half off
                level, behind the type — so it is the butter ramp's own
                "highlighter" and needs no asset. */}
            <span className="mt__pay"><span className="mt__pay-t">{usd(m.payUsd)}</span></span>
            {/* A mission the console has published without XP yet says nothing
                rather than "+0 XP", which reads as a broken figure. A locked
                row shows its XP too (owner, 2026-09-22: every mission reads
                pay and XP) — the caps line above says how far, this says what
                the mission pays in XP once you are there. */}
            {m.xp > 0 && <span className="mt__xp">+{m.xp.toLocaleString('en-US')} XP</span>}
          </p>
        </div>
      </div>
    </Wrap>
  );

  // Every tile opens its mission, the locked ones too (owner, 2026-09-21: "the
  // missions not yet unlocked should open as well, just not be applied for").
  // The detail page is where that holds: its bar shows the distance in place
  // of Apply while the rung is out of reach. The tile keeps its price and its
  // distance either way (R8).
  return (
    <Link to={`/app/earn/${m.slug}`} className="mt__link card-hit" data-testid={linkTestId}>
      {body}
      <span className="card-go" aria-hidden="true" />
    </Link>
  );
}
