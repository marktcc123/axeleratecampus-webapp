import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import NotFoundPage from '../../pages/NotFoundPage.jsx';
import DetailTopBar from '../parts/DetailTopBar.jsx';
import OfferCard from '../parts/OfferCard.jsx';
import { formatBudget, formatMoney, READINESS, TIMEFRAMES } from '../../lib/demand.js';
import { OFFERS_VISIBLE_STATES, READY_TO_BUY } from '../../lib/marketplace.js';
import { track, trackedUrl } from '../../lib/analytics.js';
import { useDemand } from '../demand.jsx';
import { useRequireAccount } from '../require-account.js';
import './demand.css';

// What the cluster's state means to the person reading it. The internal state
// machine has nine states; this is the four-line version, and it never claims
// momentum the numbers do not support.
const STAGE = {
  collecting: { step: 1, line: 'Demand is forming. We’re still collecting requests.' },
  qualified: { step: 2, line: 'This demand is real. We’re matching brands now.' },
  sourcing: { step: 3, line: 'Brands are being matched.' },
  offers_live: { step: 4, line: 'Brands have responded. Choose what fits you.' },
  converting: { step: 4, line: 'People are buying from these offers.' },
  closed: { step: 0, line: 'This demand window closed.' },
  expired: { step: 0, line: 'This demand window closed.' },
  rejected: { step: 0, line: 'This request was merged or closed.' },
};

