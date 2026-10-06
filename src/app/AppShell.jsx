import { Outlet } from 'react-router-dom';
import { Toast } from 'axelerate-design-system';
import TabBar from './TabBar.jsx';
import { useCart } from './cart.jsx';
import './app.css';

// The chrome: one <main> column, the tab bar, and the cart button.
//
// The cart PROVIDER is not here. It sits one level up, in App.jsx's CartRoot,
// because /user/:handle is outside this shell and a visit to a guest's profile
// would otherwise unmount the provider and empty the cart. The button that
// reads it stays here — it is chrome, and the profile shows none.
//
// The tab bar and the cart button are positioned independently: the bar is
// centred and never moves, whatever the cart is doing.
export default function AppShell() {
  const { toast } = useCart();
  return (
    <div className="app">
      <main className="app__col">
        <Outlet />
      </main>
      <TabBar />
      {/* Chrome, so it sits here and not on the shop: the shop, the product
          page and the cart all add, and all three should say it the same way.
          The Toast is already role="status", so it announces itself. */}
      {toast && (
        <div className="app__toast">
          {/* No onDismiss, so the design system draws no × — its dismiss button
              is 22x22 and the touch-floor guard rightly rejected it, and app
              CSS may not reach in to resize it (never target .ax-*). Nothing is
              lost: this clears itself after a few seconds, role="status"
              announces it once either way, and the count it reports also lives
              in the cart button's accessible name. */}
          <Toast tone="success" title={toast.title} description={toast.description} />
        </div>
      )}
    </div>
  );
}
