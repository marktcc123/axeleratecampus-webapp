import { Link } from 'react-router-dom';
import { Card } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import hub from '../../data/hub.example.json';
import { useRsvp, passPath } from '../rsvp.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import './poster.css';

// The nights this student is already on the list for, on Me between Your
// progress and Your experience (owner, 2026-09-21 — it led the Earn board for
// a day first). Drawn the way the mission list draws a row (owner, later the
// same day: "the mission list's style, with the calendar where the picture
// is"): the system's flat Card, a 96px square on the left carrying the month,
// day and time on the card's hue, the address in the caps slot, the title, and
// where a mission row puts its pay, an ink pill that opens the ticket. The
// card itself opens the event.
//
// Three hues in rotation for the calendar square — coral, orange, yellow, at
// their soft step with ink type (owner, 2026-09-21: the full-strength square
// "looked odd") — so three cards are three cards and not one repeated.
const HUES = ['coral', 'orange', 'yellow'];

// Where the row lives, so a ticket opened from it can find its way back.
const HERE = '/app/me';

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };

// The passes this student holds: the fixture's plus the seats saved this
// session, one per event — the same join My tickets (Events.jsx) makes, so a
// seat saved for a night the fixture already lists is one pass, not two.
export function passes(tickets = []) {
  const held = new Set(hub.events.map((e) => e.eventId).filter(Boolean));
  return [...hub.events, ...tickets.filter((t) => !held.has(t.eventId))];
}

// Still to come, soonest first, capped — a row, not the whole calendar. A pass
// the fixture marks past stays out whatever its date says, and so does one
// whose date has gone by. Pure and exported so the cut-off is testable without
// a clock in the DOM.
export function upcoming(list, now = new Date(), n = 6) {
  const today = startOfDay(now);
  return list
    .filter((e) => !e.past && dayOf(e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, n);
}

// What the card says about the night, read off the board event the pass names
// while that event is still published; a pass with no event behind it (the
// fixture's older ones, or a night a brand has since taken down) falls back on
// its own meta line, which My tickets writes as "venue · time".
export function detail(t, events = []) {
  const ev = events.find((e) => e.id === t.eventId);
  const [metaPlace, metaTime] = (t.meta ?? '').split(' · ');
  return {
    where: ev?.venue ?? ev?.place ?? metaPlace ?? '',
    time: ev?.time ?? metaTime ?? '',
  };
}

// One pass as a card. The row on Me draws it full size; the account drawer
// draws the next one `mini` — the same construction at a smaller scale (owner,
// 2026-09-21: "a small version of Me's Upcoming, not words"). `from` is the way
// back the ticket page is handed.
export function PassCard({ pass: t, index: i = 0, events = [], from = HERE, mini = false }) {
  const when = dayOf(t.date);
  const d = detail(t, events);
  // A pass whose event has left the board has nowhere else to open but the
  // ticket.
  const eventPath = t.eventId ? `/app/earn/events/${t.eventId}` : passPath(t);
  return (
      <Card
        variant="flat"
        padding="none"
        interactive="shadow"
        className={`po po--${HUES[i % HUES.length]}${mini ? ' po--mini' : ''}`}
        data-testid="upcoming-card"
      >
        {/* The whole card is the event's link — the mission row's own
            construction — and the Ticket pill is its sibling, laid over the
            card's bottom-right corner, so neither sits inside the other and
            both clear the 44px floor on their own boxes. */}
        <Link to={eventPath} className="po__hit" data-testid="upcoming-event">
          <div className="po__row">
            {/* The calendar, in the art's square: month over day over time,
                on the card's hue at its soft step. */}
            <span className="po__date">
              <span className="po__month">{when.toLocaleDateString('en-US', { month: 'short' })}</span>
              <b>{when.getDate()}</b>
              {d.time && <span className="po__time">{d.time}</span>}
            </span>
            <div className="po__col">
              <h3 className="po__title">{t.title}</h3>
              {/* The mini (drawer) card keeps the calendar and the title only
                  (owner, 2026-09-21: "no place, no ticket button on the small
                  one"). */}
              {!mini && (
                <p className="po__caps">
                  <Icon name="map-pin" set="app" size={15} className="po__ico" />
                  <span className="po__caps-t">{d.where}</span>
                </p>
              )}
              {/* Room at the foot for the pill laid over it. */}
              {!mini && <span className="po__earn-space" aria-hidden="true" />}
            </div>
          </div>
        </Link>
        {/* The ticket, where the mission row puts its pay: an ink pill with
            the app's own glyph (assets/icons/ticket.svg) and the one word.
            Painted on the inner span (the contrast guard reads the ink behind
            the words off a real ancestor); the link is the 44px target round
            it. "Show" is said for a screen reader, so the link reads as the
            action it is. It carries the way back, so the ticket returns here
            and not to My tickets (owner: "back should go the way you came"). */}
        {!mini && (
          <Link to={passPath(t)} state={{ from }} className="po__strip" data-testid="upcoming-tickets">
            <span className="po__strip-in">
              <Icon name="ticket" set="app" size={18} className="po__strip-ico" />
              <span className="po__strip-t"><span className="sr-only">Show </span>Ticket</span>
            </span>
          </Link>
        )}
      </Card>
  );
}

export default function Upcoming({ events = [], now = new Date() }) {
  const { tickets, ready } = useRsvp();
  const live = isLiveBackend();
  if (live && !ready) return null;
  const list = upcoming(live ? tickets : passes(tickets), now);
  // Nothing to come means no row, not an empty one: the board opens on the
  // featured missions instead, and a heading over nothing is a promise broken.
  if (!list.length) return null;
  return (
    <section className="up" aria-labelledby="upcoming-h">
      <h2 className="up__h2" id="upcoming-h">Upcoming</h2>
      <ul className="up__row">
        {list.map((t, i) => (
          <li key={t.eventId ?? t.date} className="up__item">
            <PassCard pass={t} index={i} events={events} />
          </li>
        ))}
      </ul>
    </section>
  );
}
