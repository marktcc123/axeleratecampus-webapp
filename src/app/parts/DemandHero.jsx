import { useEffect, useState } from 'react';
import { PLACEHOLDERS } from '../../lib/demand.js';
import { track } from '../../lib/analytics.js';

export default function DemandHero({
  value,
  onChange,
  onStart,
  onExplore,
  kicker = null,
  compact = false,
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % PLACEHOLDERS.length), 4200);
    return () => clearInterval(t);
  }, []);

  const start = (e) => {
    e?.preventDefault();
    track('demand_started', { source: compact ? 'embed' : 'home', hasText: Boolean(value.trim()) });
    onStart?.(value.trim());
  };

  return (
    <form className={`dh${compact ? ' dh--compact' : ''}`} onSubmit={start} data-testid="demand-hero">
      {kicker && <p className="dh__kicker">{kicker}</p>}
      <h1 className="dh__h1">What do you want next?</h1>
      <p className="dh__lede">
        Tell us what you&rsquo;re looking for. We&rsquo;ll find others who want the same thing and bring the best offers to you.
      </p>
      <label className="dh__field">
        <span className="sr-only">What do you want next?</span>
        <textarea
          name="want"
          rows={compact ? 3 : 4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDERS[i]}
          data-testid="demand-input"
        />
      </label>
      <div className="dh__acts">
        <button type="submit" className="ax-btn ax-btn--primary ax-btn--lg ax-btn--full">
          Start a Demand
        </button>
        {onExplore && (
          <button type="button" className="ax-btn ax-btn--secondary ax-btn--lg ax-btn--full" onClick={onExplore}>
            Explore Live Demand
          </button>
        )}
      </div>
    </form>
  );
}
