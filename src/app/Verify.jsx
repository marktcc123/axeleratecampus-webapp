import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Input } from 'axelerate-design-system';
import Icon from '../components/Icon.jsx';
import Avatar from './Avatar.jsx';
import AvatarPicker from './parts/AvatarPicker.jsx';
import Logo from '../components/Logo.jsx';
import { isSignInEmail, isSixDigits, submitJoin, submitLogin, verifyCode } from '../lib/join.js';
import { isLiveBackend } from '../lib/supabase.js';
import { useProfile } from './profile.jsx';
import './verify.css';

// One screen, three doors. `mode` is the route's: /verify is sign-up and asks
// for a photo, a name and a school email; /login is the returning student's
// door and asks for the email alone — the name and the photo are already on
// file; /login/code is where "Send email" lands, and asks for the six digits
// the email carried. The stamp illustration that used to head the two doors
// became the student's own avatar (owner, 2026-09-08): the disc sign-up fills
// is the disc log-in shows back.
//
// The heading and the button change with the mode so the screen says which
// door you came through. What it does not do is authenticate: there is no
// backend, so a valid .edu and any six digits open the app.
const COPY = {
  // Sign-up draws no masthead (owner, 2026-09-08): the stamp, the heading,
  // the aside and the lede all came off, and the form is the page. The h1 is
  // kept for the landmark and the tests, visually hidden.
  signup: {
    h1: 'Sign up',
    bare: true,
    cta: 'Get verified »',
  },
  // Owner, 2026-09-08: no aside, one sentence, and the button names the thing
  // it does — an email goes out; nothing is "logged in" on this screen.
  login: {
    h1: 'Welcome back',
    lede: 'We’ll send the link for you to log in.',
    cta: 'Send email »',
  },
  code: {
    h1: 'Check your email',
    cta: 'Log in »',
  },
};

