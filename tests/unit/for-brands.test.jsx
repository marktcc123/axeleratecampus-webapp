import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForBrandsPage from '../../src/pages/ForBrandsPage.jsx';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ForBrandsPage', () => {
  test('is thin by design: one h1, three benefit blocks, one CTA', () => {
    wrap(<ForBrandsPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: 'Book a call' })).toHaveLength(1);
  });
  test('the CTA is an honest placeholder until a booking tool is named', () => {
    wrap(<ForBrandsPage />);
    const cta = screen.getByRole('link', { name: 'Book a call' });
    expect(cta).toHaveAttribute('href', '#');
    expect(screen.getByText('Stay tuned. There is no calendar here yet.')).toBeInTheDocument();
    expect(cta).toHaveAttribute('aria-disabled', 'true');
  });
  test('states the brand problem from the product spec', () => {
    wrap(<ForBrandsPage />);
    expect(screen.getByText(/paid social/i)).toBeInTheDocument();
    expect(screen.getByText(/distrusted by exactly this audience/i)).toBeInTheDocument();
  });
});
