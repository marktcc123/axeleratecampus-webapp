import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import seed from '../data/demand.example.json';
import { clusterDemand, slugNeed } from '../lib/demand.js';
import { isDemoMode, isLiveMode } from '../lib/app-mode.js';
import { track } from '../lib/analytics.js';
import { demoAttributions, demoParticipations } from '../lib/demo-participants.js';
import { canonicalFromInterpretation, interpretDemand } from '../marketplace/interpret.js';
import { applySelfReport, applyVerifiedPurchase, attributionToken } from '../marketplace/purchases.js';
import { feeFor } from '../lib/marketplace.js';
import { loadMarketplace, syncMarketplace } from '../marketplace/remote.js';
import { clustersForMode, demandsForMerchant, rowsForMode } from '../marketplace/sources.js';
import {
  breakdown, daysLeft, demandQualityScore, estimatedGmv, expiryFor,
  isActive, nextStatus, outcomeStats,
} from '../lib/demand-quality.js';
import { rankOffers } from '../lib/offer-match.js';
import {
  CLUSTER_LABEL, LIMITS, MERCHANT_OPEN_STATES, OFFER_PUBLIC_STATES,
  TRUST_FLAGS, canSubmitOffer, canTransition, offerCanTransition, timeframe,
} from '../lib/marketplace.js';
import { useSession } from './session.jsx';

// The marketplace store.
//
// Three rules shape everything below.
//
// 1. Participation is an entity, not a number. `cluster.userIds[]` cannot
//    carry readiness, budget, an expiry or a verification level, and the
//    moment demand has to decay or be weighted, a list of ids has to be
//    rewritten as rows anyway. So it is rows from the start.
// 2. Counts are derived, never stored. Every figure the UI prints comes out
//    of the scoring functions reading live participations, which is why
//    leaving a demand lowers it immediately and an expired one stops counting.
// 3. Private fields never leave this file for a consumer surface. Quality
//    scores, fraud scores, verification weights and merchant commercial terms
//    are computed here and exposed only through `merchantView` and
//    `adminView`.

const KEY = 'ax.demand.v0';
const DemandContext = createContext(null);

function empty() {
  return {
    signals: [],
    participations: [],
    opened: [],
    hypotheses: [],
    organizations: [],
    orgMembers: [],
    products: [],
    offers: [],
    attributions: [],
    purchases: [],
    outcomes: [],
    notifications: [],
    adminFlags: [],
    // Admin overrides, kept apart from the entities so a manual decision is
    // always distinguishable from an automatic transition.
    clusterStatus: {},
    clusterApproved: {},
    orgStatus: {},
    offerStatus: {},
    attributionStatus: {},
    signalLog: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (!data || typeof data !== 'object') return empty();
    const base = { ...empty(), ...data };
    // v0 stored a membership map. Those rows are participations now; without
    // this, a demand you already joined renders with a count of zero.
    if (base.participations.length === 0 && data.memberships && typeof data.memberships === 'object') {
      base.participations = Object.values(data.memberships).filter((m) => m?.clusterId).map((m) => ({
        id: `legacy-${m.clusterId}`,
        clusterId: m.clusterId,
        userId: m.userId ?? null,
        signalId: m.signalId ?? null,
        readiness: m.readiness ?? 'interested',
        budget: m.budget ?? null,
        timeframeId: m.timeframeId ?? '2weeks',
        mustHave: m.mustHave ?? m.prefs ?? [],
        status: m.status ?? 'active',
        joinedAt: m.joinedAt ?? new Date().toISOString(),
        expiresAt: m.expiresAt ?? null,
        verificationLevel: m.verificationLevel ?? 'V1',
        purchaseStatus: m.purchaseStatus ?? 'none',
        sourceType: m.sourceType ?? 'direct',
        fraudScore: 0,
        trustFlags: [],
      }));
    }
    return base;
  } catch {
    return empty();
  }
}

function persist(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* blocked */ }
}

const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

