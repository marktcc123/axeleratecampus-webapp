import { useState } from 'react';
import { Badge, Button, Card } from 'axelerate-design-system';
import QueueRow, { RowFact, TONES } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import { useAdmin } from '../store.jsx';
import { usdExact } from '../../parts/Money.jsx';
import { shortDate } from '../format.js';

// Money leaving the platform, in the order it has to be checked: the W-9 is
// verified first, then the payout is released.
//
// The reference opens a stored W-9 PDF in a new tab. There is no storage here,
// so the row says so rather than offering a link that goes nowhere.
export default function Withdrawals() {
  const store = useAdmin();
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  return (
    <div>
      <section className="adm-grp">
        <h2 className="adm-grp__title">W-9 verification</h2>
        {store.w9Submissions.map((w) => (
          <Card variant="flat" className="adm-row" key={w.id} data-testid="w9-row">
            <div className="adm-w9">
              <div className="adm-row__mid">
                <span className="adm-row__title">{w.full_name}</span>
                <span className="adm-row__meta">
                  Submitted {shortDate(w.w9_submitted_at)} · no document in preview
                </span>
              </div>
              {/* TONES, not tone="success": the design system's success tone is
                  3.85:1 on Badge's own 12px bold type and fails AA.
                  Secondary and short-labelled: three solid violet buttons down
                  a checklist made the row's confirmation the loudest thing on
                  the panel. It keeps the 44px target, it just stops shouting. */}
              {w.verified
                ? <Badge tone={TONES.verified} tilt={0}>verified</Badge>
                : (
                  <Button variant="secondary" onClick={() => store.verifyW9(w.id)}>
                    Verify
                  </Button>
                )}
            </div>
          </Card>
        ))}
      </section>

      <section className="adm-grp">
        <h2 className="adm-grp__title">Payouts</h2>
        {store.withdrawals.map((w) => (
          <QueueRow
            key={w.id}
            title={w.full_name}
            meta={`${w.method} · ${usdExact(w.net_amount)} net`}
            status={w.status}
            open={open === w.id}
            onToggle={() => setOpen(open === w.id ? null : w.id)}
            actions={w.status === 'pending' ? (
              <>
                <Button onClick={() => store.completePayout(w.id)}>Mark completed</Button>
                <Button variant="secondary" onClick={() => setRejecting(w.id)}>Reject</Button>
              </>
            ) : null}
          >
            {/* usdExact everywhere in this block: a ledger column reads down,
                and $40 over $25.00 does not align. */}
            <RowFact label="Amount" value={usdExact(w.amount)} />
            <RowFact label="Fee" value={usdExact(w.fee)} />
            <RowFact label="Net" value={usdExact(w.net_amount)} />
            <RowFact label="Method" value={`${w.method} · ${w.account_info}`} />
            {w.reject_reason && <RowFact label="Rejected for" value={w.reject_reason} />}
          </QueueRow>
        ))}
      </section>

      <RejectDialog
        open={Boolean(rejecting)}
        title="Reject payout"
        placeholder="e.g. Account details do not match the W-9"
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => { store.rejectPayout(rejecting, reason); setRejecting(null); }}
      />
    </div>
  );
}
