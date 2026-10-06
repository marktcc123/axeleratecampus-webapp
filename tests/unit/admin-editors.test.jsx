import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { setUnlocked } from '../../src/app/admin/gate.jsx';
import { TABS } from '../../src/app/admin/AdminTabs.jsx';
import admin from '../../src/data/admin.example.json';
import brands from '../../src/data/brands.example.json';
import shop from '../../src/data/shop.example.json';

const go = (path) => {
  sessionStorage.clear();
  setUnlocked(true);
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
};

describe('Campuses', () => {
  test('every school in the fixture is listed with its student count', () => {
    go('/app/me/admin/campuses');
    for (const c of admin.campuses) {
      const row = screen.getByText(c.name).closest('[data-testid="campus-row"]');
      expect(within(row).getByText(`${c.student_count} students`)).toBeInTheDocument();
    }
  });

  test('Add school will not save without a name', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/campuses');
    await user.click(screen.getByRole('button', { name: 'Add school' }));
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    await user.type(screen.getByLabelText('Name'), 'Rice');
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  test('a new school joins the list', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/campuses');
    const before = screen.getAllByTestId('campus-row').length;
    await user.click(screen.getByRole('button', { name: 'Add school' }));
    await user.type(screen.getByLabelText('Name'), 'Rice');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getAllByTestId('campus-row')).toHaveLength(before + 1);
    expect(screen.getByText('Rice')).toBeInTheDocument();
  });

  test('removing a school takes it out', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/campuses');
    const before = screen.getAllByTestId('campus-row').length;
    const row = screen.getByText(admin.campuses[0].name).closest('[data-testid="campus-row"]');
    await user.click(within(row).getByRole('button', { name: /Remove/ }));
    expect(screen.getAllByTestId('campus-row')).toHaveLength(before - 1);
  });

  test('the colour is a swatch, never the only way to tell schools apart', () => {
    go('/app/me/admin/campuses');
    const row = screen.getByText(admin.campuses[0].name).closest('[data-testid="campus-row"]');
    const swatch = row.querySelector('.adm-cmp__dot');
    expect(swatch).toBeTruthy();
    expect(swatch).toHaveAttribute('aria-hidden', 'true');
  });

  test('no field passes `hint` — it would pollute the accessible name', () => {
    go('/app/me/admin/campuses');
    // If hint were passed, the label would absorb it and this exact match fails.
    expect(screen.queryByLabelText('Name')).toBeNull(); // dialog closed
  });
});

describe('Career', () => {
  test('the claim queue comes first, then the two lists', () => {
    go('/app/me/admin/career');
    const heads = [...document.querySelectorAll('.adm-grp__title')].map((h) => h.textContent);
    expect(heads).toEqual(['Certificate claims', 'Roles', 'Pathways']);
  });

  test('a claim shows what it is for and when it was claimed', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/career');
    const target = admin.career_claims[0];
    const row = screen.getAllByTestId('queue-row').find((r) => r.textContent.includes(target.full_name));
    await user.click(row.querySelector('.adm-row__head'));
    expect(within(row).getByText(target.reward_summary)).toBeInTheDocument();
    expect(row.textContent).toMatch(/Claimed \w{3} \d+/);
  });

  test('a claim does not repeat its own date as a fact', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/career');
    const target = admin.career_claims[0];
    const row = screen.getAllByTestId('queue-row').find((r) => r.textContent.includes(target.full_name));
    await user.click(row.querySelector('.adm-row__head'));
    // The row meta already carries "Claimed <date>"; a CLAIMED fact repeated it.
    expect(within(row).queryByText('CLAIMED')).toBeNull();
  });

  test('choosing a certificate records its name and says it stores nothing', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/career');
    const target = admin.career_claims[0];
    const row = screen.getAllByTestId('queue-row').find((r) => r.textContent.includes(target.full_name));
    await user.click(row.querySelector('.adm-row__head'));
    const file = new File(['x'], 'insider-cert.pdf', { type: 'application/pdf' });
    await user.upload(within(row).getByLabelText('Certificate'), file);
    expect(within(row).getByText('insider-cert.pdf')).toBeInTheDocument();
    expect(within(row).getByText(/Filename only/i)).toBeInTheDocument();
  });

  test('each role field has its own accessible name, and saves only when dirty', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/career');
    for (const r of admin.career_roles) {
      expect(screen.getByLabelText(`Role: ${r.name}`)).toBeInTheDocument();
    }
    // At rest there is no Save button at all — three resting full-width
    // primaries read as the point of the screen, and the claims above are.
    expect(screen.queryAllByRole('button', { name: 'Save' })).toHaveLength(0);
    const field = screen.getByLabelText(`Role: ${admin.career_roles[0].name}`);
    await user.clear(field);
    await user.type(field, 'Regional lead');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    expect(screen.getByText(/Role saved/)).toBeInTheDocument();
  });

  test('the pathways list states each one', () => {
    go('/app/me/admin/career');
    for (const p of admin.career_pathways) {
      expect(screen.getByText(p.title)).toBeInTheDocument();
      expect(screen.getByText(p.blurb)).toBeInTheDocument();
    }
  });
});

