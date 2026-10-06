import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import seedBrands from '../data/brands.example.json';
import seedMissions from '../data/missions.example.json';
import seedEvents from '../data/events.example.json';
import seedShop from '../data/shop.example.json';
import { isLiveBackend } from '../lib/supabase.js';
import { loadCatalog } from '../lib/catalog.js';
import { catalogAct } from '../lib/catalog-api.js';

// The catalogue the student browses — brands, missions, board events, shop
// products — as one store both halves of the app read. Before this the admin
// console had its own fixture and its own provider mounted inside AdminShell,
// so an operator could approve a queue item but could not create, edit or close
// a single thing a student sees, and nothing they did reached the board.
//
// Offline, a reload puts the fixtures back. With the live flag, creates and
// edits go through the local console server and come back as database rows.
//
// The fallback below is what makes the rewiring safe: a component rendered
// without the provider (a unit test, the marketing site) still reads the
// fixtures, exactly as it did when it imported them directly.
const ContentContext = createContext(null);

// The address of a thing, derived from its name: "Solra — unboxing reel" ->
// solra-unboxing-reel. Ids and slugs are what the admin queues join on now,
// rather than the display title, which drifts the moment anyone renames.
export const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// An id nobody has yet: `solra`, then `solra-2`, `solra-3`. Used where the id
// comes from a name an operator typed rather than from a counter.
const free = (rows, want, key) => {
  const base = want || 'untitled';
  let id = base;
  for (let n = 2; rows.some((r) => r[key] === id); n += 1) id = `${base}-${n}`;
  return id;
};

const nextId = (rows, prefix) => {
  const n = rows.reduce((max, r) => {
    const digits = Number(String(r.id).replace(/\D/g, ''));
    return Number.isFinite(digits) ? Math.max(max, digits) : max;
  }, 0);
  return `${prefix}${n + 1}`;
};

// ── Brands ───────────────────────────────────────────────────────────────────
// A brand is a row with an id, not a name spelled the same way in ten fixtures.
// Until 2026-09-10 there was no brands table at all: the row on the board and
// every brand page were inferred from the strings on missions and products, so
// a brand could not be given its own art, its own words or a new name.
//
// A mission and a product name their brand by `brandId`; the display name, the
// host line and the page's cover all come off this row. Renaming a brand here
// therefore reaches the board, the shop, the mission page and the console's
// queues at once, and the brand's address (/app/earn/brands/<id>) does not move.
export function brandFrom(fields) {
  return {
    id: fields.id || slugify(fields.name ?? ''),
    name: '',
    role: 'Brand',
    blurb: '',
    cover: '',
    ...fields,
  };
}

// `brand` and `host` are derived on read and never stored — see `owned` below.
const joinMission = (m, byId) => {
  const b = byId.get(m.brandId);
  const name = b?.name ?? m.brandId;
  return { ...m, brand: name, host: { name, role: b?.role ?? 'Brand' } };
};
const joinProduct = (p, byId) => ({ ...p, brand: byId.get(p.brandId)?.name ?? p.brandId });

// A piece of the weekly drop, read as a product (owner, 2026-09-21: "opening
// a drop item shows the shop's product card, with the cart locked"). Its
// stock is its cap ("50 only"), it is never sold out before it opens, and
// `drop` is what the page's bar reads to lock the cart until `opensAt`.
const dropProduct = (it, byId, drop) => ({
  ...joinProduct(it, byId),
  drop: true,
  opensAt: drop?.opensAt ?? seedShop.drop.opensAt,
  stock: parseInt(it.cap, 10) || 0,
  soldOut: false,
});
const dropById = (id, byId, drop = seedShop.drop) => {
  const it = (drop?.items ?? []).find((x) => x.id === id);
  return it ? dropProduct(it, byId, drop) : null;
};

// What the store keeps. A panel edits a row it read, so the derived fields come
// back with it; storing them would freeze the brand's name into the mission and
// put back the copy this table exists to remove.
const owned = ({ brand, host, ...row }) => row;

