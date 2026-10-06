import { Link } from 'react-router-dom';
import { formatBudget, statusLabel } from '../../lib/demand.js';
import './demand-card.css';

// A demand block, counted honestly.
//
// Below a handful of people the card says the demand is forming rather than
// dressing four requests up as a trend. Inflating an early number is the one
// lie a demand marketplace cannot afford: a brand that answers a fake 200 and
// sells nine units does not come back.
export default function DemandCard({ cluster, cta, to }) {
  const href = to ?? `/app/demand/${cluster.id}`;
  const counts = cluster.counts ?? { joined: cluster.participantCount ?? 0, qualified: cluster.qualifiedDemandCount ?? 0 };
  const n = counts.joined;
  const early = n < 10;
  const expired = cluster.status === 'expired';
  const action = cta ?? (expired ? 'See what happened' : cluster.joined ? 'You’re in' : 'Join demand');

  return (
    <article className="dc" data-testid="demand-card" data-status={cluster.status}>
      <p className="dc__count">
        {early
          ? <><b>{n}</b> {n === 1 ? 'person has' : 'people have'} asked for</>
          : <><b>{counts.joined}</b> active demand</>}
      </p>
      <h3 className="dc__need">{cluster.normalizedNeed}</h3>
      {(cluster.commonRequirements?.length > 0) && (
        <ul className="dc__reqs">
          {cluster.commonRequirements.slice(0, 3).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <p className="dc__meta">
        <span>{cluster.statusLabel ?? statusLabel(cluster.status)}</span>
        {cluster.purchaseWindow && <span>Purchase window · {cluster.purchaseWindow}</span>}
        {cluster.budgetRange && <span>Typical · {formatBudget(cluster.budgetRange, cluster.averageBudget)}</span>}
      </p>
      {cluster.liveOfferCount > 0 && (
        <p className="dc__offers">{cluster.liveOfferCount} {cluster.liveOfferCount === 1 ? 'brand has' : 'brands have'} responded</p>
      )}
      {cluster.scout && <p className="dc__scout">{cluster.scout.label}</p>}
      {cluster.demo && <p className="dc__demo">Demo demand</p>}
      <Link to={href} className="dc__cta ax-btn ax-btn--secondary ax-btn--full">
        {action}
      </Link>
    </article>
  );
}
