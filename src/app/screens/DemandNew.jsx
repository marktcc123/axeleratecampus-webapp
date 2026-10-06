import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MATTERS, TIMEFRAMES, READINESS } from '../../lib/demand.js';
import { useDemand } from '../demand.jsx';
import { useRequireAccount } from '../require-account.js';
import './demand.css';

const LAST = 5;
const MAX_MUST_HAVE = 3;

export default function DemandNew() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { submitSignal, join, openOwn, matchDraft } = useDemand();
  const requireAccount = useRequireAccount();

  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState(state?.rawText ?? '');
  const [mustHave, setMustHave] = useState([]);
  const [niceToHave, setNiceToHave] = useState([]);
  const [maxBudget, setMaxBudget] = useState('');
  const [timeframe, setTimeframe] = useState('2weeks');
  const [readiness, setReadiness] = useState('interested');
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  const draft = useMemo(() => ({
    rawText,
    maxBudget: maxBudget ? Number(maxBudget) : null,
    timeframe,
    mustHave,
    matters: niceToHave,
    readiness,
  }), [rawText, maxBudget, timeframe, mustHave, niceToHave, readiness]);

  const preview = useMemo(
    () => (rawText.trim().length > 8 ? matchDraft({ rawText, maxBudget: maxBudget ? Number(maxBudget) : null }) : null),
    [rawText, maxBudget, matchDraft],
  );

  const toggleMust = (c) => setMustHave((cur) => {
    if (cur.includes(c)) return cur.filter((x) => x !== c);
    if (cur.length >= MAX_MUST_HAVE) return cur;
    return [...cur, c];
  });
  const toggleNice = (c) => setNiceToHave((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  // Clustering happens before anything is written, so the answer to "has
  // anyone else asked for this?" arrives before we decide what to create.
  const finish = () => {
    const result = submitSignal(draft);
    if (result.error) { setError(result.message); return; }
    setError(null);
    setDone({ signal: result.signal, match: result.match, choice: null });
    setStep(LAST);
  };

  // Join the cluster we found.
  const acceptMatch = () => requireAccount(() => {
    const { participation } = join(done.match.id, {
      readiness,
      budget: draft.maxBudget,
      timeframeId: timeframe,
      mustHave,
      signalId: done.signal.id,
    });
    nav(`/app/demand/${done.match.id}`, { state: { joined: Boolean(participation) } });
  }, {
    intent: 'Save your request so we can group it with similar demand and tell you when brands respond.',
    next: '/app/demand/new',
  });

  // The escape hatch. A near-match that isn't a match is worse than no match:
  // it buries a distinct requirement inside an average and the brand answers
  // the wrong brief. So "my needs are different" opens a separate request
  // rather than arguing with them.
  const openSeparately = () => requireAccount(() => {
    const opened = openOwn(done.signal, { asHypothesis: readiness === 'exploring' });
    setDone((d) => ({ ...d, choice: 'own', cluster: opened }));
  }, {
    intent: 'Save your request so we can tell you when similar demand grows.',
    next: '/app/demand/new',
  });

  const next = () => {
    if (step === 4) finish();
    else setStep((s) => s + 1);
  };

  const noMatch = done && !done.match;
  const opened = done?.cluster;

  return (
    <div className="dn" data-testid="demand-new">
      <div className="dn__top">
        <ol className="dn__pips" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className="dn__pip" data-on={n <= step ? '' : undefined} />
          ))}
        </ol>
        <p className="sr-only" role="status">{`Step ${step} of ${LAST}`}</p>
        <Link to="/app" className="dn__skip">Close</Link>
      </div>

      <div className="dn__body">
        {step === 1 && (
          <>
            <h1 className="dn__h1">What are you looking for?</h1>
            <p className="dn__lede">A sentence is enough. We&rsquo;ll group similar demand from there.</p>
            <textarea
              className="dn__area"
              rows={5}
              value={rawText}
              onChange={(e) => { setRawText(e.target.value); setError(null); }}
              placeholder="I’m looking for a lightweight Korean sunscreen under $25 that doesn’t leave a white cast and works for dry skin."
              data-testid="demand-new-text"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="dn__h1">What must a brand get right?</h1>
            <p className="dn__lede">Up to {MAX_MUST_HAVE}. These are matched strictly — an offer that misses one says so.</p>
            <div className="dn__chips" data-testid="must-have">
              {MATTERS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="dn__chip"
                  aria-pressed={mustHave.includes(c)}
                  disabled={!mustHave.includes(c) && mustHave.length >= MAX_MUST_HAVE}
                  onClick={() => toggleMust(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="dn__lede dn__lede--tight">Nice to have</p>
            <div className="dn__chips" data-testid="nice-to-have">
              {MATTERS.filter((c) => !mustHave.includes(c)).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="dn__chip"
                  aria-pressed={niceToHave.includes(c)}
                  onClick={() => toggleNice(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="dn__h1">What&rsquo;s your maximum budget?</h1>
            <p className="dn__lede">Optional. It decides which offers are shown to you as in budget.</p>
            <label className="dn__budget">
              <span>$</span>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="25"
              />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="dn__h1">When are you likely to buy?</h1>
            <p className="dn__lede">Your request stays live for this long, then we check in.</p>
            <ul className="dn__choices">
              {TIMEFRAMES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="dn__choice"
                    aria-pressed={timeframe === t.id}
                    onClick={() => setTimeframe(t.id)}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="dn__lede dn__lede--tight">And how ready are you?</p>
            <ul className="dn__choices">
              {READINESS.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="dn__choice"
                    aria-pressed={readiness === r.id}
                    onClick={() => setReadiness(r.id)}
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === LAST && done && opened && (
          <>
            <h1 className="dn__h1">Demand submitted.</h1>
            <p className="dn__lede">
              It&rsquo;s on its own now. We&rsquo;ll group it with similar requests as they arrive, and
              tell you when it&rsquo;s big enough for brands to answer.
            </p>
            <p className="dn__need">{opened.normalizedNeed}</p>
            <button type="button" className="dn__next" onClick={() => nav(`/app/demand/${opened.id}`)}>
              Track my request <span aria-hidden="true">&rarr;</span>
            </button>
          </>
        )}

        {step === LAST && done && !opened && done.match && (
          <>
            <h1 className="dn__h1">You&rsquo;re not alone.</h1>
            <p className="dn__lede">
              <b data-testid="match-count">{done.match.counts.qualified}</b> people have asked for
              something close to this.
            </p>
            <p className="dn__need">{done.match.normalizedNeed}</p>
            <ul className="dn__reqs">
              {done.match.commonRequirements.slice(0, 3).map((r) => <li key={r}>{r}</li>)}
            </ul>
            <button type="button" className="dn__next" onClick={acceptMatch} data-testid="accept-match">
              Join existing demand <span aria-hidden="true">&rarr;</span>
            </button>
            <button type="button" className="dn__alt" onClick={openSeparately} data-testid="needs-differ">
              My needs are different
            </button>
          </>
        )}

        {step === LAST && noMatch && !opened && (
          <>
            <h1 className="dn__h1">Nobody has asked for this yet.</h1>
            <p className="dn__lede">
              That&rsquo;s useful on its own — it&rsquo;s how a new market starts. Save it and we&rsquo;ll
              watch for people who want the same thing.
            </p>
            <p className="dn__need">{rawText}</p>
            <button type="button" className="dn__next" onClick={openSeparately} data-testid="open-own">
              Submit my demand <span aria-hidden="true">&rarr;</span>
            </button>
          </>
        )}
      </div>

      {error && <p className="dn__error" role="alert" data-testid="demand-error">{error}</p>}

      {step < LAST && (
        <div className="dn__foot">
          <button
            type="button"
            className="dn__next"
            onClick={next}
            disabled={step === 1 && rawText.trim().length < 8}
          >
            {step === 4 ? 'See who else wants this' : 'Next'} <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      )}

      {step < LAST && preview && (
        <p className="dn__hint" data-testid="demand-preview">
          {preview.counts.joined} people already want something similar.
        </p>
      )}
    </div>
  );
}
