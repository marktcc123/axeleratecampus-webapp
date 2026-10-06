import { useEffect, useState } from 'react';
import { MarkerBar, StickyNote } from 'axelerate-design-system';
import Avatar, { TONES } from '../Avatar.jsx';
import SubScreen from '../parts/SubScreen.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import { finishedFor, loadCareerBrands } from '../../lib/career.js';
import { useAccount } from '../account.jsx';
import hub from '../../data/hub.example.json';
import applications from '../../data/applications.example.json';
import './career.css';

// How many gigs are actually finished. Derived from the applications the
// student has been paid for rather than stored on the career object — a count
// written down twice is a count that disagrees with itself, which is how the
// events fixture ended up with three wrong weekdays.
const finishedGigs = () => applications.filter((a) => a.status === 'paid').length;

const gigs = (n) => `${n} more gig${n === 1 ? '' : 's'} to unlock`;

// The platform proof's row: title and count, the dots, the distance. No
// description any more (owner, 2026-09-09: "too much text") — the title says
// what it is and the note says how far.
//
// There is no crown here. Every row wore one, which made the mark meaningless;
// the distance is the useful thing, so the distance is what is drawn.
function Dots({ title, done, need }) {
  return (
    /* The design system's dots, one per gig, filled up to the count — the
       system draws data by hand and forbids solid progress bars. `ticks={need}`
       makes the row literal: five dots for five gigs. No `label`: MarkerBar
       draws its label as a visible row and would repeat the title; the sentence
       a screen reader needs sits on the group. max-content keeps n dots 7px
       apart instead of a screen apart (Principle 5 forbids naming
       .ax-hatch__marks from here, so the width is set where the API allows). */
    <div role="group" aria-label={`${title}: ${done} of ${need} gigs`}>
      <MarkerBar className="crr__dots" shape="dot" color="pink" value={done} total={need} ticks={need} height={20} style={{ width: 'max-content' }} />
    </div>
  );
}

function Reward({ title, desc, counts, done, need, locked, note }) {
  return (
    <article className="crr__card" data-testid="reward" data-locked={locked ? 'true' : 'false'}>
      <h3 className="crr__card-title">{title}</h3>
      {desc && <p className="crr__card-desc">{desc}</p>}
      {/* The dots and the count on one line, the count at the right end
          (owner, 2026-09-09); under them, what counts towards it. */}
      <div className="crr__meter-row">
        <Dots title={title} done={done} need={need} />
        <p className="crr__lane-n">{done}/{need} finished</p>
      </div>
      <p className="crr__card-note">{note}{counts ? ` · ${counts}` : ''}</p>
    </article>
  );
}

export default function Career() {
  const c = hub.career;
  const live = isLiveBackend();
  const { applications: liveApps, ready } = useAccount();
  const [partners, setPartners] = useState(null);

  useEffect(() => {
    if (!live) return undefined;
    let alive = true;
    loadCareerBrands().then((rows) => { if (alive) setPartners(rows ?? []); });
    return () => { alive = false; };
  }, [live]);

  const pending = live && (!ready || partners === null);
  const apps = live ? (liveApps ?? []) : applications;
  const done = live ? apps.filter((a) => a.status === 'paid').length : finishedGigs();
  const lanes = live
    ? (partners ?? []).map((b) => ({ name: b.name, finished: finishedFor(apps, b.id) }))
      .sort((a, b) => (b.finished - a.finished) || a.name.localeCompare(b.name))
    : c.brands;
  const toProof = Math.max(0, c.proofAt - done);

  if (pending) {
    return (
      <SubScreen band="blush" title="Axelerate career">
        <p className="crr__rate-note">Loading your career…</p>
      </SubScreen>
    );
  }
  // No note and no lede (owner, 2026-09-09): "secure the bag" and the
  // "receipts included" line came off.
  return (
    // The blush band, which SubScreen has always defined and nothing used: its
    // watermark is `rocket`, the very icon Me's list draws on the row that
    // leads here. This screen hand-rolled its own centred masthead — a back
    // row, an eyebrow, a pill kicker and a centred title — which is why it read
    // as a different product from its seven siblings. Title is the row's own
    // label, as everywhere else in Me.
    <SubScreen band="blush" title="Axelerate career">
      {/* The run rate carried a track of its own until 2026-09-04. The proof's
          own row further down draws the identical bar off the identical
          numbers, and two full-width violet tracks a screenful apart read as a
          mistake. The figure and the note stay; the meters live on the rows,
          where each one says something different. */}
      {/* The run rate on a taped sticky note (owner, 2026-09-09: same words,
          more play). The count is a live region: every lock below is
          downstream of the same number. (The marker ring round it came off the
          same day.) */}
      {/* Blush, the header's own colour (owner, 2026-09-09) — yellow read as a
          different object. */}
      <StickyNote tint="blush" tape fold={false} className="crr__rate" style={{ padding: '14px 16px 12px' }}>
        <p className="crr__rate-lab">Career run rate</p>
        <p className="crr__rate-fig" role="status"><span className="crr__rate-n">{done}/{c.proofAt}</span> gigs</p>
        <p className="crr__rate-note">
          Finish <b>{c.proofAt}</b> paid gigs platform-wide to request <b>{c.proof.title}</b>.
          Brand lanes unlock at <b>{c.laneAt}</b> finished gigs with that partner.
        </p>
      </StickyNote>

      <h2 className="crr__label"><span>Rewards deck</span></h2>
      <Reward
        title={c.proof.title}
        desc={c.proof.desc}
        counts={c.proof.counts}
        done={done}
        need={c.proofAt}
        locked={toProof > 0}
        note={toProof > 0 ? gigs(toProof) : 'Ready to request'}
      />

      {/* One lane per brand (owner, 2026-09-09: far fewer words): the brand's
          own distance drawn once — dots and the count — then its two rewards
          as bare titles. Both rewards open at the same gig, so one distance
          line says it for both; the description each carried is gone. */}
      {lanes.length === 0 && (
        <p className="crr__rate-note">No brand lanes are open yet.</p>
      )}
      {lanes.map((b, i) => {
        const left = Math.max(0, c.laneAt - b.finished);
        const locked = left > 0;
        return (
          <section key={b.name} className="crr__lane" aria-labelledby={`lane-${b.name}`}>
            {/* The brand's disc, as the board's brand row draws it — the six
                accents in order — and its name in ink (owner, 2026-09-09). The
                disc is aria-hidden, so the heading's name is the brand's. */}
            <h3 id={`lane-${b.name}`} className="crr__brand">
              <Avatar name={b.name} size={26} tone={TONES[i % TONES.length]} className="crr__brand-disc" />
              <span>{b.name}</span>
            </h3>
            {/* Dots and the count on one line, the count at the right end; then
                how far and what counts — the gig to go and do. */}
            <div className="crr__meter-row">
              <Dots title={b.name} done={b.finished} need={c.laneAt} />
              <p className="crr__lane-n">{b.finished}/{c.laneAt} finished</p>
            </div>
            <p className="crr__card-note" data-locked={locked ? 'true' : 'false'}>{locked ? gigs(left) : 'Open'} · {c.laneCounts}</p>
            <ul className="crr__rewards">
              {c.laneRewards.map((r) => (
                <li key={r.title} className="crr__reward" data-testid="reward" data-locked={locked ? 'true' : 'false'}>
                  <p className="crr__reward-t">{r.title}</p>
                  <p className="crr__reward-d">{r.desc}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </SubScreen>
  );
}
