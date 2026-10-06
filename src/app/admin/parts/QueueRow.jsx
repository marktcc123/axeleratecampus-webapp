import { Badge, Card } from 'axelerate-design-system';

// Every queue in the console is this row. A flat Card (the panel it sits on
// already carries the ground), a header that is a button, and a body that only
// exists when open — not hidden with CSS, so a collapsed row costs a screen
// reader nothing.
//
// Status always carries its word. A Badge tone alone would put the whole
// meaning in colour.
//
// The design system's own status tones cannot be used here: Badge renders at
// 12px bold, which WCAG AA scores against the 4.5:1 threshold, and measured on
// the rendered component `warning` is 4.36:1 while `success` and `danger` are
// 3.85:1. All three fail. Filed upstream; fixing it means changing
// --success/warning/danger-fg, which is a design-system change.
//
// So these are the six-hue accent tones, every one of which carries ink at
// 4.98:1 or better, plus `brand` (white on violet, 6.48) and `neutral`
// (gray-700 on quiet, 8.93). Settled rows go neutral on purpose: a work queue
// should put its colour on what still needs work, not on what is finished.
export const TONES = {
  // Waiting on someone
  pending: 'yellow',
  return: 'yellow',
  submitted: 'brand',
  shipping: 'brand',
  // Finished — quiet
  approved: 'neutral',
  complete: 'neutral',
  completed: 'neutral',
  delivered: 'neutral',
  verified: 'neutral',
  shipped: 'neutral',
  placed: 'neutral',
  cancelled: 'neutral',
  returned: 'neutral',
  // Refused
  rejected: 'coral',
  declined: 'coral',
  cancellation: 'coral',
};

export default function QueueRow({ title, meta, status, open, onToggle, actions, children }) {
  return (
    <Card variant="flat" className="adm-row" data-testid="queue-row">
      <button type="button" className="adm-row__head" onClick={onToggle} aria-expanded={open}>
        <span className="adm-row__mid">
          <span className="adm-row__title">{title}</span>
          {meta && <span className="adm-row__meta">{meta}</span>}
        </span>
        {status && <Badge tone={TONES[status] ?? 'neutral'} tilt={0}>{status}</Badge>}
        <span className={`adm-row__chev${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="adm-row__body">
          {children}
          {actions && <div className="adm-row__actions">{actions}</div>}
        </div>
      )}
    </Card>
  );
}

// The detail line every panel writes: a caps label beside its value.
export function RowFact({ label, value }) {
  return (
    <p className="adm-row__fact">
      <span className="adm-row__fact-l">{label}</span>
      <span className="adm-row__fact-v">{value}</span>
    </p>
  );
}
