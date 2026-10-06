import Doodle from '../../components/Doodle.jsx';
import './parts.css';

// `ink: true` flips a card to ink text, for a fill that cannot carry white.
// The accent ramp was cut to six hues and retuned, and at those values white
// clears WCAG AA on none of the six for small text — accent-pink is 3.46:1
// against white, and this card's tab is 10px.
//
// The brand card is white on --accent-pink (#DE5C96) as of 2026-08-31, at the
// owner's request. It was tried on the darker accent-pink-strong first, which
// carries white at 4.84:1 and passes outright, and the owner rejected it as too
// dull. So this is a knowing trade, not an oversight: white on #DE5C96 is
// 3.46:1, which the 20.9px/800 title clears against the 3:1 large-text bar,
// while the 9.5px caps label and the 14.3px body sit 1.04 short of the 4.5 they
// need. The WCAG sweep in tests/e2e names the exemption and the exact figures.
//
// The one lever that would fix the body without touching the colour is weight:
// bold at 14px or larger moves it onto the 3:1 bar, which 3.46 clears. The
// 9.5px label cannot be rescued that way at any weight.
//
// Fixture colours are design-system token NAMES ("violet-600"), never hex.
// A malformed value would otherwise yield an invalid or undefined var() and
// render the card transparent with no error — fail loudly instead.
const TOKEN = /^[a-z][a-z0-9-]*$/;
const fill = (token) => {
  if (!TOKEN.test(token)) {
    throw new Error(`Quest colour "${token}" is not a design-system token name`);
  }
  return `var(--${token})`;
};

// Each quest carries one oversized doodle bleeding off a corner. The design
// gives all three different art and different anchors, so the placement rides
// on the fixture rather than on the card's index.
const MARKS = {
  'sparkle-butter': { top: '-14px', right: '-12px', width: '84px' },
  'circle-violet': { top: '-30px', right: '-40px', width: '160px' },
  'underline-butter': { right: '-30px', bottom: '14px', width: '190px' },
  'arrow-violet': { top: '-18px', right: '-26px', width: '120px' },
  'sparkle-volt': { top: '-10px', right: '-16px', width: '92px' },
  'underline-volt': { right: '-24px', bottom: '18px', width: '170px' },
};

export default function QuestDeck({ quests }) {
  return (
    <div className="qd" data-testid="quest-deck">
      {quests.map((q) => (
        <article
          key={q.title}
          className="qd__card"
          data-ink={q.ink ? 'true' : 'false'}
          style={{ background: fill(q.color) }}
        >
          {q.doodle && MARKS[q.doodle] && (
            <Doodle name={q.doodle} style={{ position: 'absolute', ...MARKS[q.doodle] }} />
          )}
          <p className="qd__tab">{q.tab}</p>
          <h3 className="qd__title">{q.title}</h3>
          <p className="qd__desc">{q.desc}</p>
          <p className="qd__reward">{q.reward}</p>
        </article>
      ))}
    </div>
  );
}
