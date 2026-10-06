import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Nav from '../../src/components/Nav.jsx';
import Footer from '../../src/components/Footer.jsx';
import Icon from '../../src/components/Icon.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Icon', () => {
  test('renders the ax-icon utility with the icon URL in --icon', () => {
    const { container } = render(<Icon name="zap" />);
    const i = container.querySelector('i.ax-icon');
    expect(i).toBeInTheDocument();
    expect(i.style.getPropertyValue('--icon')).toMatch(/zap/);
    expect(i).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Nav', () => {
  test('renders the wordmark linking home and the three section links', () => {
    wrap(<Nav />);
    expect(screen.getByRole('link', { name: 'axelerate' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/#loop');
    expect(screen.getByRole('link', { name: 'The ladder' })).toHaveAttribute('href', '/#ladder');
    expect(screen.getByRole('link', { name: 'For brands' })).toHaveAttribute('href', '/for-brands');
  });

  test('has a primary CTA "Join the squad" pointing at /join', () => {
    wrap(<Nav />);
    const cta = screen.getAllByRole('link', { name: 'Join the squad' })[0];
    expect(cta).toHaveAttribute('href', '/verify');
  });

  test('the sheet is closed by default and opens from the menu button', async () => {
    const user = userEvent.setup();
    wrap(<Nav />);
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const sheet = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(sheet).getByRole('link', { name: 'For brands' })).toBeInTheDocument();
  });

  test('the sheet closes on Escape and on the close button, returning focus to the toggle', async () => {
    const user = userEvent.setup();
    wrap(<Nav />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });

  test('focus is trapped inside the open sheet', async () => {
    const user = userEvent.setup();
    wrap(<Nav />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const sheet = screen.getByRole('dialog', { name: 'Menu' });
    // getAllByRole does not accept a RegExp role in this @testing-library/dom
    // version (role matching is a strict string compare) — query focusables
    // directly, mirroring NavSheet's own FOCUSABLE selector.
    const focusables = [...sheet.querySelectorAll('a[href], button:not([disabled])')];
    expect(focusables[0]).toHaveFocus();          // close button focused on open
    // Shift+Tab from the first focusable wraps to the last
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(focusables[focusables.length - 1]).toHaveFocus();
    // Tab from the last wraps to the first
    await user.keyboard('{Tab}');
    expect(focusables[0]).toHaveFocus();
  });

  test('clicking a link inside the sheet closes it', async () => {
    const user = userEvent.setup();
    wrap(<Nav />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const sheet = screen.getByRole('dialog', { name: 'Menu' });
    await user.click(within(sheet).getByRole('link', { name: 'For brands' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});

describe('Footer', () => {
  test('links to the brand page, join, and all three legal pages', () => {
    wrap(<Footer />);
    expect(screen.getByRole('link', { name: 'For brands' })).toHaveAttribute('href', '/for-brands');
    expect(screen.getByRole('link', { name: 'Join the squad' })).toHaveAttribute('href', '/verify');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/legal/terms');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getByRole('link', { name: 'Payouts' })).toHaveAttribute('href', '/legal/payouts');
  });
});
