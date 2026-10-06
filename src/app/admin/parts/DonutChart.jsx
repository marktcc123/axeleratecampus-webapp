// Campus share as a donut.
//
// The colour job here is SEQUENTIAL, not categorical, and that is not a
// stylistic preference — the brand's six-hue accent ramp cannot supply four
// categorical hues. Validated with the dataviz palette checker: coral↔butter
// collapses to ΔE 0.2 under deuteranopia, and coral↔pink is 12.9 even in
// normal vision, well under the 15 floor. Every four-hue set drawn from that
// warm ramp failed.
//
// A share of one measure is magnitude, so one hue light→dark is the correct
// encoding anyway: slices rank by size and the darkest is the biggest. The
// violet ramp is monotonic in luminance (0.65 → 0.29 → 0.11 → 0.046), and
// every slice is named in the legend, so identity is never colour alone.
const RAMP = ['var(--violet-800)', 'var(--violet-600)', 'var(--violet-400)', 'var(--violet-200)'];
const SIZE = 168;
const STROKE = 30;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function DonutChart({ slices, total, unit, ariaLabel }) {
  // Biggest first, so the ramp reads dark → light down the legend.
  const ranked = [...slices].sort((a, b) => b.value - a.value);

  let offset = 0;
  const arcs = ranked.map((s, i) => {
    const share = total ? s.value / total : 0;
    // A 2px gap on the surface colour separates neighbouring arcs, so two
    // adjacent steps of one hue never touch.
    const len = Math.max(0, share * C - 2);
    const arc = {
      ...s,
      share,
      color: RAMP[Math.min(i, RAMP.length - 1)],
      dash: `${len} ${C - len}`,
      rotate: (offset / C) * 360,
    };
    offset += share * C;
    return arc;
  });

  return (
    <div className="adm-dn">
      <svg className="adm-dn__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel}>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={STROKE}
              strokeDasharray={a.dash}
              transform={`rotate(${a.rotate} ${SIZE / 2} ${SIZE / 2})`}
            />
          ))}
        </g>
        {/* The total belongs in the hole — it is the denominator every slice is
            a share of, and the readme's objection is to inventing one, not to
            stating a real one. */}
        <text x={SIZE / 2} y={SIZE / 2 - 2} className="adm-dn__total" textAnchor="middle">
          {total.toLocaleString('en-US')}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 16} className="adm-dn__unit" textAnchor="middle">
          {unit}
        </text>
      </svg>

      <ul className="adm-dn__legend">
        {arcs.map((a) => (
          <li key={a.label} className="adm-dn__key" data-testid="donut-key">
            <span className="adm-dn__swatch" style={{ background: a.color }} aria-hidden="true" />
            <span className="adm-dn__name">{a.label}</span>
            <span className="adm-dn__val">
              {a.value.toLocaleString('en-US')}
              <span className="adm-dn__pct">{Math.round(a.share * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
