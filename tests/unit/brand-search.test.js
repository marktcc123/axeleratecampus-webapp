// The rule Discover's Brands row applies (owner, 2026-09-22: "brands需要筛选项
// 和搜索", then 2026-09-23: "不要filter了 只要搜索"): search alone, on the name
// or the tagline. Kept beside brandIndex, whose rows it takes.
import { FIXTURES } from '../../src/app/content.jsx';
import { brandIndex, searchBrands } from '../../src/app/parts/Brands.jsx';

const all = brandIndex(FIXTURES.brands, FIXTURES.missions, FIXTURES.products);
const ids = (rows) => rows.map((b) => b.id);

test('an empty query passes every brand', () => {
  expect(searchBrands(all, '')).toEqual(all);
  expect(searchBrands(all, '   ')).toEqual(all);
});

test('matches the name or the tagline, whatever the case', () => {
  expect(ids(searchBrands(all, 'ITALIC'))).toEqual(['italic']);
  expect(ids(searchBrands(all, 'yuzu'))).toEqual(['solra']);   // Solra's tagline
  expect(searchBrands(all, 'zzz')).toEqual([]);
});
