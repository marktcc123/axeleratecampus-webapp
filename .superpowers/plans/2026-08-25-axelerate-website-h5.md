# Axelerate Website (H5 / fully responsive) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the static core of Axelerate's public website — `/`, `/for-brands`, `/join`, `/legal/terms|privacy|payouts` — fully responsive from 320px to 1280px+, on the published design system, with no backend.

**Architecture:** Vite + React 18 SPA consuming `axelerate-design-system` as a git dependency, never editing it. Responsiveness comes from a **token override layer** (`src/styles/responsive.css`) loaded after the system's `styles.css`: both target `:root`, so ours wins on source order and redefines nine typographic/spacing tokens across three tiers. Content, audience, and copy come from the owner's product spec; only visual language and voice mechanics come from the design system. Two deliberate seams — `submitJoin()` and the flat missions fixture — are shaped for the Supabase/Shopify backends the owner will connect later.

**Tech Stack:** Node 20+, Vite, React 18, react-router-dom 6, Vitest + Testing Library + jsdom, Playwright. Zero runtime dependencies beyond React, the router, and the design system.

**Spec:** `.superpowers/specs/2026-08-25-axelerate-website-h5-design.md` (design). `.superpowers/specs/2026-08-25-axelerate-product-specification.md` (content authority — a text conversion of the owner's `.docx`; section numbers like §4.1 and rules like R8 refer to it).

## Global Constraints

- **Repo root:** `/Users/carriewang/axelerate-website-h5` (git initialised, branch `main`, 3 commits of specs). Spec and plan files under `.superpowers/` are tracked; nothing else exists yet.
- **Never edit the design system.** It is consumed from `node_modules/axelerate-design-system`. No file there is modified, no component CSS is overridden (`spec §3.3`). Layout problems are solved in the app's own containers and the token layer.
- **Stylesheet order in `src/main.jsx` is load-bearing:** `axelerate-design-system/styles.css` first, `./styles/responsive.css` second, nothing else. A test asserts it.
- **Token override values (spec §3.2), exact:**

  | Token | base ≤640 | md 641–1024 | lg ≥1025 |
  | --- | --- | --- | --- |
  | `--text-6xl` | 44px | 60px | 80px |
  | `--text-5xl` | 34px | 46px | 60px |
  | `--text-4xl` | 28px | 36px | 46px |
  | `--text-3xl` | 24px | 30px | 36px |
  | `--text-2xl` | 20px | 24px | 28px |
  | `--container-max` | 100% | 100% | 1160px |
  | `--gutter` | 20px | 32px | 24px |
  | `--space-4xl` | 56px | 72px | 96px |
  | `--space-3xl` | 40px | 52px | 64px |

  No other token moves. No new token names are introduced.
- **Copy authority:** the product spec. **Never** use the design system readme's positioning or example copy ("Request invite", "Grab a seat", "inside track", room/member/invite language). Slogan is **"Shape what's next."**
- **Voice mechanics (from the design system, still binding):** sentence case everywhere including headlines and buttons; verb-first labels; we/you; numerals always; no emoji anywhere in UI; banned words: synergy, leverage, ecosystem, empower, "successfully". **"unlock"** is permitted only as a noun for a ladder perk, never as a verb in a headline or CTA.
- **Product rules binding the website:** R1 every mission card leads with the dollar figure and credit is never a bare number (always `2,400 credit · $24 in shop` form) · R7 the ladder shows access/status, never "earn more" · R8 a locked mission shows its XP distance and mission count, never the word "locked" alone · R9 tier vocabulary is `T1–T5` with names Open / Contributor / Insider / Trusted / Partner.
- **No backend, no network.** `/join` submits nowhere. `fetch` is never called by app code. The only exit for the join form is `submitJoin()` in `src/lib/join.js`.
- **No raw hex colours in app code.** Every colour is a `var(--token)`. Available token names are in the design system's `tokens/colors.css`; the ones this plan uses are `--surface-page --surface-card --surface-quiet --surface-inverse --surface-brand --text-primary --text-secondary --text-muted --text-brand --text-on-brand --text-inverse --text-inverse-secondary --border-subtle --gray-100 --gray-300 --gray-600 --violet-600 --ink-900 --overlay`.
- **Tests never hit the network.** The Google Fonts `@import` in the system's CSS is not loaded under Vitest (CSS is not processed in unit tests).
- **Test locations:** unit tests in `tests/unit/**/*.test.{js,jsx}` (Vitest only), e2e in `tests/e2e/**/*.spec.js` (Playwright only). The two runners must not pick up each other's files.
- **Commit trailer** on every commit: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Scaffold, dependency, and the two guards

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`
- Create: `src/main.jsx`, `src/App.jsx`, `src/styles/responsive.css` (empty shell — filled in Task 2)
- Create: `tests/unit/setup.js`, `tests/unit/smoke.test.jsx`, `tests/unit/stylesheet-order.test.js`

**Interfaces:**
- Consumes: `axelerate-design-system` from GitHub (private; the owner's git credentials make the install work).
- Produces: a running `npm run dev`, a passing `npm test`, and the import order every later task relies on.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "axelerate-website-h5",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "axelerate-design-system": "github:cakkrie/axelerate-design-system#main",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 2: Install runtime deps, then dev deps at current versions**

Dev-dependency versions are deliberately not pinned in this plan — pin to whatever npm resolves today and record the resolved versions in your report.

```bash
cd /Users/carriewang/axelerate-website-h5
npm install
npm install -D vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
npx playwright install chromium
ls node_modules/axelerate-design-system/index.js node_modules/axelerate-design-system/styles.css
grep -c '"version"' node_modules/axelerate-design-system/package.json
```

Expected: both files listed; the design system installed from GitHub. If `npm install` fails on the git dependency with an auth error, the machine's git credentials cannot reach the private repo — report BLOCKED, do not work around it by copying files.

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
test-results/
playwright-report/
.DS_Store
*.log
.env
.env.*
```

- [ ] **Step 4: Write `vite.config.js`**

The design system ships untranspiled `.jsx`. Vite's dep optimizer handles `.jsx` in `node_modules`, but **Vitest externalises `node_modules` by default and Node cannot load `.jsx`** — so the package must be inlined for tests. That is what `server.deps.inline` does.

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // The design system is untranspiled .jsx; make sure the optimizer sees it.
    include: ['axelerate-design-system'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    include: ['tests/unit/**/*.test.{js,jsx}'],
    css: false,
    server: {
      deps: {
        // Without this Vitest hands the .jsx package to Node, which throws
        // ERR_UNKNOWN_FILE_EXTENSION. Inlining routes it through Vite's transform.
        inline: ['axelerate-design-system'],
      },
    },
  },
});
```

- [ ] **Step 5: Write `index.html`**

Preconnect hints are the app-level mitigation for the design system's render-blocking Google Fonts `@import` (spec §3.5).

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Axelerate — paid brand missions for verified college students. Shape what's next." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <title>Axelerate — Shape what's next</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `src/main.jsx` — the order is the mechanism**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// ORDER IS LOAD-BEARING. Both stylesheets define tokens on :root; the second
// wins on source order. Swap these and the site stops being responsive.
// tests/unit/stylesheet-order.test.js asserts this order.
import 'axelerate-design-system/styles.css';
import './styles/responsive.css';

import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 7: Write a minimal `src/App.jsx`** (replaced wholesale in Task 10)

```jsx
export default function App() {
  return (
    <main style={{ padding: 'var(--space-2xl) var(--gutter)' }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'var(--text-4xl)',
          letterSpacing: '-0.04em',
          color: 'var(--violet-600)',
        }}
      >
        axelerate
      </span>
    </main>
  );
}
```

- [ ] **Step 8: Create the empty `src/styles/responsive.css`**

```css
/* Token override layer — filled in by Task 2. Loaded AFTER the design
   system's styles.css so these :root declarations win on source order. */
```

- [ ] **Step 9: Write `tests/unit/setup.js`**

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 10: Write the failing smoke test**

This proves Vitest can transpile the dependency's `.jsx`. If it fails with `ERR_UNKNOWN_FILE_EXTENSION`, the `server.deps.inline` config is wrong.

```jsx
// tests/unit/smoke.test.jsx
import { render, screen } from '@testing-library/react';
import { Button } from 'axelerate-design-system';

