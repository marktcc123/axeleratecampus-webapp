import { test, expect } from '@playwright/test';

// The admin console redirects to /me unless the session is unlocked, so every
// sweep below would test the profile instead of the panel it names. This is the
// same key src/app/admin/gate.jsx writes — and it is a preview lock, not
// security, so there is nothing here a test is circumventing.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('ax-admin-unlocked', '1'); } catch { /* ignore */ }
  });
});

// The marketing site is dormant (see src/App.jsx) — its routes are gone.
const ROUTES = [
  '/', '/verify', '/login',
  '/app/earn', '/app/earn/dermabell-campus-launch', '/app/earn/brands/notely',
  '/app/discover', '/app/discover/p1', '/app/cart', '/app/unlock', '/app/me',
  // Every Me sub-screen. They were missing from this list, which is how a
  // wallet whose figure block had lost its layout shipped unnoticed: the
  // overflow, touch-target and contrast sweeps below all read from here.
  '/app/me/levels', '/app/me/wallet', '/app/me/orders', '/app/me/syndicate', '/app/me/co-creations',
  '/app/me/tickets', '/app/me/tickets/2026-09-19', '/app/me/invite', '/app/me/career',
  '/app/me/profilesetting', '/app/me/inbox',
  // Every console panel. They join this list rather than getting a sweep of
  // their own so the touch-target and contrast passes below cover them too.
  '/app/me/admin/analytics', '/app/me/admin/brands', '/app/me/admin/missions', '/app/me/admin/shop',
  '/app/me/admin/tasks', '/app/me/admin/ugc', '/app/me/admin/gigs',
  '/app/me/admin/events', '/app/me/admin/withdrawals', '/app/me/admin/campuses',
  '/app/me/admin/career', '/app/me/admin/cashback',
  '/legal/terms', '/legal/privacy', '/legal/payouts',
  '/definitely-not-a-page',
  '/app/earn/events/ev3', '/u/marktao',
];
const WIDTHS = [320, 375, 414, 768, 1024, 1280];

// The test this project exists for. Horizontal overflow is the canonical
// responsive regression and the one eyeballing misses most reliably.
for (const route of ROUTES) {
  for (const width of WIDTHS) {
    test(`no horizontal overflow: ${route} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${route} overflows by ${scrollWidth - clientWidth}px at ${width}`).toBeLessThanOrEqual(clientWidth);
    });
  }
}

