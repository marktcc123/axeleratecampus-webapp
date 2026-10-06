import { useState } from 'react';
import { Link } from 'react-router-dom';
import QueueRow, { RowFact } from '../parts/QueueRow.jsx';
import { RejectDialog } from '../parts/RejectDialog.jsx';
import ShipFields from '../parts/ShipFields.jsx';
import { useAdmin } from '../store.jsx';
import { usd, usdExact, credit } from '../../parts/Money.jsx';
import { shortDate } from '../format.js';

// Orders waiting on someone. `needs` is what the order is waiting for, and it
// decides which actions the row offers.
//
// The open row is a packing slip (owner, 2026-09-23: the console exists so
// staff can ship and decide without looking anywhere else): who and where,
// how to reach them, the items with a way to each product, what was paid in
// cash and in credits, and — on a return or a cancellation — what the student
// asked for, so the decision is not made blind. Shipping is filled in on the
// row — carrier and number, then Mark shipped; a return or a cancellation can
// be approved or declined, and declining asks why, as every refusal in the
// console does.
const REQUEST_LABEL = { return: 'Return request', cancellation: 'Cancel request' };
const totalOf = (o) => o.items.reduce((n, it) => n + it.quantity * it.price, 0);

export default function Tasks() {
  const store = useAdmin();
  const [open, setOpen] = useState(null);
  const [declining, setDeclining] = useState(null);   // { id, kind }
  const waiting = store.orders.filter((o) => o.needs);

  if (!waiting.length) {
    return <p className="adm__queue-empty">Nothing waiting. The queue is clear.</p>;
  }

  // Approve / Decline as small link buttons on one line (owner, 2026-09-23:
  // "不要这么大的按钮 小一点的link按钮就行了" — the system's pills were too much
  // inside a row); the badge above already says which request this is, and
  // the accessible name says it in full ("Approve cancellation").
  const actionsFor = (o) => {
    if (o.needs === 'shipping') return null;   // the ShipFields block at the slip's foot carries its own button
    if (o.needs === 'return' || o.needs === 'cancellation') {
      const approve = o.needs === 'return' ? store.approveReturn : store.approveCancellation;
      return (
        <>
          <button type="button" className="adm-link adm-link--go" aria-label={`Approve ${o.needs}`} onClick={() => approve(o.id)}>Approve</button>
          <button type="button" className="adm-link" aria-label={`Decline ${o.needs}`} onClick={() => setDeclining({ id: o.id, kind: o.needs })}>Decline</button>
        </>
      );
    }
    return null;
  };

  return (
    <div>
      {waiting.map((o) => {
        const a = o.shipping_address;
        return (
          <QueueRow
            key={o.id}
            title={o.order_no}
            meta={`${o.full_name} · ${usd(totalOf(o))} · ${shortDate(o.created_at)}`}
            status={o.needs}
            open={open === o.id}
            onToggle={() => setOpen(open === o.id ? null : o.id)}
            actions={actionsFor(o)}
          >
            {/* The slip: three blocks under hairlines, like the receipt the
                student holds — where it goes, what is in it, what they asked. */}
            <div className="slip">
              <section className="slip__blk" aria-label="Ship to">
                <p className="slip__lab">Ship to</p>
                <p className="slip__name">{o.full_name}</p>
                {a && (
                  <p className="slip__addr">
                    <span>{a.line1}</span>
                    {a.line2 && <span>{a.line2}</span>}
                    <span>{`${a.city}, ${a.state} ${a.zip}`}</span>
                  </p>
                )}
                <p className="slip__contact">
                  {o.phone && <span>{o.phone}</span>}
                  {o.phone && <span className="slip__dot" aria-hidden="true">·</span>}
                  <span>{o.shipping_email}</span>
                </p>
              </section>

              <section className="slip__blk" aria-label="Items">
                <p className="slip__lab">Items</p>
                <ul className="slip__items">
                  {o.items.map((it, i) => (
                    <li key={`${it.product_id ?? it.name}-${i}`} className="slip__item">
                      <span className="slip__qty">{it.quantity}×</span>
                      <span className="slip__what">
                        {it.product_id
                          ? <Link to={`/app/shop/${it.product_id}`} className="slip__pname">{it.name}</Link>
                          : <span className="slip__pname">{it.name}</span>}
                        <span className="slip__brand">{it.brand}</span>
                      </span>
                      <span className="slip__price">{usdExact(it.quantity * it.price)}</span>
                    </li>
                  ))}
                </ul>
                <p className="slip__sum"><span>Total</span><span>{usdExact(totalOf(o))}</span></p>
                <p className="slip__paid">
                  <span>Paid</span>
                  <span>{[`${usd(o.cash_paid)} cash`, o.credits_used > 0 ? credit(o.credits_used) : null].filter(Boolean).join(' + ')}</span>
                </p>
              </section>

              {o.request_reason && REQUEST_LABEL[o.needs] && (
                <section className="slip__blk slip__ask" aria-label={REQUEST_LABEL[o.needs]}>
                  <p className="slip__lab">{REQUEST_LABEL[o.needs]}</p>
                  <p className="slip__quote">{o.request_reason}</p>
                </section>
              )}
              {o.needs === 'shipping' && (
                <ShipFields key={o.id} onSubmit={(tracking) => store.markShipped(o.id, tracking)} />
              )}
            </div>
          </QueueRow>
        );
      })}

      <RejectDialog
        open={Boolean(declining)}
        verb="Decline"
        title={declining?.kind === 'return' ? 'Decline return' : 'Decline cancellation'}
        placeholder={declining?.kind === 'return' ? 'e.g. Returns close 30 days after delivery' : 'e.g. It already left the warehouse this morning'}
        onClose={() => setDeclining(null)}
        onSubmit={(reason) => {
          (declining.kind === 'return' ? store.declineReturn : store.declineCancellation)(declining.id, reason);
          setDeclining(null);
        }}
      />
    </div>
  );
}
