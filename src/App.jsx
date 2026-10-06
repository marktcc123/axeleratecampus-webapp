import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useParams, useLocation, useNavigationType } from 'react-router-dom';
import LegalPage from './pages/LegalPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import Welcome from './app/Welcome.jsx';
import Onboarding from './app/screens/Onboarding.jsx';
import { seen } from './app/firstrun.js';
import Verify from './app/Verify.jsx';
import AppShell from './app/AppShell.jsx';
import { CartProvider } from './app/cart.jsx';
import { ReviewsProvider } from './app/reviews.jsx';
import { AddressProvider } from './app/address.jsx';
import { ProfileProvider } from './app/profile.jsx';
import { WalletProvider } from './app/wallet.jsx';
import { AccountProvider } from './app/account.jsx';
import { RsvpProvider } from './app/rsvp.jsx';
import { InboxProvider } from './app/inbox.jsx';
import { ContentProvider } from './app/content.jsx';
import { DemandProvider } from './app/demand.jsx';
import { SessionProvider } from './app/session.jsx';
import LiveSession from './app/LiveSession.jsx';
import Home from './app/screens/Home.jsx';
import DemandDiscover from './app/screens/DemandDiscover.jsx';
import DemandNew from './app/screens/DemandNew.jsx';
import DemandDetail from './app/screens/DemandDetail.jsx';
import MyDemand from './app/screens/MyDemand.jsx';
import Merchant from './app/screens/Merchant.jsx';
import Brands from './app/screens/Brands.jsx';
import JoinAccount from './app/screens/JoinAccount.jsx';
import MerchantOnboarding from './app/screens/MerchantOnboarding.jsx';
import GigsBoard from './app/screens/GigsBoard.jsx';
import GigsDetail from './app/screens/GigsDetail.jsx';
import EventDetail from './app/screens/EventDetail.jsx';
import BrandPage from './app/screens/BrandPage.jsx';
import Perks from './app/screens/Perks.jsx';
import PerkDetail from './app/screens/PerkDetail.jsx';
import Cart from './app/screens/Cart.jsx';
import Levels from './app/screens/Levels.jsx';
import Wallet from './app/screens/Wallet.jsx';
import Orders from './app/screens/Orders.jsx';
import OrderReceipt from './app/screens/OrderReceipt.jsx';
import Syndicate from './app/screens/Syndicate.jsx';
import CoCreations from './app/screens/CoCreations.jsx';
import Events from './app/screens/Events.jsx';
import EventTicket from './app/screens/EventTicket.jsx';
import Invite from './app/screens/Invite.jsx';
import Career from './app/screens/Career.jsx';
import Settings from './app/screens/Settings.jsx';
import About from './app/screens/About.jsx';
import AdminShell from './app/admin/AdminShell.jsx';
import Analytics from './app/admin/panels/Analytics.jsx';
import AdminTasks from './app/admin/panels/Tasks.jsx';
import AdminUgc from './app/admin/panels/Ugc.jsx';
import AdminReviews from './app/admin/panels/Reviews.jsx';
import AdminGigs from './app/admin/panels/Gigs.jsx';
import AdminEvents from './app/admin/panels/Events.jsx';
import AdminBrands from './app/admin/panels/Brands.jsx';
import AdminMissions from './app/admin/panels/Missions.jsx';
import AdminShop from './app/admin/panels/Shop.jsx';
import AdminWithdrawals from './app/admin/panels/Withdrawals.jsx';
import AdminCampuses from './app/admin/panels/Campuses.jsx';
import AdminCareer from './app/admin/panels/Career.jsx';
import AdminCashback from './app/admin/panels/Cashback.jsx';
import Inbox from './app/screens/Inbox.jsx';
import GiftClaim from './app/screens/GiftClaim.jsx';
import Application from './app/screens/Application.jsx';
import Unlock from './app/screens/Unlock.jsx';
import Me from './app/screens/Me.jsx';
import PublicProfile from './pages/PublicProfile.jsx';

// ---------------------------------------------------------------------------
// The marketing site is dormant, not deleted.
//
// src/pages/{LandingPage,ForBrandsPage}.jsx, src/sections/* and
// src/components/{Nav,NavSheet,Footer,MissionCard,ScrollToHash}.jsx are all
// still in the repo and still covered by their own tests, but nothing routes
// to them, so Vite tree-shakes them out of the bundle.
//
// To bring the marketing site back: import LandingPage and ForBrandsPage,
// re-add `/` and `/for-brands`, move this app's routes back under an `/app`
// prefix, and restore the Nav/Footer split that used to live here (it hid the
// marketing chrome inside the app; see git history at 87cabcf).
// ---------------------------------------------------------------------------