test('token layer resolves per tier', async ({ page }) => {
  // Resolved through a real element rather than read off :root, so this asserts
  // the size a reader actually gets. The tokens are rem; comparing raw strings
  // would only re-state the stylesheet.
  const px = (prop) => page.evaluate((p) => {
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;font-size:var(${p})`;
    document.body.appendChild(probe);
    const v = getComputedStyle(probe).fontSize;
    probe.remove();
    return v;
  }, prop);

  for (const [w, expected] of [[375, '40px'], [800, '50px'], [1280, '60px']]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('/');
    expect(await px('--text-5xl'), `--text-5xl at ${w}`).toBe(expected);
  }
});

test('the type scale never runs backwards at any viewport', async ({ page }) => {
  // --text-xl is not in the responsive override layer, so it used to sit ABOVE
  // --text-2xl on phones: a scale that shrank as it climbed.
  const RUNGS = ['--text-3xs', '--text-xs', '--text-sm', '--text-lg', '--text-xl',
    '--text-2xl', '--text-3xl', '--text-4xl', '--text-5xl', '--text-6xl'];
  for (const w of [320, 390, 800, 1280]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('/');
    const sizes = await page.evaluate((rungs) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden';
      document.body.appendChild(probe);
      const out = rungs.map((r) => {
        probe.style.fontSize = `var(${r})`;
        return parseFloat(getComputedStyle(probe).fontSize);
      });
      probe.remove();
      return out;
    }, RUNGS);

    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i], `${RUNGS[i]} (${sizes[i]}px) must exceed ${RUNGS[i - 1]} (${sizes[i - 1]}px) at ${w}px`)
        .toBeGreaterThan(sizes[i - 1]);
    }
    expect(sizes[0], `--text-3xs must resolve at ${w}px`).toBeGreaterThan(0);
  }
});





test('the app tab bar switches screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/app/earn');
  const bar = page.getByRole('navigation', { name: 'App' });
  await expect(bar).toBeVisible();
  for (const [label, heading] of [['Discover', 'Discover'], ['Demand', 'My Demand'], ['Profile', 'Your name']]) {
    await bar.getByRole('link', { name: label }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
  }
  await bar.getByRole('link', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: 'What do you want next?' })).toBeVisible();
});

test('a mission tile opens detail and back returns to the board', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/app/earn');
  // Scoped to the mission tiles. The events row sits above the missions and
  // its cards became links in Task 6, so a bare link named /Solra/ matches
  // ev3's "Solra sampling shift" card first and lands on /app/earn/events/ev3.
  await page.getByTestId('mission-tile').filter({ hasText: /Solra/ }).first().click();
  await expect(page).toHaveURL(/\/app\/earn\/[a-z-]+$/);
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/app\/earn$/);
});

test('Apply opens the sheet and sends nothing', async ({ page }) => {
  const calls = [];
  page.on('request', (r) => { if (['fetch', 'xhr'].includes(r.resourceType())) calls.push(r.url()); });
  await page.setViewportSize({ width: 375, height: 800 });
  // An in-reach mission: Dermabell now sits above the student's level and
  // shows its distance where Apply used to be.
  await page.goto('/app/earn/solra-unboxing-reel');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('dialog', { name: 'Apply' })).toBeVisible();
  expect(calls, 'no fetch/xhr should fire').toEqual([]);
});

test('a mission above the level shows its distance instead of Apply', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/app/earn/dermabell-campus-launch');
  await expect(page.getByRole('button', { name: 'Apply' })).toHaveCount(0);
  await expect(page.locator('.gd__locked')).toContainText(/LV\.4 · [\d,]+ XP away/);
});

test('@guard no bottom bar covers the last content element at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of ['/app/earn', '/app/discover', '/app/discover/p1', '/app/cart', '/app/unlock', '/app/me',
    '/app/me/levels', '/app/me/wallet', '/app/me/orders', '/app/me/syndicate',
    '/app/me/co-creations', '/app/me/tickets', '/app/me/invite', '/app/me/career', '/app/me/profilesetting',
    '/app/me/admin',
    // The two screens this branch added. /user/:handle sits outside the shell,
    // so there is no bar there to cover anything — handled below rather than
    // left off the list, because "no tab bar" is itself the thing to hold.
    '/app/earn/events/ev3', '/u/marktao',
    // The two screens whose own bar took the tab bar's place on 2026-09-02.
    '/app/earn/solra-unboxing-reel',
  ]) {
    await page.goto(route);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const box = await page.evaluate(() => {
      const col = document.querySelector('.app__col');
      // Whichever bar owns the bottom here. Three screens swap the tab bar for
      // one of their own — the shop's buy bar, the mission page's apply bar,
      // the event page's seat bar — and this only looked for `.app__tabs`, so
      // /app/discover/p1 fell into the "no tab bar" branch below and its buy bar
      // was never checked for covering anything.
      const bar = document.querySelector('.app__tabs, .pd__bar, .gd__bar, .edp__bar');
      if (!col || !bar) return null;
      return {
        contentBottom: col.lastElementChild.getBoundingClientRect().bottom,
        barTop: bar.getBoundingClientRect().top,
      };
    });
    if (!box) {
      // Outside the app shell on purpose (src/App.jsx): a visitor with no
      // account gets no bottom bar at all. If the route is ever moved inside
      // the shell this stops being true and the occlusion check above starts
      // running.
      await expect(
        page.locator('.app__tabs, .pd__bar, .gd__bar, .edp__bar'),
        `${route}: expected no bottom bar`,
      ).toHaveCount(0);
      continue;
    }
    expect(box.contentBottom, `${route}: content runs under the bottom bar`)
      .toBeLessThanOrEqual(box.barTop);
  }
});

test('the app shell has no grid-paper ground', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/app/earn');
  const bg = await page.evaluate(
    () => getComputedStyle(document.querySelector('.app')).backgroundImage
  );
  expect(bg, 'the grid paper was removed by request').toBe('none');
});

test('a first visit to / is sent to the intro, which hands over to the gate', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  // Four screens before the gate (owner, 2026-09-21), and no app chrome on any
  // of them: you are not in the app, or even signed up.
  for (const head of [/Discover\. Earn\./, /Get paid to work with brands\./,
    /Every mission moves you forward\./, /Do more\. Unlock more\./]) {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(head);
    await expect(page.getByRole('navigation', { name: 'App' })).toHaveCount(0);
    await page.locator('.ob__next').click();
  }
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Join the squad' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'App' })).toHaveCount(0);
});

test('once seen, / is the gate, and /onboarding still answers on its own', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Skip' }).click();
  await expect(page).toHaveURL(/\/$/);
  // It records itself on arrival, not on finishing: a student who closes the
  // tab mid-tour has still seen it — so this second visit is the gate.
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Join the squad' })).toBeVisible();
  // The intro keeps the demo's own address and can be opened on purpose.
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Discover\. Earn\./);
});

test('the gate leads through verification into the app', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  // A fresh browser would be sent to the intro; this is about the gate itself.
  await page.goto('/onboarding');
  await page.getByRole('link', { name: 'Skip' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Join the squad' }).click();
  await expect(page).toHaveURL(/\/verify$/);
  await page.getByLabel('School email').fill('mark@ucla.edu');
  await page.getByLabel('Name').fill('Mark');
  await page.getByRole('button', { name: 'Get verified' }).click();
  await expect(page).toHaveURL(/\/app\/earn$/);
  await expect(page.getByRole('heading', { name: 'Missions' })).toBeVisible();
});

test('the dormant marketing site is unreachable', async ({ page }) => {
  for (const path of ['/for-brands', '/join']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/isn't here/);
  }
});

test('@guard every control clears the 44px touch floor', async ({ page }) => {
  // The chips shipped at 22px and the format tabs at 39px, on a product that
  // only renders to phones. This is the guard against that coming back, and
  // it covers the whole app rather than one screen.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/verify', '/login', '/app/earn', '/app/earn/solra-unboxing-reel',
    '/app/discover', '/app/discover/p1', '/app/cart', '/app/unlock', '/app/me',
    '/app/me/levels', '/app/me/wallet', '/app/me/orders', '/app/me/syndicate',
    '/app/me/co-creations', '/app/me/tickets', '/app/me/invite', '/app/me/career', '/app/me/profilesetting',
    '/app/me/admin',
    // ev3 has more than six guests, so the grid's "See all 7" is in this
    // sweep too — it was hand-measured at 55.5x44, right on the floor.
    '/app/earn/events/ev3', '/u/marktao',
    // The two screens whose own bar took the tab bar's place on 2026-09-02.
    '/app/earn/solra-unboxing-reel',
  ]) {
    await page.goto(route);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a, input, select, [role="tab"]')]
        .map((n) => ({ n, r: n.getBoundingClientRect() }))
        .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
        // A control under visibility: hidden cannot be tapped, so it has no
        // target to measure — the shop's folded search field is one: 0 wide,
        // but its own padding still gives the <input> a 24px box.
        .filter(({ n }) => getComputedStyle(n).visibility !== 'hidden')
        // WCAG 2.5.8 exempts a target "in a sentence or block of text". An
        // anchor whose parent carries prose of its own is one of those, and
        // padding it to 44px would break the line box it sits in.
        .filter(({ n }) => !(n.tagName === 'A' && n.parentElement
          && n.parentElement.textContent.trim() !== n.textContent.trim()))
        .map(({ n, r }) => `${n.tagName.toLowerCase()}.${n.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
    );
    expect(small, `controls under 44x44 on ${route}`).toEqual([]);
  }
});

test('the tab bar names its destinations in visible text', async ({ page }) => {
  // The labels were in the DOM but clip-path'd away, so sighted users got four
  // unlabelled icons — bag and checklist are not guessable.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/earn');
  const bar = page.getByRole('navigation', { name: 'App' });
  for (const label of ['Home', 'Discover', 'Demand', 'Profile']) {
    await expect(bar.getByText(label, { exact: true })).toBeVisible();
  }
});

test('@guard the tab bar fits the narrowest supported viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/app/earn');
  const fits = await page.evaluate(() => {
    const r = document.querySelector('.app__tabs').getBoundingClientRect();
    return r.left >= 0 && r.right <= window.innerWidth;
  });
  expect(fits, 'tab bar overflows at 320px').toBe(true);
});

