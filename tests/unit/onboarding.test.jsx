import userEvent from '@testing-library/user-event';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Onboarding from '../../src/app/screens/Onboarding.jsx';
import { seen } from '../../src/app/firstrun.js';

const at = (path = '/onboarding') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<h1>The gate</h1>} />
    </Routes>
  </MemoryRouter>,
);

const next = () => screen.getByRole('button');
const gate = () => screen.queryByRole('heading', { name: 'The gate' });

afterEach(cleanup);

describe('the intro before the gate', () => {
  test('walks four screens, each with its own headline', async () => {
    const user = userEvent.setup();
    at();
    const heads = [
      'Tell us what you want.',
      'You’re not alone.',
      'Brands compete for you.',
      'Demand first. Supply second.',
    ];
    for (const [i, head] of heads.entries()) {
      expect(screen.getByRole('heading', { level: 1 }), `screen ${i + 1}`).toHaveTextContent(head);
      expect(screen.getAllByRole('button'), `screen ${i + 1}`).toHaveLength(1);
      if (i < 3) await user.click(next());
    }
  });

  test('the first screen says what the product is', () => {
    at();
    expect(screen.getByText(/Axelerate starts with your demand/)).toBeInTheDocument();
  });

  test('the second screen names the loop', async () => {
    const user = userEvent.setup();
    at();
    await user.click(next());
    const rows = screen.getAllByTestId('ob-kind').map((n) => n.textContent);
    expect(rows).toEqual([
      'Demand signalYou', 'Live demandUs', 'Brand offerThem', 'You chooseBuy',
    ]);
  });

  test('the third screen names ask, join and choose', async () => {
    const user = userEvent.setup();
    at();
    await user.click(next());
    await user.click(next());
    const pairs = screen.getAllByTestId('ob-pair').map((n) => n.textContent);
    expect(pairs).toEqual([
      'AskSay what you want next.',
      'JoinFind others who want the same.',
      'ChoosePick the offer that fits.',
    ]);
  });

  test('the fourth screen does not promise pay or XP', async () => {
    const user = userEvent.setup();
    at();
    for (let i = 0; i < 3; i++) await user.click(next());
    expect(screen.getAllByTestId('ob-tag').map((n) => n.textContent)).toEqual([
      'Capture', 'Aggregate', 'Respond', 'Choose', 'Learn',
    ]);
    expect(document.body.textContent).not.toMatch(/earn more|higher pay|more pay|pay multiplier/i);
  });

  test('the last screen hands over to the gate, and so does Skip', async () => {
    const user = userEvent.setup();
    at();
    for (let i = 0; i < 3; i++) await user.click(next());
    expect(next()).toHaveTextContent('See what you want next');
    await user.click(next());
    expect(gate()).toBeInTheDocument();

    cleanup();
    window.localStorage.clear();
    at();
    await user.click(screen.getByRole('link', { name: 'Skip' }));
    expect(gate(), 'Skip is the same arrival as finishing').toBeInTheDocument();
  });

  test('the pips track the screen, and the count is said as well as drawn', async () => {
    const user = userEvent.setup();
    at();
    const filled = () => document.querySelectorAll('.ob__pip[data-on]').length;
    expect(filled()).toBe(1);
    expect(screen.getByRole('status')).toHaveTextContent('Step 1 of 4');
    await user.click(next());
    expect(filled()).toBe(2);
    expect(screen.getByRole('status')).toHaveTextContent('Step 2 of 4');
    expect(document.querySelectorAll('.ob__pip')).toHaveLength(4);
  });

  test('renders no emoji', async () => {
    const user = userEvent.setup();
    at();
    for (let i = 0; i < 4; i++) {
      expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      if (i < 3) await user.click(next());
    }
  });
});

describe('it records itself', () => {
  test('on arrival, not on finishing', () => {
    expect(seen('intro')).toBe(false);
    at();
    expect(seen('intro'), 'a student who closes the tab mid-tour has still seen it').toBe(true);
  });

  test('and still renders at its own address once seen', () => {
    at();
    cleanup();
    at();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tell us what you want.');
    expect(gate()).toBeNull();
  });

  test('and a browser with no storage still gets through it', () => {
    const real = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    try {
      at();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tell us what you want.');
    } finally {
      Object.defineProperty(window, 'localStorage', real);
    }
  });
});
