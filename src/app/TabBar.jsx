import { NavLink, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useCart } from './cart.jsx';
import './app.css';

const TABS = [
  { to: '/app', label: 'Home', icon: 'rocket', tint: 'gigs', size: 27, end: true },
  { to: '/app/discover', label: 'Discover', icon: 'globe', set: 'app', tint: 'perks', size: 29 },
  { to: '/app/me/demand', label: 'Demand', icon: 'flag-line', tint: 'app', size: 29 },
  { to: '/app/me', label: 'Profile', icon: 'user', tint: 'me', size: 27, end: true },
];

const OWNS_BOTTOM = [
  /^\/app\/shop\/[^/]+$/,
  /^\/app\/discover\/[^/]+$/,
  /^\/app\/earn\/events\/[^/]+$/,
  /^\/app\/earn\/[^/]+$/,
  /^\/app\/demand\/new$/,
  /^\/app\/demand\/[^/]+$/,
];

export default function TabBar() {
  const { pathname } = useLocation();
  const { count } = useCart();
  if (OWNS_BOTTOM.some((r) => r.test(pathname))) return null;
  if (pathname === '/app/cart' && count > 0) return null;

  return (
    <nav className="app__tabs" aria-label="App">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={`nav-btn nav-${t.tint}`}>
          <span className="blob" aria-hidden="true" />
          <Icon name={t.icon} set={t.set} size={t.size} className="ic" />
          <span className="app__tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