test('filtering to nothing shows a way back instead of a blank panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/earn');
  // Physical missions are all either under $25 or over an hour.
  await page.getByRole('tab', { name: /Physical/ }).click();
  await page.getByRole('button', { name: '$25+', exact: true }).click();
  await page.getByRole('button', { name: 'Under 1 hr', exact: true }).click();
  await expect(page.getByTestId('mission-tile')).toHaveCount(0);
  await expect(page.locator('#gigs-grid')).toContainText('No missions match');
  await expect(page.locator('#gigs-grid')).toContainText('Physical, $25+ and Under 1 hr are on');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByTestId('mission-tile')).toHaveCount(8);   // the fixture's eight (2026-09-21)
});

test('@guard every screen holds WCAG AA on every text run', async ({ page }) => {
  // PRODUCT.md sets AA as the target. This walks every element that owns a text
  // node, resolves its first painted ancestor background, and picks the 3:1 or
  // 4.5:1 threshold from the rendered size and weight. Written as a sweep
  // rather than a selector list because the list is what let --warning-fg
  // (3.36:1, on the preview marker, on every screen) go unnoticed.
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ROUTES.filter((r) => r !== '/nope')) {
    await page.goto(route);
    const failures = await page.evaluate(() => {
      const lum = (s) => {
        const m = s.match(/[\d.]+/g);
        if (!m) return 0;
        const [r, g, b] = m.slice(0, 3).map(Number).map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const bgOf = (n) => {
        for (let e = n; e; e = e.parentElement) {
          const c = getComputedStyle(e).backgroundColor;
          if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
        }
        return 'rgb(255,255,255)';
      };
      const out = [];
      for (const n of document.querySelectorAll('p,h1,h2,h3,h4,span,div,li,a,button,strong')) {
        if (![...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
        const cs = getComputedStyle(n);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
        // WCAG 1.4.3 exempts "an inactive user interface component" by name, and
        // a disabled control that clears 4.5:1 does not read as disabled. This
        // is the spec's own carve-out, not a waiver: everything enabled still
        // has to pass, including the same button once it is usable.
        if (n.disabled || n.closest('[disabled]')) continue;
        if (n.getBoundingClientRect().width < 2) continue;
        const L1 = lum(cs.color);
        const L2 = lum(bgOf(n));
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const px = parseFloat(cs.fontSize);
        const need = px >= 18 || (parseInt(cs.fontWeight, 10) >= 700 && px >= 14) ? 3 : 4.5;
        const cls = (n.className || '').toString().split(' ')[0];
        // Named exemptions, expressed as colours rather than a class list so
        // they do not need maintaining. All three are the same owner decision,
        // made three times: the loud accent over the legible darker one, on the
        // quest card and the application folders.
        //
        //   rgb(229,35,126) = #E5237E, the pre-retune brand pink. White on it
        //   is 4.31:1, 0.19 short of what text under 18px needs.
        //
        //   rgb(222,92,150) = #DE5C96, --accent-pink after the six-hue retune.
        //   White on it is 3.46:1. The card's 20.9px/800 title clears the 3:1
        //   large-text bar; its 9.5px caps label and 14.3px body do not, and
        //   are 1.04 short. Asked for explicitly on 2026-08-31 after seeing the
        //   darker fill, which passed at 4.84:1 and read as too dull.
        //
        //   rgb(242,84,45) = #F2542D, --accent-coral, on the quest deck's second
        //   card. White on it is 3.45:1 — the same shortfall as the pink, and
        //   for the same structural reason: both accents sit at luminance 0.254
        //   and white needs a ground at or below 0.183, so no opacity or weight
        //   tweak can rescue small text on them. The 17px/800 title and reward
        //   clear the 3:1 large-text bar; the 10px caps label and 14px body are
        //   1.05 short. Asked for explicitly on 2026-09-01, having been shown
        //   --red-700 at 5.99:1 and ink at 5.32:1 as the passing alternatives.
        //
        // Recorded here rather than waved through, so the cost stays visible
        // and every other surface stays covered. This is a list of GROUNDS the
        // owner has signed off, not a licence for new ones: anything else that
        // drops below its threshold still fails this sweep.
        const EXEMPT_GROUNDS = new Set([
          'rgb(229,35,126)',
          'rgb(222,92,150)',
          'rgb(242,84,45)',
        ]);
        const exempt = EXEMPT_GROUNDS.has(bgOf(n).replace(/\s/g, ''));
        if (ratio < need && !exempt) {
          out.push(`${cls || n.tagName.toLowerCase()} ${ratio.toFixed(2)}:1 (${px}px, needs ${need})`);
        }
      }
      return [...new Set(out)];
    });
    expect(failures, `text below WCAG AA on ${route}`).toEqual([]);
  }
});

// The routes above load /cart cold, which means empty — so the sweeps never
// see a cart line, its steppers or its summary. These fill it first.

const fillCart = async (page, n) => {
  await page.goto('/app/shop');
  const adds = page.getByRole('button', { name: /^Add / });
  for (let i = 0; i < n; i++) await adds.nth(i).click();
  await page.getByRole('link', { name: /^Cart/ }).click();
  await expect(page.getByTestId('cart-line')).toHaveCount(n);
};

test('a filled cart clears the touch floor and stays inside the viewport', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await fillCart(page, 3);

    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a, input, select, [role="tab"]')]
        .map((n) => ({ n, r: n.getBoundingClientRect() }))
        .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
        .filter(({ n }) => !(n.tagName === 'A' && n.parentElement
          && n.parentElement.textContent.trim() !== n.textContent.trim()))
        .map(({ n, r }) => `${n.tagName.toLowerCase()}.${n.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
    );
    expect(small, `controls under 44x44 in a filled cart at ${width}px`).toEqual([]);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `filled cart overflows at ${width}px`).toBeLessThanOrEqual(clientWidth);
  }
});

test('the tab bar stays centred and still, whatever the cart is doing', async ({ page }) => {
  // It used to be laid out in a flex group with the floating cart button, which
  // pushed it off centre the moment the cart appeared. The cart moved into the
  // header on 2026-09-21 and that button is gone, so the bar now has nothing at
  // the foot to share the line with — asserted rather than deleted, because the
  // bar being centred is the promise, whatever else is on the screen.
  for (const width of [320, 360, 390, 414]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.cart-fab')).toHaveCount(0);

    await page.goto('/app/earn');
    const bare = await page.locator('.app__tabs').boundingBox();

    await page.goto('/app/shop');
    await page.getByRole('button', { name: /^Add / }).first().click();
    const withCart = await page.locator('.app__tabs').boundingBox();

    expect(withCart.x, `bar moved when the cart filled at ${width}px`).toBeCloseTo(bare.x, 1);
    expect(withCart.y, `bar moved when the cart filled at ${width}px`).toBeCloseTo(bare.y, 1);
    expect(withCart.x + withCart.width / 2, `bar off centre at ${width}px`).toBeCloseTo(width / 2, 1);
  }
});

test('demand tabs carry no empty cart, and the header stays clear of the bar', async ({ page }) => {
  for (const width of [320, 360, 390, 414]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/app', '/app/discover', '/app/me/demand', '/app/me']) {
      await page.goto(path);
      await expect(page.getByTestId('header-cart'), `${path} at ${width}px`).toHaveCount(0);
      const account = page.getByTestId('account');
      await expect(account).toBeVisible();
      const box = await account.boundingBox();
      const bar = await page.locator('.app__tabs').boundingBox();
      expect(box.width, `account target at ${width}px`).toBeGreaterThanOrEqual(44);
      expect(box.y + box.height, `header overlaps the tab bar at ${width}px on ${path}`).toBeLessThan(bar.y);
    }
  }
});

// Checkout is three questions: how you are paying, how the wallet's two
// balances split it, and where it goes. The fixture's saved address is empty,
// so the last step is always the forced-entry branch here. The split slider
// opens on a payable split, so Continue is enough.
async function walkCheckout(page, { method = 'wallet' } = {}) {
  await page.getByRole('button', { name: /Check out/ }).click();
  await page.getByTestId(`pay-${method}`).click();
  if (method === 'wallet') await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Street address').fill('120 Waterman St');
  await page.getByLabel('City').fill('Providence');
  await page.getByLabel('State').fill('RI');
  await page.getByLabel('ZIP').fill('02912');
  await page.getByRole('button', { name: /Place order/ }).click();
}

test('the cart travels between tabs and checks out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/shop');
  const fab = page.getByRole('link', { name: /^Cart/ });
  await expect(fab).toHaveAccessibleName('Cart');            // empty, but present
  await page.getByRole('button', { name: /^Add / }).first().click();
  await expect(fab).toHaveAccessibleName('Cart · 1 item');

  const bar = page.getByRole('navigation', { name: 'App' });
  await bar.getByRole('link', { name: 'Home' }).click();
  await expect(fab, 'the cart follows onto Gigs now').toHaveAccessibleName('Cart · 1 item');
  await bar.getByRole('link', { name: 'Discover' }).click();
  await expect(fab, 'and the count survived the trip').toHaveAccessibleName('Cart · 1 item');

  await fab.click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole('button', { name: /One more/ }).click();
  await expect(page.getByTestId('cart-qty')).toHaveText('2');

  await walkCheckout(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Order in.');
  // The receipt is a sub-screen with its own header, so the row's cart is not
  // drawn over the thing it would have opened.
  await expect(fab, 'the receipt carries no cart').toHaveCount(0);
  await page.getByRole('link', { name: /Back to the shop/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Perks shop');
  // And back on a tab it is drawn again, naming the cart the order emptied.
  await expect(fab, 'an emptied cart says so').toHaveAccessibleName('Cart');
});

test('checkout sends nothing', async ({ page }) => {
  const calls = [];
  page.on('request', (r) => { if (['fetch', 'xhr'].includes(r.resourceType())) calls.push(r.url()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await fillCart(page, 1);
  await walkCheckout(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Order in.');
  expect(calls, 'no fetch/xhr should fire').toEqual([]);
});

// The checkout sheet is a surface the route sweeps never see: they visit URLs,
// and this one only exists once a button is pressed. Every step gets the same
// two checks the rest of the app gets on every route.
test('@guard the checkout sheet clears the touch floor and stays in the viewport', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await fillCart(page, 1);
    await page.getByRole('button', { name: /Check out/ }).click();

    const steps = [
      () => page.getByTestId('pay-wallet').click(),
      () => page.getByRole('button', { name: 'Continue' }).click(),
      null,
    ];
    for (const [i, advance] of steps.entries()) {
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('.cos button, .cos a, .cos input')]
          .map((n) => ({ n, r: n.getBoundingClientRect() }))
          .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
          .map(({ n, r }) => `${n.tagName.toLowerCase()}.${n.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
      );
      expect(small, `sheet controls under 44x44 at ${width}px, step ${i + 1}`).toEqual([]);

      const box = await page.evaluate(() => {
        const el = document.querySelector('.cos');
        const r = el.getBoundingClientRect();
        return {
          overflowX: el.scrollWidth - el.clientWidth,
          offLeft: Math.round(r.left) < 0,
          offRight: Math.round(r.right) > window.innerWidth,
          // 88vh is the cap; anything taller means the sheet cannot be read.
          tallerThanCap: r.height > window.innerHeight * 0.89,
        };
      });
      expect(box, `sheet geometry at ${width}px, step ${i + 1}`).toEqual({
        overflowX: 0, offLeft: false, offRight: false, tallerThanCap: false,
      });
      if (advance) await advance();
    }
  }
});

