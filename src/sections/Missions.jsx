import { Link } from 'react-router-dom';
import MissionCard from '../components/MissionCard.jsx';
import missions from '../data/missions.example.json';
import './sections.css';

// The Dermabell T4 card is shown locked — the product spec's own example of
// the near-miss rule (R8): "Trusted · LV.4 — 620 XP away, about 3 missions".
const LOCKED = { 'dermabell-campus-launch': { xpAway: 620, missionsAway: 3 } };

// Cycled, so the sequence survives the fixture growing past four.
const TILTS = [-1, 1, -0.6, 0.8];

export default function Missions() {
  return (
    <section className="section" aria-labelledby="missions-title">
      <div className="wrap">
        <p className="section__kicker">Missions</p>
        <h2 id="missions-title" className="section__title">Every card leads with the dollar figure.</h2>
        <p className="section__lede">
          Content, field, event, sales — one board, one pipeline, one payout path. Anything you can't
          take yet tells you exactly how far away it is.
        </p>
        <div className="missions__grid">
          {missions.map((m, i) => (
            <MissionCard key={m.slug} mission={m} locked={LOCKED[m.slug]} tilt={TILTS[i % TILTS.length]} />
          ))}
        </div>
        <p className="missions__caption section__note">
          Example missions. <Link to="/app/earn">The live board is open.</Link>
        </p>
      </div>
    </section>
  );
}
