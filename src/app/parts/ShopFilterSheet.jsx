import { Checkbox } from 'axelerate-design-system';
import FilterChips from './FilterChips.jsx';
import FilterSheet from './FilterSheet.jsx';
import './shop-filter-sheet.css';

// The shop's filters, as a sheet (owner, 2026-09-08, from a reference screen):
// product category, brand (multi), availability. The reference also had "Your
// tier"; the products carry no tier, so it is not drawn — a section that never
// changes the grid is decoration. The shell — overlay, focus trap, head, foot
// — is FilterSheet's, shared with the Brands sheet since 2026-09-22.
//
// Changes apply live to the grid behind; "Show N results" only closes.
export const AVAILABILITY = ['All', 'In stock', 'Sold out', 'Low stock'];
export const LOW_STOCK_UNDER = 15;

export default function ShopFilterSheet({ open, onClose, filters, setFilters, categories, brands, count }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const toggleBrand = (b) => set({ brands: new Set(filters.brands.has(b) ? [...filters.brands].filter((x) => x !== b) : [...filters.brands, b]) });
  // Reset leaves q alone: the search field on the page owns it (owner, 2026-09-08).
  const reset = () => setFilters((f) => ({ ...f, category: 'All', brands: new Set(), availability: 'All' }));

  return (
    <FilterSheet open={open} onClose={onClose} onReset={reset} count={count}>
      <p className="sfs__lab">Product category</p>
      <div className="sfs__chips">
        <FilterChips shape="pill" chips={['All', ...categories]} active={new Set([filters.category])} onToggle={(c) => set({ category: c })} />
      </div>

      <div className="sfs__lab-row">
        <p className="sfs__lab">Brand</p>
        <button type="button" className="sfs__link" onClick={() => set({ brands: new Set(brands) })}>Select all</button>
        <button type="button" className="sfs__link" onClick={() => set({ brands: new Set() })} disabled={filters.brands.size === 0}>Clear</button>
      </div>
      <ul className="sfs__brands" aria-label="Brands">
        {brands.map((b) => (
          <li key={b}>
            {/* The system's Checkbox (owner, 2026-09-09), not a drawn box on a
                button. Its 21px input sits in a 48px label row, which is the
                target — the sheet's touch guard measures the label for it. */}
            <Checkbox label={b} className="sfs__brand" checked={filters.brands.has(b)} onChange={() => toggleBrand(b)} data-testid="filter-brand" />
          </li>
        ))}
      </ul>

      <p className="sfs__lab">Availability</p>
      <div className="sfs__chips">
        <FilterChips shape="pill" chips={AVAILABILITY} active={new Set([filters.availability])} onToggle={(a) => set({ availability: a })} />
      </div>
      <p className="sfs__hint">Low stock: fewer than {LOW_STOCK_UNDER} left.</p>
    </FilterSheet>
  );
}

// The rule the grid applies, kept beside the sheet that edits it.
export function applyFilters(products, { q, category, brands, availability }) {
  const needle = q.trim().toLowerCase();
  return products.filter((p) =>
    (!needle || `${p.title} ${p.brand}`.toLowerCase().includes(needle))
    && (category === 'All' || p.category === category)
    && (brands.size === 0 || brands.has(p.brand))
    && (availability === 'All'
      || (availability === 'In stock' && !p.soldOut && p.stock > 0)
      || (availability === 'Sold out' && (p.soldOut || p.stock === 0))
      || (availability === 'Low stock' && !p.soldOut && p.stock > 0 && p.stock < LOW_STOCK_UNDER)));
}
// What the sheet itself has set — the page's search field is not a filter here.
export const activeCount = (f) => (f.category !== 'All' ? 1 : 0) + (f.brands.size > 0 ? 1 : 0) + (f.availability !== 'All' ? 1 : 0);
