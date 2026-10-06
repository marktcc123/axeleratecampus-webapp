import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Hero from '../../src/sections/Hero.jsx';
import Loop from '../../src/sections/Loop.jsx';
import Missions from '../../src/sections/Missions.jsx';
import missions from '../../src/data/missions.example.json';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Hero', () => {
  test('leads with the slogan as the h1 and one CTA to /join', () => {
    wrap(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Shape what's next.");
    const ctas = screen.getAllByRole('link', { name: 'Join the squad' });
    expect(ctas).toHaveLength(1);
    expect(ctas[0]).toHaveAttribute('href', '/verify');
  });
  test('uses the product promise, not the old invite-network copy', () => {
    wrap(<Hero />);
    expect(screen.getByText(/get paid in real dollars/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/request invite|inside track|grab a seat/i);
  });
});

describe('Loop', () => {
  test('has the anchor id "loop" and the five steps in order', () => {
    wrap(<Loop />);
    const sec = document.getElementById('loop');
    expect(sec).toBeInTheDocument();
    const steps = within(sec).getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toHaveLength(5);
    expect(steps[0]).toMatch(/Apply to a mission/);
    expect(steps[1]).toMatch(/Do the work/);
    expect(steps[2]).toMatch(/The brand approves/);
    expect(steps[3]).toMatch(/Cash lands.*XP lands/);
    expect(steps[4]).toMatch(/Better missions open up/);
  });
});

describe('Missions', () => {
  test('renders one example card per mission, with the locked ones locked and the example caption', () => {
    wrap(<Missions />);
    const cards = screen.getAllByTestId('mission-card');
    expect(cards).toHaveLength(missions.length);
    // This section hard-codes one locked example (Dermabell), independent of
    // ME.level — it is marketing copy, not the live board.
    expect(cards.filter((c) => c.dataset.locked === 'true')).toHaveLength(1);
    expect(screen.getByText(/Example missions\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The live board is open.' })).toHaveAttribute('href', '/app/earn');
  });
  test('the locked card is the Dermabell T4 example with the spec distance', () => {
    wrap(<Missions />);
    expect(screen.getByText('620 XP away · about 3 missions')).toBeInTheDocument();
  });
});
