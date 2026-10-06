import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from 'axelerate-design-system';
import SubScreen from '../parts/SubScreen.jsx';
import WithdrawSheet from '../parts/WithdrawSheet.jsx';
import TopUpSheet from '../parts/TopUpSheet.jsx';
import W9Upload from '../parts/W9Upload.jsx';
import { usd, usdExact } from '../parts/Money.jsx';
import { useWallet } from '../wallet.jsx';
import { useAccount } from '../account.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import { completeWalletTopUp } from '../../lib/checkout.js';
import { loadMine } from '../../lib/account.js';
import { gates, W9_THRESHOLD_USD } from '../payout.js';
import { LIVE_MIN_USD } from '../../lib/withdrawals.js';
import './me-hub.css';
import './wallet.css';

const signed = (n) => (n < 0 ? `−${usdExact(-n)}` : `+${usdExact(n)}`);
// Points, signed the same way: "+500 pts" / "−1,200 pts". Not credit(): that
// pairs the figure with its shop value, which this screen's balance dropped on
// 2026-09-08 (owner) and a ledger column has no room for.
const signedPts = (n) => `${n < 0 ? '−' : '+'}${Math.abs(n).toLocaleString('en-US')} pts`;

export default function Wallet() {
  const { cashUsd, creditPts, ledger, withdrawnBefore, w9Verified, w9Submitted, annualUsd, setBalances } = useWallet();
  const { ready } = useAccount();
  const live = isLiveBackend();
  const pending = live && !ready;
  const [out, setOut] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const [params, setParams] = useSearchParams();
  const closeOut = useCallback(() => setOut(false), []);
  const closeAdd = useCallback(() => setAdding(false), []);
  const returned = useRef('');

  useEffect(() => {
    if (!live) return undefined;
    const flag = params.get('topup');
    const sessionId = params.get('session_id');
    if (flag === 'cancelled') {
      setNotice('Card top-up was cancelled. Cash is unchanged.');
      setParams({}, { replace: true });
      return undefined;
    }
    if (flag !== 'success' || !sessionId || returned.current === sessionId) return undefined;
    returned.current = sessionId;
    let alive = true;
    completeWalletTopUp(sessionId).then(async (result) => {
      if (!result.ok) {
        if (alive) setNotice(result.error || 'Payment came back, but cash was not added.');
        return;
      }
      let nextLedger;
      try {
        const mine = await loadMine();
        if (Array.isArray(mine?.ledger)) nextLedger = mine.ledger;
      } catch {
        nextLedger = undefined;
      }
      setBalances({
        cashUsd: result.cashUsd,
        creditPts: result.creditPts,
        ledger: nextLedger,
      });
      if (!alive) return;
      setParams({}, { replace: true });
      setNotice(result.already
        ? 'This top-up is already in your cash.'
        : `Added ${usdExact(result.amountUsd)} to cash.`);
    });
    return () => { alive = false; };
  }, [live, params, setParams, setBalances]);
  // The table will not store a request under $20. Offline keeps the $10 floor.
  const g = gates({
    cashUsd, withdrawnBefore, w9Verified, w9Submitted, annualUsd,
    min: live ? LIVE_MIN_USD : undefined,
  });
  return (
    <SubScreen band="orange" title="My wallet">
      <div className="hub__figs wal__figs">
        <div className="hub__fig">
          <span className="hub__fig-label">Cash</span>
          {/* Withdraw sits with the figure it acts on rather than in the
              header's action slot, where it read as an action on the screen.
              Under the minimum it stays, disabled, and says how far off (R8). */}
          <span className="wal__cash">
            <span className="wal__fig" data-testid="wallet-cash">{pending ? '…' : usd(cashUsd)}</span>
            {/* Quiet (owner, 2026-09-09): violet caps with an underline, the
                Orders screen's "Write a review" voice, not a filled button —
                the figure is the thing here. 44px of target all the same. */}
            <span className="wal__acts">
              <button type="button" className="wal__out" disabled={pending} onClick={() => setAdding(true)}>
                Add funds
              </button>
              <button type="button" className="wal__out" disabled={g.belowMin || pending} onClick={() => setOut(true)}>
                {g.belowMin ? `Withdraw · ${usd(g.shortBy)} to go` : 'Withdraw'}
              </button>
            </span>
          </span>
        </div>
        <div className="hub__fig hub__fig--split">
          <span className="hub__fig-label">Credits</span>
          <span className="wal__fig" data-testid="wallet-credit">
            {pending ? '…' : creditPts.toLocaleString('en-US')}{pending ? null : <span className="wal__unit">pts</span>}
          </span>
          {/* The "$24 in shop" aside that sat here came off at the owner's ask on
              2026-09-08 (R1 overridden here, as on the shop card and the cart). */}
        </div>
      </div>

      {!pending && (
        <W9Upload pendingReview={g.w9Pending} verified={w9Verified} />
      )}

      {notice && <p className="wal__w9" role="status">{notice}</p>}

      {!pending && g.approachingW9 && (
        <p className="wal__w9" data-testid="w9-warning" role="status">
          Payouts this year are {usd(annualUsd)}. At {usd(W9_THRESHOLD_USD)} a W-9 is required before more can go out.
        </p>
      )}

      <h2 className="wal__h2">History</h2>
      {pending ? <p className="hub__none">Loading your wallet…</p> : null}
      {!pending && ledger.length === 0 ? <p className="hub__none">No wallet activity yet.</p> : null}
      {!pending && ledger.map((grp) => (
        <section key={grp.month}>
          <h3 className="wal__month">{grp.month}</h3>
          <ul className="sub__list">
            {grp.rows.map((r) => {
              // Money out is grey, whichever balance it left.
              const out = r.usd < 0 || (!r.usd && r.pts < 0);
              return (
              <li key={r.title + r.meta + r.usd + (r.pts ?? 0)} className="wal__row" data-testid="ledger-row" data-pending={r.pending ? 'true' : undefined}>
                <span className="wal__mark" data-kind={out ? 'out' : 'in'}>{r.usd < 0 ? '$' : r.title[0]}</span>
                <div className="sub__row-mid">
                  <p className="wal__row-title">{r.title}</p>
                  <p className="sub__row-meta">{r.meta}</p>
                </div>
                {/* Cash leads the figure slot; a row that moved credit alone
                    (cashback landing) puts its points there instead; a row that
                    moved both carries the points under the cash, where the XP
                    rides (owner, 2026-09-22: the history shows credit too). */}
                <div className={`sub__row-fig${out ? ' sub__row-fig--out' : ''}`}>
                  {r.usd ? signed(r.usd) : signedPts(r.pts ?? 0)}
                  {r.usd && r.pts ? <span className="sub__row-xp wal__pts">{signedPts(r.pts)}</span> : null}
                  {r.xp > 0 && <span className="sub__row-xp">+{r.xp.toLocaleString('en-US')} XP</span>}
                  {r.pending && <span className="wal__pending"><Badge tone="neutral">pending</Badge></span>}
                </div>
              </li>
              );
            })}
          </ul>
        </section>
      ))}

      <WithdrawSheet open={out} onClose={closeOut} />
      <TopUpSheet open={adding} onClose={closeAdd} />
    </SubScreen>
  );
}