// The cart's home: a pathless layout route over the app shell AND the public
// profile. It used to live in AppShell, which meant a visit to a guest's
// profile — a route deliberately outside the shell, so someone with no account
// is not shown a tab bar — unmounted the provider and emptied the cart. The
// design lets the cart travel; this is the smallest routing shape that lets it
// travel that far.
//
// Not above <Routes>: the gate and verification carry no cart, and there is
// nothing on them that could fill one.
function CartRoot() {
  return (
    <CartProvider>
      <AddressProvider>
        <WalletProvider>
          <AccountProvider>
            <ReviewsProvider>
            <RsvpProvider>
              <InboxProvider>
                <Outlet />
              </InboxProvider>
            </RsvpProvider>
            </ReviewsProvider>
          </AccountProvider>
        </WalletProvider>
      </AddressProvider>
    </CartProvider>
  );
}

function LegacyProfile() {
  const { handle } = useParams();
  return <Navigate to={`/u/${handle}`} replace />;
}

function LegalRoute() {
  const { kind } = useParams();
  // `bare` because the app shell already provides the <main> landmark.
  return <LegalPage kind={kind} bare />;
}

// A new screen opens at its top (owner, 2026-09-09: a mission opened mid-page,
// at the board's scroll position). Only on a push or replace — Back is left to
// the browser's own restoration, which puts the board back where you were.
function ScrollToTop() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => { if (type !== 'POP') window.scrollTo(0, 0); }, [pathname, type]);
  return null;
}

// The gate, unless this browser has never seen the intro — then the intro
// first. Read on every render rather than once: the intro marks itself seen as
// it mounts, so the very next visit to / is the gate, and there is no state
// here that could go stale. Kept out of Welcome so the gate stays a gate.
function FirstRun() {
  return seen('intro') ? <Welcome /> : <Navigate to="/onboarding" replace />;
}

