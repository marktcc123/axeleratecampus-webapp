import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import applications from '../../src/data/applications.example.json';
import { handleFor } from '../../src/app/profile.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const signUpAs = async (user, name) => {
  await user.type(screen.getByLabelText('Name'), name);
  await user.type(screen.getByLabelText('School email'), 'priya@ucla.edu');
  await user.click(screen.getByRole('button', { name: /Get verified/ }));
  await screen.findByRole('navigation', { name: 'App' });
  await user.click(within(screen.getByRole('navigation', { name: 'App' })).getByRole('link', { name: 'Profile' }));
};

describe('the public résumé and its share button', () => {
  test('the handle is the name, lowercased, letters and digits only', () => {
    expect(handleFor('Mark Tao')).toBe('marktao');
    expect(handleFor(' Priya  Nair-Ó ')).toBe('priyanairo');
    expect(handleFor('')).toBe('');
  });

  test('Share is live before sign-up, on the placeholder\'s handle (owner, 2026-09-09)', async () => {
    const user = userEvent.setup();
    at('/app/me');
    // Share is a row of the account drawer (owner, 2026-09-21), reached from
    // the avatar on every tab.
    await user.click(screen.getByTestId('account'));
    const b = screen.getByTestId('share-profile');
    expect(b).toBeEnabled();
    expect(b).toHaveAccessibleName('Share profile');
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    await user.click(b);
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/\/u\/yourname$/) }));
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  test('Share copies /u/<handle> and says so', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue();
    // jsdom's navigator.clipboard is a getter; assign does nothing. Define it.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    at('/verify');
    await signUpAs(user, 'Priya Nair');
    await user.click(screen.getByTestId('account'));
    await user.click(screen.getByTestId('share-profile'));
    expect(write).toHaveBeenCalledWith(expect.stringMatching(/\/u\/priyanair$/));
    // A glyph button: the words are its accessible name, not its text.
    // "Copied" on the button while the copy is fresh; the status line says
    // "Link copied" in full for anyone not looking.
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Link copied');
  });

  test("the student's own page is a résumé: one row per brand with its missions, three figures, never the pay", async () => {
    const user = userEvent.setup();
    // One router the whole way: the profile is session state, and a second
    // <App> would be a second session with no name in it.
    const router = createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: ['/verify'] });
    render(<RouterProvider router={router} />);
    await signUpAs(user, 'Priya Nair');
    // Follow the link the button hands out.
    await act(() => router.navigate('/u/priyanair'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Priya Nair');
    const paid = applications.filter((a) => a.status === 'paid');
    const brands = [...new Set(paid.map((a) => a.brand))];
    // Redrawn 2026-09-21 on the reference build: one row per brand, with what
    // kind of work and which missions; the separate brand discs, mission tiles
    // and "Events attended" came off with it.
    const rows = screen.getAllByTestId('resume-row');
    expect(rows).toHaveLength(brands.length);
    rows.forEach((row, i) => {
      expect(row).toHaveTextContent(brands[i]);
      for (const a of paid.filter((x) => x.brand === brands[i])) expect(row).toHaveTextContent(a.title.split(' — ')[1]);
      expect(row).toHaveTextContent(/Content creation|Campus activation|Event crew/);
    });
    expect(screen.queryByRole('heading', { name: /Events attended|Missions completed|^Brands$/ })).toBeNull();
    // Three figures on the student's own card: on-time is theirs to show.
    const stats = screen.getByTestId('pp-stats');
    expect(within(stats).getByText('Missions').previousSibling).toHaveTextContent(String(paid.length));
    expect(within(stats).getByText('Brands').previousSibling).toHaveTextContent(String(brands.length));
    expect(within(stats).getByText('On-time')).toBeInTheDocument();
    expect(screen.getByTestId('pp-level')).toHaveTextContent(/ · Level \d$/);
    // No address line and no closing sentence (owner, 2026-09-21).
    expect(screen.queryByText(/\/u\/priyanair/)).toBeNull();
    expect(screen.queryByText(/brand-approved work/)).toBeNull();
    expect(screen.queryByText(/An Axelerate profile/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\$\d/);
  });

  test('a fixture person\'s page shows the example résumé, no tick, and the old /user/ path redirects', () => {
    at('/user/marktao');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mark Tao');
    // Example rows for everyone until a backend supplies each person's own (owner, 2026-09-09).
    expect(screen.queryByText('None yet.')).toBeNull();
    expect(screen.getByTestId('resume-experience')).toBeInTheDocument();
    expect(screen.queryByText('Verified student')).toBeNull();   // the tick is the session's own mark
    // Two figures, not three: the fixture knows no on-time record for anyone
    // but the signed-in student, and the card does not invent one.
    expect(within(screen.getByTestId('pp-stats')).queryByText('On-time')).toBeNull();
    expect(screen.queryByText(/to Level|XP/)).toBeNull();        // the level alone, no progress
    expect(screen.queryByRole('link', { name: /axelerate/i })).toBeNull();   // the wordmark came off
  });
});
