import { NavLink } from 'react-router-dom';

// Thirteen tabs do not fit a 520px column, and neither existing pattern fits:
// the DS Tabs component draws folder tabs sized for four, and the app's
// FormatTabs (.ft) is a plain flex row with no overflow handling. This is the
// FilterChips (.fc) pattern instead — a horizontal scroller with the
// scrollbar hidden and negative margins so the row bleeds to the column edge
// and reads as scrollable.
//
// Counts appear only where a queue holds work waiting. A count of editable
// rows (Campuses, Cashback) is not a to-do, so those carry none.
export const TABS = [
  { slug: 'analytics', label: 'Analytics', countKey: null },
  // The catalogue: what a student browses. These four write the same store the
  // board and the shop read (content.jsx), so a change here is live on the next
  // render. They carry no count — a row here is not work waiting.
  { slug: 'brands', label: 'Brands', countKey: null },
  { slug: 'missions', label: 'Missions', countKey: null },
  { slug: 'shop', label: 'Shop', countKey: null },
  { slug: 'tasks', label: 'Tasks', countKey: 'tasks' },
  { slug: 'ugc', label: 'UGC review', countKey: 'ugc' },
  { slug: 'reviews', label: 'Reviews', countKey: 'reviews' },
  { slug: 'gigs', label: 'Physical gigs', countKey: 'gigs' },
  { slug: 'events', label: 'Events', countKey: 'events' },
  { slug: 'withdrawals', label: 'Withdrawals', countKey: 'withdrawals' },
  { slug: 'campuses', label: 'Campuses', countKey: null },
  { slug: 'career', label: 'Career', countKey: 'career' },
  { slug: 'cashback', label: 'Cashback %', countKey: null },
];

// A <nav> of links, not role="tablist" of role="tab". Each tab is its own
// address, so this navigates rather than swapping a panel in place — and the
// tab role would promise aria-controls and a tabpanel that do not exist, while
// also overriding the anchors' own link role for assistive tech.
export default function AdminTabs({ counts = {} }) {
  return (
    <nav className="adm__tabs" aria-label="Admin sections">
      {TABS.map((tab) => {
        const n = tab.countKey ? counts[tab.countKey] : null;
        return (
          <NavLink key={tab.slug} to={`/app/me/admin/${tab.slug}`} className="adm__tab">
            {tab.label}
            {n ? <span className="adm__tab-n">{n}</span> : null}
          </NavLink>
        );
      })}
    </nav>
  );
}
