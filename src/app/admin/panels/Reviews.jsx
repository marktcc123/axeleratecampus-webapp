import { useState } from 'react';
import { Button } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { useContent } from '../../content.jsx';
import { shortDate } from '../format.js';

// Product reviews, modelled closely on Ugc.jsx — the console's other queue of
// user-written content awaiting a moderator's yes or no. Same status
// vocabulary as UGC (pending / approved / rejected) rather than a parallel
// one; no "submitted" step, because a review is self-contained the moment a
// student writes it — there is nothing partial about it the way an
// unlinked UGC post is.
const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function Reviews() {
  const store = useAdmin();
  // Title and brand read off the product: the row used to carry its own copies,

  // and one of them still said "Intelligent Change" after the shop renamed it.

  const { productById } = useContent();
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const rows = store.reviews.filter(
    (r) => filter === 'All' || r.status === filter.toLowerCase(),
  );
  const countFor = (f) =>
    f === 'All'
      ? store.reviews.length
      : store.reviews.filter((r) => r.status === f.toLowerCase()).length;

  return (
    <div>
      <div className="adm__chips" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`adm__chip${f === filter ? ' is-on' : ''}`}
            aria-pressed={f === filter}
            onClick={() => setFilter(f)}
          >
            {f} <span className="adm__chip-n">{countFor(f)}</span>
          </button>
        ))}
      </div>

      {!rows.length && <p className="adm__queue-empty">Nothing in this state.</p>}

      {rows.map((r) => {
        const settled = r.status === 'approved' || r.status === 'rejected';
        return (
          <QueueRow
            key={r.id}
            title={productById(r.product_id)?.title ?? 'Product removed'}
            meta={`${r.full_name} · ${shortDate(r.created_at)}`}
            status={r.status}
            open={open === r.id}
            onToggle={() => setOpen(open === r.id ? null : r.id)}
            actions={settled ? null : (
              <>
                <Button onClick={() => store.approveReview(r.id)}>Approve</Button>
                <Button variant="secondary" onClick={() => setRejecting(r.id)}>Reject</Button>
              </>
            )}
          >
            <RowFact label="Brand" value={productById(r.product_id)?.brand ?? '—'} />
            <RowFact label="Rating" value={`${r.rating} / 5`} />
            <RowFact label="Review" value={r.body} />
            {r.reject_reason && <RowFact label="Rejected for" value={r.reject_reason} />}
          </QueueRow>
        );
      })}

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject review"
        placeholder="e.g. Names a real person, off-topic, or reads like spam"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectReview(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
