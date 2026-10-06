import { Link } from 'react-router-dom';
import { MarkerBar } from 'axelerate-design-system';
import SubScreen from '../parts/SubScreen.jsx';
import Icon from '../../components/Icon.jsx';
import { ME, LEVEL_XP, distanceTo, standingFrom } from '../me.js';
import { isLiveBackend } from '../../lib/supabase.js';
import { useAccount } from '../account.jsx';
import levels from '../../data/levels.example.json';
import './levels.css';

const num = (n) => n.toLocaleString('en-US');

export default function Levels() {
  const live = isLiveBackend();
  const { xp: liveXp, applications, ready: accountReady } = useAccount();
  const standing = live && accountReady ? standingFrom(liveXp, applications) : ME;
  const here = levels.find((l) => l.level === standing.level);
  const next = levels.find((l) => l.level === standing.level + 1);
  const nextXp = next ? LEVEL_XP[next.level] : null;

  if (live && !accountReady) {
    return (
      <SubScreen band="yellow" title="Levels" note="…" back={{ to: '/app/unlock', label: 'Back to unlock' }} kicker="Unlock">
        <p className="lv__now-xp">Loading your ladder…</p>
      </SubScreen>
    );
  }

  return (
    <SubScreen band="yellow" title="Levels" note={`${here.name} era`} back={{ to: '/app/unlock', label: 'Back to unlock' }} kicker="Unlock">
      <div className="lv__now">
        <p className="lv__now-num">LV {standing.level}</p>
        <div>
          <p className="lv__now-name">{here.name}</p>
          <p className="lv__now-xp">{num(standing.xp)} XP banked</p>
        </div>
      </div>

      {next && (
        <div className="lv__climb">
          <MarkerBar value={standing.xp} total={nextXp} color="violet" />
          <p className="lv__climb-row">
            <span className="lv__climb-fig">{num(standing.xp)} / {num(nextXp)} XP</span>
            <span className="lv__climb-away">{num(nextXp - standing.xp)} to {next.name}</span>
          </p>
        </div>
      )}

      <h2 className="sub__label">The ladder</h2>
      <ol className="lv__ladder">
        {levels.map((l) => {
          const state = l.level < standing.level ? 'earned' : l.level === standing.level ? 'current' : 'locked';
          const away = state === 'locked' ? distanceTo(l.level, standing.xp) : null;
          return (
            <li key={l.level} className="lv__step" data-testid={`level-${l.level}`} data-state={state}>
              <span className="lv__step-n" aria-hidden="true">{l.level}</span>
              <div className="lv__step-body">
                <div className="lv__step-top">
                  <h3 className="lv__step-name">{l.name}</h3>
                  <span className="lv__step-gate">{l.gate}</span>
                  {state === 'earned' && (
                    <Icon name="tick-2" set="solid" size={13} className="lv__step-tick" />
                  )}
                  {state === 'current' && <span className="lv__step-here">you are here</span>}
                </div>
                <ul className="lv__perks">
                  {l.perks.map((p) => (
                    <li key={p} className="lv__perk">{p}</li>
                  ))}
                </ul>
                {/* R8: a locked step states its distance, never just "locked". */}
                {away && (
                  <p className="lv__step-away">
                    {num(away.xpAway)} XP away · about {away.missionsAway}{' '}
                    {away.missionsAway === 1 ? 'mission' : 'missions'}
                  </p>
                )}
              </div>
            </li>
          );
        })}
        {/* The design ends the ladder on an ink circle above the last named
            level. Syndicate is not a level you climb to, so it carries the
            crown and a link instead of a number. */}
        <li className="lv__step lv__step--synd" data-state="locked">
          <span className="lv__step-n lv__step-n--ink" aria-hidden="true">
            <Icon name="crown" set="solid" size={13} />
          </span>
          <div className="lv__step-body">
            <div className="lv__step-top">
              <h3 className="lv__step-name">Syndicate</h3>
              <span className="lv__step-gate">above Partner · invite only</span>
            </div>
            <p className="lv__step-away">
              <Link to="/app/me/syndicate">What the Syndicate opens »</Link>
            </p>
          </div>
        </li>
      </ol>
    </SubScreen>
  );
}