// A redirect that keeps its parameter: <Navigate> cannot interpolate.
function RedirectPerk() {
  const { id } = useParams();
  return <Navigate to={`/app/shop/${id}`} replace />;
}
function DemandIdRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/demand/${id}`} replace />;
}
// The ticket pages moved from /app/me/events (owner, 2026-09-21: "the screen
// is My tickets, so is its address"); a pass link in an old message still opens.
function RedirectTicket() {
  const { date } = useParams();
  return <Navigate to={`/app/me/tickets/${date}`} replace />;
}

export default function App() {
  return (
    // ProfileProvider sits outside <Routes>, not in CartRoot: the gate at
    // /verify writes the profile and lives outside CartRoot, while the header
    // that reads it lives inside. Everything else session-scoped stays where it
    // was.
    <ContentProvider>
      <SessionProvider>
      <DemandProvider>
      <ProfileProvider>
    <LiveSession />
    <>
    <ScrollToTop />
    <Routes>
      {/* The intro, the gate and verification sit outside the app shell: no
          tab bar, because you are not in the app yet. */}
      {/* Four screens before the gate (owner, 2026-09-21), at their own address
          like the demo's, so they can be opened on purpose at any time. A first
          visit to / is sent here; the screen records itself, and / is the gate
          from then on. */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<FirstRun />} />
      {/* Two doors, one screen. /verify is sign-up — the name it has always
          had, and the href every "Join the squad" in the app points at.
          /login is the returning student's door: email only, no name, no
          photo, because those are already on file. */}
      <Route path="/verify" element={<Verify mode="signup" />} />
      <Route path="/login" element={<Verify mode="login" />} />
      {/* Where "Send email" lands: the six digits the email carried. Reached
          with the address in router state; a cold visit has none and is sent
          back to /login by the screen itself. */}
      <Route path="/login/code" element={<Verify mode="code" />} />
      <Route element={<CartRoot />}>
        {/* A public profile, at /user/:handle: no account needed to read one,
            so it sits outside the app shell too — no tab bar to offer someone
            who has no account to use it with. Inside CartRoot all the same,
            one level up from the shell: a student who follows a guest's name
            out of an event and comes back must find their cart where they
            left it. */}
        <Route path="/u/:handle" element={<PublicProfile />} />
        {/* The old path, kept as a redirect: it is in shared links and in the
            guest grids of any event page someone has open. */}
        <Route path="/user/:handle" element={<LegacyProfile />} />

        <Route element={<AppShell />}>
          <Route path="/app" element={<Home />} />
          <Route path="/app/home" element={<Navigate to="/app" replace />} />
          <Route path="/app/demand/new" element={<DemandNew />} />
          <Route path="/app/demand/:id" element={<DemandDetail />} />
          <Route path="/demand/new" element={<Navigate to="/app/demand/new" replace />} />
          <Route path="/demand/:id" element={<DemandIdRedirect />} />
          <Route path="/merchant" element={<Merchant />} />
          <Route path="/merchant/join" element={<MerchantOnboarding />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/join" element={<JoinAccount />} />
          <Route path="/app/me/demand" element={<MyDemand />} />
          <Route path="/app/earn" element={<GigsBoard />} />
          <Route path="/app/earn/:slug" element={<GigsDetail />} />
          {/* A literal segment, so React Router ranks it above the dynamic
              /app/earn/:slug above regardless of declaration order — but it is
              declared after it anyway, next to the other /app/earn routes. */}
          <Route path="/app/earn/events/:id" element={<EventDetail />} />
          <Route path="/app/earn/brands/:slug" element={<BrandPage />} />
          {/* Discover is where the shop lives now (2026-09-17). The old
              addresses redirect rather than 404: they are in shared links and
              in the browser history of anyone with the app open. */}
          <Route path="/app/discover" element={<DemandDiscover />} />
          <Route path="/app/shop" element={<Perks />} />
          <Route path="/app/shop/:id" element={<PerkDetail />} />
          <Route path="/app/discover/:id" element={<RedirectPerk />} />
          <Route path="/app/perks" element={<Navigate to="/app/shop" replace />} />
          <Route path="/app/perks/:id" element={<RedirectPerk />} />
          {/* The cart is its own route rather than a state of /perks: the floating
              button reaches it from every tab, so it needs an address. */}
          <Route path="/app/cart" element={<Cart />} />
          {/* The tracker moved into Me → Grow & earn and this address became
              Unlock, empty for now (owner, 2026-09-17). /app/join redirects:
              it is in shared links and in open browser histories. */}
          <Route path="/app/unlock" element={<Unlock />} />
          {/* The ladder and the published XP formula are reference, not the
              pitch (§5.1): one level below Unlock, with the old address kept. */}
          <Route path="/app/unlock/levels" element={<Levels />} />
          <Route path="/app/me/missions" element={<Application />} />
          <Route path="/app/join" element={<Navigate to="/app/unlock" replace />} />
          <Route path="/app/me" element={<Me />} />
          {/* Me is a hub now. Its sub-screens are nested under it rather than
              promoted to tabs, which is how the design routes them. */}
          <Route path="/app/me/levels" element={<Navigate to="/app/unlock/levels" replace />} />
          <Route path="/app/me/wallet" element={<Wallet />} />
          <Route path="/app/me/orders" element={<Orders />} />
          <Route path="/app/me/orders/:id" element={<OrderReceipt />} />
          <Route path="/app/me/syndicate" element={<Syndicate />} />
          <Route path="/app/me/co-creations" element={<CoCreations />} />
          <Route path="/app/me/tickets" element={<Events />} />
          {/* One ticket, keyed by the event's id where it has one and its date
              where it does not (rsvp.jsx passPath). */}
          <Route path="/app/me/tickets/:date" element={<EventTicket />} />
          {/* The old addresses, kept as redirects (owner, 2026-09-21). */}
          <Route path="/app/me/events" element={<Navigate to="/app/me/tickets" replace />} />
          <Route path="/app/me/events/:date" element={<RedirectTicket />} />
          <Route path="/app/me/invite" element={<Invite />} />
          <Route path="/app/me/career" element={<Career />} />
          <Route path="/app/me/profilesetting" element={<Settings />} />
          <Route path="/app/me/about" element={<About />} />
          {/* The old address (owner, 2026-09-09: the page is Profile setting, so is its URL). */}
          <Route path="/app/me/settings" element={<Navigate to="/app/me/profilesetting" replace />} />
          {/* The console is ten addresses so a panel is linkable and the back
              button steps through tabs. AdminShell holds the gate, so one guard
              covers all nine. */}
          <Route path="/app/me/admin" element={<AdminShell />}>
            <Route index element={<Navigate to="analytics" replace />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="missions" element={<AdminMissions />} />
            <Route path="shop" element={<AdminShop />} />
            <Route path="tasks" element={<AdminTasks />} />
            <Route path="ugc" element={<AdminUgc />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="gigs" element={<AdminGigs />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="campuses" element={<AdminCampuses />} />
            <Route path="career" element={<AdminCareer />} />
            <Route path="cashback" element={<AdminCashback />} />
          </Route>
          <Route path="/app/me/inbox" element={<Inbox />} />
          <Route path="/gift/:token" element={<GiftClaim />} />
          <Route path="/legal/:kind" element={<LegalRoute />} />
          <Route path="*" element={<NotFoundPage bare />} />
        </Route>
      </Route>
    </Routes>
    </>
    </ProfileProvider>
      </DemandProvider>
      </SessionProvider>
    </ContentProvider>
  );
}
