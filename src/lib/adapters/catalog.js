// Maps the old Supabase rows (gigs / products / brands / events) into the
// shapes the new screens already render. Screens stay unchanged.

const GIG_FORMAT = {
  ugc_post: 'content',
  offline_event: 'event',
  o2o_delivery: 'field',
};

const tagFor = (format, extra = []) => {
  const physical = format === 'field' || format === 'event';
  const base = {
    tone: physical ? 'yellow' : 'blush',
    icon: physical ? 'flag-line' : 'play',
    label: physical ? 'Physical' : 'Digital',
  };
  const more = extra
    .filter((t) => typeof t === 'string' && t.trim())
    .slice(0, 3)
    .map((label) => ({ tone: 'lavender', icon: 'star', label }));
  return [base, ...more];
};

const PERK_ICONS = ['star', 'zap', 'tick-2'];

export function httpUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

function clean(value) {
  return String(value || '')
    .replace(/[’‘]/g, "'")
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function perksFrom(lines) {
  return lines.map(clean).filter(Boolean).map((line, i) => {
    const bare = line.replace(/^[^\p{L}\p{N}]+/u, '');
    const cut = bare.match(/^(.{2,60}?):\s+(.+)$/);
    return {
      icon: PERK_ICONS[i % PERK_ICONS.length],
      lead: cut ? `${cut[1]}:` : '',
      text: cut ? cut[2] : bare,
    };
  });
}

function stepsFrom(body) {
  const text = body.join('\n').trim();
  const numbered = text.split(/\n(?=\d+\.\s)/).map((part) => clean(part.replace(/^\d+\.\s*/, ''))).filter(Boolean);
  if (numbered.length > 1 || /^\d+\.\s/.test(text)) return numbered;
  return text.split(/\n{2,}/).map(clean).filter(Boolean);
}

function kindOf(name) {
  const n = name.toLowerCase().replace(/[’‘]/g, "'");
  if (/what you/.test(n)) return 'steps';
  if (/in it for you|reward|perk/.test(n)) return 'perks';
  if (/support/.test(n)) return 'support';
  return 'desc';
}

// Old gig copy is one description. The new mission page already has a place
// for the brief, the steps, the perks and the training, so a heading the old
// brief used ("What You'll Do", "Task:") lands in that place.
export function briefOf(raw) {
  const text = String(raw || '').trim().replace(/^["“]|["”]$/g, '').trim();
  const empty = { desc: '', steps: [], perkBullets: [], support: [] };
  if (!text) return empty;

  if (/\*\*\[/.test(text)) {
    const sections = [];
    let current = { kind: 'desc', body: [] };
    for (const line of text.split('\n')) {
      const heading = line.trim().match(/^\*\*\[(.+?)\]\*\*$/);
      if (heading) {
        sections.push(current);
        current = { kind: kindOf(heading[1]), body: [] };
      } else current.body.push(line);
    }
    sections.push(current);
    const out = { ...empty, steps: [], perkBullets: [], support: [] };
    const desc = [];
    for (const section of sections) {
      if (section.kind === 'steps') out.steps.push(...stepsFrom(section.body));
      else if (section.kind === 'perks') out.perkBullets.push(...perksFrom(section.body.join('\n').split(/\n+/)));
      else if (section.kind === 'support') {
        out.support.push(...section.body.join('\n').split(/\n{2,}/).map(clean).filter(Boolean));
      } else if (section.body.some((line) => line.trim())) desc.push(clean(section.body.join('\n')));
    }
    out.desc = desc.filter(Boolean).join('\n\n');
    return out;
  }

  if (/^\s*task:\s*$/im.test(text)) {
    const [intro, rest = ''] = text.split(/\n\s*task:\s*\n/i);
    const stepLines = [];
    const perkLines = [];
    for (const line of rest.split('\n')) {
      if (/^(reward|perks)\s*:/i.test(line.trim())) perkLines.push(line);
      else stepLines.push(line);
    }
    return {
      desc: clean(intro),
      steps: stepLines.join('\n').split(/\n{2,}/).map(clean).filter(Boolean),
      perkBullets: perksFrom(perkLines),
      support: [],
    };
  }

  return { ...empty, desc: clean(text) };
}

export function toBrand(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    role: row.category || 'Brand',
    blurb: row.description ?? '',
    cover: row.logo_url ?? '',
    siteUrl: httpUrl(row.website_url),
  };
}

export function toMission(row) {
  const format = GIG_FORMAT[row.type] ?? 'content';
  const total = Number(row.spots_total) || 0;
  const left = Number(row.spots_left);
  const taken = Number.isFinite(left) ? Math.max(0, total - left) : 0;
  const brandName = row.brand?.name ?? '';
  const brief = briefOf(row.description);
  return {
    slug: row.id,
    title: row.title ?? '',
    brandId: row.brand_id ?? '',
    campus: '',
    payUsd: Number(row.reward_cash) || 0,
    tier: 1,
    tierName: 'Explorer',
    minLevel: 1,
    // Old gigs have no duration. A made-up "1 hr" would sit next to a 15-second reel.
    hours: null,
    format,
    skills: [],
    xp: Number(row.xp_reward) || 0,
    creditPts: Number(row.reward_credits) || 0,
    tags: tagFor(format, row.tags ?? []),
    meta: row.deadline ? String(row.deadline) : '',
    photoLabel: brandName ? `${brandName} shot` : (row.title ?? 'Mission'),
    desc: brief.desc,
    steps: brief.steps,
    spots: { taken, total },
    deadline: row.deadline ? String(row.deadline) : 'Rolling',
    deadlineOn: row.deadline ?? null,
    perkBullets: brief.perkBullets,
    support: brief.support,
    going: [],
    cover: row.gallery_url || '',
    detailCover: row.gallery_url || '',
  };
}

function eventWhen(start) {
  const raw = String(start || '').trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) return { iso: raw, time: '' };
  const when = raw ? new Date(raw) : null;
  if (!when || Number.isNaN(when.getTime())) return { iso: '', time: '' };
  const iso = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
  const time = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { iso, time };
}

