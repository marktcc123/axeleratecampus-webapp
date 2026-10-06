import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import Avatar from '../Avatar.jsx';
import { cover } from './cover.js';
import { usd } from './Money.jsx';
import { cardTitle } from './title.js';
import { duration, applyBy } from './when.js';
import people from '../../data/people.example.json';
import './photo-card.css';

// Featured: the board's picks as photo-led cards you swipe — the design the
// Upcoming events wore first, swapped over on 2026-09-21 (owner: "swap the
// two"). The art on top — a square, the card's full width (owner, 2026-09-21:
// "make the photo square; just make the card taller, don't change my layout")
// — with the mission's format chipped on its corner, the title, how long and
// by when on one line, and a foot with the pay beside who is already on it.
// Paper ground, no shadow: the tone is the edge.
const FACES = 3;

export default function FeaturedCard({ mission: m }) {
  if (!m) return null;
  const by = applyBy(m.deadlineOn);
  const going = (m.going ?? []).map((h) => people.find((p) => p.handle === h)).filter(Boolean);
  const chip = m.tags?.[0]?.label ?? m.format;
  return (
    <Link to={`/app/earn/${m.slug}`} className="ph" data-testid="today-tile">
      <div className="ph__photo">
        <ImageSlot label={m.photoLabel} src={cover(m.cover)} radius={12} />
        {chip && <span className="ph__kind">{chip}</span>}
      </div>
      {/* Who it is for, before what it is (owner, 2026-09-22): the brand's
          name on a line of its own, and the title without it. No disc — the
          owner took the Avatar off the brand line the day it went on. */}
      {m.brand && <p className="ph__brand"><span className="ph__brand-t">{m.brand}</span></p>}
      <h3 className="ph__title">{cardTitle(m)}</h3>
      {/* A stopwatch for how long (the app's own glyph) and the calendar for
          by when — the two facts a student weighs before the pay, on one line. */}
      <p className="ph__line">
        {m.hours > 0 && <span className="ph__fact"><Icon name="timer" set="app" size={13} className="ph__ico" />{duration(m.hours)}</span>}
        <span className="ph__fact"><Icon name="calendar" size={13} className="ph__ico" />{by ? `by ${by}` : 'open until it fills'}</span>
      </p>
      <p className="ph__foot">
        {/* Cash leads: the pay in the rows' own highlighter swipe, at the
            rows' own size — and the XP after it, in the rows' own XP style
            (owner, 2026-09-22: every mission on the board reads both). One
            group, so the faces stay at the right whatever the figures come to.
            A mission the console has published without XP yet says nothing
            rather than "+0 XP", as the rows do. */}
        <span className="ph__earn">
          <span className="ph__pay"><span className="ph__pay-t">{usd(m.payUsd)}</span></span>
          {m.xp > 0 && <span className="ph__xp">+{m.xp.toLocaleString('en-US')} XP</span>}
        </span>
        {going.length > 0 && (
          <span className="ph__going" role="img" aria-label={`${going.length} going`}>
            {going.slice(0, FACES).map((g) => <Avatar key={g.handle} name={g.name} size={24} className="ph__face" />)}
            {going.length > FACES && <span className="ph__more" aria-hidden="true">+{going.length - FACES}</span>}
          </span>
        )}
      </p>
    </Link>
  );
}