test('the design system renders under Vitest (proves .jsx transpilation)', () => {
  render(<Button>Shape what's next</Button>);
  const btn = screen.getByRole('button', { name: "Shape what's next" });
  expect(btn).toHaveClass('ax-btn');
  expect(btn).toHaveClass('ax-btn--primary');
});
```

- [ ] **Step 11: Write the failing stylesheet-order test**

```js
// tests/unit/stylesheet-order.test.js
import { readFileSync } from 'node:fs';

test('main.jsx imports the design system stylesheet BEFORE the responsive override layer', () => {
  const src = readFileSync('src/main.jsx', 'utf8');
  const system = src.indexOf("import 'axelerate-design-system/styles.css'");
  const ours = src.indexOf("import './styles/responsive.css'");
  expect(system).toBeGreaterThan(-1);
  expect(ours).toBeGreaterThan(-1);
  expect(system).toBeLessThan(ours);
});

test('main.jsx imports exactly two stylesheets', () => {
  const src = readFileSync('src/main.jsx', 'utf8');
  const cssImports = src.match(/^import\s+'[^']+\.css';/gm) ?? [];
  expect(cssImports).toHaveLength(2);
});
```

- [ ] **Step 12: Run the tests**

```bash
npm test 2>&1 | tail -15
```

Expected: 3 tests pass. The smoke test is the one that can genuinely fail here — if it does, fix `vite.config.js`, not the test.

- [ ] **Step 13: Prove the dev server and build work**

```bash
cd /Users/carriewang/axelerate-website-h5
npm run build 2>&1 | tail -6
ls dist/index.html dist/assets/*.css | head -3
grep -c 'Bricolage' dist/assets/*.css
```

Expected: build succeeds; `dist/index.html` exists; the built CSS contains the design system's font declarations (proves `styles.css` was bundled).

- [ ] **Step 14: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add package.json package-lock.json vite.config.js index.html .gitignore src tests
git commit -m "Scaffold Vite + React app on the design system

Installs axelerate-design-system from GitHub and proves Vitest can
transpile its untranspiled .jsx via server.deps.inline. Locks the
stylesheet import order with a test: the system's styles.css first,
our responsive override layer second — the whole responsive strategy
depends on that order.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: The token override layer

**Files:**
- Modify: `src/styles/responsive.css` (replace contents)
- Create: `tests/unit/responsive-tokens.test.js`

**Interfaces:**
- Consumes: the nine token names the design system defines in `tokens/typography.css` and `tokens/spacing.css`.
- Produces: responsive values for those nine tokens; every later task's layout relies on them without knowing it.

- [ ] **Step 1: Write the failing test**

The test parses the CSS as text — no browser needed — and asserts every cell of the Global Constraints table.

```js
// tests/unit/responsive-tokens.test.js
import { readFileSync } from 'node:fs';

const EXPECTED = {
  '--text-6xl':       { base: '44px', md: '60px', lg: '80px' },
  '--text-5xl':       { base: '34px', md: '46px', lg: '60px' },
  '--text-4xl':       { base: '28px', md: '36px', lg: '46px' },
  '--text-3xl':       { base: '24px', md: '30px', lg: '36px' },
  '--text-2xl':       { base: '20px', md: '24px', lg: '28px' },
  '--container-max':  { base: '100%', md: '100%', lg: '1160px' },
  '--gutter':         { base: '20px', md: '32px', lg: '24px' },
  '--space-4xl':      { base: '56px', md: '72px', lg: '96px' },
  '--space-3xl':      { base: '40px', md: '52px', lg: '64px' },
};

const css = readFileSync('src/styles/responsive.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function block(name) {
  if (name === 'base') return css.split('@media')[0];
  const min = name === 'md' ? '641px' : '1025px';
  const re = new RegExp(`@media\\s*\\(min-width:\\s*${min}\\)\\s*\\{([\\s\\S]*?)\\}\\s*\\}`);
  const m = css.match(re);
  if (!m) throw new Error(`no @media (min-width: ${min}) block`);
  return m[1];
}

function valueIn(blk, token) {
  const m = blk.match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : undefined;
}

describe('responsive.css token override layer', () => {
  for (const [token, tiers] of Object.entries(EXPECTED)) {
    for (const [tier, value] of Object.entries(tiers)) {
      test(`${token} is ${value} at ${tier}`, () => {
        expect(valueIn(block(tier), token)).toBe(value);
      });
    }
  }

  test('redefines ONLY the nine approved tokens — no new names, nothing else moved', () => {
    const declared = [...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    const unexpected = declared.filter((t) => !(t in EXPECTED));
    expect(unexpected).toEqual([]);
  });

  test('is mobile-first: base :root has no media query, md and lg use min-width', () => {
    expect(css).not.toMatch(/max-width/);
    expect(css).toMatch(/@media\s*\(min-width:\s*641px\)/);
    expect(css).toMatch(/@media\s*\(min-width:\s*1025px\)/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/responsive-tokens.test.js 2>&1 | tail -8
```

Expected: FAIL — 27 value tests fail on `undefined`, plus "no @media" errors.

- [ ] **Step 3: Write `src/styles/responsive.css`**

```css
/* ============================================================
   Axelerate website — token override layer
   ------------------------------------------------------------
   The design system defines every token on a bare :root{} and has
   no @media rules. This file is loaded AFTER its styles.css, so the
   declarations below win on source order at equal specificity.

   Mobile-first. Three tiers:
     base  <= 640px   phone   — new values
     md    641–1024   tablet  — new values
     lg    >= 1025px  desktop — EXACTLY the system's own values, so
                               wide screens render as the system intends

   Only these nine tokens move. Colour, radius, shadow and motion
   never change by viewport — the brand does not change shape.
   tests/unit/responsive-tokens.test.js asserts every value here.
   ============================================================ */

:root {
  --text-6xl: 44px;
  --text-5xl: 34px;
  --text-4xl: 28px;
  --text-3xl: 24px;
  --text-2xl: 20px;
  --container-max: 100%;
  --gutter: 20px;
  --space-4xl: 56px;
  --space-3xl: 40px;
}

@media (min-width: 641px) {
  :root {
    --text-6xl: 60px;
    --text-5xl: 46px;
    --text-4xl: 36px;
    --text-3xl: 30px;
    --text-2xl: 24px;
    --container-max: 100%;
    --gutter: 32px;
    --space-4xl: 72px;
    --space-3xl: 52px;
  }
}

@media (min-width: 1025px) {
  :root {
    --text-6xl: 80px;
    --text-5xl: 60px;
    --text-4xl: 46px;
    --text-3xl: 36px;
    --text-2xl: 28px;
    --container-max: 1160px;
    --gutter: 24px;
    --space-4xl: 96px;
    --space-3xl: 64px;
  }
}
```

- [ ] **Step 4: Run the tests**

```bash
cd /Users/carriewang/axelerate-website-h5 && npm test 2>&1 | tail -6
```

Expected: all pass (3 from Task 1 + 29 here).

- [ ] **Step 5: Prove the override actually wins in a real browser**

Vitest cannot compute cascaded CSS. Use Playwright's Chromium directly against the dev server for a one-off check.

```bash
cd /Users/carriewang/axelerate-website-h5
(npm run dev -- --port 5199 >/dev/null 2>&1 &) ; sleep 3
node --input-type=module -e "
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage();
for (const w of [375, 800, 1280]) {
  await p.setViewportSize({ width: w, height: 800 });
  await p.goto('http://localhost:5199/');
  const v = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-5xl').trim());
  console.log(w + 'px -> --text-5xl = ' + v);
}
await b.close();
"
pkill -f 'vite --port 5199' || true
```

Expected exactly: `375px -> --text-5xl = 34px`, `800px -> --text-5xl = 46px`, `1280px -> --text-5xl = 60px`. If 1280 shows 60px but 375 also shows 60px, the override is loading before the system's CSS — check `main.jsx` order.

- [ ] **Step 6: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/styles/responsive.css tests/unit/responsive-tokens.test.js
git commit -m "Add the responsive token override layer

Nine tokens across three mobile-first tiers; the lg tier reproduces
the design system's own values exactly. A text-parsing test asserts
all 27 values and that no other token is touched. Verified in
Chromium that --text-5xl resolves to 34/46/60px at 375/800/1280.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Icon helper, Nav, NavSheet, Footer

**Files:**
- Create: `src/components/Icon.jsx`, `src/components/Nav.jsx`, `src/components/NavSheet.jsx`, `src/components/Footer.jsx`, `src/components/shell.css`
- Create: `tests/unit/nav.test.jsx`

**Interfaces:**
- Consumes: `Button`, `IconButton` from the design system; `Link`/`NavLink` from react-router-dom.
- Produces: `<Nav />`, `<Footer />` used by Task 10's shell; `<Icon name="zap" size={20} />` used by every section.

The design system's icon set has **no menu/hamburger glyph** (available: analytics arrow-left arrow-right bell bookmark bulb calendar checklist chevrons-right clock coffee-cup-2 copy cross crown dashboard-2 download fire globe heart home info link magic-wand mail message pin play rocket search send-2 star tick-2 tick trend-up trophy user-add user zap). The readme permits minimal geometric strokes for micro-utility glyphs, so the toggle is three CSS bars.

- [ ] **Step 1: Write the failing tests**

```jsx
// tests/unit/nav.test.jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Nav from '../../src/components/Nav.jsx';
import Footer from '../../src/components/Footer.jsx';
import Icon from '../../src/components/Icon.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Icon', () => {
  test('renders the ax-icon utility with the icon URL in --icon', () => {
    const { container } = render(<Icon name="zap" />);
    const i = container.querySelector('i.ax-icon');
    expect(i).toBeInTheDocument();
    expect(i.style.getPropertyValue('--icon')).toMatch(/zap/);
    expect(i).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Nav', () => {
  test('renders the wordmark linking home and the three section links', () => {
    wrap(<Nav />);
    expect(screen.getByRole('link', { name: 'axelerate' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/#loop');
    expect(screen.getByRole('link', { name: 'The ladder' })).toHaveAttribute('href', '/#ladder');
    expect(screen.getByRole('link', { name: 'For brands' })).toHaveAttribute('href', '/for-brands');
  });

  test('has a primary CTA "Get verified" pointing at /join', () => {
    wrap(<Nav />);
    const cta = screen.getAllByRole('link', { name: 'Get verified' })[0];
    expect(cta).toHaveAttribute('href', '/join');
  });

  test('the sheet is closed by default and opens from the menu button', async () => {
    const user = userEvent.setup();
    wrap(<Nav />);
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const sheet = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(sheet).getByRole('link', { name: 'For brands' })).toBeInTheDocument();
  });

  test('the sheet closes on Escape and on the close button, returning focus to the toggle', async () => {
    const user = userEvent.setup();
    wrap(<Nav />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });

  test('focus is trapped inside the open sheet', async () => {
    const user = userEvent.setup();
    wrap(<Nav />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const sheet = screen.getByRole('dialog', { name: 'Menu' });
    const focusables = within(sheet).getAllByRole(/link|button/);
    expect(focusables[0]).toHaveFocus();          // close button focused on open
    // Shift+Tab from the first focusable wraps to the last
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(focusables[focusables.length - 1]).toHaveFocus();
    // Tab from the last wraps to the first
    await user.keyboard('{Tab}');
    expect(focusables[0]).toHaveFocus();
  });

  test('clicking a link inside the sheet closes it', async () => {
    const user = userEvent.setup();
    wrap(<Nav />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const sheet = screen.getByRole('dialog', { name: 'Menu' });
    await user.click(within(sheet).getByRole('link', { name: 'For brands' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});

describe('Footer', () => {
  test('links to the brand page, join, and all three legal pages', () => {
    wrap(<Footer />);
    expect(screen.getByRole('link', { name: 'For brands' })).toHaveAttribute('href', '/for-brands');
    expect(screen.getByRole('link', { name: 'Get verified' })).toHaveAttribute('href', '/join');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/legal/terms');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getByRole('link', { name: 'Payouts' })).toHaveAttribute('href', '/legal/payouts');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/nav.test.jsx 2>&1 | tail -6
```

Expected: FAIL — cannot resolve `../../src/components/Nav.jsx`.

- [ ] **Step 3: Write `src/components/Icon.jsx`**

Vite turns the SVG import into a URL; the design system's `.ax-icon` utility masks `currentColor` with `var(--icon)`.

```jsx
// Tints a design-system doodle icon via the system's .ax-icon mask utility.
// Vite resolves the SVG to a URL through the package's ./assets/* export.
const icons = import.meta.glob('/node_modules/axelerate-design-system/assets/icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export default function Icon({ name, size = 22, style, ...rest }) {
  const src = icons[`/node_modules/axelerate-design-system/assets/icons/${name}.svg`];
  if (!src) throw new Error(`Icon "${name}" is not in the design system's icon set`);
  return (
    <i
      aria-hidden="true"
      className="ax-icon"
      style={{ '--icon': `url(${src})`, width: size, height: size, ...style }}
      {...rest}
    />
  );
}
```

- [ ] **Step 4: Write `src/components/shell.css`**

Nav and Footer styles live here, not inline, because they carry media queries. Every colour is a token.

```css
/* Shell — Nav + NavSheet + Footer. Colours are tokens only. */

.wrap {
  max-width: var(--container-max);
  margin: 0 auto;
  padding-left: var(--gutter);
  padding-right: var(--gutter);
}

/* ---- Nav ---- */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--surface-page) 85%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-subtle);
}
.nav__row {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  height: 60px;
}
.nav__wordmark {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  letter-spacing: -0.04em;
  color: var(--violet-600);
  text-decoration: none;
  line-height: 1;
}
.nav__links {
  display: none;
  gap: var(--space-lg);
  margin-left: var(--space-xs);
}
.nav__links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
}
.nav__links a:hover { color: var(--text-brand); }
.nav__cta { display: none; margin-left: auto; }
.nav__toggle { margin-left: auto; }

/* Hamburger: three geometric bars — the icon set has no menu glyph and the
   readme permits minimal strokes for micro-utility chrome. */
.nav__bars {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  width: 18px;
}
.nav__bars span {
  display: block;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
}

@media (min-width: 1025px) {
  .nav__row { height: 64px; }
  .nav__links { display: flex; }
  .nav__cta { display: inline-flex; }
  .nav__toggle { display: none; }
}

/* ---- NavSheet ---- */
.sheet__overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--overlay);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.sheet {
  position: fixed;
  inset: 0;
  z-index: 101;
  background: var(--surface-page);
  display: flex;
  flex-direction: column;
  padding: var(--space-md) var(--gutter) var(--space-2xl);
  overflow-y: auto;
}
.sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}
.sheet__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: var(--space-xl) 0;
}
.sheet__links a {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-2xl);
  letter-spacing: -0.02em;
  color: var(--text-primary);
  text-decoration: none;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--gray-100);
}
.sheet__close {
  font-size: 22px;
  line-height: 1;
}

/* ---- Footer ---- */
.footer {
  background: var(--surface-inverse);
  color: var(--text-inverse);
  padding: var(--space-3xl) 0 var(--space-2xl);
  margin-top: var(--space-4xl);
}
.footer__grid {
  display: grid;
  gap: var(--space-xl);
}
.footer__wordmark {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-2xl);
  letter-spacing: -0.04em;
  color: var(--text-inverse);
  text-decoration: none;
}
.footer__tag {
  font-family: var(--font-hand);
  font-size: 19px;
  color: var(--text-inverse-secondary);
  transform: rotate(-1.5deg);
  display: inline-block;
  margin-top: var(--space-xs);
}
.footer__col h4 {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-inverse-secondary);
  margin: 0 0 var(--space-sm);
}
.footer__col a {
  display: block;
  color: var(--text-inverse);
  text-decoration: none;
  font-size: var(--text-sm);
  padding: 6px 0;
}
.footer__col a:hover { color: var(--butter-300); }
.footer__legal {
  margin-top: var(--space-2xl);
  padding-top: var(--space-md);
  border-top: 1px solid color-mix(in srgb, var(--text-inverse) 15%, transparent);
  font-size: var(--text-xs);
  color: var(--text-inverse-secondary);
}
@media (min-width: 641px) {
  .footer__grid { grid-template-columns: 1.4fr 1fr 1fr; }
}
```

- [ ] **Step 5: Write `src/components/NavSheet.jsx`**

Full-screen mobile menu. Focus trap and Escape handling are hand-rolled — small enough that a library is not warranted.

```jsx
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'axelerate-design-system';

const FOCUSABLE = 'a[href], button:not([disabled])';

export const NAV_LINKS = [
  { to: '/#loop', label: 'How it works' },
  { to: '/#ladder', label: 'The ladder' },
  { to: '/for-brands', label: 'For brands' },
];

export default function NavSheet({ open, onClose }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const focusables = () => [...sheet.querySelectorAll(FOCUSABLE)];
    focusables()[0]?.focus();

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="sheet__overlay" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Menu" ref={sheetRef}>
        <div className="sheet__head">
          <span className="nav__wordmark" aria-hidden="true">axelerate</span>
          <button type="button" className="sheet__close ax-btn ax-btn--ghost ax-btn--sm" onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className="sheet__links" aria-label="Site">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={onClose}>{l.label}</Link>
          ))}
        </nav>
        <Link to="/join" onClick={onClose} className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full">
          Get verified
        </Link>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Write `src/components/Nav.jsx`**

```jsx
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import NavSheet, { NAV_LINKS } from './NavSheet.jsx';
import './shell.css';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    // Return focus to the control that opened the sheet.
    requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  return (
    <header className="nav">
      <div className="wrap nav__row">
        <Link to="/" className="nav__wordmark">axelerate</Link>
        <nav className="nav__links" aria-label="Site">
          {NAV_LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
        </nav>
        <Link to="/join" className="nav__cta ax-btn ax-btn--primary ax-btn--sm">Get verified</Link>
        <button
          ref={toggleRef}
          type="button"
          className="nav__toggle ax-btn ax-btn--ghost ax-btn--sm"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="nav__bars" aria-hidden="true"><span /><span /><span /></span>
        </button>
      </div>
      <NavSheet open={open} onClose={close} />
    </header>
  );
}
```

Note on `requestAnimationFrame` in the focus-return: jsdom implements it. If the focus assertion in the Escape test is flaky, replace with a synchronous `toggleRef.current?.focus()` inside `close` — the RAF exists only to let React unmount the sheet first.

- [ ] **Step 7: Write `src/components/Footer.jsx`**

```jsx
import { Link } from 'react-router-dom';
import './shell.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <Link to="/" className="footer__wordmark">axelerate</Link>
            <br />
            <span className="footer__tag">shape what's next</span>
          </div>
          <div className="footer__col">
            <h4>Students</h4>
            <Link to="/#loop">How it works</Link>
            <Link to="/#ladder">The ladder</Link>
            <Link to="/join">Get verified</Link>
          </div>
          <div className="footer__col">
            <h4>Company</h4>
            <Link to="/for-brands">For brands</Link>
            <Link to="/legal/terms">Terms</Link>
            <Link to="/legal/privacy">Privacy</Link>
            <Link to="/legal/payouts">Payouts</Link>
          </div>
        </div>
        <div className="footer__legal">© 2026 Axelerate. Paid missions for verified students.</div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 8: Run the tests**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/nav.test.jsx 2>&1 | tail -12
```

Expected: 9 tests pass. If the focus-trap test fails on the first assertion, check that `focusables()[0]` is the close button — it must be the first focusable in DOM order.

- [ ] **Step 9: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/components tests/unit/nav.test.jsx
git commit -m "Add Nav, NavSheet, Footer, and the Icon helper

Sticky nav collapses to a hamburger below the lg tier; the sheet is a
focus-trapped modal dialog that closes on Escape, overlay, close
button, or link, and returns focus to the toggle. The icon set has no
menu glyph, so the toggle is three geometric bars per the readme's
micro-utility rule.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: MissionCard and the missions fixture

**Files:**
- Create: `src/data/missions.example.json`, `src/components/MissionCard.jsx`, `src/components/mission-card.css`
- Create: `tests/unit/mission-card.test.jsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Tag` from the design system; `Icon` from Task 3.
- Produces: `<MissionCard mission={m} />` and `<MissionCard mission={m} locked={{ xpAway, missionsAway }} />`; the fixture shape below, which the spec designates as the future Supabase `missions` seed.

Fixture shape (spec §3.4a): `slug, title, brand, campus, payUsd, tier (1–5), tierName, minLevel, hours, format, skills[], xp`. Tier names per R9: 1 Open · 2 Contributor · 3 Insider · 4 Trusted · 5 Partner. Brands other than the spec's own "Dermabell" example are fictional.

- [ ] **Step 1: Write the fixture**

```json
[
  {
    "slug": "fable-coffee-morning-routine",
    "title": "Post 3 photos of your morning routine",
    "brand": "Fable Coffee",
    "campus": "UCLA",
    "payUsd": 15,
    "tier": 1,
    "tierName": "Open",
    "minLevel": 1,
    "hours": 1,
    "format": "content",
    "skills": ["Content creation"],
    "xp": 150
  },
  {
    "slug": "kettle-co-sampling-ambassador",
    "title": "Sampling ambassador · 2 hours",
    "brand": "Kettle & Co",
    "campus": "USC",
    "payUsd": 50,
    "tier": 2,
    "tierName": "Contributor",
    "minLevel": 2,
    "hours": 2,
    "format": "field",
    "skills": ["Sampling", "Customer conversation"],
    "xp": 250
  },
  {
    "slug": "northline-launch-night",
    "title": "Staff the launch night",
    "brand": "Northline Apparel",
    "campus": "NYU",
    "payUsd": 70,
    "tier": 2,
    "tierName": "Contributor",
    "minLevel": 2,
    "hours": 3,
    "format": "event",
    "skills": ["Event operations"],
    "xp": 100
  },
  {
    "slug": "dermabell-campus-launch",
    "title": "Dermabell Campus Launch",
    "brand": "Dermabell",
    "campus": "UCLA",
    "payUsd": 280,
    "tier": 4,
    "tierName": "Trusted",
    "minLevel": 4,
    "hours": 4,
    "format": "field",
    "skills": ["Event marketing", "Consumer research", "Brand activation"],
    "xp": 850
  }
]
```

- [ ] **Step 2: Write the failing tests**

```jsx
// tests/unit/mission-card.test.jsx
import { render, screen } from '@testing-library/react';
import MissionCard from '../../src/components/MissionCard.jsx';
import missions from '../../src/data/missions.example.json';

const open = missions[0];        // Fable Coffee, T1
const trusted = missions[3];     // Dermabell, T4

describe('fixture shape (future Supabase seed)', () => {
  const REQUIRED = ['slug','title','brand','campus','payUsd','tier','tierName','minLevel','hours','format','skills','xp'];
  test('has exactly 4 missions with every required field', () => {
    expect(missions).toHaveLength(4);
    for (const m of missions) for (const k of REQUIRED) expect(m, `${m.slug} missing ${k}`).toHaveProperty(k);
  });
  test('tier names follow R9', () => {
    const names = { 1: 'Open', 2: 'Contributor', 3: 'Insider', 4: 'Trusted', 5: 'Partner' };
    for (const m of missions) expect(m.tierName).toBe(names[m.tier]);
  });
  test('formats are the four the product spec defines (R3)', () => {
    for (const m of missions) expect(['content','field','event','sales']).toContain(m.format);
  });
});

describe('MissionCard — open', () => {
  test('leads with the dollar figure (R1)', () => {
    render(<MissionCard mission={open} />);
    const card = screen.getByTestId('mission-card');
    // The very first text node in the card is the price.
    expect(card.textContent.trim().startsWith('$15')).toBe(true);
  });
  test('shows the spec card format: tier, level, hours, campus, format, XP', () => {
    render(<MissionCard mission={trusted} />);
    expect(screen.getByText('Dermabell Campus Launch')).toBeInTheDocument();
    expect(screen.getByText('Trusted mission · LV.4')).toBeInTheDocument();
    expect(screen.getByText(/4 hours/)).toBeInTheDocument();
    expect(screen.getByText(/UCLA/)).toBeInTheDocument();
    expect(screen.getByText(/Brand activation/)).toBeInTheDocument();
    expect(screen.getByText('+850 XP')).toBeInTheDocument();
  });
  test('T1 reads "Open mission · LV.1"', () => {
    render(<MissionCard mission={open} />);
    expect(screen.getByText('Open mission · LV.1')).toBeInTheDocument();
  });
  test('never renders an emoji', () => {
    render(<MissionCard mission={trusted} locked={{ xpAway: 620, missionsAway: 3 }} />);
    expect(screen.getByTestId('mission-card').textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('MissionCard — locked (R8 near-miss rule)', () => {
  test('keeps the dollar figure visible and states the distance, not just "locked"', () => {
    render(<MissionCard mission={trusted} locked={{ xpAway: 620, missionsAway: 3 }} />);
    const card = screen.getByTestId('mission-card');
    expect(card.textContent.trim().startsWith('$280')).toBe(true);
    expect(screen.getByText('Trusted · LV.4')).toBeInTheDocument();
    expect(screen.getByText('620 XP away · about 3 missions')).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/locked for your rank/i);
  });
  test('uses singular "1 mission" when one away', () => {
    render(<MissionCard mission={trusted} locked={{ xpAway: 220, missionsAway: 1 }} />);
    expect(screen.getByText('220 XP away · about 1 mission')).toBeInTheDocument();
  });
  test('is marked for assistive tech', () => {
    render(<MissionCard mission={trusted} locked={{ xpAway: 620, missionsAway: 3 }} />);
    expect(screen.getByTestId('mission-card')).toHaveAttribute('data-locked', 'true');
  });
});
```

- [ ] **Step 3: Run to verify they fail**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/mission-card.test.jsx 2>&1 | tail -6
```

Expected: FAIL — cannot resolve `MissionCard.jsx`. (The three fixture tests may pass already — that is fine.)

- [ ] **Step 4: Write `src/components/mission-card.css`**

```css
.mc { display: flex; flex-direction: column; gap: var(--space-sm); }
.mc__top { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-sm); }
.mc__pay {
  font-family: var(--font-label);
  font-weight: 700;
  font-size: var(--text-2xl);
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.mc__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-lg);
  letter-spacing: -0.01em;
  margin: 0;
  line-height: var(--leading-snug);
}
.mc__brand { color: var(--text-secondary); font-size: var(--text-sm); }
.mc__meta {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.mc__skills { display: flex; flex-wrap: wrap; gap: 6px; }
.mc__foot { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); margin-top: var(--space-2xs); }
.mc__xp {
  font-family: var(--font-label);
  font-weight: 700;
  font-size: var(--text-sm);
  color: var(--text-brand);
  font-variant-numeric: tabular-nums;
}
/* Locked: the card stays fully readable — R8 says show distance, never hide. */
.mc__lock {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-hand-sm);
  background: var(--surface-quiet);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}