function seatsLeftOf(row) {
  const total = Number(row.spots_total);
  const left = Number(row.spots_left);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(left)) return null;
  return Math.max(0, left);
}

export function toEvent(row) {
  const { iso, time } = eventWhen(row.starts_at || row.event_date || '');
  return {
    id: row.id,
    kind: 'IRL',
    place: row.location ?? '',
    title: row.title ?? '',
    // Seat count is spots_left. A row with no cap stays open.
    seatsLeft: seatsLeftOf(row),
    photo: row.title ?? 'Event',
    // The shop and the event page both format an ISO date themselves.
    iso,
    date: iso,
    time,
    venue: row.location ?? '',
    guests: [],
    blurb: row.description ?? '',
    cover: row.image_url || row.gallery_url || '',
  };
}

// Shopify variants, folded into the size row the product page already has.
// One "Default Title" variant is not a choice, so it stays off the row.
function variantsOf(row) {
  const spec = row.specifications;
  const options = Array.isArray(spec?.shopify_options) ? spec.shopify_options : [];
  const variants = Array.isArray(spec?.shopify_variants) ? spec.shopify_variants : [];
  const choices = variants
    .filter((v) => v && v.title && v.title !== 'Default Title')
    .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
    .map((v) => ({
      title: String(v.title),
      priceUsd: Number(v.price) || 0,
      stock: Math.max(0, Number(v.inventory_quantity) || 0),
    }));
  if (choices.length < 2) return null;
  const named = options.filter((o) => o?.name && o.name !== 'Title');
  return {
    sizeLabel: named.length === 1 ? String(named[0].name) : 'Option',
    sizes: choices.map((v) => v.title),
    variantPrices: Object.fromEntries(choices.map((v) => [v.title, v.priceUsd])),
    variantStock: Object.fromEntries(choices.map((v) => [v.title, v.stock])),
  };
}

export function priceFor(product, size) {
  if (size && product?.variantPrices && product.variantPrices[size] != null) return product.variantPrices[size];
  return product?.priceUsd ?? 0;
}

// The shop card says "from $4.99" when the options are not one price.
export function fromPrice(product) {
  const prices = product?.variantPrices
    ? Object.values(product.variantPrices).map(Number).filter((n) => n > 0)
    : [];
  if (prices.length < 2) return null;
  const low = Math.min(...prices);
  if (low === Math.max(...prices)) return null;
  return low;
}

export function stockFor(product, size) {
  if (size && product?.variantStock && product.variantStock[size] != null) return product.variantStock[size];
  return product?.stock ?? 0;
}

function galleryOf(row) {
  const seen = new Set();
  const list = [];
  const push = (url) => {
    const value = String(url || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    list.push(value);
  };
  push(row.image_url);
  if (Array.isArray(row.images)) row.images.forEach(push);
  return list;
}

function upcomingDrop(row) {
  if (!row?.drop_time) return false;
  const at = new Date(row.drop_time).getTime();
  return Number.isFinite(at) && at > Date.now();
}

export function toProduct(row) {
  const priceUsd = Number(row.discount_price || row.original_price || 0) || 0;
  const covers = galleryOf(row);
  const shot = covers[0] || '';
  const variants = variantsOf(row);
  return {
    id: row.id,
    brandId: row.brand_id ?? '',
    title: row.title ?? '',
    priceUsd,
    cashbackPct: Number(row.credit_cashback_percent) || 0,
    stock: variants
      ? Object.values(variants.variantStock).reduce((n, s) => n + s, 0)
      : (Number(row.stock_count) || 0),
    topic: row.shop_topic_slug || row.category || 'All',
    photo: row.title ?? 'Product',
    desc: row.description ?? '',
    introHtml: row.long_description_html || '',
    details: [],
    reviews: [],
    photos: covers,
    category: row.category || 'Dorm',
    covers,
    cover: shot,
    // A sized product is sold out only when every option is. The row's
    // stock_count is often one variant, and using it hid sizes that still ship.
    soldOut: variants
      ? Object.values(variants.variantStock).every((n) => n <= 0)
      : (Number(row.stock_count) || 0) <= 0,
    siteUrl: httpUrl(row.brand_link_url),
    drop: Boolean((row.is_drop || row.show_in_friday_night_drop) && upcomingDrop(row)),
    opensAt: upcomingDrop(row) ? row.drop_time : undefined,
    ...(variants ?? {}),
  };
}

export function toDrop(products) {
  const items = products.filter((p) => p.show_in_friday_night_drop || p.is_drop);
  const times = items.map((p) => p.drop_time).filter(Boolean).sort();
  return {
    opensAt: times[0] || new Date().toISOString(),
    items: items.map((p) => ({
      ...toProduct(p),
      cap: p.stock_count ? `${p.stock_count} only` : '',
    })),
  };
}
