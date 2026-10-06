import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../AppHeader.jsx';
import DemandHero from '../parts/DemandHero.jsx';
import DemandCard from '../parts/DemandCard.jsx';
import { useDemand } from '../demand.jsx';
import './demand.css';
import './screens.css';

export default function Home() {
  const nav = useNavigate();
  const { clusters } = useDemand();
  const [text, setText] = useState('');
  // Anything a person can still join. `converting` and `qualified` replaced the
  // old `qualifying` label; filtering on the old names left this list empty.
  const OPEN = new Set(['qualified', 'live', 'offers_open', 'offers_available', 'converting', 'scaled']);
  const live = clusters
    .filter((c) => OPEN.has(c.status))
    .sort((a, b) => (b.counts?.qualified ?? 0) - (a.counts?.qualified ?? 0));

  return (
    <div className="scr dm">
      <AppHeader />
      <DemandHero
        value={text}
        onChange={setText}
        onStart={(raw) => nav('/app/demand/new', { state: { rawText: raw } })}
        onExplore={() => nav('/app/discover')}
      />
      <section className="dm__live" aria-labelledby="live-h">
        <p className="dm__kicker" id="live-h">Live demand</p>
        <h2 className="dm__h2">You&rsquo;re not shopping a catalog. You&rsquo;re joining demand.</h2>
        <div className="dm__list">
          {live.length === 0 ? (
            <p className="dm__empty">No open demand yet. The first request is how a market starts.</p>
          ) : live.slice(0, 3).map((c) => (
            <DemandCard key={c.id} cluster={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