.mc__lock b { color: var(--text-primary); font-weight: 600; }
.mc__lock-dist { font-family: var(--font-hand); font-size: 17px; color: var(--gray-600); }
```

- [ ] **Step 5: Write `src/components/MissionCard.jsx`**

```jsx
import { Card, Badge, Tag } from 'axelerate-design-system';
import Icon from './Icon.jsx';
import './mission-card.css';

const FORMAT_LABEL = { content: 'Content', field: 'Brand activation', event: 'Event', sales: 'Sales' };
const TIER_TONE = { 1: 'lime', 2: 'cyan', 3: 'teal', 4: 'navy', 5: 'pink' };
const usd = (n) => '$' + n.toLocaleString('en-US');

export default function MissionCard({ mission: m, locked, tilt = 0 }) {
  const tierLine = `${m.tierName} mission · LV.${m.minLevel}`;
  return (
    <Card tilt={tilt} interactive={!locked} data-testid="mission-card" data-locked={locked ? 'true' : 'false'} className="mc">
      <div className="mc__top">
        <span className="mc__pay">{usd(m.payUsd)}</span>
        <Badge tone={TIER_TONE[m.tier]} tilt={-3}>{tierLine}</Badge>
      </div>
      <h3 className="mc__title">{m.title}</h3>
      <div className="mc__brand">{m.brand}</div>
      <div className="mc__meta">
        {m.hours} {m.hours === 1 ? 'hour' : 'hours'} · {m.campus} · {FORMAT_LABEL[m.format]}
      </div>
      <div className="mc__skills">
        {m.skills.map((s) => <Tag key={s} soft>{s}</Tag>)}
      </div>
      <div className="mc__foot">
        <span className="mc__xp">+{m.xp.toLocaleString('en-US')} XP</span>
        <Icon name="zap" size={18} style={{ color: 'var(--text-brand)' }} />
      </div>
      {locked && (
        <div className="mc__lock" role="note">
          <Icon name="crown" size={18} />
          <span>
            <b>{m.tierName} · LV.{m.minLevel}</b>
            <br />
            <span className="mc__lock-dist">
              {locked.xpAway.toLocaleString('en-US')} XP away · about {locked.missionsAway} {locked.missionsAway === 1 ? 'mission' : 'missions'}
            </span>
          </span>
        </div>
      )}
    </Card>
  );
}
```

The R1 test asserts the **first text** in the card is the price. The `.mc__pay` span is the first child of the first row, so `textContent` starts with `$`. Do not put the Badge before it.

- [ ] **Step 6: Run the tests**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/mission-card.test.jsx 2>&1 | tail -12
```

