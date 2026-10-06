import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import boardEvents from '../../src/data/events.example.json';
import hub from '../../src/data/hub.example.json';
import people from '../../src/data/people.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const ev = boardEvents.find((e) => e.seatsLeft > 0);

describe('event detail', () => {
  test('states what it is, when, where and how many seats are left', () => {
    at(`/app/earn/events/${ev.id}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ev.title);
    expect(screen.getByText(new RegExp(ev.venue))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(ev.time))).toBeInTheDocument();
    expect(screen.getByText(ev.blurb)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${ev.seatsLeft} seats left`))).toBeInTheDocument();
  });

  test('the date reads as a date, not as an ISO string', () => {
    at(`/app/earn/events/${ev.id}`);
    // 2026-09-08 breaks across lines in a 320px row and the year is noise.
    expect(document.body.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(screen.getByText(/Sep \d+/)).toBeInTheDocument();
  });

  test('back returns to the board', () => {
    at(`/app/earn/events/${ev.id}`);
    expect(screen.getByRole('link', { name: /Back/ })).toHaveAttribute('href', '/app/earn');
  });

  test('the guest list comes before the action, and the bar carries both count and CTA', () => {
    const { container } = at(`/app/earn/events/${ev.id}`);
    const guests = container.querySelector('.edp__guests');
    const bar = container.querySelector('.edp__bar');
    expect([guests, bar].every(Boolean)).toBe(true);
    // Relative DOM position, not presence. The CTA shipped above the guest list
    // for the whole of this branch — one task appended the CTA and a later one
    // inserted the guest list under it — and "all three are on the page" was
    // true the entire time. You decide once you have seen the room.
    const follows = (a, b) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(guests, bar), 'the call to action must come last').toBe(true);
    // The seats line moved INTO the bar on 2026-09-02, so the count is on
    // screen the whole way down the page instead of scrolling away above the
    // guest list. Both halves of the decision are held here: the count is
    // inside the bar, and it is still the live region.
    const seats = container.querySelector('.edp__seats');
    expect(bar.contains(seats)).toBe(true);
    expect(seats).toHaveAttribute('role', 'status');
    expect(bar).toContainElement(screen.getByRole('button', { name: 'Save me a seat' }));
  });

  test('an unknown event is a 404', () => {
    at('/app/earn/events/nope');
    expect(document.body.textContent).toMatch(/not found/i);
  });
});

describe('the guest list', () => {
  const big = boardEvents.reduce((a, b) => (b.guests.length > a.guests.length ? b : a));
  const small = boardEvents.reduce((a, b) => (b.guests.length < a.guests.length ? b : a));

  test('every guest is a link to their profile', () => {
    at(`/app/earn/events/${small.id}`);
    const tiles = screen.getAllByTestId('guest');
    expect(tiles).toHaveLength(small.guests.length);
    for (const h of small.guests) {
      const person = people.find((p) => p.handle === h);
      const link = screen.getByRole('link', { name: new RegExp(person.name) });
      // A link, not a card with a click handler: it opens in a new tab and
      // assistive tech reads it as what it is.
      expect(link).toHaveAttribute('href', `/u/${h}`);
    }
  });

  test('a long list shows six, then reveals the rest in place', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${big.id}`);
    expect(big.guests.length).toBeGreaterThan(6);
    expect(screen.getAllByTestId('guest')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: new RegExp(`See all ${big.guests.length}`) }));
    expect(screen.getAllByTestId('guest')).toHaveLength(big.guests.length);
    // Revealed in place, not on a second route.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(big.title);
  });

  test('a short list offers no reveal', () => {
    at(`/app/earn/events/${small.id}`);
    expect(screen.queryByRole('button', { name: /See all/ })).toBeNull();
  });

  test('revealing the rest moves focus to the first newly-revealed tile, not <body>', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${big.id}`);
    await user.click(screen.getByRole('button', { name: new RegExp(`See all ${big.guests.length}`) }));
    const tiles = screen.getAllByTestId('guest');
    // SHOWN = 6, so index 6 (the 7th tile) is the first one that was not
    // already on screen before the reveal.
    expect(tiles[6]).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  test('a verified guest is marked, and the mark is not colour alone', () => {
    at(`/app/earn/events/${boardEvents[0].id}`);
    const verified = boardEvents[0].guests
      .map((h) => people.find((p) => p.handle === h))
      .filter((p) => p.verified);
    expect(verified.length).toBeGreaterThan(0);
    for (const p of verified) {
      expect(screen.getByRole('link', { name: new RegExp(`${p.name}.*[Vv]erified`) })).toBeInTheDocument();
    }
  });
});

