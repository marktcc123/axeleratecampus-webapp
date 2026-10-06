import { FileCard } from 'axelerate-design-system';
import './sections.css';

const LEVELS = [
  { n: 1, name: 'Explorer',    tint: 'paper',  identity: '"I just joined Axelerate"',                      gate: 'Verified student — school, work eligibility, payout, reach',            perk: 'Student-exclusive shop · open events' },
  { n: 2, name: 'Contributor', tint: 'blush',   identity: '"I\'m not someone who signed up and vanished"', gate: '300 XP · 3 completed missions',          perk: 'Public profile goes live · early drop window' },
  { n: 3, name: 'Insider',     tint: 'lavender',  identity: 'Where most active students want to live',       gate: '1,200 XP · 5+ missions · ≥90% on-time · 4.5+ star rating · no violations',       perk: 'Closed events · pitch your own mission idea' },
  { n: 4, name: 'Trusted',     tint: 'yellow', identity: 'No longer a gig worker — a junior marketing professional', gate: '3,000 XP · 10+ missions · 3+ brands · ≥92% on-time · strong ratings · 1+ portfolio-quality submission', perk: 'Invite-only launches · internship pipeline' },
  { n: 5, name: 'Partner',     tint: 'violet', identity: 'Part of the Axelerate Talent Network',          gate: '6,000 XP · 25+ missions · ≥95% on-time · sustained L4 record · clean standing · qualification + invitation',      perk: 'Direct brand introductions · annual Creator Summit' },
];

export default function Ladder() {
  return (
    <section id="ladder" className="section" aria-labelledby="ladder-title">
      <div className="wrap">
        <p className="section__kicker">The ladder</p>
        <h2 id="ladder-title" className="section__title">5 levels. Each one is a trust decision.</h2>
        <p className="section__lede">
          XP paces you between levels. Promotion into each band checks 4 things — volume, breadth,
          on-time rate, standing. Levels are permanent, and they buy access, status and perks — never a
          pay multiplier.
        </p>
        <div className="ladder__stack">
          {LEVELS.map((l, i) => (
            <FileCard key={l.name} tint={l.tint} tab={`LV.${l.n}`} tilt={[-2, 1.5, -1, 2, -1.5][i]}>
              <h3>{l.name}</h3>
              <p className="ladder__identity">{l.identity}</p>
              <p className="ladder__gate">{l.gate}</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{l.perk}</p>
            </FileCard>
          ))}
        </div>
      </div>
    </section>
  );
}
