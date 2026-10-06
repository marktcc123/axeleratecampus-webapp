import { Link } from 'react-router-dom';
import './shell.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <Link to="/" className="footer__wordmark">axelerate</Link>
            <br />
            <span className="footer__tag">shape what's next</span>
          </div>
          <div className="footer__col">
            <h4>Students</h4>
            <Link to="/#loop">How it works</Link>
            <Link to="/#ladder">The ladder</Link>
            <Link to="/verify">Join the squad</Link>
          </div>
          <div className="footer__col">
            <h4>Company</h4>
            <Link to="/for-brands">For brands</Link>
            <Link to="/legal/terms">Terms</Link>
            <Link to="/legal/privacy">Privacy</Link>
            <Link to="/legal/payouts">Payouts</Link>
          </div>
        </div>
        <div className="footer__legal">© 2026 Axelerate. Paid missions for verified students.</div>
      </div>
    </footer>
  );
}
