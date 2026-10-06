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
