import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProfileProvider } from '../../src/app/profile.jsx';
import { WalletProvider } from '../../src/app/wallet.jsx';
import { readFileSync } from 'node:fs';
import Verify from '../../src/app/Verify.jsx';
import * as join from '../../src/lib/join.js';

// The screen navigates on success, so it renders with an /app/earn stand-in.
// jsdom has no object URLs; the screen and the provider both guard for that,
// but a preview is what the photo tests are about, so give it one.
beforeAll(() => {
  URL.createObjectURL ??= () => 'blob:test-avatar';
  URL.revokeObjectURL ??= () => {};
});

const ENTRY = { signup: '/verify', login: '/login', code: '/login/code' };
const withRouter = (mode = 'signup', entry = ENTRY[mode]) =>
  render(
    <ProfileProvider><WalletProvider><MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/verify" element={<Verify mode="signup" />} />
        <Route path="/login" element={<Verify mode="login" />} />
        <Route path="/login/code" element={<Verify mode="code" />} />
        <Route path="/app" element={<h1>Missions</h1>} />
        <Route path="/app/earn" element={<h1>Missions</h1>} />
      </Routes>
    </MemoryRouter></WalletProvider></ProfileProvider>
  );

// Through the door the way a student goes: email, Send email, code page.
const sendEmail = async (user, email = 'mark@ucla.edu') => {
  await user.type(screen.getByLabelText('School email'), email);
  await user.click(screen.getByRole('button', { name: /Send email/ }));
};

const fill = async (user, { name = 'Mark', email }) => {
  if (name) await user.type(screen.getByLabelText('Name'), name);
  await user.type(screen.getByLabelText('School email'), email);
  await user.click(screen.getByRole('button', { name: /Get verified/ }));
};

