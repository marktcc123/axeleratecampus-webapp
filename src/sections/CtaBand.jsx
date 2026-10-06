import { Link } from 'react-router-dom';
import './sections.css';

export default function CtaBand() {
  return (
    <section className="section section--band" aria-labelledby="band-title">
      <div className="wrap band__inner">
        <h2 id="band-title" className="band__title">Shape what's next.</h2>
        <p className="band__lede">Sign-up is open. Join with your email.</p>
        <Link to="/verify" className="ax-btn ax-btn--yellow ax-btn--lg">Join the squad</Link>
      </div>
    </section>
  );
}
