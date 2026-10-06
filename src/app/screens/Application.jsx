import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usd } from '../parts/Money.jsx';
import applications from '../../data/applications.example.json';
import { useAccount } from '../account.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import './application.css';
import './screens.css';
import SubScreen from '../parts/SubScreen.jsx';

// The design stacks applications as overlapping folders: one continuous pile
// you scroll down, however many there are. No drawer — a stack that hides its
// own depth behind a "show more" makes the reader discover it twice, and the
// pile itself already says how deep it goes.
//
// The tab's hue AND its label follow the STATUS rather than per-application
// fields, so "In review" is the same colour and the same word every time it
// appears. The fixture used to carry `tab` beside `status` — the same fact
// twice — and "Completed" became "Paid" on 2026-09-08 at the owner's ask, which
// is exactly the change a duplicated field makes you do in six places.
const HUE = {
  applied: 'blush',
  approved: 'lavender',
  submitted: 'lavender',
  rejected: 'blush',
  paid: 'orange',
};
const TAB = {
  applied: 'In review',
  approved: 'Approved',
  submitted: 'Submitted',
  rejected: 'Not selected',
  paid: 'Paid',
};

// Paid ones sink to the bottom (owner, 2026-09-08): the pile is what you are
// still waiting on, and settled work sits under it. Fixture order otherwise.
const orderOf = (list) => [
  ...list.filter((x) => x.status !== 'paid'),
  ...list.filter((x) => x.status === 'paid'),
];

// Aug 24 from an ISO date, in the viewer's own locale rules but with the
// design's shape.
const applied = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function Folder({ a, i, open, onToggle, last }) {
  const id = `app-${i}`;
  return (
    <div
      className={`af af--${HUE[a.status] ?? 'blush'}${last ? ' af--last' : ''}`}
      style={{ zIndex: i + 1 }}
      data-testid="application-row"
      data-status={a.status}
    >
      {/* One control, not a 44px strip across the top. The tab, the applied/pay
          row and the brand block all sit inside the button, so tapping the
          coloured tab or the mission's own name opens the folder — before this,
          only the thin "Applied … $50" row answered, and the title was the
          thing people actually aimed at.

          Everything in here is phrasing content: a <p> or <div> inside a
          <button> is invalid markup, so these are spans and the CSS does the
          block layout. The body stays OUTSIDE the button because it carries a
          link, and a link inside a button is a nested interactive element. */}
      <button
        type="button"
        className="af__head"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={onToggle}
      >
        <span className="af__tab">{TAB[a.status] ?? a.status}</span>
        <span className="af__row">
          <span className="af__applied">Applied {applied(a.appliedAt)}</span>
          <span className="af__pay">{usd(a.payUsd)}</span>
        </span>
        <span className="af__who">
          <span className="af__mark">{a.brand[0]}</span>
          <span className="af__who-text">
            <span className="af__brand">{a.brand}</span>
            <span className="af__title">{a.title}</span>
          </span>
        </span>
      </button>

      {/* One grid row, animated 0fr → 1fr, with the content in a single track
          that clips. The wrapper exists for that: grid-template-rows can only
          animate a track, and the three children would otherwise be three
          tracks. It replaces a `max-height: 260px` cap that silently cut every
          brief off at 150% text and above (measured 2026-09-10). */}
      <div id={`${id}-body`} className="af__body" data-open={open ? 'true' : 'false'}>
        <div className="af__body-inner">
          <p className="af__body-label">Mission brief</p>
          <p className="af__brief">{a.brief}</p>
          {/* Always a way through, even when the mission has since left the
              board: the list does not say so (owner, 2026-09-08) — the mission
              page does, in its own words, when you get there. */}
          <Link to={`/app/earn/${a.missionSlug}`} className="af__link">Open the mission »</Link>
        </div>
      </div>
    </div>
  );
}

export default function Application() {
  // Everything shut on arrival. `null`, not 0: a folder that opens itself has
  // decided for the reader which application matters.
  const [open, setOpen] = useState(null);
  const toggle = (i) => setOpen((cur) => (cur === i ? null : i));
  const { applications: liveApps, ready } = useAccount();
  const live = isLiveBackend();
  const pending = live && !ready;
  const source = live && ready ? (liveApps ?? []) : applications;
  const ordered = orderOf(source);
  const note = pending ? '…' : `${ordered.length} in total`;

  return (
    // A Me sub-screen since 2026-09-17 (owner): the tracker moved under
    // Grow & earn, so it wears the back row its siblings do rather than the
    // tab chrome it had when it was a tab of its own.
    <SubScreen band="ink" title="Mission tracker" note={note}>
      <div className="apps apps__stack">
        {pending ? <p className="apps__empty">Loading your applications…</p> : null}
        {!pending && ordered.length === 0 ? (
          <p className="apps__empty">You haven&rsquo;t applied yet. Open a mission and send one.</p>
        ) : null}
        {!pending && ordered.map((a, i) => (
          <Folder
            key={a.missionSlug || a.title}
            a={a}
            i={i}
            open={open === i}
            onToggle={() => toggle(i)}
            last={i === ordered.length - 1}
          />
        ))}
      </div>
    </SubScreen>
  );
}
