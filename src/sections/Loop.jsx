import { Card } from 'axelerate-design-system';
import './sections.css';

const STEPS = [
  { t: 'Apply to a mission', d: 'Pick a paid piece of work from a brand on your campus.' },
  { t: 'Do the work', d: 'Make the video, staff the table, run the event — to the brief.' },
  { t: 'The brand approves', d: 'One approval, one code path. That is the only way XP is ever written.' },
  { t: 'Cash lands. XP lands.', d: 'Dollars go to your wallet — withdrawable. XP moves you up the ladder.' },
  { t: 'Better missions open up', d: 'Each level adds access, status and perks. Never a pay multiplier.' },
];

export default function Loop() {
  return (
    <section id="loop" className="section" aria-labelledby="loop-title">
      <div className="wrap">
        <p className="section__kicker">How it works</p>
        <h2 id="loop-title" className="section__title">One loop. Real money, real record.</h2>
        <ol className="loop__list">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <Card variant="quiet" padding="md" scribble={String(i + 1)} tilt={i % 2 ? 0.8 : -0.8} className="loop__step">
                <div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
