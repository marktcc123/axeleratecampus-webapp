import { Card, Badge } from 'axelerate-design-system';
import Icon from '../components/Icon.jsx';
import '../sections/sections.css';
import './pages.css';

const BENEFITS = [
  { icon: 'user', t: 'Verified students', d: 'Every student passes a .edu check, work eligibility, payout setup and reach verification before their first mission.' },
  { icon: 'checklist', t: 'One object: the mission', d: 'Content, field, event, sales — one board, one application pipeline, one payout path.' },
  { icon: 'tick-2', t: 'Proof, not promises', d: 'Every completed mission produces a verifiable work receipt a third party can check.' },
];

export default function ForBrandsPage() {
  return (
    <main className="page">
      <div className="wrap">
        <Badge tone="lavender" tilt={-2}>For brands</Badge>
        <h1 className="page__h1" style={{ marginTop: 'var(--space-md)' }}>Put your brand in students' hands, not just their feed.</h1>
        <p className="page__lede">
          Paid social is expensive and distrusted by exactly this audience. Missions put your product with
          verified students on their own campus — a video, a pop-up, a launch night — and every result comes
          with a receipt.
        </p>
        <div className="benefits">
          {BENEFITS.map((b, i) => (
            <Card key={b.t} variant="quiet" padding="md" tilt={[-1, 0.8, -0.6][i]}>
              <h3><Icon name={b.icon} size={20} style={{ color: 'var(--text-brand)' }} /> {b.t}</h3>
              <p>{b.d}</p>
            </Card>
          ))}
        </div>
        <div className="page__cta">
          <a href="#" className="ax-btn ax-btn--primary ax-btn--lg" onClick={(e) => e.preventDefault()} aria-describedby="book-note" aria-disabled="true">Book a call</a>
          <span id="book-note" className="section__note">Stay tuned. There is no calendar here yet.</span>
        </div>
      </div>
    </main>
  );
}
