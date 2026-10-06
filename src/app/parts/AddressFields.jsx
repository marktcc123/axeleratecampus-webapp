import { Input } from 'axelerate-design-system';
import { ADDRESS_FIELDS } from '../address.jsx';
import './address-fields.css';

// The address form, drawn the same way wherever it is asked for: Settings, and
// the last step of checkout. One component rather than two copies, because the
// two are the same form and would otherwise drift.
//
// `invalid` marks the required fields a submit found empty. It is passed in
// rather than tracked here so nothing turns red while the student is still
// typing — the sheet only sets it once they have tried to place the order.
export default function AddressFields({ value, onChange, invalid = null, idPrefix = 'addr' }) {
  return (
    <div className="addr">
      {ADDRESS_FIELDS.map((f) => (
        <div key={f.key} className={f.half ? 'addr__half' : undefined}>
          <Input
            label={f.label}
            id={`${idPrefix}-${f.key}`}
            value={value[f.key] ?? ''}
            onChange={(e) => onChange(f.key, e.target.value)}
            autoComplete={f.auto}
            inputMode={f.inputMode}
            maxLength={f.maxLength}
            error={invalid?.has(f.key) ? 'needed' : undefined}
          />
        </div>
      ))}
    </div>
  );
}