Expected: 10 tests pass. If `Card` does not forward `data-*` props, check `Card.d.ts` — it extends `HTMLAttributes<HTMLDivElement>` and spreads `...rest`, so it should. If not, wrap in a `div` with the test id.

- [ ] **Step 7: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/data src/components/MissionCard.jsx src/components/mission-card.css tests/unit/mission-card.test.jsx
git commit -m "Add MissionCard and the example missions fixture

Cards follow the product spec's format exactly and lead with the
dollar figure (R1). A locked card keeps its price and states the XP
distance and mission count (R8) — never 'locked for your rank'. The
fixture is shaped as flat records so it becomes the Supabase missions
seed later; three brands are fictional, Dermabell is the spec's own
example.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Landing sections — Hero, Loop, Missions

**Files:**
- Create: `src/sections/Hero.jsx`, `src/sections/Loop.jsx`, `src/sections/Missions.jsx`, `src/sections/sections.css`
- Create: `tests/unit/sections-a.test.jsx`

**Interfaces:**
- Consumes: `Button`, `Badge`, `Card` from the design system; `MissionCard` + fixture from Task 4; `Icon` from Task 3.
- Produces: three section components composed by Task 6's `LandingPage`.

Copy is final and comes from the product spec §1 and §2.2.3. Do not paraphrase it.

- [ ] **Step 1: Write the failing tests**

```jsx
// tests/unit/sections-a.test.jsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Hero from '../../src/sections/Hero.jsx';
import Loop from '../../src/sections/Loop.jsx';
import Missions from '../../src/sections/Missions.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Hero', () => {
  test('leads with the slogan as the h1 and one CTA to /join', () => {
    wrap(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Shape what's next.");
    const ctas = screen.getAllByRole('link', { name: 'Get verified' });
    expect(ctas).toHaveLength(1);
    expect(ctas[0]).toHaveAttribute('href', '/join');
  });
  test('uses the product promise, not the old invite-network copy', () => {
    wrap(<Hero />);
    expect(screen.getByText(/get paid in real dollars/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/request invite|inside track|grab a seat/i);
  });
});

describe('Loop', () => {
  test('has the anchor id "loop" and the five steps in order', () => {
    wrap(<Loop />);
    const sec = document.getElementById('loop');
    expect(sec).toBeInTheDocument();
    const steps = within(sec).getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toHaveLength(5);
    expect(steps[0]).toMatch(/Apply to a mission/);
    expect(steps[1]).toMatch(/Do the work/);
    expect(steps[2]).toMatch(/The brand approves/);
    expect(steps[3]).toMatch(/Cash lands.*XP lands/);
    expect(steps[4]).toMatch(/Better missions open up/);
  });
});

describe('Missions', () => {
  test('renders exactly 4 example cards, 1 of them locked, with the example caption', () => {
    wrap(<Missions />);
    const cards = screen.getAllByTestId('mission-card');
    expect(cards).toHaveLength(4);
    expect(cards.filter((c) => c.dataset.locked === 'true')).toHaveLength(1);
    expect(screen.getByText('Example missions — the live board opens at launch.')).toBeInTheDocument();
  });
  test('the locked card is the Dermabell T4 example with the spec distance', () => {
    wrap(<Missions />);
    expect(screen.getByText('620 XP away · about 3 missions')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/sections-a.test.jsx 2>&1 | tail -6
```

Expected: FAIL — cannot resolve the section files.

- [ ] **Step 3: Write `src/sections/sections.css`**

Shared section layout. Colours are tokens.

```css
.section { padding: var(--space-3xl) 0; }
.section--band { background: var(--surface-brand); color: var(--text-on-brand); }
.section__kicker {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-brand);
  margin: 0 0 var(--space-sm);
}
.section__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-3xl);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
  margin: 0 0 var(--space-md);
}
.section__lede { font-size: var(--text-lg); color: var(--text-secondary); max-width: 56ch; margin: 0 0 var(--space-xl); }
.section__note {
  font-family: var(--font-hand);
  font-size: 19px;
  color: var(--gray-600);
  display: inline-block;
  transform: rotate(-1.5deg);
}

/* Hero */
.hero { padding: var(--space-2xl) 0 var(--space-3xl); text-align: center; }
.hero__inner { display: flex; flex-direction: column; align-items: center; gap: var(--space-lg); }
.hero__h1 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-5xl);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-tight);
  margin: 0;
  max-width: 14ch;
  position: relative;
}
.hero__circle {
  background: var(--scribble-violet) no-repeat center / 100% 100%;
  padding: 0.15em 0.35em;
  margin: 0 -0.2em;
}
.hero__lede { font-size: var(--text-lg); color: var(--text-secondary); max-width: 46ch; margin: 0; }
.hero__ctas { display: flex; gap: var(--space-sm); flex-wrap: wrap; justify-content: center; }
@media (min-width: 641px) { .hero { padding: var(--space-3xl) 0 var(--space-4xl); } }

/* Loop */
.loop__list { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-sm); counter-reset: step; }
.loop__step { display: flex; gap: var(--space-md); align-items: flex-start; }
.loop__step h3 { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); margin: 0 0 4px; }
.loop__step p { margin: 0; color: var(--text-secondary); font-size: var(--text-sm); }
@media (min-width: 1025px) {
  .loop__list { grid-template-columns: repeat(5, 1fr); gap: var(--space-md); }
  .loop__step { flex-direction: column; }
}

/* Missions */
.missions__grid { display: grid; gap: var(--space-md); }
@media (min-width: 641px) { .missions__grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1025px) { .missions__grid { grid-template-columns: repeat(4, 1fr); } }
.missions__caption { margin-top: var(--space-md); }
```

- [ ] **Step 4: Write `src/sections/Hero.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { Badge } from 'axelerate-design-system';
import Icon from '../components/Icon.jsx';
import './sections.css';

export default function Hero() {
  return (
    <section className="hero ax-grid-paper" aria-labelledby="hero-title">
      <div className="wrap hero__inner">
        <Badge tone="yellow" tilt={-2}>Paid missions for verified students</Badge>
        <h1 id="hero-title" className="hero__h1">
          Shape <span className="hero__circle">what's next.</span>
        </h1>
        <p className="hero__lede">
          Brands post paid missions — make a video, staff a pop-up, run an event. You do the work,
          get paid in real dollars, and build a work record you can prove.
        </p>
        <div className="hero__ctas">
          <Link to="/join" className="ax-btn ax-btn--primary ax-btn--lg">
            Get verified <Icon name="arrow-right" size={18} />
          </Link>
          <a href="#loop" className="ax-btn ax-btn--ghost ax-btn--lg">See how it works</a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write `src/sections/Loop.jsx`**

The five steps are the product spec §1 loop. Rendered as `Card`s with the step number in the corner via the system's `scribble` prop — hand-drawn numbering, not a flowchart.

```jsx
import { Card } from 'axelerate-design-system';
import './sections.css';

