import { useEffect, useRef, useState } from 'react';
import { Button } from 'axelerate-design-system';
import { isLiveBackend } from '../../lib/supabase.js';
import { submitApplication } from '../../lib/apply.js';
import '../screens/gigs-detail.css';

// Same trap + Escape handling as NavSheet.jsx — one focus pattern for every
// dialog in the app rather than two that drift apart.
const FOCUSABLE = 'a[href], button:not([disabled])';

// Offline preview says nothing was sent. The live preview writes `user_gigs`.
export default function ApplySheet({ open, onClose, missionTitle, gigId, onSent }) {
  const ref = useRef(null);
  const live = isLiveBackend();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setSent(false); setError(''); setBusy(false); }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const sheet = ref.current;
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
      <div className="gd__overlay" onClick={onClose} aria-hidden="true" />
      <div className="gd__apply" role="dialog" aria-modal="true" aria-label="Apply" ref={ref}>
        {live ? (
          sent ? (
            <>
              <h2>You're on the list.</h2>
              <p>Your application for “{missionTitle}” is with the host.</p>
            </>
          ) : (
            <>
              <h2>Apply</h2>
              <p>This sends your application for “{missionTitle}”.</p>
              {error && <p role="alert">{error}</p>}
              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await submitApplication({ gigId });
                    setSent(true);
                    onSent?.();
                  } catch (err) {
                    setError(err.message || 'Could not send it.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Sending…' : 'Send application'}
              </Button>
            </>
          )
        ) : (
          <>
            <h2>Applications open at launch.</h2>
            <p>
              Nothing was sent. Verification opens at launch — you'll apply to “{missionTitle}” from here
              once it does, and the host will see it.
            </p>
          </>
        )}
        <Button variant="secondary" size="md" fullWidth onClick={onClose}>Close</Button>
      </div>
    </>
  );
}