// ── Missions, events, products ───────────────────────────────────────────────
// A mission the console creates has to satisfy every screen that renders one:
// the tile's caps line and pay tag, the detail page's facts, steps, perks and
// dock, the board's format tabs and chips. The form fills what an operator
// decides; this fills the rest so a new mission never renders a blank or
// throws on a missing array.
export function missionFrom(fields, brandName = '') {
  const format = fields.format ?? 'content';
  const isPhysical = format === 'field' || format === 'event';
  return {
    slug: fields.slug || slugify(fields.title ?? ''),
    title: '',
    brandId: '',
    campus: 'Cornell Tech',
    payUsd: 0,
    tier: 1,
    tierName: 'Explorer',
    minLevel: 1,
    hours: 1,
    format,
    skills: [],
    xp: 0,
    creditPts: 0,
    tags: [{ tone: 'blush', icon: isPhysical ? 'flag-line' : 'play', label: isPhysical ? 'Physical' : 'Digital' }],
    meta: '',
    photoLabel: `${brandName} shot`.trim(),
    desc: '',
    steps: [],
    spots: { taken: 0, total: 0 },
    deadline: 'Rolling',
    deadlineOn: null,
    perkBullets: [],
    support: [],
    going: [],
    cover: 'mission-solra-reel',
    detailCover: 'mission-solra-unbox',
    ...owned(fields),
  };
}

export function eventFrom(fields, rows) {
  return {
    id: fields.id || nextId(rows, 'ev'),
    kind: 'IRL',
    place: '',
    title: '',
    seatsLeft: 0,
    photo: `${fields.title ?? 'Event'} shot`,
    date: '',
    time: '',
    venue: '',
    guests: [],
    blurb: '',
    cover: 'event-panel-mic',
    ...fields,
  };
}

export function productFrom(fields, rows) {
  return {
    id: fields.id || nextId(rows, 'p'),
    brandId: '',
    title: '',
    priceUsd: 0,
    cashbackPct: 0,
    stock: 0,
    topic: 'All',
    photo: `${fields.title ?? 'Product'} shot`,
    desc: '',
    details: [],
    reviews: [],
    photos: [],
    category: 'Dorm',
    covers: ['product-journal'],
    ...owned(fields),
  };
}

