import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from 'axelerate-design-system';
import ImageSlot from '../ImageSlot.jsx';
import DetailTopBar from '../parts/DetailTopBar.jsx';
import AttendSheet from '../parts/AttendSheet.jsx';
import { useRsvp, passPath } from '../rsvp.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import { useProfile } from '../profile.jsx';
import { useContent } from '../content.jsx';
import { cover } from '../parts/cover.js';
import Icon from '../../components/Icon.jsx';
import GuestGrid from '../parts/GuestGrid.jsx';
import NotFoundPage from '../../pages/NotFoundPage.jsx';
import './event-detail.css';
import './screens.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Sep 8", not 2026-09-08: an ISO date breaks across lines in a 320px row and
// the year is noise on a board where everything is this term.
function when(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}` : String(iso);
}

// One open event, from the board. This is the destination the board's event
// cards were waiting for — GigsBoard's own comment records that they were
// deliberately not links while there was nowhere to go.
export default function EventDetail() {
  const { id } = useParams();
  const { eventById } = useContent();
  const ev = eventById(id);

  // Session state, like the cart and the admin queues: a reload puts the
  // seat back, and this app makes that promise everywhere.
  //
  // Above the 404 guard, not below it: a hook after a conditional return is a
  // Rules-of-Hooks violation, and it only survives here by accident — the two
  // branches happen to run 0 and 1 hooks today, so the first hook added above
  // this line would shift the call order and throw. PublicProfile.jsx keeps
  // its hook above its own guard for the same reason.
  // Saved for the session (rsvp.jsx): the sheet collects the name and a line
  // for the host, and the bar's button becomes the way to the pass.
  const { attend, isGoing, heldFor } = useRsvp();
  const { name: profileName } = useProfile();
  const [sheet, setSheet] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [seatError, setSeatError] = useState('');
  const savedRef = useRef(null);

  // "Save me a seat" unmounts itself on click, dropping keyboard focus to
  // <body>; the seats-left status region says the count changed but not that
  // this reader is the one who changed it. Move focus to the confirmation
  // paragraph instead. Guarded on `saved`, so it never fires on first mount.
  // Not requestAnimationFrame: jsdom's RAF makes toHaveFocus() assertions
  // flaky. `saved` never goes back to false, so unlike Application's drawer
  // this is one-directional — no return-focus target to restore.
  useEffect(() => {
    if (!justSaved) return;
    savedRef.current?.focus();
  }, [justSaved]);

  // sr-only, the same precedent PublicProfile set for the same test shape:
  // the shared NotFoundPage's real copy is "That page isn't here." — it never
  // says "not found" — so the assertion needs a line the page itself doesn't
  // carry rather than a rewrite of shared 404 copy.
  //
  // `bare` renders a <div> instead of a <main>: this route is inside the
  // AppShell group, and the shell's own .app__col is already the <main>, so a
  // second one here would give the same content two landmarks. (The route at
  // /user/:handle sits outside every layout and must NOT pass `bare` — nothing
  // there would supply a <main> at all.)
  if (!ev) {
    return (
      <>
        <p className="sr-only">Event not found.</p>
        <NotFoundPage bare />
      </>
    );
  }

  // `soldOut` is the fixture's own fact — it never changes with `saved` — so it
  // is the one test both the seats line and the CTA below share.
  const openEnded = ev.seatsLeft == null;
  const soldOut = !openEnded && ev.seatsLeft === 0;
  // Saved this session, or already on the list in the fixture — ev5 and ev6 are
  // both in My tickets, and offering a seat for a night you already hold a pass
  // to was the state this screen used to get wrong.
  const held = heldFor(ev.id);
  const saved = isGoing(ev.id);
  // A pass already on file did not come out of this screen's count. Live
  // seats_left is the server's remaining number, so only a seat saved on
  // this visit is taken off it. Offline, the fixture count never moves.
  const fresh = isLiveBackend() ? justSaved : (saved && !held);
  const seats = openEnded ? null : Math.max(0, ev.seatsLeft - (fresh ? 1 : 0));

  return (
    <div className="scr edp">
      {/* The cover is the screen's top edge (owner, 2026-09-09): full-bleed,
          square, no margin above or beside it; Back is a white chip over it. */}
      <div className="edp__photo"><ImageSlot label={ev.photo} src={cover(ev.cover)} ratio="1 / 1" radius={0} /></div>
      <DetailTopBar backTo="/app/earn" shareTitle={ev.title} />

      <p className="edp__caps">{ev.kind} · {ev.place}</p>
      <h1 className="edp__title">{ev.title}</h1>

      <ul className="edp__facts">
        <li className="edp__fact">
          <Icon name="calendar" size={17} className="edp__fact-ico" />
          <span>{when(ev.date)} · {ev.time}</span>
        </li>
        <li className="edp__fact">
          <Icon name="pin" size={17} className="edp__fact-ico" />
          <span>{ev.venue}</span>
        </li>
      </ul>

      <p className="edp__blurb">{ev.blurb}</p>

      {(ev.guests ?? []).length > 0 && (
      <section className="edp__guests" aria-labelledby="guests-h">
        <h2 id="guests-h" className="edp__h2">Guest list</h2>
        <GuestGrid handles={ev.guests} />
      </section>
      )}

      {/* ApplySheet's rule, applied to the one flip that had escaped it:
          nothing here reaches a backend, so nothing here claims to. It stays in
          the flow rather than in the bar, which has room for one line. */}
      {/* What the pass is, not a denial of it (owner, 2026-09-10): the bar used
          to read "Nothing was sent" while the count dropped and a real ticket
          was issued, which is two answers to one question. */}
      {saved && !held && (
        <p className="edp__note">
          {isLiveBackend() ? 'Your pass is in My tickets.' : 'Your pass is in My tickets, saved for this session.'}
        </p>
      )}
      {seatError && <p className="edp__note" role="alert">{seatError}</p>}
      {held && <p className="edp__note">You are already on this list.</p>}
      {waitlisted && <p className="edp__note" role="status">Nothing was sent. The waitlist opens at launch.</p>}

      {/* The bar the mission page uses, with the seats where the deadline sits:
          the count on the left, the action on the right, in the tab bar's
          place. The CTA used to close the page under the guest list.
          
          The count is a live region, the same shape GigsBoard's mission count,
          Perks' stock line and Orders' count use: persistently mounted, its
          text changing when a seat is taken. That is the only shape a screen
          reader reads reliably, and it matters more here than there — the
          "Save me a seat" button unmounts itself on click, so focus falls to
          <body> and this line is the only thing left that can say what
          happened. */}
      <AttendSheet
        open={sheet}
        onClose={() => setSheet(false)}
        event={ev}
        when={`${when(ev.date)} · ${ev.time}`}
        // The real name only: `displayName` falls back to the placeholder
        // identity ("Your name"), and a field that looks filled with a
        // placeholder is one a student ships to the door unchanged.
        defaultName={profileName}
        onSubmit={(r) => {
          const result = attend(ev, r);
          const done = () => { setSeatError(''); setSheet(false); setJustSaved(true); };
          if (result && typeof result.then === 'function') {
            result.then(done).catch((err) => setSeatError(err.message || 'Could not save the seat.'));
            return;
          }
          done();
        }}
      />

      <div className="edp__bar" data-testid="seat-bar">
        {/* One line, no caps label above it: "SEATS LEFT" over "6 seats left"
            said it twice, and the whole phrase is what has to be announced
            when the count changes. */}
        <span className="edp__bar-seats">
          <span className="edp__seats" role="status">
            {openEnded ? 'Open' : (soldOut ? 'No seats left' : `${seats} ${seats === 1 ? 'seat' : 'seats'} left`)}
          </span>
        </span>

        <span className="edp__bar-act">
          {soldOut ? (
            /* The shop's own sold-out string, not a third one: PerkDetail says
               "Waitlist me »" for exactly this state. */
            <Button variant="secondary" size="md" fullWidth onClick={() => setWaitlisted(true)} disabled={waitlisted}>
              {waitlisted ? 'On the waitlist' : 'Waitlist me »'}
            </Button>
          ) : saved ? (
            /* The seat is saved: the button is now the way to the pass (owner,
               2026-09-09). A link, styled as the bar's pill; focus lands here
               after the sheet closes so a keyboard user is not dropped on body. */
            <Link to={passPath(held ?? { eventId: ev.id, date: ev.date })} className="edp__pass" ref={savedRef} data-testid="see-pass">See pass »</Link>
          ) : (
            <Button
              variant="primary"
              size="md"
              fullWidth
              className="edp__bar-btn"
              onClick={() => setSheet(true)}
            >
              Save me a seat
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
