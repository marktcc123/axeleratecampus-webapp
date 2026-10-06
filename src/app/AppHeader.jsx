import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar } from 'axelerate-design-system';
import Icon from '../components/Icon.jsx';
import Avatar from './Avatar.jsx';
import Logo from '../components/Logo.jsx';
import { useProfile } from './profile.jsx';
import { useCartCount } from './cart.jsx';
import { seen, markSeen } from './firstrun.js';
import useShare from './parts/useShare.js';
import { useDemand } from './demand.jsx';
import './app-header.css';

// The row the design puts at the top of all four tab screens — the same row on
// every one of them (owner, 2026-09-21), Me included, which is why this takes
// no props any more. The row, the wordmark treatment and the 44px targets come
// from the design system's AppBar; what stays here is what the system does not
// own: this app's icon set, its avatar and its router. Me's sub-screens use
// ScreenHeader instead.
//
// Three things, and only three. Two came off on 2026-09-21: the flame, which
// opened the quest sheet from any tab (/app/earn?quests=all still answers, so
// the sheet works by URL, but nothing links to it now), and the "How Axelerate
// Works" panel, whose lightning was the only way in — its five steps are the
// four onboarding screens' subject, and those run before the gate now.
// Four groups (owner, 2026-09-21): Share on its own and first; what you have
// going — orders, tickets, the missions in flight; how you grow — co-creations,
// your level, your invites, your career; then the account itself. Every row
// wears the icon Me's old row for that screen wore, so a screen keeps its mark
// wherever it is offered. Share wears the app's own share arrow as a line
// (assets/icons/share-line.svg: the same path as share.svg with the fill
// dropped, the way gear.svg is drawn) — the filled cut was the one solid glyph
// in a column of outlines (owner, 2026-09-21). The arrow on Log out stands in
// for a leaving glyph the icon sets do not have. `danger` marks the one row
// that ends the session, drawn in red.
const SHARE = 'share';
// Demand exchange, not the old campus board. Missions, tickets, the shop,
// levels and invites still have addresses — they are just no longer the way
// around the product.
const MENU = [
  [
    // An action, not a place: `to` is the SHARE sentinel and the row renders
    // as a button. It hands someone the /u/ card — the outside view of you.
    ['Share profile', SHARE, 'share-line', 'app'],
  ],
  [
    ['My Demand', '/app/me/demand', 'flag-line', 'outline'],
    ['Respond as a brand', '/brands', 'bag-line', 'outline'],
  ],
  [
    ['What is Axelerate', '/app/me/about', 'info', 'outline'],
    ['Settings', '/app/me/profilesetting', 'gear', 'app'],
    ['Log out', '/login', 'arrow-right', 'outline', 'danger'],
  ],
];

