import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, Input, Select, Textarea } from 'axelerate-design-system';

// One form for the three catalogue panels: missions, event listings and shop
// products all create and edit the same way, so they describe their fields and
// this draws them. Without it each panel grows its own dialog and they drift.
//
// `useCallback` on close is load-bearing, the same trap Campuses records:
// Dialog lists onClose in its focus effect's deps, so a new arrow on every
// keystroke re-runs the effect and its cleanup pulls focus back to the button
// that opened it — only the first character reaches the field.
export default function CatalogueForm({ open, title, fields, value, onClose, onSubmit, submitLabel = 'Save' }) {
  const [draft, setDraft] = useState(value ?? {});
  useEffect(() => { if (open) setDraft(value ?? {}); }, [open, value]);
  const close = useCallback(() => onClose(), [onClose]);

  const set = (name, v) => setDraft((d) => ({ ...d, [name]: v }));
  const required = fields.filter((f) => f.required);
  const ready = required.every((f) => String(draft[f.name] ?? '').trim());

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      width={440}
      footer={(
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button disabled={!ready} onClick={() => onSubmit(draft)} data-testid="catalogue-save">{submitLabel}</Button>
        </>
      )}
    >
      {/* No `hint` on any field: the design system renders it inside the
          <label>, where it becomes part of the field's accessible name. */}
      <div className="adm-cmp__form">
        {fields.map((f) => {
          const shared = {
            key: f.name,
            label: f.label,
            value: draft[f.name] ?? '',
            'data-testid': `field-${f.name}`,
            onChange: (e) => set(f.name, f.type === 'number' ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value),
          };
          if (f.type === 'select') return <Select {...shared} options={f.options} />;
          if (f.type === 'textarea') return <Textarea {...shared} rows={3} />;
          return <Input {...shared} inputMode={f.type === 'number' ? 'decimal' : undefined} placeholder={f.placeholder} />;
        })}
      </div>
    </Dialog>
  );
}

// The form hands back strings; the catalogue stores numbers. One place to
// convert, so a pay of "25" never reaches the board as text.
export const numeric = (draft, keys) =>
  Object.fromEntries(keys.filter((k) => draft[k] !== undefined && draft[k] !== '').map((k) => [k, Number(draft[k])]));
