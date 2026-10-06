import { useState } from 'react';
import { Button } from 'axelerate-design-system';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { useContent } from '../../content.jsx';
import { usd, credit } from '../../parts/Money.jsx';
import { shortDate } from '../format.js';

const FILTERS = ['All', 'Pending', 'Submitted', 'Approved', 'Rejected'];

export default function Ugc() {
  const store = useAdmin();
  const { missionBySlug } = useContent();
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const rows = store.ugcSubmissions.filter(
    (s) => filter === 'All' || s.status === filter.toLowerCase(),
  );
  const countFor = (f) =>
    f === 'All'
      ? store.ugcSubmissions.length
      : store.ugcSubmissions.filter((s) => s.status === f.toLowerCase()).length;

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

      {rows.map((s) => {
        const settled = s.status === 'approved' || s.status === 'rejected';
        return (
          <QueueRow
            key={s.id}
            title={missionBySlug(s.mission_slug)?.title ?? 'Mission closed'}
            meta={`${s.full_name} · ${s.platform} · ${shortDate(s.created_at)}`}
            status={s.status}
            open={open === s.id}
            onToggle={() => setOpen(open === s.id ? null : s.id)}
            actions={settled ? null : (
              <>
                <Button onClick={() => store.approveUgc(s.id)}>Approve</Button>
                <Button variant="secondary" onClick={() => setRejecting(s.id)}>Reject</Button>
              </>
            )}
          >
            {s.reward_cash > 0 && <RowFact label="Cash" value={usd(s.reward_cash)} />}
            {s.reward_credits > 0 && <RowFact label="Credits" value={credit(s.reward_credits)} />}
            <RowFact label="XP" value={`+${s.xp_reward} XP`} />
            <RowFact
              label="Post"
              value={s.ugc_link ? (
                /* The fixture points at example.com on purpose — a fixture that
                   links to a real profile publishes a real person. */
                <a href={s.ugc_link} target="_blank" rel="noopener noreferrer">View the post</a>
              ) : 'No link yet'}
            />
            {s.notes && <RowFact label="Notes" value={s.notes} />}
            {s.reject_reason && <RowFact label="Rejected for" value={s.reject_reason} />}
          </QueueRow>
        );
      })}

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject UGC submission"
        placeholder="e.g. Missing brand tag, poor lighting, or the link is private"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectUgc(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
