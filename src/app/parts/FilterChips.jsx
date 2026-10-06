import './parts.css';

// `shape`: the board's chips are bare text with a scribble under the active
// one; the filter sheet's are pills (owner, 2026-09-09), filled ink when on.
export default function FilterChips({ chips, active, onToggle, shape = 'text' }) {
  return (
    <div className={shape === 'pill' ? 'fc fc--pill' : 'fc'}>
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          className="fc__chip"
          aria-pressed={active.has(c)}
          onClick={() => onToggle(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