// /login/code is reached with the email in router state, never by URL, so the
// route sweeps above cannot visit it. Walk the door and check what they would.
test('@guard the code page clears the touch floor and stays in the viewport', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/login');
    await page.getByLabel('School email').fill('mark@ucla.edu');
    await page.getByRole('button', { name: /Send email/ }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, a, input')]
        .map((n) => ({ n, r: n.getBoundingClientRect() }))
        .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
        .map(({ n, r }) => `${n.tagName.toLowerCase()}.${n.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
    );
    expect(small, `controls under 44x44 at ${width}px`).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBe(0);
    await page.getByTestId('otp').fill('123456');
    await page.getByRole('button', { name: /Log in/ }).click();
    // Six digits open the app; where it lands is the board's URL, whatever its h1 says.
    await expect(page).toHaveURL(/\/app\/earn$/);
  }
});

// The cash-out sheet is flow-only, so the route sweeps never open it.
test('@guard the cash-out sheet clears the touch floor and stays in the viewport', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app/me/wallet');
    await page.getByRole('button', { name: 'Withdraw' }).click();
    await expect(page.getByRole('heading', { name: 'Cash out' })).toBeVisible();
    await page.getByRole('button', { name: /Add another/ }).click();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.wds button, .wds a, .wds input')]
        .map((n) => ({ n, r: n.getBoundingClientRect() }))
        .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
        .map(({ n, r }) => `${n.tagName.toLowerCase()}.${n.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
    );
    expect(small, `sheet controls under 44x44 at ${width}px`).toEqual([]);
    const box = await page.evaluate(() => { const el = document.querySelector('.wds'); const r = el.getBoundingClientRect();
      return { overflowX: el.scrollWidth - el.clientWidth, offRight: Math.round(r.right) > window.innerWidth }; });
    expect(box).toEqual({ overflowX: 0, offRight: false });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByTestId('speed-instant').click();
    await page.getByRole('button', { name: /^Withdraw \$/ }).click();
    await expect(page.getByRole('heading', { name: 'On its way' })).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('ledger-row').first()).toHaveAttribute('data-pending', 'true');
  }
});

