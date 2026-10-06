import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button, Dialog, StickyNote } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import Avatar from '../Avatar.jsx';
import { cover } from '../parts/cover.js';
import { brandPath } from '../parts/Brands.jsx';
import { useContent } from '../content.jsx';
import { duration, applyBy } from '../parts/when.js';
import DetailTopBar from '../parts/DetailTopBar.jsx';
import ApplySheet from '../parts/ApplySheet.jsx';
import { applicationFor } from '../../lib/apply.js';
import { usd, credit } from '../parts/Money.jsx';
import applications from '../../data/applications.example.json';
import people from '../../data/people.example.json';
import { distanceTo } from '../me.js';
import { useStanding } from '../account.jsx';
import NotFoundPage from '../../pages/NotFoundPage.jsx';
import './gigs-detail.css';

// "45 min" under an hour, "3 hr" over it. The fixture stores hours as a
// number so it can be filtered on; nobody reads 0.75 hr.
const PIPS = [
  { initial: 'J', bg: 'var(--accent-lavender-soft)', fg: 'var(--violet-700)' },
  { initial: 'M', bg: 'var(--accent-blush-soft)', fg: 'var(--ink-900)' },
  { initial: 'S', bg: 'var(--accent-yellow-soft)', fg: 'var(--ink-900)' },
];

