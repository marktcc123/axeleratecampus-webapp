import { Link } from 'react-router-dom';
import { StickyNote } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import SubScreen from '../parts/SubScreen.jsx';
import { useDemand } from '../demand.jsx';
import './about.css';

const TERMS = [
  ['Ask', 'Say what you want', 'flag-line', 'outline', 'coral'],
  ['Gather', 'Find similar demand', 'user', 'outline', 'yellow'],
  ['Choose', 'Pick a brand offer', 'tick-2', 'outline', 'lavender'],
];

export default function About() {
  const { clusters } = useDemand();
  const example = clusters.find((c) => c.id === 'korean-sunscreen-25') ?? clusters[0];

  return (
    <SubScreen title="What is Axelerate">
      <div className="abt" data-testid="about">
        <p className="abt__lede">Tell us what you want. Let <span className="abt__hi"><span>brands compete</span></span> for you.</p>
        <p className="abt__sub">Demand first. Supply second. The marketplace for demand.</p>

        <section className="abt__sec" aria-labelledby="abt-how">
          <p className="abt__kicker" id="abt-how">How it works</p>
          <StickyNote tint="yellow" tilt={-1.5} tape heading="Demand → Aggregation → Offers → Choice" className="abt__note" />
          <ul className="abt__legend" data-testid="about-legend">
            {TERMS.map(([term, word, icon, set, tint]) => (
              <li key={term} className={`abt__term abt__term--${tint}`}>
                <Icon name={icon} set={set} size={18} className="abt__term-ico" />
                <span className="abt__term-k">{term}</span>
                <span className="abt__term-v">{word}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="abt__sec" aria-labelledby="abt-01">
          <p className="abt__kicker" id="abt-01"><span className="abt__num">01</span>Start with demand</p>
          <h2 className="abt__h2">A sentence is a demand signal.</h2>
          <p className="abt__p">You say what you want. We do not open a public market from one request. Similar signals become live demand.</p>
          {example && (
            <div className="abt__card abt__mission" data-testid="example-demand">
              <span className="abt__tag">Demo</span>
              <p className="abt__m-brand">{example.category}</p>
              <p className="abt__m-title">{example.normalizedNeed}</p>
              <p className="abt__m-earn">
                <span className="abt__m-pay"><span>{example.qualifiedDemandCount} ready</span></span>
                <span className="abt__m-xp">{example.participantCount} joined</span>
              </p>
            </div>
          )}
          <Link to="/app/demand/new" className="abt__go">Start a Demand »</Link>
        </section>

        <section className="abt__sec" aria-labelledby="abt-02">
          <p className="abt__kicker" id="abt-02"><span className="abt__num">02</span>Brands respond</p>
          <h2 className="abt__h2">A few offers. Not a catalog.</h2>
          <dl className="abt__pays" data-testid="about-pays">
            <div className="abt__pay abt__pay--coral"><dt>Fit</dt><dd>Does it match what people asked for?</dd></div>
            <div className="abt__pay abt__pay--yellow"><dt>Price</dt><dd>Does it sit inside the budget window?</dd></div>
            <div className="abt__pay abt__pay--gray"><dt>Trust</dt><dd>Ranking is not sold. Sponsored placements, if they arrive later, will be labeled.</dd></div>
          </dl>
        </section>

        <section className="abt__sec" aria-labelledby="abt-03">
          <p className="abt__kicker" id="abt-03"><span className="abt__num">03</span>You choose</p>
          <h2 className="abt__h2">Buy from the brand. We track the referral.</h2>
          <p className="abt__p">Axelerate does not own inventory. Checkout stays with the brand. We own demand, matching, and the outcome data.</p>
          <Link to="/app/discover" className="abt__go">Explore Live Demand »</Link>
        </section>

        <section className="abt__sec" aria-labelledby="abt-04">
          <p className="abt__kicker" id="abt-04"><span className="abt__num">04</span>For brands</p>
          <h2 className="abt__h2">Stop guessing demand.</h2>
          <p className="abt__p">Respond to people who already want what you offer. Compete on product, price, and fit — not impressions.</p>
          <Link to="/merchant" className="abt__go">Respond as a brand »</Link>
        </section>

        <section className="abt__sec abt__sec--quiet" aria-labelledby="abt-faq">
          <p className="abt__kicker" id="abt-faq">Questions</p>
          <dl className="abt__faq" data-testid="about-faq">
            <div className="abt__qa"><dt>Who is this for?</dt><dd>Anyone with a want. Early demand may come from campuses and local communities. The product is not a student platform.</dd></div>
            <div className="abt__qa"><dt>Do I buy from Axelerate?</dt><dd>No. Brands hold inventory and checkout. A tracked link is how V0 records the referral.</dd></div>
            <div className="abt__qa"><dt>Is this advertising?</dt><dd>No. Brands respond to demand that already exists.</dd></div>
          </dl>
        </section>
      </div>
    </SubScreen>
  );
}
