import { useCallback, useMemo, useState } from 'react';
import { Button } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { useContent } from '../../content.jsx';
import { kept } from '../../../lib/catalog-api.js';
import { coverNames } from '../../parts/cover.js';
import CatalogueForm, { numeric } from '../parts/CatalogueForm.jsx';

// One tab for the whole of events: the listings an operator publishes, then the
// people who signed up for them. They were separate concerns in two places —
// the console could approve a sign-up to an event it could not create, and the
// sign-ups named events ("Vera pop-up — door crew") that were on no board.
const COVERS = coverNames('event-');
const KINDS = ['IRL', 'Online'];
const FIELDS = [
  { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Founder AMA — Axelerate Beauty' },
  { name: 'kind', label: 'Kind', type: 'select', options: KINDS },
  { name: 'place', label: 'Place', placeholder: 'Student union' },
  { name: 'venue', label: 'Venue', placeholder: 'Student union, room 2B' },
  { name: 'date', label: 'Date', required: true, placeholder: '2026-09-30' },
  { name: 'time', label: 'Time', placeholder: '6–7pm' },
  { name: 'seatsLeft', label: 'Seats', type: 'number' },
  { name: 'blurb', label: 'Blurb', type: 'textarea' },
  { name: 'cover', label: 'Art', type: 'select', options: COVERS },
];

export default function Events() {
  const store = useAdmin();
  const { notify } = store;
  const { events, eventById, addEvent, updateEvent, removeEvent } = useContent();
  const [open, setOpen] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [editing, setEditing] = useState(null);
  const close = useCallback(() => setEditing(null), []);
  const current = typeof editing === 'string' && editing !== 'new' ? eventById(editing) : null;
  // Stable, so the draft survives a catalogue update while the dialog is open:
  // the form resets whenever `value` changes identity.
  const value = useMemo(() => current ?? { kind: 'IRL', cover: COVERS[0], seatsLeft: '20' }, [current]);

  const submit = async (d) => {
    const fields = { ...d, ...numeric(d, ['seatsLeft']) };
    const failed = await kept(current ? updateEvent(current.id, fields) : addEvent(fields));
    if (failed) {
      notify('Not saved', failed.error);
      return;
    }
    close();
  };

  // Grouped by event, because a lead works one door list at a time. The group
  // heading names the event once, from the listing; the rows below are people.
  const groups = store.eventApplications.reduce((map, a) => {
    if (!map.has(a.event_id)) map.set(a.event_id, []);
    map.get(a.event_id).push(a);
    return map;
  }, new Map());

  return (
    <div>
      <section className="adm-grp">
        <div className="adm-cmp__top">
          <Button onClick={() => setEditing('new')}>Add event</Button>
        </div>
        <div className="adm-card adm-list">
          {events.length === 0 && <p className="adm-empty">No events on the board. Add one and it appears there.</p>}
          {events.map((e) => (
            <div className="adm-cmp__row" key={e.id} data-testid="event-row">
              <div className="adm-row__mid">
                <span className="adm-row__title">{e.title}</span>
                <span className="adm-row__meta">
                  {e.date} · {e.time} · {e.seatsLeft === 0 ? 'no seats left' : `${e.seatsLeft} seats`}
                </span>
              </div>
              <button type="button" className="adm-quiet" onClick={() => setEditing(e.id)} data-testid="event-edit">Edit</button>
              <button type="button" className="adm-quiet" onClick={async () => {
                const failed = await kept(removeEvent(e.id));
                if (failed) notify('Not saved', failed.error);
              }} data-testid="event-close">Close</button>
            </div>
          ))}
        </div>
      </section>

      <h2 className="adm-grp__title">Sign-ups</h2>
      {!groups.size && <p className="adm__queue-empty">No applicants yet.</p>}
      {[...groups.entries()].map(([eventId, people]) => (
        <section key={eventId} className="adm-grp">
          <h3 className="adm-grp__title">{eventById(eventId)?.title ?? 'Event closed'}</h3>
          {people.map((a) => (
            <QueueRow
              key={a.id}
              title={a.full_name}
              meta={`${a.campus} · ${a.tier}`}
              status={a.status}
              open={open === a.id}
              onToggle={() => setOpen(open === a.id ? null : a.id)}
              actions={a.status === 'pending' ? (
                <>
                  <Button onClick={() => store.approveEventApp(a.id)}>Approve</Button>
                  <Button variant="secondary" onClick={() => setDeclining(a.id)}>Decline</Button>
                </>
              ) : null}
            >
              <RowFact label="Campus" value={a.campus} />
              <RowFact label="Tier" value={a.tier} />
              {a.reject_reason && <RowFact label="Declined for" value={a.reject_reason} />}
            </QueueRow>
          ))}
        </section>
      ))}

      {/* Declining a sign-up asks why, like every other refusal in the console
          (owner, 2026-09-23) — the seat goes back and the applicant is told. */}
      <RejectDialog
        open={Boolean(declining)}
        verb="Decline"
        title="Decline sign-up"
        placeholder="e.g. The room is at capacity for this one"
        onClose={() => setDeclining(null)}
        onSubmit={(reason) => { store.declineEventApp(declining, reason); setDeclining(null); }}
      />
      <CatalogueForm
        open={editing !== null}
        title={current ? 'Edit event' : 'Add event'}
        submitLabel={current ? 'Save event' : 'Publish event'}
        fields={FIELDS}
        value={value}
        onClose={close}
        onSubmit={submit}
      />
    </div>
  );
}
