import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import people from '../../src/data/people.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const mark = people.find((p) => p.handle === 'marktao');

describe('the public profile', () => {
  test('states who this is, where, and which rung — not how far to the next (owner, 2026-09-09)', () => {
    at('/u/marktao');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(mark.name);
    expect(screen.getByText(mark.campus)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mark.levelName))).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(mark.xp.toLocaleString('en-US')))).toBeNull();
  });

  test('shows no money, in any form', () => {
    at('/u/marktao');
    // The fixture has no money field, so this is the second line of defence:
    // a currency symbol reaching this page at all is the bug.
    expect(document.body.textContent).not.toMatch(/\$|USD|earned|payout|paid/i);
  });

  test('carries none of the app chrome', () => {
    at('/u/marktao');
    // No tab bar: this page is shown to people who have no account, and four
    // destinations they cannot use is worse than none.
    expect(screen.queryByRole('navigation', { name: /App/i })).toBeNull();
  });

  test('carries its own back affordance, and it never leaves the site', async () => {
    const user = userEvent.setup();
    at('/u/marktao');
    // The five other detail screens all have one; this one sits outside the
    // shell, so there is no chrome above it to borrow one from.
    const back = screen.getByRole('button', { name: 'Back' });
    // No in-app history here — the cold arrival that a bare navigate(-1) would
    // send off-site. Back means the start instead — and for a stranger, who by
    // definition has not seen the intro, the start is the intro (2026-09-21).
    // Still this site, which is the promise under test.
    await user.click(back);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tell us what you want.');
  });

  test('carries a Share at the top right that hands out this page\'s own address (owner, 2026-09-23)', async () => {
    const user = userEvent.setup();
    at('/u/marktao');
    const share = screen.getByRole('button', { name: 'Share' });
    // In the head row beside Back, not somewhere down the card.
    expect(share.parentElement).toBe(screen.getByRole('button', { name: 'Back' }).parentElement);
    const sheet = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: sheet, configurable: true });
    await user.click(share);
    expect(sheet).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/\/u\/marktao$/) }));
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  test('an unknown handle is a 404, not an empty card', () => {
    at('/u/nobody');
    // An empty card invites guessing at handles.
    expect(screen.queryByRole('heading', { level: 1 })).not.toHaveTextContent('Nobody');
    expect(document.body.textContent).toMatch(/not found/i);
  });

  test('asks not to be indexed while it is mounted', () => {
    const view = at('/u/marktao');
    const meta = document.head.querySelector('meta[name="robots"]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('content')).toMatch(/noindex/);
    view.unmount();
    // And takes the tag with it: this is a SPA, and a tag left behind would
    // de-index the app itself on the next route.
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
