// The marketplace's rules, in one place, as data.
//
// Everything here is a knob rather than a constant buried in a screen: the
// thresholds that promote a cluster, the weights that say a "ready to buy"
// signal is worth more than a browse, and the state machines that the rest of
// the app transitions through. Demo numbers, not business policy — they move
// with the vertical, and the point is that moving them touches one file.

// ─── roles ────────────────────────────────────────────────────────────────
// Membership, not a column on the user: one person may be a consumer here and
// a brand's analyst there, and the permissions must not blur.
export const ROLES = {
  visitor: 'visitor',
  consumer: 'consumer',
  scout: 'scout',
  merchant: 'merchant',
  admin: 'admin',
};

// What each role may do. Checked through `can()` so a screen never hardcodes
// "if signed in".
const GRANTS = {
  visitor: ['demand:view', 'offer:view_limited'],
  consumer: [
    'demand:view', 'offer:view_limited', 'offer:view',
    'demand:create', 'demand:join', 'demand:refine', 'demand:leave',
    'offer:click', 'purchase:confirm', 'scout:become',
  ],
  scout: ['hypothesis:create', 'hypothesis:share'],
  merchant: ['product:manage', 'offer:draft', 'merchant:analytics'],
  // Submitting a live offer needs the organization verified as well; see
  // `canSubmitOffer` below, which is the grant plus that state.
  merchant_verified: ['offer:submit'],
  admin: [
    'admin:merchants', 'admin:offers', 'admin:clusters',
    'admin:attribution', 'admin:analytics',
  ],
};

export function can(roles, permission) {
  return (roles ?? []).some((r) => (GRANTS[r] ?? []).includes(permission));
}

// ─── consumer verification ────────────────────────────────────────────────
// Not every signal is worth the same. A registered email is a real person
// most of the time; someone who has actually bought through a match has
// proven commercial behaviour, and their demand should carry further.
export const VERIFICATION = [
  { id: 'V0', label: 'Visitor', short: 'Anonymous', weight: 0, canSignal: false },
  { id: 'V1', label: 'Registered', short: 'Registered', weight: 0.6, canSignal: true },
  { id: 'V2', label: 'Verified user', short: 'Verified', weight: 0.85, canSignal: true },
  { id: 'V3', label: 'Purchase-verified', short: 'Purchase-verified', weight: 1, canSignal: true },
  // Reserved. A refundable deposit or card authorisation lands here; nothing
  // in V0 writes it, but the weighting and the counts already read it so the
  // mechanism can be switched on without a migration.
  { id: 'V4', label: 'Committed buyer', short: 'Committed', weight: 1.3, canSignal: true },
];

export const verification = (id) => VERIFICATION.find((v) => v.id === id) ?? VERIFICATION[0];
export const verificationWeight = (id) => verification(id).weight;

// ─── purchase readiness ───────────────────────────────────────────────────
// A behavioural scale. The weights never reach the consumer UI — they say
// "Ready to buy", not "weight 4".
export const READINESS = [
  { id: 'exploring', label: 'Just exploring', blurb: 'I’m researching.', weight: 1, qualified: false },
  { id: 'interested', label: 'Interested if there is a strong match', blurb: 'I’d consider the right match.', weight: 2, qualified: true },
  { id: 'ready', label: 'Ready to buy', blurb: 'I plan to buy within my timeframe.', weight: 4, qualified: true },
  { id: 'notify', label: 'Notify me when matched', blurb: 'Tell me when brands respond.', weight: 2, qualified: true },
  // Future phase, behind a deposit or authorisation.
  { id: 'committed', label: 'Committed', blurb: 'I’ll buy if my conditions are met.', weight: 8, qualified: true },
];

export const readiness = (id) => READINESS.find((r) => r.id === id) ?? READINESS[1];
export const readinessWeight = (id) => readiness(id).weight;
export const isQualifying = (id) => readiness(id).qualified;
export const READY_TO_BUY = new Set(['ready', 'committed']);

// What a consumer picks from. `committed` is not offered yet.
export const READINESS_CHOICES = READINESS.filter((r) => r.id !== 'committed');

