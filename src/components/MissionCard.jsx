import { Card, Badge, Tag } from 'axelerate-design-system';
import Icon from './Icon.jsx';
import './mission-card.css';

const FORMAT_LABEL = { content: 'Content', field: 'Field', event: 'Event', sales: 'Sales' };
const TIER_TONE = { 1: 'yellow', 2: 'blush', 3: 'orange', 4: 'coral', 5: 'pink' };
const usd = (n) => '$' + n.toLocaleString('en-US');

export default function MissionCard({ mission: m, locked, tilt = 0 }) {
  const tierLine = `${m.tierName} mission · LV.${m.minLevel}`;
  return (
    <Card tilt={tilt} data-testid="mission-card" data-locked={locked ? 'true' : 'false'} className="mc">
      <div className="mc__top">
        <span className="mc__pay">{usd(m.payUsd)}</span>
        <Badge tone={TIER_TONE[m.tier]} tilt={-3}>{tierLine}</Badge>
      </div>
      <h3 className="mc__title">{m.title}</h3>
      <div className="mc__brand">{m.brand}</div>
      <div className="mc__meta">
        {m.hours} {m.hours === 1 ? 'hour' : 'hours'} · {m.campus} · {FORMAT_LABEL[m.format]}
      </div>
      <div className="mc__skills">
        {m.skills.map((s) => <Tag key={s} soft>{s}</Tag>)}
      </div>
      <div className="mc__foot">
        <span className="mc__xp">+{m.xp.toLocaleString('en-US')} XP</span>
        <Icon name="zap" size={18} style={{ color: 'var(--text-brand)' }} />
      </div>
      {locked && (
        <div className="mc__lock" role="note">
          <Icon name="crown" size={18} />
          <span>
            <b>{m.tierName} · LV.{m.minLevel}</b>
            <br />
            <span className="mc__lock-dist">
              {locked.xpAway.toLocaleString('en-US')} XP away · about {locked.missionsAway} {locked.missionsAway === 1 ? 'mission' : 'missions'}
            </span>
          </span>
        </div>
      )}
    </Card>
  );
}
