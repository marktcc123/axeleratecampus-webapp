import { useState } from 'react';
import { useDemand } from '../../demand.jsx';
import { feeFor } from '../../../lib/marketplace.js';

// The marketplace control plane. Legacy missions/shop tabs stay behind
// VITE_LEGACY_MODE. This panel is what actually moves a cluster, a merchant,
// an offer, or a purchase.

export default function Market({ section }) {
  const demand = useDemand();
  const view = demand.adminView();
  if (section === 'merchants') return <Merchants demand={demand} rows={view.organizations} />;
  if (section === 'offers') return <Offers demand={demand} rows={view.offers} />;
  if (section === 'attribution') return <Attribution demand={demand} rows={view.attributions} />;
  return <Demand rows={view.clusters} demand={demand} funnel={view.funnel} />;
}

function Demand({ rows, demand, funnel }) {
  return (
    <section>
      <h2>Demand</h2>
      <p data-testid="compression">
        {funnel.openedNew ?? 0} new clusters · {funnel.joinedExisting ?? 0} joins of existing demand
        · {funnel.clusters ?? 0} clusters
      </p>
      <ul>
        {rows.map((c) => (
          <li key={c.id} data-testid="admin-cluster">
            <b>{c.need}</b> · {c.status} · {c.counts?.joined ?? 0} active · {c.counts?.readyToBuy ?? 0} ready
            {c.demo ? ' · demo' : ''}
            <button type="button" onClick={() => demand.setClusterStatus(c.id, 'sourcing', { force: true })}>Mark sourcing</button>
            <button type="button" onClick={() => demand.setClusterStatus(c.id, 'expired', { force: true })}>Expire</button>
            <button type="button" onClick={() => demand.setClusterStatus(c.id, 'rejected', { force: true })}>Reject</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Merchants({ demand, rows }) {
  return (
    <section>
      <h2>Merchants</h2>
      <ul>
        {rows.map((o) => (
          <li key={o.id} data-testid="admin-org">
            <b>{o.name}</b> · {o.status}
            <button type="button" onClick={() => demand.setOrgStatus(o.id, 'verified')}>Verify identity</button>
            <button type="button" onClick={() => demand.setOrgStatus(o.id, 'rejected')}>Reject</button>
            <button type="button" onClick={() => demand.setOrgStatus(o.id, 'suspended')}>Suspend</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Offers({ demand, rows }) {
  return (
    <section>
      <h2>Offers</h2>
      <ul>
        {rows.map((o) => (
          <li key={o.id}>
            <b>{o.product || o.productId}</b> · {o.status} · ${o.priceUsd}
            {o.status === 'submitted' && (
              <button type="button" onClick={() => demand.setOfferStatus(o.id, 'approved')}>Approve</button>
            )}
            {o.status === 'approved' && (
              <button type="button" onClick={() => demand.setOfferStatus(o.id, 'live')}>Set live</button>
            )}
            {o.status === 'live' && (
              <button type="button" onClick={() => demand.setOfferStatus(o.id, 'paused')}>Pause</button>
            )}
            {['submitted', 'approved', 'live'].includes(o.status) && (
              <button type="button" onClick={() => demand.setOfferStatus(o.id, 'rejected')}>Reject</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Attribution({ demand, rows }) {
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  return (
    <section>
      <h2>Attribution</h2>
      <p>Self-report does not verify revenue. Enter the merchant order id to verify.</p>
      <ul>
        {rows.filter((a) => !a.demo).map((a) => (
          <li key={a.id}>
            {a.attributionToken || a.id} · {a.state}
            {a.state !== 'merchant_verified' && a.state !== 'attributed' && (
              <form onSubmit={(e) => {
                e.preventDefault();
                demand.verifyPurchase({ attributionId: a.id, merchantOrderId: orderId, amount, verifiedBy: 'admin' });
              }}>
                <input aria-label="Merchant order id" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
                <input aria-label="Order amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button type="submit">Verify purchase</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <p>Verified fee uses the organization’s commercial config. {feeFor(null) == null ? 'Unconfigured merchants show no fee.' : ''}</p>
    </section>
  );
}
