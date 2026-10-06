import { useState } from 'react';
import { Input } from 'axelerate-design-system';

// Shipping, filled in on the order's own row (owner, 2026-09-23: a dialog for
// two fields was too much): the carrier and the tracking number side by side
// at the foot of the slip, and Mark shipped as a small link button under them. Both are required —
// they are what the student's receipt shows — and the button will not send
// without them; one line under the fields says so, rather than an error
// inside each label (the system's Input once rendered errors inside the
// <label>, where they joined the field's accessible name — DS issue #2).
//
// The state lives here and dies with the row: a QueueRow renders its body only
// while open, so closing the row clears a half-typed number.
export default function ShipFields({ onSubmit }) {
  const [carrier, setCarrier] = useState('');
  const [number, setNumber] = useState('');
  const [tried, setTried] = useState(false);
  const missing = !carrier.trim() || !number.trim();
  const send = () => {
    if (missing) { setTried(true); return; }
    onSubmit({ carrier: carrier.trim(), number: number.trim() });
  };
  return (
    <section className="slip__blk slip__ship" aria-label="Ship it">
      <p className="slip__lab">Ship it</p>
      <div className="slip__ship-fields">
        <Input label="Carrier" placeholder="UPS" autoComplete="off" value={carrier} onChange={(e) => setCarrier(e.target.value)} data-testid="ship-carrier" />
        <Input label="Tracking number" placeholder="1Z999AA10123456784" autoComplete="off" inputMode="text" value={number} onChange={(e) => setNumber(e.target.value)} data-testid="ship-number" />
      </div>
      {tried && missing && <p className="adm-form__err" role="alert">Carrier and tracking number are both needed — they go on the student's receipt.</p>}
      <div className="adm-row__actions">
        <button type="button" className="adm-link adm-link--go" onClick={send}>Mark shipped</button>
      </div>
    </section>
  );
}
