import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import hub from '../data/hub.example.json';
import { isLiveBackend } from '../lib/supabase.js';
import { loadMyTickets, submitEventApplication } from '../lib/events.js';

// The seats this student has saved on board events — session-only, like the
// cart and the wallet (a backend replaces this provider, not the screens).
// An RSVP is the board event plus what the sheet collected: the name for the
// door and a message for the host. `tickets` is the same list in the shape
// My tickets and the ticket page already read (hub.events rows), so a saved
// seat shows up there as a pass without either screen learning a new shape.
const RsvpContext = createContext(null);

// The passes the student already holds, from the fixture. Two of them name a
// board event (`eventId`), which is why "am I going" cannot be asked of the
// session alone: ev5 and ev6 are already in My tickets, and the event page used
// to offer a seat for a night the student was already on the list for.
const heldFor = (id) => (id ? hub.events.find((e) => e.eventId === id && !e.past) ?? null : null);

// A pass is addressed by its event wherever there is one: two board events
// share a date with a fixture pass (2026-09-19, 2026-09-24), so a date is not
// an address. The ticket route resolves an id first and a date second, which
// keeps the older by-date links working.
export const passPath = (t) => `/app/me/tickets/${t.eventId ?? t.date}`;

export const ticketOf = (ev, r) => ({
  eventId: ev.id,
  title: ev.title,
  date: ev.iso || ev.date,
  meta: `${ev.venue ?? ev.place} · ${ev.time}`,
  cover: ev.cover,
  status: 'going',
  past: false,
  name: r.name,
  message: r.message,
});

export function RsvpProvider({ children }) {
  const live = isLiveBackend();
  const [rsvps, setRsvps] = useState(() => new Map());
  const [liveTickets, setLiveTickets] = useState(null);
  const attend = useCallback((ev, { name, message }) => {
    const seat = { name: name.trim(), message: message.trim() };
    if (!live) {
      setRsvps((m) => new Map(m).set(ev.id, { ev, ...seat, at: Date.now() }));
      return undefined;
    }
    return submitEventApplication(ev.id).then(() => {
      setLiveTickets((list) => {
        const rows = list ?? [];
        if (rows.some((t) => t.eventId === ev.id)) return rows;
        return [ticketOf(ev, seat), ...rows];
      });
    });
  }, [live]);

  useEffect(() => {
    if (!live) return undefined;
    let alive = true;
    loadMyTickets().then((rows) => {
      if (alive && rows) setLiveTickets(rows);
    });
    return () => { alive = false; };
  }, [live]);

  const value = useMemo(() => ({
    attend,
    ready: !live || liveTickets !== null,
    // Held this session, or already held by the fixture. Live passes come only
    // from event_applications — the fixture nights are not this student's.
    isGoing: (id) => (live ? (liveTickets ?? []).some((t) => t.eventId === id) : rsvps.has(id) || Boolean(heldFor(id))),
    rsvpFor: (id) => rsvps.get(id) ?? null,
    heldFor: (id) => (live ? null : heldFor(id)),
    tickets: live ? (liveTickets ?? []) : [...rsvps.values()].map((r) => ticketOf(r.ev, r)),
  }), [rsvps, attend, live, liveTickets]);
  return <RsvpContext.Provider value={value}>{children}</RsvpContext.Provider>;
}

const NONE = { attend: () => {}, ready: true, isGoing: (id) => Boolean(heldFor(id)), rsvpFor: () => null, heldFor, tickets: [] };
export const useRsvp = () => useContext(RsvpContext) ?? NONE;