// The shop's filter sheet is flow-only; give it the sweeps' two checks.
test('@guard the filter sheet clears the touch floor and stays in the viewport', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app/shop');
    await page.getByTestId('open-filters').click();
    await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.sfs button, .sfs a, .sfs input')]
        // The system's Checkbox is a 21px box inside a label that spans the
        // row; the label is the target, so it is the label that is measured.
        .map((n) => ({ n, r: (n.type === 'checkbox' && n.closest('label') ? n.closest('label') : n).getBoundingClientRect() }))
        .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
        .map(({ n, r }) => `${n.tagName.toLowerCase()}.${n.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
    );
    expect(small, `sheet controls under 44x44 at ${width}px`).toEqual([]);
    const box = await page.evaluate(() => { const el = document.querySelector('.sfs'); const r = el.getBoundingClientRect();
      return { overflowX: el.scrollWidth - el.clientWidth, offRight: Math.round(r.right) > window.innerWidth }; });
    expect(box).toEqual({ overflowX: 0, offRight: false });
    await page.getByRole('button', { name: 'Sold out' }).click();
    await page.getByTestId('filter-show').click();
    await expect(page.getByTestId('open-filters')).toContainText('1');
  }
});

test('@guard nothing on the perk detail overlaps its neighbour', async ({ page }) => {
  // The price row shipped broken once: the cashback span and the back link
  // were both called .pd__back, so the cashback inherited a 44x44 button box
  // with negative margins and sat on top of the price. Boxes, not pixels.
  //
  // That row is the buy bar now, and the bar is position:fixed — comparing a
  // fixed overlay against text in the flow reports whatever the scroll
  // position happens to put behind it. So this checks two GROUPS separately:
  // the page's own text among itself, and the bar's children among themselves.
  // Selectors have left this list twice (.pd__desc when the description went,
  // .pd__price and .pd__cashback when the bar took over), so a missing one is
  // reported rather than dereferenced — querySelector(...).getBoundingClientRect()
  // threw an opaque TypeError, and a list like this rots quietly otherwise.
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app/discover/p1');
    const hits = await page.evaluate(() => {
      const GROUPS = {
        page: ['.pd__brand', '.pd__title', '.pd__stock'],
        bar: ['.pd__bar-total', '.pd__bar-act'],
      };
      const bad = [];
      for (const [name, want] of Object.entries(GROUPS)) {
        const missing = want.filter((s) => !document.querySelector(s));
        if (missing.length) { bad.push(...missing.map((s) => `${s} is not on the page`)); continue; }
        const boxes = want.map((s) => ({ s, r: document.querySelector(s).getBoundingClientRect() }));
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i].r, b = boxes[j].r;
            if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
              bad.push(`${name}: ${boxes[i].s} over ${boxes[j].s}`);
            }
          }
        }
      }
      return bad;
    });
    expect(hits, `overlapping boxes at ${width}px`).toEqual([]);
  }
});

test('@guard the events carousel sits clear of the shop grid', async ({ page }) => {
  // The panel used to carry a -112px bottom margin so its cream band ran off
  // the bottom of the screen, and when Events landed underneath it the panel
  // drew over the first card. Events sits ABOVE the panel now, so the guard
  // flips: every card has to end before the panel begins.
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app/shop');
    // Events lead Discover now (2026-09-17); Brands is what sits under them.
    const panel = await page.locator('.shop__brands').boundingBox();
    const cards = await page.locator('[data-testid="board-event"]').all();
    expect(cards.length).toBeGreaterThan(0);
    for (const [i, c] of cards.entries()) {
      const r = await c.boundingBox();
      expect(r.y + r.height, `event card ${i} runs into the panel at ${width}px`)
        .toBeLessThanOrEqual(panel.y + 1);
    }
  }
});

test('@guard no element stacks its padding on an explicit height', async ({ page }) => {
  // min-height and height apply to the CONTENT box, so on a content-box element
  // they stack on top of vertical padding and the thing renders taller than it
  // was set. This bit four times in one day: a 44px tab rendering 73px, a 46px
  // row rendering 65, an event card overflowing its grid cell, and .sub__row /
  // .wal__row rendering 81px against a 56px intent. <button> escapes it because
  // browsers default form controls to border-box; divs, anchors and list items
  // do not, which is exactly why it keeps coming back.
  //
  // Checked on computed styles rather than in the stylesheet, because CSS alone
  // cannot tell whether .ft__tab is a button or a div.
  const ROUTES = ['/app/earn', '/app/discover', '/app/cart', '/app/unlock', '/app/me', '/app/me/levels',
    '/app/me/wallet', '/app/me/orders', '/app/me/tickets', '/app/me/invite', '/app/me/career',
    '/app/me/profilesetting', '/app/me/inbox', '/app/me/admin/analytics', '/app/me/admin/tasks',
    '/app/me/admin/withdrawals', '/app/me/admin/career',
    // Both screens this branch added. This list is the memory of a bug that
    // shipped four times in one day, so a new screen belongs in it on the day
    // it lands: .pp and .gg__more both set min-height alongside padding.
    '/app/earn/events/ev3', '/user/marktao'];
  await page.setViewportSize({ width: 390, height: 900 });
  const offenders = [];
  for (const route of ROUTES) {
    await page.goto(route);
    const hits = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.boxSizing !== 'content-box') continue;
        const padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
        if (padV === 0) continue;
        const min = cs.minHeight;
        if (!min || min === '0px' || min === 'auto') continue;
        const cls = (el.className || '').toString().trim().split(/\s+/)[0] || '(no class)';
        out.push(`${el.tagName.toLowerCase()}.${cls} min-height:${min} + ${padV}px padding = ${Math.round(el.getBoundingClientRect().height)}px`);
      }
      return [...new Set(out)];
    });
    for (const h of hits) offenders.push(`${route} — ${h}`);
  }
  expect([...new Set(offenders)], 'add box-sizing: border-box to these').toEqual([]);
});

test('@guard the orders list is a row, not a stack of full-width photos', async ({ page }) => {
  // The row rule was scoped under .ord — a class the rewrite deleted — so it
  // matched nothing, the link never became a flex container, and the inline
  // spans inside it let each photo grow to the full column width. Unit tests
  // cannot see this: jsdom does not do layout.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/me/orders');
  const rows = await page.locator('.ord__row').all();
  expect(rows.length).toBeGreaterThan(0);
  for (const [i, r] of rows.entries()) {
    const box = await r.boundingBox();
    expect(box.height, `order row ${i} is too tall to be a row`).toBeLessThan(120);
    const photo = await r.locator('.ord__photo').boundingBox();
    expect(photo.width, `order photo ${i} is not its drawn size`).toBeLessThanOrEqual(60);
    expect(photo.height, `order photo ${i} is not its drawn size`).toBeLessThanOrEqual(60);
  }
});

test('@guard nothing on the application screen casts a blurred shadow', async ({ page }) => {
  // Every shadow in the design system is a hard offset (--shadow-paper is
  // 2px 3px 0). A blurred one reads as borrowed from another language.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/me/missions');
  const blurred = await page.evaluate(() =>
    [...document.querySelectorAll('.apps *, .apps')]
      .map((n) => ({ n, s: getComputedStyle(n).boxShadow }))
      .filter(({ s }) => s && s !== 'none')
      // "rgba(...) 0px -2px 0px" — the third length is the blur radius.
      .filter(({ s }) => !/(^|\s)(-?\d+px)\s+(-?\d+px)\s+0px/.test(s))
      .map(({ n, s }) => `${n.className || n.tagName}: ${s}`));
  expect(blurred, 'blurred shadows on the application screen').toEqual([]);
});

test('@guard the admin tab strip scrolls instead of overflowing the column', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/app/me/admin/analytics');
  const strip = page.locator('.adm__tabs');
  const box = await strip.boundingBox();
  expect(box.width, 'the strip stays inside the viewport').toBeLessThanOrEqual(320);
  // And it must actually be scrollable rather than clipped: nine tabs cannot
  // fit, so a strip that is not scrollable is a strip hiding destinations.
  const [scrollW, clientW] = await strip.evaluate((el) => [el.scrollWidth, el.clientWidth]);
  expect(scrollW, 'nine tabs scroll').toBeGreaterThan(clientW);
});

test('@guard a console dialog is modal — the tab bar does not paint over it', async ({ page }) => {
  // .adm__panel used to carry z-index 1, which opened a stacking context the
  // dialog inside it could not leave: the app's tab bar (z 40) painted over the
  // dialog's footer and Publish was unclickable on a phone. The button's own
  // centre is a weak probe (it sits a few pixels clear of the bar), so this
  // asks the question directly — with a modal open, whatever is at the tab
  // bar's own centre must belong to the dialog, not to the bar.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [slug, open] of [
    ['brands', 'Add brand'], ['missions', 'Add mission'], ['shop', 'Add product'], ['events', 'Add event'],
  ]) {
    await page.goto(`/app/me/admin/${slug}`);
    await page.getByRole('button', { name: open }).click();
    await expect(page.getByTestId('catalogue-save')).toBeVisible();
    const covered = await page.evaluate(() => {
      const bar = document.querySelector('nav.app__tabs').getBoundingClientRect();
      const hit = document.elementFromPoint(bar.x + bar.width / 2, bar.y + bar.height / 2);
      return { tag: hit.tagName + '.' + hit.className, inDialog: !!hit.closest('.ax-dialog-overlay') };
    });
    expect(covered.inDialog, `${slug}: the tab bar's centre belongs to ${covered.tag}`).toBe(true);
  }
});

