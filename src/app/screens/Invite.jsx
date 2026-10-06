import { useEffect, useMemo, useState } from 'react';
import { Button } from 'axelerate-design-system';
import Doodle from '../../components/Doodle.jsx';
import SubScreen from '../parts/SubScreen.jsx';
import { isLiveBackend } from '../../lib/supabase.js';
import { loadInvite, saveInviteCode } from '../../lib/invite.js';

import hub from '../../data/hub.example.json';
import people from '../../data/people.example.json';
import './me-hub.css';

const BY_HANDLE = new Map(people.map((p) => [p.handle, p]));

// Aug 18 from an ISO date, the same shape the applications screen uses.
const on = (iso) => {
  const raw = String(iso ?? '');
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Invite() {
  const { perInvite, perInviteCredits, steps } = hub.invite;
  const live = isLiveBackend();
  const [pack, setPack] = useState(null);
  const [copied, setCopied] = useState(null);
  const [entered, setEntered] = useState('');
  const [applied, setApplied] = useState(null);
  const [applyError, setApplyError] = useState('');
  const [applyBusy, setApplyBusy] = useState(false);

  useEffect(() => {
    if (!live) return undefined;
    let alive = true;
    loadInvite().then((row) => { if (alive) setPack(row); });
    return () => { alive = false; };
  }, [live]);

  const pending = live && !pack;
  const code = live ? (pack?.code || '') : hub.invite.code;
  const friends = live ? (pack?.friends ?? []) : hub.invite.friends;

  // Only a friend who has cleared their first mission has paid out; the rest
  // are still pending, which is what the list says next to them.
  const earnedPts = useMemo(
    () => (live
      ? friends.reduce((n, f) => n + (f.status === 'earned' ? (f.credits || 0) : 0), 0)
      : friends.filter((f) => f.status === 'earned').length * perInviteCredits),
    [friends, live, perInviteCredits],
  );

  // One handler for both buttons: what is written differs, the failure does
  // not. Clipboard is unavailable in some contexts (no permission, insecure
  // origin), and the button says nothing rather than claim a copy that never
  // happened.
  const put = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied(null);
    }
  };

  const link = `${globalThis.location?.origin ?? ''}/?ref=${encodeURIComponent(code)}`;

  const share = async () => {
    // The platform sheet where there is one, the clipboard where there is not.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Axelerate', text: `Join me on Axelerate — my code is ${code}`, url: link });
        setCopied('link');
        return;
      } catch {
        // A dismissed share sheet is not a failure to report.
        return;
      }
    }
    put('link', link);
  };

  const apply = async (e) => {
    e.preventDefault();
    const v = entered.trim();
    if (!v || applyBusy) return;
    setApplyError('');
    if (!live) {
      setApplied(v.toUpperCase() === code.toUpperCase() ? 'own' : 'ok');
      return;
    }
    setApplyBusy(true);
    try {
      const result = await saveInviteCode(v);
      if (result?.code === 'own') setApplied('own');
      else if (result?.ok) setApplied('saved');
      else {
        setApplied('error');
        setApplyError(result?.error || 'The code was not saved.');
      }
    } catch (err) {
      setApplied('error');
      setApplyError(err?.message || 'The code was not saved.');
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <SubScreen band="coral" title="Invite friends" note={`+${perInvite} XP each`}>
      {/* As drawn: a dashed ticket rather than a filled card, everything on the
          centre line, the code in ink, the count in the margin voice, and one
          small sparkle bled off the top-right corner. */}
      <div className="inv__code">
        <Doodle name="sparkle-volt" className="inv__code-mark" style={{ width: 44 }} />
        <p className="inv__code-lab">your invite code</p>
        <p className="inv__code-value">{pending ? '…' : (code || '—')}</p>
        {/* Two ways out: the code on its own, for typing into a form, and the
            link, for a message. Share uses the platform sheet where there is
            one and falls back to the clipboard where there is not. */}
        <div className="inv__acts">
          <Button variant="yellow" size="md" onClick={() => put('code', code)} className="inv__copy" disabled={!code}>
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </Button>
          <Button variant="secondary" size="md" onClick={share} className="inv__share" disabled={!code}>
            {copied === 'link' ? 'Link copied' : 'Share link'}
          </Button>
        </div>
        {/* "N codes a semester — spend them well" sat here until 2026-09-08 (owner).
            The count still shows where it earns its place: "Who used it · N of total". */}
      </div>

      {/* What the code has actually paid. The figure alone (owner, 2026-09-09):
          the "$N in shop" half of R1's string and the "from N of M who used
          it" line both came off; the list below still shows who paid. */}
      <h2 className="sub__label">Earned so far</h2>
      <div className="inv__earned">
        <span className="inv__earned-fig">{pending ? '…' : `${earnedPts.toLocaleString('en-US')} credit`}</span>
      </div>

      <h2 className="sub__label">How it works</h2>
      <ol className="inv__steps">
        {steps.map((s, i) => (
          <li key={s}><span className="inv__step-n">{i + 1}</span>{s}</li>
        ))}
      </ol>

      {/* Who is in. A pending row is the honest state for a friend who has
          joined but not cleared a mission yet — the payout is theirs to
          trigger, not yours. */}
      <h2 className="sub__label">Who used it</h2>
      {friends.length === 0
        ? <p className="inv__enter-note">{pending ? '…' : 'Nobody has used your code yet.'}</p>
        : (
          <ul className="inv__friends">
            {friends.map((f) => {
              const p = BY_HANDLE.get(f.handle);
              const name = f.name || p?.name || f.handle;
              const fig = f.status === 'earned'
                ? `+${(live ? f.credits : perInviteCredits).toLocaleString('en-US')} credit`
                : f.status === 'held' ? 'held' : 'pending';
              return (
                <li key={f.id || f.handle} className="inv__friend" data-testid="invite-friend">
                  <span className="inv__friend-mark">{name[0]}</span>
                  <span className="inv__friend-who">
                    <span className="inv__friend-name">{name}</span>
                    <span className="inv__friend-meta">joined {on(f.on)}</span>
                  </span>
                  <span className={`inv__friend-fig${f.status === 'earned' ? '' : ' inv__friend-fig--wait'}`}>
                    {fig}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

      {/* The other direction: somebody else's code. Session only, and it says
          so — the same promise the apply sheet and the seat CTA make. */}
      <h2 className="sub__label">Have a code?</h2>
      <form className="inv__enter" onSubmit={apply}>
        <label className="sr-only" htmlFor="inv-code">A friend&rsquo;s invite code</label>
        <input
          id="inv-code"
          className="inv__enter-input"
          type="text"
          autoComplete="off"
          spellCheck="false"
          placeholder="FRIEND-24"
          value={entered}
          onChange={(e) => setEntered(e.target.value)}
        />
        <Button variant="primary" size="md" className="inv__enter-go" disabled={!entered.trim() || applyBusy}>
          {applyBusy ? 'Saving…' : 'Apply'}
        </Button>
      </form>
      <p className="inv__enter-note" role="status">
        {applied === 'own' && 'That is your own code. Ask a friend for theirs.'}
        {applied === 'ok' && 'Saved for launch. Nothing was sent, and codes pay out once your first mission clears.'}
        {applied === 'saved' && 'Saved. Your balance is unchanged until their first mission is marked complete.'}
        {applied === 'error' && applyError}
      </p>
    </SubScreen>
  );
}