export function ContentProvider({ children, seed }) {
  const [brands, setBrands] = useState(() => structuredClone(seed?.brands ?? seedBrands));
  const [missions, setMissions] = useState(() => structuredClone(seed?.missions ?? seedMissions));
  const [events, setEvents] = useState(() => structuredClone(seed?.events ?? seedEvents));
  const [products, setProducts] = useState(() => structuredClone(seed?.products ?? seedShop.products));
  const [drop, setDrop] = useState(() => structuredClone(seed?.drop ?? seedShop.drop));

  useEffect(() => {
    if (!isLiveBackend()) return undefined;
    let alive = true;
    loadCatalog()
      .then((live) => {
        if (!alive || !live) return;
        if (live.brands.length) setBrands(live.brands);
        if (live.missions.length) setMissions(live.missions);
        if (live.events.length) setEvents(live.events);
        if (live.products.length) setProducts(live.products);
        if (live.drop) setDrop(live.drop);
      })
      .catch((err) => console.warn('[content] live catalog failed, keeping fixtures', err));
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const joined = useMemo(() => missions.map((m) => joinMission(m, byId)), [missions, byId]);
  const stocked = useMemo(() => products.map((p) => joinProduct(p, byId)), [products, byId]);

  // Two brands at one address would make one of their pages unreachable, so a
  // name that slugifies onto a taken id gets a suffix rather than silently
  // shadowing the brand already there. Missions have the same hazard below.
  const addBrand = useCallback((f) => {
    const draft = brandFrom({ ...f, id: free(brands, f.id || slugify(f.name), 'id') });
    if (!isLiveBackend()) {
      setBrands((rows) => [...rows, draft]);
      return undefined;
    }
    return catalogAct('saveBrand', draft).then((result) => {
      if (result?.ok && result.item) setBrands((rows) => [...rows, result.item]);
      return result;
    });
  }, [brands]);
  const updateBrand = useCallback((id, f) => {
    if (!isLiveBackend()) {
      setBrands((rows) => rows.map((b) => (b.id === id ? { ...b, ...f, id } : b)));
      return undefined;
    }
    return catalogAct('saveBrand', { ...f, id }).then((result) => {
      if (result?.ok && result.item) {
        setBrands((rows) => rows.map((b) => (b.id === id ? { ...b, ...result.item, id } : b)));
      }
      return result;
    });
  }, []);
  // A brand with a mission or a product behind it cannot be removed: the rows
  // that name it would render a bare id. The panel says so and disables it;
  // this refuses anyway, because a store that can be corrupted by a second
  // caller is not one the screens can trust.
  const removeBrand = useCallback((id) => {
    if (missions.some((m) => m.brandId === id) || products.some((p) => p.brandId === id)) return false;
    if (!isLiveBackend()) {
      setBrands((rows) => rows.filter((b) => b.id !== id));
      return true;
    }
    return catalogAct('removeBrand', { id }).then((result) => {
      if (result?.ok) setBrands((rows) => rows.filter((b) => b.id !== id));
      return result;
    });
  }, [missions, products]);

  const addMission = useCallback((f) => {
    const slug = free(missions, f.slug || slugify(f.title), 'slug');
    const draft = missionFrom({ ...f, slug }, byId.get(f.brandId)?.name);
    if (!isLiveBackend()) {
      setMissions((rows) => [draft, ...rows]);
      return undefined;
    }
    return catalogAct('saveMission', f).then((result) => {
      if (result?.ok && result.item) setMissions((rows) => [result.item, ...rows]);
      return result;
    });
  }, [missions, byId]);
  const updateMission = useCallback((slug, f) => {
    const prev = missions.find((m) => m.slug === slug);
    if (!isLiveBackend()) {
      setMissions((rows) => rows.map((m) => (m.slug === slug ? { ...m, ...owned(f) } : m)));
      return undefined;
    }
    return catalogAct('saveMission', {
      ...f,
      slug,
      keepDescription: prev?.desc === f.desc,
      taken: prev?.spots?.taken ?? 0,
    }).then((result) => {
      if (result?.ok && result.item) {
        setMissions((rows) => rows.map((m) => (m.slug === slug ? result.item : m)));
      }
      return result;
    });
  }, [missions]);
  const removeMission = useCallback((slug) => {
    if (!isLiveBackend()) {
      setMissions((rows) => rows.filter((m) => m.slug !== slug));
      return undefined;
    }
    return catalogAct('closeMission', { slug }).then((result) => {
      if (result?.ok) setMissions((rows) => rows.filter((m) => m.slug !== slug));
      return result;
    });
  }, []);

  const addEvent = useCallback((f) => {
    const draft = eventFrom(f, events);
    if (!isLiveBackend()) {
      setEvents((rows) => [draft, ...rows]);
      return undefined;
    }
    return catalogAct('saveEvent', f).then((result) => {
      if (result?.ok && result.item) setEvents((rows) => [result.item, ...rows]);
      return result;
    });
  }, [events]);
  const updateEvent = useCallback((id, f) => {
    if (!isLiveBackend()) {
      setEvents((rows) => rows.map((e) => (e.id === id ? { ...e, ...f } : e)));
      return undefined;
    }
    return catalogAct('saveEvent', { ...f, id }).then((result) => {
      if (result?.ok && result.item) setEvents((rows) => rows.map((e) => (e.id === id ? result.item : e)));
      return result;
    });
  }, []);
  const removeEvent = useCallback((id) => {
    if (!isLiveBackend()) {
      setEvents((rows) => rows.filter((e) => e.id !== id));
      return undefined;
    }
    return catalogAct('closeEvent', { id }).then((result) => {
      if (result?.ok) setEvents((rows) => rows.filter((e) => e.id !== id));
      return result;
    });
  }, []);

  const addProduct = useCallback((f) => {
    const draft = productFrom(f, products);
    if (!isLiveBackend()) {
      setProducts((rows) => [draft, ...rows]);
      return undefined;
    }
    return catalogAct('saveProduct', f).then((result) => {
      if (result?.ok && result.item) setProducts((rows) => [result.item, ...rows]);
      return result;
    });
  }, [products]);
  const updateProduct = useCallback((id, f) => {
    if (!isLiveBackend()) {
      setProducts((rows) => rows.map((p) => (p.id === id ? { ...p, ...owned(f) } : p)));
      return undefined;
    }
    return catalogAct('saveProduct', { ...f, id }).then((result) => {
      if (result?.ok && result.item) {
        setProducts((rows) => rows.map((p) => (p.id === id ? { ...result.item, reviews: p.reviews } : p)));
      }
      return result;
    });
  }, []);
  const removeProduct = useCallback((id) => {
    if (!isLiveBackend()) {
      setProducts((rows) => rows.filter((p) => p.id !== id));
      return undefined;
    }
    return catalogAct('removeProduct', { id }).then((result) => {
      if (result?.ok) setProducts((rows) => rows.filter((p) => p.id !== id));
      return result;
    });
  }, []);

  const value = useMemo(() => ({
    brands, missions: joined, events, products: stocked, drop,
    brandById: (id) => byId.get(id) ?? null,
    missionBySlug: (slug) => joined.find((m) => m.slug === slug) ?? null,
    eventById: (id) => events.find((e) => e.id === id) ?? null,
    productById: (id) => stocked.find((p) => p.id === id) ?? dropById(id, byId, drop),
    addBrand, updateBrand, removeBrand,
    addMission, updateMission, removeMission,
    addEvent, updateEvent, removeEvent,
    addProduct, updateProduct, removeProduct,
  }), [
    brands, byId, joined, events, stocked, drop,
    addBrand, updateBrand, removeBrand,
    addMission, updateMission, removeMission,
    addEvent, updateEvent, removeEvent,
    addProduct, updateProduct, removeProduct,
  ]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

// The fixtures as the screens see them: brand names joined in, exactly as the
// provider would hand them over. Tests read this rather than the raw JSON,
// which carries `brandId` and no display name at all.
const SEED_BY_ID = new Map(seedBrands.map((b) => [b.id, b]));
export const FIXTURES = {
  brands: seedBrands,
  missions: seedMissions.map((m) => joinMission(m, SEED_BY_ID)),
  events: seedEvents,
  products: seedShop.products.map((p) => joinProduct(p, SEED_BY_ID)),
  drop: seedShop.drop,
};

// Read-only fixtures, and writers that do nothing: what a component gets when
// no provider is above it.
const FALLBACK = {
  ...FIXTURES,
  brandById: (id) => SEED_BY_ID.get(id) ?? null,
  missionBySlug: (slug) => FIXTURES.missions.find((m) => m.slug === slug) ?? null,
  eventById: (id) => FIXTURES.events.find((e) => e.id === id) ?? null,
  productById: (id) => FIXTURES.products.find((p) => p.id === id) ?? dropById(id, SEED_BY_ID),
  addBrand: () => {}, updateBrand: () => {}, removeBrand: () => false,
  addMission: () => {}, updateMission: () => {}, removeMission: () => {},
  addEvent: () => {}, updateEvent: () => {}, removeEvent: () => {},
  addProduct: () => {}, updateProduct: () => {}, removeProduct: () => {},
};

export const useContent = () => useContext(ContentContext) ?? FALLBACK;
