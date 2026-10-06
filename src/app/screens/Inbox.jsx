import { Link } from 'react-router-dom';
import { ScreenHeader } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import { useInbox } from '../inbox.jsx';
import './inbox.css';

const GROUPS = [['new', 'New'], ['earlier', 'Earlier']];

export default function Inbox() {
  // Read state lives in inbox.jsx (2026-09-21), shared with the header's
  // bell, so Mark all read changes the count there as well as here. Marking
  // all read has to change something visible or the button is a lie.
  const { items, unread, markRead, markAllRead } = useInbox();

  return (
    <div className="sub">
      <ScreenHeader
        back={{ as: Link, to: '/app/me', label: 'Back to me' }}
        kicker="Me"
        title="Inbox"
        note={unread ? `${unread} unread` : 'all caught up'}
        action={
          unread > 0 && (
            <button
              type="button"
              className="ib__mark"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          )
        }
      />

      {items.length === 0 && <p className="ib__meta">Nothing new yet.</p>}
      {GROUPS.map(([key, label]) => {
        const group = items.filter((n) => n.group === key);
        if (group.length === 0) return null;
        return (
          <section key={key}>
            <h2 className="sub__label">{label}</h2>
            <ul className="ib__list">
              {group.map((n) => (
                <li key={n.id} className="ib" data-testid="inbox-row" data-unread={n.unread}>
                  <Link to={n.to} className="ib__link" onClick={() => markRead(n.id)}>
                    <span className={`ib__ico ib__ico--${n.tint}`}>
                      <Icon name={n.icon} size={16} />
                    </span>
                    <span className="ib__mid">
                      <span className="ib__text">{n.text}</span>
                      <span className="ib__meta">{n.meta}</span>
                    </span>
                    {/* The dot is the only thing that says unread, so it needs
                        a name for anyone who cannot see it. */}
                    {n.unread && <span className="ib__dot"><span className="sr-only">Unread</span></span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