export function DemandProvider({ children }) {
  const live = isLiveMode();
  const [state, setState] = useState(() => (live ? empty() : load()));
  const [remoteError, setRemoteError] = useState(null);
  const session = useSession();

  useEffect(() => {
    if (!live) return undefined;
    let stop = false;
    loadMarketplace().then((remote) => {
      if (stop) return;
      if (remote.error) setRemoteError(remote.error);
      else setState((prev) => ({ ...empty(), ...prev, ...remote.state }));
    });
    return () => { stop = true; };
  }, [live]);

  const commit = useCallback((fn) => {
    setState((prev) => {
      const next = fn(prev);
      if (live) {
        syncMarketplace(prev, next).then((result) => {
          if (result?.error) setRemoteError(result.error);
          else if (result?.participationFacts) {
            setState((cur) => ({ ...cur, participationFacts: result.participationFacts }));
          }
        });
      } else {
        persist(next);
      }
      return next;
    });
  }, [live]);

  const api = useMemo(() => {
    const userId = session.userId;
    const t = Date.now();

    // ─── organizations, products ──────────────────────────────────────────
    const demo = isDemoMode();
    const organizations = [...(demo ? seed.organizations : []), ...state.organizations]
      .map((o) => ({ ...o, status: state.orgStatus[o.id] ?? o.status }));
    const orgById = Object.fromEntries(organizations.map((o) => [o.id, o]));

    const products = [...(demo ? seed.products : []), ...state.products];
    const productById = Object.fromEntries(products.map((p) => [p.id, p]));

    // ─── offers ───────────────────────────────────────────────────────────
    // An offer's effective status is the admin's decision if there is one,
    // then its own; an offer from a suspended or unverified organization is
    // never public whatever its own row says.
    const allOffers = [...(demo ? seed.offers : []), ...state.offers].map((o) => {
      const org = orgById[o.orgId];
      const status = state.offerStatus[o.id] ?? o.status ?? 'submitted';
      const gated = org && org.status !== 'verified' && status === 'live' ? 'submitted' : status;
      const expired = o.validUntil && Date.parse(o.validUntil) < t;
      return {
        ...o,
        status: expired && gated === 'live' ? 'expired' : gated,
        orgStatus: org?.status ?? 'pending',
        orgName: org?.name ?? o.brand,
      };
    });

    const offersByCluster = (id) => allOffers.filter((o) => o.clusterId === id);
    const publicOffers = (id) => offersByCluster(id)
      .filter((o) => OFFER_PUBLIC_STATES.includes(o.status) && (o.inventory ?? 1) > 0);

    // ─── participations ───────────────────────────────────────────────────
    const participantsFor = (id) => (
      demo
        ? rowsForMode(true, demoParticipations(id), state.participations.filter((p) => p.clusterId === id))
        : (state.participationFacts ?? []).filter((p) => p.clusterId === id)
    );
    const purchasesFor = (id) => (state.purchases ?? []).filter((p) => p.clusterId === id);
    const attributionsFor = (id) => [
      ...(demo ? demoAttributions(id) : []),
      ...state.attributions.filter((a) => a.clusterId === id).map((a) => ({ ...a, state: state.attributionStatus[a.id] ?? a.state })),
    ];

    const myParticipation = (id) => state.participations.find(
      (p) => p.clusterId === id && p.userId === userId && p.status !== 'left',
    ) ?? null;

    // ─── clusters ─────────────────────────────────────────────────────────
    const base = clustersForMode(
      demo,
      seed.clusters.map((c) => ({ ...c, demo: true })),
      state.opened,
    );

    const clusters = base.map((c) => {
      const parts = participantsFor(c.id);
      const offers = offersByCluster(c.id);
      const live = offers.filter((o) => o.status === 'live');
      const merchantMatches = new Set(offers.filter((o) => o.status !== 'rejected').map((o) => o.orgId)).size;
      const records = attributionsFor(c.id);
      const outcome = outcomeStats(records, purchasesFor(c.id));

      const quality = demandQualityScore(c, parts, {
        merchantMatches,
        fraudScore: 0,
        now: t,
      });

      const stored = state.clusterStatus[c.id];
      const expired = c.expiresAt && Date.parse(c.expiresAt) < t;
      const status = expired
        ? 'expired'
        : stored ?? nextStatus(c, quality, {
          liveOffers: live.length,
          verifiedPurchases: outcome.verifiedPurchases,
        });

      const mine = myParticipation(c.id);

      return {
        ...c,
        status,
        statusLabel: CLUSTER_LABEL[status] ?? 'Demand is forming',
        // Public counts. Five figures, because collapsing them into one is how
        // a demand marketplace starts lying to the brands that pay it.
        counts: quality.breakdown,
        // Legacy aliases, so screens written against the previous shape keep
        // rendering while they are migrated.
        participantCount: quality.breakdown.joined,
        qualifiedDemandCount: quality.breakdown.qualified,
        liveOfferCount: live.length,
        merchantMatches,
        outcome,
        joined: Boolean(mine),
        participation: mine,
        openToMerchants: MERCHANT_OPEN_STATES.includes(status),
        daysLeft: daysLeft(c.expiresAt, t),
        // Internal. Stripped before anything consumer-facing reads a cluster;
        // see `publicCluster` below.
        _quality: quality,
      };
    });

    const byId = Object.fromEntries(clusters.map((c) => [c.id, c]));
    const cluster = (id) => byId[id] ?? null;

    // What a consumer or a merchant is allowed to see. The quality score, the
    // fraud score and the weighting never cross this line.
    const publicCluster = (c) => {
      if (!c) return null;
      const { _quality, ...rest } = c;
      return rest;
    };

    // ─── notifications ────────────────────────────────────────────────────
    const notify = (prev, note) => ({
      ...prev,
      notifications: [{ id: uid('ntf'), at: now(), read: false, ...note }, ...prev.notifications].slice(0, 60),
    });

    const myNotifications = state.notifications.filter((n) => !n.userId || n.userId === userId);

    // Expiry warnings are derived rather than written: a persisted "expiring
    // soon" row goes stale the moment the participation is renewed.
    const expiryAlerts = state.participations
      .filter((p) => p.userId === userId && p.status === 'active')
      .map((p) => ({ p, left: daysLeft(p.expiresAt, t) }))
      .filter(({ left }) => left !== null && left <= 3)
      .map(({ p, left }) => ({
        id: `exp-${p.id}`,
        type: left < 0 ? 'demand_expired' : 'demand_expiring',
        title: left < 0 ? 'A request of yours expired' : 'Still looking for this?',
        body: left < 0
          ? `${byId[p.clusterId]?.normalizedNeed ?? 'Your request'} stopped counting as live demand.`
          : `${byId[p.clusterId]?.normalizedNeed ?? 'Your request'} expires in ${left} day${left === 1 ? '' : 's'}.`,
        link: `/app/demand/${p.clusterId}`,
        at: p.expiresAt,
        read: false,
        derived: true,
      }));

    const notifications = [...expiryAlerts, ...myNotifications]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const unreadCount = notifications.filter((n) => !n.read).length;

    // ─── anti-gaming ──────────────────────────────────────────────────────
    // A rate limit and a uniqueness rule. Enough to stop one person inflating
    // a cluster by hand; not pretending to be a fraud system.
    const guardSignal = (text) => {
      const flags = [];
      const clean = String(text || '').trim();
      if (clean.length < LIMITS.minSignalChars) flags.push(TRUST_FLAGS.tooShort);

      const mine = state.signalLog.filter((s) => s.userId === userId);
      const lastHour = mine.filter((s) => t - Date.parse(s.at) < 3600000).length;
      const lastDay = mine.filter((s) => t - Date.parse(s.at) < 86400000).length;
      if (lastHour >= LIMITS.maxSignalsPerHour || lastDay >= LIMITS.maxSignalsPerDay) {
        flags.push(TRUST_FLAGS.rateLimited);
      }
      if (state.signals.some((s) => s.userId === userId && s.rawText.trim().toLowerCase() === clean.toLowerCase())) {
        flags.push(TRUST_FLAGS.duplicateText);
      }
      return flags;
    };

    // ─── consumer: signals and participation ──────────────────────────────
    const matchDraft = (draft) => publicCluster(
      (() => {
        const hit = clusterDemand(draft, base);
        return hit ? byId[hit.cluster.id] : null;
      })(),
    );

    const submitSignal = (draft) => {
      const flags = guardSignal(draft.rawText);
      if (flags.includes(TRUST_FLAGS.tooShort)) {
        return { error: 'too_short', message: 'Tell us a little more so we can match it.' };
      }
      if (flags.includes(TRUST_FLAGS.rateLimited)) {
        return { error: 'rate_limited', message: 'You’ve submitted a lot of requests today. Try again tomorrow.' };
      }

      const tf = timeframe(draft.timeframe);
      const interpretation = interpretDemand(draft.rawText);
      const signal = {
        id: uid('sig'),
        userId,
        rawText: draft.rawText,
        interpretation,
        // Structured extraction. Matching happens on these, not on the title —
        // "lightweight" and "no white cast" are the product decision, and a
        // keyword search over a sentence loses both.
        category: draft.category ?? interpretation.category ?? null,
        productType: interpretation.productType ?? null,
        maxBudget: draft.maxBudget ? Number(draft.maxBudget) : interpretation.budgetMax,
        timeframeId: tf.id,
        mustHave: draft.mustHave?.length ? draft.mustHave : interpretation.labels,
        optionalPreferences: draft.matters ?? interpretation.preferences,
        readiness: draft.readiness ?? 'interested',
        region: draft.region ?? session.user?.region ?? null,
        sourceType: draft.sourceType ?? session.user?.sourceType ?? 'direct',
        communityId: draft.communityId ?? session.user?.communityId ?? null,
        fraudScore: flags.length ? 0.3 : 0,
        trustFlags: flags,
        status: 'submitted',
        createdAt: now(),
        clusterId: null,
      };

      const hit = clusterDemand(signal, base);
      if (hit) signal.clusterId = hit.cluster.id;

      track('demand_submitted', { signalId: signal.id, clusterId: signal.clusterId, readiness: signal.readiness });
      commit((prev) => ({
        ...prev,
        signals: [...prev.signals, signal],
        signalLog: [...prev.signalLog, { userId, at: now() }].slice(-50),
      }));

      return { signal, match: publicCluster(hit ? byId[hit.cluster.id] : null) };
    };

    // Join, as a DemandParticipation row. One active row per cluster per
    // account — the second attempt returns the first rather than counting
    // twice.
    const join = (clusterId, extras = {}) => {
      const existing = myParticipation(clusterId);
      if (existing) return { participation: existing, already: true };

      const c = byId[clusterId];
      const tf = timeframe(extras.timeframeId ?? extras.timeframe);
      const participation = {
        id: uid('part'),
        clusterId,
        userId,
        signalId: extras.signalId ?? null,
        readiness: extras.readiness ?? 'interested',
        budget: extras.budget != null ? Number(extras.budget) : (extras.maxBudget != null ? Number(extras.maxBudget) : null),
        timeframeId: tf.id,
        mustHave: extras.mustHave ?? [],
        status: 'active',
        joinedAt: now(),
        expiresAt: expiryFor(tf.days),
        verificationLevel: session.verificationLevel,
        purchaseStatus: 'none',
        sourceType: extras.sourceType ?? session.user?.sourceType ?? 'direct',
        communityId: extras.communityId ?? session.user?.communityId ?? null,
        region: extras.region ?? session.user?.region ?? null,
        fraudScore: 0,
        trustFlags: [],
      };

      track('demand_joined', { clusterId, readiness: participation.readiness });

      commit((prev) => {
        let next = {
          ...prev,
          participations: [...prev.participations, participation],
          signals: extras.signalId
            ? prev.signals.map((s) => (s.id === extras.signalId ? { ...s, clusterId, status: 'clustered' } : s))
            : prev.signals,
        };
        if (c) {
          next = notify(next, {
            userId,
            type: 'joined',
            title: 'You joined this demand',
            body: `We’ll tell you when brands respond to ${c.normalizedNeed}.`,
            link: `/app/demand/${clusterId}`,
          });
        }
        return next;
      });

      return { participation, already: false };
    };

    const refine = (clusterId, patch) => commit((prev) => ({
      ...prev,
      participations: prev.participations.map((p) => (
        p.clusterId === clusterId && p.userId === userId && p.status !== 'left'
          ? { ...p, ...patch, expiresAt: patch.timeframeId ? expiryFor(timeframe(patch.timeframeId).days) : p.expiresAt }
          : p
      )),
    }));

    // Leave removes the weight, it does not hide the row: an audit of why a
    // cluster shrank needs the record.
    const leave = (clusterId) => {
      track('demand_left', { clusterId });
      commit((prev) => ({
        ...prev,
        participations: prev.participations.map((p) => (
          p.clusterId === clusterId && p.userId === userId && p.status === 'active'
            ? { ...p, status: 'left', leftAt: now() }
            : p
        )),
      }));
    };

    const renew = (clusterId, timeframeId) => {
      const tf = timeframe(timeframeId);
      commit((prev) => ({
        ...prev,
        participations: prev.participations.map((p) => (
          p.clusterId === clusterId && p.userId === userId && p.status !== 'left'
            ? { ...p, status: 'active', timeframeId: tf.id, expiresAt: expiryFor(tf.days) }
            : p
        )),
      }));
    };

    // Opening your own demand. Status `collecting`, and the copy that goes
    // with it says "Demand submitted" — one person wanting something is not a
    // market, and telling them it is sets them up to be disappointed.
    const openOwn = (signal, extras = {}) => {
      const id = uid('dmd');
      const tf = timeframe(signal.timeframeId);
      const interpretation = signal.interpretation ?? interpretDemand(signal.rawText);
      const canonical = canonicalFromInterpretation(interpretation, signal.rawText);
      const opened = {
        id,
        normalizedNeed: slugNeed(signal.rawText),
        category: extras.category ?? signal.category ?? canonical.category,
        productType: canonical.productType,
        averageBudget: signal.maxBudget ?? canonical.averageBudget,
        budgetRange: signal.maxBudget ? [Math.max(0, signal.maxBudget - 5), signal.maxBudget] : canonical.budgetRange,
        commonRequirements: (signal.mustHave?.length ? signal.mustHave : canonical.commonRequirements),
        canonicalRequirements: canonical.canonicalRequirements,
        canonicalPreferences: canonical.canonicalPreferences,
        keywords: canonical.keywords,
        geographicDistribution: [],
        purchaseWindow: tf.label,
        purchaseWindowDays: tf.days,
        status: 'collecting',
        growthPct: 0,
        section: 'recent',
        openedAt: signal.createdAt,
        expiresAt: expiryFor(90),
        scout: extras.asHypothesis ? { handle: 'you', label: 'Originator', userId } : null,
        sourceType: signal.sourceType ?? 'direct',
        region: signal.region ?? null,
        demo: false,
        mine: true,
      };

      const participation = {
        id: uid('part'),
        clusterId: id,
        userId,
        signalId: signal.id,
        readiness: signal.readiness,
        budget: signal.maxBudget,
        timeframeId: tf.id,
        mustHave: signal.mustHave ?? [],
        status: 'active',
        joinedAt: signal.createdAt,
        expiresAt: expiryFor(tf.days),
        verificationLevel: session.verificationLevel,
        purchaseStatus: 'none',
        sourceType: signal.sourceType ?? 'direct',
        communityId: signal.communityId ?? null,
        region: signal.region ?? null,
        fraudScore: 0,
        trustFlags: [],
      };

      track('demand_opened', { clusterId: id, asHypothesis: Boolean(extras.asHypothesis) });

      commit((prev) => {
        let next = {
          ...prev,
          opened: [...prev.opened, opened],
          participations: [...prev.participations, participation],
          signals: prev.signals.map((s) => (s.id === signal.id ? { ...s, clusterId: id, status: 'clustered' } : s)),
          hypotheses: extras.asHypothesis
            ? [...prev.hypotheses, {
              id,
              userId,
              text: signal.rawText,
              // A Scout's own preferences describe the Scout. Everyone who
              // joins states their own — the hypothesis seeds the question,
              // never the answers.
              status: 'testing',
              createdAt: signal.createdAt,
            }]
            : prev.hypotheses,
        };
        next = notify(next, {
          userId,
          type: 'demand_submitted',
          title: 'Demand submitted',
          body: 'We’ll group it with similar requests and tell you when it qualifies.',
          link: `/app/demand/${id}`,
        });
        return next;
      });

      return opened;
    };

    // ─── offers, seen by a person ─────────────────────────────────────────
    const rankedOffersFor = (clusterId) => {
      const c = byId[clusterId];
      if (!c) return [];
      return rankOffers(publicOffers(clusterId), {
        cluster: c,
        participation: myParticipation(clusterId),
        productById,
      });
    };

    const clickOffer = (clusterId, offer) => {
      const token = attributionToken();
      const record = {
        id: uid('att'),
        clusterId,
        offerId: offer.id,
        orgId: offer.orgId ?? null,
        userId,
        state: 'clicked',
        orderValueUsd: 0,
        attributionToken: token,
        at: now(),
      };
      track('offer_clicked', { clusterId, offerId: offer.id, attributionToken: token });
      track('purchase_redirect', { clusterId, offerId: offer.id, brand: offer.brand, attributionToken: token });
      commit((prev) => ({ ...prev, attributions: [...prev.attributions, record] }));
      return record;
    };

    // "Did you purchase this?" A self-report is weaker evidence than a
    // merchant callback, so it lands in its own state and may be upgraded
    // later — it is never written in as a confirmed sale.
    // A yes here is a self-report. It does not create a purchase row, verified
    // GMV, or a V3 consumer.
    const confirmPurchase = (attributionId, { purchased, orderValueUsd }) => {
      track(purchased ? 'purchase_self_reported' : 'purchase_declined', { attributionId });
      commit((prev) => {
        const current = prev.attributions.find((a) => a.id === attributionId);
        const applied = applySelfReport(current, { purchased, orderValueUsd, at: now() });
        if (applied.error) return prev;
        return {
          ...prev,
          attributions: prev.attributions.map((a) => (a.id === attributionId ? applied.attribution : a)),
          participations: prev.participations.map((p) => (
            current && p.clusterId === current.clusterId && p.userId === userId
              ? { ...p, purchaseStatus: purchased ? 'self_reported' : p.purchaseStatus }
              : p
          )),
        };
      });
    };

    // Independent confirmation. Admin or a merchant order id. This is the
    // only path that writes a purchase and may raise the buyer to V3.
    const verifyPurchase = ({ attributionId, merchantOrderId, amount, verifiedBy = 'admin' }) => {
      let result = null;
      commit((prev) => {
        const current = prev.attributions.find((a) => a.id === attributionId);
        const applied = applyVerifiedPurchase(current, { merchantOrderId, amount, verifiedBy, at: now() });
        result = applied;
        if (applied.error) return prev;
        return {
          ...prev,
          attributions: prev.attributions.map((a) => (a.id === attributionId ? applied.attribution : a)),
          purchases: [...(prev.purchases ?? []), applied.purchase],
          participations: prev.participations.map((p) => (
            p.clusterId === current.clusterId && p.userId === current.userId
              ? { ...p, purchaseStatus: 'verified', verificationLevel: 'V3' }
              : p
          )),
        };
      });
      if (result?.error) return result;
      if (result?.purchase?.userId === userId) session.markPurchaseVerified();
      track('purchase_verified', { attributionId, merchantOrderId });
      return { purchase: result.purchase };
    };

    // The loop that makes the Demand Graph worth anything: not "did you buy",
    // but "did it turn out to be what you asked for".
    const submitOutcome = ({ clusterId, offerId, satisfied, reason, note }) => {
      track('demand_outcome', { clusterId, offerId, satisfied });
      commit((prev) => ({
        ...prev,
        outcomes: [...prev.outcomes, {
          id: uid('out'), clusterId, offerId, userId, satisfied, reason: reason ?? null, note: note ?? null, at: now(),
        }],
      }));
    };

    const pendingConfirmations = state.attributions.filter(
      (a) => a.userId === userId && a.state === 'clicked',
    );

    // ─── merchant ─────────────────────────────────────────────────────────
    const createOrganization = (draft) => {
      const org = {
        id: uid('org'),
        name: draft.name,
        legalName: draft.legalName ?? draft.name,
        country: draft.country ?? null,
        website: draft.website ?? null,
        categories: draft.categories ?? [],
        about: draft.about ?? '',
        contact: { name: draft.contactName ?? '', role: draft.contactRole ?? '' },
        // Everyone starts pending. A brand may build its profile and load a
        // catalogue while it waits; what it may not do is put an offer in
        // front of a consumer.
        status: 'pending',
        verifiedAt: null,
        createdAt: now(),
        demo: false,
      };
      track('merchant_registered', { orgId: org.id });
      commit((prev) => ({
        ...prev,
        organizations: [...prev.organizations, org],
        orgMembers: [...prev.orgMembers, { id: uid('mem'), orgId: org.id, userId, role: 'owner', at: now() }],
      }));
      return org;
    };

    const updateOrganization = (orgId, patch) => commit((prev) => ({
      ...prev,
      organizations: prev.organizations.map((o) => (o.id === orgId ? { ...o, ...patch } : o)),
    }));

    const addProduct = (orgId, draft) => {
      const product = {
        id: uid('prod'),
        orgId,
        name: draft.name,
        category: draft.category ?? 'Beauty / Personal Care',
        subcategory: draft.subcategory ?? null,
        priceUsd: Number(draft.priceUsd) || 0,
        inventory: Number(draft.inventory) || 0,
        shippingTime: draft.shippingTime ?? null,
        checkoutUrl: draft.checkoutUrl ?? null,
        // Open-ended on purpose. Matching reads attributes, so a vertical that
        // needs `spf` and one that needs `widthFit` both extend here rather
        // than forcing a schema change.
        attributes: draft.attributes ?? {},
        createdAt: now(),
      };
      commit((prev) => ({ ...prev, products: [...prev.products, product] }));
      return product;
    };

    const submitOffer = (draft) => {
      const org = orgById[draft.orgId];
      if (!canSubmitOffer(org)) {
        return { error: 'not_verified', message: 'Your business is still being verified. You can prepare offers now and submit them once verification completes.' };
      }
      const c = byId[draft.clusterId];
      if (!c?.openToMerchants) {
        return { error: 'not_open', message: 'This demand is not open to offers yet.' };
      }
      if (Number(draft.priceUsd) <= 0) {
        return { error: 'invalid_price', message: 'Enter a price above zero.' };
      }
      if (Number(draft.inventory) <= 0) {
        return { error: 'no_inventory', message: 'Enter the units you can supply.' };
      }
      const product = draft.productId ? productById[draft.productId] : null;
      if (!product) {
        return { error: 'no_product', message: 'Choose a product from your catalog. Match is calculated from its attributes, not from a claim.' };
      }

      const offer = {
        id: uid('off'),
        clusterId: draft.clusterId,
        orgId: draft.orgId,
        productId: product.id,
        // Submitted, not live. A human looks before a consumer does.
        status: 'submitted',
        brand: org.name,
        product: product.name,
        priceUsd: Number(draft.priceUsd),
        retailPriceUsd: Number(draft.retailPriceUsd) || product.priceUsd || Number(draft.priceUsd),
        why: draft.why ?? '',
        matched: [],
        delivery: draft.shippingTime ?? null,
        bundle: draft.bundle ?? null,
        matchScore: null,
        checkoutUrl: draft.checkoutUrl || product.checkoutUrl,
        inventory: Number(draft.inventory),
        shippingTime: draft.shippingTime ?? null,
        validUntil: draft.validUntil ?? null,
        commercial: draft.commercial ?? null,
        createdAt: now(),
      };
      track('merchant_offer_submitted', { clusterId: offer.clusterId, orgId: offer.orgId });
      commit((prev) => ({ ...prev, offers: [...prev.offers, offer] }));
      return { offer };
    };

    const setOfferStatus = (offerId, status) => {
      const current = allOffers.find((o) => o.id === offerId);
      if (!current || !offerCanTransition(current.status, status)) {
        return { error: 'illegal_transition', message: `An offer cannot go from ${current?.status ?? 'nothing'} to ${status}.` };
      }
      commit((prev) => {
        let next = { ...prev, offerStatus: { ...prev.offerStatus, [offerId]: status } };
        if (status === 'live') {
          const c = byId[current.clusterId];
          next = notify(next, {
            type: 'brand_responded',
            title: 'A brand responded',
            body: `${current.brand} answered ${c?.normalizedNeed ?? 'a demand you joined'}.`,
            link: `/app/demand/${current.clusterId}`,
          });
        }
        return next;
      });
      return { ok: true };
    };

    // What a merchant is allowed to see: shape, not people. There is no code
    // path from here to a name, an email or an address, because the data this
    // returns never contains one.
    const merchantView = (clusterId) => {
      const c = byId[clusterId];
      if (!c) return null;
      const parts = participantsFor(clusterId);
      const b = breakdown(parts, t);
      const gmv = estimatedGmv(parts, c, t);
      const budgets = parts.filter((p) => isActive(p, t) && p.budget).map((p) => p.budget).sort((x, y) => x - y);
      const requirementCounts = {};
      parts.filter((p) => isActive(p, t)).forEach((p) => {
        (p.mustHave ?? []).forEach((r) => { requirementCounts[r] = (requirementCounts[r] ?? 0) + 1; });
      });
      (c.commonRequirements ?? []).forEach((r) => { requirementCounts[r] = (requirementCounts[r] ?? 0) + b.qualified; });

      return {
        clusterId,
        need: c.normalizedNeed,
        category: c.category,
        status: c.status,
        statusLabel: c.statusLabel,
        // Aggregates only.
        activeDemand: b.joined,
        qualifiedBuyers: b.joined,
        readyToBuy: b.readyToBuy,
        purchaseVerified: b.purchaseVerified,
        estimatedDemandUsd: Math.round(gmv),
        targetPrice: budgets.length ? budgets[Math.floor(budgets.length / 2)] : c.averageBudget,
        budgetRange: c.budgetRange,
        topRequirements: Object.entries(requirementCounts)
          .sort((a, z) => z[1] - a[1])
          .slice(0, 5)
          .map(([label, n]) => ({ label, share: b.qualified ? Math.min(1, n / b.qualified) : 0 })),
        purchaseWindow: c.purchaseWindow,
        geographicDistribution: c.geographicDistribution ?? [],
        competingOffers: offersByCluster(clusterId).filter((o) => o.status === 'live').length,
        outcome: c.outcome,
      };
    };

    // How well a brand's catalogue answers a demand, before it writes an
    // offer. Fit over title match, which is the whole reason products carry
    // structured attributes.
    const catalogMatch = (orgId, clusterId) => {
      const c = byId[clusterId];
      const mine = products.filter((p) => p.orgId === orgId);
      if (!c || !mine.length) return { pct: 0, best: null };
      const scored = mine.map((p) => {
        const pseudo = { id: p.id, productId: p.id, priceUsd: p.priceUsd, inventory: p.inventory, shippingTime: p.shippingTime, product: p.name, brand: orgById[orgId]?.name, matched: [], orgStatus: orgById[orgId]?.status };
        return { product: p, match: rankOffers([pseudo], { cluster: c, participation: null, productById })[0].match };
      }).sort((a, z) => z.match.matchScore - a.match.matchScore);
      return { pct: scored[0].match.matchScore, best: scored[0].product, all: scored };
    };

    const myOrg = session.orgId
      ? orgById[session.orgId] ?? null
      : organizations.find((o) => state.orgMembers.some((m) => m.orgId === o.id && m.userId === userId)) ?? null;

    const merchantPerformance = (orgId) => {
      const mineOffers = allOffers.filter((o) => o.orgId === orgId);
      const records = clusters.flatMap((c) => attributionsFor(c.id)).filter((a) => a.orgId === orgId);
      const sales = (state.purchases ?? []).filter((p) => p.organizationId === orgId || p.orgId === orgId);
      const stats = outcomeStats(records, sales);
      const org = orgById[orgId];
      return {
        offers: mineOffers,
        live: mineOffers.filter((o) => o.status === 'live').length,
        pending: mineOffers.filter((o) => o.status === 'submitted').length,
        ...stats,
        fee: feeFor(org?.commercial, stats),
      };
    };

    const merchantOpportunities = (org = myOrg) => {
      return demandsForMerchant(clusters, org)
        .map((c) => ({
          cluster: publicCluster(c),
          view: merchantView(c.id),
          match: org ? catalogMatch(org.id, c.id) : null,
        }))
        .sort((a, b) => (b.match?.pct ?? 0) - (a.match?.pct ?? 0)
          || (b.view?.estimatedDemandUsd ?? 0) - (a.view?.estimatedDemandUsd ?? 0));
    };

    // ─── admin ────────────────────────────────────────────────────────────
    const setClusterStatus = (clusterId, status, { force = false } = {}) => {
      const c = byId[clusterId];
      if (!c) return { error: 'not_found' };
      if (!force && !canTransition(c.status, status)) {
        return { error: 'illegal_transition', message: `A cluster cannot go from ${c.status} to ${status}.` };
      }
      commit((prev) => ({
        ...prev,
        clusterStatus: { ...prev.clusterStatus, [clusterId]: status },
        adminFlags: [...prev.adminFlags, { id: uid('flg'), kind: 'cluster_status', clusterId, from: c.status, to: status, at: now() }],
      }));
      return { ok: true };
    };

    const approveClusterForLive = (clusterId, on = true) => commit((prev) => ({
      ...prev,
      clusterApproved: { ...prev.clusterApproved, [clusterId]: on },
    }));

    const setOrgStatus = (orgId, status) => {
      commit((prev) => {
        let next = {
          ...prev,
          orgStatus: { ...prev.orgStatus, [orgId]: status },
          adminFlags: [...prev.adminFlags, { id: uid('flg'), kind: 'org_status', orgId, to: status, at: now() }],
        };
        const member = prev.orgMembers.find((m) => m.orgId === orgId);
        if (member && status === 'verified') {
          next = notify(next, {
            userId: member.userId,
            type: 'merchant_verified',
            title: 'Business identity verified',
            body: 'You can now submit offers to open demand.',
            link: '/merchant',
          });
        }
        return next;
      });
      return { ok: true };
    };

    const setAttributionState = (attributionId, nextState) => commit((prev) => ({
      ...prev,
      attributionStatus: { ...prev.attributionStatus, [attributionId]: nextState },
    }));

    // Merging is a manual call in V0. Participations move with the cluster, so
    // the counts stay honest — nothing is double-counted and nothing vanishes.
    const mergeClusters = (fromId, intoId) => {
      if (fromId === intoId) return { error: 'same_cluster' };
      commit((prev) => ({
        ...prev,
        participations: prev.participations.map((p) => (p.clusterId === fromId ? { ...p, clusterId: intoId } : p)),
        offers: prev.offers.map((o) => (o.clusterId === fromId ? { ...o, clusterId: intoId } : o)),
        clusterStatus: { ...prev.clusterStatus, [fromId]: 'rejected' },
        adminFlags: [...prev.adminFlags, { id: uid('flg'), kind: 'merge', from: fromId, into: intoId, at: now() }],
      }));
      return { ok: true };
    };

    const adminView = () => ({
      clusters: clusters.map((c) => ({
        id: c.id,
        need: c.normalizedNeed,
        status: c.status,
        counts: c.counts,
        quality: c._quality.score,
        parts: c._quality.parts,
        estimatedGmv: c._quality.estimatedGmv,
        thresholds: c._quality.thresholds,
        merchantMatches: c.merchantMatches,
        liveOffers: c.liveOfferCount,
        approved: Boolean(state.clusterApproved[c.id]),
        demo: Boolean(c.demo),
      })),
      organizations,
      offers: allOffers,
      attributions: clusters.flatMap((c) => attributionsFor(c.id)),
      outcomes: state.outcomes,
      flags: state.adminFlags,
      funnel: (() => {
        const all = clusters.flatMap((c) => attributionsFor(c.id));
        const joined = clusters.reduce((n, c) => n + c.counts.joined, 0);
        const qualified = clusters.reduce((n, c) => n + c.counts.qualified, 0);
        const withOffers = clusters.filter((c) => c.liveOfferCount > 0).length;
        const o = outcomeStats(all, state.purchases ?? []);
        const openedIds = new Set(state.opened.map((c) => c.id));
        const joinedExisting = state.signals.filter((s) => s.clusterId && !openedIds.has(s.clusterId)).length;
        return {
          signals: state.signals.length,
          joined,
          qualified,
          clustersWithOffers: withOffers,
          clicks: o.clicks,
          purchases: o.verifiedPurchases,
          revenue: o.verifiedRevenue,
          openedNew: state.opened.length,
          joinedExisting,
          clusters: clusters.length,
        };
      })(),
    });

    const markNotificationsRead = () => commit((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));

    // ─── scout ────────────────────────────────────────────────────────────
    const myHypotheses = state.hypotheses
      .filter((h) => !h.userId || h.userId === userId)
      .map((h) => {
        const c = byId[h.id];
        const status = !c ? h.status
          : c.status === 'collecting' ? (c.counts.joined > 1 ? 'growing' : 'testing')
          : c.status === 'qualified' ? 'qualified'
            : c.status === 'sourcing' ? 'market_open'
              : ['offers_live', 'converting'].includes(c.status) ? 'converted'
                : c.status === 'closed' ? 'successful_market' : h.status;
        return { ...h, status, cluster: c ? publicCluster(c) : null };
      });

    return {
      demo,
      remoteError,
      clusters: clusters.map(publicCluster),
      allClusters: clusters,
      signals: state.signals.filter((s) => s.userId === userId),
      participations: state.participations.filter((p) => p.userId === userId),
      hypotheses: myHypotheses,
      organizations,
      products,
      notifications,
      unreadCount,
      pendingConfirmations,
      outcomes: state.outcomes.filter((o) => o.userId === userId),
      myOrg,

      cluster: (id) => publicCluster(byId[id]),
      offersFor: (id) => publicOffers(id),
      rankedOffersFor,
      participation: myParticipation,
      joined: (id) => Boolean(myParticipation(id)),
      matchDraft,
      match: matchDraft,

      submitSignal,
      join,
      refine,
      leave,
      renew,
      openOwn,
      clickOffer,
      confirmPurchase,
      verifyPurchase,
      submitOutcome,
      markNotificationsRead,

      createOrganization,
      updateOrganization,
      addProduct,
      submitOffer,
      setOfferStatus,
      merchantView,
      merchantPerformance,
      merchantOpportunities,
      catalogMatch,

      setClusterStatus,
      approveClusterForLive,
      setOrgStatus,
      setAttributionState,
      mergeClusters,
      adminView,
    };
  }, [state, commit, session, remoteError]);

  return <DemandContext.Provider value={api}>{children}</DemandContext.Provider>;
}

export function useDemand() {
  const ctx = useContext(DemandContext);
  if (!ctx) throw new Error('useDemand() needs a <DemandProvider> above it — see App.jsx');
  return ctx;
}
