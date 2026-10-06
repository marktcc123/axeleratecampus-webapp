import { useEffect, useState } from 'react';
import { Button, Dialog, Textarea } from 'axelerate-design-system';

// A rejection has to say why, so the field is required and the button will not
// send without it.
//
// The design system ships a Textarea as of DS ea6b1d0, so this uses it. It was
// a local control styled from tokens until then, which is exactly the drift the
// component now exists to stop.
// `verb`: the button's word — "Reject" for work that fails review, "Decline"
// for a request or a sign-up that is turned down (owner, 2026-09-23).
export function RejectDialog({ open, title, placeholder, onClose, onSubmit, verb = 'Reject' }) {
  const [reason, setReason] = useState('');
  const [blank, setBlank] = useState(false);

  useEffect(() => {
    if (!open) { setReason(''); setBlank(false); }
  }, [open]);

  const send = () => {
    const text = reason.trim();
    if (!text) { setBlank(true); return; }
    onSubmit(text);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width={400}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send}>{verb} &amp; notify</Button>
        </>
      )}
    >
      {/* hint and error are safe to pass now: the component renders the message
          as a SIBLING of the label, so it never joins the accessible name. */}
      <Textarea
        label="Reason"
        rows={3}
        placeholder={placeholder}
        value={reason}
        onChange={(e) => { setReason(e.target.value); setBlank(false); }}
        hint={blank ? undefined : 'This goes to them as written.'}
        error={blank ? 'Say why, and it goes to them as written.' : undefined}
      />
    </Dialog>
  );
}

export default RejectDialog;
