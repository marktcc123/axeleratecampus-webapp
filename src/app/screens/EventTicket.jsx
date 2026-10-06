import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useRsvp } from '../rsvp.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import { ScreenHeader } from 'axelerate-design-system';
import ImageSlot from '../ImageSlot.jsx';
import { cover } from '../parts/cover.js';
import hub from '../../data/hub.example.json';
import './event-ticket.css';

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

// The venue and time arrive as one "Warehouse 12 · 6–9pm" string, which is
// right for a list row and wrong for a ticket, where each is its own field.
const splitMeta = (meta) => {
  const parts = meta.split('·').map((s) => s.trim());
  return { venue: parts[0] || '', time: parts.slice(1).join(' · ') || 'TBC' };
};

export default function EventTicket() {
  // The param takes an event id or a date. Ids first: two board events share a
  // date with a fixture pass (2026-09-19, 2026-09-24), so a date alone resolved
  // to the wrong ticket — the fixture's, under someone else's name.
  const { date: key } = useParams();
  const navigate = useNavigate();
  // Back goes the way you came (owner, 2026-09-21: a ticket opened from the
  // board's Upcoming row returns to the board, not to My tickets). Whoever
  // links here with `state.from` names the way back — the brand page and the
  // cart take the same word; with no state, this is a My tickets page and
  // returns there.
  const from = useLocation().state?.from;
  const back = from
    ? { as: Link, to: from, label: 'Back' }
    : { as: Link, to: '/app/me/tickets', label: 'Back to my tickets' };
  // The fixture's tickets, and the seats saved this session (rsvp.jsx).
  const { tickets, ready } = useRsvp();
  const live = isLiveBackend();
  const ev = live
    ? (tickets.find((t) => t.eventId === key) ?? tickets.find((t) => t.date === key))
    : (
      hub.events.find((e) => e.eventId === key)
      ?? tickets.find((t) => t.eventId === key)
      ?? hub.events.find((e) => e.date === key)
      ?? tickets.find((t) => t.date === key)
    );

  if (live && !ready) {
    return (
      <div className="sub">
        <ScreenHeader back={back} kicker="My tickets" title="Your ticket" lede="Loading your pass…" />
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="sub">
        <ScreenHeader
          back={back}
          kicker="My tickets"
          title="No pass here"
          /* Honest about the most likely cause: a seat saved in this session is
             gone after a reload, which is what this app does with every basket
             of state. A stale link from another session lands here too. */
          lede="Seats you save are kept for this session only, so a reload clears them. Save it again from the event."
        />
      </div>
    );
  }

  const { venue, time } = splitMeta(ev.meta);
  const on = new Date(`${ev.date}T00:00:00`);
  const shortWhen = `${on.toLocaleDateString('en-US', { weekday: 'short' })} · ${on.toLocaleDateString('en-US', { month: 'short' })}`;
  // The stub number is derived, not stored: same event, same number, and no
  // fixture has to carry a fake barcode.
  const stub = `AX-${ev.date.replace(/-/g, '').slice(2)}-${ev.date.slice(-2)}`;
  // The one name the app knows about the student, from the same fixture
  // the settings screen reads, so a ticket never invents a holder.
  const holder = ev.name || (hub.settings.account.find((f) => f.label === 'Name')?.value ?? 'You');

  return (
    <div className="sub">
      <ScreenHeader
        back={back}
        kicker="My tickets"
        title={ev.past ? 'Past ticket' : ev.status === 'crew' ? 'Crew pass' : 'Your ticket'}
      />

      <article className={`tk${ev.past ? ' tk--past' : ''}`} data-testid="ticket" data-past={ev.past ? 'true' : 'false'}>
        {/* A band, not a square. At 1:1 the art was 316px tall and the ticket
            read as a poster with a receipt stapled under it. */}
        <div className="tk__photo">
          <ImageSlot label={ev.title} src={cover(ev.cover)} ratio="16 / 9" radius={14} />
        </div>

        <div className="tk__head">
          <h2 className="tk__title">{ev.title}</h2>
          <p className="tk__sub">{shortWhen} · {venue}</p>
        </div>

        <div className="tk__tear" aria-hidden="true" />

        {/* The code sits above the date, where the person checking you in
            looks first; the details it is a code FOR read underneath. */}
        <div className="tk__foot">
          {/* Not a scannable code — a drawn one. A real barcode here would be
              a fake credential, and the stub number below is the actual key. */}
          <svg className="tk__bars" viewBox="0 0 200 26" role="img" aria-label={`Stub ${stub}`}>
            {[3, 8, 10, 17, 22, 24, 31, 36, 38, 45, 50, 57, 59, 66, 71, 73, 80, 85, 92, 94,
              101, 106, 108, 115, 120, 127, 129, 136, 141, 143, 150, 155, 162, 164, 171, 176,
              178, 185, 190, 192].map((x, i) => (
              <rect key={x} x={x} y="0" width={i % 3 === 0 ? 3 : 1.5} height="26" />
            ))}
          </svg>
          <p className="tk__stub">{stub} · {holder}</p>
          {/* The one thing a past ticket has lost. Everything else on it — the
              date, the venue, the stub number — is still the record of a night
              you turned up to. */}
          {ev.past && <p className="tk__void">This code has expired</p>}
        </div>

        <div className="tk__tear" aria-hidden="true" />

        <div className="tk__body">
          <dl className="tk__grid">
            <div><dt>Date</dt><dd>{longDate(ev.date)}</dd></div>
            <div><dt>Time</dt><dd>{time}</dd></div>
            <div><dt>Venue</dt><dd>{venue}</dd></div>
          </dl>
          {ev.status === 'going' && <p className="tk__note">Doors at 7pm. Bring your student ID.</p>}
          {/* The line the seat sheet took for the host. Collected and never
              shown was a field that did nothing; this is where it lands. */}
          {ev.message && (
            <div className="tk__msg">
              <p className="tk__msg-lab">Your note to the host</p>
              <p className="tk__msg-t">{ev.message}</p>
            </div>
          )}
        </div>
      </article>

      {/* Outside the pass: where to go next. Event details only when the
          fixture names the listing — a past event has left the board, and a
          link that lands nowhere is worse than no link. */}
      <nav className="tk__links" aria-label="More about this event">
        {ev.eventId && (
          <Link to={`/app/earn/events/${ev.eventId}`} className="tk__link">
            Event details <span aria-hidden="true">&raquo;</span>
          </Link>
        )}
        <Link to="/app/me/wallet" className="tk__link">
          My rewards <span aria-hidden="true">&raquo;</span>
        </Link>
      </nav>

      {!ev.past && (
        <div className="tk__drop">
          <button type="button" className="tk__drop-btn" onClick={() => navigate('/app/me/tickets')}>
            Can&rsquo;t make it? Drop your spot &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
