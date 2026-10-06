import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import Avatar from '../Avatar.jsx';
import AppHeader from '../AppHeader.jsx';
import applications from '../../data/applications.example.json';
import { useProfile } from '../profile.jsx';
import { useDemand } from '../demand.jsx';
import { statusLabel } from '../../lib/demand.js';
import './me-hub.css';
import './screens.css';
import './demand.css';

export function experience(list = applications) {
  const done = list.filter((a) => a.status === 'paid');
  const rows = new Map();
  for (const a of done) rows.set(a.brand, { brand: a.brand, n: (rows.get(a.brand)?.n ?? 0) + 1 });
  return { done: done.length, rows: [...rows.values()] };
}

export default function Me() {
  const { name, displayName, avatarUrl, publicHandle, campus } = useProfile();
  const { clusters, signals, offersFor, hypotheses, pendingConfirmations } = useDemand();
  const mine = clusters.filter((c) => c.joined || c.mine);
  const matches = mine.flatMap((c) => offersFor(c.id).map((o) => ({ ...o, clusterId: c.id })));
  const publicPath = `/u/${publicHandle}`;

  return (
    <div className="scr hub">
      <AppHeader />

      <div className="hub__id">
        <Avatar className="hub__avatar" name={displayName} src={avatarUrl} size={64} data-testid="me-avatar" />
        <div className="hub__who">
          <h1 className="hub__name">{name || 'Your name'}</h1>
          <p className="hub__school">
            <span>{campus || 'Your requests, in one place'}</span>
          </p>
          <Link to={publicPath} className="hub__public" data-testid="view-public">
            View public profile <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      <dl className="hub__stats" data-testid="me-stats">
        <div className="hub__stat"><dd>{mine.length || signals.length}</dd><dt>Demand</dt></div>
        <div className="hub__stat"><dd>{matches.length}</dd><dt>Matches</dt></div>
        <div className="hub__stat"><dd>{hypotheses.length}</dd><dt>Scouted</dt></div>
      </dl>

      <div className="hub__panel">
        <section className="hub__sec" aria-labelledby="myd-h">
          <div className="hub__sec-top">
            <h2 className="hub__h2" id="myd-h">My Demand</h2>
            <Link to="/app/me/demand" className="hub__viewall">View all</Link>
          </div>
          {mine.length === 0 ? (
            <p className="hub__none">Tell us what you want next. Similar demand gathers here.</p>
          ) : (
            <ul className="hub__exp">
              {mine.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link to={`/app/demand/${c.id}`} className="hub__exp-row">
                    <div className="hub__exp-who">
                      <p className="hub__exp-name">{c.normalizedNeed}</p>
                      <p className="hub__exp-meta">{statusLabel(c.status)} · {c.counts?.joined ?? c.participantCount} joined</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/app/demand/new" className="hub__paper hub__push" data-testid="me-push">
            <span className="hub__push-t">Start from a sentence. Brands respond when the demand is real.</span>
            <span className="hub__push-go">Open a Demand</span>
            <Icon name="arrow-right" size={22} className="hub__push-arrow" />
          </Link>
        </section>

        <section className="hub__sec" aria-labelledby="mat-h">
          <h2 className="hub__h2" id="mat-h">My Matches</h2>
          {matches.length === 0
            ? <p className="hub__none">Offers matched to your demand appear here.</p>
            : (
              <ul className="hub__exp">
                {matches.slice(0, 3).map((o) => (
                  <li key={o.id}>
                    <Link to={`/app/demand/${o.clusterId}`} className="hub__exp-row">
                      <div className="hub__exp-who">
                        <p className="hub__exp-name">{o.product}</p>
                        <p className="hub__exp-meta">{o.brand} · {o.label}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section className="hub__sec" aria-labelledby="buy-h">
          <h2 className="hub__h2" id="buy-h">Purchases</h2>
          {pendingConfirmations.length === 0 ? (
            <p className="hub__none">When you buy from a brand, we’ll ask if it matched what you asked for. Axelerate doesn’t hold the payment.</p>
          ) : (
            <ul className="hub__exp">
              {pendingConfirmations.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link to={`/app/demand/${a.clusterId}`} className="hub__exp-row">
                    <div className="hub__exp-who">
                      <p className="hub__exp-name">Did you purchase this?</p>
                      <p className="hub__exp-meta">Waiting on your confirmation</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {hypotheses.length > 0 && (
          <section className="hub__sec" aria-labelledby="scout-h">
            <h2 className="hub__h2" id="scout-h">Scout Activity</h2>
            <ul className="hub__exp">
              {hypotheses.map((h) => (
                <li key={h.id} className="hub__exp-row">
                  <div className="hub__exp-who">
                    <p className="hub__exp-name">{h.text}</p>
                    <p className="hub__exp-meta">Originator</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
