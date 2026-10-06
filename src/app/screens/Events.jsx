import { Link } from 'react-router-dom';
import { Badge } from 'axelerate-design-system';
import SubScreen from '../parts/SubScreen.jsx';
import hub from '../../data/hub.example.json';
import { useRsvp, passPath } from '../rsvp.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import './events.css';

const TONE = { crew: 'yellow', going: 'lavender', done: 'ink' };
// Upright (owner, 2026-09-09): the crew / going / done labels used to tilt ±2°.
const TILT = { crew: 0, going: 0, done: 0 };

// The weekday and the day number are derived, never stored. They were fields
// in the fixture and all three had drifted from their own date: 2026-08-29 was
// labelled Fri and is a Saturday. A date can only disagree with itself once
// somebody writes it down twice.
const parts = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  // Built from two single-field formats rather than one two-field one: asking
  // en-US for weekday+month together returns "Aug Sat", not "Sat · Aug".
  return {
    when: `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleDateString('en-US', { month: 'short' })}`,
    day: d.getDate(),
  };
};

// Each row is a ticket stub: a date block, a notch punched through both edges
// where the stub would tear, and the event beside it. A past event keeps the
// shape and loses the colour — you went, the ticket is still yours.
function Stub({ e }) {
  const { when, day } = parts(e.date);
  const body = (
    <span className="ev__stub">
      <span className="ev__date">
        <span className="ev__when">{when}</span>
        <span className="ev__day">{day}</span>
      </span>
      <span className="ev__mid">
        <span className="ev__top">
          <span className="ev__title">{e.title}</span>
          {e.status === 'done'
            ? <span className="ev__done">done</span>
            : <Badge tone={TONE[e.status]} tilt={TILT[e.status]}>{e.status}</Badge>}
        </span>
        <span className="ev__meta">{e.meta}</span>
      </span>
    </span>
  );

  return (
    <li className="ev" data-testid="event-row" data-past={e.past ? 'true' : 'false'}>
      {/* A past event opens too. The ticket is still yours — it is the record
          of a night you turned up to — and what has changed is the code on it,
          which the ticket says for itself. */}
      <Link to={passPath(e)} className="ev__link">{body}</Link>
    </li>
  );
}

export default function Events() {
  // The fixture's passes plus the seats saved this session (rsvp.jsx), one row
  // per EVENT — not per date. Two board events share a date with a fixture pass,
  // and matching on the date dropped a saved seat from this list silently.
  const { tickets, ready } = useRsvp();
  const live = isLiveBackend();
  const held = new Set(hub.events.map((e) => e.eventId).filter(Boolean));
  const events = live ? tickets : [...hub.events, ...tickets.filter((t) => !held.has(t.eventId))];
  const pending = live && !ready;
  const coming = events.filter((e) => !e.past);
  const past = events.filter((e) => e.past);

  // "My tickets", not "My events" (owner, 2026-09-21): the rows are passes.
  return (
    <SubScreen band="violet" title="My tickets" note={pending ? '…' : `${coming.length} coming up`}>
      <h2 className="sub__label">Coming up</h2>
      {pending
        ? <p className="ev__none">Loading your tickets…</p>
        : coming.length === 0
          ? <p className="ev__none">Nothing booked. Events open from the missions board.</p>
          : <ul className="ev__list">{coming.map((e) => <Stub key={e.eventId ?? e.date} e={e} />)}</ul>}

      {past.length > 0 && (
        <>
          <h2 className="sub__label">Past</h2>
          <ul className="ev__list">{past.map((e) => <Stub key={e.eventId ?? e.date} e={e} />)}</ul>
        </>
      )}
    </SubScreen>
  );
}