// ─── purchase timeframes ──────────────────────────────────────────────────
// `days` is what sets a participation's expiry: demand decays, and a request
// made for "this week" must not still be counted as live demand next quarter.
export const TIMEFRAMES = [
  { id: 'today', label: 'Today', days: 2 },
  { id: 'week', label: 'This week', days: 7 },
  { id: '2weeks', label: 'Within 2 weeks', days: 14 },
  { id: 'month', label: 'This month', days: 30 },
  { id: 'exploring', label: 'Just exploring', days: 45 },
];

export const timeframe = (id) => TIMEFRAMES.find((t) => t.id === id) ?? TIMEFRAMES[2];

// ─── cluster lifecycle ────────────────────────────────────────────────────
// Explicit states, and explicit edges. The store refuses a transition that is
// not listed here, which is what stops a cluster from going live on nothing
// more than a participant count.
// V1 lifecycle. Qualification is a property of the demand itself.
// Merchant matches do not gate it, and merchants are invited only once
// the cluster is in `sourcing` or later.
export const CLUSTER_STATES = [
  'collecting', 'qualified', 'sourcing', 'offers_live', 'converting', 'closed',
  'expired', 'rejected',
];

// Older demo rows still use the previous names. Read them as the V1 state
// they actually meant, so a reload does not drop live offers.
export const LEGACY_CLUSTER_STATUS = {
  qualifying: 'collecting',
  live: 'sourcing',
  offers_open: 'sourcing',
  offers_available: 'offers_live',
  scaled: 'closed',
};

export const canonicalStatus = (status) => LEGACY_CLUSTER_STATUS[status] ?? status;

export const CLUSTER_FLOW = {
  collecting: ['qualified', 'expired', 'rejected'],
  qualified: ['sourcing', 'collecting', 'expired', 'rejected'],
  sourcing: ['offers_live', 'qualified', 'expired', 'rejected', 'closed'],
  offers_live: ['converting', 'sourcing', 'expired', 'rejected', 'closed'],
  converting: ['closed', 'offers_live', 'expired'],
  closed: [],
  expired: ['collecting'],
  rejected: [],
};

// Forward-only order used when a cluster is more than one edge away from
// the status its numbers already justify.
export const CLUSTER_RANK = {
  collecting: 0,
  qualified: 1,
  sourcing: 2,
  offers_live: 3,
  converting: 4,
  closed: 5,
};

export const canTransition = (from, to) => (CLUSTER_FLOW[from] ?? []).includes(to);

// What the consumer reads. Deliberately plainer than the internal state, and
// honest while numbers are small: four people looking is "Demand is forming",
// never "Trending".
export const CLUSTER_LABEL = {
  collecting: 'Demand is forming',
  qualified: 'Qualified',
  sourcing: 'Brands are being matched',
  offers_live: 'Brands responded',
  converting: 'Brands responded',
  closed: 'Closed',
  expired: 'Expired',
  rejected: 'Closed',
};

export const PUBLIC_STATES = ['collecting', 'qualified', 'sourcing', 'offers_live', 'converting'];
export const OFFERS_VISIBLE_STATES = ['offers_live', 'converting'];
// Open to a verified merchant once demand itself has qualified. A merchant
// match is not a prerequisite for reaching this set.
export const MERCHANT_OPEN_STATES = ['sourcing', 'offers_live', 'converting'];

// ─── merchant organization lifecycle ──────────────────────────────────────
export const MERCHANT_STATES = ['pending', 'verified', 'rejected', 'suspended'];

export const MERCHANT_LABEL = {
  pending: 'Verification in progress',
  // Identity, not safety: Axelerate checks that a business is who it says it
  // is. It does not certify the product.
  verified: 'Business identity verified',
  rejected: 'Verification declined',
  suspended: 'Suspended',
};

export const canSubmitOffer = (org) => org?.status === 'verified';

// ─── offer lifecycle ──────────────────────────────────────────────────────
export const OFFER_STATES = ['draft', 'submitted', 'approved', 'rejected', 'live', 'paused', 'expired'];

export const OFFER_FLOW = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['live', 'rejected', 'paused'],
  live: ['paused', 'expired', 'rejected'],
  paused: ['live', 'expired'],
  rejected: [],
  expired: [],
};

