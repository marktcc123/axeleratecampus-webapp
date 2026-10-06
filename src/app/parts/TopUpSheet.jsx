import { useEffect, useRef, useState } from 'react';
import { Button, Input } from 'axelerate-design-system';
import { usdExact } from './Money.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import { startWalletTopUp } from '../../lib/checkout.js';
import { MAX_TOPUP_USD, MIN_TOPUP_USD, topupCents } from '../../lib/wallet-topup.js';
import './withdraw-sheet.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';

export default function TopUpSheet({ open, onClose }) {
  const ref = useRef(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setAmount('');
      setError('');
      setBusy(false);
    }
    wasOpen.current = open;
  });

  useEffect(() => {
    if (!open) return undefined;
    const sheet = ref.current;
    const focusables = () => [...sheet.querySelectorAll(FOCUSABLE)];
    focusables()[0]?.focus();
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const priced = amount.trim() === '' ? null : topupCents(amount);
  const amountError = priced && !priced.ok ? priced.error : '';

  async function confirm() {
    if (!priced?.ok || busy) return;
    if (!isLiveBackend()) {
      setError('Add funds needs the live wallet.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await startWalletTopUp(priced.amountUsd);
    if (!result.ok || !result.url) {
      setBusy(false);
      setError(result.error || 'Could not start card checkout.');
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <>
      <div className="wds__overlay" onClick={onClose} />
      <div className="wds" role="dialog" aria-modal="true" aria-labelledby="topup-h" ref={ref} data-testid="topup-sheet">
        <div className="wds__grab" />
        <h2 className="wds__h" id="topup-h">Add funds</h2>
        <p className="wds__hand">Card, ${MIN_TOPUP_USD} to ${MAX_TOPUP_USD}. Cash updates after the card payment is confirmed.</p>
        <div className="wds__field">
          <Input
            label="Amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setError(''); }}
            placeholder={`${MIN_TOPUP_USD}.00`}
            error={amountError || undefined}
            style={{ width: '100%' }}
            data-testid="topup-amount"
          />
        </div>
        {error && <p className="wds__gate" role="alert">{error}</p>}
        <div className="wds__act">
          <Button variant="primary" size="md" fullWidth onClick={confirm} disabled={!priced?.ok || busy}>
            {priced?.ok ? `Continue to card · ${usdExact(priced.amountUsd)} »` : 'Continue to card'}
          </Button>
        </div>
      </div>
    </>
  );
}
