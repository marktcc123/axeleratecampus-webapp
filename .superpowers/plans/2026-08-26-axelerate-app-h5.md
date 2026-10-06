# Axelerate App (H5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four-tab Axelerate app — Gigs · Perks · Application · Me — under `/app/*` in the existing website repo, with the Gigs board and mission detail built exactly as drawn in Claude Design and the other three screens built from the product spec.

**Architecture:** The app is a phone-width column (`max-width: 520px`, centred) nested under one `<Route path="/app" element={<AppShell/>}>` so the shell, floating tab bar and preview marker mount once. The marketing site keeps `/`, `/for-brands`, `/join`, `/legal/*`; `App.jsx` splits on the route prefix so the marketing `Nav`/`Footer` and the app `TabBar` never both render. The prototype's `<sc-if>`/`<sc-for>`/`<x-import>`/`DCLogic` translate to conditional renders, `.map()`, real design-system imports and `useState`; the prototype's ~200 inline styles move to token-based CSS files.

**Tech Stack:** Node 20+, Vite, React 18, react-router-dom 6, Vitest + Testing Library, Playwright. Design system consumed as a pinned git dependency.

**Spec:** `.superpowers/specs/2026-08-26-axelerate-app-h5-design.md`. Content authority: `.superpowers/specs/2026-08-25-axelerate-product-specification.md`. The marketing site's spec `.superpowers/specs/2026-08-25-axelerate-website-h5-design.md` still binds unless overridden.

## Global Constraints

- **Repo:** `/Users/carriewang/axelerate-website-h5` (branch `main`, clean, 84 unit + 47 e2e green). Task 1 also touches `/Users/carriewang/axelerate-design-system`.
- **Never edit the design system's existing files.** Task 1 adds 18 new asset files to it; nothing else in that repo changes, ever.
- **No app selector targets an `.ax-*` class.** The design system injects component `<style>` at JS-execution time, *after* the bundle, so any app rule at (0,1,0) competing with an `ax-*` class on the same element loses. Scope such rules under a container to reach (0,2,0) — see the comment atop `src/components/shell.css`.
- **Stylesheet order in `src/main.jsx` is load-bearing** and asserted by `tests/unit/stylesheet-order.test.js`: `axelerate-design-system/styles.css`, then `./styles/responsive.css`, then the barrel import. Exactly two `.css` imports.
- **No raw hex colours in app code.** Every colour is a `var(--token)`. Every token the design uses already exists in the pin — verified.
- **No backend, no network.** `fetch` is never called by app code. Apply never submits.
- **Voice mechanics:** sentence case everywhere including buttons; numerals always; no emoji; banned words: synergy, leverage, ecosystem, empower, "successfully"; "unlock" only as a noun for a ladder perk, never a verb.
- **Product rules:** **R1** cash leads every card and **credit is never a bare number** — only `8,000 credit · $80 in shop` form, 100 credit = $1 · **R4** the shop's one gate is verification · **R7** levels buy access and status, never a pay multiplier · **R8** anything locked shows its distance in XP and missions, never the word "locked" alone · **R9** one tier scale, names Open / Contributor / Insider / Trusted / Partner.
- **Every `/app/*` screen carries the "Preview · example data" marker.** Nothing may imply a real account, stored data, or a submitted application.
- **Test locations:** unit in `tests/unit/**/*.test.{js,jsx}` (Vitest), e2e in `tests/e2e/**/*.spec.js` (Playwright). The runners must not pick up each other's files.
- **Commit trailer** on every commit: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Design-system assets, and re-pin

**Files:**
- Create (in `/Users/carriewang/axelerate-design-system`): `assets/icons-solid/{bag,bell,bookmark,calendar,checklist,coffee-cup-2,crown,fire,pin,play,rocket,star,tick-2,trophy,user,zap}.svg` (16), `assets/doodles/{sparkle-volt,underline-volt}.svg` (2)
- Modify (in `/Users/carriewang/axelerate-website-h5`): `package.json` (dependency ref), `package-lock.json`

**Interfaces:**
- Consumes: Claude Design project `d024eb9f-078b-4ba6-83bb-686203fc8209` via the `DesignSync` MCP tool
- Produces: `node_modules/axelerate-design-system/assets/icons-solid/*.svg` available to the app; the new design-system commit SHA recorded in `package.json`

**You will need the `DesignSync` MCP tool.** It is a deferred tool — load it with `ToolSearch` using the query `select:DesignSync` before calling it. Read a file with:
`DesignSync({ method: 'get_file', projectId: 'd024eb9f-078b-4ba6-83bb-686203fc8209', path: '<path>' })`

- [ ] **Step 1: Confirm the design-system repo state**

```bash
cd /Users/carriewang/axelerate-design-system
git status --porcelain          # expect empty
git log --oneline -1            # expect 7cf20a6 (or later) as tip
ls assets/                      # expect: doodles  icons   (no icons-solid)
node scripts/validate.mjs | tail -2
```

Expected: clean tree, no `icons-solid` directory, validation passes.

- [ ] **Step 2: Fetch the 18 SVGs and write them to disk**

For each of the 18 paths below, call `DesignSync` `get_file` and write the returned `content` verbatim to the matching local path. **Do not reformat, minify, or "optimise" the SVG source** — these are design-system assets and must land byte-identical to the export.

Remote → local, all 18:

| Remote path (prefix `_ds/axelerate-design-system-edbc1fdd-3533-465f-a65d-498ff1b475f9/` is NOT used — these live at project root) | Local path |
| --- | --- |
| `assets/icons-solid/bag.svg` | `assets/icons-solid/bag.svg` |
| `assets/icons-solid/bell.svg` | `assets/icons-solid/bell.svg` |
| `assets/icons-solid/bookmark.svg` | `assets/icons-solid/bookmark.svg` |
| `assets/icons-solid/calendar.svg` | `assets/icons-solid/calendar.svg` |
| `assets/icons-solid/checklist.svg` | `assets/icons-solid/checklist.svg` |
| `assets/icons-solid/coffee-cup-2.svg` | `assets/icons-solid/coffee-cup-2.svg` |
| `assets/icons-solid/crown.svg` | `assets/icons-solid/crown.svg` |
| `assets/icons-solid/fire.svg` | `assets/icons-solid/fire.svg` |
| `assets/icons-solid/pin.svg` | `assets/icons-solid/pin.svg` |
| `assets/icons-solid/play.svg` | `assets/icons-solid/play.svg` |
| `assets/icons-solid/rocket.svg` | `assets/icons-solid/rocket.svg` |
| `assets/icons-solid/star.svg` | `assets/icons-solid/star.svg` |
| `assets/icons-solid/tick-2.svg` | `assets/icons-solid/tick-2.svg` |
| `assets/icons-solid/trophy.svg` | `assets/icons-solid/trophy.svg` |
| `assets/icons-solid/user.svg` | `assets/icons-solid/user.svg` |
| `assets/icons-solid/zap.svg` | `assets/icons-solid/zap.svg` |
| `assets/doodles/sparkle-volt.svg` | `assets/doodles/sparkle-volt.svg` |
| `assets/doodles/underline-volt.svg` | `assets/doodles/underline-volt.svg` |

```bash
cd /Users/carriewang/axelerate-design-system && mkdir -p assets/icons-solid
```

- [ ] **Step 3: Verify the assets are real SVGs and nothing else changed**

```bash
cd /Users/carriewang/axelerate-design-system
echo "solid: $(ls assets/icons-solid/*.svg | wc -l | tr -d ' ')  (expect 16)"
echo "doodles: $(ls assets/doodles/*.svg | wc -l | tr -d ' ')  (expect 6)"
for f in assets/icons-solid/*.svg assets/doodles/sparkle-volt.svg assets/doodles/underline-volt.svg; do
  head -c 200 "$f" | grep -q '<svg' || echo "NOT AN SVG: $f"
done; echo "svg check done"
git status --porcelain | grep -v '^?? assets/' && echo "UNEXPECTED CHANGE ABOVE" || echo "only new assets are untracked"
git diff --stat  # expect empty — no existing file modified
```

Expected: 16 solid, 6 doodles, no "NOT AN SVG" lines, `git diff --stat` empty.

- [ ] **Step 4: Run the design system's own validation**

```bash
cd /Users/carriewang/axelerate-design-system && node scripts/validate.mjs
```

Expected: `All checks passed.` The inventory line's icon count reports `assets/icons` only (38) — `icons-solid` is a new directory the validator does not scan. **That is a gap: report it as a concern, do not modify `scripts/validate.mjs` in this task.**

- [ ] **Step 5: Commit and push the design-system change**

```bash
cd /Users/carriewang/axelerate-design-system
git add assets/icons-solid assets/doodles
git commit -m "Add solid icon set and volt doodles

16 solid icons (assets/icons-solid/) and 2 volt doodles, taken from the
Claude Design export used by the Missions Board H5 design. bag.svg has
no outline counterpart in either export and is required by the app's
Perks tab.

Additive only: no existing file is modified, and the export's
typography is deliberately NOT adopted — this repo's Gabarito/Lacquer
is the newer revision. See the consuming app's spec §6.1.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git push
NEW_SHA=$(git rev-parse --short HEAD) && echo "NEW DS SHA: $NEW_SHA"
```

- [ ] **Step 6: Re-pin the website and install**

Replace the `#7cf20a6` ref in `package.json` with the SHA from Step 5.

```bash
cd /Users/carriewang/axelerate-website-h5
sed -i '' "s|axelerate-design-system#7cf20a6|axelerate-design-system#<NEW_SHA>|" package.json
grep -n 'axelerate-design-system' package.json
npm install 2>&1 | tail -3
ls node_modules/axelerate-design-system/assets/icons-solid/*.svg | wc -l | tr -d ' '   # expect 16
ls node_modules/axelerate-design-system/assets/icons/*.svg | wc -l | tr -d ' '         # expect 38 — outline set intact
grep -c "Gabarito" node_modules/axelerate-design-system/tokens/fonts.css               # expect 1 — fonts unchanged
```

- [ ] **Step 7: Prove the existing site is unaffected**

```bash
cd /Users/carriewang/axelerate-website-h5
npm test 2>&1 | tail -4          # expect 84 pass
npm run build 2>&1 | tail -3     # expect success
```

Expected: 84 pass, build succeeds. If a test fails, the re-pin changed something it should not have — stop and report; do not adjust tests.

- [ ] **Step 8: Commit the re-pin**

```bash
cd /Users/carriewang/axelerate-website-h5
git add package.json package-lock.json
git commit -m "Re-pin the design system to the commit carrying the solid icon set

The app's tab bar and mission tiles use solid icons, and Perks needs
bag.svg, which exists in no earlier export. Additive change only: the
38-icon outline set and the Gabarito/Lacquer typography are unchanged,
verified after install.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: App shell, tab bar, routes

**Files:**
- Create: `src/app/AppShell.jsx`, `src/app/TabBar.jsx`, `src/app/PreviewMarker.jsx`, `src/app/ImageSlot.jsx`, `src/app/app.css`
- Modify: `src/App.jsx`, `src/components/Icon.jsx`
- Test: `tests/unit/app-shell.test.jsx`

**Interfaces:**
- Consumes: `Icon` from `src/components/Icon.jsx` (Task 2 extends it with a `set` prop); `Badge` from the design system
- Produces:
  - `<AppShell />` — renders `<PreviewMarker/>`, `<Outlet/>`, `<TabBar/>`; used as the element of `<Route path="/app">`
  - `<TabBar />` — 4 `NavLink`s to `/app/gigs`, `/app/perks`, `/app/application`, `/app/me`
  - `<ImageSlot label="…" ratio="1/1" radius={10} />` — dashed placeholder
  - `<Icon name="rocket" set="solid" size={21} />` — the extended signature; `set` defaults to `'outline'`

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/app-shell.test.jsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import ImageSlot from '../../src/app/ImageSlot.jsx';
import Icon from '../../src/components/Icon.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('Icon set prop', () => {
  test('outline is the default and solid pulls from icons-solid', () => {
    const { container: a } = render(<Icon name="rocket" />);
    expect(a.querySelector('i.ax-icon').style.getPropertyValue('--icon')).toMatch(/icons\/rocket/);
    const { container: b } = render(<Icon name="rocket" set="solid" />);
    expect(b.querySelector('i.ax-icon').style.getPropertyValue('--icon')).toMatch(/icons-solid\/rocket/);
  });
  test('throws a named error for an icon that is not in the set', () => {
    expect(() => render(<Icon name="definitely-not-an-icon" set="solid" />)).toThrow(/definitely-not-an-icon/);
  });
});

describe('ImageSlot', () => {
  test('renders its caption and is decorative to assistive tech', () => {
    const { container } = render(<ImageSlot label="Solra product shot" />);
    expect(screen.getByText('Solra product shot')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('app shell', () => {
  test('/app redirects to the Gigs tab', () => {
    at('/app');
    expect(screen.getByRole('navigation', { name: 'App' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gigs' })).toHaveAttribute('aria-current', 'page');
  });

  test('the tab bar has exactly the four designed tabs, in order', () => {
    at('/app/gigs');
    const bar = screen.getByRole('navigation', { name: 'App' });
    const labels = within(bar).getAllByRole('link').map((a) => a.textContent.trim());
    expect(labels).toEqual(['Gigs', 'Perks', 'Application', 'Me']);
  });

  test.each([
    ['/app/gigs', 'Gigs'],
    ['/app/perks', 'Perks'],
    ['/app/application', 'Application'],
    ['/app/me', 'Me'],
  ])('%s marks %s as the current tab', (path, label) => {
    at(path);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  });

  test('every app screen carries the preview marker', () => {
    for (const p of ['/app/gigs', '/app/perks', '/app/application', '/app/me']) {
      const { unmount } = at(p);
      expect(screen.getByText('Preview · example data')).toBeInTheDocument();
      unmount();
    }
  });

  test('the marketing shell does not render inside the app', () => {
    at('/app/gigs');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  test('the app tab bar does not render on the marketing site', () => {
    at('/');
    expect(screen.queryByRole('navigation', { name: 'App' })).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  test('an unknown app path renders not-found inside the app shell', () => {
    at('/app/nope');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/isn't here/);
    expect(screen.getByRole('navigation', { name: 'App' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run tests/unit/app-shell.test.jsx 2>&1 | tail -6
```