describe('Verify', () => {
  test('sign-up asks for a photo, a name and a school email, and nothing else', () => {
    withRouter();
    // No masthead on this door since 2026-09-08: the h1 is present for the
    // landmark but hidden, and the stamp, aside and lede are gone.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign up');
    expect(screen.queryByText('Students only')).toBeNull();
    expect(screen.queryByText(/takes 30 seconds/)).toBeNull();
    expect(screen.queryByText(/runs on real students/)).toBeNull();
    expect(document.querySelector('.vf__stamp')).toBeNull();
    expect(screen.getByLabelText('Profile photo')).toHaveAttribute('type', 'file');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('School email')).toBeInTheDocument();
    // The design cut the campus dropdown and the four-step explainer.
    expect(screen.queryByLabelText('Campus')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  test('says what a valid address looks like before you type', () => {
    withRouter();
    expect(screen.getByPlaceholderText('you@school.edu')).toBeInTheDocument();
    expect(screen.getByText('any .edu address works')).toBeInTheDocument();
  });

  // Sign-up's hint only (owner, 2026-09-21): a returning student already has
  // an address on file, and being told any .edu works is noise on the way in.
  test('but not on the log-in door, where the address is already known', () => {
    withRouter('login');
    expect(screen.getByPlaceholderText('you@school.edu')).toBeInTheDocument();
    expect(screen.queryByText('any .edu address works')).toBeNull();
  });

  test('rejects a non-.edu email and does not call submitJoin', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(join, 'submitJoin');
    withRouter();
    await fill(user, { email: 'mark@gmail.com' });
    expect(screen.getByText('Use your school .edu address.')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('an invalid submission does not enter the app', async () => {
    const user = userEvent.setup();
    withRouter();
    await fill(user, { email: 'mark@gmail.com' });
    expect(screen.queryByRole('heading', { name: 'Missions' })).not.toBeInTheDocument();
  });

  test('a valid submission enters the app at the board', async () => {
    const user = userEvent.setup();
    withRouter();
    await fill(user, { email: 'mark@ucla.edu' });
    expect(await screen.findByRole('heading', { name: 'Missions' })).toBeInTheDocument();
  });

  test('touches no network', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('no network from this screen');
    });
    withRouter();
    await fill(user, { email: 'mark@ucla.edu' });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test('with no photo the disc shows the initial of the name as it is typed', async () => {
    const user = userEvent.setup();
    withRouter();
    const picker = screen.getByTestId('avatar-picker');
    expect(picker.querySelector('.avatar__initial')).toBeNull();      // nothing typed yet: the add glyph
    await user.type(screen.getByLabelText('Name'), 'mark tao');
    expect(picker.querySelector('.avatar__initial')).toHaveTextContent('M');
    expect(picker.querySelector('.avatar').dataset.tone).toBeTruthy();
  });

  test('the photo is optional, and the picker reads that way until one is chosen', async () => {
    const user = userEvent.setup();
    withRouter();
    const picker = screen.getByTestId('avatar-picker');
    expect(picker).toHaveAttribute('data-has-photo', 'false');
    expect(picker).toHaveTextContent(/optional/i);
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Profile photo'), file);
    expect(picker).toHaveAttribute('data-has-photo', 'true');
    expect(picker).toHaveTextContent('me.png');
  });

  test('a file that is not an image is refused, and nothing is previewed', async () => {
    // applyAccept:false is a SETUP option in user-event v14, not an argument to
    // upload() — passed there it is silently ignored, the accept="image/*"
    // filter drops the PDF, and onChange fires with no file at all, which
    // looks like a pass. The browser's filter is exactly what is being bypassed
    // here, so the screen's own check has to be the thing that holds.
    const user = userEvent.setup({ applyAccept: false });
    withRouter();
    const input = screen.getByLabelText('Profile photo');
    await user.upload(input, new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    expect(screen.getByTestId('avatar-picker')).toHaveAttribute('data-has-photo', 'false');
    expect(screen.getByText('That file is not a photo.')).toBeInTheDocument();
  });

  test('sign-up without a photo still enters the app', async () => {
    const user = userEvent.setup();
    withRouter();
    await fill(user, { email: 'mark@ucla.edu' });
    expect(await screen.findByRole('heading', { name: 'Missions' })).toBeInTheDocument();
  });

  describe('log in', () => {
    test('asks for the school email alone — no name, no photo', () => {
      withRouter('login');
      // Log in keeps a head — but it is the student's avatar disc now, not the
      // check stamp (owner, 2026-09-08). No stamp anywhere on this screen.
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back');
      expect(document.querySelector('.vf__stamp')).toBeNull();
      expect(screen.getByTestId('login-avatar')).toBeInTheDocument();
      expect(screen.getByLabelText('School email')).toBeInTheDocument();
      expect(screen.queryByLabelText('Name')).toBeNull();
      expect(screen.queryByLabelText('Profile photo')).toBeNull();
      // "Send email", not "Log in": the button names what happens — an email
      // goes out. No aside on this door either (2026-09-08).
      expect(screen.getByRole('button', { name: /Send email/ })).toBeInTheDocument();
      expect(screen.queryByText(/same door/)).toBeNull();
      expect(screen.getByText(/send the link for you to log in/)).toBeInTheDocument();
      expect(screen.queryByText(/is your login/)).toBeNull();
    });

    test('Send email goes through submitLogin and lands on the code page, not in the app', async () => {
      const user = userEvent.setup();
      const login = vi.spyOn(join, 'submitLogin');
      const joinSpy = vi.spyOn(join, 'submitJoin');
      withRouter('login');
      await sendEmail(user);
      expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      expect(screen.getByText('mark@ucla.edu')).toBeInTheDocument();     // the address echoed back
      expect(screen.queryByRole('heading', { name: 'Missions' })).toBeNull();
      expect(login).toHaveBeenCalledTimes(1);
      expect(joinSpy).not.toHaveBeenCalled();
      login.mockRestore(); joinSpy.mockRestore();
    });

    test('six digits log in; fewer cannot, and letters never land', async () => {
      const user = userEvent.setup();
      const verify = vi.spyOn(join, 'verifyCode');
      withRouter('login');
      await sendEmail(user);
      const otp = await screen.findByTestId('otp');
      const go = () => screen.getByRole('button', { name: /Log in/ });
      expect(otp).toHaveAttribute('autocomplete', 'one-time-code');
      await user.type(otp, '12a34');
      expect(otp).toHaveValue('1234');            // digits only
      expect(go()).toBeDisabled();                // and not six of them
      await user.type(otp, '56');
      expect(otp).toHaveValue('123456');
      expect(go()).toBeEnabled();
      await user.click(go());
      expect(await screen.findByRole('heading', { name: 'Missions' })).toBeInTheDocument();
      expect(verify).toHaveBeenCalledWith({ email: 'mark@ucla.edu', code: '123456', kind: 'login' });
      verify.mockRestore();
    });

    test('the code page shows the avatar disc, a resend, and a way to a different email', async () => {
      const user = userEvent.setup();
      const login = vi.spyOn(join, 'submitLogin');
      withRouter('login');
      await sendEmail(user);
      await screen.findByRole('heading', { name: 'Check your email' });
      expect(screen.getByTestId('login-avatar')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Send again/ }));
      expect(screen.getByRole('button', { name: 'Sent again' })).toBeInTheDocument();
      expect(login).toHaveBeenCalledTimes(2);     // once for Send email, once for the resend
      await user.click(screen.getByRole('button', { name: /different email/ }));
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
      login.mockRestore();
    });

    test('a cold visit to the code page, with no email in hand, goes back to log in', () => {
      withRouter('code');
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
      expect(screen.queryByTestId('otp')).toBeNull();
    });

    test('a non-.edu is refused at the door', async () => {
      const user = userEvent.setup();
      withRouter('login');
      await user.type(screen.getByLabelText('School email'), 'mark@gmail.com');
      await user.click(screen.getByRole('button', { name: /Send email/ }));
      expect(screen.getByText('Use your school .edu address.')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Missions' })).toBeNull();
    });
  });

  test('does not depend on the dormant marketing stylesheets', () => {
    const src = readFileSync('src/app/Verify.jsx', 'utf8');
    expect(src).not.toMatch(/sections\.css|shell\.css/);
  });

  test('renders no emoji', () => {
    withRouter();
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
