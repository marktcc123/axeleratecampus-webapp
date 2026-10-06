import { Link } from 'react-router-dom';
import AppHeader from '../AppHeader.jsx';
import { useDemand } from '../demand.jsx';
import { formatMoney, statusLabel } from '../../lib/demand.js';
import './demand.css';
import './screens.css';

export default function MyDemand() {
  const { clusters, signals, hypotheses, offersFor, pendingConfirmations, outcomes } = useDemand();
  const mine = clusters.filter((c) => c.joined || c.mine);
  const matches = mine.flatMap((c) => offersFor(c.id).map((o) => ({ ...o, cluster: c })));
  const purchases = [
    ...pendingConfirmations.map((a) => ({ ...a, kind: 'clicked' })),
    ...outcomes.map((o) => ({ ...o, kind: 'outcome' })),
  ];

  return (
    <div className="scr dm" data-testid="my-demand">
      <AppHeader />
      <h1 className="scr__h1">My Demand</h1>
      <p className="scr__lede">Requests you created or joined.</p>

      <section className="md__sec">
        <h2 className="dm__h2">Requests</h2>
        {mine.length === 0 && signals.length === 0 ? (
          <p className="hub__none">Nothing yet. Start from Home — tell us what you want.</p>
        ) : (
          <ul className="md__list">
            {mine.map((c) => (
              <li key={c.id}>
                <Link to={`/app/demand/${c.id}`} className="md__row">
                  <span className="md__need">{c.normalizedNeed}</span>
                  <span className="md__meta">{statusLabel(c.status)} · {c.counts?.joined ?? c.participantCount} joined</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="md__sec">
        <h2 className="dm__h2">My Matches</h2>
        {matches.length === 0 ? (
          <p className="hub__none">Offers appear here when brands respond to demand you joined.</p>
        ) : (
          <ul className="md__list">
            {matches.map((o) => (
              <li key={o.id}>
                <Link to={`/app/demand/${o.cluster.id}`} className="md__row">
                  <span className="md__need">{o.brand} · {o.product}</span>
                  <span className="md__meta">{o.label} · {formatMoney(o.priceUsd)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="md__sec">
        <h2 className="dm__h2">Purchases</h2>
        <p className="hub__none">
          Tracked brand checkouts land here when a referral comes back. Until then, your redirects stay on the demand page.
        </p>
        {purchases.length > 0 && (
          <ul className="md__list">
            {purchases.map((p) => {
              const cluster = clusters.find((c) => c.id === p.clusterId);
              return (
                <li key={p.id}>
                  <Link to={`/app/demand/${p.clusterId}`} className="md__row">
                    <span className="md__need">{cluster?.normalizedNeed ?? 'A demand you joined'}</span>
                    <span className="md__meta">{p.kind === 'clicked' ? 'Waiting on your confirmation' : 'Feedback recorded'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {hypotheses.length > 0 && (
        <section className="md__sec">
          <h2 className="dm__h2">Scout Activity</h2>
          <ul className="md__list">
            {hypotheses.map((h) => (
              <li key={h.id} className="md__row">
                <span className="md__need">{h.text}</span>
                <span className="md__meta">Originator</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/app/demand/new" className="ax-btn ax-btn--primary ax-btn--full dm__open">Open a Demand</Link>
    </div>
  );
}
