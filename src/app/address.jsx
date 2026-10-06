import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import hub from '../data/hub.example.json';
import { isLiveBackend } from '../lib/supabase.js';
import { saveShippingAddress } from '../lib/address.js';

// The shipping address, session-only, mounted beside CartProvider and
// ReviewsProvider in App.jsx's CartRoot — see the comment there for why that
// layout route exists rather than the app shell.
//
// It lives in a provider rather than in Settings' own state because two screens
// need the same one, and "saved from last time" and "you have to type it" are
// the same fact read from two directions: Settings edits it, and checkout
// refuses to place an order without it. Held in one place, a student who typed
// it at checkout finds it in Settings afterwards, and vice versa.
//
// Session-only is the same promise the cart makes: there is no backend, and
// src/lib/join.js is still the only seam where one would attach.

// The field table. Exported so Settings and the checkout sheet draw the same
// form from one list — the shape of an address written down twice is a shape
// that disagrees with itself, which is how the events fixture ended up with
// three wrong weekdays.
export const ADDRESS_FIELDS = [
  { key: 'line1', label: 'Street address', auto: 'address-line1', required: true },
  { key: 'line2', label: 'Apt / room', auto: 'address-line2', required: false },
  { key: 'city', label: 'City', auto: 'address-level2', required: true },
  // `half` pairs these two on one line: three full-width boxes for "city,
  // state, zip" wastes the column, and three across does not fit 320px.
  { key: 'state', label: 'State', auto: 'address-level1', maxLength: 2, half: true, required: true },
  { key: 'zip', label: 'ZIP', auto: 'postal-code', inputMode: 'numeric', maxLength: 10, half: true, required: true },
];

export const EMPTY_ADDRESS = Object.fromEntries(ADDRESS_FIELDS.map((f) => [f.key, '']));

// A parcel needs a street, a city, a state and a ZIP to be deliverable; an
// apartment number only sometimes, which is why line2 is the one field that
// carries `required: false` above rather than a second list here.
export const isComplete = (a) =>
  ADDRESS_FIELDS.every((f) => !f.required || String(a?.[f.key] ?? '').trim() !== '');

const AddressContext = createContext(null);

export function AddressProvider({ children }) {
  // Seeded from the fixture, whose address is empty strings — the shape a
  // Supabase row will have. A pre-filled one would read as an address the
  // student already saved, and checkout's whole "no record, so type it" branch
  // would never be reachable.
  const [address, setAddress] = useState(hub.settings.address ?? EMPTY_ADDRESS);

  // Trimmed on the way in, once, so nothing downstream has to wonder whether
  // " Providence" and "Providence" are the same city.
  const cleaned = (next) => Object.fromEntries(
    ADDRESS_FIELDS.map((f) => [f.key, String(next?.[f.key] ?? '').trim()]),
  );

  const replaceAddress = useCallback((next) => {
    if (!next) return;
    setAddress(cleaned(next));
  }, []);

  const saveAddress = useCallback((next) => {
    const row = cleaned(next);
    setAddress(row);
    if (!isLiveBackend()) return undefined;
    return saveShippingAddress(row);
  }, []);

  const value = useMemo(
    () => ({ address, saveAddress, replaceAddress, hasAddress: isComplete(address) }),
    [address, saveAddress, replaceAddress],
  );
  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddress() needs an <AddressProvider> above it — see CartRoot in src/App.jsx');
  return ctx;
}
