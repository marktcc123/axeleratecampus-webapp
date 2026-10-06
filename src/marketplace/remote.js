import { createClient } from '../lib/supabase.js';
import { isLiveMode } from '../lib/app-mode.js';

// Live persistence. The in-memory shape stays camelCase so the screens do
// not grow a second model. This file is the only place that talks in columns.
// Demo rows are never written.

function supabase() {
  if (!isLiveMode()) return null;
  return createClient();
}

const notDemo = (row) => row && !row.demo;

function signalTo(row) {
  return {
    id: row.id,
    user_id: row.userId,
    raw_text: row.rawText,
    category: row.category,
    product_type: row.productType ?? null,
    budget_min: row.budgetMin ?? null,
    budget_max: row.maxBudget ?? null,
    timeframe: row.timeframeId ?? null,
    readiness: row.readiness,
    must_haves: row.mustHave ?? [],
    preferences: row.optionalPreferences ?? [],
    region: row.region,
    source_type: row.sourceType ?? 'direct',
    source_context: row.sourceContext ?? null,
    cluster_id: row.clusterId,
    status: row.status,
    trust_flags: row.trustFlags ?? [],
    created_at: row.createdAt,
    expires_at: row.expiresAt ?? null,
  };
}

function signalFrom(row) {
  return {
    id: row.id,
    userId: row.user_id,
    rawText: row.raw_text,
    category: row.category,
    productType: row.product_type,
    maxBudget: row.budget_max,
    timeframeId: row.timeframe,
    readiness: row.readiness,
    mustHave: row.must_haves ?? [],
    optionalPreferences: row.preferences ?? [],
    region: row.region,
    sourceType: row.source_type,
    sourceContext: row.source_context,
    clusterId: row.cluster_id,
    status: row.status,
    trustFlags: row.trust_flags ?? [],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function participationTo(row) {
  return {
    id: row.id,
    demand_cluster_id: row.clusterId,
    user_id: row.userId,
    demand_signal_id: row.signalId,
    readiness: row.readiness,
    budget_min: null,
    budget_max: row.budget,
    timeframe: row.timeframeId,
    personal_constraints: row.mustHave ?? [],
    status: row.status,
    verification_level: row.verificationLevel ?? 'V1',
    source_type: row.sourceType ?? 'direct',
    source_context: row.sourceContext ?? null,
    joined_at: row.joinedAt,
    expires_at: row.expiresAt,
    left_at: row.leftAt ?? null,
  };
}

function participationFrom(row) {
  return {
    id: row.id,
    clusterId: row.demand_cluster_id,
    userId: row.user_id,
    signalId: row.demand_signal_id,
    readiness: row.readiness,
    budget: row.budget_max,
    timeframeId: row.timeframe,
    mustHave: row.personal_constraints ?? [],
    status: row.status,
    verificationLevel: row.verification_level,
    sourceType: row.source_type,
    sourceContext: row.source_context,
    joinedAt: row.joined_at,
    expiresAt: row.expires_at,
    leftAt: row.left_at,
  };
}

function clusterTo(row) {
  return {
    id: row.id,
    category: row.category,
    product_type: row.productType ?? null,
    title: row.normalizedNeed,
    canonical_requirements: row.canonicalRequirements ?? [],
    canonical_preferences: row.canonicalPreferences ?? [],
    keywords: row.keywords ?? [],
    common_requirements: row.commonRequirements ?? [],
    region_summary: row.geographicDistribution ?? [],
    budget_range: row.budgetRange,
    average_budget: row.averageBudget,
    purchase_window: row.purchaseWindow,
    status: row.status ?? 'collecting',
    source_type: row.sourceType ?? 'direct',
    created_at: row.openedAt,
    expires_at: row.expiresAt,
  };
}

function clusterFrom(row) {
  return {
    id: row.id,
    normalizedNeed: row.title,
    category: row.category,
    productType: row.product_type,
    canonicalRequirements: row.canonical_requirements ?? [],
    canonicalPreferences: row.canonical_preferences ?? [],
    keywords: row.keywords ?? [],
    commonRequirements: row.common_requirements ?? [],
    geographicDistribution: row.region_summary ?? [],
    budgetRange: row.budget_range,
    averageBudget: row.average_budget,
    purchaseWindow: row.purchase_window,
    status: row.status,
    sourceType: row.source_type,
    openedAt: row.created_at,
    expiresAt: row.expires_at,
    demo: false,
  };
}

function orgTo(row) {
  return {
    id: row.id,
    name: row.name,
    legal_name: row.legalName ?? row.name,
    country: row.country,
    website: row.website,
    categories: row.categories ?? [],
    about: row.about ?? '',
    contact_name: row.contact?.name ?? '',
    contact_role: row.contact?.role ?? '',
    status: row.status,
    verified_at: row.verifiedAt,
    commercial: row.commercial ?? null,
    created_at: row.createdAt,
  };
}

function orgFrom(row) {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    country: row.country,
    website: row.website,
    categories: row.categories ?? [],
    about: row.about,
    contact: { name: row.contact_name, role: row.contact_role },
    status: row.status,
    verifiedAt: row.verified_at,
    commercial: row.commercial,
    createdAt: row.created_at,
    demo: false,
  };
}

function memberTo(row) {
  return {
    id: row.id,
    organization_id: row.orgId,
    user_id: row.userId,
    role: row.role,
    created_at: row.at,
  };
}

function memberFrom(row) {
  return {
    id: row.id,
    orgId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    at: row.created_at,
  };
}

function productTo(row) {
  return {
    id: row.id,
    organization_id: row.orgId,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    retail_price: row.priceUsd,
    currency: 'USD',
    inventory: row.inventory,
    shipping_time: row.shippingTime,
    checkout_url: row.checkoutUrl,
    image_url: row.imageUrl ?? null,
    attributes: row.attributes ?? {},
    status: row.status ?? 'active',
    created_at: row.createdAt,
  };
}

function productFrom(row) {
  return {
    id: row.id,
    orgId: row.organization_id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    priceUsd: row.retail_price,
    inventory: row.inventory,
    shippingTime: row.shipping_time,
    checkoutUrl: row.checkout_url,
    imageUrl: row.image_url,
    attributes: row.attributes ?? {},
    status: row.status,
    createdAt: row.created_at,
    demo: false,
  };
}

function offerTo(row) {
  return {
    id: row.id,
    demand_cluster_id: row.clusterId,
    organization_id: row.orgId,
    product_id: row.productId,
    offer_price: row.priceUsd,
    retail_price: row.retailPriceUsd,
    allocated_inventory: row.inventory,
    bundle: row.bundle,
    shipping_time: row.shippingTime ?? row.delivery,
    valid_until: row.validUntil,
    status: row.status,
    why: row.why,
    brand: row.brand ?? null,
    product_name: row.product ?? null,
    checkout_url: row.checkoutUrl,
    commercial_terms: row.commercial,
    created_at: row.createdAt,
  };
}

function offerFrom(row) {
  return {
    id: row.id,
    clusterId: row.demand_cluster_id,
    orgId: row.organization_id,
    productId: row.product_id,
    priceUsd: row.offer_price,
    retailPriceUsd: row.retail_price,
    inventory: row.allocated_inventory,
    bundle: row.bundle,
    shippingTime: row.shipping_time,
    delivery: row.shipping_time,
    validUntil: row.valid_until,
    status: row.status,
    why: row.why,
    checkoutUrl: row.checkout_url,
    commercial: row.commercial_terms,
    brand: row.brand,
    product: row.product_name,
    createdAt: row.created_at,
    demo: false,
  };
}

function attributionTo(row) {
  return {
    id: row.id,
    user_id: row.userId,
    demand_cluster_id: row.clusterId,
    offer_id: row.offerId,
    organization_id: row.orgId,
    attribution_token: row.attributionToken,
    status: row.state,
    clicked_at: row.at,
    self_reported_at: row.selfReportedAt ?? null,
    verified_at: row.verifiedAt ?? null,
    order_value: row.orderValueUsd ?? 0,
  };
}

function attributionFrom(row) {
  return {
    id: row.id,
    userId: row.user_id,
    clusterId: row.demand_cluster_id,
    offerId: row.offer_id,
    orgId: row.organization_id,
    attributionToken: row.attribution_token,
    state: row.status,
    at: row.clicked_at,
    selfReportedAt: row.self_reported_at,
    verifiedAt: row.verified_at,
    orderValueUsd: row.order_value,
  };
}

function purchaseTo(row) {
  return {
    id: row.id,
    attribution_id: row.attributionId,
    merchant_order_id: row.merchantOrderId,
    organization_id: row.organizationId,
    user_id: row.userId,
    demand_cluster_id: row.clusterId,
    offer_id: row.offerId,
    amount: row.amount,
    currency: row.currency ?? 'USD',
    status: row.status,
    verified_by: row.verifiedBy,
    purchased_at: row.purchasedAt,
    refunded_at: row.refundedAt,
    created_at: row.createdAt,
  };
}

function purchaseFrom(row) {
  return {
    id: row.id,
    attributionId: row.attribution_id,
    merchantOrderId: row.merchant_order_id,
    organizationId: row.organization_id,
    userId: row.user_id,
    clusterId: row.demand_cluster_id,
    offerId: row.offer_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    verifiedBy: row.verified_by,
    purchasedAt: row.purchased_at,
    refundedAt: row.refunded_at,
    createdAt: row.created_at,
  };
}

const MAP = {
  signals: ['demand_signals', signalTo, signalFrom],
  participations: ['demand_participations', participationTo, participationFrom],
  opened: ['demand_clusters', clusterTo, clusterFrom],
  organizations: ['organizations', orgTo, orgFrom],
  orgMembers: ['organization_members', memberTo, memberFrom],
  products: ['products', productTo, productFrom],
  offers: ['offers', offerTo, offerFrom],
  attributions: ['attributions', attributionTo, attributionFrom],
  purchases: ['purchases', purchaseTo, purchaseFrom],
};

async function readTable(db, table, fromRow) {
  const { data, error } = await db.from(table).select('*');
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function loadFacts(db = supabase()) {
  if (!db) return [];
  const { data, error } = await db.rpc('cluster_participation_facts');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: `fact-${row.n}`,
    clusterId: row.cluster_id,
    readiness: row.readiness,
    budget: row.budget == null ? null : Number(row.budget),
    verificationLevel: row.verification_level,
    status: row.status,
    expiresAt: row.expires_at,
    userId: null,
  }));
}

