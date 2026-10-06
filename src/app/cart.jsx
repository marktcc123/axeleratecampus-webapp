import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useContent } from './content.jsx';
import { priceFor } from '../lib/adapters/catalog.js';
import { CREDIT_PER_DOLLAR } from './parts/Money.jsx';

// The cart, from H5.dc.html.
//
// It lives in a layout route above the app shell (App.jsx's CartRoot) rather
// than in Perks or in the shell itself, because the design lets it travel: once
// something is in it, the floating button follows you onto every tab — and a
// student who follows a guest's name out to /user/:handle, which sits outside
// the shell, comes back to find it still there. State in a layout route
// survives navigation under it and dies on reload, which is the same promise
// the rest of the app makes — there is no backend, and src/lib/join.js is still
// the only seam where one would attach.
//
// Lines are keyed by VARIANT, not by product: a towel in Hand and the same
// towel in Bath are two lines. A product with no sizes keys on its id alone, so
// the key of an unsized product is still just "p1". The product itself is never
// copied in, so a price or a cashback rate that changes in the fixture cannot go
// stale here.

const CartContext = createContext(null);

// The separator is "::" rather than "-" or "/" because product ids and size
// names are both free text in the fixture, and a size called "Hand-towel" would
// otherwise make a key nothing can parse back.
const SEP = '::';

export const lineKey = (id, size) => (size ? `${id}${SEP}${size}` : id);

export function parseLine(key) {
  const at = key.indexOf(SEP);
  return at === -1
    ? { id: key, size: null }
    : { id: key.slice(0, at), size: key.slice(at + SEP.length) };
}

export function CartProvider({ children }) {
  // Live products: one edited or pulled in the console changes what a line in
  // the cart costs and whether it can still be bought.
  const { products } = useContent();
  const [lines, setLines] = useState({});

  // What just went in, so the shell can say so. It lives here rather than on
  // each screen because three of them add to the cart and the message should
  // read the same from all of them.
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  // Transient by itself: the design system's Toast carries a dismiss button but
  // no timer, and a confirmation that needs closing is not a light touch. A new
  // add replaces the object, so the countdown restarts rather than the second
  // message inheriting the first one's remaining time.
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // `n` so a detail screen can add three at once without calling this three
  // times and hoping the batching composes.
  const add = useCallback((id, size = null, n = 1) => {
    const key = lineKey(id, size);
    setLines((l) => ({ ...l, [key]: (l[key] || 0) + Math.max(1, n) }));
    const p = products.find((x) => x.id === id);
    if (p) {
      setToast({
        title: 'Added to your cart',
        // The product name is the description, not the title: these run long
        // ("The Five Minute Journal — original linen") and the thing that
        // happened should be the line a reader lands on first.
        description: size ? `${p.title} · ${size}` : p.title,
      });
    }
  }, []);

  // One stepper for both directions: the last decrement drops the line rather
  // than leaving a zero-quantity row the design has no way to draw.
  const bump = useCallback((key, by) => {
    setLines((l) => {
      const qty = (l[key] || 0) + by;
      const next = { ...l };
      if (qty <= 0) delete next[key];
      else next[key] = qty;
      return next;
    });
  }, []);

  const clear = useCallback(() => setLines({}), []);

  const value = useMemo(() => {
    // Fixture order first, then size order within a product, so the cart reads
    // down in the same order the shop grid does and a second visit finds things
    // where it left them. Sorting on the key string would put Bath before Hand
    // and both before the product they belong to.
    const byProduct = new Map(products.map((p) => [p.id, p]));
    const items = [];
    for (const p of products) {
      const sizes = p.sizes ?? [null];
      for (const size of sizes) {
        const key = lineKey(p.id, size);
        if (lines[key]) items.push({ ...p, size, key, qty: lines[key], priceUsd: priceFor(p, size) });
      }
    }
    // A line whose product left the fixture would otherwise vanish silently.
    for (const key of Object.keys(lines)) {
      if (items.some((i) => i.key === key)) continue;
      const { id, size } = parseLine(key);
      const p = byProduct.get(id);
      if (p) items.push({ ...p, size, key, qty: lines[key], priceUsd: priceFor(p, size) });
    }

    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotalUsd = items.reduce((n, i) => n + i.priceUsd * i.qty, 0);
    // Rounded once, on the total. Rounding each line first would let a cart of
    // cheap items drift a few credit away from the sum of what it is worth.
    const creditBackPts = Math.round(
      items.reduce((n, i) => n + i.priceUsd * i.qty * (i.cashbackPct / 100), 0) * CREDIT_PER_DOLLAR
    );

    return { items, count, subtotalUsd, creditBackPts, add, bump, clear, toast, dismissToast };
  }, [products, lines, add, bump, clear, toast, dismissToast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart() needs a <CartProvider> above it — see CartRoot in src/App.jsx');
  return cart;
}

// The count alone, and tolerant of there being no cart above it. useCart()
// throws by design: it guards screens that cannot function without the
// provider, and a missing one there is a wiring bug worth crashing on. The
// header is the other case — it renders wherever a tab screen does, including
// harnesses that mount one tab on its own, and a badge that cannot be drawn is
// not a reason to take the whole shell down. It reads 0, which is what an
// absent cart holds.
export function useCartCount() {
  return useContext(CartContext)?.count ?? 0;
}
