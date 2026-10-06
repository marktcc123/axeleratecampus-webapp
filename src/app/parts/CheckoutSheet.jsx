import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'axelerate-design-system';
import { usd, credit, CREDIT_PER_DOLLAR } from './Money.jsx';
import { useWallet } from '../wallet.jsx';
import { ADDRESS_FIELDS, isComplete, useAddress } from '../address.jsx';
import AddressFields from './AddressFields.jsx';
import './checkout-sheet.css';

// Checkout, in three questions: how you are paying, which balance it comes out
// of, and where it goes. The owner's one dialog pattern — the same focus trap,
// Escape and body scroll lock as GiftSheet and ReviewSheet — copied rather
// than reinvented, so a third sheet does not drift from the first two.
//
// Nothing is submitted. The sheet resolves to a choice, the cart draws the
// confirmation and empties itself, and My orders stays fixture-driven, exactly
// as it did when checkout was a single button.
// No icons on the option rows: the set carries neither a wallet nor a card,
// and half-illustrated rows read worse than none. The balance step has none
// either, so all five options are drawn the same way.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])';

const STEPS = ['method', 'source', 'address'];

export default function CheckoutSheet({ open, onClose, totalUsd, onPlace, notice, busy }) {
  const ref = useRef(null);
  const { address, saveAddress, hasAddress } = useAddress();
  const { cashUsd, creditPts: heldPts } = useWallet();

  const [step, setStep] = useState('method');
  const [method, setMethod] = useState(null);
  // How much of the bill comes out of credit. The rest comes out of cash, so
  // one number describes the whole split and the two can never disagree.
  const [creditPts, setCreditPts] = useState(0);
  const [draft, setDraft] = useState(address);
  // Only true once they have tried to place the order: nothing turns red while
  // someone is still typing their street.
  const [tried, setTried] = useState(false);
  // A saved address is shown as a summary, not a form. This flips when they
  // ask to change it, and starts true when there is nothing to summarise.
  const [editing, setEditing] = useState(!hasAddress);
  const [localError, setLocalError] = useState('');

  // What the wallet can cover. The two balances are paid TOGETHER now, so the
  // test is their sum rather than either one alone — a $71 cart against $133
  // cash and $24 of credit is payable, and asking which single balance covers
  // it would have said no.
  const creditUsd = heldPts / CREDIT_PER_DOLLAR;
  const canWallet = cashUsd + creditUsd >= totalUsd;

  // The slider runs in whole dollars: CREDIT_PER_DOLLAR is the rate, so a step
  // of 1 would offer hundredths of a cent as if they were choices. The same
  // reasoning, and the same step, as the gift sheet's credit slider.
  const maxCreditPts = Math.min(
    Math.floor(heldPts / CREDIT_PER_DOLLAR) * CREDIT_PER_DOLLAR,
    Math.ceil(totalUsd * CREDIT_PER_DOLLAR),
  );
  // Cash cannot go below zero, so when it does not cover the bill on its own
  // the slider starts where credit has to make up the difference — the floor
  // is a fact about the wallet, not a rule the student has to discover by
  // dragging into a dead end.
  const minCreditPts = Math.max(0, Math.ceil(totalUsd - cashUsd) * CREDIT_PER_DOLLAR);
  const creditUsdApplied = creditPts / CREDIT_PER_DOLLAR;
  const cashPart = Math.max(0, totalUsd - creditUsdApplied);

  // Reopening starts over. Address is read when the sheet opens, not on every
  // save: saving the same address would otherwise jump back to the first step
  // before the order is sent.
  useEffect(() => {
    if (!open) return;
    setStep('method');
    setMethod(null);
    setCreditPts(Math.max(0, Math.ceil(totalUsd - cashUsd) * CREDIT_PER_DOLLAR));
    setDraft(address);
    setTried(false);
    setEditing(!hasAddress);
    setLocalError('');
    // address, hasAddress and cashUsd are the values at open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, totalUsd]);

  useEffect(() => {
    if (!open) return undefined;
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

  const missing = useMemo(
    () => new Set(ADDRESS_FIELDS
      .filter((f) => f.required && String(draft[f.key] ?? '').trim() === '')
      .map((f) => f.key)),
    [draft],
  );

  if (!open) return null;

  // Card skips the balance question — there is only one card, and which one is
  // a question for a payments backend this app does not have.
  const back = () => setStep(step === 'address' && method === 'card' ? 'method' : STEPS[STEPS.indexOf(step) - 1]);
  const pickMethod = (m) => {
    setMethod(m);
    setStep(m === 'wallet' ? 'source' : 'address');
  };

  const place = async () => {
    if (busy) return;
    if (!isComplete(draft)) { setTried(true); return; }
    setLocalError('');
    try {
      await saveAddress(draft);
    } catch (err) {
      setLocalError(err?.message || 'Could not save that address.');
      return;
    }
    await onPlace({ method, creditPts: method === 'wallet' ? creditPts : 0 });
  };

  const stepN = method === 'card' && step === 'address' ? 2 : STEPS.indexOf(step) + 1;
  const stepOf = method === 'card' ? 2 : 3;

  return (
    <>
      <div className="cos__overlay" onClick={onClose} aria-hidden="true" />
      <div className="cos" role="dialog" aria-modal="true" aria-labelledby="cos-title" ref={ref}>
        <div className="cos__grab" aria-hidden="true" />

        <div className="cos__top">
          {step !== 'method' && (
            <button type="button" className="cos__back" onClick={back} aria-label="Back a step">
              <span className="cos__chev" aria-hidden="true" />
            </button>
          )}
          {/* The total is the one figure that never leaves the sheet: every
              question below it is about how this amount gets paid. */}
          <p className="cos__total">
            <span className="cos__total-lab">Total</span>
            <span className="cos__total-fig" data-testid="checkout-total">{usd(totalUsd)}</span>
          </p>
          <p className="cos__step" aria-hidden="true">{stepN}/{stepOf}</p>
        </div>

        {step === 'method' && (
          <>
            <h2 className="cos__h" id="cos-title">How are you paying?</h2>
            <div className="cos__opts">
              <button
                type="button"
                className="cos__opt"
                data-testid="pay-wallet"
                disabled={!canWallet}
                onClick={() => pickMethod('wallet')}
              >
                <span className="cos__opt-mid">
                  <span className="cos__opt-t">Pay with wallet</span>
                  <span className="cos__opt-d">
                    {canWallet
                      ? `${usd(cashUsd)} cash · ${credit(heldPts)}`
                      : `Not enough in either balance for ${usd(totalUsd)}`}
                  </span>
                </span>
                <span className="cos__opt-chev" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="cos__opt"
                data-testid="pay-card"
                onClick={() => pickMethod('card')}
              >
                <span className="cos__opt-mid">
                  <span className="cos__opt-t">Pay with card</span>
                  <span className="cos__opt-d">Checks out in the shop — card, receipt and tracking there</span>
                </span>
                <span className="cos__opt-chev" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {step === 'source' && (
          <>
            <h2 className="cos__h" id="cos-title">How much from credit?</h2>
            <div className="cos__bals">
              <span className="cos__bal">
                <span className="cos__bal-lab">Cash</span>
                <span className="cos__bal-fig">{usd(cashUsd)}</span>
              </span>
              <span className="cos__bal">
                {/* R1: a credit figure never stands without its shop value. */}
                <span className="cos__bal-lab">Credit</span>
                <span className="cos__bal-fig">{credit(heldPts)}</span>
              </span>
            </div>

            <div className="cos__slider-row">
              <input
                id="cos-split"
                className="cos__slider"
                data-testid="split-slider"
                type="range"
                min={minCreditPts}
                max={maxCreditPts}
                step={CREDIT_PER_DOLLAR}
                value={creditPts}
                onChange={(e) => setCreditPts(Number(e.target.value))}
                aria-label="How much of the total comes out of credit"
                aria-describedby="cos-split-note"
              />
              <button
                type="button"
                className="cos__max"
                onClick={() => setCreditPts(maxCreditPts)}
                disabled={creditPts === maxCreditPts}
              >
                Max
              </button>
            </div>

            {/* The split in words, and the only place the two halves are named
                together — the slider itself is one number. */}
            <p className="cos__split" id="cos-split-note" data-testid="split-note" role="status">
              {creditPts === 0
                ? `All ${usd(totalUsd)} from cash.`
                : cashPart === 0
                  ? `All of it from credit — ${credit(creditPts)}.`
                  : `${credit(creditPts)} from credit, ${usd(cashPart)} from cash.`}
            </p>
            {minCreditPts > 0 && (
              <p className="cos__floor">
                {`Cash covers ${usd(cashUsd)} of it, so the rest comes out of credit.`}
              </p>
            )}

            <div className="cos__place">
              <Button variant="primary" size="md" fullWidth onClick={() => setStep('address')}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'address' && (
          <>
            <h2 className="cos__h" id="cos-title">Where does it go?</h2>
            {!editing ? (
              <>
                {/* Bought before, so it is already known. The summary is the
                    whole point of keeping it: a returning student places an
                    order without typing an address twice. */}
                <p className="cos__saved" data-testid="saved-address">
                  <span>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</span>
                  <span>{address.city}, {address.state} {address.zip}</span>
                </p>
                <button type="button" className="cos__change" onClick={() => setEditing(true)}>
                  Use a different address
                </button>
              </>
            ) : (
              <>
                {/* No record, so it is not optional: place is refused until the
                    four required fields are filled, and only then do the empty
                    ones turn red. */}
                <p className="cos__need">We have nothing on file — where should this go?</p>
                <AddressFields
                  value={draft}
                  onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
                  invalid={tried ? missing : null}
                  idPrefix="cos"
                />
              </>
            )}
            <div className="cos__place">
              {/* Card pays in the SHOP: the button says so, and the cart hands
                  the order off there rather than pretending to take a card. */}
              {(localError || notice) && <p className="cos__need" role="alert">{localError || notice}</p>}
              <Button variant="primary" size="md" fullWidth onClick={place} disabled={busy}>
                {busy ? 'Checking out…' : (method === 'card' ? `Continue to shop · ${usd(totalUsd)} »` : `Place order · ${usd(totalUsd)}`)}
              </Button>
              {/* Screen-reader only: the four fields already carry their own
                  "needed" mark, and repeating the list in red under the button
                  made the failure the loudest thing on the sheet. The alert is
                  still here because a submit that changes nothing visible above
                  the fold announces nothing otherwise. */}
              {tried && missing.size > 0 && (
                <p className="sr-only" role="alert">
                  An address needs a street, a city, a state and a ZIP.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