test('@guard no admin shadow carries a blur', async ({ page }) => {
  await page.goto('/app/me/admin/analytics');
  const blurred = await page.evaluate(() => [...document.querySelectorAll('.adm, .adm *')]
    .map((el) => getComputedStyle(el).boxShadow)
    .filter((s) => s && s !== 'none')
    .filter((s) => {
      const m = s.match(/(-?\d+(?:\.\d+)?)px/g);
      return m && m.length >= 3 && parseFloat(m[2]) > 0;
    }));
  expect(blurred, 'every shadow in this system is a hard offset').toEqual([]);
});

test('@guard Analytics plots, and plots honestly', async ({ page }) => {
  await page.goto('/app/me/admin/analytics');
  // The console is the one place in this app that plots — an exception the
  // owner made deliberately, because an operator needs density where the
  // student-facing product needs charm.
  expect(await page.locator('.adm-lc__svg polyline').count()).toBe(2);
  expect(await page.locator('.adm-dn__svg circle').count()).toBeGreaterThan(0);

  // ONE y axis. Both series are in dollars, so a second scale would invent a
  // crossing point. Every y tick label must carry a dollar sign.
  const ticks = await page.locator('.adm-lc__svg text').allTextContents();
  const yTicks = ticks.filter((t) => t.includes('$'));
  expect(yTicks.length).toBeGreaterThan(2);
  expect(yTicks.every((t) => t.startsWith('$'))).toBe(true);

  // Every table on the screen is the charts' accessible fallback, never a
  // visible data grid. Asserted by class rather than with not.toBeVisible():
  // .sr-only clips to a 1px box, which Playwright still counts as visible.
  // The sr-only class sits on a WRAPPER, not on the table: width:1px is only a
  // minimum on a display:table box, so a table wearing it stayed 388px wide.
  expect(await page.locator('.adm table').count()).toBeGreaterThan(0);
  expect(await page.locator('.adm .sr-only table').count())
    .toBe(await page.locator('.adm table').count());
  const clipped = await page.locator('.adm .sr-only').first().evaluate(
    (el) => el.getBoundingClientRect().width <= 1,
  );
  expect(clipped, 'the data table is clipped out of the layout').toBe(true);
});