export default function GigsDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const { missionBySlug } = useContent();
  const standing = useStanding();
  const m = missionBySlug(slug);
  // A mission above the student's level is readable but not takeable, so the
  // Apply button becomes the distance instead — the same R8 treatment the
  // board's locked tile gets. Since 2026-09-21 the locked tile links here like
  // any other (owner), so this bar is where the gate is said.
  const locked = m && m.minLevel > standing.level ? distanceTo(m.minLevel, standing.xp) : null;
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!m?.slug) return undefined;
    let alive = true;
    applicationFor(m.slug).then((row) => { if (alive && row) setApplied(true); });
    return () => { alive = false; };
  }, [m?.slug]);
  const [goingOpen, setGoingOpen] = useState(false);
  const applyRef = useRef(null);
  const goingRef = useRef(null);

  // Dialog handles focus in, the Tab trap, Escape and focus back to whatever
  // opened it — the same reason the board stopped doing those by hand.
  const closeGoing = useCallback(() => setGoingOpen(false), []);

  const closeApply = useCallback(() => {
    setApplying(false);
    // Return focus to the control that opened the sheet. (Synchronous, not
    // requestAnimationFrame — jsdom's RAF makes the Escape test's
    // toHaveFocus() assertion flaky. Same rule as Nav.jsx's close().)
    // Button (design system) doesn't forward its ref in React 18, so the ref
    // sits on a wrapping span and we reach the real <button> via querySelector.
    applyRef.current?.querySelector('button')?.focus();
  }, []);

  if (!m) {
    // Off the board, but a student applied to it — the tracker links here on
    // purpose, and says nothing about the mission being gone; this page does.
    // A slug no application knows either is a wrong URL, and stays a 404.
    const past = applications.find((x) => x.missionSlug === slug);
    if (!past) return <NotFoundPage bare />;
    return (
      <div className="scr gd gd--ended">
        <div className="gd__top">
          <Link to="/app/me/missions" className="gd__back" aria-label="Back"><span className="gd__chev-l" /></Link>
        </div>
        <p className="gd__caps">{past.brand}</p>
        <h1 className="gd__ended-h1">This mission has ended</h1>
        <p className="gd__prose">
          <b>{past.title}</b> has left the board — expired or taken down. Your application
          and its status still stand in your mission tracker.
        </p>
        {/* The tracker's own route, not /app/join: that redirects to the
            Unlock tab now, so a link that says "mission tracker" was landing
            on the motive page instead (2026-09-18). */}
        <Link to="/app/me/missions" className="gd__ended-back">Back to mission tracker »</Link>
      </div>
    );
  }

  const by = applyBy(m.deadlineOn);

  // Every section open. They used to be an exclusive accordion, which hid two
  // of the three behind a tap and made the brief a thing you had to operate.
  // A section with nothing in it does not render its heading: the console can
  // publish a mission with no steps, perks or training notes yet, and an
  // "Support & training" heading over blank paper reads as a page that failed
  // to load rather than one with nothing to say.
  const section = (title, rows, body) => (rows?.length ? (
    <>
      <h3 className="gd__sec-h">{title}</h3>
      {body}
    </>
  ) : null);

  return (
    <div className="gd">
      {/* The cover is the screen's top edge (owner, 2026-09-09): full-bleed,
          square, no margin above or beside it; Back and Share are fixed over
          it. The tags and the title follow under the photo, as on the event
          page (owner, 2026-09-09, superseding the on-photo blocks). */}
      <div className="gd__cover">
        {/* Square, like the event page's (owner, 2026-09-09); the label and the
            title sit under it, not on it. Its own art, not the tile's ("the
            photo inside should differ from the one outside"); the tile's is
            the fallback. */}
        <ImageSlot label={m.photoLabel} src={cover(m.detailCover ?? m.cover)} ratio="1 / 1" radius={0} />
      </div>
      <DetailTopBar backTo="/app/earn" shareTitle={m.title} />

      <div className="gd__sheet">
        {/* The event page's construction (owner, 2026-09-09): one caps line of
            tags, then the title, under the photo. */}
        <p className="gd__caps">{m.tags.map((t) => t.label).join(' · ')}</p>
        <h1 className="gd__title">{m.title}</h1>

        {/* A small mark and the brand's name, and that is all. The 34px disc
            with the name and the role stacked beside it read as the second
            title on the page. */}
        <div className="gd__host">
          {/* The mark and the name open the brand's page (owner, 2026-09-09),
              which sends you back here. */}
          <Link to={brandPath(m.brandId)} state={{ from: location.pathname }} className="gd__host-link">
            <span className="gd__host-mark" aria-hidden="true">{m.host.name[0].toLowerCase()}</span>
            <span className="gd__host-name">{m.host.name}</span>
          </Link>
        </div>


      <div className="gd__body">
        {/* The terms first (owner, 2026-09-09): deadline, how long, spots — then
            the brief under its own heading. */}
        {/* One fact per line with its glyph (owner, 2026-09-09), the event
            page's construction; who is going sits at the right of Spots — it
            is the same fact from the other side — instead of on the brand line. */}
        <ul className="gd__earn-meta">
          <li className="gd__fact">
            <Icon name="calendar" size={17} className="gd__fact-ico" />
            <span className="gd__earn-lab">Deadline</span>
            <span className="gd__earn-val">{by ?? m.deadline}</span>
          </li>
          {m.hours > 0 && (
          <li className="gd__fact">
            <Icon name="timer" set="app" size={17} className="gd__fact-ico" />
            <span className="gd__earn-lab">Duration</span>
            <span className="gd__earn-val">{duration(m.hours)}</span>
          </li>
          )}
          {m.spots?.total > 0 && (
            <li className="gd__fact">
              <Icon name="user" size={17} className="gd__fact-ico" />
              <span className="gd__earn-lab">Spots</span>
              <span className="gd__earn-val">{m.spots.taken}/{m.spots.total}</span>
              {/* A button, not a caption: it opens the list of who is on this
                  mission. The pips are decorative — three coloured initials
                  standing for however many people — so the count carries the
                  accessible name. */}
              {(m.going ?? []).length > 0 && (
              <button
                type="button"
                className="gd__going"
                ref={goingRef}
                onClick={() => setGoingOpen(true)}
                aria-label={`${m.going.length} going — see who`}
              >
                {PIPS.slice(0, Math.min(3, m.going.length)).map((p) => (
                  <span key={p.initial} className="gd__pip" style={{ background: p.bg, color: p.fg }} aria-hidden="true">{p.initial}</span>
                ))}
              </button>
              )}
            </li>
          )}
        </ul>

        <h2 className="gd__section-label"><span>About the mission</span></h2>
        <p className="gd__prose">{m.desc}</p>


        {section("What you'll do", m.steps, (
          <ol className="gd__steps">
            {m.steps.map((s, i) => (
              <li key={s} className="gd__step">
                <span className="gd__step-n">{i + 1}</span>
                <span className="gd__step-t">{s}</span>
              </li>
            ))}
          </ol>
        ))}

        {section("What's in it for you?", m.perkBullets, (
          <ul className="gd__bullets">
            {m.perkBullets.map((b) => (
              <li key={b.lead} className="gd__bullet">
                <Icon name={b.icon} set="solid" size={17} style={{ color: 'var(--accent-coral)', marginTop: 2 }} />
                <span><strong>{b.lead}</strong> {b.text}</span>
              </li>
            ))}
          </ul>
        ))}

        {section('Support & training', m.support, (
          <>
            {m.support.map((p) => (
              <p key={p} className="gd__prose">{p}</p>
            ))}
          </>
        ))}
      </div>
      </div>

      {/* Takes the tab bar's place, the way the perk page's buy bar does. The
          dock is ONE fixed group, not two independently-positioned elements:
          the note hangs off the bar, so it has to travel with it — the cart
          FAB and the tab bar were briefly separate and drifted apart. */}
      <div className="gd__dock">
        {/* What the mission pays, hung on the bar that applies for it: the two
            decisions a student makes are next to each other, and the figures
            stay on screen through the whole brief instead of scrolling away at
            the top of the sheet. */}
        <div className="gd__earn-wrap">
          {/* No heading: three columns labelled cash, credit and xp say what they
              are, and "You earn" above them was the label of a label. */}
          {/* fold={false}: StickyNote dog-ears its bottom-right corner by
              default (a clip-path), and on a wide, short note docked against
              the bar the cut clipped the xp column's own corner.

              The padding rides the component's own `style` prop rather than an
              .ax-note rule in gigs-detail.css: PRODUCT.md Principle 5 forbids
              an app stylesheet reaching into a design-system component, and a
              class here would lose the cascade race anyway — the DS injects
              its <style> at JS time, after the app bundle. The note's 18/16
              default is sized for a paragraph of body copy; this one holds one
              row of figures and sits under the thumb. */}
          {/* The tape at the note's right end (owner, 2026-09-09). StickyNote's own
              `tape` is fixed at the centre and the system exposes no placement,
              so the note is untaped and the strip is the app's, drawn to the
              system's measure (62x18, its white and keyline) beside it. */}
          <div className="gd__note">
          <span className="gd__note-tape" aria-hidden="true" />
          {/* 22px at the foot, not 12: the bar overlaps the note's bottom 10px,
              so 12px of paper has to show ABOVE the bar for the ink to sit as
              far from it as from the top (owner, 2026-09-09, twice). */}
          <StickyNote tint="lavender" tape={false} tilt={0} fold={false} style={{ padding: '12px 14px 22px' }}>
            {/* Three columns, as drawn: cash, credit, XP. The credit column's
                sublabel used to carry the shop value ("credit · $80 in shop")
                because money rule R1 does not let a credit figure stand alone.
                The owner asked for it off this screen; the wallet, the cart and
                the gift sheet all still spell it out. */}
            {/* Label over figure, as asked. The three read as a row of
                headed columns rather than three numbers with footnotes. */}
            <div className="gd__earn-grid" data-testid="earn">
              <div>
                <div className="gd__earn-lab">cash</div>
                <div className="gd__earn-fig">{usd(m.payUsd)}</div>
              </div>
              <div>
                <div className="gd__earn-lab">credit</div>
                <div className="gd__earn-fig">+{m.creditPts.toLocaleString('en-US')}</div>
              </div>
              <div>
                <div className="gd__earn-lab">xp</div>
                <div className="gd__earn-fig">+{m.xp.toLocaleString('en-US')}</div>
              </div>
            </div>
          </StickyNote>
          </div>
        </div>

        {/* The deadline on the left, the action on the right. A locked mission
            keeps the bar and shows the distance instead of Apply — since
            2026-09-21 its tile opens this page like any other (owner), and this
            bar is where "not yet" is said (R8). */}
        <div className="gd__bar" data-testid="apply-bar">
          <span className="gd__bar-when">
            <span className="gd__bar-lab">{by ? 'Apply by' : 'Applications'}</span>
            <span className="gd__bar-fig">{by ?? 'Open until it fills'}</span>
          </span>
          {locked ? (
            <p className="gd__locked">
              <Icon name="crown" set="solid" size={13} />
              LV.{m.minLevel} · {locked.xpAway.toLocaleString('en-US')} XP away
            </p>
          ) : (
            <span ref={applyRef} className="gd__bar-act">
              <Button
                variant="primary"
                size="md"
                fullWidth
                className="gd__bar-btn"
                disabled={applied}
                onClick={() => setApplying(true)}
              >
                {applied ? 'Applied' : 'Apply'}
              </Button>
            </span>
          )}
        </div>
      </div>

      {/* Who is on it. Handles in the fixture, people resolved here, so a
          student's name and campus are written down once. */}
      <Dialog
        open={goingOpen}
        onClose={closeGoing}
        title={`${m.spots?.taken ?? 0} going`}
        aria-label="Who is going"
      >
        <ul className="gd__crew">
          {(m.going ?? []).map((handle) => {
            const person = people.find((x) => x.handle === handle);
            if (!person) return null;
            return (
              <li key={handle}>
                {/* A link, not a row with a handler: it goes to a real page and
                    reads as navigation to assistive tech. */}
                <Link to={`/u/${handle}`} className="gd__crew-row" data-testid="crew-row">
                  <span className="gd__crew-photo"><Avatar name={person.name} size={40} /></span>
                  <span className="gd__crew-who">
                    <span className="gd__crew-name">{person.name}</span>
                    <span className="gd__crew-campus">{person.campus}</span>
                  </span>
                  <span className="gd__crew-chev" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Dialog>

      <ApplySheet
        open={applying}
        onClose={closeApply}
        missionTitle={m.title}
        gigId={m.slug}
        onSent={() => setApplied(true)}
      />
    </div>
  );
}