export default function Verify({ mode = 'signup' }) {
  const signup = mode === 'signup';
  const codeStep = mode === 'code';
  const copy = COPY[mode] ?? COPY.signup;
  const location = useLocation();
  // The address "Send email" was pressed with, carried in router state. A cold
  // visit to /login/code has none, and a code page for nobody is a dead end.
  const sentTo = location.state?.email ?? '';
  const sentKind = location.state?.kind ?? 'login';
  const [code, setCode] = useState('');
  const [resent, setResent] = useState(false);

  const [form, setForm] = useState({ name: '', email: '' });
  const [avatar, setAvatar] = useState(null);          // the File
  const [preview, setPreview] = useState(null);        // its object URL
  const [error, setError] = useState('');        // the email field's
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { setProfile, avatarUrl, name: profileName } = useProfile();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // The preview is this screen's own object URL; the provider makes its own
  // when the form is submitted, so this one is revoked on replace and unmount
  // and nothing outlives the screen.
  useEffect(() => {
    if (!avatar || typeof URL.createObjectURL !== 'function') { setPreview(null); return undefined; }
    const url = URL.createObjectURL(avatar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!isSignInEmail(form.email)) {
      setError(isLiveBackend() ? 'Enter a valid email address.' : 'Use your school .edu address.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (signup) {
        const result = await submitJoin(form);
        setProfile({ name: form.name, avatarFile: avatar });
        if (result?.needsCode) {
          navigate('/login/code', { state: { email: form.email, kind: 'signup' } });
        } else {
          navigate('/app');
        }
      } else {
        await submitLogin(form);
        // The email "went out"; the six digits it carried are the next page.
        navigate('/login/code', { state: { email: form.email, kind: 'login' } });
      }
    } catch (err) {
      setError(err.message || 'Could not send the email.');
    } finally {
      setBusy(false);
    }
  }

  async function onCode(e) {
    e.preventDefault();
    if (!isSixDigits(code)) { setError('The code is six digits.'); return; }
    setError('');
    setBusy(true);
    try {
      const result = await verifyCode({ email: sentTo, code, kind: sentKind });
      const name = result?.user?.user_metadata?.full_name;
      if (name) setProfile({ name });
      navigate('/app');
    } catch (err) {
      setError(err.message || 'That code did not work.');
    } finally {
      setBusy(false);
    }
  }

  const resend = async () => {
    try {
      if (sentKind === 'signup') await submitJoin({ email: sentTo, name: profileName || 'Student' });
      else await submitLogin({ email: sentTo });
      setResent(true);
    } catch (err) {
      setError(err.message || 'Could not send the email.');
    }
  };

  if (codeStep && !sentTo) return <Navigate to="/login" replace />;

  return (
    <main className="vf" data-mode={mode}>
      <Logo className="vf__wordmark" />

      <div className="vf__body">
        {copy.bare ? (
          <h1 className="vf__sr">{copy.h1}</h1>
        ) : (
          <>
            {/* The student's own disc where the check stamp used to be — the
                same 74px the sign-up picker fills and Me shows. With a photo on
                file (this session) it is theirs; without one it is the
                placeholder, which is honest: nothing is known yet. */}
            <Avatar className="vf__avatar-disc--head" name={profileName} src={avatarUrl} size={74} data-testid="login-avatar" />

            <h1 className="vf__h1">{copy.h1}</h1>
            {copy.note && <p className="vf__note">{copy.note}</p>}
            {codeStep ? (
              <p className="vf__lede">
                We sent a 6-digit code to <b className="vf__sent">{sentTo}</b>.
              </p>
            ) : (
              <p className="vf__lede">{copy.lede}</p>
            )}
          </>
        )}

        {codeStep ? (
          <form className="vf__form" onSubmit={onCode} noValidate>
            {/* ONE input, six digits, not six boxes: one control clears the
                44px floor without a fight at 320px, and autoComplete
                "one-time-code" is what lets a phone offer the code straight
                from the email. The cells are drawn behind it. */}
            <label className="vf__otp">
              <span className="vf__otp-label">6-digit code</span>
              <input
                className="vf__otp-input"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="······"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'vf-otp-err' : undefined}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                data-testid="otp"
              />
            </label>
            {error && <p className="vf__otp-err" id="vf-otp-err" role="alert">{error}</p>}
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={busy || !isSixDigits(code)}
              className="vf__cta">
              {copy.cta}
            </Button>
            <div className="vf__again">
              <button type="button" className="vf__link" onClick={resend}>
                {resent ? 'Sent again' : 'Didn’t get it? Send again'}
              </button>
              <button type="button" className="vf__link" onClick={() => navigate('/login')}>
                Use a different email
              </button>
            </div>
          </form>
        ) : (
        <form className={copy.bare ? 'vf__form vf__form--bare' : 'vf__form'} onSubmit={onSubmit} noValidate>
          {signup && (
            /* Optional. The disc is the control — see parts/AvatarPicker. */
            <AvatarPicker
              className="vf__avatar"
              testId="avatar-picker"
              src={preview}
              name={form.name}
              onPick={setAvatar}
              hint={preview ? (avatar?.name ?? 'Photo added') : 'Add a photo · optional'}
            />
          )}
          {signup && (
            <Input label="Name" name="name" autoComplete="name" placeholder="your name"
              value={form.name} onChange={set('name')} style={{ width: '100%' }} />
          )}
          <div className={signup ? 'vf__field' : undefined}>
            {/* The hint is sign-up's: someone logging in already has an address on
                file, so "any .edu address works" told them nothing (owner,
                2026-09-21). */}
            <Input label="School email" name="email" type="email" autoComplete="email"
              placeholder={isLiveBackend() ? 'you@email.com' : 'you@school.edu'}
              hint={signup ? (isLiveBackend() ? 'any email works in this preview' : 'any .edu address works') : undefined}
              error={error}
              value={form.email} onChange={set('email')} style={{ width: '100%' }} />
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={busy}
            className="vf__cta">
            {copy.cta}
          </Button>
        </form>
        )}
      </div>
    </main>
  );
}
