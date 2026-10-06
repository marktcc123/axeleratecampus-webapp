import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sticker } from 'axelerate-design-system';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import Doodle from '../components/Doodle.jsx';
import DemandHero from './parts/DemandHero.jsx';
import './welcome.css';
import './screens/demand.css';

export default function Welcome() {
  const nav = useNavigate();
  const [text, setText] = useState('');

  return (
    <main className="welcome">
      <div className="welcome__top">
        <Logo className="welcome__wordmark" />
      </div>

      <div className="welcome__body">
        <div className="welcome__scene" aria-hidden="true">
          <Doodle name="sparkle-butter" className="welcome__spark" />
          <span className="welcome__blob" />
          <Icon name="rocket" size={92} className="welcome__art" />
          <Sticker tone="ink" tilt={3} className="welcome__st welcome__st--a">Demand first</Sticker>
          <Sticker tone="yellow" tilt={-2} className="welcome__st welcome__st--b">Brands compete</Sticker>
        </div>

        <div className="welcome__demand">
          <DemandHero
            value={text}
            onChange={setText}
            onStart={(raw) => nav('/app/demand/new', { state: { rawText: raw } })}
            onExplore={() => nav('/app/discover')}
          />
        </div>
      </div>

      <div className="welcome__foot">
        <div className="welcome__doors">
          <Link to="/verify" className="welcome__cta ax-btn ax-btn--secondary ax-btn--lg ax-btn--full">
            Join the squad <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link to="/login" className="welcome__login ax-btn ax-btn--secondary ax-btn--lg ax-btn--full">
            Log in
          </Link>
        </div>
        <Link to="/onboarding" className="welcome__replay">Replay the intro</Link>
      </div>
    </main>
  );
}
