import { render, screen } from '@testing-library/react';
import MissionCard from '../../src/components/MissionCard.jsx';
// The catalogue as a screen sees it: the fixtures with the brand's name joined
// in from the brands table. The raw JSON carries `brandId` and no display name.
import { FIXTURES } from '../../src/app/content.jsx';

const missions = FIXTURES.missions;

const open = missions.find((m) => m.slug === 'solra-unboxing-reel');            // T1
const trusted = missions.find((m) => m.slug === 'dermabell-campus-launch');     // T4

describe('fixture shape (future Supabase seed)', () => {
  const REQUIRED = ['slug','title','brand','campus','payUsd','tier','tierName','minLevel','hours','format','skills','xp'];
  test('has eight missions, each with every required field', () => {
    expect(missions).toHaveLength(8);   // 5, then three more the student can take (owner, 2026-09-21)
    for (const m of missions) for (const k of REQUIRED) expect(m, `${m.slug} missing ${k}`).toHaveProperty(k);
  });
  test('tier names follow R9', () => {
    const names = { 1: 'Explorer', 2: 'Contributor', 3: 'Insider', 4: 'Trusted', 5: 'Partner' };
    for (const m of missions) expect(m.tierName).toBe(names[m.tier]);
  });
  test('formats are the four the product spec defines (R3)', () => {
    for (const m of missions) expect(['content','field','event','sales']).toContain(m.format);
  });
});

describe('MissionCard — open', () => {
  test('leads with the dollar figure (R1)', () => {
    render(<MissionCard mission={open} />);
    const card = screen.getByTestId('mission-card');
    // The very first text node in the card is the price.
    expect(card.textContent.trim().startsWith('$25')).toBe(true);
  });
  test('shows the spec card format: tier, level, hours, campus, format, XP', () => {
    render(<MissionCard mission={trusted} />);
    expect(screen.getByText('Dermabell salon ambassador')).toBeInTheDocument();
    expect(screen.getByText('Trusted mission · LV.4')).toBeInTheDocument();
    expect(screen.getByText(/4 hours/)).toBeInTheDocument();
    expect(screen.getByText(/Cornell Tech/)).toBeInTheDocument();
    // "Field" is also a skill on this mission, so match the meta line whole.
    expect(screen.getByText(/4 hours · Cornell Tech · Field/)).toBeInTheDocument();
    expect(screen.getByText('+1,000 XP')).toBeInTheDocument();
  });
  test('T1 reads "Explorer mission · LV.1"', () => {
    render(<MissionCard mission={open} />);
    expect(screen.getByText('Explorer mission · LV.1')).toBeInTheDocument();
  });
  test('never renders an emoji', () => {
    render(<MissionCard mission={trusted} locked={{ xpAway: 620, missionsAway: 3 }} />);
    expect(screen.getByTestId('mission-card').textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

describe('MissionCard — locked (R8 near-miss rule)', () => {
  test('keeps the dollar figure visible and states the distance, not just "locked"', () => {
    render(<MissionCard mission={trusted} locked={{ xpAway: 620, missionsAway: 3 }} />);
    const card = screen.getByTestId('mission-card');
    expect(card.textContent.trim().startsWith('$50')).toBe(true);
    expect(screen.getByText('Trusted · LV.4')).toBeInTheDocument();
    expect(screen.getByText('620 XP away · about 3 missions')).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/locked for your rank/i);
  });
  test('uses singular "1 mission" when one away', () => {
    render(<MissionCard mission={trusted} locked={{ xpAway: 220, missionsAway: 1 }} />);
    expect(screen.getByText('220 XP away · about 1 mission')).toBeInTheDocument();
  });
  test('is marked for assistive tech', () => {
    render(<MissionCard mission={trusted} locked={{ xpAway: 620, missionsAway: 3 }} />);
    expect(screen.getByTestId('mission-card')).toHaveAttribute('data-locked', 'true');
  });
});
