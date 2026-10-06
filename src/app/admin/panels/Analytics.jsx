import { useState } from 'react';
import Doodle from '../../../components/Doodle.jsx';
import { usd, credit, CREDIT_PER_DOLLAR } from '../../parts/Money.jsx';
import { bucketTotals, bucketDays } from '../buckets.js';
import LineChart from '../parts/LineChart.jsx';
import DonutChart from '../parts/DonutChart.jsx';
import { useAdmin } from '../store.jsx';

// Four figures, then two charts.
//
// This screen plots, and that is a deliberate exception the owner made on
// 2026-08-31: the design system's "hand-drawn, never plotted" rule (and
// PRODUCT.md principle 4) govern the student-facing product, where the job is
// charm. An operator reading a dashboard needs density instead. The exception
// stops at src/app/admin — nothing else in the app plots anything.
//
// What did NOT come across from the reference: its dark ground and red accent
// (recoloured to the brand's violet and butter), and its dual y axis. Both
// series are denominated in dollars, so one axis carries them and there is no
// invented crossing point.
//
// The figures are NOT StatBlock. StatBlock's figure is 38px and its note is
// Lacquer, which is right for a student screen and wrong here twice over: four
// of them at 38px is the hero-metric template, and a hand font on data is the
// one place product UI must not use a display face. These cells are 22px with
// body-font notes, four to a card.
const RANGES = [7, 30, 90];

const SERIES = [
  { key: 'cash_paid', label: 'Cash', color: 'var(--violet-600)' },
  { key: 'credits_dollars', label: 'Credits, at shop value', color: 'var(--butter-600)' },
];

function Stat({ id, label, figure, note, marked = false }) {
  return (
    <div className="adm-stat" data-testid={id}>
      <p className="adm-stat__l">{label}</p>
      <p className="adm-stat__n">
        {marked && (
          // The design system's readme asks for "the marker circle on the ONE
          // figure that matters". GMV is that figure, and this is the whole
          // decorative budget for the screen.
          <Doodle name="circle-violet" className="adm-stat__ring" />
        )}
        <span className="adm-stat__v">{figure}</span>
      </p>
      <p className="adm-stat__note">{note}</p>
    </div>
  );
}

export default function Analytics() {
  const { stats, withdrawals, dailyTotals, campuses } = useAdmin();
  const [range, setRange] = useState(30);

  const gmv = dailyTotals.reduce((n, d) => n + d.cash_paid, 0);
  const creditsUsed = dailyTotals.reduce((n, d) => n + d.credits_used, 0);
  const pending = withdrawals.filter((w) => w.status === 'pending');
  const pendingTotal = pending.reduce((n, w) => n + w.amount, 0);
  const verifiedShare = stats.total_users
    ? Math.round((stats.verified_users / stats.total_users) * 100)
    : 0;

  // Credits are converted here rather than in the chart: the chart's job is to
  // plot one unit, and the conversion is the product's rule (R1's 100:1), not
  // the chart's business.
  const rows = bucketTotals(dailyTotals, range).map((r) => ({
    ...r,
    credits_dollars: r.credits_used / CREDIT_PER_DOLLAR,
  }));

  const studentTotal = campuses.reduce((n, c) => n + c.student_count, 0);
  const bucket = bucketDays(range);

  return (
    <div className="adm-an">
      <div className="adm-card adm-stats">
        <Stat
          id="tile-gmv"
          label="Total GMV"
          figure={usd(Math.round(gmv))}
          note={credit(creditsUsed)}
          marked
        />
        <Stat
          id="tile-dau"
          label="Daily active"
          figure={stats.active_today.toLocaleString('en-US')}
          note="signed in today"
        />
        <Stat
          id="tile-payouts"
          label="Pending payouts"
          figure={usd(pendingTotal)}
          note={`${pending.length} awaiting release`}
        />
        <Stat
          id="tile-users"
          label="Total users"
          figure={stats.total_users.toLocaleString('en-US')}
          note={`${verifiedShare}% verified students`}
        />
      </div>

      <section className="adm-card adm-ch">
        <div className="adm-ch__head">
          <h2 className="adm-ch__title">Revenue</h2>
          <div className="adm-an__ranges" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={`adm-an__range${r === range ? ' is-on' : ''}`}
                aria-pressed={r === range}
                onClick={() => setRange(r)}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
        <p className="adm-ch__sub">
          Cash and credits, both in dollars, in {bucket === 1 ? 'daily' : `${bucket}-day`} totals.
        </p>
        <LineChart
          rows={rows}
          series={SERIES}
          format={(n) => usd(Math.round(n))}
          ariaLabel={`Cash and credit spend over the last ${range} days, in dollars`}
        />
      </section>

      <section className="adm-card adm-ch">
        <h2 className="adm-ch__title">Campus share</h2>
        <p className="adm-ch__sub">Verified students by school.</p>
        <DonutChart
          slices={campuses.map((c) => ({ label: c.name, value: c.student_count }))}
          total={studentTotal}
          unit="students"
          ariaLabel="Share of verified students by campus"
        />
      </section>
    </div>
  );
}
