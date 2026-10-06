import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../AppHeader.jsx';
import { useDemand } from '../demand.jsx';
import { statusLabel } from '../../lib/demand.js';
import './demand.css';
import './screens.css';

// Honest groups. "Trending" and a weekly growth percentage were momentum we
// had not measured — a demand of four people is forming, it is not surging.
const BLOCKS = [
  { id: 'responded', title: 'Brands responded', test: (c) => ['offers_live', 'converting'].includes(c.status) },
  { id: 'open', title: 'Open demand', test: (c) => ['sourcing', 'qualified'].includes(c.status) },
  { id: 'forming', title: 'Demand is forming', test: (c) => c.status === 'collecting' },
];

export default function DemandDiscover() {
  const { clusters } = useDemand();
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(clusters.map((c) => c.category).filter(Boolean))];
  const pool = category === 'All' ? clusters : clusters.filter((c) => c.category === category);

  const seen = new Set();
  const groups = BLOCKS.map((b) => {
    const rows = pool.filter((c) => !seen.has(c.id) && b.test(c));
    rows.forEach((c) => seen.add(c.id));
    return { ...b, rows };
  });
  const any = groups.some((g) => g.rows.length);

  return (
    <div className="scr dm">
      <AppHeader />
      <h1 className="scr__h1">Discover</h1>
      <p className="scr__lede">Demand first. Supply second. Join a live block or open your own.</p>
      <Link to="/app/demand/new" className="ax-btn ax-btn--primary ax-btn--full dm__open">
        Open a Demand
      </Link>

      <div className="dn__chips dm__filters" role="group" aria-label="Category">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className="dn__chip"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {!any && (
        <p className="dm__empty">Nothing in {category} yet. Open a demand and it starts here.</p>
      )}

      {groups.map((b) => {
        if (!b.rows.length) return null;
        return (
          <section key={b.id} className="dm__block" aria-labelledby={`disc-${b.id}`}>
            <h2 className="dm__h2" id={`disc-${b.id}`}>{b.title}</h2>
            <div className="dm__list">
              {b.rows.map((c) => {
                const qualified = c.counts?.qualified ?? c.qualifiedDemandCount ?? 0;
                return (
                  <Link key={c.id} to={`/app/demand/${c.id}`} className="dx" data-testid="discover-row">
                    <p className="dx__meta">
                      <span>{c.statusLabel ?? statusLabel(c.status)}</span>
                      <span>{qualified} qualified</span>
                    </p>
                    <h3 className="dx__need">{c.normalizedNeed}</h3>
                    {c.demo && <p className="dc__demo">Demo demand</p>}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
