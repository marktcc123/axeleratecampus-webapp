import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';

const at = (path, state) => render(
  <MemoryRouter initialEntries={[{ pathname: path, state }]}><App /></MemoryRouter>,
);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('demand exchange demo', () => {
  test('home captures demand and lists live blocks, not a catalog', () => {
    at('/app');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What do you want next?');
    expect(screen.getByTestId('demand-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a Demand' })).toBeInTheDocument();
    expect(screen.getAllByTestId('demand-card').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Perks shop' })).toBeNull();
  });

  test('the sunscreen sentence joins the seeded live demand', async () => {
    const user = userEvent.setup();
    at('/app/demand/new', { rawText: 'A Korean sunscreen under $25, lightweight, no white cast, good for dry skin.' });
    expect(screen.getByTestId('demand-new-text').value).toMatch(/Korean sunscreen/);
    expect(screen.getByTestId('demand-preview')).toHaveTextContent(/people already want/);
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: /See who else wants this/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/You.re not alone/);
    expect(screen.getByRole('button', { name: /join existing demand/i })).toBeInTheDocument();
  });

  test('the live demand page shows active demand and brand offers', () => {
    at('/app/demand/korean-sunscreen-25');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lightweight Korean Sunscreen Under $25');
    expect(screen.getByText('active demand')).toBeInTheDocument();
    expect(screen.getAllByText('ready to buy').length).toBeGreaterThan(0);
    expect(screen.getByTestId('brands-responded')).toHaveTextContent('3 brands responded');
    expect(screen.getAllByTestId('offer-card')).toHaveLength(3);
    expect(screen.getByText('Best Match')).toBeInTheDocument();
    expect(screen.getByText('Best Value')).toBeInTheDocument();
    expect(screen.getByText('Fastest')).toBeInTheDocument();
  });

  test('merchant view shows qualified demand and outcomes', () => {
    at('/merchant');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Merchant');
    expect(screen.getByText(/Stop guessing demand/)).toBeInTheDocument();
    expect(screen.getByText('Lightweight Korean Sunscreen Under $25')).toBeInTheDocument();
    const sunscreen = screen.getAllByTestId('merchant-outcomes')[0];
    expect(sunscreen).toHaveTextContent('7 verified purchases');
    expect(sunscreen).toHaveTextContent('$432');
    expect(sunscreen).toHaveTextContent('verified GMV');
  });
});