Expected: FAIL — cannot resolve `src/app/ImageSlot.jsx`.

- [ ] **Step 3: Extend `src/components/Icon.jsx`**

Replace the single glob with two, keyed by set. Keep `query: '?url&no-inline'` — plain `?url` inlines sub-4KB SVGs as data URIs, which breaks the filename assertion and bloats the bundle.

```jsx
// Tints a design-system doodle icon via the system's .ax-icon mask utility.
// Vite resolves each SVG to a URL. `no-inline` matters: without it, icons
// under Vite's 4KB assetsInlineLimit become base64 data URIs baked into the
// JS bundle, and all 38+16 are globbed eagerly.
const SETS = {
  outline: import.meta.glob('/node_modules/axelerate-design-system/assets/icons/*.svg', {
    eager: true, query: '?url&no-inline', import: 'default',
  }),
  solid: import.meta.glob('/node_modules/axelerate-design-system/assets/icons-solid/*.svg', {
    eager: true, query: '?url&no-inline', import: 'default',
  }),
};
const DIRS = { outline: 'icons', solid: 'icons-solid' };

export default function Icon({ name, set = 'outline', size = 22, style, ...rest }) {
  const src = SETS[set]?.[`/node_modules/axelerate-design-system/assets/${DIRS[set]}/${name}.svg`];
  if (!src) throw new Error(`Icon "${name}" is not in the design system's ${set} icon set`);
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

- [ ] **Step 4: Write `src/app/app.css`**

```css
/* App shell. Colours are tokens only.
   Note the (0,2,0) scoping rule from src/components/shell.css: any rule here
   that competes with an ax-* class on the same element is scoped under .app. */

.app {
  min-height: 100vh;
  background: var(--surface-page);
  font-family: var(--font-body);
}
.app__col {
  max-width: 520px;
  margin: 0 auto;
  padding: 16px 16px calc(104px + env(safe-area-inset-bottom, 0px));
}

/* Preview marker — states once per screen that the data is not real. */
.app__preview {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 14px;
  font-family: var(--font-label);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--warning-fg);
  background: var(--warning-bg);
  padding: 6px 10px;
  border-radius: var(--radius-hand-sm);
}

/* Tab bar — floating pill, safe-area aware. */
.app__tabs {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 40;
  display: flex;
  gap: 10px;
  padding: 8px;
  background: var(--gray-0);
  border-radius: var(--radius-pill);
  box-shadow: var(--sticker-cut), var(--shadow-paper-lg);
}
.app .app__tab {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-pill);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  background: var(--gray-0);
  box-shadow: inset 0 0 0 1.5px var(--gray-200);
  color: var(--gray-600);
  transition: background var(--dur-fast) var(--ease-launch), color var(--dur-fast) var(--ease-launch);
}
.app .app__tab[aria-current='page'] {
  background: var(--ink-900);
  box-shadow: none;
  color: var(--accent-yellow);
}
.app__tab-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ImageSlot — dashed placeholder standing in for photography that does not exist. */
.app__slot {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8px;
  box-sizing: border-box;
  background: var(--surface-quiet);
  border: 1.5px dashed var(--gray-300);
  color: var(--gray-600);
  font-family: var(--font-hand);
  font-size: 15px;
  line-height: 1.25;
}
```

- [ ] **Step 5: Write `src/app/PreviewMarker.jsx` and `src/app/ImageSlot.jsx`**

```jsx
// src/app/PreviewMarker.jsx
import Icon from '../components/Icon.jsx';
import './app.css';

export default function PreviewMarker() {
  return (
    <p className="app__preview">
      <Icon name="info" size={13} />
      Preview · example data
    </p>
  );
}
```

```jsx
// src/app/ImageSlot.jsx
import './app.css';

// Stands in for photography that does not exist yet. Decorative: the caption
// describes the shot for whoever supplies it, not for a screen reader.
export default function ImageSlot({ label, ratio = '1 / 1', radius = 10, style }) {
  return (
    <div
      aria-hidden="true"
      className="app__slot"
      style={{ aspectRatio: ratio, borderRadius: radius, ...style }}
    >
      <span>{label}</span>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/app/TabBar.jsx`**

```jsx
import { NavLink } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import './app.css';

// Labels are the design's, not the product spec's §4.2 (superseded — see
// the app spec §2.1). Icons are the solid set.
const TABS = [
  { to: '/app/gigs', label: 'Gigs', icon: 'rocket' },
  { to: '/app/perks', label: 'Perks', icon: 'bag' },
  { to: '/app/application', label: 'Application', icon: 'checklist' },
  { to: '/app/me', label: 'Me', icon: 'user' },
];

export default function TabBar() {
  return (
    <nav className="app__tabs" aria-label="App">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className="app__tab">
          <Icon name={t.icon} set="solid" size={21} />
          <span className="app__tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

`NavLink` sets `aria-current="page"` on the active route by default, which is what the tests and `app.css` key off.

- [ ] **Step 7: Write `src/app/AppShell.jsx`**

```jsx
import { Outlet } from 'react-router-dom';
import TabBar from './TabBar.jsx';
import PreviewMarker from './PreviewMarker.jsx';
import './app.css';

