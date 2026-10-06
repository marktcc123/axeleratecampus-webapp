import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import Doodle from '../../components/Doodle.jsx';
import ImageSlot from '../ImageSlot.jsx';
import { cover } from '../parts/cover.js';
import { usd, credit } from '../parts/Money.jsx';
import { useCart } from '../cart.jsx';
import CheckoutSheet from '../parts/CheckoutSheet.jsx';
import { useWallet } from '../wallet.jsx';
import { goToShopCheckout } from '../../lib/shop.js';
import { completeLiveOrder, placeLiveOrder } from '../../lib/checkout.js';
import { isLiveBackend } from '../../lib/supabase.js';
import './cart.css';
import './screens.css';

// The cart, from H5.dc.html.
//
// Two departures from the canvas, both forced by rules the canvas does not
// know about:
//
//  - The canvas prints the cashback as a bare dollar figure. Product spec R1
//    says credit is never shown as a bare number, so it goes through credit(),
//    which names its shop value in the same string — the phrasing the perk
//    card and the orders screen already use.
//  - Both "back" affordances are links, not the design system's Button. A
//    destination should be a link, and Button is not polymorphic (no `as`),
//    so dressing one up would mean reaching into .ax-btn from app CSS — which
//    PRODUCT.md Principle 5 forbids.
//
// Checkout is local: the sheet asks how you are paying, out of which balance,
// and where it goes; then this screen clears the cart and draws the
// confirmation. Nothing is submitted, and My orders stays fixture-driven, as
// it was when checkout was a single button.

