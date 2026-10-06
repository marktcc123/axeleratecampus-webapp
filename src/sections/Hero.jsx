import { Link } from 'react-router-dom';
import { Badge } from 'axelerate-design-system';
import Icon from '../components/Icon.jsx';
import './sections.css';

export default function Hero() {
  return (
    <section className="hero ax-grid-paper" aria-labelledby="hero-title">
      <div className="wrap hero__inner">
        <Badge tone="yellow" tilt={-2}>Paid missions for verified students</Badge>
        <h1 id="hero-title" className="hero__h1">
          Shape <span className="hero__circle">what's next.</span>
        </h1>
        <p className="hero__lede">
          Brands post paid missions — make a video, staff a pop-up, run an event. You do the work,
          get paid in real dollars, and build a work record you can prove.
        </p>
        <div className="hero__ctas">
          <Link to="/verify" className="ax-btn ax-btn--primary ax-btn--lg">
            Join the squad <Icon name="arrow-right" size={18} />
          </Link>
          <a href="#loop" className="ax-btn ax-btn--ghost ax-btn--lg">See how it works</a>
        </div>
      </div>
    </section>
  );
}
