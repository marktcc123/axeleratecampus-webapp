import { Link } from 'react-router-dom';
import { ScreenHeader } from 'axelerate-design-system';
import Doodle from '../../components/Doodle.jsx';
import Icon from '../../components/Icon.jsx';
import './sub-screen.css';

// The design draws Me's sub-screens in two families. Five of them put the
// header on a full-bleed colour band with a doodle in the top corner and an
// icon watermarked into the opposite one; the rest sit on plain white. `band`
// picks the family, and its palette lives in sub-screen.css next to the
// --sh-* overrides that recolour ScreenHeader for a dark ground.
//
// Each band's watermark is the screen's own subject, which is why it is a
// prop of the band and not a fixed decoration.
const BANDS = {
  lavender: { doodle: 'underline-butter', width: 190, rotate: -10, mark: 'star' },
  yellow: { doodle: 'circle-violet', width: 150, rotate: -8, mark: 'flag-line' },
  violet: { doodle: 'sparkle-butter', width: 130, rotate: 12, mark: 'calendar' },
  coral: { doodle: null, width: 126, rotate: 16, mark: 'user' },
  // No arrow doodle (owner, 2026-09-09); the rocket sits where the arrow was,
  // top right, in a deeper pink (sub-screen.css).
  blush: { doodle: null, width: 140, rotate: 10, mark: 'rocket' },
  // The sixth family, for My orders (owner, 2026-09-09: the one accent no
  // sub-screen had used). The bag is the shop's own mark.
  pink: { doodle: null, width: 126, rotate: -12, mark: 'bag-line' },
  // My wallet (owner, 2026-09-09): the last accent, and the app's own wallet
  // glyph — the system set has none.
  orange: { doodle: null, width: 126, rotate: 10, mark: 'wallet', markSet: 'app' },
  // The eighth band, for the Mission tracker (owner, 2026-09-21: "give it a
  // header"). The seven accents were each spoken for by a sub-screen, so this
  // one is ink: the tracker is the student's record, and a dark ground is the
  // one field none of the others stand on. The checklist is the tracker's own
  // mark, the one its row wears everywhere it is offered.
  ink: { doodle: 'underline-volt', width: 170, rotate: -8, mark: 'checklist' },
};

// `back` and `kicker` default to Me's: the brand page under the board passes
// its own (owner, 2026-09-09).
//
// `compact` (owner, 2026-09-21, for Settings): one row — the back control at
// the left, the title centred on the same line, no kicker and no second line.
// The owner's words were that the stacked header read as "an arrow, a Me, then
// a Profile setting", and that a settings page should not feel like a place
// you went back from. Drawn here in the app's own classes rather than by
// restyling ScreenHeader, whose row is the two-line one on purpose. The
// chevron is the system's geometry (a 9px square, two 2px sides, turned 45°)
// so the two headers' backs are the same mark.
export default function SubScreen({ title, note, lede, action, band, back, kicker, compact = false, children }) {
  if (compact) {
    return (
      <div className="sub sub--compact">
        <div className="sub__bar">
          <Link
            to={back?.to ?? '/app/me'}
            className="sub__bar-back"
            aria-label={back?.label ?? 'Back'}
            {...(back?.state ? { state: back.state } : {})}
          >
            <span className="sub__bar-chev" aria-hidden="true" />
          </Link>
          <h1 className="sub__bar-h1"><span className="sub__title">{title}</span></h1>
          {/* The same width as the back control, so the title is centred on
              the row and not on what is left of it. */}
          <span className="sub__bar-end" aria-hidden="true">{action}</span>
        </div>
        {children}
      </div>
    );
  }

  const header = (
    <ScreenHeader
      back={{ as: Link, to: back?.to ?? '/app/me', label: back?.label ?? 'Back to me', ...(back?.state ? { state: back.state } : {}) }}
      kicker={band ? undefined : (kicker ?? 'Me')}
      // Wrapped, for the same reason the wordmark is a node: ScreenHeader takes
      // a ReactNode title and exposes --sh-ink for its colour but nothing for
      // its size, and app CSS may not name .ax-screenhead__h1.
      title={<span className="sub__title">{title}</span>}
      note={note}
      lede={band ? undefined : lede}
      action={action}
    />
  );

  if (!band) {
    return (
      <div className="sub">
        {header}
        {children}
      </div>
    );
  }

  const b = BANDS[band];
  return (
    <div className="sub sub--banded">
      <div className={`sub__band sub__band--${band}`}>
        {/* A band may carry no doodle — coral does not, since its three volt
            strokes were the thing being asked about. */}
        {b.doodle && (
          <Doodle
            name={b.doodle}
            className="sub__band-doodle"
            style={{ width: b.width, transform: `rotate(${b.rotate}deg)` }}
          />
        )}
        <Icon name={b.mark} set={b.markSet} size={150} className="sub__band-mark" />
        <div className="sub__band-inner">{header}</div>
      </div>
      <div className="sub__body">
        {lede && <p className="sub__lede">{lede}</p>}
        {children}
      </div>
    </div>
  );
}
