import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Ladder from '../../src/sections/Ladder.jsx';
import Shop from '../../src/sections/Shop.jsx';
import BrandsTeaser from '../../src/sections/BrandsTeaser.jsx';
import CtaBand from '../../src/sections/CtaBand.jsx';
import LandingPage from '../../src/pages/LandingPage.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Ladder', () => {
  test('has anchor id "ladder" and the five levels in order', () => {
    wrap(<Ladder />);
    const sec = document.getElementById('ladder');
    const names = within(sec).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Explorer', 'Contributor', 'Insider', 'Trusted', 'Partner']);
  });
  test('shows access and status, never a pay promise (R7)', () => {
    wrap(<Ladder />);
    const text = document.getElementById('ladder').textContent;
    // Forbid promising more money for climbing the ladder…
    expect(text).not.toMatch(/earn more|higher pay|more pay|bonus pay|pay (boost|bonus)|×\s*pay/i);
    // …and require the rule to be stated outright, in the spec's own words.
    expect(text).toMatch(/never a pay multiplier/);
    expect(text).toMatch(/Public profile goes live/);
  });
  test('gates are the spec\'s complete "all required" lists, not summaries', () => {
    wrap(<Ladder />);
    const text = document.getElementById('ladder').textContent;
    expect(text).toMatch(/≥90% on-time/);                 // L3 reliability gate
    expect(text).toMatch(/3\+ brands/);                   // L4 breadth gate
    expect(text).toMatch(/qualification \+ invitation/);  // L5 is invited, not earned by volume alone
  });
});

describe('Shop', () => {
  test('never shows credit as a bare number (R1) and states the single gate (R4)', () => {
    wrap(<Shop />);
    expect(screen.getByText(/2,400 credit · \$24 in shop/)).toBeInTheDocument();
    expect(screen.getByText(/One gate: verification/)).toBeInTheDocument();
  });
});

describe('BrandsTeaser', () => {
  test('points brands at /for-brands', () => {
    wrap(<BrandsTeaser />);
    expect(screen.getByRole('link', { name: /For brands/ })).toHaveAttribute('href', '/for-brands');
  });
});

describe('CtaBand', () => {
  test('repeats the slogan and the join CTA', () => {
    wrap(<CtaBand />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent("Shape what's next.");
    expect(screen.getByRole('link', { name: 'Join the squad' })).toHaveAttribute('href', '/verify');
    expect(screen.getByText('Sign-up is open. Join with your email.')).toBeInTheDocument();
  });
});

describe('LandingPage', () => {
  test('composes all seven sections in spec order', () => {
    wrap(<LandingPage />);
    const main = screen.getByRole('main');
    const h2s = within(main).getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s[0]).toMatch(/One loop/);
    expect(h2s[1]).toMatch(/dollar figure/);
    expect(h2s[2]).toMatch(/5 levels/);
    expect(h2s[h2s.length - 1]).toBe("Shape what's next.");
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent("Shape what's next.");
  });
  test('uses no banned words', () => {
    wrap(<LandingPage />);
    expect(document.body.textContent).not.toMatch(/\b(synergy|leverage|ecosystem|empower|successfully)\b/i);
    // "unlock" only as the noun in the ladder, never as a verb: no "unlocks?" followed by an object
    expect(document.body.textContent).not.toMatch(/\bunlock(s|ed|ing)?\s+(the|your|a|new)\b/i);
  });
});
