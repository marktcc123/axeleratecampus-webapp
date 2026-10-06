import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ImageSlot from '../ImageSlot.jsx';
import Icon from '../../components/Icon.jsx';
import people from '../../data/people.example.json';
// Every .gg__* rule lives in the event detail sheet, which is the only screen
// this grid has so far. Declared here anyway, the way ApplySheet declares
// gigs-detail.css, so a second caller cannot render it unstyled.
import '../screens/event-detail.css';

// Who is going. Handles rather than embedded people, so one person can appear
// on several events without their name and level being copied into each.
//
// Six then the rest in place: the lists here are short enough that a second
// route for them would be ceremony.
const SHOWN = 6;

export default function GuestGrid({ handles }) {
  const [all, setAll] = useState(false);
  const gridRef = useRef(null);
  const guests = handles
    .map((h) => people.find((p) => p.handle === h))
    .filter(Boolean);
  const shown = all ? guests : guests.slice(0, SHOWN);

  // "See all N" unmounts itself the instant it's clicked, so without this the
  // reveal drops focus to <body>. Move it to the first tile that was not
  // already on screen — same shape as ApplySheet's own-content effect below,
  // guarded on `all` so it never fires on first mount. Not
  // requestAnimationFrame: jsdom's RAF makes toHaveFocus() assertions flaky.
  useEffect(() => {
    if (!all) return;
    gridRef.current?.querySelectorAll('[data-testid="guest"]')[SHOWN]?.focus();
  }, [all]);

  if (!guests.length) return null;

  return (
    <div className="gg">
      <ul className="gg__grid" ref={gridRef}>
        {shown.map((p) => (
          <li key={p.handle}>
            {/* A link, not a card with a click handler: it opens in a new tab
                and reads as navigation to assistive tech. Icon hardcodes
                aria-hidden before any props spread onto it, so an aria-label
                placed there is inert — the verified tick is paired with a
                sr-only span instead, the same pattern PublicProfile.jsx and
                Me.jsx already established, so the mark is not colour alone. */}
            <Link to={`/u/${p.handle}`} className="gg__tile" data-testid="guest">
              <span className="gg__photo"><ImageSlot label={p.name} radius={12} /></span>
              <span className="gg__name">
                {p.name}
                {p.verified && (
                  <>
                    <Icon name="tick-2" size={13} className="gg__tick" />
                    <span className="sr-only">Verified student</span>
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!all && guests.length > SHOWN && (
        <button type="button" className="gg__more" onClick={() => setAll(true)}>
          See all {guests.length}
        </button>
      )}
    </div>
  );
}