export default function DemandDetail() {
  const { id } = useParams();
  const {
    cluster, rankedOffersFor, join, participation, refine, leave, renew,
    clickOffer, confirmPurchase, submitOutcome, pendingConfirmations,
  } = useDemand();
  const requireAccount = useRequireAccount();
  const [open, setOpen] = useState(null);
  const [notice, setNotice] = useState(null);
  const [outcomeFor, setOutcomeFor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const c = cluster(id);
  if (!c) return <NotFoundPage bare />;

  const mine = participation(id);
  const inDemand = Boolean(mine);
  const stage = STAGE[c.status] ?? STAGE.collecting;
  const offersVisible = OFFERS_VISIBLE_STATES.includes(c.status);
  const ranked = offersVisible ? rankedOffersFor(c.id) : [];
  const confirm = pendingConfirmations.find((a) => a.clusterId === c.id) ?? null;

  const onJoin = () => requireAccount(() => {
    const { already } = join(c.id, { readiness: 'interested', timeframeId: '2weeks' });
    if (already) setNotice('You’re already in this demand.');
  }, { intent: `Join ${c.normalizedNeed} and we’ll tell you when brands respond.` });

  const onView = (offer) => {
    track('offer_viewed', { clusterId: c.id, offerId: offer.id });
    setOpen(offer);
  };

  const onBuy = (offer) => requireAccount(() => {
    if ((offer.inventory ?? 1) <= 0) { setNotice('That offer just sold out. The brand has been told.'); return; }
    const record = clickOffer(c.id, offer);
    const href = trackedUrl(offer.checkoutUrl, { demandId: c.id, offerId: offer.id, ref: record?.attributionToken });
    // A checkout that cannot be opened is a dead end; say so rather than
    // leaving a button that silently does nothing.
    const win = typeof window !== 'undefined' && offer.checkoutUrl
      ? window.open(href, '_blank', 'noopener,noreferrer')
      : null;
    if (!win && offer.checkoutUrl) {
      setNotice('We couldn’t open the brand’s checkout. It may be blocked — try again, or copy the link.');
    }
    setOpen(null);
  }, { intent: 'Create an account so we can confirm your purchase and improve your matches.' });

  const openMatch = ranked.find((r) => r.offer.id === open?.id)?.match ?? null;
  const readinessLabel = READINESS.find((r) => r.id === mine?.readiness)?.label ?? 'Interested';
  const timeframeLabel = TIMEFRAMES.find((t) => t.id === mine?.timeframeId)?.label ?? 'Not set';
  const STEPS = ['Forming', 'Qualified', 'Matching', 'Brands responded'];

  const openEdit = () => {
    setDraft({
      readiness: mine.readiness ?? 'interested',
      budget: mine.budget ?? '',
      timeframeId: mine.timeframeId ?? '2weeks',
    });
    setConfirmDrop(false);
    setEditing(true);
  };

  const saveEdit = () => {
    const next = draft.readiness;
    const dropping = READY_TO_BUY.has(mine.readiness) && !READY_TO_BUY.has(next);
    if (dropping && !confirmDrop) {
      setConfirmDrop(true);
      return;
    }
    const budget = draft.budget === '' || draft.budget == null ? null : Number(draft.budget);
    refine(c.id, {
      readiness: next,
      budget: Number.isFinite(budget) ? budget : null,
      timeframeId: draft.timeframeId,
    });
    setEditing(false);
    setConfirmDrop(false);
  };

  return (
    <div className={inDemand ? 'dd dd--in' : 'dd'} data-testid="demand-detail">
      <DetailTopBar backTo="/app/discover" shareTitle={c.normalizedNeed} />

      <header className="dd__head">
        {c.demo && <span className="dd__demo">Demo demand</span>}
        <h1 className="dd__h1">{c.normalizedNeed}</h1>
        {c.scout && <p className="dd__scout">{c.scout.label}</p>}

        <p className="dd__stage" data-testid="demand-stage">{stage.line}</p>
        <div className="dd__progress" role="list" aria-label="Demand progress">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className="dd__progress-step"
              role="listitem"
              data-on={i < stage.step ? '' : undefined}
              data-current={i + 1 === stage.step ? '' : undefined}
            >
              <span className="dd__progress-bar" />
              <span className="dd__progress-label">{label}</span>
            </div>
          ))}
        </div>

        <dl className="dd__stats">
          <div><dd>{c.counts.joined}</dd><dt>active demand</dt></div>
          <div><dd>{c.counts.readyToBuy}</dd><dt>ready to buy</dt></div>
          <div><dd>{formatBudget(c.budgetRange, c.averageBudget)}</dd><dt>typical budget</dt></div>
        </dl>
      </header>

      {c.status === 'expired' && (
        <section className="dd__sec dd__warn" data-testid="demand-expired">
          <h2 className="dd__h2">This demand window closed</h2>
          <p className="dd__line">Requests expire so the counts stay true. Open a fresh one and we&rsquo;ll start collecting again.</p>
          <Link to="/app/demand/new" className="ax-btn ax-btn--secondary ax-btn--full">Open it again</Link>
        </section>
      )}

      {notice && <p className="dd__notice" role="status" data-testid="demand-notice">{notice}</p>}

      <section className="dd__sec">
        <h2 className="dd__h2">Most requested</h2>
        {c.commonRequirements?.length > 0 ? (
          <div className="dd__chips">
            {c.commonRequirements.map((r) => <span key={r} className="dd__chip">{r}</span>)}
          </div>
        ) : (
          <p className="dd__line">No shared requirements yet — they appear as more people describe what they need.</p>
        )}
        <p className="dd__line">Purchase timing · {c.purchaseWindow}</p>
        {c.geographicDistribution?.length > 0 && (
          <div className="dd__geo">
            {c.geographicDistribution.map((g) => (
              <p key={g.label}>{g.label} · {Math.round(g.share * 100)}%</p>
            ))}
          </div>
        )}
      </section>

      {/* "Did you purchase this?" A self-report is weaker than a merchant
          callback, and the copy is careful not to pretend otherwise. */}
      {confirm && (
        <section className="dd__sec dd__confirm" data-testid="purchase-confirm">
          <h2 className="dd__h2">Did you purchase this?</h2>
          <p className="dd__line">It tells the brand their offer worked, and it sharpens what we show you next.</p>
          <div className="dd__row">
            <button
              type="button"
              className="ax-btn ax-btn--primary"
              onClick={() => { confirmPurchase(confirm.id, { purchased: true }); setOutcomeFor(confirm.offerId); }}
            >
              Yes, I bought it
            </button>
            <button
              type="button"
              className="ax-btn ax-btn--secondary"
              onClick={() => confirmPurchase(confirm.id, { purchased: false })}
            >
              Not yet
            </button>
          </div>
        </section>
      )}

      {outcomeFor && (
        <section className="dd__sec dd__confirm" data-testid="purchase-outcome">
          <h2 className="dd__h2">Did the product match what you wanted?</h2>
          <div className="dd__row">
            <button
              type="button"
              className="ax-btn ax-btn--primary"
              onClick={() => { submitOutcome({ clusterId: c.id, offerId: outcomeFor, satisfied: true }); setOutcomeFor(null); setNotice('Thanks — that goes straight into how we match you.'); }}
            >
              Yes, it matched
            </button>
            <button
              type="button"
              className="ax-btn ax-btn--secondary"
              onClick={() => { submitOutcome({ clusterId: c.id, offerId: outcomeFor, satisfied: false, reason: 'mismatch' }); setOutcomeFor(null); setNotice('Noted. We’ll weight that brand lower for requests like yours.'); }}
            >
              Not really
            </button>
          </div>
        </section>
      )}

      {inDemand && (
        <section className="dd__card" data-testid="my-participation">
          <div className="dd__card-top">
            <h2 className="dd__h2">Your request</h2>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={openEdit}>
              Edit request
            </button>
          </div>
          <div className="dd__facts">
            <div><span>Readiness</span><b>{readinessLabel}</b></div>
            <div><span>Budget</span><b>{mine.budget != null ? formatMoney(mine.budget) : 'Not set'}</b></div>
            <div><span>Timeframe</span><b>{timeframeLabel}</b></div>
          </div>
          {mine.readiness === 'ready' && (
            <p className="dd__note">Ready to buy is what you told us. It is not a deposit, and it is not a verified purchase.</p>
          )}
          {mine.expiresAt && (
            <p className="dd__line" data-testid="participation-expiry">
              {c.daysLeft !== null && c.daysLeft < 0
                ? 'Your request has lapsed.'
                : `Live until ${new Date(mine.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}
            </p>
          )}
          <div className="dd__card-actions">
            <button
              type="button"
              className="ax-btn ax-btn--secondary ax-btn--sm"
              onClick={() => { renew(c.id, mine.timeframeId ?? '2weeks'); setNotice('Renewed. Your request counts as live demand again.'); }}
            >
              Still looking
            </button>
            <button
              type="button"
              className="ax-btn ax-btn--ghost ax-btn--sm"
              onClick={() => { leave(c.id); setNotice('You’ve left. Your weight has been removed from this demand.'); }}
              data-testid="leave-demand"
            >
              Leave this demand
            </button>
          </div>
          <div className="dd__acc">
            <button
              type="button"
              className="dd__acc-btn"
              aria-expanded={privacyOpen}
              onClick={() => setPrivacyOpen((v) => !v)}
            >
              What brands can see
            </button>
            {privacyOpen && (
              <p className="dd__acc-body">
                Aggregated demand only: how many people qualify, the typical budget, the
                most requested features and the purchase window. Never your name, your
                email or your address.
              </p>
            )}
          </div>
        </section>
      )}

      {offersVisible && ranked.length > 0 && (
        <section className="dd__sec" data-testid="brands-responded">
          <p className="dm__kicker">Brands responded</p>
          <h2 className="dd__h2">{c.counts.qualified} people asked. {ranked.length} brands responded.</h2>
          <p className="dd__line">Ranked on fit for what you asked for — not on who paid to appear.</p>
          <div className="dd__offers">
            {ranked.slice(0, 4).map(({ offer, match, label }) => (
              <OfferCard key={offer.id} offer={offer} match={match} label={label} onView={onView} onBuy={onBuy} />
            ))}
          </div>
        </section>
      )}

      {offersVisible && ranked.length === 0 && (
        <section className="dd__sec" data-testid="offers-empty">
          <h2 className="dd__h2">No live offers right now</h2>
          <p className="dd__line">Offers expire, and brands pause them when stock runs out. We&rsquo;ll tell you the moment a new one lands.</p>
        </section>
      )}

      {!offersVisible && c.status !== 'expired' && (
        <section className="dd__sec" data-testid="offers-pending">
          <h2 className="dd__h2">No brand has answered yet</h2>
          <p className="dd__line">
            {c.status === 'collecting'
              ? 'Brands see a demand once enough people want the same thing. Joining is what gets it there.'
              : 'This demand is open to brands. We review every offer before it appears here.'}
          </p>
        </section>
      )}

      {open && (
        <aside className="dd__sheet" role="dialog" aria-label={open.product} data-testid="offer-sheet">
          <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm dd__sheet-x" onClick={() => setOpen(null)}>Close</button>
          <p className="oc__brand">{open.brand}</p>
          <h3 className="oc__product">{open.product}</h3>
          <p className="oc__price">{formatMoney(open.priceUsd)}</p>
          <p className="oc__why">{open.why}</p>

          {/* Both halves, always. An offer that meets three of your four
              requirements should say which one it misses on its own detail
              page, not leave you to work it out at checkout. */}
          {openMatch && (
            <>
              <h4 className="dd__h3">What matches</h4>
              <div className="dd__chips">
                {openMatch.matchedCriteria.map((m) => <span key={m} className="dd__chip">{m}</span>)}
                {openMatch.matchedCriteria.length === 0 && <span className="dd__chip">Nothing you listed — read the detail below carefully.</span>}
              </div>
              {openMatch.unmatchedCriteria.length > 0 && (
                <>
                  <h4 className="dd__h3">What doesn&rsquo;t</h4>
                  <div className="dd__chips">
                    {openMatch.unmatchedCriteria.map((m) => <span key={m} className="dd__chip dd__chip--miss">{m}</span>)}
                  </div>
                </>
              )}
            </>
          )}

          {open.bundle && <p className="dd__line">{open.bundle}</p>}
          <p className="dd__line">Stock stated by the brand · {open.inventory ?? '—'} · ships in {open.shippingTime}</p>
          {open.orgStatus === 'verified' && <p className="oc__verified">Business identity verified</p>}
          <p className="dd__fineline">
            You check out on the brand&rsquo;s own site. Axelerate doesn&rsquo;t hold stock, take payment
            or guarantee the product.
          </p>
          <button
            type="button"
            className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full"
            onClick={() => onBuy(open)}
            disabled={(open.inventory ?? 1) <= 0}
          >
            {(open.inventory ?? 1) <= 0 ? 'Out of stock' : 'Buy from brand'}
          </button>
        </aside>
      )}

      {!inDemand && (
        <div className="dd__bar" data-testid="demand-bar">
          {c.status === 'expired' ? (
            <Link to="/app/demand/new" className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full">Open a new request</Link>
          ) : (
            <button type="button" className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full" onClick={onJoin}>
              Join this demand
            </button>
          )}
        </div>
      )}

      {editing && draft && (
        <div className="dd__layer">
          <button type="button" className="dd__backdrop" aria-label="Close editor" onClick={() => setEditing(false)} />
          <aside className="dd__sheet" role="dialog" aria-label="Edit request" data-testid="edit-request">
            <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm dd__sheet-x" onClick={() => setEditing(false)}>Close</button>
            <h2 className="dd__h2">Edit request</h2>
            <p className="dd__line">This updates your own participation. It does not rewrite the shared demand.</p>

            <p className="dd__field-label">Readiness</p>
            <div className="dd__intent" role="group" aria-label="Readiness">
              {READINESS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="dd__intent-opt"
                  aria-pressed={draft.readiness === r.id}
                  onClick={() => { setDraft((d) => ({ ...d, readiness: r.id })); setConfirmDrop(false); }}
                >
                  <span>{r.label}</span>
                  {r.id === 'ready' && <small>A stated intention. Not a payment.</small>}
                </button>
              ))}
            </div>

            <label className="dd__field">
              <span className="dd__field-label">Your budget</span>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={draft.budget}
                placeholder="Optional"
                onChange={(e) => setDraft((d) => ({ ...d, budget: e.target.value }))}
              />
            </label>

            <p className="dd__field-label">Timeframe</p>
            <div className="dd__intent" role="group" aria-label="Timeframe">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="dd__intent-opt"
                  aria-pressed={draft.timeframeId === t.id}
                  onClick={() => setDraft((d) => ({ ...d, timeframeId: t.id }))}
                >
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <button type="button" className="ax-btn ax-btn--secondary ax-btn--full dd__reserve" disabled>
              Reserve this demand
            </button>
            <p className="dd__note">Coming soon. A refundable deposit would be a separate committed state. Ready to buy stays a statement, not a charge.</p>

            {confirmDrop && (
              <p className="dd__warn-copy" role="status">
                You will leave the Ready-to-buy count. Ready to buy was only your stated intention — nothing was charged.
              </p>
            )}
            <button type="button" className="ax-btn ax-btn--primary ax-btn--full" onClick={saveEdit}>
              {confirmDrop ? 'Update and leave Ready to buy' : 'Save'}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
