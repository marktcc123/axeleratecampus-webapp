import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../session.jsx';
import { useProfile } from '../profile.jsx';
import './demand.css';

// The smallest account that can carry demand.
//
// It exists because an anonymous signal cannot be weighted, renewed or told
// that a brand answered — not because we want the data. So it asks for a first
// name and an email, offers two optional fields that genuinely sharpen a
// match, and stops. No school, no phone, no address, no gender, no income.
//
// The other half of the contract is the return. Someone presses "Join this
// demand", gets asked to sign up, and must land back on that demand with the
// join completed — not on a dashboard they did not ask for. `next` carries the
// address and `intent` carries the sentence that explains why we interrupted.

const AGE_RANGES = ['Under 18', '18–24', '25–34', '35–44', '45+'];

export default function JoinAccount() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { state } = useLocation();
  const { signUp } = useSession();
  const { setProfile } = useProfile();

  const next = state?.next ?? params.get('next') ?? '/app';
  const intent = state?.intent ?? null;

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [ageRange, setAgeRange] = useState(null);
  const [region, setRegion] = useState('');
  const [error, setError] = useState(null);

  const submit = (provider) => (e) => {
    if (e) e.preventDefault();
    const name = firstName.trim();
    if (!name) { setError('A first name is enough — we use it to address you.'); return; }
    if (provider === 'email' && !/.+@.+\..+/.test(email.trim())) {
      setError('That email doesn’t look right.');
      return;
    }
    const user = signUp({
      firstName: name,
      email: provider === 'email' ? email.trim() : `${name.toLowerCase()}@${provider}.demo`,
      provider,
      ageRange,
      region: region.trim() || null,
    });
    // The existing profile layer still owns the display name and the avatar;
    // this writes through to it rather than starting a second identity.
    setProfile({ name: user.firstName, email: user.email });
    nav(next, { replace: true, state: { justJoined: true } });
  };

  return (
    <div className="jn" data-testid="join-account">
      <header className="jn__head">
        <p className="dm__kicker">Create your account</p>
        <h1 className="dn__h1">Save your request.</h1>
        <p className="dn__lede">
          {intent ?? 'An account lets us group your request with similar demand and tell you when brands respond.'}
        </p>
      </header>

      <form className="jn__form" onSubmit={submit('email')}>
        <label className="jn__field">
          <span className="jn__label">First name</span>
          <input
            className="jn__input"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); setError(null); }}
            autoComplete="given-name"
            data-testid="join-firstname"
          />
        </label>

        <label className="jn__field">
          <span className="jn__label">Email</span>
          <input
            className="jn__input"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            autoComplete="email"
            data-testid="join-email"
          />
        </label>

        <fieldset className="jn__fieldset">
          <legend className="jn__label">Age range <span className="jn__opt">optional</span></legend>
          <div className="dn__chips">
            {AGE_RANGES.map((a) => (
              <button
                key={a}
                type="button"
                className="dn__chip"
                aria-pressed={ageRange === a}
                onClick={() => setAgeRange(ageRange === a ? null : a)}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="jn__field">
          <span className="jn__label">City <span className="jn__opt">optional</span></span>
          <input
            className="jn__input"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Only used where delivery or availability depends on it"
            autoComplete="address-level2"
          />
        </label>

        {error && <p className="jn__error" role="alert">{error}</p>}

        <button type="submit" className="dn__next" data-testid="join-submit">
          Continue <span aria-hidden="true">&rarr;</span>
        </button>
      </form>

      <div className="jn__alt">
        <p className="jn__or">or</p>
        <button type="button" className="ax-btn ax-btn--secondary ax-btn--full" onClick={submit('google')}>
          Continue with Google
        </button>
        <button type="button" className="ax-btn ax-btn--secondary ax-btn--full" onClick={submit('apple')}>
          Continue with Apple
        </button>
        <p className="jn__fine">
          Demo sign-in. Brands never see your name, email or address — only
          aggregated demand. <Link to="/app/me/about">How this works</Link>
        </p>
      </div>
    </div>
  );
}
