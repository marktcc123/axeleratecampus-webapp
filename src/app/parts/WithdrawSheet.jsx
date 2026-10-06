import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from 'axelerate-design-system';
import { usd, usdExact } from './Money.jsx';
import { useWallet } from '../wallet.jsx';
import { MIN_WITHDRAW_USD, INSTANT_FEE_RATE, INSTANT_FEE_MIN_USD, feeFor, netFor, gates, w9Block } from '../payout.js';
import { isLiveBackend } from '../../lib/supabase.js';
import { LIVE_MIN_USD } from '../../lib/withdrawals.js';
import W9Upload from './W9Upload.jsx';
import './withdraw-sheet.css';

// Cash out. The owner's one dialog pattern — same focus trap, Escape and body
// scroll lock as the gift, review and checkout sheets — with the questions a
// real payout asks in the order a real payout asks them: how much, where to,
// how fast, and what it costs. The rules that gate it (minimum, first-time
// legal name, W-9 past $600) show only when they bite.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';
const KINDS = ['Venmo', 'PayPal', 'Bank'];

export default function WithdrawSheet({ open, onClose }) {
  const ref = useRef(null);
  const { cashUsd, methods, addMethod, withdraw, withdrawnBefore, w9Verified, w9Submitted, annualUsd } = useWallet();
  const live = isLiveBackend();
  const floor = live ? LIVE_MIN_USD : MIN_WITHDRAW_USD;
  const g = gates({ cashUsd, withdrawnBefore, w9Verified, w9Submitted, annualUsd, min: floor });

  const [amount, setAmount] = useState(String(cashUsd));
  const [methodId, setMethodId] = useState(() => (methods.find((m) => m.isDefault) ?? methods[0])?.id);
  const [adding, setAdding] = useState(false);
  const [newKind, setNewKind] = useState('Venmo');
  const [newDetail, setNewDetail] = useState('');
  const [speed, setSpeed] = useState('standard');
  const [legalName, setLegalName] = useState('');
  const [tried, setTried] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  // Reopening starts over, on today's balance. On the open TRANSITION only:
  // cash and methods both change while the sheet is up (a withdrawal moves
  // cash, "Add another" grows methods), and a reset keyed on them wiped the
  // "On its way" state the moment the withdrawal produced it.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setAmount(String(cashUsd)); setSpeed('standard'); setAdding(false); setNewDetail(''); setLegalName(''); setTried(false); setError(''); setBusy(false); setDone(null);
      setMethodId((methods.find((m) => m.isDefault) ?? methods[0])?.id);
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
      const items = focusables(); const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const amt = Number(amount);
  const amountError = useMemo(() => {
    if (amount.trim() === '' || Number.isNaN(amt)) return 'Enter an amount.';
    if (amt < floor) return `The minimum is ${usd(floor)}.`;
    if (amt > cashUsd) return `You have ${usd(cashUsd)} in cash.`;
    return '';
  }, [amount, amt, cashUsd, floor]);
  const fee = amountError ? 0 : feeFor(amt, speed);
  const net = amountError ? 0 : netFor(amt, speed);
  const nameError = g.needsLegalName && tried && legalName.trim().length < 2 ? 'Your legal name, as your bank has it.' : '';
  const tax = w9Block({
    annualUsd,
    amountUsd: amountError ? 0 : amt,
    w9Verified,
    w9Submitted,
  });
  const blocked = Boolean(amountError) || Boolean(tax) || (g.needsLegalName && legalName.trim().length < 2);

  if (!open) return null;

  const confirm = async () => {
    setTried(true);
    if (blocked || busy) return;
    setError('');
    setBusy(true);
    try {
      const result = await Promise.resolve(withdraw({ amountUsd: amt, methodId, speed }));
      if (result && result.ok === false) {
        setError(result.error || 'The request was not saved.');
        return;
      }
      setDone(result);
    } catch (err) {
      setError(err?.message || 'The request was not saved.');
    } finally {
      setBusy(false);
    }
  };
  const saveMethod = () => {
    if (newDetail.trim().length < 3) return;
    const m = addMethod({ kind: newKind, detail: newDetail.trim() });
    setMethodId(m.id); setAdding(false);
  };

  return (
    <>
      <div className="wds__overlay" onClick={onClose} aria-hidden="true" />
      <div className="wds" role="dialog" aria-modal="true" aria-labelledby="wds-title" ref={ref}>
        <div className="wds__grab" aria-hidden="true" />
        {done ? (
          <>
            <h2 className="wds__h" id="wds-title">{done.live ? 'Request saved' : 'On its way'}</h2>
            <p className="wds__done-fig" data-testid="withdraw-done">{usdExact(done.net)}</p>
            <p className="wds__done-line">
              to <b>{done.method.kind} {done.method.detail}</b>
              {done.fee > 0 && <> · {usdExact(done.fee)} fee</>}
            </p>
            <p className="wds__ref">
              {done.live
                ? 'It is pending. Your cash balance is unchanged, and nothing has been paid out.'
                : `Ref ${done.ref} · it shows as pending in your history until it lands.`}
            </p>
            <div className="wds__act"><Button variant="primary" size="md" fullWidth onClick={onClose}>Done</Button></div>
          </>
        ) : (
          <>
            <h2 className="wds__h" id="wds-title">Cash out</h2>

            <div className="wds__field">
              {/* The balance sits at the right end of the Amount label row, not as a
                  hint under the field (owner, 2026-09-09); the "cash only" line
                  above it came off the same day. */}
              <Input
                label={<span className="wds__lab-row">Amount<span className="wds__avail">{usd(cashUsd)} available</span></span>}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                error={amountError || undefined}
                data-testid="withdraw-amount"
                style={{ width: '100%' }}
              />
            </div>

            <p className="wds__lab">Where to</p>
            <div className="wds__opts">
              {methods.map((m) => (
                <button key={m.id} type="button" className="wds__opt" aria-pressed={methodId === m.id}
                  onClick={() => { setMethodId(m.id); setAdding(false); }} data-testid="withdraw-method">
                  <span className="wds__opt-mid">
                    <span className="wds__opt-t">{m.kind}</span>
                    <span className="wds__opt-d">{m.detail}{m.isDefault ? ' · default' : ''}</span>
                  </span>
                  <span className="wds__radio" aria-hidden="true" />
                </button>
              ))}
              {adding ? (
                <div className="wds__add">
                  <div className="wds__kinds" role="group" aria-label="Account type">
                    {KINDS.map((k) => (
                      <button key={k} type="button" className="wds__kind" aria-pressed={newKind === k} onClick={() => setNewKind(k)}>{k}</button>
                    ))}
                  </div>
                  <Input
                    label={newKind === 'Bank' ? 'Account (last four is enough)' : `${newKind} handle or email`}
                    value={newDetail}
                    onChange={(e) => setNewDetail(e.target.value)}
                    placeholder={newKind === 'Bank' ? '•••• 4471' : newKind === 'PayPal' ? 'you@school.edu' : '@handle'}
                    style={{ width: '100%' }}
                    data-testid="withdraw-new-detail"
                  />
                  <div className="wds__add-act">
                    <Button variant="secondary" size="md" onClick={saveMethod} disabled={newDetail.trim().length < 3}>Save</Button>
                    <button type="button" className="wds__link" onClick={() => setAdding(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="wds__link wds__link--add" onClick={() => setAdding(true)}>+ Add another</button>
              )}
            </div>

            <p className="wds__lab">How fast</p>
            <div className="wds__opts">
              <button type="button" className="wds__opt" aria-pressed={speed === 'standard'} onClick={() => setSpeed('standard')} data-testid="speed-standard">
                <span className="wds__opt-mid">
                  <span className="wds__opt-t">Standard</span>
                  <span className="wds__opt-d">1–3 business days · free</span>
                </span>
                <span className="wds__radio" aria-hidden="true" />
              </button>
              <button type="button" className="wds__opt" aria-pressed={speed === 'instant'} onClick={() => setSpeed('instant')} data-testid="speed-instant">
                <span className="wds__opt-mid">
                  <span className="wds__opt-t">Instant</span>
                  <span className="wds__opt-d">in minutes · {Math.round(INSTANT_FEE_RATE * 1000) / 10}% fee, min {usdExact(INSTANT_FEE_MIN_USD)}</span>
                </span>
                <span className="wds__radio" aria-hidden="true" />
              </button>
            </div>

            {!amountError && (
              <dl className="wds__sum" data-testid="withdraw-summary">
                <div><dt>Withdraw</dt><dd>{usdExact(amt)}</dd></div>
                <div><dt>Fee</dt><dd>{fee ? `−${usdExact(fee)}` : 'free'}</dd></div>
                <div className="wds__sum-net"><dt>You receive</dt><dd>{usdExact(net)}</dd></div>
              </dl>
            )}

            {g.needsLegalName && (
              <div className="wds__field">
                <Input label="Legal name" autoComplete="name" value={legalName} onChange={(e) => setLegalName(e.target.value)}
                  hint={nameError ? undefined : 'first payout only — as your bank has it'} error={nameError || undefined}
                  style={{ width: '100%' }} data-testid="withdraw-legal-name" />
              </div>
            )}

            {tax && (
              <p className="wds__gate" role="alert" data-testid="withdraw-w9">
                {tax.error} <Link to="/legal/payouts">What that means »</Link>
              </p>
            )}

            <W9Upload pendingReview={g.w9Pending} verified={w9Verified} />

            {error && <p className="wds__gate" role="alert">{error}</p>}
            <div className="wds__act">
              <Button variant="primary" size="md" fullWidth onClick={confirm} disabled={Boolean(tax) || Boolean(amountError) || busy}>
                {amountError ? 'Withdraw' : `Withdraw ${usdExact(net)} »`}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
