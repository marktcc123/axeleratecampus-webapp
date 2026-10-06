import { tokens } from './demand.js';

// Why this offer, for this person.
//
// The cluster-level `matchScore` on an offer answers "does this fit the
// market". It does not answer "does this fit me" — and a marketplace that
// shows the same ranking to a $18 budget and a $25 budget is a catalogue with
// extra steps. So every offer is re-scored against the viewer's own
// participation, and the unmatched criteria are carried alongside the matched
// ones: an offer that misses one of your must-haves should say so on its face
// rather than quietly ranking lower.

const AXES = {
  fit: 0.45,
  price: 0.25,
  availability: 0.15,
  reliability: 0.15,
};

const norm = (s) => String(s || '').toLowerCase().trim();

// A requirement counts as met if the offer claims it, or if the product's
// structured attributes say it. Title text is the last resort, never the first.
function meets(requirement, offer, product) {
  const want = norm(requirement);
  if ((offer.matched ?? []).some((m) => norm(m) === want)) return true;

  const attrs = product?.attributes ?? {};
  const bag = new Set([
    ...Object.entries(attrs).flatMap(([k, v]) => [
      ...tokens(k),
      ...(Array.isArray(v) ? v.flatMap((x) => tokens(x)) : tokens(String(v))),
    ]),
    ...tokens(offer.product),
    ...tokens(offer.brand),
  ]);

  const wanted = tokens(want);
  if (!wanted.length) return false;

  // "No white cast" is satisfied by whiteCast: "none", not by the word
  // appearing at all — a negated requirement needs the negation checked.
  if (/^(no|non|without)\b/.test(want)) {
    const subject = wanted.filter((t) => !['no', 'non', 'without'].includes(t));
    const hasNegation = Object.entries(attrs).some(([k, v]) => {
      const key = tokens(k);
      const val = norm(Array.isArray(v) ? v.join(' ') : v);
      return subject.some((t) => key.includes(t) || t.includes(key[0] ?? '§'))
        && (val === 'none' || val === 'false' || /^(no|non)\b/.test(val));
    });
    if (hasNegation) return true;
  }

  return wanted.every((t) => bag.has(t) || [...bag].some((b) => b.includes(t) || t.includes(b)));
}

export function matchOffer(offer, { cluster, participation, product } = {}) {
  // The checklist is the demand's shared requirements. A personal "ingredients
  // matter" chip is a preference, not a line an offer can fail in public —
  // otherwise every card grows a row of criteria no product can satisfy by name.
  const requirements = (cluster?.commonRequirements?.length
    ? cluster.commonRequirements
    : (participation?.mustHave ?? []));

  const matchedCriteria = requirements.filter((r) => meets(r, offer, product));
  const unmatchedCriteria = requirements.filter((r) => !matchedCriteria.includes(r));

  // Fit: the share of requirements met, with the viewer's own must-haves
  // counted twice — a cluster-wide nice-to-have should never outweigh the one
  // thing this person said they needed.
  const mine = new Set((participation?.mustHave ?? []).map(norm));
  const weightOf = (r) => (mine.has(norm(r)) ? 2 : 1);
  const totalWeight = requirements.reduce((n, r) => n + weightOf(r), 0) || 1;
  const metWeight = matchedCriteria.reduce((n, r) => n + weightOf(r), 0);
  const fit = metWeight / totalWeight;

  // Price: at or under budget is full marks; over budget falls off rather than
  // dropping to zero, because a $26 answer to a $25 brief is still worth
  // showing — clearly marked as over.
  const ownBudget = participation?.budget ?? null;
  const budget = ownBudget ?? cluster?.averageBudget ?? null;
  const price = budget == null
    ? 0.7
    : offer.priceUsd <= budget
      ? 1
      : Math.max(0, 1 - (offer.priceUsd - budget) / budget);

  const availability = (offer.inventory ?? 0) <= 0 ? 0 : Math.min(1, (offer.inventory ?? 0) / 100);
  const reliability = offer.orgStatus === 'verified' ? 1 : 0.5;

  const score = fit * AXES.fit + price * AXES.price + availability * AXES.availability + reliability * AXES.reliability;

  return {
    offerId: offer.id,
    userId: participation?.userId ?? null,
    matchScore: Math.round(score * 100),
    matchedCriteria,
    unmatchedCriteria,
    overBudget: ownBudget != null && offer.priceUsd > ownBudget,
    outOfStock: (offer.inventory ?? 0) <= 0,
    parts: { fit, price, availability, reliability },
  };
}

// Ranking labels. Earned from the comparison, never sold — an offer cannot buy
// "Best Match", which is why nothing in here reads `commercial`.
export function labelOffers(ranked) {
  if (!ranked.length) return ranked;
  const byScore = [...ranked].sort((a, b) => b.match.matchScore - a.match.matchScore);
  const cheapest = [...ranked].sort((a, b) => a.offer.priceUsd - b.offer.priceUsd)[0];
  const fastest = [...ranked].sort((a, b) => days(a.offer.shippingTime) - days(b.offer.shippingTime))[0];
  const priciest = [...ranked].sort((a, b) => b.offer.priceUsd - a.offer.priceUsd)[0];

  const taken = new Set();
  const assign = (row, label) => {
    if (!row || taken.has(row.offer.id)) return;
    row.label = label;
    taken.add(row.offer.id);
  };

  assign(byScore[0], 'Best Match');
  assign(cheapest, 'Best Value');
  assign(priciest, 'Premium Pick');
  assign(fastest, 'Fastest');
  byScore.forEach((row) => { if (!taken.has(row.offer.id)) row.label = 'Also matched'; });

  return byScore;
}

function days(shipping) {
  const m = String(shipping || '').match(/(\d+)/);
  return m ? Number(m[1]) : 99;
}

export function rankOffers(offers, { cluster, participation, productById = {} } = {}) {
  const rows = offers.map((offer) => ({
    offer,
    match: matchOffer(offer, { cluster, participation, product: productById[offer.productId] }),
  }));
  return labelOffers(rows);
}
