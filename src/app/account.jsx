import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isLiveBackend } from '../lib/supabase.js';
import { loadMine } from '../lib/account.js';
import { fromShipping } from '../lib/address.js';
import { ME, standingFrom } from './me.js';
import { annualPayout } from './payout.js';
import { useProfile } from './profile.jsx';
import { useWallet } from './wallet.jsx';
import { useAddress } from './address.jsx';

// Offline screens keep the fixture. `ready` flips once a live read finishes.
const AccountContext = createContext({ applications: null, xp: null, orders: null, ready: false });

export function useAccount() {
  return useContext(AccountContext);
}

// The signed-in ladder. Offline screens, and the moment before a live read
// finishes, keep the fixture so unit tests still measure ME.
export function useStanding() {
  const live = isLiveBackend();
  const { xp, applications, ready } = useAccount();
  if (!live || !ready) return ME;
  return standingFrom(xp ?? 0, applications ?? []);
}

export function AccountProvider({ children }) {
  const { pathname } = useLocation();
  const { setProfile } = useProfile();
  const { setBalances } = useWallet();
  const { replaceAddress } = useAddress();
  const [applications, setApplications] = useState(null);
  const [orders, setOrders] = useState(null);
  const [xp, setXp] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLiveBackend()) return undefined;
    let alive = true;
    loadMine()
      .then((mine) => {
      if (!alive) return;
      if (!mine?.signedIn) {
        setApplications([]);
        setOrders([]);
        setReady(true);
        return;
      }
      const p = mine.profile;
      if (p) {
        setProfile({
          name: p.full_name || '',
          avatarUrl: p.avatar_url || null,
          campus: p.campus || '',
          email: mine.email || '',
        });
        replaceAddress(fromShipping(p.shipping_address));
        setXp(Number(p.xp) || 0);
      }
      setBalances({
        cashUsd: Number(p?.cash_balance) || 0,
        creditPts: Number(p?.credit_balance) || 0,
        ledger: Array.isArray(mine.ledger) ? mine.ledger : undefined,
        w9Verified: Boolean(p?.is_w9_verified),
        w9Submitted: Boolean(p?.w9_submitted_at),
        annualUsd: annualPayout(mine.withdrawals),
        methods: mine.payout
          ? [{ id: 'saved', kind: mine.payout.method, detail: mine.payout.account, isDefault: true }]
          : [],
      });
      if (mine.applications) setApplications(mine.applications);
      if (mine.orders) setOrders(mine.orders);
      setReady(true);
    })
      .catch((err) => {
        console.warn('[account]', err);
        if (alive) setReady(true);
      });
    return () => { alive = false; };
  }, [pathname, setProfile, setBalances, replaceAddress]);

  return (
    <AccountContext.Provider value={{ applications, orders, xp, ready }}>
      {children}
    </AccountContext.Provider>
  );
}
