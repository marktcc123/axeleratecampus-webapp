import { useCallback, useMemo, useState } from 'react';
import { Button } from 'axelerate-design-system';
import { useContent, slugify } from '../../content.jsx';
import { kept } from '../../../lib/catalog-api.js';
import { useAdmin } from '../store.jsx';
import { usd } from '../../parts/Money.jsx';
import { coverNames } from '../../parts/cover.js';
import CatalogueForm, { numeric } from '../parts/CatalogueForm.jsx';

// The board's missions, from the console. Until 2026-09-10 nothing here could
// create or close one: the console processed applications to missions it had
// no way to publish. This writes the same store the board reads (content.jsx),
// so a mission added here is on the board on the next render.

// Read off the covers directory rather than typed out here: a hand-kept list
// goes stale the moment art is added or renamed, and a stale name is one an
// operator can pick and `cover()` then throws on.
const COVERS = coverNames('mission-');
const FORMATS = [
  { value: 'content', label: 'Content (digital)' },
  { value: 'sales', label: 'Sales (digital)' },
  { value: 'field', label: 'Field (physical)' },
  { value: 'event', label: 'Event (physical)' },
];
// The brand is picked from the brands table, not typed: a free-text brand made
// a ghost the board's row and the brand page knew nothing about.
const fieldsFor = (brands) => [
  { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Solra — unboxing reel on your feed' },
  { name: 'brandId', label: 'Brand', type: 'select', required: true, options: brands.map((b) => ({ value: b.id, label: b.name })) },
  { name: 'format', label: 'Format', type: 'select', options: FORMATS },
  { name: 'campus', label: 'Campus' },
  { name: 'payUsd', label: 'Pay (USD)', type: 'number', required: true },
  { name: 'creditPts', label: 'Credit', type: 'number' },
  { name: 'xp', label: 'XP', type: 'number' },
  { name: 'hours', label: 'Hours', type: 'number' },
  { name: 'minLevel', label: 'Unlocks at level', type: 'number' },
  { name: 'deadline', label: 'Deadline label', placeholder: 'This week' },
  { name: 'deadlineOn', label: 'Deadline date', placeholder: '2026-09-30' },
  { name: 'spotsTotal', label: 'Spots', type: 'number' },
  { name: 'desc', label: 'Brief', type: 'textarea' },
  { name: 'cover', label: 'Tile art', type: 'select', options: COVERS },
  { name: 'detailCover', label: 'Page art', type: 'select', options: COVERS },
];
const NUMBERS = ['payUsd', 'creditPts', 'xp', 'hours', 'minLevel', 'spotsTotal'];

const toDraft = (m) => ({
  ...m,
  spotsTotal: m.spots?.total ?? 0,
  deadlineOn: m.deadlineOn ?? '',
});

// The form is flat; the mission is not. spots.total is the only nested field an
// operator sets, so it is unpacked on the way in and packed on the way out.
const fromDraft = (d, current) => {
  const n = numeric(d, NUMBERS);
  const spots = { taken: current?.spots?.taken ?? 0, total: n.spotsTotal ?? current?.spots?.total ?? 0 };
  const { spotsTotal, ...rest } = { ...d, ...n };
  return { ...rest, spots, deadlineOn: d.deadlineOn?.trim() ? d.deadlineOn.trim() : null };
};

export default function Missions() {
  const { brands, missions, addMission, updateMission, removeMission } = useContent();
  const { notify } = useAdmin();
  const FIELDS = useMemo(() => fieldsFor(brands), [brands]);
  const [editing, setEditing] = useState(null);   // null | 'new' | slug
  const close = useCallback(() => setEditing(null), []);
  const current = typeof editing === 'string' && editing !== 'new'
    ? missions.find((m) => m.slug === editing) ?? null
    : null;

  // The dialog resets its draft whenever `value` changes identity, so this has
  // to be stable: a fresh literal every render would wipe what an operator has
  // typed the moment anything else in the catalogue updates.
  const value = useMemo(
    () => (current ? toDraft(current) : { brandId: brands[0]?.id ?? '', format: 'content', cover: COVERS[0], detailCover: COVERS[1], deadline: 'This week' }),
    [current, brands],
  );

  const submit = async (d) => {
    const fields = fromDraft(d, current);
    const failed = await kept(current
      ? updateMission(current.slug, fields)
      : addMission({ ...fields, slug: slugify(d.title) }));
    if (failed) {
      notify('Not saved', failed.error);
      return;
    }
    close();
  };

  return (
    <div>
      <div className="adm-cmp__top">
        <Button onClick={() => setEditing('new')}>Add mission</Button>
      </div>

      <div className="adm-card adm-list">
        {missions.length === 0 && <p className="adm-empty">No missions on the board. Add one and it appears there.</p>}
        {missions.map((m) => (
          <div className="adm-cmp__row" key={m.slug} data-testid="mission-row">
            <div className="adm-row__mid">
              <span className="adm-row__title">{m.title}</span>
              <span className="adm-row__meta">
                {m.brand} · {usd(m.payUsd)} · LV.{m.minLevel} · {m.spots?.taken ?? 0}/{m.spots?.total ?? 0} spots
              </span>
            </div>
            <button type="button" className="adm-quiet" onClick={() => setEditing(m.slug)} data-testid="mission-edit">Edit</button>
            {/* "Close" rather than "Remove": taking a mission off the board is
                what an operator does, and the tracker's own page already tells
                a student who applied that it has ended. */}
            <button type="button" className="adm-quiet" onClick={async () => {
              const failed = await kept(removeMission(m.slug));
              if (failed) notify('Not saved', failed.error);
            }} data-testid="mission-close">Close</button>
          </div>
        ))}
      </div>

      <CatalogueForm
        open={editing !== null}
        title={current ? 'Edit mission' : 'Add mission'}
        submitLabel={current ? 'Save mission' : 'Publish mission'}
        fields={FIELDS}
        value={value}
        onClose={close}
        onSubmit={submit}
      />
    </div>
  );
}
