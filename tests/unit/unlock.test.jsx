import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import Unlock, { PERK_ICON, holdingsFor, gateRungFor } from '../../src/app/screens/Unlock.jsx';
import Icon from '../../src/components/Icon.jsx';
import Levels from '../../src/app/screens/Levels.jsx';
import levels from '../../src/data/levels.example.json';
import { ME, LEVEL_XP, distanceTo } from '../../src/app/me.js';

const wrap = (ui) => render(<ProfileProvider><MemoryRouter>{ui}</MemoryRouter></ProfileProvider>);

const here = levels.find((l) => l.level === ME.level);
const next = levels.find((l) => l.level === ME.level + 1);

afterEach(cleanup);

describe('Unlock — the motive page (§5)', () => {
  // "The first screen is standing and distance, not a perk list." The order is
  // the whole defence against reading as a coupon centre, so it is pinned by
  // document position rather than by the presence of the pieces.
  // The standing panel came off on 2026-09-18 (owner): the card you are
  // standing on carries the rung, the bar and the figures, so the panel above
  // the deck was saying all of it twice. §5's order survives that — the page
  // still opens on standing and distance rather than on a perk list — which is
  // why it stays pinned by document position rather than by the presence of
  // the pieces.
  test('opens on the ladder, then what you hold, then the gate', () => {
    const { container } = wrap(<Unlock />);
    const order = [...container.querySelectorAll('.ul__standing, .ul__deck, .ul__gate, .ul__now')]
      .map((n) => n.className.split(' ')[0]);
    expect(order).toEqual(['ul__deck', 'ul__now', 'ul__gate']);
  });

  // Everything the standing panel used to say, now on the cards it described.
  test('the card you stand on names the rung and its level; the next one the fraction', () => {
    wrap(<Unlock />);
    const gap = distanceTo(next.level);
    const cards = screen.getAllByTestId('rung-card');
    const mine = within(cards.find((c) => c.dataset.state === 'held'));
    expect(mine.getByText(here.name)).toBeInTheDocument();
    expect(mine.getByText(new RegExp(`Level ${ME.level}`))).toBeInTheDocument();
    // The fraction rides the rung it measures: your XP against ITS threshold.
    const up = within(cards[ME.level]);
    expect(up.getByText(
      `${ME.xp.toLocaleString('en-US')} / ${LEVEL_XP[next.level].toLocaleString('en-US')} XP`,
    )).toBeInTheDocument();
    expect(up.getByText(`about ${gap.missionsAway} missions to ${next.name}`)).toBeInTheDocument();
    // The hand-set "820 XP to Insider" went with the panel: the fraction says
    // it, and the hand face's slashed zero rendered it "82.0".
    expect(screen.queryByText(new RegExp(`${gap.xpAway.toLocaleString('en-US')} XP to`))).toBeNull();
  });

  // Principle 4: data in the student-facing app is drawn by hand. A solid
  // progress bar here would be the easiest thing to reach for and the one the
  // design system forbids.
  test('draws the XP fraction as hatch marks, not a progress bar', () => {
    const { container } = wrap(<Unlock />);
    expect(container.querySelector('.ax-hatch__row')).toBeInTheDocument();
    expect(container.querySelector('progress, [role="progressbar"]')).toBeNull();
  });

  // The whole ladder, the rungs behind you included (owner, 2026-09-18) — the
  // deck simply opens on the one you stand on and swipes back to what you have
  // passed.
  test('the deck is every rung, in ladder order, with your own marked', () => {
    wrap(<Unlock />);
    const cards = screen.getAllByTestId('rung-card');
    expect(cards.map((c) => c.querySelector('.ud__title').textContent))
      .toEqual(levels.map((l) => l.name));
    expect(cards.map((c) => c.dataset.state))
      .toEqual(levels.map((l) => (l.level < ME.level ? 'passed' : l.level === ME.level ? 'held' : 'locked')));
    // Exactly one card is the one you are on — the deck's opening scroll and
    // the only full accent on the screen both depend on that being true.
    expect(cards.filter((c) => c.dataset.state === 'held')).toHaveLength(1);
    // A card is a rung, its distance and its bar: the perks came off them
    // (owner, 2026-09-18) and are said once, in the grid below.
    for (const c of cards) expect(c.querySelector('ul')).toBeNull();
  });

  // No two rungs may share a colour (owner, 2026-09-18), which is the whole
  // point of the marks in the grid below: the colour says which level opened
  // the perk, and it can only say that if the mapping is one to one.
  test('every rung wears its own hue, and no two share one', () => {
    wrap(<Unlock />);
    const hues = screen.getAllByTestId('rung-card')
      .map((c) => [...c.classList].find((k) => k.startsWith('ud__card--')));
    expect(hues.filter(Boolean)).toHaveLength(levels.length);
    expect(new Set(hues).size).toBe(levels.length);
  });

  // Every card carries one (owner, 2026-09-18): a rung you have passed shows a
  // full bar, a rung ahead shows how far off it is.
  test('every card draws its own bar and says the distance in missions', () => {
    const { container } = wrap(<Unlock />);
    const cards = screen.getAllByTestId('rung-card');
    expect(container.querySelectorAll('.ax-hatch__row')).toHaveLength(cards.length);
    for (const c of cards) {
      expect(c.querySelector('.ax-hatch__row'), c.textContent).not.toBeNull();
      const foot = c.querySelector('.ud__away').textContent;
      // R8: passed rungs say so, and everything ahead carries its distance in
      // the unit the student controls.
      expect(foot, c.textContent).toMatch(c.dataset.state === 'locked' ? /about \d+ missions? to/ : /^Unlocked$/);
    }
    // The bar is filled to the brim on a rung you already hold.
    const held = cards.find((c) => c.dataset.state === 'held');
    const marks = held.querySelectorAll('.ax-hatch__m');
    expect([...marks].every((m) => m.hasAttribute('data-on'))).toBe(true);
  });

  // §8 says no tab is allowed to end. "Level up" as a bare link came off on
  // 2026-09-18; on 2026-09-21 the owner put one way back under the gate list —
  // a button reading "Find missions to level up" — and exactly one: a second
  // link to the board anywhere else on the page is the regression.
  test('carries one way back to the board: the button under the gate', () => {
    const { container } = wrap(<Unlock />);
    const links = container.querySelectorAll('a[href="/app/earn"]');
    expect(links).toHaveLength(1);
    const b = screen.getByTestId('find-missions');
    expect(b).toBe(links[0]);
    expect(b).toHaveTextContent('Find missions to level up');
    expect(b.closest('.ul__gate')).not.toBeNull();
    // The highlighter swipe (owner, 2026-09-21: variant B), not a system button.
    expect(b.className).not.toMatch(/ax-btn/);
    expect(b.querySelector('.ul__find-t')).not.toBeNull();
  });

  test('carries two headings: what you hold, then the gate', () => {
    const { container } = wrap(<Unlock />);
    const heads = [...container.querySelectorAll('.ul__h2')].map((n) => n.textContent);
    // The deck has none of its own (owner, 2026-09-18): every card already
    // names its rung, so a heading over them said it a sixth time.
    expect(heads).toEqual(['Available now', 'To unlock next']);
  });

  test('what is held is marked as held; what is out of reach carries its distance', () => {
    wrap(<Unlock />);
    const now = screen.getByRole('region', { name: 'Available now' });
    const held = within(now).getAllByTestId('unlock-perk');
    expect(held.length).toBe(levels.filter((l) => l.level <= ME.level).reduce((n, l) => n + l.perks.length, 0));
    for (const row of held) expect(row).toHaveAttribute('data-state', 'held');
    // A tick means exactly one thing on this screen: a gate clause cleared. A
    // perk you hold is not that, so every tile draws its own icon instead.
    for (const row of held) {
      const icon = row.querySelector('.ul__tile-icon');
      expect(icon, row.textContent).not.toBeNull();
      expect(icon.style.getPropertyValue('--icon'), row.textContent).not.toBe('');
    }
    // The colour is the only thing left saying which rung opened a perk, so
    // each tile's chip must carry its own level's hue and no other.
    const hueOf = (lvl) => [...screen.getAllByTestId('rung-card')]
      .map((c) => [...c.classList].find((k) => k.startsWith('ud__card--')))[lvl - 1]
      .replace('ud__card--', '');
    for (const row of held) {
      const chip = row.querySelector('.ul__chip');
      expect(chip, row.textContent).not.toBeNull();
      expect([...chip.classList], row.textContent)
        .toContain(`ul__chip--${hueOf(Number(row.dataset.level))}`);
    }
    // One flat list, not a run of rung sections (owner, 2026-09-18): which rung
    // a perk arrived on is ladder detail, so no held rung names its own band.
    for (const l of levels.filter((l) => l.level <= ME.level)) {
      expect(within(now).queryByText(l.name), l.name).toBeNull();
    }
    expect(now.querySelectorAll('ul')).toHaveLength(1);

    // Cards are one per rung now, so the next one is at ME.level (0-indexed).
    const cards = screen.getAllByTestId('rung-card');
    expect(cards[ME.level]).toHaveTextContent('Next up');
    // Every card past that wears its own distance (R8): a rung with no number
    // on it reads as a wall rather than a target.
    for (const card of cards.slice(ME.level + 1)) {
      expect(card.textContent, card.textContent).toMatch(/[\d,]+ XP away/);
    }
  });

  // §5.1: the ladder and the formula are reference, so they sit one level
  // below — reachable, never the pitch.
  // The gate is the one thing the note carries that nothing else does: a
  // student who reads only the XP figure would think XP is the whole test.
  // One row per requirement (owner, 2026-09-18), split from the ladder's own
  // string rather than re-entered — so a gate edited in levels.example.json
  // cannot go stale on this screen.
  test('names the rest of the gate, one requirement per row', () => {
    wrap(<Unlock />);
    const parts = next.gate.split('\u00b7').map((s) => s.trim()).filter(Boolean);
    // Without this the test passes on a single unsplit row and asserts nothing.
    expect(parts.length, 'the next rung\'s gate has to have clauses to split').toBeGreaterThan(1);
    expect(screen.getAllByTestId('gate-clause').map((n) => n.textContent)).toEqual(parts);
    // And it is a list, not a paragraph with dots in it.
    expect(screen.queryByText(next.gate)).toBeNull();
  });

  // Ticked where the student has actually cleared the clause (owner,
  // 2026-09-18). The danger here is a tick nobody measured: this app holds an
  // on-time figure and a mission count, and holds nothing at all about star
  // ratings or violations, so those two must never read as done.
  test('ticks only the gate clauses it can actually measure against ME', () => {
    // If the fixture ever clears or misses everything at once, this test stops
    // telling met from open and quietly passes on either.
    expect(ME.onTimePct, 'the fixture has to clear a clause').toBeGreaterThanOrEqual(90);
    expect(ME.xp, 'and miss one').toBeLessThan(LEVEL_XP[next.level]);
    expect(ME.missionsDone).toBeLessThan(5);

    wrap(<Unlock />);
    const state = Object.fromEntries(screen.getAllByTestId('gate-part')
      .map((r) => [within(r).getByTestId('gate-clause').textContent, r.dataset.state]));
    expect(state['\u226590% on-time']).toBe('met');
    expect(state['1,200 XP']).toBe('open');
    expect(state['5+ missions']).toBe('open');
    // Nothing in this app measures either of these, so neither may be claimed.
    expect(state['4.5+ star rating']).toBe('open');
    expect(state['no violations']).toBe('open');
    // And the tick's meaning is available to anyone not looking at it.
    const met = screen.getAllByTestId('gate-part').find((r) => r.dataset.state === 'met');
    expect(met).toHaveTextContent('already met');
  });

  test('the ladder is one tap away and is not on this screen', () => {
    wrap(<Unlock />);
    expect(screen.getByRole('link', { name: /Full ladder/ }))
      .toHaveAttribute('href', '/app/unlock/levels');
    // The rungs the student cannot see yet are named in the bands, but the
    // ladder's own gate strings (the XP formula) are not.
    expect(screen.queryByText(levels[4].gate)).toBeNull();
  });
});

