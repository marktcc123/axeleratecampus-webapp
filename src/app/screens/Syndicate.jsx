import { Badge, MarkerBar } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import SubScreen from '../parts/SubScreen.jsx';
import { ME } from '../me.js';
import { isLiveBackend } from '../../lib/supabase.js';
import { useAccount } from '../account.jsx';
import hub from '../../data/hub.example.json';
import './me-hub.css';

export default function Syndicate() {
  const { needXp, unlocks } = hub.syndicate;
  const live = isLiveBackend();
  const { xp: liveXp, ready } = useAccount();
  const xpNow = live ? (ready ? (Number(liveXp) || 0) : null) : ME.xp;
  const away = xpNow == null ? null : Math.max(0, needXp - xpNow);
  return (
    <SubScreen title="Syndicate" note="stack XP on the board">
      <p className="syn__state">
        <Badge tone="ink" tilt={-3}>not yet</Badge>
        <span className="hub__xp-now">
          {xpNow == null ? '…' : `${xpNow.toLocaleString('en-US')} / ${needXp.toLocaleString('en-US')} XP`}
        </span>
      </p>

      <div className="hub__xp" style={{ marginTop: 14 }}>
        <MarkerBar color="violet" ticks={26} height={18} total={needXp} value={xpNow ?? 0} style={{ width: '100%' }} />
        {/* R8: the distance, never a bare "locked". */}
        <p className="hub__xp-row">
          <span className="hub__xp-away">{away == null ? '…' : `${away.toLocaleString('en-US')} XP to go`}</span>
        </p>
      </div>

      <h2 className="sub__label">What unlocks</h2>
      <ul className="sub__list">
        {unlocks.map((u) => (
          <li key={u} className="sub__row" data-testid="unlock-row">
            <Icon name="crown" set="solid" size={16} style={{ color: 'var(--violet-600)', flex: 'none' }} />
            <div className="sub__row-mid"><p className="sub__row-title">{u}</p></div>
          </li>
        ))}
      </ul>
    </SubScreen>
  );
}
