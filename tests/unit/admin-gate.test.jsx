import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { checkPassword, isUnlocked, setUnlocked, ADMIN_SESSION_KEY } from '../../src/app/admin/gate.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('admin unlock state', () => {
  beforeEach(() => { sessionStorage.clear(); vi.unstubAllEnvs(); });

  test('the password comes from the environment', () => {
    vi.stubEnv('VITE_ADMIN_PASSWORD', 'letmein');
    expect(checkPassword('letmein')).toBe(true);
    expect(checkPassword('Letmein')).toBe(false);
    expect(checkPassword('')).toBe(false);
  });

  test('it falls back to a development default so a fresh clone runs', () => {
    vi.stubEnv('VITE_ADMIN_PASSWORD', '');
    expect(checkPassword('campus-lead')).toBe(true);
  });

  test('unlock survives inside the session and is off by default', () => {
    expect(isUnlocked()).toBe(false);
    setUnlocked(true);
    expect(isUnlocked()).toBe(true);
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe('1');
    setUnlocked(false);
    expect(isUnlocked()).toBe(false);
  });

  test('a storage that throws does not take the app down', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(isUnlocked()).toBe(false);
    spy.mockRestore();
  });
});

describe('the gate in front of the console', () => {
  beforeEach(() => { sessionStorage.clear(); vi.stubEnv('VITE_ADMIN_PASSWORD', 'letmein'); });

  test('the way in is the version line at the foot of Settings', () => {
    at('/app/me/profilesetting');
    const entry = screen.getByRole('button', { name: /admin account/i });
    // A button, not a link: the console asks for a password first.
    expect(entry).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin account/i })).toBeNull();
    // Its visible text is the version, and the accessible name carries that
    // text FIRST so voice control can act on what it reads (WCAG 2.5.3).
    expect(entry).toHaveTextContent('axelerate · v2.4.1');
    expect(entry.getAttribute('aria-label')).toMatch(/^axelerate · v2\.4\.1/);
  });

  // Its own test: at() renders another App into the same document rather than
  // replacing the first, so asserting an absence after a second at() finds the
  // previous screen still mounted.
  test('and it is nowhere on the hub any more', () => {
    at('/app/me');
    expect(screen.queryByRole('button', { name: /admin/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /admin/i })).toBeNull();
  });

  test('it opens a dialog asking for a password', async () => {
    const user = userEvent.setup();
    at('/app/me/profilesetting');
    await user.click(screen.getByRole('button', { name: /admin account/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  test('a wrong password says so kindly and does not let you in', async () => {
    const user = userEvent.setup();
    at('/app/me/profilesetting');
    await user.click(screen.getByRole('button', { name: /admin account/i }));
    await user.type(screen.getByLabelText('Password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(screen.getByText(/That's not it/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(isUnlocked()).toBe(false);
  });

  test('the right password unlocks and lands on Analytics', async () => {
    const user = userEvent.setup();
    at('/app/me/profilesetting');
    await user.click(screen.getByRole('button', { name: /admin account/i }));
    await user.type(screen.getByLabelText('Password'), 'letmein');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(isUnlocked()).toBe(true);
    expect(await screen.findByRole('heading', { name: /Admin/ })).toBeInTheDocument();
  });

  test('Escape closes it without unlocking', async () => {
    const user = userEvent.setup();
    at('/app/me/profilesetting');
    await user.click(screen.getByRole('button', { name: /admin account/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(isUnlocked()).toBe(false);
  });
});