// The block under the deck follows whichever card you have swiped to (owner,
// 2026-09-18). The scroll that chooses it cannot be exercised in jsdom, which
// reports 0 for every offset, so the rule is tested where it lives.
describe('what the grid says for the card you have swiped to', () => {
  test('a rung you hold shows everything you hold, each in its own rung colour', () => {
    for (const at of levels.filter((l) => l.level <= ME.level)) {
      const { heading, items } = holdingsFor(ME.level, at.level);
      // Swiping between two rungs you have both cleared must not change what
      // you own — only a rung you have NOT reached asks a different question.
      expect(heading, `at ${at.name}`).toBe('Available now');
      expect(items.map((i) => i.perk), `at ${at.name}`)
        .toEqual(levels.filter((l) => l.level <= ME.level).flatMap((l) => l.perks));
      // Each perk keeps the colour of the rung that opened it, which is the
      // only thing left on the page saying which rung that was.
      expect(new Set(items.map((i) => i.hue)).size).toBeGreaterThan(1);
    }
  });

  test('a rung you have not reached shows only its own, all in its colour', () => {
    const locked = levels.filter((l) => l.level > ME.level);
    expect(locked.length, 'the fixture needs a locked rung to test').toBeGreaterThan(0);
    for (const at of locked) {
      const { heading, items } = holdingsFor(ME.level, at.level);
      expect(heading, at.name).toBe('Unlock next');
      expect(items.map((i) => i.perk), at.name).toEqual(at.perks);
      expect(new Set(items.map((i) => i.hue)).size, at.name).toBe(1);
      // And it is that rung's own colour, not the one you are standing on.
      expect(items[0].hue, at.name).not.toBe(holdingsFor(ME.level, ME.level).items[0].hue);
    }
  });
});