describe('saving a seat', () => {
  const open = boardEvents.find((e) => e.seatsLeft > 0 && !hub.events.some((h) => h.eventId === e.id));
  const gone = boardEvents.find((e) => e.seatsLeft === 0);
  const alreadyHeld = boardEvents.find((e) => hub.events.some((h) => h.eventId === e.id && !h.past));

  // The seat sheet: a name for the door, the date to agree to, a line for the
  // host; then the bar's button becomes the way to the pass.
  const save = async (user, { name = 'Mark Tao', message } = {}) => {
    await user.click(screen.getByRole('button', { name: 'Save me a seat' }));
    const d = screen.getByRole('dialog');
    await user.clear(within(d).getByLabelText('Your name'));
    if (name) await user.type(within(d).getByLabelText('Your name'), name);
    if (message) await user.type(within(d).getByLabelText(/A line for the host/), message);
    await user.click(within(d).getByRole('button', { name: /Save my seat/ }));
    return d;
  };

  test('the sheet asks for a name, shows the date, and takes a line for the host', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await user.click(screen.getByRole('button', { name: 'Save me a seat' }));
    const d = screen.getByRole('dialog');
    // Empty, with a placeholder: prefilling the profile's "Your name" placeholder
    // made a field that looked answered and shipped to the door unchanged.
    const field = within(d).getByLabelText('Your name');
    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('placeholder', 'The name on the door list');
    expect(within(d).getByText('When')).toBeInTheDocument();
    expect(within(d).getByText(new RegExp(open.time))).toBeInTheDocument();
    expect(within(d).getByLabelText(/A line for the host/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save me a seat' })).toBeInTheDocument();   // nothing saved
  });

  test('a blank name is refused, with a reason', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    const d = await save(user, { name: '' });
    expect(within(d).getByText('We need a name for the door.')).toBeInTheDocument();
    expect(screen.queryByTestId('see-pass')).toBeNull();
    expect(screen.getByText(new RegExp(`${open.seatsLeft} seats left`))).toBeInTheDocument();
  });

  test('a name longer than the stub line is capped, and emoji survive', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await user.click(screen.getByRole('button', { name: 'Save me a seat' }));
    const field = within(screen.getByRole('dialog')).getByLabelText('Your name');
    await user.clear(field);
    await user.type(field, 'M'.repeat(90));
    expect(field.value).toHaveLength(60);
    await user.clear(field);
    await user.type(field, '陶 马克 🎟');
    expect(field).toHaveValue('陶 马克 🎟');
  });

  test('saving takes one off the count and turns the button into See pass', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await save(user, { message: 'Coming straight from class.' });
    expect(screen.queryByRole('dialog')).toBeNull();
    const pass = screen.getByTestId('see-pass');
    expect(pass).toHaveTextContent('See pass');
    // By event, not by date: two board events share a date with a fixture pass.
    expect(pass).toHaveAttribute('href', `/app/me/tickets/${open.id}`);
    expect(screen.getByText(new RegExp(`${open.seatsLeft - 1} seats left`))).toBeInTheDocument();
  });

  test('it cannot be taken twice', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await save(user);
    expect(screen.queryByRole('button', { name: 'Save me a seat' })).toBeNull();
  });

  test('an event the student already holds a pass to offers the pass, not a seat', () => {
    expect(alreadyHeld).toBeDefined();
    at(`/app/earn/events/${alreadyHeld.id}`);
    expect(screen.queryByRole('button', { name: 'Save me a seat' })).toBeNull();
    expect(screen.getByTestId('see-pass')).toHaveAttribute('href', `/app/me/tickets/${alreadyHeld.id}`);
    expect(screen.getByText('You are already on this list.')).toBeInTheDocument();
    // And the seat count is the board's own: the held pass did not come out of it.
    expect(screen.getByText(new RegExp(`${alreadyHeld.seatsLeft} seats left`))).toBeInTheDocument();
  });

  test('a sold-out event offers the waitlist, and says plainly that nothing was sent', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${gone.id}`);
    expect(screen.getByText('No seats left')).toBeInTheDocument();
    // The shop's own sold-out string, not a third pattern (PerkDetail:157).
    const wait = screen.getByRole('button', { name: /Waitlist me/ });
    expect(screen.queryByRole('button', { name: 'Save me a seat' })).toBeNull();
    await user.click(wait);
    expect(screen.getByText('Nothing was sent. The waitlist opens at launch.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'On the waitlist' })).toBeDisabled();
  });

  test('after saving, focus lands on See pass, not <body>', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await save(user);
    expect(screen.getByTestId('see-pass')).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  test('the pass and the seat-count status say different things', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await save(user);
    const status = document.querySelector('.edp__seats[role="status"]');
    expect(status).toBeInTheDocument();
    expect(status.textContent.trim()).not.toBe(screen.getByTestId('see-pass').textContent.trim());
  });

  test('nothing claims a seat was really booked', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    expect(document.body.textContent).not.toMatch(/confirm|we('| wi)ll email|see you there/i);
    await save(user);
    expect(screen.getByText('Your pass is in My tickets, saved for this session.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/confirm|we('| wi)ll email|see you there/i);
  });

  test('the pass carries the name and the note the sheet took, and My tickets lists it', async () => {
    const user = userEvent.setup();
    at(`/app/earn/events/${open.id}`);
    await save(user, { name: 'Mark Tao', message: 'Coming straight from class.' });
    await user.click(screen.getByTestId('see-pass'));
    expect(screen.getByTestId('ticket')).toBeInTheDocument();
    expect(screen.getByText(open.title)).toBeInTheDocument();
    expect(screen.getByText(/Mark Tao/)).toBeInTheDocument();          // the stub line
    expect(screen.getByText('Coming straight from class.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to my tickets' }));
    expect(screen.getAllByTestId('event-row').some((r) => r.textContent.includes(open.title))).toBe(true);
  });

  test('a pass URL from another session says why it is not here', () => {
    at(`/app/me/tickets/${open.id}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No pass here');
    expect(screen.getByText(/kept for this session only/)).toBeInTheDocument();
  });

  test('a held event resolves to the fixture pass by id, not to whatever shares its date', () => {
    const clash = hub.events.find((h) => h.eventId && boardEvents.some((e) => e.id === h.eventId));
    expect(clash).toBeDefined();
    at(`/app/me/tickets/${clash.eventId}`);
    expect(screen.getByTestId('ticket')).toBeInTheDocument();
    expect(screen.getByText(clash.title)).toBeInTheDocument();
  });
});

describe('Back and Share over the cover (owner, 2026-09-09)', () => {
  test('Share hands out this event\'s own address through the platform sheet', async () => {
    const user = userEvent.setup();
    at('/app/earn/events/ev1');
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/app/earn');
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    await user.click(screen.getByTestId('share-page'));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('/app/earn/events/ev1') }));
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
});
