import { useCallback, useMemo, useState } from 'react';
import { Button } from 'axelerate-design-system';
import { useContent } from '../../content.jsx';
import { kept } from '../../../lib/catalog-api.js';
import { useAdmin } from '../store.jsx';
import { usd } from '../../parts/Money.jsx';
import { coverNames } from '../../parts/cover.js';
import CatalogueForm, { numeric } from '../parts/CatalogueForm.jsx';

// The shop's products, from the console. The Cashback panel next door sets a
// rate per CATEGORY while a product carries its own `cashbackPct`; the rate
// that reaches a student is this one, so it is edited here beside the price.
const COVERS = coverNames('product-');
const CATEGORIES = ['Mindfulness', 'Beverages', 'Home & bath', 'Fashion', 'Dorm', 'Beauty'];
const TOPICS = ['All', 'Dorm collection'];
// The brand comes from the brands table, so a shop card, the brand's page and
// the board's disc row always agree on what the brand is called.
const fieldsFor = (brands) => [
  { name: 'title', label: 'Title', required: true },
  { name: 'brandId', label: 'Brand', type: 'select', required: true, options: brands.map((b) => ({ value: b.id, label: b.name })) },
  { name: 'priceUsd', label: 'Price (USD)', type: 'number', required: true },
  { name: 'cashbackPct', label: 'Cashback %', type: 'number' },
  { name: 'stock', label: 'Stock', type: 'number' },
  { name: 'category', label: 'Category', type: 'select', options: CATEGORIES },
  { name: 'topic', label: 'Collection', type: 'select', options: TOPICS },
  { name: 'desc', label: 'Description', type: 'textarea' },
  { name: 'cover', label: 'Photo', type: 'select', options: COVERS },
];
const NUMBERS = ['priceUsd', 'cashbackPct', 'stock'];

const toDraft = (p) => ({ ...p, cover: p.covers?.[0] ?? COVERS[0] });
const fromDraft = (d) => {
  const { cover, ...rest } = { ...d, ...numeric(d, NUMBERS) };
  return { ...rest, covers: [cover] };
};

export default function Shop() {
  const { brands, products, addProduct, updateProduct, removeProduct } = useContent();
  const { notify } = useAdmin();
  const FIELDS = useMemo(() => fieldsFor(brands), [brands]);
  const [editing, setEditing] = useState(null);
  const close = useCallback(() => setEditing(null), []);
  const current = typeof editing === 'string' && editing !== 'new'
    ? products.find((p) => p.id === editing) ?? null
    : null;

  // Stable, so the draft survives a catalogue update while the dialog is open.
  const value = useMemo(
    () => (current ? toDraft(current) : { brandId: brands[0]?.id ?? '', category: CATEGORIES[0], topic: TOPICS[0], cover: COVERS[0], cashbackPct: '10' }),
    [current, brands],
  );

  const submit = async (d) => {
    const fields = fromDraft(d);
    const failed = await kept(current ? updateProduct(current.id, fields) : addProduct(fields));
    if (failed) {
      notify('Not saved', failed.error);
      return;
    }
    close();
  };

  return (
    <div>
      <div className="adm-cmp__top">
        <Button onClick={() => setEditing('new')}>Add product</Button>
      </div>

      <div className="adm-card adm-list">
        {products.length === 0 && <p className="adm-empty">Nothing in the shop. Add a product and it appears there.</p>}
        {products.map((p) => (
          <div className="adm-cmp__row" key={p.id} data-testid="product-row">
            <div className="adm-row__mid">
              <span className="adm-row__title">{p.title}</span>
              <span className="adm-row__meta">
                {p.brand} · {usd(p.priceUsd)} · {p.cashbackPct}% back · {p.stock === 0 ? 'sold out' : `${p.stock} in stock`}
              </span>
            </div>
            <button type="button" className="adm-quiet" onClick={() => setEditing(p.id)} data-testid="product-edit">Edit</button>
            <button type="button" className="adm-quiet" onClick={async () => {
              const failed = await kept(removeProduct(p.id));
              if (failed) notify('Not saved', failed.error);
            }} data-testid="product-remove">Remove</button>
          </div>
        ))}
      </div>

      <CatalogueForm
        open={editing !== null}
        title={current ? 'Edit product' : 'Add product'}
        submitLabel={current ? 'Save product' : 'List product'}
        fields={FIELDS}
        value={value}
        onClose={close}
        onSubmit={submit}
      />
    </div>
  );
}