describe('which gate the foot is showing', () => {
  // It follows the deck for the same reason the grid does: the heading stopped
  // naming a rung on 2026-09-18, so a gate that did not follow would sit under
  // another rung's perks and read as that rung's requirements — swiped to
  // Trusted, it listed Insider's 1,200 XP directly beneath Trusted's unlocks.
  test('a rung you have not reached shows its own', () => {
    for (const at of levels.filter((l) => l.level > ME.level)) {
      expect(gateRungFor(ME.level, at.level).gate, at.name).toBe(at.gate);
    }
  });

  test('a rung you hold falls back to the next one, which is the actionable one', () => {
    for (const at of levels.filter((l) => l.level <= ME.level)) {
      expect(gateRungFor(ME.level, at.level).level, at.name).toBe(ME.level + 1);
    }
  });

  // Every rung above the one you stand on must carry a gate, or the block
  // renders a heading over nothing.
  test('every rung the deck can reach has one', () => {
    for (const at of levels) {
      const rung = gateRungFor(ME.level, at.level);
      expect(rung, at.name).not.toBeNull();
      expect(rung.gate, at.name).toBeTruthy();
    }
  });
});

describe('the perk icons', () => {
  // PERK_ICON is keyed on the perk's own words, which is fragile on purpose:
  // it is not allowed to fall back to a generic glyph, because a silent
  // fallback is how a renamed perk ships with the wrong picture beside it.
  test('every perk in the ladder has one', () => {
    const named = new Set(Object.keys(PERK_ICON));
    const missing = levels.flatMap((l) => l.perks).filter((p) => !named.has(p));
    expect(missing, `no icon for: ${missing.join(', ')}`).toEqual([]);
  });

  // Icon throws on a name that is not in the set, so rendering the held rungs
  // proves those nine; this covers the rest of the map the same way.
  test('and every icon it names is in the set', () => {
    for (const name of new Set(Object.values(PERK_ICON))) {
      expect(() => render(<Icon name={name} />), name).not.toThrow();
      cleanup();
    }
  });
});

describe('Unlock and its ladder cannot disagree', () => {
  // Both screens read levels.example.json. This fails if either grows its own
  // copy of the perks — the two-lists-of-one-fact bug this app has hit before.
  test('every perk Unlock shows for a rung is a perk the ladder shows', () => {
    const { unmount } = wrap(<Unlock />);
    const onUnlock = screen.getAllByTestId('unlock-perk').map((n) => n.textContent.replace(/\d[\d,]* XP away/, '').trim());
    unmount();
    wrap(<Levels />);
    const ladderText = document.body.textContent;
    for (const perk of onUnlock) expect(ladderText, perk).toContain(perk);
  });
});