test('@guard no chart bucket is shorter than its neighbours', async ({ page }) => {
  // A short trailing bucket drawn as an equal point reads as a crash: a 2-day
  // tail next to full weeks made revenue look like it fell off a cliff.
  await page.goto('/app/me/admin/analytics');
  for (const label of ['7d', '30d', '90d']) {
    await page.getByRole('button', { name: label }).click();
    const sub = await page.locator('.adm-ch__sub').first().textContent();
    expect(sub, label).toMatch(/(daily|\d+-day) totals/);
    const points = await page.locator('.adm-lc__svg circle').count();
    expect(points % 2, `${label} draws whole buckets`).toBe(0);
    expect(points / 2).toBeLessThanOrEqual(7);
  }
});

test('@guard every Featured foot sits on the card floor, however long the title', async ({ page }) => {
  // The pay and the XP are the last line of every Featured card (owner,
  // 2026-09-22): a one-line title must not pull them up and leave the floor
  // empty while the card beside it, with a two-line title, has its foot lower.
  // The cards in the row are one height already (flex stretch); this pins the
  // foot to that height.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/earn');
  const cards = page.locator('[data-testid="today-tile"]');
  await expect(cards.first()).toBeVisible();
  const n = await cards.count();
  expect(n).toBeGreaterThan(1);
  const gaps = [];
  for (let i = 0; i < n; i++) {
    const c = await cards.nth(i).boundingBox();
    const f = await cards.nth(i).locator('.ph__foot').boundingBox();
    gaps.push(Math.round(c.y + c.height - (f.y + f.height)));
  }
  // The same foot-to-floor distance on every card: the card's own padding.
  expect(new Set(gaps).size, `foot-to-floor gaps: ${gaps.join(', ')}`).toBe(1);
});

