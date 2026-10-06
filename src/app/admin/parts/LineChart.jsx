import { useEffect, useRef, useState } from 'react';

// A plotted line chart, hand-rolled in SVG.
//
// Why this exists at all: the design system's readme says data display is
// "hand-drawn, never plotted" and forbids gridlines. The owner overruled that
// for the console on 2026-08-31 — that rule governs the student-facing brand
// surface, and an internal dashboard is a different job where reading five
// numbers at a glance beats charm. Nothing outside src/app/admin plots
// anything.
//
// Why no library: recharts or chart.js would be a new production dependency
// for two charts on one screen. This is ~120 lines and the colours, type and
// spacing come straight from the design tokens.
//
// ONE y axis, always. Both series arrive already denominated in dollars, so
// there is nothing to reconcile — a second axis would invent a crossing point
// that means nothing.
const PAD = { top: 10, right: 14, bottom: 26, left: 46 };
const HEIGHT = 200;
const FALLBACK_WIDTH = 320;

// Round a maximum up to something a person would put on an axis.
function niceMax(value) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (value <= step * pow) return step * pow;
  }
  return 10 * pow;
}

export default function LineChart({ rows, series, format, ariaLabel }) {
  const box = useRef(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  const [hover, setHover] = useState(null);

  // The SVG is drawn at real pixel width rather than scaled through a viewBox,
  // so 11px axis type stays 11px at 320 and at 520 instead of shrinking and
  // swelling with the column.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = Math.max(40, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const peak = niceMax(Math.max(...series.flatMap((s) => rows.map((r) => r[s.key])), 0));

  const x = (i) => PAD.left + (rows.length < 2 ? plotW / 2 : (i * plotW) / (rows.length - 1));
  const y = (v) => PAD.top + plotH - (v / peak) * plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * peak);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const step = rows.length < 2 ? plotW : plotW / (rows.length - 1);
    const i = Math.round((px - PAD.left) / step);
    setHover(i >= 0 && i < rows.length ? i : null);
  };

  return (
    <div className="adm-lc" ref={box}>
      <div className="adm-lc__legend">
        {series.map((s) => (
          <span key={s.key} className="adm-lc__key">
            <span className="adm-lc__swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        className="adm-lc__svg"
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchStart={onMove}
        onTouchMove={onMove}
      >
        {/* Gridlines and axis labels first, so every mark sits above them. */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)}
              stroke="var(--gray-200)" strokeWidth="1" strokeDasharray={t === 0 ? undefined : '3 4'}
            />
            <text x={PAD.left - 7} y={y(t) + 3.5} className="adm-lc__tick" textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}

        {rows.map((r, i) => (
          <text key={r.label} x={x(i)} y={HEIGHT - 8} className="adm-lc__tick" textAnchor="middle">
            {r.label}
          </text>
        ))}

        {hover != null && (
          <line
            x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH}
            stroke="var(--gray-400)" strokeWidth="1"
          />
        )}

        {series.map((s) => (
          <g key={s.key}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={rows.map((r, i) => `${x(i)},${y(r[s.key])}`).join(' ')}
            />
            {rows.map((r, i) => (
              <circle
                key={r.label}
                cx={x(i)}
                cy={y(r[s.key])}
                r={hover === i ? 4.5 : 2.5}
                fill="var(--gray-0)"
                stroke={s.color}
                strokeWidth="2"
              />
            ))}
          </g>
        ))}
      </svg>

      {/* The readout sits in HTML, not SVG: it wraps, picks up the app's type
          tokens, and a screen reader gets it as text. */}
      <p className="adm-lc__read" role="status">
        {rows.length === 0
          ? 'No revenue in this window.'
          : hover == null
            ? `Latest — ${series.map((s) => `${s.label} ${format(rows.at(-1)[s.key])}`).join(' · ')}`
            : `${rows[hover].label} — ${series.map((s) => `${s.label} ${format(rows[hover][s.key])}`).join(' · ')}`}
      </p>

      {/* The table view the chart's numbers would otherwise only exist as
          pixels in. Visually hidden; read aloud in order.
          The sr-only class goes on a WRAPPER, not on the table: `width: 1px`
          acts as a MINIMUM on a display:table box, so the table itself stayed
          388px wide and escaped its own clip. */}
      <div className="sr-only">
      <table>
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => <th key={s.key} scope="col">{s.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {series.map((s) => <td key={s.key}>{format(r[s.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
