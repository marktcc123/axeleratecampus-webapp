import { formatMoney } from '../../lib/demand.js';
import './demand-card.css';

// One brand's answer, scored against the person reading it.
//
// `match` is the viewer's own OfferMatch, so the unmatched criteria are shown
// on the face of the card rather than hidden behind a lower rank. An offer
// that misses one of your must-haves is still worth seeing — it just has to
// admit what it misses.
export default function OfferCard({ offer, match, label, onView, onBuy }) {
  const matched = match?.matchedCriteria ?? offer.matched ?? [];
  const unmatched = match?.unmatchedCriteria ?? [];
  const shown = label ?? offer.label;
  const soldOut = match?.outOfStock ?? (offer.inventory ?? 1) <= 0;

  return (
    <article className="oc" data-testid="offer-card" data-label={shown}>
      {shown && <p className="oc__label">{shown}</p>}
      <div className="oc__top">
        <div>
          <p className="oc__brand">{offer.brand}</p>
          <h3 className="oc__product">{offer.product}</h3>
        </div>
        <p className="oc__price">
          {formatMoney(offer.priceUsd)}
          {offer.retailPriceUsd > offer.priceUsd && (
            <s>{formatMoney(offer.retailPriceUsd)}</s>
          )}
        </p>
      </div>
      {match?.overBudget && <p className="oc__over">Above the budget you set</p>}
      <p className="oc__why">{offer.why}</p>
      {matched.length > 0 && (
        <ul className="oc__matched">
          {matched.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      {unmatched.length > 0 && (
        <ul className="oc__unmatched" data-testid="offer-unmatched">
          {unmatched.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <p className="oc__meta">
        {offer.delivery && <span>Delivery · {offer.delivery}</span>}
        {offer.bundle && <span>{offer.bundle}</span>}
        {match?.matchScore != null && <span>Match {match.matchScore}</span>}
      </p>
      {/* Identity, not a safety certificate. Axelerate checks that a business
          is who it says it is; it does not vouch for the product. */}
      {offer.orgStatus === 'verified' && <p className="oc__verified">Business identity verified</p>}
      <p className="oc__trust">Ranked on fit, requirements, price and availability — not on what a brand paid to appear.</p>
      <div className="oc__acts">
        <button type="button" className="ax-btn ax-btn--secondary" onClick={() => onView?.(offer)}>
          View offer
        </button>
        <button
          type="button"
          className="ax-btn ax-btn--primary"
          onClick={() => onBuy?.(offer)}
          disabled={soldOut}
        >
          {soldOut ? 'Out of stock' : 'Buy from brand'}
        </button>
      </div>
    </article>
  );
}