export default function AppHeader() {
  const { avatarUrl, displayName, publicHandle } = useProfile();
  const count = useCartCount();
  const { unreadCount } = useDemand();
  const bellName = unreadCount === 0 ? 'Updates' : `Updates · ${unreadCount} unread`;
  // A store bag on a demand screen says this is a shop. The bag only appears
  // once something is actually in the legacy cart, so a checkout can still be
  // finished — an empty one does not sit on Home.
  const showCart = count > 0;
  // Nobody knows the menu is behind the avatar the first time (owner,
  // 2026-09-22): a ring breathes round it until the drawer is opened once.
  const [hint, setHint] = useState(() => !seen('account-menu'));
  const { pathname } = useLocation();
  // Share hands a brand /u/<publicHandle>: the platform sheet on a phone, the
  // clipboard elsewhere (parts/useShare.js). Live from the first screen —
  // before sign-up the handle is the placeholder's, and the page it opens is
  // this session's own card (owner, 2026-09-09).
  const shareUrl = `${window.location.origin}/u/${publicHandle}`;
  const { share, shared } = useShare(shareUrl, `${displayName} on Axelerate`);

  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // A drawer from the right edge (owner, 2026-09-21), not a popover under the
  // avatar. It is a modal surface — a scrim behind it, nothing else on the page
  // reachable while it is up — so it is a dialog, and focus moves into it when
  // it opens and back to the avatar when it closes. Fixed, so no ancestor of
  // AppBar (the design system's element, whose clipping this app does not
  // control) can cut it off — the trap Dialog already hit here.
  useLayoutEffect(() => {
    if (open) panelRef.current?.querySelector('a')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Going somewhere closes it. Every row navigates, so without this the drawer
  // would still be standing over the screen it opened.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Icon-only, so the count has to reach assistive tech through the name; the
  // badge itself is decorative because it only repeats what the name says.
  const cartName = count === 0 ? 'Cart' : `Cart · ${count} ${count === 1 ? 'item' : 'items'}`;

  // One way to open the drawer from the two first-run marks and the avatar.
  const openDrawer = () => { setOpen((o) => !o); if (hint) { markSeen('account-menu'); setHint(false); } };

  return (
    <>
      <div className="ah__wrap">
      <AppBar
        as="div"
        // A node, not the string: AppBar's own docs say a string takes the
        // system's wordmark treatment and a node renders your own, and the app
        // needs a size the system does not expose.
        wordmark={<Logo className="ah__wordmark" />}
        className="ah"
      >
        {/* The cart in the row (owner, 2026-09-21), on every tab: a student who
            put something in it on Discover and walked to Unlock can still see
            it. It replaced the floating button, which drew the same thing on
            the shop alone — two carts on one screen is one cart too many, and
            the one that travels is the one worth keeping. */}
        {showCart && (
          <Link to="/app/cart" className="ax-appbar__action ah__cart" aria-label={cartName} data-testid="header-cart">
            <Icon name="bag" set="solid" size={23} />
            <span key={count} className="ah__cart-n" aria-hidden="true">{count}</span>
          </Link>
        )}
        <Link to="/app/me/demand" className="ax-appbar__action ah__bell" aria-label={bellName} data-testid="header-bell">
          <Icon name="bell" set="solid" size={20} />
          {unreadCount > 0 && <span key={unreadCount} className="ah__bell-n" aria-hidden="true">{unreadCount}</span>}
        </Link>
        {/* A button, not a link to /app/me (owner, 2026-09-21): the avatar
            opens the account menu now, and Me is a tab. */}
        <button
          ref={btnRef}
          type="button"
          className="ax-appbar__avatar ah__avatar"
          aria-label="Account"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-testid="account"
          onClick={openDrawer}
        >
          {/* The disc and its first-run ring share one positioned box, so the
              ring is centred on the disc itself and not on the 44px button
              round it (owner, 2026-09-22: it sat a few pixels off). */}
          <span className="ah__avatar-disc">
            <Avatar name={displayName} src={avatarUrl} size={28} />
            {/* The first-run ring (app-header.css .ah__avatar-hint): shown until
                the drawer has been opened once in this browser. */}
            {hint && <span className="ah__avatar-hint" aria-hidden="true" data-testid="avatar-hint" />}
          </span>
        </button>
      </AppBar>
      {/* The first-run note under the avatar (owner, 2026-09-22: the ring alone
          "still isn't obvious"): a yellow paper tag in the margin's hand,
          pointing up at the disc, that opens the drawer itself. Gone with the
          ring once the drawer has been opened once. */}
      {hint && (
        <button type="button" className="ah__hint-note" onClick={openDrawer} data-testid="avatar-hint-note">
          Tap for your menu
        </button>
      )}
      </div>

      {open && (
        <>
          {/* The scrim is the close control for a thumb: a press anywhere off
              the drawer. Ink at low alpha, no blur — DESIGN.md: nothing blurs. */}
          <button
            type="button"
            className="ah__scrim"
            aria-label="Close account menu"
            data-testid="account-scrim"
            onClick={() => { setOpen(false); btnRef.current?.focus(); }}
          />
          <aside
            ref={panelRef}
            className="ah__drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            data-testid="account-menu"
          >
            {MENU.map((group, gi) => (
              <div key={gi} className="ah__drawer-group">
                {/* A rule between the groups, and only between. */}
                {gi > 0 && <hr className="ah__drawer-rule" />}
                {group.map(([label, to, icon, set, tone]) => (to === SHARE ? (
                  <button
                    key={to}
                    type="button"
                    className="ah__drawer-item"
                    onClick={share}
                    data-testid="share-profile"
                  >
                    <Icon name={icon} set={set} size={18} className="ah__drawer-icon" />
                    {/* "Copied" while the copy is fresh; the status line below
                        says it in full for anyone not looking. */}
                    {shared ? 'Copied' : label}
                  </button>
                ) : (
                  <Link
                    key={to}
                    to={to}
                    className={`ah__drawer-item${tone === 'danger' ? ' ah__drawer-item--danger' : ''}`}
                  >
                    {/* Icon renders aria-hidden, so the row's name stays the word. */}
                    <Icon name={icon} set={set} size={18} className="ah__drawer-icon" />
                    {label}
                  </Link>
                )))}
              </div>
            ))}
            {shared && <span className="sr-only" role="status">Link copied</span>}
          </aside>
        </>
      )}
    </>
  );
}
