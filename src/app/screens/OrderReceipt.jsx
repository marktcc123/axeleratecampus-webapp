import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
import { Badge } from 'axelerate-design-system';
import { usdExact, CREDIT_PER_DOLLAR } from '../parts/Money.jsx';
import hub from '../../data/hub.example.json';
import { useAccount } from '../account.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import NotFoundPage from '../../pages/NotFoundPage.jsx';
import './orders.css';

// One order, from H5.dc.html's receipt.
//
// Drawn as an actual receipt — torn bottom edge, wordmark, tabular figures —
// rather than as a detail panel. The tracker under it is a list of steps with
// their dates, and an undone step keeps its row so the shape of what is left
// is visible rather than implied.
export default function OrderReceipt() {
  const { id } = useParams();
  const { orders: liveOrders, ready } = useAccount();
  const live = isLiveBackend();
  const source = live ? (liveOrders ?? []) : hub.orders;
  const o = source.find((x) => x.id === id);
  // Copy for the tracking number: the clipboard and a moment of "Copied" on
  // the button, the share buttons' idiom. Above the early return, as hooks are.
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(o.tracking.number);
      setCopied(true); setTimeout(() => setCopied(false), 2200);
    } catch { /* nothing to say */ }
  };

  if (live && !ready) return <div className="scr rc"><p className="ord__count">Loading your order…</p></div>;
  if (!o) return <NotFoundPage bare />;

  return (
    <div className="scr rc">
      <div className="rc__top">
        <Link to="/app/me/orders" className="rc__back" aria-label="Back"><span className="rc__chev" /></Link>
      </div>

      <article className="rc__paper">
        <Logo className="rc__wordmark" />
        <p className="rc__kicker">perks shop receipt</p>

        <dl className="rc__meta">
          <div className="rc__meta-row">
            <dt>Order</dt>
            <dd>{o.no}</dd>
          </div>
          <div className="rc__meta-row">
            <dt>Placed</dt>
            <dd>{o.date}</dd>
          </div>
        </dl>

        <div className="rc__line">
          <div className="rc__line-text">
            <h1 className="rc__name">{o.name}</h1>
            <p className="rc__brand">{o.brand}</p>
          </div>
          <p className="rc__line-price">{usdExact(o.priceUsd)}</p>
        </div>

        <p className="rc__total">
          <span className="rc__total-label">Total</span>
          <span className="rc__total-fig">{usdExact(o.priceUsd)}</span>
        </p>

        {/* How it was paid, when credits took part (owner, 2026-09-22: "如果有
            用credits是如何显示的呢"): the points with their shop value — R1's
            pairing — and the cash. An all-cash order says nothing here; the
            total already said it. */}
        {o.paid?.creditPts > 0 && (
          <div className="rc__paid" data-testid="paid-with">
            <p className="rc__paid-h">Paid with</p>
            <dl className="rc__meta rc__paid-rows">
              <div className="rc__meta-row"><dt>Credits</dt><dd>{`${o.paid.creditPts.toLocaleString('en-US')} pts · ${usdExact(o.paid.creditPts / CREDIT_PER_DOLLAR)}`}</dd></div>
              <div className="rc__meta-row"><dt>Cash</dt><dd>{usdExact(o.paid.cashUsd)}</dd></div>
            </dl>
          </div>
        )}

        <p className="rc__note">{o.note}</p>
      </article>

      <section className="rc__track" aria-labelledby="track-h">
        <div className="rc__track-top">
          <h2 id="track-h" className="rc__track-h">Track it</h2>
          <Badge tone={o.tone} tilt={0}>{o.status}</Badge>
        </div>
        {/* The carrier and the number once there is one (owner, 2026-09-22:
            "tracking number在哪里看？"), with Copy; before that, when it comes. */}
        <p className="rc__tracking" data-testid="tracking">
          {o.tracking ? (
            <>
              <span className="rc__carrier">{o.tracking.carrier}</span>
              <span className="rc__tn">{o.tracking.number}</span>
              <button type="button" className="rc__copy" onClick={copy} aria-label={copied ? 'Copied' : 'Copy tracking number'}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </>
          ) : 'Tracking number arrives when it ships.'}
        </p>
        <ol className="rc__steps">
          {o.steps.map((s) => (
            <li
              key={s.label}
              className="rc__step"
              data-done={s.done ? 'true' : 'false'}
              data-testid="order-step"
            >
              <span className="rc__dot" aria-hidden="true" />
              <span className="rc__step-label">{s.label}</span>
              <span className="rc__step-date">{s.date}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
