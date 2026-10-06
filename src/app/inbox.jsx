import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import hub from '../data/hub.example.json';
import { createClient, isLiveBackend } from '../lib/supabase.js';
import { notesFrom, readInboxIds, writeInboxIds } from '../lib/inbox.js';
import { useAccount } from './account.jsx';
import { useRsvp } from './rsvp.jsx';

// What this student has read. Lifted out of the Inbox screen on 2026-09-21 so
// the header's bell can carry the unread count (owner: "a mark or a number on
// the bell while anything is unread"). Live marks are stored in this browser
// for the signed-in user, the same place the old feed bell kept seen ids.
const InboxContext = createContext(null);

const withRead = (list, read) => list.map((n) => ({ ...n, unread: n.unread && !read.has(n.id) }));

export function InboxProvider({ children }) {
  const live = isLiveBackend();
  const { applications, orders, ready } = useAccount();
  const { tickets, ready: ticketsReady } = useRsvp();
  const [read, setRead] = useState(() => new Set());
  const [userId, setUserId] = useState('');
  const [loaded, setLoaded] = useState(!live);
  const base = live
    ? (ready && ticketsReady ? notesFrom({ applications: applications ?? [], orders: orders ?? [], tickets }) : [])
    : hub.inbox;

  useEffect(() => {
    if (!live) return undefined;
    const supabase = createClient();
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const id = data.session?.user?.id || '';
      setUserId(id);
      const stored = readInboxIds(id);
      setRead((current) => new Set([...stored, ...current]));
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [live]);

  useEffect(() => {
    if (!live || !loaded || !userId) return;
    writeInboxIds(userId, read);
  }, [live, loaded, userId, read]);

  const markRead = useCallback((id) => {
    if (!id) return;
    setRead((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);
  const markAllRead = useCallback(() => {
    setRead((current) => {
      const next = new Set(current);
      for (const note of base) next.add(note.id);
      return next;
    });
  }, [base]);
  const value = useMemo(() => {
    const items = withRead(base, read);
    return { items, unread: items.filter((n) => n.unread).length, markRead, markAllRead };
  }, [base, read, markRead, markAllRead]);
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

// Without a provider (a screen rendered on its own), the fixture as it stands
// and a Mark all read that does nothing — the same shape, so no screen has to
// ask which it got.
const NONE = {
  items: withRead(hub.inbox, new Set()),
  unread: withRead(hub.inbox, new Set()).filter((n) => n.unread).length,
  markRead: () => {},
  markAllRead: () => {},
};
export const useInbox = () => useContext(InboxContext) ?? NONE;
