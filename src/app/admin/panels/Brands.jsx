import { useCallback, useMemo, useState } from 'react';
import { Button } from 'axelerate-design-system';
import { useContent } from '../../content.jsx';
import { kept } from '../../../lib/catalog-api.js';
import { useAdmin } from '../store.jsx';
import { brandIndex, what } from '../../parts/Brands.jsx';
import { coverNames } from '../../parts/cover.js';
import CatalogueForm from '../parts/CatalogueForm.jsx';

// The brands themselves. Until 2026-09-10 a brand was not a row anywhere: the
// board's disc row and every /app/earn/brands/<id> page were inferred from the
// strings on missions and products, so nobody could onboard a brand, give it
// its own cover and words, or rename one without editing every mission by hand.
//
// A brand's id is its address and does not change when the name does. What an
// operator edits here reaches the board's row, the brand's page, the host line
// on every mission page and the brand shown on every shop card at once.
const ART = [{ value: '', label: 'Borrow the first mission or product' }, ...coverNames()];
const FIELDS = [
  { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Halo' },
  // Not "Brand" for everyone: Axelerate Beauty is Dermabell's US operating
  // partner, and the mission page's host line says so.
  { name: 'role', label: 'Described as', placeholder: 'Brand' },
  { name: 'blurb', label: 'About', type: 'textarea', placeholder: 'One or two sentences, shown on the brand page.' },
  { name: 'siteUrl', label: 'Site', placeholder: 'https://' },
  { name: 'cover', label: 'Cover art', type: 'select', options: ART },
];

export default function Brands() {
  const { brands, missions, products, addBrand, updateBrand, removeBrand } = useContent();
  const { notify } = useAdmin();
  const [editing, setEditing] = useState(null);   // null | 'new' | id
  const close = useCallback(() => setEditing(null), []);
  const rows = brandIndex(brands, missions, products);
  const current = typeof editing === 'string' && editing !== 'new'
    ? brands.find((b) => b.id === editing) ?? null
    : null;

  // Stable, so the draft survives a catalogue update while the dialog is open.
  const value = useMemo(() => current ?? { role: 'Brand', cover: '' }, [current]);

  const submit = async (d) => {
    const failed = await kept(current ? updateBrand(current.id, d) : addBrand(d));
    if (failed) {
      notify('Not saved', failed.error);
      return;
    }
    close();
  };

  return (
    <div>
      <div className="adm-cmp__top">
        <Button onClick={() => setEditing('new')}>Add brand</Button>
      </div>

      <div className="adm-card adm-list">
        {rows.length === 0 && <p className="adm-empty">No brands yet. Add one, then give it a mission or a product.</p>}
        {rows.map((b) => {
          const held = b.missions.length + b.products.length;
          return (
            <div className="adm-cmp__row" key={b.id} data-testid="brand-row">
              <div className="adm-row__mid">
                <span className="adm-row__title">{b.name}</span>
                {/* The address, then what it has, in the same words the brand's
                    own page uses. `what` counts singular and plural. */}
                <span className="adm-row__meta">
                  /{b.id} · {what(b)}{held === 0 && ' · not on the board yet'}
                </span>
              </div>
              <button type="button" className="adm-quiet" onClick={() => setEditing(b.id)} data-testid="brand-edit">Edit</button>
              {/* A brand with a mission or a product behind it stays: removing
                  it would leave those rows naming an id with nothing at it.
                  A dead Remove button would not say why, so this says it. */}
              {held === 0
                ? <button type="button" className="adm-quiet" onClick={async () => {
                  const failed = await kept(removeBrand(b.id));
                  if (failed) notify('Not saved', failed.error);
                }} data-testid="brand-remove">Remove</button>
                : <span className="adm-row__meta" data-testid="brand-held">In use</span>}
            </div>
          );
        })}
      </div>

      <CatalogueForm
        open={editing !== null}
        title={current ? 'Edit brand' : 'Add brand'}
        submitLabel={current ? 'Save brand' : 'Add brand'}
        fields={FIELDS}
        value={value}
        onClose={close}
        onSubmit={submit}
      />
    </div>
  );
}
