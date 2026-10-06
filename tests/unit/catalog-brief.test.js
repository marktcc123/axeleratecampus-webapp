import { describe, expect, test } from 'vitest';
import { briefOf, toEvent, toMission } from '../../src/lib/adapters/catalog.js';

describe('briefOf', () => {
  test('a Task block becomes the steps, and Reward becomes a perk', () => {
    const brief = briefOf(`"Want that glass skin?\nTask:\n\nClaim the serum.\n\nPost a 15-second review.\nReward: Free product + 5000 credits."`);
    expect(brief.desc).toBe('Want that glass skin?');
    expect(brief.steps).toEqual(['Claim the serum.', 'Post a 15-second review.']);
    expect(brief.perkBullets).toEqual([
      { icon: 'star', lead: 'Reward:', text: 'Free product + 5000 credits.' },
    ]);
  });

  test('the old headings land in the mission page sections', () => {
    const brief = briefOf([
      '**[The Mission]**',
      'Dermabell is hiring ambassadors.',
      '',
      "**[What You'll Do (Field Execution)]**",
      '1. **Target & Scout:** Find local salons.',
      '2. **In-Person Pitching:** Walk in and introduce the facial.',
      '',
      "**[What's In It For You?]**",
      '**Cash commission:** Earn 10% on the first order.',
      '',
      '**[Support & Training]**',
      'A script arrives once you accept.',
      '',
      'Message the desk if you get stuck.',
    ].join('\n'));
    expect(brief.desc).toBe('Dermabell is hiring ambassadors.');
    expect(brief.steps).toEqual([
      'Target & Scout: Find local salons.',
      'In-Person Pitching: Walk in and introduce the facial.',
    ]);
    expect(brief.perkBullets[0]).toMatchObject({ lead: 'Cash commission:', text: 'Earn 10% on the first order.' });
    expect(brief.support).toEqual([
      'A script arrives once you accept.',
      'Message the desk if you get stuck.',
    ]);
  });

  test('a plain description stays the brief, and a live gig has no invented duration', () => {
    expect(briefOf('Film the unboxing.')).toMatchObject({ desc: 'Film the unboxing.', steps: [] });
    expect(toMission({ id: 'g1', type: 'ugc_post', description: 'Film it.', spots_total: 5, spots_left: 5 }).hours).toBeNull();
  });
});

describe('toEvent seats', () => {
  test('uses the seats still open, and stays open when the row has no cap', () => {
    expect(toEvent({ id: 'e1', title: 'Mixer', spots_total: 40, spots_left: 22 }).seatsLeft).toBe(22);
    expect(toEvent({ id: 'e2', title: 'Full', spots_total: 30, spots_left: 0 }).seatsLeft).toBe(0);
    expect(toEvent({ id: 'e3', title: 'Open' }).seatsLeft).toBeNull();
  });
});