export async function loadMarketplace() {
  const db = supabase();
  if (!db) return { error: 'Live mode is not configured.', state: null };
  try {
    const state = { participationFacts: await loadFacts(db) };
    for (const [key, [table, , fromRow]] of Object.entries(MAP)) {
      state[key] = await readTable(db, table, fromRow);
    }
    return { error: null, state };
  } catch (err) {
    return {
      error: err?.message || 'Apply supabase/migrations/20261006000000_marketplace_v1.sql before using live mode.',
      state: null,
    };
  }
}

function changed(prevRows = [], nextRows = []) {
  const before = new Map((prevRows ?? []).filter(notDemo).map((r) => [r.id, JSON.stringify(r)]));
  return (nextRows ?? []).filter(notDemo).filter((r) => before.get(r.id) !== JSON.stringify(r));
}

export async function syncMarketplace(prev, next) {
  const db = supabase();
  if (!db) return { error: null };
  try {
    for (const [key, [table, toRow]] of Object.entries(MAP)) {
      const rows = changed(prev?.[key], next?.[key]).map(toRow);
      if (!rows.length) continue;
      const { error } = await db.from(table).upsert(rows);
      if (error) return { error: error.message };
    }
    return { error: null, participationFacts: await loadFacts(db) };
  } catch (err) {
    return { error: err?.message || 'Could not save marketplace data.' };
  }
}