export const offerCanTransition = (from, to) => (OFFER_FLOW[from] ?? []).includes(to);
export const OFFER_PUBLIC_STATES = ['live'];

// ─── attribution confidence ───────────────────────────────────────────────
// A click is not a purchase, and a purchase someone typed into a form is not
// a purchase a merchant confirmed. The Demand Graph is only as good as this
// distinction, so it is a state rather than a boolean.
export const ATTRIBUTION_STATES = ['clicked', 'self_reported', 'merchant_verified', 'attributed', 'refunded', 'unknown'];

export const ATTRIBUTION_LABEL = {
  clicked: 'Clicked through',
  self_reported: 'Reported by buyer',
  merchant_verified: 'Confirmed by brand',
  attributed: 'Attributed',
  refunded: 'Refunded',
  unknown: 'Unknown',
};

// How much each state counts toward demand-outcome figures. A self-report is
// real signal but weaker evidence than a merchant callback.
export const ATTRIBUTION_CONFIDENCE = {
  clicked: 0,
  self_reported: 0.6,
  merchant_verified: 1,
  attributed: 1,
  refunded: 0,
  unknown: 0,
};

// ─── qualification thresholds ─────────────────────────────────────────────
// DEMO numbers for the beauty vertical. A category with a $400 basket would
// not use the same floor as one with a $20 basket, which is why this is keyed
// by category with a default rather than written into the scoring function.
// Active participants, not "everyone who clicked interested". Merchant
// matches are intentionally absent: they must not be required before a
// brand is allowed to respond.
export const THRESHOLDS = {
  default: {
    minActiveParticipants: 15,
    minReadyToBuy: 5,
    minEstimatedGmv: 300,
    maxFraudScore: 0.5,
  },
  'Beauty / Personal Care': {
    minActiveParticipants: 15,
    minReadyToBuy: 5,
    minEstimatedGmv: 300,
    maxFraudScore: 0.5,
  },
  Footwear: {
    minActiveParticipants: 12,
    minReadyToBuy: 4,
    minEstimatedGmv: 800,
    maxFraudScore: 0.5,
  },
};

export const thresholdsFor = (category) => ({
  ...THRESHOLDS.default,
  ...(THRESHOLDS[category] ?? {}),
});

// ─── anti-gaming ──────────────────────────────────────────────────────────
// Not a fraud system. A rate limit, a uniqueness rule, and a place to write
// down suspicion so a real system can read it later.
export const LIMITS = {
  // One account, one active participation per cluster. The store enforces it;
  // this is the number the copy quotes.
  maxParticipationsPerCluster: 1,
  maxSignalsPerHour: 5,
  maxSignalsPerDay: 15,
  // Below this many characters a request carries nothing to cluster on.
  minSignalChars: 8,
};

export const TRUST_FLAGS = {
  duplicateText: 'duplicate_text',
  rateLimited: 'rate_limited',
  tooShort: 'too_short',
  repeatJoin: 'repeat_join',
};

// ─── source context ───────────────────────────────────────────────────────
// Where demand came in from. Campus is one of eight, never required — that is
// the whole point of keeping it here rather than on the user.
export const SOURCE_TYPES = ['direct', 'campus', 'creator', 'salon', 'gym', 'community', 'club', 'ai_agent'];

// ─── commercial terms ─────────────────────────────────────────────────────
// Fields only. V0 takes no money and the UI keeps this out of the consumer's
// way entirely; what matters is that the shape exists before it is needed.
// One performance model per organization. Null means no fee is configured
// and nothing is invented. `revenue_share` is a fraction of verified GMV.
// `cpa` is a fixed amount per verified purchase.
export const COMMERCIAL_DEFAULTS = {
  model: null,
  rate: null,
  amount: null,
};

export function feeFor(commercial, { verifiedGmv = 0, verifiedPurchases = 0 } = {}) {
  if (!commercial?.model) return null;
  if (commercial.model === 'revenue_share') {
    const rate = Number(commercial.rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return Math.round(verifiedGmv * rate * 100) / 100;
  }
  if (commercial.model === 'cpa') {
    const amount = Number(commercial.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.round(verifiedPurchases * amount * 100) / 100;
  }
  return null;
}