test('@guard the public profile asks not to be indexed, and the app does not', async ({ page }) => {
  await page.goto('/u/marktao');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  // The tag must not survive the route: this is one HTML document served for
  // every path, so a tag left behind would de-index the whole product.
  //
  // Left client-side deliberately. This used to page.goto('/app/earn'), which
  // is a full document load — index.html is re-served, so the count is 0
  // whether or not useNoIndex removes anything, and deleting its cleanup left
  // the test green. Clicking the wordmark is a router navigation: the document
  // stays, and the only thing that can take the tag out is the cleanup.
  await page.getByRole('button', { name: 'Back' }).click();   // the wordmark link is gone; Back with no history goes to the start
  // A stranger has not seen the intro, so the start sends them there
  // (2026-09-21). Still one document, which is the point of this test.
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('the profile goes back in-app when it can, and to the start when it cannot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/earn/events/ev1');
  await page.getByTestId('guest').first().click();
  await expect(page).toHaveURL(/\/u\/[a-z]+$/);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/app\/earn\/events\/ev1$/);

  // A cold arrival — a shared link, a fresh document — has no in-app entry
  // behind it, so back must not step out of the site. It goes to the start.
  await page.goto('/u/marktao');
  await page.getByRole('button', { name: 'Back' }).click();
  // Back goes to /, and / hands a stranger — who has not seen the intro — the
  // intro (2026-09-21). Either way it stays on this site.
  await expect(page).toHaveURL(/127\.0\.0\.1:4173\/onboarding$/);
});

test('@guard a public profile shows no money', async ({ page }) => {
  await page.goto('/u/marktao');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/\$|USD|earned|payout/i);
});

test('@guard a mission opened from a scrolled board starts at its top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/earn');
  // An unlocked tile: a locked one is not a link. The Card IS the link's child,
  // so the tile itself is what takes the click.
  const tile = page.locator('[data-testid="mission-tile"][data-locked="false"]').first();
  await tile.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 200));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await tile.click();
  await page.waitForURL(/\/app\/earn\/[a-z-]+$/);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

// The seat sheet is flow-only; give it the sweeps' two checks.
test('@guard the seat sheet clears the touch floor and stays in the viewport', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app/earn/events/ev1');
    await page.getByRole('button', { name: 'Save me a seat' }).click();
    await expect(page.getByRole('heading', { name: 'Save me a seat' })).toBeVisible();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.ats button, .ats a, .ats input, .ats textarea')]
        .map((n) => ({ n, r: n.getBoundingClientRect() }))
        .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
        .map(({ n, r }) => `${n.tagName.toLowerCase()}.${n.className} ${Math.round(r.width)}x${Math.round(r.height)}`)
    );
    expect(small, `seat sheet controls under 44x44 at ${width}px`).toEqual([]);
    const box = await page.evaluate(() => { const el = document.querySelector('.ats'); const r = el.getBoundingClientRect();
      return { overflowX: el.scrollWidth - el.clientWidth, offRight: Math.round(r.right) > window.innerWidth }; });
    expect(box).toEqual({ overflowX: 0, offRight: false });
    // A blank name is refused, so the guard fills one before it expects a pass.
    await page.getByTestId('attend-submit').click();
    await expect(page.getByText('We need a name for the door.')).toBeVisible();
    await page.getByTestId('attend-name').fill('Mark Tao');
    await page.getByTestId('attend-submit').click();
    await expect(page.getByTestId('see-pass')).toBeVisible();
  }
});

// The tracker's folders animated a capped `max-height: 260px`, which cut the
// brief and its "Open the mission" link off at 150% text and above. The panel
// is a 0fr -> 1fr grid track now; this holds it open to its content at 200%.
test('@guard an open tracker folder shows all of its brief at 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/app/me/missions');
  await page.addStyleTag({ content: 'html{font-size:32px}' });
  await page.locator('.af__head').first().click();
  await page.waitForTimeout(500);
  const panel = page.locator('.af__body').first();
  await expect(panel).toHaveAttribute('data-open', 'true');
  const fit = await page.evaluate(() => {
    const body = document.querySelector('.af__body');
    const inner = body.querySelector('.af__body-inner');
    return { shown: Math.round(body.getBoundingClientRect().height), content: Math.ceil(inner.scrollHeight) };
  });
  expect(fit.content - fit.shown, 'the brief is cut off at 200% text').toBeLessThanOrEqual(1);
  await expect(page.locator('.af__body').first().getByRole('link', { name: /Open the mission/ })).toBeVisible();
});
