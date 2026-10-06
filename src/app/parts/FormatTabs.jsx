import './parts.css';

// `label` names the list for assistive tech; the board's is the mission format,
// the shop's (since 2026-09-08) is its collection. `prefix` keeps the two sets
// of tab ids apart should they ever share a page.
export default function FormatTabs({ formats, value, onChange, controls, label = 'Mission format', prefix = 'fmt' }) {
  return (
    <div className="ft" role="tablist" aria-label={label}>
      {formats.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          id={`${prefix}-tab-${f.id}`}
          aria-selected={value === f.id}
          aria-controls={controls}
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
