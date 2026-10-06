import { useEffect, useRef, useState } from 'react';
import { Button, Input, Textarea } from 'axelerate-design-system';
import './attend-sheet.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])';

// The name is printed on the pass's stub and the message is read by a host, so
// both are bounded here rather than at the door: 60 fits the stub line at 320px
// and 240 is a line, not a letter.
const NAME_MAX = 60;
const MESSAGE_MAX = 240;

// Saving a seat asks three things (owner, 2026-09-09): the name for the door,
// the date you are saying yes to, and a line for the host. The app's sheet
// idiom — overlay, panel at the foot, focus trapped, Escape closes, the page
// behind does not scroll — the same as Apply, Checkout and the filter sheet.
export default function AttendSheet({ open, onClose, onSubmit, event: ev, when, defaultName = '' }) {
  const ref = useRef(null);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState('');
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) { setName(defaultName); setMessage(''); setTried(false); } }, [open, defaultName]);
  useEffect(() => {
    if (!open) return undefined;
    const sheet = ref.current;
    const focusables = () => [...sheet.querySelectorAll(FOCUSABLE)];
    focusables()[0]?.focus();
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables(); const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  const nameError = tried && !name.trim() ? 'We need a name for the door.' : undefined;
  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (!name.trim()) return;
    onSubmit({ name, message });
  };
  return (
    <>
      <div className="ats__overlay" onClick={onClose} aria-hidden="true" />
      <form className="ats" role="dialog" aria-modal="true" aria-labelledby="ats-title" ref={ref} onSubmit={submit} noValidate>
        <div className="ats__grab" aria-hidden="true" />
        <div className="ats__top">
          <h2 className="ats__h" id="ats-title">Save me a seat</h2>
          <button type="button" className="ats__x" onClick={onClose} aria-label="Close"><span className="ats__x-mark" aria-hidden="true" /></button>
        </div>
        <p className="ats__event">{ev.title}</p>

        <div className="ats__field">
          <Input
            label="Your name"
            autoComplete="name"
            placeholder="The name on the door list"
            maxLength={NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            error={nameError}
            data-testid="attend-name"
            style={{ width: '100%' }}
          />
        </div>
        {/* The date is the event's, not a choice: it is shown to be agreed to. */}
        <dl className="ats__when">
          <dt>When</dt>
          <dd>{when}</dd>
        </dl>
        <div className="ats__field">
          <Textarea
            label="A line for the host (optional)"
            rows={3}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
            hint={message.length > MESSAGE_MAX - 60 ? `${MESSAGE_MAX - message.length} characters left` : undefined}
            data-testid="attend-message"
            placeholder="Anything they should know?"
          />
        </div>

        <div className="ats__act">
          <Button type="submit" variant="primary" size="md" fullWidth data-testid="attend-submit">Save my seat »</Button>
        </div>
      </form>
    </>
  );
}