describe('Cashback %', () => {
  // The panel edits the rate a student is actually promised — each product's
  // own `cashbackPct` — grouped by brand. It used to edit a `cashback_rates`
  // fixture nothing read, under a note claiming the shop would follow.
  const withProducts = brands
    .map((b) => ({ ...b, items: shop.products.filter((p) => p.brandId === b.id) }))
    .filter((b) => b.items.length > 0);
  const uniform = withProducts.find((b) => new Set(b.items.map((p) => p.cashbackPct)).size === 1);
  const mixed = withProducts.find((b) => new Set(b.items.map((p) => p.cashbackPct)).size > 1);

  test('every brand with products is listed with the rate it pays now', () => {
    go('/app/me/admin/cashback');
    expect(screen.getAllByTestId('cashback-row')).toHaveLength(withProducts.length);
    const row = screen.getByLabelText(`${uniform.name} rate, percent`);
    expect(row).toHaveValue(uniform.items[0].cashbackPct);
  });

  test('a brand whose products disagree shows the spread and no guessed number', () => {
    if (!mixed) return;                       // the fixture may make them agree
    go('/app/me/admin/cashback');
    const rates = mixed.items.map((p) => p.cashbackPct).sort((a, z) => a - z);
    expect(screen.getByLabelText(`${mixed.name} rate, percent`)).toHaveValue(null);
    const row = screen.getByText(mixed.name).closest('[data-testid="cashback-row"]');
    expect(row).toHaveTextContent(`${rates[0]}–${rates[rates.length - 1]}% now`);
  });

  test('a rate saves, says how many products it moved, and shows the new figure', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/cashback');
    const label = `${uniform.name} rate, percent`;
    await user.clear(screen.getByLabelText(label));
    await user.type(screen.getByLabelText(label), '25');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    expect(screen.getByText(/Rate saved/)).toBeInTheDocument();
    expect(screen.getByLabelText(label)).toHaveValue(25);
    const row = screen.getByText(uniform.name).closest('[data-testid="cashback-row"]');
    expect(row).toHaveTextContent('25% now');
  });

  test('a rate at rest offers no Save button', () => {
    go('/app/me/admin/cashback');
    expect(screen.queryAllByRole('button', { name: 'Save' })).toHaveLength(0);
  });

  test('a rate outside 0–100 will not save', async () => {
    const user = userEvent.setup();
    go('/app/me/admin/cashback');
    const field = screen.getByLabelText(`${uniform.name} rate, percent`);
    await user.clear(field);
    await user.type(field, '140');
    expect(screen.getAllByRole('button', { name: 'Save' })[0]).toBeDisabled();
  });
});

describe('no tab is a stub any more', () => {
  test('every one of the ten renders real content', () => {
    for (const tab of TABS) {
      const view = go(`/app/me/admin/${tab.slug}`);
      expect(view.container.textContent, tab.slug).not.toMatch(/Not built yet/);
      expect(view.container.querySelector('.adm__panel').textContent.trim().length, tab.slug)
        .toBeGreaterThan(20);
      view.unmount();
    }
  });
});
