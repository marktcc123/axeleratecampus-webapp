import { useState } from 'react';
import { Link } from 'react-router-dom';
import SubScreen from '../parts/SubScreen.jsx';
import { useDemand } from '../demand.jsx';
import { formatBudget, formatMoney } from '../../lib/demand.js';
import './demand.css';

const EMPTY = {
  productId: '',
  priceUsd: '',
  bundle: '',
  inventory: '',
  shippingTime: '3–5 days',
  why: '',
};

export default function Merchant() {
  const { clusters, products, submitOffer, merchantView, merchantOpportunities, myOrg } = useDemand();
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const catalog = products.filter((p) => (myOrg ? p.orgId === myOrg.id : false));
  const live = myOrg
    ? merchantOpportunities(myOrg).map((row) => row.cluster)
    : clusters.filter((c) => c.openToMerchants);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    if (!target) return;
    const result = submitOffer({
      clusterId: target.id,
      orgId: myOrg?.id,
      productId: form.productId,
      priceUsd: Number(form.priceUsd),
      bundle: form.bundle || null,
      inventory: Number(form.inventory) || 0,
      shippingTime: form.shippingTime,
      why: form.why,
    });
    if (result?.error) {
      setError(result.message);
      setSent(null);
      return;
    }
    setError(null);
    setSent(result.offer);
    setForm(EMPTY);
  };

  return (
    <SubScreen
      title="Merchant"
      kicker="Brands"
      back={{ to: '/app', label: 'Back' }}
      lede="Stop guessing demand. Sell to consumers who already want what you offer."
    >
      <div className="mc" data-testid="merchant">
        <h2 className="mc__h">Sell into demand that already exists.</h2>
        <p className="mc__p">Consumers already told us what they want. Respond to verified demand. Compete on product, price, and fit — not impressions.</p>

        {!myOrg && (
          <p className="mc__p">
            <Link to="/merchant/join">Register your business</Link> before submitting an offer.
            Until the business identity is verified, an offer stays in review and never reaches a buyer.
          </p>
        )}
        {myOrg && myOrg.status !== 'verified' && (
          <p className="mc__p" data-testid="merchant-pending">Verification in progress. You can read demand now. Offers unlock once the business identity is confirmed.</p>
        )}

        <ul className="mc__blocks">
          {live.map((c) => {
            const view = merchantView(c.id);
            const stats = view?.outcome ?? {};
            return (
              <li key={c.id} className="mc__block">
                <p className="mc__need">{c.normalizedNeed}</p>
                <dl className="mc__stats">
                  <div><dd>{view?.activeDemand ?? c.counts?.joined ?? 0}</dd><dt>Active demand</dt></div>
                  <div><dd>{view?.readyToBuy ?? c.counts?.readyToBuy ?? 0}</dd><dt>Ready to buy</dt></div>
                  <div><dd>{formatBudget(c.budgetRange, view?.targetPrice ?? c.averageBudget)}</dd><dt>Median budget</dt></div>
                </dl>
                {(stats.verifiedPurchases > 0) && (
                  <p className="mc__out" data-testid="merchant-outcomes">
                    {stats.verifiedPurchases} verified purchases · {formatMoney(stats.verifiedRevenue)} verified GMV · {(stats.conversion * 100).toFixed(1)}% verified conversion
                  </p>
                )}
                {(stats.selfReported > 0) && (
                  <p className="mc__out">{stats.selfReported} self-reported. Not counted as verified GMV.</p>
                )}
                <button
                  type="button"
                  className="ax-btn ax-btn--primary ax-btn--full"
                  onClick={() => { setTarget(c); setSent(null); setError(null); }}
                >
                  Respond with an Offer
                </button>
              </li>
            );
          })}
        </ul>

        {target && (
          <form className="mc__form" onSubmit={onSubmit}>
            <h3 className="dm__h2">Respond · {target.normalizedNeed}</h3>
            <label className="mc__field">
              <span>Product</span>
              <select required value={form.productId || ''} onChange={set('productId')}>
                <option value="">Choose from your catalog</option>
                {catalog.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {!catalog.length && <p className="mc__p">Add a product before you can submit an offer. Match is calculated from the product’s attributes.</p>}
            {[
              ['priceUsd', 'Offer price', 'number'],
              ['bundle', 'Bundle / gift', 'text'],
              ['inventory', 'Allocated inventory', 'number'],
              ['shippingTime', 'Shipping promise', 'text'],
            ].map(([k, label, type]) => (
              <label key={k} className="mc__field">
                <span>{label}</span>
                <input required={k === 'priceUsd' || k === 'inventory'} type={type} value={form[k]} onChange={set(k)} />
              </label>
            ))}
            <label className="mc__field">
              <span>Why this product fits</span>
              <textarea required rows={4} value={form.why} onChange={set('why')} />
            </label>
            <button type="submit" className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full">Submit Offer</button>
            {error && <p className="mc__err" role="alert">{error}</p>}
            {sent && (
              <p className="mc__ok" role="status">
                Offer submitted for review. It reaches buyers after it’s approved — not before.
              </p>
            )}
          </form>
        )}
      </div>
    </SubScreen>
  );
}
