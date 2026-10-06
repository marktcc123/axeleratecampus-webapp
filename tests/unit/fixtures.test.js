import { readFileSync, readdirSync } from 'node:fs';
import rawMissions from '../../src/data/missions.example.json';
import rawShop from '../../src/data/shop.example.json';
import brands from '../../src/data/brands.example.json';
// The missions as a screen sees them: `brand` and `host` are joined in from the
// brands table and are not stored on the row. Shape checks that belong to the
// stored row read `rawMissions`; everything a screen renders reads this.
import { FIXTURES } from '../../src/app/content.jsx';
import quests from '../../src/data/quests.example.json';
import perks from '../../src/data/levels.example.json';
import applications from '../../src/data/applications.example.json';
import people from '../../src/data/people.example.json';
import boardEvents from '../../src/data/events.example.json';
import levels from '../../src/data/levels.example.json';

const missions = FIXTURES.missions;

const TIER_NAMES = { 1: 'Explorer', 2: 'Contributor', 3: 'Insider', 4: 'Trusted', 5: 'Partner' };
// Read out of the design system rather than restated here. This list was
// hardcoded and went stale the moment the accent ramp was cut to six hues;
// parsing Tag's own SOLID map means the fixtures are checked against what the
// component will actually accept.
const TONES = Object.keys(
  Object.fromEntries(
    [...readFileSync('node_modules/axelerate-design-system/components/display/Tag.jsx', 'utf8')
      .match(/const SOLID=\{([^;]*)\};/)[1]
      .matchAll(/(\w+):\[/g)].map((m) => [m[1], true]),
  ),
);

describe('missions — existing contract preserved', () => {
  test('every mission still carries the original fields (the dormant marketing pages read these)', () => {
    expect(missions).toHaveLength(8);   // 5, then three more the student can take (owner, 2026-09-21)
    for (const m of missions) {
      for (const k of ['slug','title','brand','campus','payUsd','tier','tierName','minLevel','hours','format','skills','xp']) {
        expect(m, `${m.slug} lost ${k}`).toHaveProperty(k);
      }
      expect(m.tierName).toBe(TIER_NAMES[m.tier]);            // R9
      expect(['content','field','event','sales']).toContain(m.format);  // R3
    }
  });
});

describe('missions — new app fields', () => {
  test('every mission has all nine', () => {
    // `perk` was the tenth. It rendered a line on the board tile and was an
    // empty string on four of the five missions, so the path fired for one row;
    // the owner asked for that row's line gone, which left the field with
    // nothing to say on any of them.
    for (const m of missions) {
      for (const k of ['tags','meta','photoLabel','desc','steps','creditPts','spots','deadline','host']) {
        expect(m, `${m.slug} missing ${k}`).toHaveProperty(k);
      }
    }
  });
  test('tags use design-system Tag tones and real icon names', () => {
    for (const m of missions) {
      expect(m.tags.length).toBeGreaterThan(0);
      for (const t of m.tags) {
        expect(TONES).toContain(t.tone);
        expect(t.icon).toMatch(/^[a-z0-9-]+$/);
        expect(t.label.length).toBeGreaterThan(0);
      }
    }
  });
  test('steps are non-empty and host carries a name and role', () => {
    for (const m of missions) {
      expect(Array.isArray(m.steps)).toBe(true);
      expect(m.steps.length).toBeGreaterThanOrEqual(3);
      expect(m.host).toHaveProperty('name');
      expect(m.host).toHaveProperty('role');
    }
  });
  test('the Dermabell mission carries the designed detail content', () => {
    const d = missions.find((m) => m.slug === 'dermabell-campus-launch');
    expect(d.creditPts).toBe(8000);
    expect(d.spots).toEqual({ taken: 3, total: 4 });
    expect(d.deadline).toBe('Ongoing');
    expect(d.host.name).toBe('Axelerate Beauty');
    expect(d.desc).toMatch(/Dermabell/);
    expect(d.steps).toHaveLength(3);
  });

  test('every mission carries its own perkBullets and support (Critical 1 — no shared client copy)', () => {
    for (const m of missions) {
      expect(Array.isArray(m.perkBullets), `${m.slug} missing perkBullets`).toBe(true);
      expect(m.perkBullets.length, `${m.slug} has empty perkBullets`).toBeGreaterThan(0);
      for (const b of m.perkBullets) {
        expect(b).toHaveProperty('icon');
        expect(b).toHaveProperty('lead');
        expect(b).toHaveProperty('text');
      }
      expect(Array.isArray(m.support), `${m.slug} missing support`).toBe(true);
      expect(m.support.length, `${m.slug} has empty support`).toBeGreaterThan(0);
      for (const p of m.support) expect(typeof p).toBe('string');
    }
  });

  test('every perkBullets icon exists in the solid icon set', () => {
    const { readdirSync } = require('node:fs');
    const icons = new Set(
      readdirSync('node_modules/axelerate-design-system/assets/icons-solid').map((f) => f.replace(/\.svg$/, ''))
    );
    for (const m of missions) {
      for (const b of m.perkBullets) {
        expect(icons.has(b.icon), `${m.slug} perk bullet icon "${b.icon}" is not in icons-solid`).toBe(true);
      }
    }
  });

  test('only Dermabell mentions commission, salon or B2B — the other three missions make no such claim', () => {
    const CLIENT_WORDS = /\b(commission|salon|B2B)\b/i;
    for (const m of missions) {
      const text = JSON.stringify(m);
      if (m.slug === 'dermabell-campus-launch') continue;
      expect(CLIENT_WORDS.test(text), `${m.slug} unexpectedly mentions a Dermabell-only term`).toBe(false);
    }
  });
});

describe('quests', () => {
  test('every quest names a token colour, and no two share one', () => {
    // No hardcoded count: the deck renders however many there are, and the
    // number is expected to move. What must hold is that each quest carries a
    // DISTINCT design-system token — the deck's whole job is to show them apart.
    expect(quests.length).toBeGreaterThan(1);
    expect(new Set(quests.map((q) => q.color)).size).toBe(quests.length);
    for (const q of quests) {
      for (const k of ['tab','title','desc','reward','color']) expect(q).toHaveProperty(k);
      expect(q.color).toMatch(/^[a-z0-9-]+$/);
      expect(q.color).not.toMatch(/^#/);
    }
  });

  test('every quest colour is a token the design system actually defines', () => {
    const { readFileSync, readdirSync } = require('node:fs');
    const dir = 'node_modules/axelerate-design-system/tokens';
    const defined = new Set();
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.css'))) {
      for (const m of readFileSync(`${dir}/${f}`, 'utf8').matchAll(/--([a-z0-9-]+)\s*:/g)) {
        defined.add(m[1]);
      }
    }
    for (const q of quests) {
      expect(defined.has(q.color), `quest colour --${q.color} is not defined in tokens/`).toBe(true);
    }
  });
});

describe('perks', () => {
  test('all five levels with the spec names and at least one perk each', () => {
    expect(perks).toHaveLength(5);
    expect(perks.map((p) => p.name)).toEqual(['Explorer','Contributor','Insider','Trusted','Partner']);
    for (const p of perks) {
      expect(p.level).toBeGreaterThanOrEqual(1);
      expect(p.perks.length).toBeGreaterThan(0);
    }
  });
  test('no perk promises pay — R7: levels buy access and status, never money', () => {
    for (const level of perks) {
      for (const p of level.perks) {
        expect(p, `L${level.level} perk names a dollar figure: "${p}"`).not.toMatch(/\$/);
        expect(p, `L${level.level} perk promises more pay: "${p}"`).not.toMatch(/earn more|higher pay|more pay|pay multiplier/i);
      }
    }
  });
});

describe('brands', () => {
  const COVERS = new Set(readdirSync('src/assets/covers').map((f) => f.replace(/\.(jpg|svg)$/, '')));

  test('every brand carries an id, a name, how it is described and its words', () => {
    expect(brands.length).toBeGreaterThanOrEqual(5);
    const ids = new Set();
    for (const b of brands) {
      for (const k of ['id', 'name', 'role', 'blurb']) expect(b, `${b.id} lost ${k}`).toHaveProperty(k);
      expect(b.id, `${b.name} needs a slug id`).toMatch(/^[a-z0-9-]+$/);
      expect(ids.has(b.id), `${b.id} is used twice — one page would be unreachable`).toBe(false);
      ids.add(b.id);
      // A cover is optional; a cover naming art that is not there is not.
      if (b.cover) expect(COVERS.has(b.cover), `${b.id} names a missing cover ${b.cover}`).toBe(true);
    }
  });

  test('a mission and a product name their brand by id and keep no copy of it', () => {
    const ids = new Set(brands.map((b) => b.id));
    for (const m of rawMissions) {
      expect(ids.has(m.brandId), `${m.slug} names brand ${m.brandId}`).toBe(true);
      // The name and the host line are derived; storing either puts back the
      // copy that made a brand impossible to rename.
      for (const k of ['brand', 'host']) expect(m, `${m.slug} still carries ${k}`).not.toHaveProperty(k);
    }
    for (const p of rawShop.products) {
      expect(ids.has(p.brandId), `${p.id} names brand ${p.brandId}`).toBe(true);
      expect(p, `${p.id} still carries brand`).not.toHaveProperty('brand');
    }
  });

  test('the join gives every screen a name and a host line', () => {
    for (const m of missions) {
      expect(m.brand, `${m.slug} has no brand name`).toBeTruthy();
      expect(m.host.name).toBe(m.brand);
    }
    const d = missions.find((m) => m.slug === 'dermabell-campus-launch');
    expect(d.host.role).toBe('US operating partner for Dermabell');
  });
});

describe('applications', () => {
  test('each row points at a real mission and uses a loop status', () => {
    const slugs = missions.map((m) => m.slug);
    expect(applications.length).toBeGreaterThanOrEqual(3);
    let offBoard = 0;
    for (const a of applications) {
      // An application outlives the listing, so every one NAMES its mission
      // (the tracker always links through) and carries its own brand and
      // title (the mission page may have nothing left to show). A slug the
      // board no longer carries is not an error — it is the ended page's case,
      // and the fixture must keep at least one so that page stays tested.
      expect(typeof a.missionSlug, `${a.title} needs a slug`).toBe('string');
      expect(a.brand, 'an application needs its own brand').toBeTruthy();
      expect(a.title, 'an application needs its own title').toBeTruthy();
      if (!slugs.includes(a.missionSlug)) offBoard += 1;
      expect(['applied','submitted','paid']).toContain(a.status);
      expect(a).toHaveProperty('appliedAt');
      expect(typeof a.payUsd).toBe('number');
    }
    expect(offBoard, 'keep one application whose mission has left the board').toBeGreaterThan(0);
  });
});

describe('people and guests', () => {
  test('a person carries identity and level, and no money at all', () => {
    expect(people.length).toBeGreaterThan(5);
    const MONEY = /(usd|cash|paid|earn|payout|price|amount|credit)/i;
    for (const p of people) {
      expect(Object.keys(p).sort()).toEqual(
        ['campus', 'handle', 'level', 'levelName', 'name', 'verified', 'xp', 'xpToNext'],
      );
      // Belt and braces: a field added later that merely LOOKS like money
      // fails here too, because this page must never grow one.
      for (const k of Object.keys(p)) expect(k).not.toMatch(MONEY);
    }
  });

  test('handles are URL-safe and unique', () => {
    const seen = new Set();
    for (const p of people) {
      expect(p.handle).toMatch(/^[a-z0-9][a-z0-9-]{1,29}$/);
      expect(seen.has(p.handle), `${p.handle} twice`).toBe(false);
      seen.add(p.handle);
    }
  });

  test('every level name matches the ladder', () => {
    const byLevel = new Map(levels.map((l) => [l.level, l.name]));
    for (const p of people) expect(p.levelName).toBe(byLevel.get(p.level));
  });

  test('xpToNext is a threshold above xp, not a remainder', () => {
    for (const p of people) expect(p.xpToNext).toBeGreaterThan(p.xp);
  });

  test('every guest handle resolves to a person', () => {
    const handles = new Set(people.map((p) => p.handle));
    for (const e of boardEvents) {
      expect(Array.isArray(e.guests), `${e.id} has guests`).toBe(true);
      for (const h of e.guests) expect(handles.has(h), `${e.id} → ${h}`).toBe(true);
    }
  });

  test('every event carries when, where and a blurb', () => {
    for (const e of boardEvents) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.time).toBeTruthy();
      expect(e.venue).toBeTruthy();
      expect(e.blurb.length).toBeGreaterThan(20);
    }
  });

  test('one event is sold out, so the state is real and not theoretical', () => {
    expect(boardEvents.some((e) => e.seatsLeft === 0)).toBe(true);
  });
});