export default function AppShell() {
  return (
    <div className="app ax-grid-paper">
      <main className="app__col">
        <PreviewMarker />
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
```

- [ ] **Step 8: Rewire `src/App.jsx`**

The marketing shell and the app shell are mutually exclusive. Split on the prefix rather than rendering `Nav`/`Footer` unconditionally.

```jsx
import { Routes, Route, useParams, useLocation, Navigate } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import ScrollToHash from './components/ScrollToHash.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ForBrandsPage from './pages/ForBrandsPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import LegalPage from './pages/LegalPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AppShell from './app/AppShell.jsx';
import GigsBoard from './app/screens/GigsBoard.jsx';
import GigsDetail from './app/screens/GigsDetail.jsx';
import Perks from './app/screens/Perks.jsx';
import Application from './app/screens/Application.jsx';
import Me from './app/screens/Me.jsx';

function LegalRoute() {
  const { kind } = useParams();
  return <LegalPage kind={kind} />;
}

export default function App() {
  // The marketing chrome and the app shell never coexist: the app is a
  // phone column with its own tab bar.
  const inApp = useLocation().pathname.startsWith('/app');
  return (
    <>
      <ScrollToHash />
      {!inApp && <Nav />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/for-brands" element={<ForBrandsPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/legal/:kind" element={<LegalRoute />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/gigs" replace />} />
          <Route path="gigs" element={<GigsBoard />} />
          <Route path="gigs/:slug" element={<GigsDetail />} />
          <Route path="perks" element={<Perks />} />
          <Route path="application" element={<Application />} />
          <Route path="me" element={<Me />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!inApp && <Footer />}
    </>
  );
}
```

- [ ] **Step 9: Create the five screens as minimal stubs so the router resolves**

Each is replaced wholesale in a later task. They exist now only so Task 2's tests can run.

```jsx
// src/app/screens/GigsBoard.jsx   (and Perks.jsx, Application.jsx, Me.jsx — same shape, different heading)
export default function GigsBoard() {
  return <h1 style={{ fontFamily: 'var(--font-display)' }}>Gigs</h1>;
}
```

```jsx
// src/app/screens/GigsDetail.jsx
export default function GigsDetail() {
  return <h1 style={{ fontFamily: 'var(--font-display)' }}>Mission</h1>;
}
```

- [ ] **Step 10: Run the tests**

```bash
cd /Users/carriewang/axelerate-website-h5
npx vitest run tests/unit/app-shell.test.jsx 2>&1 | tail -10
npm test 2>&1 | tail -4
```

Expected: 11 pass in the new file; full suite 95 pass (84 + 11), **including `stylesheet-order.test.js`** — you did not touch `main.jsx`, so it must stay green.

- [ ] **Step 11: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/app src/App.jsx src/components/Icon.jsx tests/unit/app-shell.test.jsx
git commit -m "Add the app shell, tab bar, and /app routes

A phone-width column nested under one /app route so the shell, the
floating tab bar and the preview marker mount once. The marketing
Nav/Footer and the app TabBar are mutually exclusive, split on the
route prefix. Icon gains a set prop for the solid icon set.

Every app screen carries a 'Preview · example data' marker: the
screens show money with no backend behind it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The money formatter (R1)

**Files:**
- Create: `src/app/parts/Money.jsx`
- Test: `tests/unit/money.test.js`

**Interfaces:**
- Produces: `usd(n) → "$1,200"`, `credit(pts) → "8,000 credit · $80 in shop"` (or `null` for `null`/`undefined`), `CREDIT_PER_DOLLAR = 100`. **Every credit figure in the app goes through `credit()`.**

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/money.test.js
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { usd, credit, CREDIT_PER_DOLLAR } from '../../src/app/parts/Money.jsx';

describe('usd', () => {
  test('formats with a thousands separator and no cents', () => {
    expect(usd(25)).toBe('$25');
    expect(usd(1200)).toBe('$1,200');
    expect(usd(0)).toBe('$0');
  });
});

describe('credit — R1: never a bare number', () => {
  test("matches the product spec's own example exactly", () => {
    // Product spec §2.1.1: "2,400 credit · $24 in shop"
    expect(credit(2400)).toBe('2,400 credit · $24 in shop');
  });
  test("converts the design's +8,000 pts", () => {
    expect(credit(8000)).toBe('8,000 credit · $80 in shop');
  });
  test('the rate is 100 credit to the dollar', () => {
    expect(CREDIT_PER_DOLLAR).toBe(100);
    expect(credit(100)).toBe('100 credit · $1 in shop');
  });
  test('returns null for no credit so callers can omit the row', () => {
    expect(credit(null)).toBeNull();
    expect(credit(undefined)).toBeNull();
  });
});

describe('no screen formats credit by hand', () => {
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.jsx?$/.test(e.name)) out.push(p);
    }
    return out;
  }
  test('the word "credit" appears in app source only inside Money.jsx', () => {
    const offenders = walk('src/app')
      .filter((p) => !p.endsWith('Money.jsx'))
      .filter((p) => /\bcredit\b/i.test(readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/money.test.js 2>&1 | tail -5
```

Expected: FAIL — cannot resolve `src/app/parts/Money.jsx`.

- [ ] **Step 3: Write `src/app/parts/Money.jsx`**

```jsx
/**
 * The app's only money formatter.
 *
 * R1 (product spec §2.1.1): "Cash is the unit. Credit is never displayed as a
 * bare number — the UI always renders it with its dollar equivalence, in one
 * string: 2,400 credit · $24 in shop."
 *
 * The 100:1 rate is derived from that example. Every credit figure in the app
 * goes through credit(); tests/unit/money.test.js asserts no other file in
 * src/app even mentions credit.
 */
export const CREDIT_PER_DOLLAR = 100;

export const usd = (n) => '$' + Number(n).toLocaleString('en-US');

export function credit(pts) {
  if (pts == null) return null;
  const n = Number(pts);
  return `${n.toLocaleString('en-US')} credit · ${usd(n / CREDIT_PER_DOLLAR)} in shop`;
}
```

- [ ] **Step 4: Run the tests, then commit**

```bash
cd /Users/carriewang/axelerate-website-h5
npx vitest run tests/unit/money.test.js 2>&1 | tail -6
git add src/app/parts/Money.jsx tests/unit/money.test.js
git commit -m "Add the app's only money formatter, enforcing R1

Credit is never rendered as a bare number: credit() returns the
product spec's mandated one-string form at 100 credit to the dollar,
derived from the spec's own '2,400 credit · \$24 in shop' example. A
test asserts no other file in src/app formats credit.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: 7 pass. The last test is the important one — it is what keeps R1 from leaking.

---

### Task 4: Fixtures

**Files:**
- Modify: `src/data/missions.example.json`
- Create: `src/data/quests.example.json`, `src/data/perks.example.json`, `src/data/applications.example.json`
- Test: `tests/unit/fixtures.test.js`

**Interfaces:**
- Produces the shapes every screen reads. Missions keep all 12 existing fields and gain 10: `tags: [{tone, icon, label}]`, `meta`, `perk`, `photoLabel`, `desc`, `steps: [string]`, `creditPts: number|null`, `spots: {taken, total}|null`, `deadline`, `host: {name, role}`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/fixtures.test.js
import missions from '../../src/data/missions.example.json';
import quests from '../../src/data/quests.example.json';
import perks from '../../src/data/perks.example.json';
import applications from '../../src/data/applications.example.json';

const TIER_NAMES = { 1: 'Open', 2: 'Contributor', 3: 'Insider', 4: 'Trusted', 5: 'Partner' };
const TONES = ['ink', 'pink', 'coral', 'orange', 'yellow', 'lime', 'teal', 'cyan', 'navy', 'lilac'];

describe('missions — existing contract preserved', () => {
  test('still 4 missions with every original field (the marketing site reads these)', () => {
    expect(missions).toHaveLength(4);
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
  test('every mission has all ten', () => {
    for (const m of missions) {
      for (const k of ['tags','meta','perk','photoLabel','desc','steps','creditPts','spots','deadline','host']) {
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
    expect(d.spots).toEqual({ taken: 10, total: 10 });
    expect(d.deadline).toBe('Ongoing');
    expect(d.host.name).toBe('Axelerate Beauty');
    expect(d.desc).toMatch(/Dermabell/);
    expect(d.steps).toHaveLength(3);
  });
});

describe('quests', () => {
  test('three quests with a token colour name, not a hex value', () => {
    expect(quests).toHaveLength(3);
    for (const q of quests) {
      for (const k of ['tab','title','desc','reward','color']) expect(q).toHaveProperty(k);
      expect(q.color).toMatch(/^[a-z0-9-]+$/);
      expect(q.color).not.toMatch(/^#/);
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
  test('no perk promises more pay (R7)', () => {
    const all = perks.flatMap((p) => p.perks).join(' ');
    expect(all).not.toMatch(/earn more|higher pay|more pay|pay multiplier/i);
  });
});

describe('applications', () => {
  test('each row points at a real mission and uses a loop status', () => {
    const slugs = missions.map((m) => m.slug);
    expect(applications.length).toBeGreaterThanOrEqual(3);
    for (const a of applications) {
      expect(slugs).toContain(a.missionSlug);
      expect(['applied','doing','submitted','approved','paid']).toContain(a.status);
      expect(a).toHaveProperty('appliedAt');
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/fixtures.test.js 2>&1 | tail -5
```

Expected: FAIL — cannot resolve `quests.example.json`.

- [ ] **Step 3: Extend `src/data/missions.example.json`**

Add the ten fields to each of the four existing missions. Keep every existing field and value untouched. The Dermabell entry takes the design's real content.

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
    "xp": 150,
    "tags": [{ "tone": "cyan", "icon": "play", "label": "Digital" }],
    "meta": "45 min · flexible this week",
    "perk": "+ keep the 12-pack",
    "photoLabel": "Fable Coffee product shot",
    "desc": "Film a short set of 3 photos of your morning routine with the Fable 12-pack in frame, and post them to your feed. Keep the product visible in the first shot and tag the brand.",
    "steps": [
      "Pick up the 12-pack at the campus desk",
      "Shoot and post your 3 photos",
      "Drop the link in your dashboard"
    ],
    "creditPts": 500,
    "spots": { "taken": 4, "total": 12 },
    "deadline": "This week",
    "host": { "name": "Fable Coffee", "role": "Brand" }
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
    "xp": 250,
    "tags": [{ "tone": "lime", "icon": "pin", "label": "Physical" }],
    "meta": "2 hr · before Thursday",
    "perk": "",
    "photoLabel": "Sampling table setup",
    "desc": "Run a sampling table outside the student union for 2 hours: pour samples, answer questions, and hand out the discount cards.",
    "steps": [
      "Collect the sampling kit at the desk",
      "Run the table for 2 hours",
      "Return the kit and log your count"
    ],
    "creditPts": 1200,
    "spots": { "taken": 2, "total": 6 },
    "deadline": "Before Thursday",
    "host": { "name": "Kettle & Co", "role": "Brand" }
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
    "xp": 100,
    "tags": [{ "tone": "lime", "icon": "pin", "label": "Physical" }],
    "meta": "Fri 6–9pm · Warehouse 12",
    "perk": "",
    "photoLabel": "Launch night door",
    "desc": "Work the door at Northline's Friday launch: scan tickets, hand out wristbands, and keep the line moving.",
    "steps": [
      "Check in with the crew lead at 5:45pm",
      "Scan tickets 6–9pm",
      "Close out with the lead"
    ],
    "creditPts": null,
    "spots": { "taken": 5, "total": 8 },
    "deadline": "Fri 6–9pm",
    "host": { "name": "Northline Apparel", "role": "Brand" }
  },
  {
    "slug": "dermabell-campus-launch",
    "title": "Dermabell salon ambassador",
    "brand": "Dermabell",
    "campus": "UCLA",
    "payUsd": 50,
    "tier": 4,
    "tierName": "Trusted",
    "minLevel": 4,
    "hours": 4,
    "format": "field",
    "skills": ["Event marketing", "Consumer research", "Brand activation"],
    "xp": 1000,
    "tags": [
      { "tone": "lime", "icon": "pin", "label": "Physical" },
      { "tone": "lilac", "icon": "star", "label": "K-beauty" }
    ],
    "meta": "Ongoing · your city",
    "perk": "",
    "photoLabel": "Salon or product shot",
    "desc": "Axelerate Beauty is the exclusive US operating partner for Dermabell, Korea's premium professional skincare brand. We are looking for campus ambassadors to introduce local beauty salons, threading studios and spas to the line.",
    "steps": [
      "Target and scout: identify busy local beauty businesses — threading, lashes, hair, waxing, spas — in your city.",
      "Pitch in person: walk in, break the ice, and introduce the AI Skin Analyzer and the 40-minute express K-facial to the owner.",
      "Secure meetings: you do not need to close. Spark interest, hand over the welcome packet, and book a 15-minute demo for the California sales team."
    ],
    "creditPts": 8000,
    "spots": { "taken": 10, "total": 10 },
    "deadline": "Ongoing",
    "host": { "name": "Axelerate Beauty", "role": "Host" }
  }
]
```

- [ ] **Step 4: Write the three new fixtures**

```json
// src/data/quests.example.json
[
  { "tab": "formats", "title": "Three formats", "desc": "Post a reel, a story and a static this week", "reward": "+120 XP", "color": "violet-600" },
  { "tab": "brand", "title": "Brand regular", "desc": "Run 3 missions with the same brand", "reward": "+200 XP", "color": "accent-pink" },
  { "tab": "run", "title": "4-week run", "desc": "Clear 1+ mission every week, 4 weeks straight", "reward": "+1 freeze", "color": "ink-900" }
]
```

```json
// src/data/perks.example.json — product spec §3.2, "What each level opens"
[
  { "level": 1, "name": "Explorer", "gate": "Verified student — school, work eligibility, payout, reach",
    "perks": ["Student-exclusive shop", "Drops and free samples", "Open events"] },
  { "level": 2, "name": "Contributor", "gate": "300 XP · 3 completed missions",
    "perks": ["Public profile goes live", "Early drop window", "Creator events", "Brand badges", "Application priority"] },
  { "level": 3, "name": "Insider", "gate": "1,200 XP · 5+ missions · ≥90% on-time · 4.5+ star rating · no violations",
    "perks": ["$100+ missions", "24 hr early drop access", "Closed events", "Skip review on selected missions", "Pitch your own mission idea", "5% shop discount"] },
  { "level": 4, "name": "Trusted", "gate": "3,000 XP · 10+ missions · 3+ brands · ≥92% on-time · strong ratings · 1+ portfolio-quality submission",
    "perks": ["Invite-only launches", "Executive and founder networking", "Internship pipeline", "Brand advisory panels", "Verified references", "Creator dinners"] },
  { "level": 5, "name": "Partner", "gate": "6,000 XP · 25+ missions · ≥95% on-time · sustained L4 record · clean standing · qualification + invitation",
    "perks": ["Direct brand introductions", "Paid retainers", "National campaigns", "Recommendation letters", "Campus Lead title", "Annual Creator Summit"] }
]
```

```json
// src/data/applications.example.json
[
  { "missionSlug": "fable-coffee-morning-routine", "status": "paid", "appliedAt": "2026-08-04", "note": "Paid 2026-08-11" },
  { "missionSlug": "kettle-co-sampling-ambassador", "status": "approved", "appliedAt": "2026-08-12", "note": "Payout lands in 2 days" },
  { "missionSlug": "northline-launch-night", "status": "doing", "appliedAt": "2026-08-19", "note": "Fri 6–9pm · Warehouse 12" },
  { "missionSlug": "dermabell-campus-launch", "status": "applied", "appliedAt": "2026-08-24", "note": "Waiting on the host" }
]
```

- [ ] **Step 5: Run the fixture tests and the full suite**

```bash
cd /Users/carriewang/axelerate-website-h5
npx vitest run tests/unit/fixtures.test.js 2>&1 | tail -8
npm test 2>&1 | tail -4
```

Expected: 9 pass in the new file; full suite 104 pass (95 + 9). **`mission-card.test.jsx` and `sections-a.test.jsx` must still pass** — the marketing site reads this fixture, and the extension must not disturb it. Note the Dermabell `title` changed from "Dermabell Campus Launch" to "Dermabell salon ambassador" per the design; if a marketing test asserts the old title, **report it — do not change the test or revert the title until the controller rules.**

- [ ] **Step 6: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/data tests/unit/fixtures.test.js
git commit -m "Extend the missions fixture and add quest, perk, application fixtures

Missions keep all 12 original fields (the marketing site reads them)
and gain 10 the app needs. The Dermabell entry takes the designed
detail content, including its 8,000 credit award, which renders only
through Money.credit().

Quest colours are token names, never hex. Perks come from product
spec §3.2 and a test asserts none promises more pay (R7). All four
files stay flat records — future Supabase seeds.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Board parts — quest deck, format tabs, filter chips

**Files:**
- Create: `src/app/parts/QuestDeck.jsx`, `src/app/parts/FormatTabs.jsx`, `src/app/parts/FilterChips.jsx`, `src/app/parts/parts.css`
- Test: `tests/unit/board-parts.test.jsx`

**Interfaces:**
- Consumes: `quests.example.json` from Task 4
- Produces:
  - `<QuestDeck quests={quests} />` — internal state for order; front card plus strips
  - `<FormatTabs formats={[{id,count}]} value={id} onChange={fn} />`
  - `<FilterChips chips={[string]} active={Set} onToggle={fn} />`

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/board-parts.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestDeck from '../../src/app/parts/QuestDeck.jsx';
import FormatTabs from '../../src/app/parts/FormatTabs.jsx';
import FilterChips from '../../src/app/parts/FilterChips.jsx';
import quests from '../../src/data/quests.example.json';

describe('QuestDeck', () => {
  test('shows the first quest in full and the others as strips', () => {
    render(<QuestDeck quests={quests} />);
    expect(screen.getByText('Three formats')).toBeInTheDocument();
    expect(screen.getByText(quests[0].desc)).toBeInTheDocument();
    // the two behind are buttons, described by title + reward only
    expect(screen.getByRole('button', { name: /Brand regular/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /4-week run/ })).toBeInTheDocument();
    expect(screen.queryByText(quests[1].desc)).not.toBeInTheDocument();
  });

  test('tapping a strip brings that quest to the front', async () => {
    const user = userEvent.setup();
    render(<QuestDeck quests={quests} />);
    await user.click(screen.getByRole('button', { name: /Brand regular/ }));
    expect(screen.getByText(quests[1].desc)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Three formats/ })).toBeInTheDocument();
  });

  test('resolves quest colours to tokens, never hex', () => {
    const { container } = render(<QuestDeck quests={quests} />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).toMatch(/var\(--violet-600\)/);
  });
});

describe('FormatTabs', () => {
  const formats = [{ id: 'All', count: 4 }, { id: 'Digital', count: 1 }, { id: 'Physical', count: 3 }];

  test('renders one tab per format with its count, and marks the active one', () => {
    render(<FormatTabs formats={formats} value="All" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['All4', 'Digital1', 'Physical3']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  test('calls onChange with the tapped format id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormatTabs formats={formats} value="All" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Physical/ }));
    expect(onChange).toHaveBeenCalledWith('Physical');
  });
});

describe('FilterChips', () => {
  const chips = ['$25+', 'Under 1 hr', 'This week'];

  test('renders each chip unpressed by default', () => {
    render(<FilterChips chips={chips} active={new Set()} onToggle={() => {}} />);
    for (const c of chips) {
      expect(screen.getByRole('button', { name: c })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('marks active chips pressed and toggles independently', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FilterChips chips={chips} active={new Set(['$25+'])} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: '$25+' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'This week' }));
    expect(onToggle).toHaveBeenCalledWith('This week');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/board-parts.test.jsx 2>&1 | tail -5
```

Expected: FAIL — cannot resolve `QuestDeck.jsx`.

- [ ] **Step 3: Write `src/app/parts/parts.css`**

```css
/* Board parts. Colours are tokens; the quest card's fill is the only
   dynamic value and arrives as a var() string, never a hex. */

/* Quest deck — front card, strips stacked behind with negative margin. */
.qd__front {
  position: relative;
  z-index: 3;
  border-radius: var(--radius-hand);
  box-shadow: var(--shadow-paper-lg);
  padding: 18px 18px 16px;
  transition: background var(--dur-med) var(--ease-launch);
}
.qd__tab {
  font-family: var(--font-label);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--text-inverse-secondary);
}
.qd__title {
  margin-top: 8px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  letter-spacing: var(--tracking-tight);
  color: var(--gray-0);
}
.qd__desc { margin-top: 6px; font-size: 12.5px; line-height: 1.45; color: var(--text-inverse); opacity: .82; }
.qd__reward {
  margin-top: 18px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 20px;
  letter-spacing: var(--tracking-tight);
  font-variant-numeric: tabular-nums;
  color: var(--accent-yellow);
}
.qd__strip {
  position: relative;
  margin-top: -12px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-hand);
  box-shadow: var(--shadow-paper);
  padding: 24px 18px 13px;
  transition: background var(--dur-med) var(--ease-launch);
}
.qd__strip-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13.5px;
  letter-spacing: -0.01em;
  color: var(--gray-0);
}
.qd__strip-reward {
  margin-left: auto;
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  font-variant-numeric: tabular-nums;
  color: var(--accent-yellow);
}

/* Format tabs — folder tabs that sit on the panel below. */
.ft { display: flex; align-items: flex-end; gap: 4px; padding: 0 4px; }
.ft__tab {
  position: relative;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  flex: none;
  padding: 9px 9px 15px;
  margin-bottom: -10px;
  border-radius: 11px 14px 0 0 / 13px 10px 0 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 12.5px;
  letter-spacing: -0.01em;
  background: var(--gray-100);
  color: var(--gray-600);
  transition: background var(--dur-fast) var(--ease-launch), color var(--dur-fast) var(--ease-launch), padding var(--dur-fast) var(--ease-launch);
}
.ft__tab:hover { background: var(--gray-200); color: var(--text-primary); }
.ft__tab[aria-selected='true'] {
  padding: 10px 10px 18px;
  background: var(--surface-quiet);
  color: var(--text-primary);
  z-index: 2;
}
.ft__n { display: none; }
.ft__tab[aria-selected='true'] .ft__n {
  display: inline;
  font-family: var(--font-label);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .04em;
  font-variant-numeric: tabular-nums;
  color: var(--text-brand);
}

/* Filter chips — text with a butter scribble when active. */
.fc { display: flex; gap: 20px; align-items: center; overflow-x: auto; scrollbar-width: none; padding: 2px 3px; }
.fc::-webkit-scrollbar { display: none; }
.fc__chip {
  flex: none;
  border: none;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 2px 1px 6px;
  font-family: var(--font-label);
  font-size: 11.5px;
  letter-spacing: .04em;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: var(--gray-600);
  transition: color var(--dur-fast) var(--ease-launch);
}
.fc__chip[aria-pressed='true'] {
  font-weight: 700;
  color: var(--text-primary);
  background: var(--scribble-butter) left bottom / 100% 6px no-repeat;
}
```

- [ ] **Step 4: Write `src/app/parts/QuestDeck.jsx`**

```jsx
import { useState } from 'react';
import './parts.css';

// Quest colours arrive as design-system token NAMES in the fixture
// ("violet-600"), resolved to var() here so no hex ever reaches the DOM.
const fill = (token) => `var(--${token})`;

export default function QuestDeck({ quests }) {
  const [order, setOrder] = useState(() => quests.map((_, i) => i));
  const front = quests[order[0]];
  const behind = order.slice(1);

  const bringToFront = (i) => setOrder((o) => [i, ...o.filter((x) => x !== i)]);

  return (
    <div>
      <div className="qd__front" style={{ background: fill(front.color) }}>
        <div className="qd__tab">{front.tab}</div>
        <div className="qd__title">{front.title}</div>
        <div className="qd__desc">{front.desc}</div>
        <div className="qd__reward">{front.reward}</div>
      </div>
      {behind.map((i, n) => (
        <button
          key={quests[i].title}
          type="button"
          className="qd__strip"
          style={{ background: fill(quests[i].color), zIndex: 2 - n }}
          onClick={() => bringToFront(i)}
        >
          <span className="qd__strip-title">{quests[i].title}</span>
          <span className="qd__strip-reward">{quests[i].reward}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/app/parts/FormatTabs.jsx` and `src/app/parts/FilterChips.jsx`**

```jsx
// src/app/parts/FormatTabs.jsx
import './parts.css';

export default function FormatTabs({ formats, value, onChange }) {
  return (
    <div className="ft" role="tablist" aria-label="Mission format">
      {formats.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={value === f.id}
          className="ft__tab"
          onClick={() => onChange(f.id)}
        >
          {f.id}
          <span className="ft__n">{f.count}</span>
        </button>
      ))}
    </div>
  );
}
```

```jsx
// src/app/parts/FilterChips.jsx
import './parts.css';

export default function FilterChips({ chips, active, onToggle }) {
  return (
    <div className="fc">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          className="fc__chip"
          aria-pressed={active.has(c)}
          onClick={() => onToggle(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run the tests, then commit**

```bash
cd /Users/carriewang/axelerate-website-h5
npx vitest run tests/unit/board-parts.test.jsx 2>&1 | tail -8
git add src/app/parts tests/unit/board-parts.test.jsx
git commit -m "Add the board's quest deck, format tabs, and filter chips

The prototype's inline styles move to token-based CSS; only the quest
card's fill stays dynamic, and it resolves a token name from the
fixture rather than carrying a hex. Format tabs are a real tablist,
chips are aria-pressed toggles.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: 8 pass.

---

### Task 6: Mission tile and the Gigs board

**Files:**
- Create: `src/app/parts/MissionTile.jsx`, `src/app/parts/mission-tile.css`
- Modify: `src/app/screens/GigsBoard.jsx` (replace the stub), create `src/app/screens/gigs-board.css`
- Test: `tests/unit/gigs-board.test.jsx`

**Interfaces:**
- Consumes: `MissionTile`; `QuestDeck`, `FormatTabs`, `FilterChips` from Task 5; `ImageSlot` from Task 2; `missions.example.json` and `quests.example.json` from Task 4; `Card`, `Badge`, `Tag` from the design system
- Produces: `<MissionTile mission={m} locked={{xpAway, missionsAway}} isNew />`; the board at `/app/gigs`

**Note on `interactive`:** the marketing site deliberately dropped `Card`'s `interactive` prop because its cards had no handler. Here tiles **do** navigate, so `interactive` is correct — and because tiles carry no `tilt`, the design system's inline-transform bug (its issue #3) does not bite.

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/gigs-board.test.jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MissionTile from '../../src/app/parts/MissionTile.jsx';
import GigsBoard from '../../src/app/screens/GigsBoard.jsx';
import missions from '../../src/data/missions.example.json';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const fable = missions[0];
const dermabell = missions[3];

describe('MissionTile', () => {
  test('leads with the dollar figure (R1)', () => {
    wrap(<MissionTile mission={fable} />);
    const tile = screen.getByTestId('mission-tile');
    expect(tile.textContent.replace(/\s/g, '')).toMatch(/^\$15/);
  });
  test('shows tags, title, meta and the XP award', () => {
    wrap(<MissionTile mission={fable} />);
    expect(screen.getByText('Digital')).toBeInTheDocument();
    expect(screen.getByText(fable.title)).toBeInTheDocument();
    expect(screen.getByText(fable.meta)).toBeInTheDocument();
    expect(screen.getByText('+150 XP')).toBeInTheDocument();
  });
  test('shows the perk line only when there is one', () => {
    wrap(<MissionTile mission={fable} />);
    expect(screen.getByText('+ keep the 12-pack')).toBeInTheDocument();
    wrap(<MissionTile mission={missions[2]} />);
    expect(screen.queryByText(/keep the/)).not.toBeInTheDocument();
  });
  test('links to the mission detail route', () => {
    wrap(<MissionTile mission={fable} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/app/gigs/${fable.slug}`);
  });
  test('a locked tile keeps its price and states the distance, never "locked" (R8)', () => {
    wrap(<MissionTile mission={dermabell} locked={{ xpAway: 620, missionsAway: 3 }} />);
    const tile = screen.getByTestId('mission-tile');
    expect(tile.textContent.replace(/\s/g, '')).toMatch(/^\$50/);
    expect(screen.getByText(/LV\.4 · 620 XP away/)).toBeInTheDocument();
    expect(tile.textContent).not.toMatch(/locked/i);
    expect(tile.querySelector('a')).toBeNull();      // not reachable yet
  });
  test('renders no emoji', () => {
    wrap(<MissionTile mission={dermabell} locked={{ xpAway: 620, missionsAway: 3 }} />);
    expect(screen.getByTestId('mission-tile').textContent)
      .not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('GigsBoard', () => {
  test('renders the header, the quest deck and the missions heading', () => {
    wrap(<GigsBoard />);
    expect(screen.getByText('axelerate')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inbox' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active quests' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Missions' })).toBeInTheDocument();
    expect(screen.getByText('Three formats')).toBeInTheDocument();
  });

  test('opens on All, showing every mission with the locked one locked', () => {
    wrap(<GigsBoard />);
    const tiles = screen.getAllByTestId('mission-tile');
    expect(tiles).toHaveLength(4);
    expect(tiles.filter((t) => t.dataset.locked === 'true')).toHaveLength(1);
  });

  test('format tabs filter the tiles', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('tab', { name: /Digital/ }));
    const titles = screen.getAllByTestId('mission-tile').map((t) => within(t).getByRole('heading').textContent);
    expect(titles).toEqual([missions[0].title]);
  });

  test('the tab counts match what each filter shows', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    for (const [label, n] of [['All', 4], ['Digital', 1], ['Physical', 3]]) {
      await user.click(screen.getByRole('tab', { name: new RegExp(label) }));
      expect(screen.getAllByTestId('mission-tile')).toHaveLength(n);
      expect(screen.getByRole('tab', { selected: true }).textContent).toBe(`${label}${n}`);
    }
  });

  test('filter chips toggle independently and are pressed when on', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('button', { name: '$25+' }));
    expect(screen.getByRole('button', { name: '$25+' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('the $25+ chip removes cheaper missions', async () => {
    const user = userEvent.setup();
    wrap(<GigsBoard />);
    await user.click(screen.getByRole('button', { name: '$25+' }));
    const tiles = screen.getAllByTestId('mission-tile');
    expect(tiles.length).toBeLessThan(4);
    for (const t of tiles) expect(t.textContent).not.toMatch(/^\$15/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/gigs-board.test.jsx 2>&1 | tail -5
```

Expected: FAIL — cannot resolve `MissionTile.jsx`.

- [ ] **Step 3: Write `src/app/parts/mission-tile.css`**

```css
.mt { display: flex; flex-direction: column; gap: 9px; align-items: flex-start; height: 100%; }
.mt__link { text-decoration: none; color: inherit; display: block; min-width: 0; height: 100%; }
.mt__photo { width: calc(100% + 16px); margin: -8px -8px 0; }
.mt__tags { display: flex; gap: 6px; flex-wrap: wrap; }
.mt__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14.5px;
  letter-spacing: -0.01em;
  line-height: 1.3;
  min-height: 38px;
  margin: 0;
  color: var(--text-primary);
}
.mt__meta {
  font-family: var(--font-label);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: .04em;
  font-variant-numeric: tabular-nums;
  color: var(--gray-600);
}
.mt__foot { margin-top: auto; padding-top: 4px; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.mt__pay {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 20px;
  letter-spacing: var(--tracking-tight);
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.mt__xp {
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  font-variant-numeric: tabular-nums;
  color: var(--text-brand);
}
.mt__perk { font-size: 10.5px; color: var(--text-muted); }
.mt__badge { position: absolute; top: -12px; right: 12px; z-index: 2; }
/* Locked: readable, priced, and told how far away it is — R8. */
.mt--locked .mt__title { color: var(--text-secondary); }
.mt--locked .mt__pay { color: var(--text-muted); }
.mt--locked .mt__photo { opacity: .6; }
.mt__gate {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-label);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: .04em;
  font-variant-numeric: tabular-nums;
  color: var(--gray-600);
}
```

- [ ] **Step 4: Write `src/app/parts/MissionTile.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { Card, Badge, Tag } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import './mission-tile.css';

const usd = (n) => '$' + Number(n).toLocaleString('en-US');

export default function MissionTile({ mission: m, locked, isNew }) {
  const body = (
    <Card
      variant={locked ? 'sketch' : 'sheet'}
      padding="sm"
      interactive={!locked}
      data-testid="mission-tile"
      data-locked={locked ? 'true' : 'false'}
      className={`mt${locked ? ' mt--locked' : ''}`}
      style={{ height: '100%', boxSizing: 'border-box', position: 'relative' }}
    >
      {isNew && !locked && (
        <div className="mt__badge"><Badge tone="yellow">new · lv.{m.minLevel}</Badge></div>
      )}
      <div className="mt__photo"><ImageSlot label={m.photoLabel} /></div>
      <div className="mt__tags">
        {m.tags.map((t) => (
          <Tag key={t.label} tone={t.tone}>
            <Icon name={t.icon} set="solid" size={13} />
            {t.label}
          </Tag>
        ))}
      </div>
      <h3 className="mt__title">{m.title}</h3>
      {locked ? (
        <div className="mt__gate">
          <Icon name="crown" set="solid" size={13} />
          LV.{m.minLevel} · {locked.xpAway.toLocaleString('en-US')} XP away · about {locked.missionsAway}{' '}
          {locked.missionsAway === 1 ? 'mission' : 'missions'}
        </div>
      ) : (
        <div className="mt__meta">{m.meta}</div>
      )}
      <div className="mt__foot">
        <span className="mt__pay">{usd(m.payUsd)}</span>
        {!locked && <span className="mt__xp">+{m.xp.toLocaleString('en-US')} XP</span>}
        {!locked && m.perk && <span className="mt__perk">{m.perk}</span>}
      </div>
    </Card>
  );

  // A locked tile is not reachable yet, so it is not a link — but it keeps
  // its price and its distance (R8).
  return locked ? body : <Link to={`/app/gigs/${m.slug}`} className="mt__link">{body}</Link>;
}
```

The `.mt__pay` span must stay the first child of `.mt__foot`, and `.mt__foot` the last block — the R1 test asserts the tile's text *starts* with the price, so nothing textual may precede it. The `ImageSlot` and `Tag`s contribute text after it, which is why `photo`/`tags`/`title` sit above but the price is read first: **`Card` renders children in order, so the price must physically come first in the DOM.** Reorder: put `.mt__foot` immediately after the badge, before the photo, and use `order` in CSS to place it visually last.

Correct structure — foot first in DOM, last visually:

```jsx
<Card … className={`mt${locked ? ' mt--locked' : ''}`}>
  {isNew && !locked && <div className="mt__badge">…</div>}
  <div className="mt__foot">…price, xp, perk…</div>
  <div className="mt__photo">…</div>
  <div className="mt__tags">…</div>
  <h3 className="mt__title">…</h3>
  {locked ? <div className="mt__gate">…</div> : <div className="mt__meta">…</div>}
</Card>
```

and in `mission-tile.css` add:

```css
.mt { display: flex; flex-direction: column; gap: 9px; align-items: flex-start; height: 100%; }
.mt__foot { order: 99; margin-top: auto; }
.mt__photo { order: 1; }
.mt__tags  { order: 2; }
.mt__title { order: 3; }
.mt__meta, .mt__gate { order: 4; }
```

- [ ] **Step 5: Write `src/app/screens/gigs-board.css`**

```css
.gb__head { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
.gb__wordmark {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 21px;
  letter-spacing: -0.04em;
  color: var(--violet-600);
}
.gb__spacer { flex: 1; }
.gb .gb__icon-btn {
  width: 44px; height: 44px; margin: -8px -6px -8px 0;
  display: flex; align-items: center; justify-content: center;
  border: none; cursor: pointer; background: none; color: var(--ink-900);
}
.gb__avatar {
  width: 36px; height: 36px; border-radius: 50%; overflow: hidden;
  box-shadow: var(--sticker-cut), var(--shadow-paper); flex: none;
}
.gb__h2 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 21px;
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
  margin: 0;
}
.gb__quests { margin-top: 14px; }
.gb__missions-h { margin-top: 30px; }
/* The panel the folder tabs sit on. Asymmetric radius, as drawn. */
.gb__panel {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  background: var(--surface-quiet);
  border-radius: 22px 22px 0 0 / 18px 18px 0 0;
  box-shadow: var(--shadow-paper);
  padding: 16px;
}
.gb__grid { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: stretch; }
```

- [ ] **Step 6: Write `src/app/screens/GigsBoard.jsx`**

```jsx
import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import QuestDeck from '../parts/QuestDeck.jsx';
import FormatTabs from '../parts/FormatTabs.jsx';
import FilterChips from '../parts/FilterChips.jsx';
import MissionTile from '../parts/MissionTile.jsx';
import missions from '../../data/missions.example.json';
import quests from '../../data/quests.example.json';
import './gigs-board.css';

// The student's standing, hard-coded until Supabase supplies it. Drives which
// tiles are locked and how far away they are (R8).
const ME = { level: 2, xp: 380 };
const XP_PER_MISSION = 200;
const CHIPS = ['$25+', 'Under 1 hr', 'This week'];

// The design's format tabs. "Digital" and "Physical" map onto the product
// spec's four mission formats; K-beauty is a tag, not a format.
const FORMAT_OF = { content: 'Digital', sales: 'Digital', field: 'Physical', event: 'Physical' };

function lockFor(m) {
  if (m.minLevel <= ME.level) return undefined;
  const gates = { 2: 300, 3: 1200, 4: 3000, 5: 6000 };
  const xpAway = Math.max(0, gates[m.minLevel] - ME.xp);
  return { xpAway, missionsAway: Math.max(1, Math.round(xpAway / XP_PER_MISSION)) };
}

export default function GigsBoard() {
  const [fmt, setFmt] = useState('All');
  const [chips, setChips] = useState(() => new Set());

  const matches = (m) => {
    if (fmt !== 'All' && FORMAT_OF[m.format] !== fmt) return false;
    if (chips.has('$25+') && m.payUsd < 25) return false;
    if (chips.has('Under 1 hr') && m.hours > 1) return false;
    if (chips.has('This week') && !/week|Fri|Thu/i.test(m.deadline)) return false;
    return true;
  };

  const shown = missions.filter(matches);

  // Counts describe the format tabs only, so they stay stable as chips toggle.
  const formats = useMemo(
    () => ['All', 'Digital', 'Physical'].map((id) => ({
      id,
      count: missions.filter((m) => id === 'All' || FORMAT_OF[m.format] === id).length,
    })),
    []
  );

  const toggle = (c) =>
    setChips((s) => {
      const next = new Set(s);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  return (
    <div className="gb">
      <div className="gb__head">
        <span className="gb__wordmark">axelerate</span>
        <span className="gb__spacer" />
        <button type="button" className="gb__icon-btn" aria-label="Inbox">
          <Icon name="bell" set="solid" size={22} />
        </button>
        <div className="gb__avatar"><ImageSlot label="Me" radius={999} /></div>
      </div>

      <h2 className="gb__h2">Active quests</h2>
      <div className="gb__quests"><QuestDeck quests={quests} /></div>

      <h2 className="gb__h2 gb__missions-h">Missions</h2>
      <FormatTabs formats={formats} value={fmt} onChange={setFmt} />
      <div className="gb__panel">
        <FilterChips chips={CHIPS} active={chips} onToggle={toggle} />
        <div className="gb__grid">
          {shown.map((m, i) => (
            <MissionTile key={m.slug} mission={m} locked={lockFor(m)} isNew={i === 0 && !lockFor(m)} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run the tests**

```bash
cd /Users/carriewang/axelerate-website-h5
npx vitest run tests/unit/gigs-board.test.jsx 2>&1 | tail -12
npm test 2>&1 | tail -4
```

Expected: 12 pass in the new file; full suite 116 pass (104 + 12).

- [ ] **Step 8: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add src/app/parts/MissionTile.jsx src/app/parts/mission-tile.css src/app/screens/GigsBoard.jsx src/app/screens/gigs-board.css tests/unit/gigs-board.test.jsx
git commit -m "Build the Gigs board as drawn

Header, quest deck, folder-tab format filter on its panel, scribble
filter chips, and a 2-column tile grid. Tiles lead with the dollar
figure (R1); the tile above the student's level renders locked with
its price kept and its XP distance stated (R8), and is not a link.

The price sits first in the DOM and last visually via CSS order, so
'leads with the figure' is true for a screen reader as well as an eye.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Mission detail

**Files:**
- Modify: `src/app/screens/GigsDetail.jsx` (replace the stub), create `src/app/screens/gigs-detail.css`
- Create: `src/app/parts/ApplySheet.jsx`
- Test: `tests/unit/gigs-detail.test.jsx`

**Interfaces:**
- Consumes: `Money.credit` (Task 3), `ImageSlot`, `Icon`, `missions.example.json`; `Button`, `Tag`, `Badge`, `StickyNote` from the design system; `useParams` for the slug
- Produces: the detail screen at `/app/gigs/:slug`; `<ApplySheet open onClose />`

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/gigs-detail.test.jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import GigsDetail from '../../src/app/screens/GigsDetail.jsx';
import missions from '../../src/data/missions.example.json';

const at = (slug) =>
  render(
    <MemoryRouter initialEntries={[`/app/gigs/${slug}`]}>
      <Routes><Route path="/app/gigs/:slug" element={<GigsDetail />} /></Routes>
    </MemoryRouter>
  );

const d = missions.find((m) => m.slug === 'dermabell-campus-launch');

describe('GigsDetail', () => {
  test('renders the mission title, host and tags', () => {
    at(d.slug);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(d.title);
    expect(screen.getByText('Axelerate Beauty')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('K-beauty')).toBeInTheDocument();
  });

  test('the earn note shows cash, credit in R1 form, and XP', () => {
    at(d.slug);
    const earn = screen.getByTestId('earn');
    expect(within(earn).getByText('$50')).toBeInTheDocument();
    expect(within(earn).getByText('8,000 credit · $80 in shop')).toBeInTheDocument();
    expect(within(earn).getByText('+1,000')).toBeInTheDocument();
    // R1: no bare credit number anywhere on the screen
    expect(document.body.textContent).not.toMatch(/\b8,000 pts\b/);
  });

  test('shows the deadline and spots', () => {
    at(d.slug);
    expect(screen.getByText('Ongoing')).toBeInTheDocument();
    expect(screen.getByText('10/10')).toBeInTheDocument();
  });

  test('opens with one accordion section expanded and switches exclusively', async () => {
    const user = userEvent.setup();
    at(d.slug);
    const doBtn = screen.getByRole('button', { name: /What you'll do/ });
    const perksBtn = screen.getByRole('button', { name: /What's in it for you/ });
    expect(doBtn).toHaveAttribute('aria-expanded', 'true');
    expect(perksBtn).toHaveAttribute('aria-expanded', 'false');
    await user.click(perksBtn);
    expect(perksBtn).toHaveAttribute('aria-expanded', 'true');
    expect(doBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('the three field-execution steps render, numbered', async () => {
    at(d.slug);
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent(/Target and scout/);
    expect(steps[2]).toHaveTextContent(/Secure meetings/);
  });

  test('Apply opens a sheet saying applications are not live, and never submits', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    at(d.slug);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const sheet = screen.getByRole('dialog', { name: 'Apply' });
    expect(within(sheet).getByText(/opens at launch/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Apply' })).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  test('the back link returns to the board', () => {
    at(d.slug);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/app/gigs');
  });

  test('an unknown slug renders not-found copy rather than crashing', () => {
    at('no-such-mission');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/isn't here/);
  });

  test('renders no emoji and no banned words', () => {
    at(d.slug);
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(document.body.textContent).not.toMatch(/\b(synergy|leverage|ecosystem|empower|successfully)\b/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/gigs-detail.test.jsx 2>&1 | tail -5
```

Expected: FAIL — the stub renders "Mission", not the title.

- [ ] **Step 3: Write `src/app/screens/gigs-detail.css`**

```css
.gd__top { display: flex; align-items: center; gap: 6px; }
.gd .gd__back {
  width: 44px; height: 44px; margin: -8px 0 -8px -14px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; cursor: pointer; color: var(--ink-900);
  text-decoration: none;
}
.gd__chev-l {
  display: inline-block; width: 11px; height: 11px;
  border-left: 2.5px solid currentColor; border-bottom: 2.5px solid currentColor;
  border-radius: 1px; transform: rotate(45deg); margin-left: 4px;
}
.gd__kicker {
  font-family: var(--font-label); font-size: 10.5px; font-weight: 700;
  letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--text-secondary);
}
.gd__spacer { flex: 1; }

/* The taped sheet. */
.gd__sheet {
  margin-top: 16px; position: relative;
  background: var(--gray-0);
  border-radius: var(--radius-hand-lg);
  box-shadow: var(--sticker-cut), var(--shadow-paper);
  padding: 20px 16px 22px;
  transform: rotate(-0.4deg);
}
.gd__tape {
  position: absolute; top: -11px; left: 50%;
  transform: translateX(-50%) rotate(-2deg);
  width: 78px; height: 22px;
  background: var(--butter-200); opacity: .9;
  box-shadow: var(--shadow-paper-inset);
}
.gd__tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
.gd__title {
  margin: 14px 0 0;
  font-family: var(--font-display); font-weight: 800; font-size: 24px;
  line-height: 1.15; letter-spacing: var(--tracking-tight); color: var(--text-primary);
}
.gd__host { margin-top: 14px; display: flex; align-items: center; gap: 10px; }
.gd__host-mark {
  width: 34px; height: 34px; flex: none; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: var(--violet-600); color: var(--text-on-brand);
  font-family: var(--font-display); font-weight: 800; font-size: 17px; box-shadow: var(--sticker-cut);
}
.gd__host-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.gd__host-role {
  font-family: var(--font-label); font-size: 9.5px; font-weight: 700;
  letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--text-secondary);
}
.gd__going { display: flex; align-items: center; margin-left: auto; }
.gd__pip {
  width: 24px; height: 24px; flex: none; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; font-family: var(--font-label); font-size: 10px; font-weight: 700;
  box-shadow: 0 0 0 2px var(--gray-0); margin-left: -8px;
}
.gd__pip:first-child { margin-left: 0; }
.gd__going-n {
  margin-left: 8px; font-family: var(--font-label); font-size: 11px; font-weight: 700;
  letter-spacing: .04em; font-variant-numeric: tabular-nums; color: var(--text-secondary);
}
.gd__earn-wrap { margin-top: 20px; position: relative; }
.gd__earn-badge { position: absolute; top: -11px; right: 14px; z-index: 2; }
.gd__earn-grid { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.gd__earn-fig {
  font-family: var(--font-display); font-weight: 800; font-size: 19px;
  letter-spacing: var(--tracking-tight); font-variant-numeric: tabular-nums; color: var(--ink-900);
}
.gd__earn-lab {
  margin-top: 4px; font-family: var(--font-label); font-size: 9.5px; font-weight: 600;
  letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--gray-700);
}
.gd__earn-credit { grid-column: 1 / -1; font-size: 12px; font-weight: 600; color: var(--ink-900); }
.gd__earn-meta {
  margin-top: 14px; border-top: 1.5px solid var(--gray-200); padding-top: 12px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.gd__earn-val {
  margin-top: 3px; font-family: var(--font-label); font-size: 13px; font-weight: 700;
  letter-spacing: .02em; font-variant-numeric: tabular-nums; color: var(--ink-900);
}

/* Body + accordion. */
.gd__section-label {
  margin-top: 22px; font-family: var(--font-label); font-size: 10.5px; font-weight: 700;
  letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--text-primary);
}
.gd__section-label span { background: var(--scribble-butter) left bottom / 100% 6px no-repeat; padding: 0 2px 5px; }
.gd__h3 {
  margin: 20px 0 0; font-family: var(--font-display); font-weight: 700; font-size: 14.5px;
  letter-spacing: -0.01em; color: var(--text-primary);
}
.gd__prose { margin-top: 8px; font-size: 13.5px; line-height: 1.6; color: var(--gray-700); }
.gd .gd__acc-btn {
  margin-top: 10px; width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 12px 2px; border: none; background: none;
  border-bottom: 1.5px solid var(--gray-100); cursor: pointer; text-align: left;
}
.gd__acc-title {
  flex: 1; font-family: var(--font-display); font-weight: 700; font-size: 14.5px;
  letter-spacing: -0.01em; color: var(--text-primary);
}
.gd__chev {
  display: inline-block; width: 9px; height: 9px;
  border-left: 2px solid var(--gray-500); border-bottom: 2px solid var(--gray-500);
  border-radius: 1px; flex: none; margin-right: 4px;
  transform: rotate(135deg);
  transition: transform var(--dur-med) var(--ease-launch);
}
.gd__acc-btn[aria-expanded='true'] .gd__chev { transform: rotate(-45deg); }
.gd__steps { margin: 12px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.gd__step { display: flex; align-items: flex-start; gap: 10px; }
.gd__step-n {
  flex: none; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-pill); background: var(--accent-yellow); color: var(--text-on-accent);
  box-shadow: var(--sticker-cut);
  font-family: var(--font-label); font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.gd__step-t { font-size: 13.5px; line-height: 1.55; color: var(--gray-700); }
.gd__bullets { margin: 12px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.gd__bullet { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.55; color: var(--gray-700); }

/* Apply sheet. */
.gd__overlay { position: fixed; inset: 0; z-index: 100; background: var(--overlay); }
.gd__apply {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: 0; z-index: 101; width: 100%; max-width: 520px; box-sizing: border-box;
  background: var(--surface-card);
  border-radius: var(--radius-hand-lg) var(--radius-hand-lg) 0 0;
  box-shadow: var(--shadow-paper-lg);
  padding: 22px 20px calc(28px + env(safe-area-inset-bottom, 0px));
}
.gd__apply h2 {
  margin: 0 0 8px; font-family: var(--font-display); font-weight: 800; font-size: 20px;
  letter-spacing: var(--tracking-tight); color: var(--text-primary);
}
.gd__apply p { margin: 0 0 18px; font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); }
```

- [ ] **Step 4: Write `src/app/parts/ApplySheet.jsx`**

```jsx
import { useEffect, useRef } from 'react';
import { Button } from 'axelerate-design-system';
import '../screens/gigs-detail.css';

// Applications have no backend. This sheet says so plainly rather than
// pretending to submit — the same rule the /join form follows.
export default function ApplySheet({ open, onClose, missionTitle }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector('button')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="gd__overlay" onClick={onClose} aria-hidden="true" />
      <div className="gd__apply" role="dialog" aria-modal="true" aria-label="Apply" ref={ref}>
        <h2>Applications open at launch.</h2>
        <p>
          Nothing was sent. When verification opens you will apply to “{missionTitle}” from here, and
          the host will see it.
        </p>
        <Button variant="secondary" size="md" fullWidth onClick={onClose}>Close</Button>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Write `src/app/screens/GigsDetail.jsx`**

```jsx
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Tag, Badge, StickyNote } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import ApplySheet from '../parts/ApplySheet.jsx';
import { usd, credit } from '../parts/Money.jsx';
import missions from '../../data/missions.example.json';
import NotFoundPage from '../../pages/NotFoundPage.jsx';
import './gigs-detail.css';

const PIPS = [
  { initial: 'J', bg: 'var(--tint-lilac-soft)', fg: 'var(--violet-700)' },
  { initial: 'M', bg: 'var(--accent-cyan-soft)', fg: 'var(--ink-900)' },
  { initial: 'S', bg: 'var(--accent-yellow-soft)', fg: 'var(--ink-900)' },
];

const PERK_BULLETS = [
  { icon: 'trophy', lead: 'Cash commission:', text: 'convert a salon and earn 10% of their initial order. A full clinical package runs about $10,000 — roughly $1,000 per salon, with no cap.' },
  { icon: 'rocket', lead: 'Real B2B experience:', text: 'pitch commercial value to real business owners — the kind of business-development work a resume can show.' },
  { icon: 'star', lead: 'Credit rewards:', text: 'earn campus credit for valid field-visit logs and material drop-offs, even without a sale.' },
];

export default function GigsDetail() {
  const { slug } = useParams();
  const m = missions.find((x) => x.slug === slug);
  const [open, setOpen] = useState('do');
  const [applying, setApplying] = useState(false);

  if (!m) return <NotFoundPage />;

  const toggle = (id) => setOpen((o) => (o === id ? null : id));
  const acc = (id, title, body) => (
    <>
      <button type="button" className="gd__acc-btn" aria-expanded={open === id} onClick={() => toggle(id)}>
        <span className="gd__acc-title">{title}</span>
        <span className="gd__chev" />
      </button>
      {open === id && body}
    </>
  );

  return (
    <div className="gd">
      <div className="gd__top">
        <Link to="/app/gigs" className="gd__back" aria-label="Back"><span className="gd__chev-l" /></Link>
        <span className="gd__kicker">Mission</span>
        <span className="gd__spacer" />
        <Button variant="primary" size="md" onClick={() => setApplying(true)}>Apply</Button>
      </div>

      <div className="gd__sheet">
        <div className="gd__tape" aria-hidden="true" />
        <ImageSlot label={m.photoLabel} ratio="4 / 3" radius={12} />
        <div className="gd__tags">
          {m.tags.map((t) => (
            <Tag key={t.label} tone={t.tone}><Icon name={t.icon} set="solid" size={13} />{t.label}</Tag>
          ))}
        </div>
        <h1 className="gd__title">{m.title}</h1>

        <div className="gd__host">
          <span className="gd__host-mark">{m.host.name[0].toLowerCase()}</span>
          <div>
            <div className="gd__host-name">{m.host.name}</div>
            <div className="gd__host-role">{m.host.role}</div>
          </div>
          {m.spots && (
            <div className="gd__going">
              {PIPS.map((p) => (
                <span key={p.initial} className="gd__pip" style={{ background: p.bg, color: p.fg }}>{p.initial}</span>
              ))}
              <span className="gd__going-n">{m.spots.taken} going</span>
            </div>
          )}
        </div>

        <div className="gd__earn-wrap">
          <div className="gd__earn-badge"><Badge tone="lilac" tilt={-4}>guest tier</Badge></div>
          <StickyNote tint="yellow" tape tilt={-0.8} heading="You earn">
            <div className="gd__earn-grid" data-testid="earn">
              <div>
                <div className="gd__earn-fig">{usd(m.payUsd)}</div>
                <div className="gd__earn-lab">cash</div>
              </div>
              <div>
                <div className="gd__earn-fig">+{m.xp.toLocaleString('en-US')}</div>
                <div className="gd__earn-lab">xp</div>
              </div>
              <div />
              {credit(m.creditPts) && <div className="gd__earn-credit">{credit(m.creditPts)}</div>}
            </div>
            <div className="gd__earn-meta">
              <div>
                <div className="gd__earn-lab">Deadline</div>
                <div className="gd__earn-val">{m.deadline}</div>
              </div>
              {m.spots && (
                <div>
                  <div className="gd__earn-lab">Spots</div>
                  <div className="gd__earn-val">{m.spots.taken}/{m.spots.total}</div>
                </div>
              )}
            </div>
          </StickyNote>
        </div>
      </div>

      <div className="gd__section-label"><span>About the mission</span></div>
      <h3 className="gd__h3">The mission</h3>
      <p className="gd__prose">{m.desc}</p>

      {acc('do', "What you'll do", (
        <ol className="gd__steps">
          {m.steps.map((s, i) => (
            <li key={s} className="gd__step">
              <span className="gd__step-n">{i + 1}</span>
              <span className="gd__step-t">{s}</span>
            </li>
          ))}
        </ol>
      ))}

      {acc('perks', "What's in it for you", (
        <ul className="gd__bullets">
          {PERK_BULLETS.map((b) => (
            <li key={b.lead} className="gd__bullet">
              <Icon name={b.icon} set="solid" size={17} style={{ color: 'var(--violet-600)', marginTop: 2 }} />
              <span><strong>{b.lead}</strong> {b.text}</span>
            </li>
          ))}
        </ul>
      ))}

      {acc('support', 'Support and training', (
        <>
          <p className="gd__prose">
            New to beauty or B2B sales? Once you accept you get the full sales script, ice-breakers that
            work with owners, and a pitch deck.
          </p>
          <p className="gd__prose">Strong communicator? Apply and get started.</p>
        </>
      ))}

      <ApplySheet open={applying} onClose={() => setApplying(false)} missionTitle={m.title} />
    </div>
  );
}
```

Copy note: the design's "Killer communication skills and hungry for real earning potential? Hit apply and get started." becomes "Strong communicator? Apply and get started." — the client's facts (commission rate, package price, materials) are reproduced exactly; only the register is brought into line, per spec §5.3.

- [ ] **Step 6: Run the tests, then commit**

```bash
cd /Users/carriewang/axelerate-website-h5
npx vitest run tests/unit/gigs-detail.test.jsx 2>&1 | tail -12
npm test 2>&1 | tail -4
git add src/app/screens/GigsDetail.jsx src/app/screens/gigs-detail.css src/app/parts/ApplySheet.jsx tests/unit/gigs-detail.test.jsx
git commit -m "Build the mission detail as drawn

Taped sheet, host row with going-pips, the 'You earn' sticky note, and
an exclusive accordion. Credit renders only through Money.credit() in
R1's one-string form — the design's bare '+8,000 pts' does not appear.
Apply opens a sheet stating applications open at launch; a test
asserts fetch is never called.

Client facts are reproduced exactly; the register follows the design
system's voice rules per spec §5.3.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: 9 pass in the new file; full suite 125 pass (116 + 9).

---

### Task 8: Perks and Application screens

**Files:**
- Modify: `src/app/screens/Perks.jsx`, `src/app/screens/Application.jsx` (replace stubs)
- Create: `src/app/screens/screens.css`
- Test: `tests/unit/perks-application.test.jsx`

**Interfaces:**
- Consumes: `perks.example.json`, `applications.example.json`, `missions.example.json`, `Money.credit`, design-system `Card`, `Tag`, `StickyNote`, `Badge`
- Produces: the two screens; `screens.css` shared by both and by `Me` in Task 9

The student's standing (`level: 2`) is the same constant `GigsBoard` uses. Export it once: add `export const ME = { level: 2, xp: 380 };` to `src/app/parts/Money.jsx`? **No** — put it in a new `src/app/me.js` so money and identity stay separate concerns, and have `GigsBoard` import from there in this task.

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/perks-application.test.jsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Perks from '../../src/app/screens/Perks.jsx';
import Application from '../../src/app/screens/Application.jsx';
import perks from '../../src/data/perks.example.json';
import { ME } from '../../src/app/me.js';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Perks', () => {
  test('lists all five levels in order with their perks', () => {
    wrap(<Perks />);
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Explorer', 'Contributor', 'Insider', 'Trusted', 'Partner']);
    for (const p of perks[0].perks) expect(screen.getByText(p)).toBeInTheDocument();
  });

  test("marks the student's current level and shows distance on locked ones (R8)", () => {
    wrap(<Perks />);
    const mine = screen.getByTestId(`level-${ME.level}`);
    expect(mine.dataset.state).toBe('current');
    const locked = screen.getByTestId(`level-${ME.level + 1}`);
    expect(locked.dataset.state).toBe('locked');
    expect(within(locked).getByText(/XP away/)).toBeInTheDocument();
    expect(locked.textContent).not.toMatch(/^locked$/i);
  });

  test('states the shop has one gate — verification (R4)', () => {
    wrap(<Perks />);
    expect(screen.getByText(/One gate: verification/)).toBeInTheDocument();
  });

  test('shows the credit balance in R1 form, never bare', () => {
    wrap(<Perks />);
    expect(screen.getByText(/credit · \$\d+ in shop/)).toBeInTheDocument();
  });

  test('promises no extra pay (R7)', () => {
    wrap(<Perks />);
    expect(document.body.textContent).not.toMatch(/earn more|higher pay|more pay|pay multiplier/i);
  });
});

describe('Application', () => {
  test('lists every application with its mission, pay and status', () => {
    wrap(<Application />);
    const rows = screen.getAllByTestId('application-row');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText(/\$/)).toBeInTheDocument();
  });

  test('each row shows a status from the loop', () => {
    wrap(<Application />);
    const statuses = screen.getAllByTestId('application-row').map((r) => r.dataset.status);
    for (const s of statuses) expect(['applied','doing','submitted','approved','paid']).toContain(s);
  });

  test('rows link to their mission', () => {
    wrap(<Application />);
    const first = screen.getAllByTestId('application-row')[0];
    expect(within(first).getByRole('link')).toHaveAttribute('href', expect.stringContaining('/app/gigs/'));
  });

  test('nothing implies a real submission', () => {
    wrap(<Application />);
    expect(document.body.textContent).not.toMatch(/we (will|'ll) (email|contact|be in touch)/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/perks-application.test.jsx 2>&1 | tail -5
```

Expected: FAIL — cannot resolve `src/app/me.js`.

- [ ] **Step 3: Create `src/app/me.js` and point `GigsBoard` at it**

```js
// The signed-in student's standing. Hard-coded until Supabase supplies it;
// drives which missions are locked and how far away each level is.
export const ME = {
  level: 2,
  xp: 380,
  creditPts: 2400,
  cashUsd: 133,
  onTimePct: 94,
  missionsDone: 4,
  brands: 3,
  streakWeeks: 3,
};

// Product spec §3.2 promotion gates, XP component only.
export const LEVEL_XP = { 1: 0, 2: 300, 3: 1200, 4: 3000, 5: 6000 };
export const XP_PER_MISSION = 200;

export function distanceTo(level) {
  const xpAway = Math.max(0, (LEVEL_XP[level] ?? 0) - ME.xp);
  return { xpAway, missionsAway: Math.max(1, Math.round(xpAway / XP_PER_MISSION)) };
}
```

In `src/app/screens/GigsBoard.jsx`, delete the local `ME`, `XP_PER_MISSION` and the `gates` map inside `lockFor`, and import instead:

```jsx
import { ME, distanceTo } from '../me.js';
…
function lockFor(m) {
  return m.minLevel <= ME.level ? undefined : distanceTo(m.minLevel);
}
```

- [ ] **Step 4: Write `src/app/screens/screens.css`**

```css
.scr__h1 {
  margin: 0 0 6px;
  font-family: var(--font-display); font-weight: 800; font-size: 24px;
  letter-spacing: var(--tracking-tight); color: var(--text-primary);
}
.scr__lede { margin: 0 0 20px; font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); }
.scr__list { display: flex; flex-direction: column; gap: 12px; }
.scr__row-top { display: flex; align-items: baseline; gap: 8px; }
.scr__row-title {
  margin: 0; font-family: var(--font-display); font-weight: 700; font-size: 14.5px;
  letter-spacing: -0.01em; color: var(--text-primary);
}
.scr__row-pay {
  margin-left: auto; font-family: var(--font-display); font-weight: 800; font-size: 17px;
  letter-spacing: var(--tracking-tight); font-variant-numeric: tabular-nums; color: var(--text-primary);
}
.scr__row-meta {
  margin-top: 4px; font-family: var(--font-label); font-size: 10.5px; font-weight: 500;
  letter-spacing: .04em; color: var(--gray-600);
}
.scr__row-link { text-decoration: none; color: inherit; display: block; }
.scr__level-name {
  margin: 0; font-family: var(--font-display); font-weight: 800; font-size: 17px;
  letter-spacing: var(--tracking-tight); color: var(--text-primary);
}
.scr__level-gate {
  margin: 6px 0 10px; font-family: var(--font-label); font-size: 10px; font-weight: 700;
  letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--gray-600);
}
.scr__perks { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.scr__perk { font-size: 13px; line-height: 1.5; color: var(--gray-700); display: flex; gap: 8px; align-items: flex-start; }
.scr__away { font-family: var(--font-hand); font-size: 17px; color: var(--gray-600); margin-top: 10px; }
[data-state='locked'] .scr__level-name { color: var(--text-secondary); }
```

- [ ] **Step 5: Write `src/app/screens/Perks.jsx`**

```jsx
import { Card, Tag, StickyNote } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import { credit } from '../parts/Money.jsx';
import { ME, distanceTo } from '../me.js';
import levels from '../../data/perks.example.json';
import './screens.css';

export default function Perks() {
  return (
    <div className="scr">
      <h1 className="scr__h1">Perks</h1>
      <p className="scr__lede">
        Levels buy access, status and perks. Your balance is <strong>{credit(ME.creditPts)}</strong>.
      </p>

      <div style={{ marginBottom: 20 }}>
        <StickyNote tint="lilac" tilt={-1} heading="The shop">
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
            One gate: verification. Every verified student buys at the student price from day one —
            nothing at checkout is held behind a level.
          </p>
        </StickyNote>
      </div>

      <div className="scr__list">
        {levels.map((l) => {
          const state = l.level < ME.level ? 'earned' : l.level === ME.level ? 'current' : 'locked';
          const away = state === 'locked' ? distanceTo(l.level) : null;
          return (
            <Card
              key={l.level}
              variant={state === 'locked' ? 'sketch' : 'sheet'}
              padding="md"
              data-testid={`level-${l.level}`}
              data-state={state}
            >
              <div className="scr__row-top">
                <h3 className="scr__level-name">{l.name}</h3>
                <span style={{ marginLeft: 'auto' }}>
                  {state === 'current' && <Tag tone="lilac" selected>You are here</Tag>}
                  {state === 'earned' && <Tag tone="lime" soft>Earned</Tag>}
                  {state === 'locked' && <Tag tone="ink" soft>LV.{l.level}</Tag>}
                </span>
              </div>
              <p className="scr__level-gate">{l.gate}</p>
              <ul className="scr__perks">
                {l.perks.map((p) => (
                  <li key={p} className="scr__perk">
                    <Icon name="tick-2" set="solid" size={14} style={{ color: 'var(--text-brand)', marginTop: 2 }} />
                    {p}
                  </li>
                ))}
              </ul>
              {away && (
                <p className="scr__away">
                  {away.xpAway.toLocaleString('en-US')} XP away · about {away.missionsAway}{' '}
                  {away.missionsAway === 1 ? 'mission' : 'missions'}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/app/screens/Application.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { Card, Tag } from 'axelerate-design-system';
import applications from '../../data/applications.example.json';
import missions from '../../data/missions.example.json';
import './screens.css';

// Statuses follow the product spec's loop: apply → do the work → approved →
// cash lands. Tones come from the design system, never invented colours.
const STATUS = {
  applied: { label: 'Applied', tone: 'ink' },
  doing: { label: 'Doing', tone: 'cyan' },
  submitted: { label: 'Submitted', tone: 'lilac' },
  approved: { label: 'Approved', tone: 'lime' },
  paid: { label: 'Paid', tone: 'teal' },
};

const usd = (n) => '$' + Number(n).toLocaleString('en-US');

export default function Application() {
  const rows = applications
    .map((a) => ({ ...a, mission: missions.find((m) => m.slug === a.missionSlug) }))
    .filter((r) => r.mission);

  return (
    <div className="scr">
      <h1 className="scr__h1">Application</h1>
      <p className="scr__lede">Every mission you have applied to, and where it stands.</p>

      {rows.length === 0 ? (
        <Card variant="sketch" padding="md">
          <p style={{ margin: 0, fontSize: 13.5 }}>
            Nothing yet. <Link to="/app/gigs">Find a mission</Link>.
          </p>
        </Card>
      ) : (
        <div className="scr__list">
          {rows.map((r) => (
            <Card key={r.missionSlug} variant="sheet" padding="md" data-testid="application-row" data-status={r.status}>
              <Link to={`/app/gigs/${r.missionSlug}`} className="scr__row-link">
                <div className="scr__row-top">
                  <h3 className="scr__row-title">{r.mission.title}</h3>
                  <span className="scr__row-pay">{usd(r.mission.payUsd)}</span>
                </div>
                <div className="scr__row-meta">
                  {r.mission.brand} · applied {r.appliedAt}
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Tag>
                  <span className="scr__row-meta" style={{ marginTop: 0 }}>{r.note}</span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Run the tests, then commit**

```bash
cd /Users/carriewang/axelerate-website-h5
npx vitest run tests/unit/perks-application.test.jsx tests/unit/gigs-board.test.jsx 2>&1 | tail -10
npm test 2>&1 | tail -4
git add src/app/me.js src/app/screens tests/unit/perks-application.test.jsx
git commit -m "Add the Perks and Application screens

Perks shows the five levels from product spec §3.2 as access and
status, never pay (R7), with R8 distance on locked levels and the
credit balance only in R1 form. Application lists the student's
pipeline along the spec's loop using design-system Tag tones.

The student's standing moves to src/app/me.js so the board and these
screens share one source for level, XP and the §3.2 gates.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: 9 pass in the new file, `gigs-board.test.jsx` still 12; full suite 134 pass (125 + 9).

---

### Task 9: The Me screen, and the XP ruling

**Files:**
- Modify: `src/app/screens/Me.jsx` (replace the stub)
- Test: `tests/unit/me.test.jsx`

**Interfaces:**
- Consumes: `ME`, `distanceTo`, `LEVEL_XP` from `src/app/me.js`; `Money.credit`; `MarkerBar`, `StatBlock`, `Card`, `Tag`, `StickyNote` from the design system; `quests.example.json`
- Produces: the Me screen at `/app/me`

**This task carries spec §6.3.** Product spec §3.6 asks for an XP *ring* and a 2.5-second level-up takeover; the design system forbids solid progress bars and any motion over 320ms. The ruling: XP progress renders with the design system's `MarkerBar` — its own "hatched stroke" progress vocabulary — and there is no takeover. **Do not build a ring, a circular SVG progress indicator, or any animation longer than 320ms.**

`MarkerBar` props: `value`, `total`, `ticks`, `shape` (`'hatch' | 'dot'`), `color`, `label`, `figure`, `note`, `height`, `inverse`.

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/me.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Me from '../../src/app/screens/Me.jsx';
import { ME, LEVEL_XP } from '../../src/app/me.js';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Me', () => {
  test('shows the level identity and name', () => {
    wrap(<Me />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contributor');
    expect(screen.getByText(/LV\.2/)).toBeInTheDocument();
  });

  test('XP progress uses the marker bar, with the distance as its note', () => {
    const { container } = wrap(<Me />);
    // The design system's MarkerBar renders .ax-marker* markup, not a <progress>
    expect(container.querySelector('[class*="ax-marker"]')).toBeInTheDocument();
    expect(container.querySelector('progress')).toBeNull();
    expect(container.querySelector('svg circle')).toBeNull();     // no ring
    expect(screen.getByText(`${ME.xp.toLocaleString('en-US')} / ${LEVEL_XP[3].toLocaleString('en-US')}`)).toBeInTheDocument();
    expect(screen.getByText(/XP away · about/)).toBeInTheDocument();
  });

  test('shows the track record: missions, on-time rate, brands', () => {
    wrap(<Me />);
    expect(screen.getByText(String(ME.missionsDone))).toBeInTheDocument();
    expect(screen.getByText(`${ME.onTimePct}%`)).toBeInTheDocument();
    expect(screen.getByText(String(ME.brands))).toBeInTheDocument();
  });

  test('shows the streak as week pips with the live multiplier', () => {
    wrap(<Me />);
    expect(screen.getByTestId('streak').children.length).toBe(4);
    expect(screen.getByText('×1.25')).toBeInTheDocument();   // 3 weeks, spec §3.4
  });

  test('wallet shows cash and credit in R1 form', () => {
    wrap(<Me />);
    expect(screen.getByText('$133')).toBeInTheDocument();
    expect(screen.getByText('2,400 credit · $24 in shop')).toBeInTheDocument();
  });

  test('lists the active quests', () => {
    wrap(<Me />);
    expect(screen.getByText('Three formats')).toBeInTheDocument();
  });

  test('no animation exceeds 320ms and no takeover exists', () => {
    const { container } = wrap(<Me />);
    const html = container.innerHTML;
    const durations = [...html.matchAll(/(\d+)ms/g)].map((m) => Number(m[1]));
    for (const d of durations) expect(d).toBeLessThanOrEqual(320);
    expect(html).not.toMatch(/takeover/i);
  });

  test('promises no extra pay for levelling (R7)', () => {
    wrap(<Me />);
    expect(document.body.textContent).not.toMatch(/earn more|higher pay|more pay|pay multiplier/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx vitest run tests/unit/me.test.jsx 2>&1 | tail -5
```

Expected: FAIL — the stub renders only "Me".

- [ ] **Step 3: Write `src/app/screens/Me.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { Card, Tag, StatBlock, MarkerBar, StickyNote } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import { credit, usd } from '../parts/Money.jsx';
import { ME, LEVEL_XP, distanceTo } from '../me.js';
import levels from '../../data/perks.example.json';
import quests from '../../data/quests.example.json';
import './screens.css';

// Product spec §3.4 streak multipliers.
const MULTIPLIER = { 1: '×1.0', 2: '×1.1', 3: '×1.25' };
const mult = (w) => MULTIPLIER[w] ?? '×1.5';

export default function Me() {
  const level = levels.find((l) => l.level === ME.level);
  const next = ME.level + 1;
  const away = distanceTo(next);

  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flex: 'none', boxShadow: 'var(--sticker-cut), var(--shadow-paper)' }}>
          <ImageSlot label="Me" radius={999} />
        </div>
        <div>
          <h1 className="scr__h1" style={{ marginBottom: 2 }}>{level.name}</h1>
          <Tag tone="lilac" selected>LV.{ME.level}</Tag>
        </div>
      </div>

      {/* §6.3: progress in the brand's own vocabulary — hatched strokes, not a
          ring. The near-miss distance (R8) is the note. */}
      <Card variant="sheet" padding="md" style={{ marginBottom: 14 }}>
        <MarkerBar
          value={ME.xp}
          total={LEVEL_XP[next]}
          color="violet"
          label={`XP to ${levels.find((l) => l.level === next)?.name ?? 'the next level'}`}
          figure={`${ME.xp.toLocaleString('en-US')} / ${LEVEL_XP[next].toLocaleString('en-US')}`}
          note={`${away.xpAway.toLocaleString('en-US')} XP away · about ${away.missionsAway} ${away.missionsAway === 1 ? 'mission' : 'missions'}`}
        />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Card variant="quiet" padding="sm"><StatBlock figure={String(ME.missionsDone)} label="missions" /></Card>
        <Card variant="quiet" padding="sm"><StatBlock figure={`${ME.onTimePct}%`} label="on time" /></Card>
        <Card variant="quiet" padding="sm"><StatBlock figure={String(ME.brands)} label="brands" /></Card>
      </div>

      <Card variant="sheet" padding="md" style={{ marginBottom: 14 }}>
        <div className="scr__row-top">
          <h3 className="scr__row-title">Weekly run</h3>
          <span className="scr__row-pay">{mult(ME.streakWeeks)}</span>
        </div>
        <div data-testid="streak" style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4].map((w) => (
            <span
              key={w}
              style={{
                flex: 1, height: 8, borderRadius: 999,
                background: w <= ME.streakWeeks ? 'var(--violet-600)' : 'var(--gray-200)',
              }}
            />
          ))}
        </div>
        <p className="scr__row-meta">{ME.streakWeeks} weeks · one mission a week keeps it running</p>
      </Card>

      <Card variant="sheet" padding="md" style={{ marginBottom: 14 }}>
        <h3 className="scr__row-title">Wallet</h3>
        <div style={{ marginTop: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <StatBlock figure={usd(ME.cashUsd)} label="cash · withdrawable" />
        </div>
        <p className="scr__row-meta" style={{ marginTop: 8 }}>{credit(ME.creditPts)}</p>
      </Card>

      <h3 className="scr__row-title" style={{ marginBottom: 10 }}>Active quests</h3>
      <div className="scr__list">
        {quests.slice(0, 2).map((q) => (
          <Card key={q.title} variant="quiet" padding="md">
            <div className="scr__row-top">
              <h4 className="scr__row-title" style={{ fontSize: 13.5 }}>{q.title}</h4>
              <span className="scr__row-pay" style={{ fontSize: 14 }}>{q.reward}</span>
            </div>
            <p className="scr__row-meta">{q.desc}</p>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <StickyNote tint="cyan" tilt={-1} heading="Your public profile">
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
            Completed missions publish to your profile as verified, brand-backed skill tags.
            It goes live at Contributor. <Link to="/app/perks">See what each level opens</Link>.
          </p>
        </StickyNote>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests, then commit**

```bash
cd /Users/carriewang/axelerate-website-h5
npx vitest run tests/unit/me.test.jsx 2>&1 | tail -10
npm test 2>&1 | tail -4
git add src/app/screens/Me.jsx tests/unit/me.test.jsx
git commit -m "Add the Me screen; XP progress uses MarkerBar, not a ring

Product spec §3.6 asks for an XP ring and a 2.5s level-up takeover;
the design system forbids solid progress bars and motion over 320ms.
Per app spec §6.3 this renders progress with the design system's own
MarkerBar — hatched strokes filled to the value — with the R8 distance
as its handwritten note, and no takeover. A test asserts there is no
<progress>, no SVG circle, and no duration above 320ms.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

Expected: 8 pass in the new file; full suite 142 pass (134 + 8). If `MarkerBar`'s DOM does not expose a class matching `ax-marker`, read `node_modules/axelerate-design-system/components/data/MarkerBar.jsx` and assert on the class it actually emits — **report the class name you used and why.**

---

### Task 10: End-to-end coverage and the README

**Files:**
- Modify: `tests/e2e/responsive.spec.js`, `README.md`
- Test: the e2e file is the test

**Interfaces:**
- Consumes: every screen from Tasks 2–9
- Produces: the overflow guard across 12 routes; app behaviour tests; documentation

- [ ] **Step 1: Extend the route list and add app e2e**

In `tests/e2e/responsive.spec.js`, replace the `ROUTES` constant and append the new tests. `WIDTHS` is unchanged.

```js
const ROUTES = [
  '/', '/for-brands', '/join',
  '/legal/terms', '/legal/privacy', '/legal/payouts',
  '/app/gigs', '/app/gigs/dermabell-campus-launch',
  '/app/perks', '/app/application', '/app/me',
  '/definitely-not-a-page',
];
```

Append:

```js
test('the app tab bar switches screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/app/gigs');
  const bar = page.getByRole('navigation', { name: 'App' });
  await expect(bar).toBeVisible();
  for (const [label, heading] of [['Perks', 'Perks'], ['Application', 'Application'], ['Me', 'Contributor']]) {
    await bar.getByRole('link', { name: label }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
  }
  await bar.getByRole('link', { name: 'Gigs' }).click();
  await expect(page.getByRole('heading', { name: 'Missions' })).toBeVisible();
});

test('a mission tile opens detail and back returns to the board', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/app/gigs');
  await page.getByRole('link', { name: /Fable Coffee|morning routine/ }).first().click();
  await expect(page).toHaveURL(/\/app\/gigs\/[a-z-]+$/);
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/app\/gigs$/);
});

test('Apply opens the sheet and sends nothing', async ({ page }) => {
  const calls = [];
  page.on('request', (r) => { if (['fetch', 'xhr'].includes(r.resourceType())) calls.push(r.url()); });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/app/gigs/dermabell-campus-launch');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('dialog', { name: 'Apply' })).toBeVisible();
  expect(calls, 'no fetch/xhr should fire').toEqual([]);
});

test('the tab bar never covers the last content element at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const route of ['/app/gigs', '/app/perks', '/app/application', '/app/me']) {
    await page.goto(route);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const { contentBottom, barTop } = await page.evaluate(() => {
      const col = document.querySelector('.app__col');
      const bar = document.querySelector('.app__tabs');
      return {
        contentBottom: col.lastElementChild.getBoundingClientRect().bottom,
        barTop: bar.getBoundingClientRect().top,
      };
    });
    expect(contentBottom, `${route}: content runs under the tab bar`).toBeLessThanOrEqual(barTop);
  }
});

test('every app screen carries the preview marker', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const route of ['/app/gigs', '/app/perks', '/app/application', '/app/me']) {
    await page.goto(route);
    await expect(page.getByText('Preview · example data')).toBeVisible();
  }
});
```

- [ ] **Step 2: Run the e2e suite**

```bash
cd /Users/carriewang/axelerate-website-h5 && npx playwright test 2>&1 | tail -20
```

Expected: 72 overflow tests (12 routes × 6 widths) plus the existing 5 behaviour tests plus 5 new = **82 pass**.

**If an overflow test fails on an app route, the fix is in app CSS — never in `node_modules`, and never by loosening `toBeLessThanOrEqual(clientWidth)`.** Likely culprits at 320px: the 2-column `.gb__grid` (drop to one column below 360px), the `.ft` folder tabs row (it scrolls — add `overflow-x: auto`), or the detail's `.gd__earn-grid` three columns. Show the failing assertion, the CSS change, and the passing re-run.

- [ ] **Step 3: Update `README.md`**

In the "Pages" table, add a row group after the legal row:

```markdown
### The app

| Route | What |
| --- | --- |
| `/app/gigs` | Missions board — quest deck, format tabs, filter chips, mission tiles |
| `/app/gigs/:slug` | Mission detail — earnings, field steps, apply sheet |
| `/app/perks` | The five levels and what each opens |
| `/app/application` | The student's own pipeline |
| `/app/me` | Level, XP progress, streak, wallet, quests |

The app is a phone-width column (520px, centred) with its own bottom tab bar; the
marketing site's nav and footer do not render there. **Every app screen carries a
"Preview · example data" marker** — the screens show money with no backend behind
them, and Apply never submits.

Two product-spec requirements are deliberately not built as written: the app's four
tabs supersede the spec's three (§4.2), and XP progress uses the design system's
`MarkerBar` rather than the ring §3.6 asks for, because the design system forbids solid
progress bars and motion over 320ms. Both are recorded in
`.superpowers/specs/2026-08-26-axelerate-app-h5-design.md` §2.1 and §6.3.
```

- [ ] **Step 4: Full verification**

```bash
cd /Users/carriewang/axelerate-website-h5
npm test 2>&1 | tail -4
npx playwright test 2>&1 | tail -4
npm run build 2>&1 | tail -3
echo "--- raw hex in app code (expect 0) ---"; grep -rnE '#[0-9a-fA-F]{3,8}\b' src/app --include='*.jsx' --include='*.css' | grep -v 'radius: 999' | wc -l | tr -d ' '
echo "--- app CSS targeting .ax-* (expect 0) ---"; grep -rn '\.ax-' src/app --include='*.css' | wc -l | tr -d ' '
echo "--- credit outside Money.jsx (expect 0) ---"; grep -rln '\bcredit\b' src/app --include='*.jsx' | grep -v Money.jsx | wc -l | tr -d ' '
echo "--- banned words (expect 0) ---"; grep -rniE '\b(synergy|leverage|ecosystem|empower|successfully)\b' src | wc -l | tr -d ' '
echo "--- design system untouched ---"; cd /Users/carriewang/axelerate-design-system && git status --porcelain | wc -l | tr -d ' '
```

Expected: 142 unit, 82 e2e, build succeeds, all five counts 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/carriewang/axelerate-website-h5
git add tests/e2e/responsive.spec.js README.md
git commit -m "Extend the overflow guard to the app, and document it

Twelve routes across six widths, plus app behaviour: the tab bar
switches screens, a tile opens detail and back returns, Apply opens
its sheet without sending anything, the tab bar never covers the last
content element at 320px, and every app screen shows the preview
marker.

README records the two deliberate departures from the product spec —
four tabs, and MarkerBar instead of the XP ring.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
| --- | --- |
| §2.1 four tabs supersede §4.2's three | Task 2 (TabBar), Task 10 (README) |
| §3.1 one repo, file layout | Tasks 2–9 |
| §3.2 routes incl. `/app` redirect and app-scoped 404 | Task 2 |
| §3.3 phone column, safe-area tab bar, 320px floor | Task 2 (`app.css`), Task 10 (e2e) |
| §4.1 missions fixture extension, all 10 fields | Task 4 |
| §4.2 quests / perks / applications fixtures | Task 4 |
| §5.1 Gigs board as drawn | Tasks 5, 6 |
| §5.2 Gigs detail as drawn | Task 7 |
| §5.3 client copy — facts kept, register aligned | Task 7 Step 5 |
| §5.4 Perks from spec | Task 8 |
| §5.5 Application from spec | Task 8 |
| §5.6 Me from spec | Task 9 |
| §6.1 18 assets to the DS repo, then re-pin | Task 1 |
| §6.2 credit only via `Money.credit()` | Task 3, enforced by its own test |
| §6.3 MarkerBar, not a ring | Task 9 |
| §6.4 preview marker on every app screen | Task 2, e2e in Task 10 |
| §7 unit + e2e | every task; Task 10 for e2e |
| §8 out of scope | nothing built for it |

**Deviations from spec, flagged:**
1. Spec §3.1's file tree put `Money.jsx` under `src/app/parts/`; this plan also adds **`src/app/me.js`** (Task 8 Step 3), which the tree does not list. The student's standing was going to be duplicated between `GigsBoard`, `Perks` and `Me`; one module is better than three copies. Task 8 moves it there and repoints `GigsBoard`.
2. Task 6 Step 4 reorders `MissionTile`'s DOM so the price is the **first** child and CSS `order` places it visually last. The design draws the price at the bottom; R1's test asserts the tile's text *starts* with the figure. Both are satisfied this way, and a screen reader hears the price first — which is what R1 is actually for.

**Placeholder scan:** no TBD/TODO. The `<NEW_SHA>` in Task 1 Step 6 is filled from Step 5's output within the same task. Task 9's fallback instruction (read `MarkerBar.jsx` if the class differs) names the file and requires reporting — a concrete branch, not a vague one.

**Type consistency:** `ME` / `distanceTo` / `LEVEL_XP` are defined once in Task 8 and consumed by Tasks 8 and 9 with the same shape; `GigsBoard` (Task 6) initially defines its own and Task 8 explicitly repoints it — the only place a name moves, and the move is a step. `credit(pts)` / `usd(n)` signatures match across Tasks 3, 7, 8, 9. `<MissionTile mission locked isNew>` matches between Task 6's definition and its tests. `<Icon name set size style>` matches Task 2's definition and every later use. Test-id names (`mission-tile`, `earn`, `application-row`, `level-N`, `streak`) are each defined and asserted in the same task. Route strings match between Task 2's router, every `Link`, and Task 10's e2e list.
