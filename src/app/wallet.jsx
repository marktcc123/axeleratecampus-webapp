import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import hub from '../data/hub.example.json';
import { ME } from './me.js';
import { CREDIT_PER_DOLLAR } from './parts/Money.jsx';
import { earnedThisYear, hasWithdrawnBefore, feeFor, netFor, etaFor, reference } from './payout.js';
import { isLiveBackend } from '../lib/supabase.js';
import { saveWithdrawal } from '../lib/withdrawals.js';

// The wallet — cash, credit, the ledger, and where cash goes out — as session
// state, beside the cart in App.jsx's CartRoot. Until 2026-09-08 the two
// balances were constants on ME and nothing that "paid" ever changed them; a
// checkout that says it took $32 out of your cash and leaves $133 there is a
// checkout nobody believes. Same promise as the cart: survives navigation,
// dies on reload, and src/lib/join.js is still the only seam to a backend.
//
// `initial` exists for tests: a wallet with $6, or $700 earned this year, is
// how the minimum and the W-9 gate are exercised without touching the fixture.
const WalletContext = createContext(null);

const seedMethods = () => [{ id: 'm1', kind: hub.payout.method, detail: hub.payout.handle, isDefault: true }];
const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function WalletProvider({ children, initial = {} }) {
  const [cashUsd, setCash] = useState(initial.cashUsd ?? ME.cashUsd);
  const [creditPts, setCredit] = useState(initial.creditPts ?? ME.creditPts);
  const [ledger, setLedger] = useState(initial.ledger ?? hub.ledger);
  const [methods, setMethods] = useState(initial.methods ?? seedMethods);
  const [w9Verified, setW9] = useState(initial.w9Verified ?? false);
  const [w9Submitted, setW9Submitted] = useState(initial.w9Submitted ?? false);
  const [annualUsd, setAnnual] = useState(initial.annualUsd ?? 0);

  // Session rows go into a group at the top — "This month" — created on first
  // use, so the fixture's months keep their order under it.
  const pushRow = useCallback((row) => {
    setLedger((l) => {
      const [first, ...rest] = l;
      if (first && first.session) return [{ ...first, rows: [row, ...first.rows] }, ...rest];
      return [{ month: 'This month', session: true, rows: [row] }, ...l];
    });
  }, []);

  const addMethod = useCallback(({ kind, detail }) => {
    const m = { id: `m${Date.now().toString(36)}`, kind, detail, isDefault: false };
    setMethods((ms) => [...ms, m]);
    return m;
  }, []);

  const withdraw = useCallback(({ amountUsd, methodId, speed }) => {
    const method = methods.find((m) => m.id === methodId) ?? methods[0];
    const fee = feeFor(amountUsd, speed);
    const net = netFor(amountUsd, speed);
    const eta = etaFor(speed);
    const ref = reference();
    const row = {
      title: `Withdrawal to ${method?.kind || 'payout'}`,
      meta: `${today()} · ${speed === 'instant' ? 'instant' : 'standard'} · pending`,
      usd: -amountUsd, xp: 0, pending: true, ref, fee, net, eta: eta.label, method,
    };
    // Live: the request is a pending row. Cash on the profile is unchanged,
    // and nothing is marked paid.
    if (isLiveBackend()) {
      return saveWithdrawal({
        amountUsd, fee, net, method: method?.kind, accountInfo: method?.detail,
      }).then((result) => {
        if (!result.ok) return result;
        pushRow(row);
        return { method, fee, net, eta: eta.label, ref, ok: true, live: true };
      });
    }
    setCash((c) => Math.round((c - amountUsd) * 100) / 100);
    pushRow(row);
    return { method, fee, net, eta: eta.label, ref };
  }, [methods, pushRow]);

  // A shop order paid from the wallet. Cash and credit both come down, and the
  // row carries both moves — the points as a signed figure of their own, not a
  // note in the grey meta (owner, 2026-09-22: the history shows credit spent
  // as well as earned). A row may carry `usd`, `pts` or both.
  // A live read replaces the fixture balances. Session spend still edits from there.
  const setBalances = useCallback(({ cashUsd: cash, creditPts: pts, ledger: next, w9Verified: w9, w9Submitted: submitted, annualUsd: annual, methods: nextMethods }) => {
    if (cash != null) setCash(Number(cash) || 0);
    if (pts != null) setCredit(Number(pts) || 0);
    if (Array.isArray(next)) setLedger(next);
    if (w9 != null) setW9(Boolean(w9));
    if (submitted != null) setW9Submitted(Boolean(submitted));
    if (annual != null) setAnnual(Number(annual) || 0);
    if (Array.isArray(nextMethods)) setMethods(nextMethods);
  }, []);

  // A replacement file is waiting to be checked, so verification clears.
  const noteW9 = useCallback(() => {
    setW9(false);
    setW9Submitted(true);
  }, []);

  const spend = useCallback(({ cashUsd: cash = 0, creditPts: pts = 0, title }) => {
    if (cash) setCash((c) => Math.round((c - cash) * 100) / 100);
    if (pts) setCredit((c) => c - pts);
    if (cash || pts) {
      pushRow({ title: title ?? 'Perks shop order', meta: `${today()} · shop`, usd: -cash, pts: pts ? -pts : 0, xp: 0 });
    }
  }, [pushRow]);

  const value = useMemo(() => ({
    cashUsd, creditPts, creditUsd: creditPts / CREDIT_PER_DOLLAR, ledger, methods, w9Verified, w9Submitted, annualUsd,
    earnedYtd: earnedThisYear(ledger), withdrawnBefore: hasWithdrawnBefore(ledger),
    withdraw, spend, addMethod, setBalances, noteW9,
  }), [cashUsd, creditPts, ledger, methods, w9Verified, w9Submitted, annualUsd, withdraw, spend, addMethod, setBalances, noteW9]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet() needs a <WalletProvider> above it — see CartRoot in src/App.jsx');
  return ctx;
}
