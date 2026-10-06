import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestDeck from '../../src/app/parts/QuestDeck.jsx';
import FormatTabs from '../../src/app/parts/FormatTabs.jsx';
import FilterChips from '../../src/app/parts/FilterChips.jsx';
import quests from '../../src/data/quests.example.json';

describe('QuestDeck', () => {
  // The deck used to fan three cards and swap one to the front on tap. The
  // design replaced that with a scroll-snap carousel: every quest is rendered
  // in full, and the scroll position is the only state.
  test('renders every quest in full, not one plus two strips', () => {
    render(<QuestDeck quests={quests} />);
    for (const q of quests) {
      expect(screen.getByRole('heading', { name: q.title })).toBeInTheDocument();
      expect(screen.getByText(q.desc)).toBeInTheDocument();
      expect(screen.getByText(q.reward)).toBeInTheDocument();
    }
  });

  test('is a scroll-snap row, so no quest is behind a tap', () => {
    render(<QuestDeck quests={quests} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByTestId('quest-deck').children).toHaveLength(quests.length);
  });

  test('each quest carries its own decorative mark, hidden from readers', () => {
    const { container } = render(<QuestDeck quests={quests} />);
    const marks = container.querySelectorAll('.doodle');
    expect(marks).toHaveLength(quests.length);
    for (const m of marks) expect(m).toHaveAttribute('aria-hidden', 'true');
  });

  test('resolves quest colours to tokens, never hex', () => {
    const { container } = render(<QuestDeck quests={quests} />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // Every quest's own token, not one hardcoded hue — pinning a single colour
    // made this pass or fail on which quest happened to be first.
    for (const q of quests) expect(container.innerHTML).toContain(`var(--${q.color})`);
  });
});

describe('FormatTabs', () => {
  const formats = [{ id: 'All', count: 4 }, { id: 'Digital', count: 1 }, { id: 'Physical', count: 3 }];

  test('renders one tab per format with its count, and marks the active one', () => {
    render(<FormatTabs formats={formats} value="All" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['All4', 'Digital1', 'Physical3']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  test('calls onChange with the tapped format id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormatTabs formats={formats} value="All" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Physical/ }));
    expect(onChange).toHaveBeenCalledWith('Physical');
  });

  test('each tab points at the region it controls and carries a stable id', () => {
    render(<FormatTabs formats={formats} value="All" onChange={() => {}} controls="gigs-grid" />);
    for (const t of screen.getAllByRole('tab')) {
      expect(t).toHaveAttribute('aria-controls', 'gigs-grid');
      expect(t.id).toMatch(/^fmt-tab-/);
    }
  });
});

describe('FilterChips', () => {
  const chips = ['$25+', 'Under 1 hr', 'This week'];

  test('renders each chip unpressed by default', () => {
    render(<FilterChips chips={chips} active={new Set()} onToggle={() => {}} />);
    for (const c of chips) {
      expect(screen.getByRole('button', { name: c })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('marks active chips pressed and toggles independently', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<FilterChips chips={chips} active={new Set(['$25+'])} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: '$25+' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'This week' }));
    expect(onToggle).toHaveBeenCalledWith('This week');
  });
});
