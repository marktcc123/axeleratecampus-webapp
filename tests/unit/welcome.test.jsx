import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import Welcome from '../../src/app/Welcome.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('Welcome — the gate at /', () => {
  test('shows the wordmark and two doors: sign up first, log in beneath it', () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    // The drawn mark, not the typed word: an image named by the brand.
    expect(screen.getByRole('img', { name: 'Axelerate' })).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    // Three, since the 2026-09-21 redraw. The first is the owner's wording for
    // sign-up and keeps its href; the second is the returning student's door,
    // a full button now rather than an underlined line; the third is the one
    // way back into the intro from inside the product.
    expect(links).toHaveLength(3);
    // The arrow is aria-hidden, so the name is the words alone.
    expect(links[0]).toHaveAccessibleName('Join the squad');
    expect(links[0]).toHaveAttribute('href', '/verify');
    expect(links[1]).toHaveAccessibleName('Log in');
    expect(links[1]).toHaveAttribute('href', '/login');
    expect(links[2]).toHaveAccessibleName('Replay the intro');
    expect(links[2]).toHaveAttribute('href', '/onboarding');
    expect(links[0].className).toMatch(/ax-btn--secondary/);
    expect(links[1].className).toMatch(/ax-btn--secondary/);
  });

  test('says speed once, and carries the two facts as paper, not prose', () => {
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What do you want next?');
    expect(screen.getByText(/Tell us what you.re looking for/)).toBeInTheDocument();
    const scene = document.querySelector('.welcome__scene');
    expect(scene).toHaveAttribute('aria-hidden', 'true');
    expect(scene.textContent).toContain('Demand first');
    expect(scene.textContent).toContain('Brands compete');
    // No pay-for-level promise anywhere on the door (R7).
    expect(document.body.textContent).not.toMatch(/earn more|higher pay|more pay|pay multiplier/i);
  });

  test('carries nothing else — no tab bar, no preview marker, no board', () => {
    at('/');
    expect(screen.queryByRole('navigation', { name: 'App' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Missions' })).not.toBeInTheDocument();
  });

  test('the marketing site is unreachable', () => {
    // The landing page's slogan and the brands page must not render anywhere.
    for (const path of ['/', '/for-brands', '/verify', '/login']) {
      const { unmount } = at(path);
      expect(screen.queryByText("Shape what's next.")).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Book a call' })).not.toBeInTheDocument();
      unmount();
    }
  });

  test('no marketing chrome renders on any route', () => {
    for (const path of ['/', '/verify', '/login', '/app/earn', '/app/me']) {
      const { unmount } = at(path);
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
      unmount();
    }
  });
});
