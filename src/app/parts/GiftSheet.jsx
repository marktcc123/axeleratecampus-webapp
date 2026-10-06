import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import { cover } from './cover.js';
import { CREDIT_PER_DOLLAR, credit, usd, usdExact } from './Money.jsx';
import { priceFor } from '../../lib/adapters/catalog.js';
import { placeGift } from '../../lib/checkout.js';
import { isLiveBackend } from '../../lib/supabase.js';
import { useWallet } from '../wallet.jsx';
import './gift-sheet.css';

// Send a perk to someone else. The owner's reference for this is a dark-themed
// sheet from another product; what came across is the INFORMATION — the item
// being sent, how it is paid for, the two balances, a credits slider with a MAX
// and a live line of what the wallet still owes, and one primary action. The
// form is this app's: paper, hard shadows, and the money rules below.
//
// Same trap + Escape + scroll lock as ApplySheet, which is the app's one dialog
// pattern; two would drift apart.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';

export default function GiftSheet({ product, initialSize = '', onClose }) {
  const ref = useRef(null);
  const { cashUsd, creditPts, setBalances } = useWallet();
  const [pts, setPts] = useState(0);
  const [picked, setPicked] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const live = isLiveBackend();

  // Credits can cover the item but never more than it costs, and never more
  // than the student holds. Steps of 100 keep the slider on whole dollars —
  // CREDIT_PER_DOLLAR is the rate, so a step of 1 would offer fractions of a
  // cent as if they were choices.
  const priceUsd = product ? priceFor(product, picked) : 0;
  const maxPts = useMemo(() => {
    if (!product) return 0;
    return Math.min(creditPts, Math.floor(priceUsd * CREDIT_PER_DOLLAR));
  }, [product, creditPts, priceUsd]);

  useEffect(() => {
    setPts(0);
    setPicked(initialSize || '');
    setSent(false);
    setBusy(false);
    setError('');
    setLink('');
  }, [product, initialSize]);

  useEffect(() => {
    if (!product) return undefined;
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
  }, [product, onClose]);

  if (!product) return null;

  const needsSize = Array.isArray(product.sizes) && product.sizes.length >= 2;
  const fromCredit = pts / CREDIT_PER_DOLLAR;
  const fromWallet = Math.max(0, priceUsd - fromCredit);
  const pay = async () => {
    if (needsSize && !picked) {
      setError('Pick an option first.');
      return;
    }
    if (!live) {
      setSent(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await placeGift({
        productId: product.id,
        size: picked,
        creditsToUse: Math.min(pts, maxPts),
      });
      if (!result?.ok) {
        setError(result?.error || 'The gift was not sent.');
        return;
      }
      if (result.cashUsd != null) setBalances({ cashUsd: result.cashUsd, creditPts: result.creditPts });
      setLink(`${window.location.origin}${result.path}`);
      setSent(true);
    } catch (err) {
      setError(err?.message || 'The gift was not sent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="gs__overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="gs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gs-title"
        ref={ref}
      >
        <div className="gs__grab" aria-hidden="true" />

        <div className="gs__top">
          <h2 id="gs-title" className="gs__title">
            {/* send-2, not a gift box: the icon set has no present, and a
                bookmark said nothing. The action is sending. */}
            <Icon name="send-2" size={17} className="gs__title-ico" />
            Send as a gift
          </h2>
          <button type="button" className="gs__x" onClick={onClose} aria-label="Close">
            <span className="gs__x-mark" aria-hidden="true" />
          </button>
        </div>

        <div className="gs__item">
          <span className="gs__thumb"><ImageSlot label={product.photo} src={cover(product.covers?.[0])} radius={10} /></span>
          <span className="gs__item-text">
            <span className="gs__item-title">{product.title}</span>
            <span className="gs__item-brand">{product.brand}</span>
          </span>
          <span className="gs__item-price">{usd(priceUsd)}</span>
        </div>

        {needsSize && (
          <div className="gs__sizes" role="group" aria-label={product.sizeLabel || 'Option'}>
            {product.sizes.map((name) => (
              <button
                key={name}
                type="button"
                className="gs__size"
                aria-pressed={picked === name}
                onClick={() => setPicked(name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* How it works, in the app's own voice. The reference names Shopify and
            a dropship parcel; this says the same thing without promising a
            supplier the fixtures do not model. */}
        <p className="gs__note">
          Pays the same way the cart does: credit first, then your wallet. The parcel ships once
          your friend unwraps it, and lands in their orders at no cost to them. Your gift receipt
          stays in yours.
        </p>

        <div className="gs__wallet">
          <div className="gs__bal">
            <span className="gs__bal-lab">Cash balance</span>
            <span className="gs__bal-fig">{usdExact(cashUsd)}</span>
          </div>
          <div className="gs__bal gs__bal--right">
            <span className="gs__bal-lab">Credit</span>
            {/* R1: a credit figure never stands without its shop value. */}
            <span className="gs__bal-fig">{credit(creditPts)}</span>
          </div>
        </div>

        <div className="gs__apply">
          <label className="gs__apply-lab" htmlFor="gs-pts">
            Put credit towards it
          </label>
          <div className="gs__slider-row">
            <input
              id="gs-pts"
              className="gs__slider"
              type="range"
              min="0"
              max={maxPts}
              step={CREDIT_PER_DOLLAR}
              value={pts}
              onChange={(e) => setPts(Number(e.target.value))}
              aria-describedby="gs-split"
            />
            <button
              type="button"
              className="gs__max"
              onClick={() => setPts(maxPts)}
              disabled={pts === maxPts}
            >
              Max
            </button>
          </div>
          <p className="gs__split" id="gs-split">
            {/* credit() is the only formatter allowed to render a credit figure
                (R1), and it always names the shop value — so this reads as two
                sentences rather than three clauses strung on dots. */}
            {pts === 0
              ? `${usd(priceUsd)} from your wallet.`
              : `Applying ${credit(pts)}. ${usd(fromWallet)} from your wallet.`}
          </p>
        </div>

        {sent ? (
          live ? (
            <>
              <p className="gs__done">The link is ready to share.</p>
              <p className="gs__link">{link}</p>
              <Button variant="primary" size="md" fullWidth onClick={() => navigator.clipboard?.writeText(link)}>
                Copy link
              </Button>
            </>
          ) : (
            <>
              <p className="gs__done">The link is ready to share.</p>
              <p className="gs__nothing">Nothing was charged. Gifting opens at launch.</p>
            </>
          )
        ) : (
          <>
            {error ? <p className="gs__nothing" role="alert">{error}</p> : null}
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={busy || (needsSize && !picked)}
              onClick={pay}
            >
              {busy ? 'Making the link…' : `Pay and make the link · ${usd(fromWallet)}`}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