const STEPS = [
  { t: 'Apply to a mission', d: 'Pick a paid piece of work from a brand on your campus.' },
  { t: 'Do the work', d: 'Make the video, staff the table, run the event — to the brief.' },
  { t: 'The brand approves', d: 'One approval, one code path. That is the only way XP is ever written.' },
  { t: 'Cash lands. XP lands.', d: 'Dollars go to your wallet — withdrawable. XP moves you up the ladder.' },
  { t: 'Better missions open up', d: 'Each level adds access, status and perks. Never a pay multiplier.' },
];

export default function Loop() {
  return (
    <section id="loop" className="section" aria-labelledby="loop-title">
      <div className="wrap">
        <p className="section__kicker">How it works</p>
        <h2 id="loop-title" className="section__title">One loop. Real money, real record.</h2>
        <ol className="loop__list">
          {STEPS.map((s, i) => (
            <li key={s.t}>
              <Card variant="quiet" padding="md" scribble={String(i + 1)} tilt={i % 2 ? 0.8 : -0.8} className="loop__step">
                <div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Write `src/sections/Missions.jsx`**

```jsx
import MissionCard from '../components/MissionCard.jsx';
import missions from '../data/missions.example.json';
import './sections.css';

// The Dermabell T4 card is shown locked — the product spec's own example of
// the near-miss rule (R8): "Trusted · LV.4 — 620 XP away, about 3 missions".
const LOCKED = { 'dermabell-campus-launch': { xpAway: 620, missionsAway: 3 } };

export default function Missions() {
  return (
    <section className="section" aria-labelledby="missions-title">
      <div className="wrap">
        <p className="section__kicker">Missions</p>
        <h2 id="missions-title" className="section__title">Every card leads with the dollar figure.</h2>
        <p className="section__lede">
          Content, field, event, sales — one board, one pipeline, one payout path. Anything you can't
          take yet tells you exactly how far away it is.
        </p>
        <div className="missions__grid">
          {missions.map((m, i) => (
            <MissionCard key={m.slug} mission={m} locked={LOCKED[m.slug]} tilt={[-1, 1, -0.6, 0.8][i]} />
          ))}
        </div>
        <p className="missions__caption section__note">Example missions — the live board opens at launch.</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Run the tests**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/sections-a.test.jsx 2>&1 | tail -10
```

Expected: 6 pass.

- [ ] **Step 8: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/sections tests/unit/sections-a.test.jsx
git commit -m "Add Hero, Loop, and Missions landing sections

Slogan as the h1 with one CTA; the product spec's five-step loop as
hand-numbered cards; four example missions with the Dermabell T4 card
shown locked per the near-miss rule, captioned as examples.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Landing sections — Ladder, Shop, Brands teaser, CTA band — and the page

**Files:**
- Create: `src/sections/Ladder.jsx`, `src/sections/Shop.jsx`, `src/sections/BrandsTeaser.jsx`, `src/sections/CtaBand.jsx`
- Create: `src/pages/LandingPage.jsx`
- Modify: `src/sections/sections.css` (append)
- Create: `tests/unit/sections-b.test.jsx`

**Interfaces:**
- Consumes: `FileCard`, `StickyNote`, `Bubble`, `Button` from the design system; Task 5's sections.
- Produces: `<LandingPage />` routed at `/` by Task 10.

- [ ] **Step 1: Write the failing tests**

```jsx
// tests/unit/sections-b.test.jsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Ladder from '../../src/sections/Ladder.jsx';
import Shop from '../../src/sections/Shop.jsx';
import BrandsTeaser from '../../src/sections/BrandsTeaser.jsx';
import CtaBand from '../../src/sections/CtaBand.jsx';
import LandingPage from '../../src/pages/LandingPage.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Ladder', () => {
  test('has anchor id "ladder" and the five levels in order', () => {
    wrap(<Ladder />);
    const sec = document.getElementById('ladder');
    const names = within(sec).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Explorer', 'Contributor', 'Insider', 'Trusted', 'Partner']);
  });
  test('shows access and status, never a pay multiplier (R7)', () => {
    wrap(<Ladder />);
    const text = document.getElementById('ladder').textContent;
    expect(text).not.toMatch(/earn more|pay multiplier|×\s*pay|bonus pay/i);
    expect(text).toMatch(/Public profile goes live/);
  });
});

describe('Shop', () => {
  test('never shows credit as a bare number (R1) and states the single gate (R4)', () => {
    wrap(<Shop />);
    expect(screen.getByText(/2,400 credit · \$24 in shop/)).toBeInTheDocument();
    expect(screen.getByText(/One gate: verification/)).toBeInTheDocument();
  });
});

describe('BrandsTeaser', () => {
  test('points brands at /for-brands', () => {
    wrap(<BrandsTeaser />);
    expect(screen.getByRole('link', { name: /For brands/ })).toHaveAttribute('href', '/for-brands');
  });
});

describe('CtaBand', () => {
  test('repeats the slogan and the join CTA', () => {
    wrap(<CtaBand />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent("Shape what's next.");
    expect(screen.getByRole('link', { name: 'Get verified' })).toHaveAttribute('href', '/join');
  });
});

describe('LandingPage', () => {
  test('composes all seven sections in spec order', () => {
    wrap(<LandingPage />);
    const main = screen.getByRole('main');
    const h2s = within(main).getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s[0]).toMatch(/One loop/);
    expect(h2s[1]).toMatch(/dollar figure/);
    expect(h2s[2]).toMatch(/Five levels/);
    expect(h2s[h2s.length - 1]).toBe("Shape what's next.");
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent("Shape what's next.");
  });
  test('uses no banned words', () => {
    wrap(<LandingPage />);
    expect(document.body.textContent).not.toMatch(/\b(synergy|leverage|ecosystem|empower|successfully)\b/i);
    // "unlock" only as the noun in the ladder, never as a verb: no "unlocks?" followed by an object
    expect(document.body.textContent).not.toMatch(/\bunlock(s|ed|ing)?\s+(the|your|a|new)\b/i);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/sections-b.test.jsx 2>&1 | tail -6
```

Expected: FAIL — cannot resolve the new files.

- [ ] **Step 3: Append to `src/sections/sections.css`**

```css

/* Ladder — fanned folders at lg, vertical stack below */
.ladder__stack { display: flex; flex-direction: column; gap: var(--space-md); }
.ladder__stack h3 { margin: 0; }
.ladder__gate {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  opacity: 0.85;
  margin: 4px 0 8px;
  font-variant-numeric: tabular-nums;
}
.ladder__identity { font-family: var(--font-hand); font-size: 18px; margin: 0 0 8px; }
@media (min-width: 1025px) {
  .ladder__stack { flex-direction: row; align-items: flex-start; }
  .ladder__stack > * { flex: 1; margin-left: -16px; }
  .ladder__stack > :first-child { margin-left: 0; }
}

/* Shop + Brands teaser share a two-up row at md */
.aside-row { display: grid; gap: var(--space-xl); align-items: start; }
@media (min-width: 641px) { .aside-row { grid-template-columns: 1fr 1fr; } }

/* CTA band */
.band__inner { display: flex; flex-direction: column; align-items: center; gap: var(--space-lg); text-align: center; }
.band__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-4xl);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-tight);
  margin: 0;
  color: var(--text-on-brand);
}
.band__lede { margin: 0; max-width: 44ch; color: var(--text-on-brand); opacity: 0.9; }
```

- [ ] **Step 4: Write `src/sections/Ladder.jsx`**

Level identities and gates are verbatim from product spec §3.2. Each folder shows the name, the one-line identity, the gate figure, and one representative perk described as access or status — never money.

```jsx
import { FileCard } from 'axelerate-design-system';
import './sections.css';

const LEVELS = [
  { n: 1, name: 'Explorer',    tint: 'paper',  identity: '"I just joined Axelerate"',                      gate: 'Verified student',            perk: 'Student-exclusive shop · open events' },
  { n: 2, name: 'Contributor', tint: 'cyan',   identity: '"I\'m not someone who signed up and vanished"', gate: '300 XP · 3 missions',          perk: 'Public profile goes live · early drop window' },
  { n: 3, name: 'Insider',     tint: 'lilac',  identity: 'Where most active students want to live',       gate: '1,200 XP · 5+ missions',       perk: 'Closed events · pitch your own mission idea' },
  { n: 4, name: 'Trusted',     tint: 'yellow', identity: 'No longer a gig worker — a junior marketing professional', gate: '3,000 XP · 10+ missions · 3+ brands', perk: 'Invite-only launches · internship pipeline' },
  { n: 5, name: 'Partner',     tint: 'violet', identity: 'Part of the Axelerate Talent Network',          gate: '6,000 XP · 25+ missions',      perk: 'Direct brand introductions · annual Creator Summit' },
];

export default function Ladder() {
  return (
    <section id="ladder" className="section" aria-labelledby="ladder-title">
      <div className="wrap">
        <p className="section__kicker">The ladder</p>
        <h2 id="ladder-title" className="section__title">Five levels. Each one is a trust decision.</h2>
        <p className="section__lede">
          XP paces you between levels. Promotion into each band checks four things — volume, breadth,
          on-time rate, standing. Levels are permanent, and they buy access, status and perks — never a
          pay multiplier.
        </p>
        <div className="ladder__stack">
          {LEVELS.map((l, i) => (
            <FileCard key={l.name} tint={l.tint} tab={`LV.${l.n}`} tilt={[-2, 1.5, -1, 2, -1.5][i]}>
              <h3>{l.name}</h3>
              <p className="ladder__identity">{l.identity}</p>
              <p className="ladder__gate">{l.gate}</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{l.perk}</p>
            </FileCard>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write `src/sections/Shop.jsx` and `src/sections/BrandsTeaser.jsx`**

```jsx
// src/sections/Shop.jsx
import { StickyNote } from 'axelerate-design-system';
import './sections.css';

export default function Shop() {
  return (
    <StickyNote tint="yellow" tilt={-1.5} tape label="The shop" heading="Spend it where you earned it">
      <p style={{ margin: '0 0 8px' }}>
        Partner brands at student prices, with cashback credit — always shown as what it buys:{' '}
        <b>2,400 credit · $24 in shop</b>.
      </p>
      <p style={{ margin: 0 }}>One gate: verification. Nothing is held behind a level at checkout.</p>
    </StickyNote>
  );
}
```

```jsx
// src/sections/BrandsTeaser.jsx
import { Link } from 'react-router-dom';
import { Bubble } from 'axelerate-design-system';
import './sections.css';

export default function BrandsTeaser() {
  return (
    <Bubble tone="lilac" tail="bl" tilt={1} who="For brands">
      <p style={{ margin: '0 0 12px' }}>
        Hiring? Post a mission and reach verified students on their own campus — with a receipt for every result.
      </p>
      <Link to="/for-brands" className="ax-btn ax-btn--secondary ax-btn--sm">For brands »</Link>
    </Bubble>
  );
}
```

- [ ] **Step 6: Write `src/sections/CtaBand.jsx`**

```jsx
import { Link } from 'react-router-dom';
import './sections.css';

export default function CtaBand() {
  return (
    <section className="section section--band" aria-labelledby="band-title">
      <div className="wrap band__inner">
        <h2 id="band-title" className="band__title">Shape what's next.</h2>
        <p className="band__lede">Verification opens at launch. Get your name in first.</p>
        <Link to="/join" className="ax-btn ax-btn--yellow ax-btn--lg">Get verified</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Write `src/pages/LandingPage.jsx`**

```jsx
import Hero from '../sections/Hero.jsx';
import Loop from '../sections/Loop.jsx';
import Missions from '../sections/Missions.jsx';
import Ladder from '../sections/Ladder.jsx';
import Shop from '../sections/Shop.jsx';
import BrandsTeaser from '../sections/BrandsTeaser.jsx';
import CtaBand from '../sections/CtaBand.jsx';

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Loop />
      <Missions />
      <Ladder />
      <section className="section" aria-label="Shop and brands">
        <div className="wrap aside-row">
          <Shop />
          <BrandsTeaser />
        </div>
      </section>
      <CtaBand />
    </main>
  );
}
```

- [ ] **Step 8: Run all tests**

```bash
cd /Users/carriewang/axelerate-website-h5 && npm test 2>&1 | tail -8
```

Expected: everything passes. The banned-word test scans the whole rendered landing page — if it fails, the offending word is in copy you wrote; fix the copy, not the test.

- [ ] **Step 9: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/sections src/pages tests/unit/sections-b.test.jsx
git commit -m "Add Ladder, Shop, BrandsTeaser, CtaBand and compose the landing page

The five-level ladder as fanned folders (stacked below lg) showing
access and status, never a pay multiplier (R7). Shop aside states
credit only in its dollar-equivalence form (R1) and the single
verification gate (R4). A page-level test enforces the banned-word
list across all rendered copy.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `/for-brands` page

**Files:**
- Create: `src/pages/ForBrandsPage.jsx`, `src/pages/pages.css`
- Create: `tests/unit/for-brands.test.jsx`

**Interfaces:**
- Consumes: `Card`, `Badge` from the design system; `Icon` from Task 3.
- Produces: `<ForBrandsPage />` routed by Task 10. "Book a call" is a placeholder `href="#"` until the owner names the booking tool (spec §9).

- [ ] **Step 1: Write the failing tests**

```jsx
// tests/unit/for-brands.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForBrandsPage from '../../src/pages/ForBrandsPage.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ForBrandsPage', () => {
  test('is thin by design: one h1, three benefit blocks, one CTA', () => {
    wrap(<ForBrandsPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: 'Book a call' })).toHaveLength(1);
  });
  test('the CTA is an honest placeholder until a booking tool is named', () => {
    wrap(<ForBrandsPage />);
    const cta = screen.getByRole('link', { name: 'Book a call' });
    expect(cta).toHaveAttribute('href', '#');
    expect(screen.getByText(/Booking opens at launch/)).toBeInTheDocument();
  });
  test('states the brand problem from the product spec', () => {
    wrap(<ForBrandsPage />);
    expect(screen.getByText(/paid social/i)).toBeInTheDocument();
    expect(screen.getByText(/distrusted by exactly this audience/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/for-brands.test.jsx 2>&1 | tail -5
```

Expected: FAIL — cannot resolve `ForBrandsPage.jsx`.

- [ ] **Step 3: Write `src/pages/pages.css`**

```css
.page { padding: var(--space-2xl) 0 var(--space-3xl); }
.page__h1 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--text-4xl);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-tight);
  margin: 0 0 var(--space-md);
  max-width: 20ch;
}
.page__lede { font-size: var(--text-lg); color: var(--text-secondary); max-width: 56ch; margin: 0 0 var(--space-xl); }
.benefits { display: grid; gap: var(--space-md); margin: var(--space-xl) 0; }
.benefits h3 { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); margin: 0 0 6px; display: flex; align-items: center; gap: 8px; }
.benefits p { margin: 0; color: var(--text-secondary); font-size: var(--text-sm); }
@media (min-width: 641px) { .benefits { grid-template-columns: repeat(3, 1fr); } }
.page__cta { display: flex; flex-direction: column; gap: var(--space-xs); align-items: flex-start; }
```

- [ ] **Step 4: Write `src/pages/ForBrandsPage.jsx`**

```jsx
import { Card, Badge } from 'axelerate-design-system';
import Icon from '../components/Icon.jsx';
import './pages.css';

const BENEFITS = [
  { icon: 'user', t: 'Verified students', d: 'Every student passes a .edu check, work eligibility, payout setup and reach verification before their first mission.' },
  { icon: 'checklist', t: 'One object: the mission', d: 'Content, field, event, sales — one board, one application pipeline, one payout path.' },
  { icon: 'tick-2', t: 'Proof, not promises', d: 'Every completed mission produces a verifiable work receipt a third party can check.' },
];

export default function ForBrandsPage() {
  return (
    <main className="page">
      <div className="wrap">
        <Badge tone="lilac" tilt={-2}>For brands</Badge>
        <h1 className="page__h1" style={{ marginTop: 'var(--space-md)' }}>Put your brand in students' hands, not just their feed.</h1>
        <p className="page__lede">
          Paid social is expensive and distrusted by exactly this audience. Missions put your product with
          verified students on their own campus — a video, a pop-up, a launch night — and every result comes
          with a receipt.
        </p>
        <div className="benefits">
          {BENEFITS.map((b, i) => (
            <Card key={b.t} variant="quiet" padding="md" tilt={[-1, 0.8, -0.6][i]}>
              <h3><Icon name={b.icon} size={20} style={{ color: 'var(--text-brand)' }} /> {b.t}</h3>
              <p>{b.d}</p>
            </Card>
          ))}
        </div>
        <div className="page__cta">
          <a href="#" className="ax-btn ax-btn--primary ax-btn--lg" onClick={(e) => e.preventDefault()}>Book a call</a>
          <span className="section__note">Booking opens at launch — we'll add the calendar here.</span>
        </div>
      </div>
    </main>
  );
}
```

`section__note` is defined in `sections.css`; import it here too — add `import '../sections/sections.css';` at the top of this file.

- [ ] **Step 5: Run the tests, then commit**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/for-brands.test.jsx 2>&1 | tail -6
git add src/pages/ForBrandsPage.jsx src/pages/pages.css tests/unit/for-brands.test.jsx
git commit -m "Add the /for-brands page

Thin by design per the product spec: the brand problem, three benefit
blocks, one CTA. 'Book a call' is an honest placeholder until the owner
names a booking tool.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: 3 pass, then commit succeeds.

---

### Task 8: `/join` page and the `submitJoin()` seam

**Files:**
- Create: `src/lib/join.js`, `src/pages/JoinPage.jsx`
- Create: `tests/unit/join.test.jsx`

**Interfaces:**
- Consumes: `Input`, `Select`, `Button`, `Toast` from the design system.
- Produces: `submitJoin({ email, name, campus }) → Promise<{ ok: true }>` — **the only exit** for the form. When Supabase arrives, this one function becomes `supabase.auth.signInWithOtp({ email })` (spec §3.4a). `<JoinPage />` routed by Task 10.

- [ ] **Step 1: Write the failing tests**

```jsx
// tests/unit/join.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../src/lib/join.js', () => ({
  submitJoin: vi.fn(async () => ({ ok: true })),
  isEduEmail: (e) => /^[^@\s]+@[^@\s]+\.edu$/i.test(e),
}));

import { submitJoin } from '../../src/lib/join.js';
import JoinPage from '../../src/pages/JoinPage.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('JoinPage', () => {
  beforeEach(() => { submitJoin.mockClear(); });

  test('rejects a non-.edu email and does not call submitJoin', async () => {
    const user = userEvent.setup();
    wrap(<JoinPage />);
    await user.type(screen.getByLabelText('School email'), 'mark@gmail.com');
    await user.type(screen.getByLabelText('Name'), 'Mark');
    await user.click(screen.getByRole('button', { name: 'Get verified' }));
    expect(screen.getByText(/Use your school \.edu address/)).toBeInTheDocument();
    expect(submitJoin).not.toHaveBeenCalled();
  });

  test('calls submitJoin exactly once with the entered values and shows the toast', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    wrap(<JoinPage />);
    await user.type(screen.getByLabelText('School email'), 'mark@ucla.edu');
    await user.type(screen.getByLabelText('Name'), 'Mark');
    await user.selectOptions(screen.getByLabelText('Campus'), 'UCLA');
    await user.click(screen.getByRole('button', { name: 'Get verified' }));
    await waitFor(() => expect(submitJoin).toHaveBeenCalledTimes(1));
    expect(submitJoin).toHaveBeenCalledWith({ email: 'mark@ucla.edu', name: 'Mark', campus: 'UCLA' });
    expect(await screen.findByText('Got it.')).toBeInTheDocument();
    expect(screen.getByText(/nothing is stored yet/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test('lists the four verification steps from §4.3 in order', () => {
    wrap(<JoinPage />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items[0]).toMatch(/^School/);
    expect(items[1]).toMatch(/^Work eligibility/);
    expect(items[2]).toMatch(/^Payout/);
    expect(items[3]).toMatch(/^Reach/);
  });

  test('is honest that nothing is stored', () => {
    wrap(<JoinPage />);
    expect(screen.getByText(/Nothing is stored yet — verification opens at launch/)).toBeInTheDocument();
  });
});

describe('submitJoin (real module)', () => {
  test('resolves ok without touching the network', async () => {
    vi.doUnmock('../../src/lib/join.js');
    const real = await vi.importActual('../../src/lib/join.js');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(real.submitJoin({ email: 'a@b.edu', name: 'A', campus: 'UCLA' })).resolves.toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(real.isEduEmail('x@y.edu')).toBe(true);
    expect(real.isEduEmail('x@y.com')).toBe(false);
    expect(real.isEduEmail('x@y.education')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/join.test.jsx 2>&1 | tail -5
```

Expected: FAIL — cannot resolve `src/lib/join.js`.

- [ ] **Step 3: Write `src/lib/join.js`**

```js
/**
 * The ONLY exit for the /join form. v1 has no backend, so this validates
 * and resolves. When Supabase is connected, this function becomes
 *   supabase.auth.signInWithOtp({ email })
 * — the .edu magic-link flow the product spec §4.3 requires — and nothing
 * else in the app changes. Never call fetch here in v1; a test asserts it.
 */
export function isEduEmail(email) {
  return /^[^@\s]+@[^@\s]+\.edu$/i.test(email.trim());
}

export async function submitJoin({ email, name, campus }) {
  if (!isEduEmail(email)) throw new Error('School email must end in .edu');
  if (!name?.trim()) throw new Error('Name is required');
  void campus; // recorded for the future payload; unused in v1
  return { ok: true };
}
```

- [ ] **Step 4: Write `src/pages/JoinPage.jsx`**

Campuses are an example list — the owner supplies the real one (spec §9).

```jsx
import { useState } from 'react';
import { Input, Select, Button, Toast } from 'axelerate-design-system';
import { submitJoin, isEduEmail } from '../lib/join.js';
import './pages.css';
import '../sections/sections.css';

const CAMPUSES = ['UCLA', 'USC', 'NYU', 'UC Berkeley', 'University of Michigan'];

const STEPS = [
  { t: 'School', d: 'A .edu magic link. It proves who you are and that you are eligible.' },
  { t: 'Work eligibility', d: 'The law requires it before anyone can be paid for work.' },
  { t: 'Payout', d: 'Stripe Connect. We cannot legally pay you without it.' },
  { t: 'Reach', d: 'TikTok or Instagram via OAuth — a typed handle cannot be verified.' },
];

export default function JoinPage() {
  const [form, setForm] = useState({ email: '', name: '', campus: CAMPUSES[0] });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (!isEduEmail(form.email)) { setError('Use your school .edu address.'); return; }
    setError('');
    setBusy(true);
    try {
      await submitJoin(form);
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 560 }}>
        <p className="section__kicker">Join</p>
        <h1 className="page__h1">Get verified.</h1>
        <p className="page__lede">
          Verification is a one-time flow — four steps, then you can take paid missions from day one.
        </p>

        <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 'var(--space-md)' }}>
          <Input
            label="School email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@school.edu"
            value={form.email}
            onChange={set('email')}
            error={error}
            hint={error ? undefined : 'We only accept .edu addresses.'}
          />
          <Input label="Name" name="name" autoComplete="name" value={form.name} onChange={set('name')} />
          <Select label="Campus" name="campus" options={CAMPUSES} value={form.campus} onChange={set('campus')} />
          <Button type="submit" size="lg" disabled={busy}>Get verified</Button>
          <p className="section__note" style={{ marginTop: 4 }}>
            Nothing is stored yet — verification opens at launch.
          </p>
        </form>

        <h2 className="section__title" style={{ fontSize: 'var(--text-2xl)', marginTop: 'var(--space-2xl)' }}>
          What verification checks
        </h2>
        <ol style={{ paddingLeft: '1.2em', display: 'grid', gap: 'var(--space-sm)', margin: 0 }}>
          {STEPS.map((s) => (
            <li key={s.t}>
              <b>{s.t}</b> — <span style={{ color: 'var(--text-secondary)' }}>{s.d}</span>
            </li>
          ))}
        </ol>
        <p className="section__note" style={{ marginTop: 'var(--space-md)' }}>
          Interests, brand follows and wishlists come later — after your first paid mission.
        </p>
      </div>

      {done && (
        <div className="toast-slot">
          <Toast
            tone="success"
            title="Got it."
            description="Verification opens at launch — nothing is stored yet."
            onDismiss={() => setDone(false)}
          />
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Add the toast slot to `src/pages/pages.css`**

This is the app-owned fixed wrapper from spec §3.3: below `md` it spans gutter-to-gutter so Toast's `max-width:100%` resolves against it instead of its own 340px.

```css

/* App-owned wrapper for Toast. Below md it spans gutter-to-gutter, so the
   component's max-width:100% resolves against the viewport, not its own
   340px — the design system is never overridden (spec §3.3). */
.toast-slot {
  position: fixed;
  z-index: 200;
  bottom: var(--gutter);
  left: var(--gutter);
  right: var(--gutter);
}
@media (min-width: 641px) {
  .toast-slot { left: auto; right: var(--space-lg); bottom: var(--space-lg); }
}
```

- [ ] **Step 6: Run the tests**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/join.test.jsx 2>&1 | tail -10
```

Expected: 5 pass. If `getByLabelText('School email')` fails, the design system's `Input` may not associate `<label>` with the control via `htmlFor`/`id` — check the rendered DOM with `screen.debug()`. If it renders the label as a sibling without `for`, pass an explicit `id` prop to `Input` and match on it; report this as a design-system accessibility gap in your report rather than working around it silently.

- [ ] **Step 7: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/lib src/pages/JoinPage.jsx src/pages/pages.css tests/unit/join.test.jsx
git commit -m "Add the /join page behind a single submitJoin() seam

UI only — nothing is submitted, and a test asserts fetch is never
called. submitJoin() in src/lib/join.js is the form's only exit so the
Supabase magic-link swap later touches one file. The four verification
steps from the product spec are explained with why each is required.
Toast lives in an app-owned fixed wrapper that spans gutter-to-gutter
below md, so the component is never overridden.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Legal pages

**Files:**
- Create: `src/pages/LegalPage.jsx`, `src/pages/legal-content.js`
- Create: `tests/unit/legal.test.jsx`

**Interfaces:**
- Produces: `<LegalPage kind="terms" | "privacy" | "payouts" />` routed by Task 10 at `/legal/:kind`. Headed drafts only — real legal text is the owner's (spec §9).

- [ ] **Step 1: Write the failing tests**

```jsx
// tests/unit/legal.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LegalPage from '../../src/pages/LegalPage.jsx';
import { LEGAL } from '../../src/pages/legal-content.js';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('LegalPage', () => {
  test.each(['terms', 'privacy', 'payouts'])('%s renders its title, section headings, and the draft notice', (kind) => {
    wrap(<LegalPage kind={kind} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(LEGAL[kind].title);
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual(LEGAL[kind].sections);
    expect(screen.getByText(/Draft — legal text to follow/)).toBeInTheDocument();
  });
  test('payouts has its own page, as the product spec requires', () => {
    expect(LEGAL.payouts.sections).toContain('Stripe Connect');
  });
  test('unknown kind renders the not-found copy, not a crash', () => {
    wrap(<LegalPage kind="cookies" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not found/i);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/legal.test.jsx 2>&1 | tail -5
```

Expected: FAIL — cannot resolve the files.

- [ ] **Step 3: Write `src/pages/legal-content.js`**

```js
// Section headings the owner will fill. v1 ships headed drafts only.
export const LEGAL = {
  terms: {
    title: 'Terms of service',
    sections: ['Acceptance', 'Eligibility', 'Missions and payment', 'Content and disclosure', 'Account standing', 'Changes to these terms'],
  },
  privacy: {
    title: 'Privacy',
    sections: ['What we collect', 'How we use it', 'Verification data', 'Sharing', 'Your choices', 'Contact'],
  },
  payouts: {
    title: 'Payout terms',
    sections: ['How payouts work', 'Stripe Connect', 'Timing', 'Taxes', 'Disputes'],
  },
};
```

- [ ] **Step 4: Write `src/pages/LegalPage.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { LEGAL } from './legal-content.js';
import './pages.css';
import '../sections/sections.css';

export default function LegalPage({ kind }) {
  const doc = LEGAL[kind];
  if (!doc) {
    return (
      <main className="page"><div className="wrap">
        <h1 className="page__h1">Page not found.</h1>
        <p className="page__lede"><Link to="/">Back to the start »</Link></p>
      </div></main>
    );
  }
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <p className="section__kicker">Legal</p>
        <h1 className="page__h1">{doc.title}</h1>
        <p className="section__note" style={{ marginBottom: 'var(--space-xl)' }}>Draft — legal text to follow.</p>
        {doc.sections.map((s) => (
          <section key={s} style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 className="section__title" style={{ fontSize: 'var(--text-xl)' }}>{s}</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>This section will be published before launch.</p>
          </section>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run the tests, then commit**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/legal.test.jsx 2>&1 | tail -6
git add src/pages/LegalPage.jsx src/pages/legal-content.js tests/unit/legal.test.jsx
git commit -m "Add headed draft legal pages: terms, privacy, payouts

Payouts gets its own page as the product spec requires. Each page
ships its section headings and a visible draft notice; the legal text
itself is the owner's to supply.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: 5 pass, commit succeeds.

---

### Task 10: Router, shell, 404, hash scrolling

**Files:**
- Modify: `src/App.jsx` (replace contents)
- Create: `src/components/ScrollToHash.jsx`, `src/pages/NotFoundPage.jsx`
- Create: `tests/unit/app.test.jsx`

**Interfaces:**
- Consumes: every page from Tasks 6–9; `Nav`, `Footer` from Task 3.
- Produces: the complete routed application.

- [ ] **Step 1: Write the failing tests**

```jsx
// tests/unit/app.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('App routing', () => {
  test('/ renders the landing page inside the shell', () => {
    at('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Shape what's next.");
    expect(screen.getByRole('banner')).toBeInTheDocument();      // <header>
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // <footer>
  });
  test('/for-brands', () => { at('/for-brands'); expect(screen.getByRole('link', { name: 'Book a call' })).toBeInTheDocument(); });
  test('/join',       () => { at('/join');       expect(screen.getByRole('button', { name: 'Get verified' })).toBeInTheDocument(); });
  test.each([['terms', 'Terms of service'], ['privacy', 'Privacy'], ['payouts', 'Payout terms']])(
    '/legal/%s', (kind, title) => { at(`/legal/${kind}`); expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title); }
  );
  test('unknown path renders the 404 inside the shell', () => {
    at('/nope');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not found/i);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
  test('every page has exactly one main landmark', () => {
    for (const p of ['/', '/for-brands', '/join', '/legal/terms', '/nope']) {
      const { unmount } = at(p);
      expect(screen.getAllByRole('main')).toHaveLength(1);
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/app.test.jsx 2>&1 | tail -5
```

Expected: FAIL — the Task 1 `App` has no routes or shell.

- [ ] **Step 3: Write `src/components/ScrollToHash.jsx`**

Nav links use `/#loop` and `/#ladder`; react-router does not scroll to hashes by itself.

```jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
```

- [ ] **Step 4: Write `src/pages/NotFoundPage.jsx`**

```jsx
import { Link } from 'react-router-dom';
import './pages.css';

export default function NotFoundPage() {
  return (
    <main className="page"><div className="wrap">
      <h1 className="page__h1">That page isn't here. Not found.</h1>
      <p className="page__lede">Try the start, or the missions board when it opens.</p>
      <Link to="/" className="ax-btn ax-btn--primary">Back to the start</Link>
    </div></main>
  );
}
```

- [ ] **Step 5: Replace `src/App.jsx`**

```jsx
import { Routes, Route, useParams } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import ScrollToHash from './components/ScrollToHash.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ForBrandsPage from './pages/ForBrandsPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import LegalPage from './pages/LegalPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function LegalRoute() {
  const { kind } = useParams();
  return <LegalPage kind={kind} />;
}

export default function App() {
  return (
    <>
      <ScrollToHash />
      <Nav />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/for-brands" element={<ForBrandsPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/legal/:kind" element={<LegalRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
    </>
  );
}
```

`scrollIntoView` does not exist in jsdom. If the app test throws on it, add `Element.prototype.scrollIntoView = () => {};` and `window.scrollTo = () => {};` to `tests/unit/setup.js`.

- [ ] **Step 6: Run the full unit suite and the build**

```bash
cd /Users/carriewang/axelerate-website-h5 && npm test 2>&1 | tail -8 && npm run build 2>&1 | tail -4
```

Expected: all unit tests pass; build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/App.jsx src/components/ScrollToHash.jsx src/pages/NotFoundPage.jsx tests/unit/app.test.jsx tests/unit/setup.js
git commit -m "Wire the router, shared shell, hash scrolling, and 404

Five routes plus a catch-all, all inside the Nav/Footer shell. Hash
links from the nav scroll to their section; every other navigation
resets to the top.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Playwright — the overflow guard and mobile behaviours

**Files:**
- Create: `playwright.config.js`, `tests/e2e/responsive.spec.js`

**Interfaces:**
- Consumes: the built app via `vite preview`.
- Produces: the regression guard the project exists for.

- [ ] **Step 1: Write `playwright.config.js`**

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4173', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Write `tests/e2e/responsive.spec.js`**

```js
import { test, expect } from '@playwright/test';

const ROUTES = ['/', '/for-brands', '/join', '/legal/terms', '/legal/privacy', '/legal/payouts', '/definitely-not-a-page'];
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
  for (const [w, expected] of [[375, '34px'], [800, '46px'], [1280, '60px']]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('/');
    const v = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-5xl').trim());
    expect(v, `--text-5xl at ${w}`).toBe(expected);
  }
});

test('nav: hamburger at 375, inline links at 1280', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  await expect(page.locator('.nav__links')).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
  await expect(page.locator('.nav__links')).toBeVisible();
});

test('mobile sheet opens, navigates, and closes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const sheet = page.getByRole('dialog', { name: 'Menu' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('link', { name: 'For brands' }).click();
  await expect(page).toHaveURL(/\/for-brands$/);
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toContainText("students' hands");
});

test('join toast at 320px lies within the viewport and nothing is fetched', async ({ page }) => {
  const requests = [];
  page.on('request', (r) => { if (r.resourceType() === 'fetch' || r.resourceType() === 'xhr') requests.push(r.url()); });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/join');
  await page.getByLabel('School email').fill('mark@ucla.edu');
  await page.getByLabel('Name').fill('Mark');
  await page.getByRole('button', { name: 'Get verified' }).click();
  const toast = page.getByText('Got it.');
  await expect(toast).toBeVisible();
  const box = await toast.locator('xpath=ancestor::*[contains(@class,"ax-toast")]').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(requests, 'no fetch/xhr should fire from app code').toEqual([]);
});

test('hash links scroll to their sections', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('link', { name: 'The ladder' }).first().click();
  await expect(page).toHaveURL(/#ladder$/);
  const top = await page.evaluate(() => document.getElementById('ladder').getBoundingClientRect().top);
  expect(top).toBeLessThan(120);
});
```

- [ ] **Step 3: Run it**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx playwright test 2>&1 | tail -25
```

Expected: 42 overflow tests + 5 behaviour tests pass. **If an overflow test fails, the fix is in app CSS — never in the design system, never by loosening the assertion.** The usual culprits: a fixed `width` on a section child, a `FileCard` fan whose negative margins exceed the container below lg (the `.ladder__stack` media query must keep `flex-direction: column` below 1025), or the hero's `--text-5xl` line being one long unbreakable word.

The `networkidle` wait exists because Google Fonts loads at runtime. The overflow assertion does not depend on fonts having loaded — it is layout, not paint — but waiting avoids a race with `font-display: swap` reflow.

- [ ] **Step 4: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add playwright.config.js tests/e2e
git commit -m "Add Playwright overflow guard and mobile behaviour tests

Every route at 320/375/414/768/1024/1280 must not scroll horizontally.
Also asserts the token tiers resolve in a real browser, the hamburger
and inline nav swap at the lg breakpoint, the mobile sheet navigates,
the join toast fits a 320px viewport, and no fetch ever fires.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: README and final verification

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: everything.
- Produces: the repo's front door and a verified final state.

- [ ] **Step 1: Write `README.md`**

````markdown
# Axelerate website

The public website for Axelerate — paid brand missions for verified college students.
**Shape what's next.**

Fully responsive from 320px to 1280px+, built on
[`axelerate-design-system`](https://github.com/cakkrie/axelerate-design-system) without
editing or forking it.

## Run it

```bash
npm install          # needs git access to the private design-system repo
npm run dev          # http://localhost:5173
npm test             # Vitest unit tests
npm run test:e2e     # Playwright — builds, previews, runs the overflow guard
npm run build        # dist/
```

## How responsiveness works

The design system has no media queries; every token sits on a bare `:root{}`.
`src/styles/responsive.css` is loaded **after** the system's `styles.css` and redefines
nine typographic/spacing tokens across three mobile-first tiers (≤640, 641–1024, ≥1025).
Same specificity, later source order — ours wins. The `lg` tier is the system's own
values, so desktop renders exactly as the system intends.

**The import order in `src/main.jsx` is load-bearing.** A test asserts it.

**We never override a design-system component's CSS.** Layout problems are solved in our
own containers (see `.toast-slot`) and in the token layer. Anything that genuinely can't
be is raised against the design-system repo.

## Pages

| Route | What |
| --- | --- |
| `/` | Student landing — slogan, the loop, example missions, the ladder, shop aside, CTA |
| `/for-brands` | Thin brand page → "Book a call" (placeholder until a booking tool is named) |
| `/join` | Sign-up form — **UI only, nothing is submitted** |
| `/legal/terms` · `/legal/privacy` · `/legal/payouts` | Headed drafts; legal text to follow |

## What's deliberately not here

- **No backend.** The owner will connect **Supabase** (auth, missions, profiles) and
  **Shopify** (shop, drops, checkout) later. Two seams are shaped for them:
  `src/lib/join.js` → `submitJoin()` is the join form's only exit (becomes
  `supabase.auth.signInWithOtp`); `src/data/missions.example.json` is flat records that
  become the `missions` seed.
- **No dynamic routes** (`/u/…`, `/m/…`, `/shop/…`). They need data and indexability; the
  SSG/SSR framework decision is reopened when they arrive.
- **No CI.** The design-system dependency is private; CI needs a deploy key first.
- **No campus theming, dark canvas, XP ring, or level-up motion.** Those belong to the
  auth-gated app and conflict with the design system as shipped — tracked in
  axelerate-design-system#1.

## Content authority

Copy, audience, and business rules come from the owner's product specification
(`.superpowers/specs/2026-08-25-axelerate-product-specification.md`), **not** from the
design system's `readme.md`, whose positioning describes an earlier concept. Voice
mechanics (sentence case, verb-first, numerals, no emoji) still follow the design system.

## Owner to supply

- "Book a call" destination · real legal text · the campus list for `/join`.
````

- [ ] **Step 2: Run everything one last time**

```bash
cd /Users/carriewang/axelerate-website-h5
npm test 2>&1 | tail -4
npx playwright test 2>&1 | tail -4
npm run build 2>&1 | tail -3
echo "--- raw hex in app code (expect 0) ---"; grep -rnE '#[0-9a-fA-F]{3,8}\b' src --include='*.jsx' --include='*.css' | grep -v 'href="#"' | grep -v "to: '/#" | grep -v 'href="#loop"' | wc -l
echo "--- banned words in src (expect 0) ---"; grep -rniE '\b(synergy|leverage|ecosystem|empower|successfully)\b' src | wc -l
echo "--- old positioning leaked? (expect 0) ---"; grep -rniE 'request invite|inside track|grab a seat' src | wc -l
echo "--- design system untouched (expect empty) ---"; cd node_modules/axelerate-design-system && git status --short 2>/dev/null | head -3; cd - >/dev/null
```

Expected: unit and e2e both pass, build succeeds, and all four counts are 0 / empty.

- [ ] **Step 3: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add README.md
git commit -m "Add README

Documents the token-override mechanism, the load-bearing import order,
the never-override-components rule, the five routes, the Supabase and
Shopify seams, and what is deliberately absent.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git log --oneline | head -14
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
| --- | --- |
| §1.1 two sources of truth; readme positioning superseded | Tasks 5, 6 (copy), 6 (test forbids old copy), 12 (README) |
| §2/§3.2 token override layer, exact values | Task 2 |
| §3.1 stylesheet order, load-bearing, tested | Task 1 |
| §3.3 no component overrides; Toast wrapper in the app | Task 8 (`.toast-slot`), Task 11 (320px toast test) |
| §3.4 routing, 404, SPA | Task 10 |
| §3.4a Supabase seam `submitJoin()` | Task 8 |
| §3.4a missions fixture as flat records | Task 4 |
| §3.4a no product/cart shapes | Task 6 (Shop is copy only) |
| §3.5 font preconnect | Task 1 (`index.html`) |
| §4 `/` eight sections | Tasks 5, 6 (Footer is the shell, Task 3) |
| §4 `/for-brands` | Task 7 |
| §4 `/join` UI-only + four steps | Task 8 |
| §4 `/legal/*` headed drafts | Task 9 |
| §4 rules R1 R7 R8 R9 | Task 4 (R1, R8, R9 tests), Task 6 (R7, R1 tests) |
| §5 voice mechanics, banned words, "unlock" ruling | Task 6 page-level test, Task 12 grep |
| §6 dependency, `.jsx` transpilation | Task 1 (smoke test + `server.deps.inline`) |
| §7 unit tests — every item | Tasks 1, 3, 4, 8 |
| §7 e2e — overflow guard on every route × 6 widths, nav swap, toast in viewport, navigation + 404 | Task 11 |
| §9 owner placeholders honest | Tasks 7, 8, 9 |
| No CI (§6) | Not built — deliberate; README states it |

**Deviation from spec, flagged:** spec §4 lists Footer as landing-page section 8. This plan makes Footer part of the shared shell (Task 3, rendered by `App` in Task 10) so all five pages get it. Same content, better placement.

**Placeholder scan:** The only intentional placeholders are product-level and documented in the spec's §9 — `href="#"` on "Book a call", headed legal drafts, the example campus list. Dev-dependency versions are unpinned by design (Task 1 Step 2 records what npm resolves). No TBD/TODO in plan text.

**Type consistency:** `submitJoin({ email, name, campus })` and `isEduEmail(email)` are named identically in Task 8's module, test mock, and page. `MissionCard` props `mission`, `locked: { xpAway, missionsAway }`, `tilt` match between Task 4 (definition + tests) and Task 5 (`Missions.jsx`). `NAV_LINKS` is exported from `NavSheet.jsx` and consumed by `Nav.jsx` in the same task. `LEGAL[kind].title/.sections` shape matches between `legal-content.js`, `LegalPage.jsx`, and the test. Section ids `loop` and `ladder` match the nav hrefs `/#loop`, `/#ladder`, the `ScrollToHash` lookup, and the e2e hash test. Data-testid `mission-card` and `data-locked` match between Task 4 and Task 5's test. Aria names `Open menu`, `Close menu`, `Menu` match between Task 3 component, Task 3 tests, and Task 11 e2e.
