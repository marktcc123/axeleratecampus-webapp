import { useState } from 'react';
import { Button } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { useContent } from '../../content.jsx';
import { usd, credit } from '../../parts/Money.jsx';
import { shortDate } from '../format.js';

// Applicants for field work. The actions follow the status: pending decides
// yes or no, approved has one more step (the shift actually happened), and a
// settled row offers nothing.
export default function Gigs() {
  const store = useAdmin();
  // The title comes from the mission, not from a copy of it: the queue joins

  // on the slug, so a rename on the board reaches this row.

  const { missionBySlug } = useContent();
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  if (!store.gigApplications.length) {
    return <p className="adm__queue-empty">No applicants yet.</p>;
  }

  return (
    <div>
      {store.gigApplications.map((g) => (
        <QueueRow
          key={g.id}
          title={missionBySlug(g.mission_slug)?.title ?? 'Mission closed'}
          meta={`${g.full_name} · ${shortDate(g.gig_date)}`}
          status={g.status}
          open={open === g.id}
          onToggle={() => setOpen(open === g.id ? null : g.id)}
          actions={(
            <>
              {g.status === 'pending' && (
                <>
                  <Button onClick={() => store.approveGig(g.id)}>Approve</Button>
                  <Button variant="secondary" onClick={() => setRejecting(g.id)}>Reject</Button>
                </>
              )}
              {g.status === 'approved' && (
                <Button onClick={() => store.completeGig(g.id)}>Mark complete</Button>
              )}
            </>
          )}
        >
          <RowFact label="Phone" value={g.phone} />
          <RowFact label="Email" value={g.email} />
          <RowFact label="Where" value={g.location} />
          <RowFact label="Cash" value={usd(g.reward_cash)} />
          {g.reward_credits > 0 && <RowFact label="Credits" value={credit(g.reward_credits)} />}
          {g.reject_reason && <RowFact label="Rejected for" value={g.reject_reason} />}
        </QueueRow>
      ))}

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject physical gig"
        placeholder="e.g. The shift is already covered"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectGig(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
