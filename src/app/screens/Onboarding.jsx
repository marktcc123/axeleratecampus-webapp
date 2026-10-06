import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { markSeen } from '../firstrun.js';
import './onboarding.css';

const STEPS = [
  {
    h1: 'Tell us what you want.',
    lede: 'Axelerate starts with your demand — not a catalog, and not a campus gig board.',
  },
  {
    h1: 'You’re not alone.',
    lede: 'Similar requests become live demand. Brands see who already wants what they make.',
    kinds: [
      ['Demand signal', 'You'],
      ['Live demand', 'Us'],
      ['Brand offer', 'Them'],
      ['You choose', 'Buy'],
    ],
  },
  {
    h1: 'Brands compete for you.',
    lede: 'A few curated offers. Ranked on fit, price and availability — not on who bought the placement.',
    pairs: [
      ['Ask', 'Say what you want next.'],
      ['Join', 'Find others who want the same.'],
      ['Choose', 'Pick the offer that fits.'],
    ],
  },
  {
    h1: 'Demand first. Supply second.',
    lede: 'The marketplace for demand. Students, creators and communities are how it starts — not who it is for.',
    tags: ['Capture', 'Aggregate', 'Respond', 'Choose', 'Learn'],
  },
];

const LAST = 4;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const screen = STEPS[step - 1];

  useEffect(() => { markSeen('intro'); }, []);

  const done = () => navigate('/');

  return (
    <main className="ob">
      <div className="ob__top">
        <ol className="ob__pips" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="ob__pip" data-on={n <= step ? '' : undefined} />
          ))}
        </ol>
        <p className="sr-only" role="status">{`Step ${step} of ${LAST}`}</p>
        <Link to="/" className="ob__skip">Skip</Link>
      </div>

      <div className="ob__body">
        <h1 className="ob__h1">{screen.h1}</h1>
        <p className="ob__lede">{screen.lede}</p>
        {screen.kinds && (
          <ul className="ob__kinds">
            {screen.kinds.map(([kind, pay]) => (
              <li key={kind} className="ob__kind" data-testid="ob-kind">
                <span className="ob__kind-t">{kind}</span>
                <span className="ob__kind-p">{pay}</span>
              </li>
            ))}
          </ul>
        )}
        {screen.pairs && (
          <dl className="ob__pairs">
            {screen.pairs.map(([term, what]) => (
              <div key={term} className="ob__pair" data-testid="ob-pair">
                <dt className="ob__pair-t">{term}</dt>
                <dd className="ob__pair-d">{what}</dd>
              </div>
            ))}
          </dl>
        )}
        {screen.tags && (
          <ul className="ob__tags">
            {screen.tags.map((t) => (
              <li key={t} className="ob__tag" data-testid="ob-tag">{t}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="ob__foot">
        {step < LAST ? (
          <button type="button" className="ob__next" onClick={() => setStep((s) => s + 1)}>
            Next <span aria-hidden="true">&rarr;</span>
          </button>
        ) : (
          <button type="button" className="ob__next" onClick={done}>
            See what you want next <span aria-hidden="true">&rarr;</span>
          </button>
        )}
      </div>
    </main>
  );
}
