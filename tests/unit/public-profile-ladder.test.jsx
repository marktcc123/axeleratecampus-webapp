import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';

// The ladder ends at Partner (levels.example.json), and nobody in
// people.example.json is on that rung — so the top-of-ladder branch has no
// route to reach through the real fixture. Promoting a real person would ripple
// through every guest list that names them and the assertions that count them,
// so the fixture is mocked here instead: one person on the last rung, one below
// it. The second is what stops the first's assertions from passing vacuously.
vi.mock('../../src/data/people.example.json', () => ({
  default: [
    {
      handle: 'toprung', name: 'Tess Toprung', campus: 'UCLA', verified: true,
      level: 5, levelName: 'Partner', xp: 9000, xpToNext: 9000,
    },
    {
      handle: 'climbing', name: 'Cass Climbing', campus: 'UCLA', verified: false,
      level: 3, levelName: 'Insider', xp: 2400, xpToNext: 3600,
    },
  ],
}));

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('the profile at the top of the ladder', () => {
  test('names the last rung and nothing above it — the level alone, no XP, no bar (owner, 2026-09-09)', () => {
    const { container } = at('/u/toprung');
    // "1,200 to LV.6" was the bug: the ladder has five rungs. Since 2026-09-09
    // the card shows the rung only, so there is no distance line to get wrong.
    expect(screen.getByTestId('pp-level')).toHaveTextContent('Partner · Level 5');
    expect(screen.queryByText(/XP/)).toBeNull();
    expect(screen.queryByText(/to Level/)).toBeNull();
    expect(document.querySelector('.ax-hatch')).toBeNull();
  });

  test('a person below the top gets the level alone too — no bar, no distance', () => {
    const { container } = at('/u/climbing');
    expect(screen.getByTestId('pp-level')).toHaveTextContent('Insider · Level 3');
    expect(screen.queryByText(/XP/)).toBeNull();
    expect(screen.queryByText(/to Level/)).toBeNull();
    expect(container.querySelector('.ax-hatch')).toBeNull();
  });
});
