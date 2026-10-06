import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, Input } from 'axelerate-design-system';

// The admin console's preview lock.
//
// This is NOT security. There is no backend, so the password is compared in
// the browser against a build-time env var, which means it ships inside the
// client bundle and anyone who opens devtools can read it. Bypassing it needs
// nothing more than clearing one sessionStorage key.
//
// It exists so the console is not stumbled into during a demo. When Supabase
// arrives, checkPassword() is the seam a real check replaces — every caller
// goes through it.
export const ADMIN_SESSION_KEY = 'ax-admin-unlocked';

// A fresh clone with no .env still runs.
const DEV_PASSWORD = 'campus-lead';

export function adminPassword() {
  const fromEnv = import.meta.env.VITE_ADMIN_PASSWORD;
  return fromEnv ? String(fromEnv) : DEV_PASSWORD;
}

export function checkPassword(value) {
  if (!value) return false;
  return String(value) === adminPassword();
}

// Storage throws outright in some contexts (private windows, blocked site
// data), so every read and write is guarded and a failure just reads locked.
export function isUnlocked() {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setUnlocked(on) {
  try {
    if (on) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* a locked console is the safe failure */
  }
}

export function useAdminUnlock() {
  const [unlocked, setState] = useState(isUnlocked);

  const tryPassword = useCallback((value) => {
    if (!checkPassword(value)) return false;
    setUnlocked(true);
    setState(true);
    return true;
  }, []);

  const relock = useCallback(() => {
    setUnlocked(false);
    setState(false);
  }, []);

  return { unlocked, tryPassword, relock };
}

// `hint` is safe: Input renders the message as a SIBLING of the label, so it
// never joins the accessible name. This screen avoided the prop for months on
// the strength of a defect the design system had already fixed — verified
// 2026-08-31 that getByLabelText('School email') still matches exactly.
//
// Input is a plain function component, not a forwardRef, so there is no ref to
// hand Dialog as `initialFocus` — Dialog focuses its own container instead,
// which still moves focus into the modal. Patching the design system to add
// ref forwarding would be a component-layer change.
export default function AdminGateDialog({ open, onClose, onUnlocked }) {
  const { tryPassword } = useAdminUnlock();
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (!open) { setValue(''); setWrong(false); }
  }, [open]);

  const submit = (e) => {
    if (e) e.preventDefault();
    if (tryPassword(value)) { onUnlocked(); return; }
    setWrong(true);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Admin access"
      width={380}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Unlock</Button>
        </>
      )}
    >
      <form onSubmit={submit}>
        <Input
          label="Password"
          type="password"
          name="admin-password"
          autoComplete="off"
          hint="Ask the campus lead. This console runs on example data."
          error={wrong ? "That's not it. Give it another go?" : undefined}
          value={value}
          onChange={(e) => { setValue(e.target.value); setWrong(false); }}
        />
      </form>
    </Dialog>
  );
}
