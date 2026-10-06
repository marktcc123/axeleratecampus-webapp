import { useState } from 'react';
import { Button, Input } from 'axelerate-design-system';
import { useAdmin } from '../store.jsx';
import { useContent } from '../../content.jsx';

// Cashback, by brand. Until 2026-09-10 this panel edited a `cashback_rates`
// fixture keyed by CATEGORY that nothing on the student side read — and whose
// categories ("Tea & snacks", "Apparel") were not even the shop's — while the
// rate a student is actually promised is the `cashbackPct` on each product. So
// the note under it, "changing it here changes what the shop promises", was
// false. This writes those products.
//
// Brand, not category, is the axis: a rate is a deal with the brand, and a
// brand is a row now. One product that differs from its brand is edited in
// Shop, beside its price.
const ok = (v) => v !== '' && Number(v) >= 0 && Number(v) <= 100;

// What the brand's products promise today: one rate, or the spread when they
// disagree. A brand with a spread starts with an empty field — there is no
// single number to show, and pre-filling one of them would be a guess.
const rateOf = (items) => {
  const rates = [...new Set(items.map((p) => p.cashbackPct))].sort((a, z) => a - z);
  return {
    uniform: rates.length === 1 ? rates[0] : null,
    label: rates.length === 1 ? `${rates[0]}%` : `${rates[0]}–${rates[rates.length - 1]}%`,
  };
};

export default function Cashback() {
  const { notify } = useAdmin();
  const { brands, products, updateProduct } = useContent();
  const [draft, setDraft] = useState({});

  const rows = brands
    .map((b) => ({ ...b, items: products.filter((p) => p.brandId === b.id) }))
    .filter((b) => b.items.length > 0)
    .sort((a, b) => (b.items.length - a.items.length) || a.name.localeCompare(b.name));

  const save = async (b, value) => {
    const results = await Promise.all(b.items.map((p) => Promise.resolve(updateProduct(p.id, { cashbackPct: Number(value) }))));
    const failed = results.find((r) => r && r.ok === false);
    if (failed) {
      notify('Not saved', failed.error);
      return;
    }
    setDraft((d) => ({ ...d, [b.id]: undefined }));
    notify('Rate saved', `${b.items.length === 1 ? 'One product' : `All ${b.items.length} products`} from ${b.name} now pay ${Number(value)}% back.`);
  };

  return (
    <div>
      <div className="adm-card adm-list">
        {rows.length === 0 && <p className="adm-empty">Nothing in the shop yet. A brand appears here once it has a product.</p>}
        {rows.map((b) => {
          const { uniform, label } = rateOf(b.items);
          const base = uniform === null ? '' : String(uniform);
          const value = draft[b.id] ?? base;
          const dirty = String(value) !== base;
          return (
            <div className="adm-cb__row" key={b.id} data-testid="cashback-row">
              <span className="adm-cb__cat">
                {b.name}
                <span className="adm-cb__now">{b.items.length === 1 ? '1 product' : `${b.items.length} products`} · {label} now</span>
              </span>
              {/* aria-label rather than a visible label: the brand is already
                  named beside the field, and the row has to fit 320px. */}
              <Input
                aria-label={`${b.name} rate, percent`}
                className="adm-cb__field"
                type="number"
                min={0}
                max={100}
                value={value}
                onChange={(e) => setDraft({ ...draft, [b.id]: e.target.value })}
              />
              <span className="adm-cb__pct" aria-hidden="true">%</span>
              {/* Save appears only once the rate changed, and never enabled on a
                  value outside 0-100. */}
              {dirty && (
                <Button variant="secondary" disabled={!ok(value)} onClick={() => save(b, value)}>Save</Button>
              )}
            </div>
          );
        })}
      </div>
      <p className="adm-cb__note">
        The rate a student is paid back on this brand's perks. Saving sets every product it has;
        one product on its own rate is edited in Shop, beside its price.
      </p>
    </div>
  );
}
