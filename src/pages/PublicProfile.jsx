import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Avatar, { TONES } from '../app/Avatar.jsx';
import { useContent } from '../app/content.jsx';
import { useNoIndex } from '../app/useNoIndex.js';
import people from '../data/people.example.json';
import levels from '../data/levels.example.json';
import applications from '../data/applications.example.json';
import { useProfile } from '../app/profile.jsx';
import { useAccount } from '../app/account.jsx';
import useShare from '../app/parts/useShare.js';
import { ME, standingFrom } from '../app/me.js';
import { isLiveBackend } from '../lib/supabase.js';
import NotFoundPage from './NotFoundPage.jsx';
import './public-profile.css';

// One student's public card, at /u/:handle — the page the Share row hands to
// a brand, redrawn on 2026-09-21 on the reference build's /u/marktao (owner):
// who this is and their rung, three figures, and a "Verified experience" list
// — one row per brand, what kind of work, how many missions and which. The
// reference's address line and its closing sentence came off the same day
// (owner). Never money — the guard on this page forbids a dollar sign, and a brand
// does not need to know the rate.
//
// Outside the app shell and outside /app on purpose: this is shown to someone
// who may never have an account, and a tab bar would offer them four
// destinations they cannot use.

// What a mission's format is called on a résumé line.
const FORMAT_LABEL = { content: 'Content creation', field: 'Campus activation', event: 'Event crew' };

// The résumé's rows: the applications marked paid, one row per brand. A
// signed-in student's own card passes their applications. Anyone else's card
// still uses the example record (owner, 2026-09-09).
export function experience(missions = [], list = applications) {
  const done = (list ?? []).filter((a) => a.status === 'paid');
  const rows = new Map();
  for (const a of done) {
    const m = missions.find((x) => x.slug === a.missionSlug);
    const row = rows.get(a.brand) ?? { brand: a.brand, kinds: new Set(), titles: [] };
    row.kinds.add(FORMAT_LABEL[m?.format ?? a.format] ?? 'Mission');
    // "Solra — unboxing reel" → "unboxing reel": the brand is already the row's name.
    row.titles.push(a.title.split(' — ')[1] ?? a.title);
    rows.set(a.brand, row);
  }
  return { done: done.length, rows: [...rows.values()].map((r) => ({ ...r, kinds: [...r.kinds] })) };
}

