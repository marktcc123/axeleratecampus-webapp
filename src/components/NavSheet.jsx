import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const FOCUSABLE = 'a[href], button:not([disabled])';

export const NAV_LINKS = [
  { to: '/#loop', label: 'How it works' },
  { to: '/#ladder', label: 'The ladder' },
  { to: '/for-brands', label: 'For brands' },
];

export default function NavSheet({ open, onClose }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const focusables = () => [...sheet.querySelectorAll(FOCUSABLE)];
    focusables()[0]?.focus();

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="sheet__overlay" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Menu" ref={sheetRef}>
        <div className="sheet__head">
          <span className="nav__wordmark" aria-hidden="true">axelerate</span>
          <button type="button" className="sheet__close ax-btn ax-btn--ghost ax-btn--sm" onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className="sheet__links" aria-label="Site">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={onClose}>{l.label}</Link>
          ))}
        </nav>
        <Link to="/verify" onClick={onClose} className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full">
          Join the squad
        </Link>
      </div>
    </>
  );
}
