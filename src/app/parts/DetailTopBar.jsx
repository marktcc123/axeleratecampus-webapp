import { Link, useLocation } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useCartCount } from '../cart.jsx';
import useShare from './useShare.js';
import './detail-top-bar.css';

// Back and Share over a detail page's cover (owner, 2026-09-09): two white
// chips at the screen's top corners, FIXED so they stay put as the page
// scrolls. The row itself lets touches through; only the chips take them.
// Share hands out this page's own address.
// `cart` adds the bag on the product page, beside Share. Mission and event
// pages leave it off — those screens do not sell.
export default function DetailTopBar({ backTo, backLabel = 'Back', shareTitle, cart = false }) {
  const { pathname } = useLocation();
  const { share, shared } = useShare(`${window.location.origin}${pathname}`, shareTitle);
  const count = useCartCount();
  const cartName = count === 0 ? 'Cart' : `Cart · ${count} ${count === 1 ? 'item' : 'items'}`;
  return (
    <div className="dtb">
      <Link to={backTo} className="dtb__chip" aria-label={backLabel}><span className="dtb__chev" aria-hidden="true" /></Link>
      <div className="dtb__end">
        {cart && (
          <Link to="/app/cart" className="dtb__chip dtb__cart" aria-label={cartName} data-testid="detail-cart">
            <Icon name="bag" set="solid" size={20} />
            {count > 0 && <span className="dtb__cart-n" aria-hidden="true">{count}</span>}
          </Link>
        )}
        <button type="button" className="dtb__chip" onClick={share} aria-label={shared ? 'Link copied' : 'Share'} data-testid="share-page">
          {shared ? <Icon name="tick-2" size={18} /> : <Icon name="share" set="app" size={20} />}
        </button>
      </div>
      {shared && <span className="sr-only" role="status">Link copied</span>}
    </div>
  );
}
