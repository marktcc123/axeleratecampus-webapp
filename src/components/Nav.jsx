import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import NavSheet, { NAV_LINKS } from './NavSheet.jsx';
import './shell.css';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    // Return focus to the control that opened the sheet. (Synchronous, not
    // requestAnimationFrame — jsdom's RAF makes the Escape test's
    // toHaveFocus() assertion flaky.)
    toggleRef.current?.focus();
  }, []);

  return (
    <header className="nav">
      <div className="wrap nav__row">
        <Link to="/" className="nav__wordmark">axelerate</Link>
        <nav className="nav__links" aria-label="Site">
          {NAV_LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
        </nav>
        {/* .ax-btn styles this plain <Link> even though nothing here imports
            Button: any import from the design-system barrel evaluates all 22
            component modules, each of which injects its own <style> tag, and
            the package's sideEffects declaration keeps them in production builds. */}
        <Link to="/verify" className="nav__cta ax-btn ax-btn--primary ax-btn--sm">Join the squad</Link>
        <button
          ref={toggleRef}
          type="button"
          className="nav__toggle ax-btn ax-btn--ghost ax-btn--sm"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="nav__bars" aria-hidden="true"><span /><span /><span /></span>
        </button>
      </div>
      <NavSheet open={open} onClose={close} />
    </header>
  );
}
