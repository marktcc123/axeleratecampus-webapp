import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import Inbox from '../../src/app/screens/Inbox.jsx';
import { InboxProvider } from '../../src/app/inbox.jsx';
import EventTicket from '../../src/app/screens/EventTicket.jsx';
import Events from '../../src/app/screens/Events.jsx';
import hub from '../../src/data/hub.example.json';
import boardEvents from '../../src/data/events.example.json';

const wrap = (ui) => render(<ProfileProvider><WalletProvider><MemoryRouter>{ui}</MemoryRouter></WalletProvider></ProfileProvider>);

const atTicket = (date) =>
  render(
    <ProfileProvider><WalletProvider><MemoryRouter initialEntries={[`/app/me/tickets/${date}`]}>
      <Routes><Route path="/app/me/tickets/:date" element={<EventTicket />} /></Routes>
    </MemoryRouter></WalletProvider></ProfileProvider>,
  );

describe('Inbox', () => {
  test('groups by New and Earlier and links each row at its source', () => {
    wrap(<InboxProvider><Inbox /></InboxProvider>);
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Earlier' })).toBeInTheDocument();
    for (const n of hub.inbox) {
      expect(screen.getByText(n.text).closest('a')).toHaveAttribute('href', n.to);
    }
  });

  test('unread is announced, not only coloured', () => {
    wrap(<InboxProvider><Inbox /></InboxProvider>);
    const unread = hub.inbox.filter((n) => n.unread);
    expect(unread.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unread')).toHaveLength(unread.length);
  });

  test('marking all read clears the count and retires the button', async () => {
    const user = userEvent.setup();
    wrap(<InboxProvider><Inbox /></InboxProvider>);
    const unread = hub.inbox.filter((n) => n.unread).length;
    expect(screen.getByText(`${unread} unread`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark all read' }));

    expect(screen.getByText('all caught up')).toBeInTheDocument();
    expect(screen.queryByText('Unread')).toBeNull();
    // The button promised an action; leaving it there would offer it twice.
    expect(screen.queryByRole('button', { name: 'Mark all read' })).toBeNull();
  });
});

describe('Event ticket', () => {
  const upcoming = hub.events.find((e) => !e.past);

  test('renders the ticket for the event in the URL', () => {
    atTicket(upcoming.date);
    expect(screen.getByTestId('ticket')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: upcoming.title })).toBeInTheDocument();
  });

  test('the weekday it prints agrees with its own date', () => {
    atTicket(upcoming.date);
    // The fixture used to carry a hand-written weekday and all three had
    // drifted from the date beside them.
    const expected = new Date(`${upcoming.date}T00:00:00`)
      .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  test('splits the venue and time the list runs together', () => {
    atTicket(upcoming.date);
    const [venue, time] = upcoming.meta.split('·').map((s) => s.trim());
    const grid = screen.getByTestId('ticket').querySelector('.tk__grid');
    expect(within(grid).getByText(venue)).toBeInTheDocument();
    expect(within(grid).getByText(time)).toBeInTheDocument();
  });

  test('the pass carries no money figure at all', () => {
    // It used to print "Paid crew · $40 cash + 120 XP", a rate no fixture held
    // and the only money on the screen. The pay lives on the mission and in
    // the wallet, and the pass now links to the wallet instead of quoting it.
    const crew = hub.events.find((e) => e.status === 'crew');
    atTicket(crew.date);
    expect(screen.getByTestId('ticket').textContent).not.toMatch(/\$\d/);
    expect(screen.getByRole('link', { name: /My rewards/ })).toHaveAttribute(
      'href', '/app/me/wallet',
    );
  });

  test('a ticket links to its listing only when it has one', () => {
    const withListing = hub.events.find((e) => e.eventId);
    atTicket(withListing.date);
    expect(screen.getByRole('link', { name: /Event details/ })).toHaveAttribute(
      'href', `/app/earn/events/${withListing.eventId}`,
    );

    const noListing = hub.events.find((e) => !e.eventId);
    expect(noListing).toBeTruthy();
    atTicket(noListing.date);
    // Two tickets are mounted now, so this counts rather than asserting
    // absence: the second screen adds no third link.
    expect(screen.getAllByRole('link', { name: /Event details/ })).toHaveLength(1);
  });

  test('a ticket that names a listing agrees with it', () => {
    // The fixture writes the title, date and venue down twice — once on the
    // listing, once on the ticket — so something has to hold them together.
    const listings = new Map(boardEvents.map((e) => [e.id, e]));
    for (const t of hub.events.filter((e) => e.eventId)) {
      const l = listings.get(t.eventId);
      expect(l, `no listing ${t.eventId}`).toBeTruthy();
      expect(t.title).toBe(l.title);
      expect(t.date).toBe(l.date);
      expect(t.meta).toBe(`${l.venue} · ${l.time}`);
      expect(t.cover).toBe(l.cover);
    }
  });

  test('a past ticket opens, and says the code is the part that expired', () => {
    const past = hub.events.find((e) => e.past);
    atTicket(past.date);
    const tk = screen.getByTestId('ticket');
    expect(tk).toHaveAttribute('data-past', 'true');
    expect(screen.getByText(/code has expired/i)).toBeInTheDocument();
    // Still the record of the night: the details it held are all still on it.
    const [venue, time] = past.meta.split('·').map((x) => x.trim());
    expect(within(tk).getByText(venue)).toBeInTheDocument();
    expect(within(tk).getByText(time)).toBeInTheDocument();
  });

  test('an unknown pass says why it is not here, instead of rendering an empty ticket', () => {
    atTicket('1999-01-01');
    expect(screen.queryByTestId('ticket')).toBeNull();
    expect(screen.getByRole('heading', { name: 'No pass here' })).toBeInTheDocument();
    // The likeliest cause is a reload, not a dropped event: seats are session state.
    expect(screen.getByText(/kept for this session only/)).toBeInTheDocument();
  });

  test('every event on the list reaches its own ticket, addressed by event where there is one', () => {
    wrap(<Events />);
    // By id, not date: two of these share a date with a board event, and a date
    // resolved to whichever row came first.
    for (const e of hub.events) {
      expect(screen.getByText(e.title).closest('a')).toHaveAttribute(
        'href', `/app/me/tickets/${e.eventId ?? e.date}`,
      );
    }
    expect(hub.events.some((e) => e.eventId)).toBe(true);
  });

  test('a date still opens the pass it names, so older links keep working', () => {
    const dated = hub.events.find((e) => !e.eventId);
    atTicket(dated.date);
    expect(screen.getByTestId('ticket')).toBeInTheDocument();
    expect(screen.getByText(dated.title)).toBeInTheDocument();
  });
});