export default function PublicProfile() {
  const { missions } = useContent();
  const { handle } = useParams();
  const me = useProfile();
  const { applications: liveApps, xp: liveXp, ready } = useAccount();
  const live = isLiveBackend();
  // My own handle wins over a fixture person who happens to share it: the
  // link Me hands out is about me. Session-only, like the profile it reads —
  // a brand opening this cold sees the fixture person, or nothing.
  const standing = live && ready ? standingFrom(liveXp ?? 0, liveApps ?? []) : null;
  const level = standing?.level ?? ME.level;
  const self = me.publicHandle && me.publicHandle === handle
    ? {
        handle,
        name: me.name || me.displayName,
        campus: me.campus || 'Your campus',
        verified: true,
        self: true,
        level,
        levelName: levels.find((l) => l.level === level)?.name ?? '',
        avatarUrl: me.avatarUrl,
      }
    : null;
  const person = self ?? people.find((p) => p.handle === handle);
  const xp = experience(missions, self && live ? (liveApps ?? []) : undefined);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Share hands out this page's own address (owner, 2026-09-23: a share at the
  // top right) — the same sheet-or-clipboard the detail pages' top bar uses.
  const { share, shared } = useShare(`${window.location.origin}${pathname}`, person?.name);
  useNoIndex();

  // The profile carries its own back affordance: it sits outside the shell, so
  // there is no chrome above it to borrow one from.
  //
  // Not a bare navigate(-1). Many arrivals here are cold — a shared link, a
  // fresh tab — and going back one entry would then take them off this site
  // entirely, or do nothing at all. React Router stamps its own index into
  // history.state, so `idx > 0` reads exactly as "this visitor has an in-app
  // entry to go back to"; when they don't, back means the start, which is the
  // destination NotFoundPage already offers a stranger.
  const back = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate('/');
  };

  if (live && !ready) {
    return (
      <main className="pp">
        <p className="pp__empty">Loading this card…</p>
      </main>
    );
  }

  // No `bare` here, unlike App.jsx's catch-all: this route sits at root,
  // outside every layout, so nothing else would supply a main landmark. The
  // sr-only line names the actual cause for anyone using a screen reader.
  if (!person) {
    return (
      <>
        <p className="sr-only">Profile not found.</p>
        <NotFoundPage />
      </>
    );
  }

  return (
    <main className="pp">
      <div className="pp__inner">
        <div className="pp__top">
          <button type="button" className="pp__back" aria-label="Back" onClick={back}>
            <span className="pp__chev" aria-hidden="true" />
            <span className="pp__back-t" aria-hidden="true">Back</span>
          </button>
          {/* Share, at the row's right: the app's own arrow, the tick while the
              copy is fresh, and a status line for anyone not looking. */}
          <button type="button" className="pp__share" onClick={share} aria-label={shared ? 'Link copied' : 'Share'} data-testid="share-page">
            {shared ? <Icon name="tick-2" size={18} /> : <Icon name="share" set="app" size={20} />}
          </button>
          {shared && <span className="sr-only" role="status">Link copied</span>}
        </div>

        {/* One row, like Me's own: the disc on the left, name, campus and rung
            on the right. */}
        <div className="pp__id">
          <div className="pp__avatar"><Avatar name={person.name} src={person.avatarUrl} size={74} /></div>
          <div className="pp__who">
            <h1 className="pp__name">{person.name}</h1>
            <p className="pp__campus">
              <span>{person.campus}</span>
              {/* The tick is the session's own mark (owner, 2026-09-09: not on
                  other people's cards). Icon renders aria-hidden, so the words
                  sit in an sr-only span. */}
              {person.verified && person.self && (
                <>
                  <Icon name="tick-2" size={14} className="pp__tick" />
                  <span className="sr-only">Verified student</span>
                </>
              )}
            </p>
            {/* The rung alone (owner, 2026-09-09): no bar, no XP-to-next — a
                brand reading a card wants the rung, not the climb. */}
            <p className="pp__level-name" data-testid="pp-level">{person.levelName} · Level {person.level}</p>
          </div>
        </div>

        {/* Three figures, split by dashed rules, as on Me. Missions and brands
            are counted off the rows below. On-time is the signed-in student's
            own standing (me.js); the fixture knows no such figure for anyone
            else, so their card carries two figures rather than an invented
            third. */}
        <dl className="pp__stats" data-testid="pp-stats">
          <div className="pp__stat"><dd>{xp.done}</dd><dt>Missions</dt></div>
          <div className="pp__stat"><dd>{xp.rows.length}</dd><dt>Brands</dt></div>
          {person.self && <div className="pp__stat"><dd>{live ? '—' : `${ME.onTimePct}%`}</dd><dt>On-time</dt></div>}
        </dl>

        <h2 className="pp__h2">Verified experience</h2>
        {xp.rows.length === 0 ? (
          <p className="pp__empty">None yet.</p>
        ) : (
          <ul className="pp__exp" data-testid="resume-experience">
            {xp.rows.map((r, i) => (
              <li key={r.brand} className="pp__row" data-testid="resume-row">
                {/* The discs run through the accents in row order, as the
                    board's brand row does. */}
                <Avatar name={r.brand} size={52} tone={TONES[i % TONES.length]} className="pp__disc" />
                <div className="pp__row-who">
                  <p className="pp__row-name">{r.brand}</p>
                  <p className="pp__row-kind">
                    <span>{r.kinds.join(' · ')}</span>
                    {/* Each row is brand-approved work — the tick says so, and
                        the sr-only line says it for anyone not looking. */}
                    <Icon name="tick-2" size={13} className="pp__tick" />
                    <span className="sr-only">brand-approved</span>
                  </p>
                  <p className="pp__row-meta">
                    {r.titles.length} {r.titles.length === 1 ? 'mission' : 'missions'} · {r.titles.join(', ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

      </div>
    </main>
  );
}
