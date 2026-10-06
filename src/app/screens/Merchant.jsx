import { useState } from 'react';
import { Link } from 'react-router-dom';
import SubScreen from '../parts/SubScreen.jsx';
import { useDemand } from '../demand.jsx';
import { formatBudget, formatMoney } from '../../lib/demand.js';
import './demand.css';

const EMPTY = {
  brand: '',
  product: '',
  checkoutUrl: '',
  image: '',
  retailPriceUsd: '',
  priceUsd: '',
  bundle: '',
  inventory: '',
  shippingTime: '3–5 days',
  why: '',
};

export default function Merchant() {
  const { clusters, submitOffer, merchantView, myOrg } = useDemand();
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const live = clusters.filter((c) => c.openToMerchants);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    if (!target) return;
    const result = submitOffer({
      clusterId: target.id,
      orgId: myOrg?.id,
      product: form.product,
      checkoutUrl: form.checkoutUrl,
      retailPriceUsd: Number(form.retailPriceUsd) || Number(form.priceUsd),
      priceUsd: Number(form.priceUsd),
      bundle: form.bundle || null,
      inventory: Number(form.inventory) || 0,
      shippingTime: form.shippingTime,
      why: form.why,
      matched: (target.commonRequirements ?? []).slice(0, 3),
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
                  <div><dd>{view?.qualifiedBuyers ?? c.qualifiedDemandCount}</dd><dt>Qualified buyers</dt></div>
                  <div><dd>{formatBudget(c.budgetRange, view?.targetPrice ?? c.averageBudget)}</dd><dt>Target price</dt></div>
                  <div><dd>{c.purchaseWindow}</dd><dt>Purchase window</dt></div>
                </dl>
                {(stats.purchases > 0) && (
                  <p className="mc__out" data-testid="merchant-outcomes">
                    {stats.purchases} purchases · {formatMoney(stats.revenue)} GMV · {(stats.conversion * 100).toFixed(1)}% conversion
                  </p>
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
            {[
              ['brand', 'Brand', 'text'],
              ['product', 'Product name', 'text'],
              ['checkoutUrl', 'Product / checkout URL', 'text'],
              ['image', 'Product image URL', 'text'],
              ['retailPriceUsd', 'Retail price', 'number'],
              ['priceUsd', 'Offered price', 'number'],
              ['bundle', 'Bundle / gift', 'text'],
              ['inventory', 'Inventory available', 'number'],
              ['shippingTime', 'Shipping time', 'text'],
            ].map(([k, label, type]) => (
              <label key={k} className="mc__field">
                <span>{label}</span>
                <input required={['brand', 'product', 'checkoutUrl', 'priceUsd'].includes(k)} type={type} value={form[k]} onChange={set(k)} />
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
