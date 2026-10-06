import { Link } from 'react-router-dom';
import SubScreen from '../parts/SubScreen.jsx';
import { useDemand } from '../demand.jsx';
import { formatBudget, formatMoney } from '../../lib/demand.js';
import { useSession } from '../session.jsx';
import './demand.css';

// The brand's door.
//
// A separate address from the consumer app on purpose: the two sides want
// different things, and dropping a merchant into a shopping feed to find a
// "sell with us" link buried in a menu is how a supply side fails to form.
// This page shows real open demand before it asks for anything.
export default function Brands() {
  const { clusters, merchantView, myOrg } = useDemand();
  const { signedIn } = useSession();

  const open = clusters
    .filter((c) => c.openToMerchants)
    .map((c) => merchantView(c.id))
    .filter(Boolean)
    .sort((a, b) => b.estimatedDemandUsd - a.estimatedDemandUsd)
    .slice(0, 4);

  return (
    <SubScreen
      title="For brands"
      kicker="Axelerate"
      back={{ to: '/app', label: 'Back' }}
      lede="Stop guessing demand. Answer consumers who already said what they want."
    >
      <div className="mc" data-testid="brands-landing">
        <h2 className="mc__h">Demand first. Supply second.</h2>
        <p className="mc__p">
          People describe what they want before anyone sells it to them. We group the
          similar requests, and once a block is large enough and serious enough, brands
          are invited to answer it. You compete on fit, price and availability.
        </p>

        <ol className="mc__how">
          <li><b>Register your business.</b> We verify identity before anything you publish reaches a consumer.</li>
          <li><b>Read live demand.</b> Qualified buyers, target price, the requirements people actually stated.</li>
          <li><b>Submit an offer.</b> Reviewed, then shown alongside competing brands.</li>
          <li><b>Sell on your own store.</b> We send the buyer to your checkout and attribute the sale.</li>
        </ol>

        <h3 className="dm__h2">Open demand right now</h3>
        {open.length === 0 ? (
          <p className="mc__p">No demand is open to offers this moment. Register and we&rsquo;ll tell you when a block in your category qualifies.</p>
        ) : (
          <ul className="mc__blocks">
            {open.map((v) => (
              <li key={v.clusterId} className="mc__block">
                <p className="mc__need">{v.need}</p>
                <dl className="mc__stats">
                  <div><dd>{v.qualifiedBuyers}</dd><dt>Qualified buyers</dt></div>
                  <div><dd>{formatMoney(v.estimatedDemandUsd)}</dd><dt>Estimated demand</dt></div>
                  <div><dd>{formatBudget(v.budgetRange, v.targetPrice)}</dd><dt>Target price</dt></div>
                </dl>
                <p className="mc__out">{v.purchaseWindow} · {v.competingOffers} competing {v.competingOffers === 1 ? 'offer' : 'offers'}</p>
              </li>
            ))}
          </ul>
        )}

        <p className="mc__fine">
          Aggregated demand only. Brands never receive consumer names, emails or
          addresses — on Axelerate or anywhere else.
        </p>

        <div className="mc__cta">
          {myOrg ? (
            <Link to="/merchant" className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full">
              Open your brand dashboard
            </Link>
          ) : (
            <Link
              to="/merchant/join"
              className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full"
              data-testid="brands-register"
            >
              Register your business
            </Link>
          )}
          {!signedIn && <p className="mc__fine">You&rsquo;ll create a business account on the next screen.</p>}
        </div>
      </div>
    </SubScreen>
  );
}