export default function Cart() {
  const { items, count, subtotalUsd, creditBackPts, bump, clear } = useCart();
  const { spend, setBalances } = useWallet();
  const { state } = useLocation();
  const [params, setParams] = useSearchParams();
  const [placed, setPlaced] = useState(null);
  const [paidIn, setPaidIn] = useState('wallet');   // where the money went: 'wallet' | 'shop'
  const [checkingOut, setCheckingOut] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const finished = useRef(false);

  // A card payment comes back here after Stripe. The cart itself does not
  // survive that full-page return, so the confirmation is the order, not the
  // lines that were in memory.
  useEffect(() => {
    if (!isLiveBackend() || finished.current) return undefined;
    const flag = params.get('checkout');
    const sessionId = params.get('session_id');
    if (flag === 'cancelled') {
      setNotice('Card checkout was cancelled. Your cart is still here if this page was not reloaded.');
      setParams({}, { replace: true });
      return undefined;
    }
    if (flag !== 'success' || !sessionId) return undefined;
    finished.current = true;
    let alive = true;
    completeLiveOrder(sessionId).then((result) => {
      if (!alive) return;
      setParams({}, { replace: true });
      if (!result.ok) {
        setNotice(result.error || 'Payment came back, but the order was not recorded.');
        return;
      }
      setBalances({ cashUsd: result.cashUsd, creditPts: result.creditPts });
      setPaidIn('shop');
      setPlaced(result.cashbackPts ?? 0);
      clear();
    });
    return () => { alive = false; };
  }, [params, setParams, setBalances, clear]);

  // Where the floating button was tapped. A cold load of /cart has no origin,
  // so back falls to the shop rather than nowhere.
  const from = state?.from && state.from !== '/app/cart' ? state.from : '/app/shop';

  if (placed !== null) {
    return (
      <div className="scr cart cart--done">
        <div className="cart__mark" aria-hidden="true">
          <span className="cart__blob" />
          <Icon name="bag-line" size={46} className="cart__mark-ico" />
          <Doodle name="sparkle-butter" className="cart__mark-spark" />
        </div>
        <h1 className="scr__h1 cart__done-h1">Order in.</h1>
        <p className="cart__hand cart__hand--done">we move fast</p>
        <p className="cart__done-note">
          {paidIn === 'shop' && <span data-testid="paid-in-shop">Paid in the shop. </span>}
          Tracking hits your inbox by tonight —{' '}
          <span className="cart__done-credit" data-testid="order-credit">{credit(placed)}</span>{' '}
          lands when it ships.
        </p>
        <Link to="/app/shop" className="cart__cta">Back to the shop</Link>
      </div>
    );
  }

  return (
    <div className="scr cart">
      <div className="cart__top">
        <Link to={from} className="cart__back" aria-label="Back"><span className="cart__chev" /></Link>
      </div>

      <div className="cart__head">
        <h1 className="scr__h1">Your cart</h1>
        {count > 0 && (
          <p className="cart__hand">{count === 1 ? '1 piece' : `${count} pieces`}</p>
        )}
      </div>

      {count === 0 ? (
        <div className="cart__empty">
          <Icon name="bag-line" size={30} className="cart__empty-ico" />
          <p className="cart__empty-title">Nothing in here yet.</p>
          <p className="cart__hand">the good stuff goes fast</p>
          {/* No "Back to the shop" link (owner, 2026-09-09): the Perks tab is one
              tap away in the bar below, and Back is at the top. */}
        </div>
      ) : (
        <>
          <ul className="cart__lines">
            {items.map((i) => (
              <li key={i.key} className="cart__line" data-testid="cart-line">
                <div className="cart__photo"><ImageSlot label={i.photo} src={cover(i.covers?.[0])} radius={12} /></div>
                <div className="cart__text">
                  <p className="cart__brand">{i.brand}</p>
                  <h2 className="cart__title">{i.title}</h2>
                  {/* The size is part of what you bought, so the line says it.
                      A cart that took a size and then did not show it is a cart
                      that cannot be checked. */}
                  {i.size && <p className="cart__size">{i.sizeLabel || 'Size'} {i.size}</p>}
                  {/* The stepper and the price swapped places: how many is
                      something you change, so it sits in the column you read
                      down; what it costs is something you scan, so it sits in
                      the figure column on the right, where the orders list and
                      the buy bar both keep theirs. */}
                  <div className="cart__step">
                    <button
                      type="button"
                      className="cart__pm"
                      aria-label={`One fewer ${i.title}${i.size ? `, size ${i.size}` : ''}`}
                      onClick={() => bump(i.key, -1)}
                    >
                      <span className="cart__pm-glyph" aria-hidden="true">−</span>
                    </button>
                    <span className="cart__qty" data-testid="cart-qty">{i.qty}</span>
                    <button
                      type="button"
                      className="cart__pm"
                      aria-label={`One more ${i.title}${i.size ? `, size ${i.size}` : ''}`}
                      onClick={() => bump(i.key, 1)}
                    >
                      <span className="cart__pm-glyph" aria-hidden="true">+</span>
                    </button>
                  </div>
                </div>
                <p className="cart__price">{usd(i.priceUsd)}</p>
              </li>
            ))}
          </ul>

          {/* Takes the tab bar's place, the same geometry the perk page's buy
              bar uses: what it costs on the left, the action on the right.
              TabBar stands down on /app/cart while the cart has anything in
              it — see OWNS_BOTTOM there for the two screens that do the same
              unconditionally. The button says "Check out" and not
              "Check out · $32": the figure is already beside it, and the buy
              bar it is modelled on does not print its total twice either. */}
          <div className="cart__bar" data-testid="checkout-bar">
            <span className="cart__bar-total">
              <span className="cart__bar-lab">Total</span>
              <span className="cart__bar-fig" data-testid="cart-subtotal">{usd(subtotalUsd)}</span>
            </span>
            <Button
              variant="primary"
              size="md"
              className="cart__bar-act"
              onClick={() => { setNotice(''); setCheckingOut(true); }}
            >
              Check out
            </Button>
          </div>
        </>
      )}

      {/* Placing happens here, not in the sheet: the cart owns what it holds,
          and the sheet only resolves to a choice. */}
      <CheckoutSheet
        open={checkingOut}
        onClose={() => setCheckingOut(false)}
        totalUsd={subtotalUsd}
        notice={notice}
        busy={busy}
        onPlace={async ({ method, creditPts }) => {
          if (isLiveBackend()) {
            setNotice('');
            setBusy(true);
            try {
              const result = await placeLiveOrder({ method, creditsToUse: creditPts, items });
              if (!result.ok) {
                setNotice(result.error || 'Checkout failed.');
                return;
              }
              if (result.url) {
                window.location.assign(result.url);
                return;
              }
              setBalances({ cashUsd: result.cashUsd, creditPts: result.creditPts });
              setPaidIn('wallet');
              setCheckingOut(false);
              setPlaced(result.cashbackPts ?? creditBackPts);
              clear();
            } finally {
              setBusy(false);
            }
            return;
          }
          // Offline preview: the sheet still walks the three questions, and
          // nothing is sent. A live session takes the branch above.
          if (method === 'wallet') {
            spend({ cashUsd: Math.max(0, subtotalUsd - creditPts / 100), creditPts, title: 'Perks shop order' });
            setPaidIn('wallet');
          } else {
            await goToShopCheckout({ items, subtotalUsd });
            setPaidIn('shop');
          }
          setCheckingOut(false);
          setPlaced(creditBackPts);
          clear();
        }}
      />
    </div>
  );
}
