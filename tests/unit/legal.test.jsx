import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LegalPage from '../../src/pages/LegalPage.jsx';
import { LEGAL, sectionTitle } from '../../src/pages/legal-content.js';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('LegalPage', () => {
  test.each(['terms', 'privacy', 'payouts'])('%s renders its title, section headings, and the draft notice', (kind) => {
    wrap(<LegalPage kind={kind} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(LEGAL[kind].title);
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual(LEGAL[kind].sections.map(sectionTitle));
    if (kind === 'payouts') {
      expect(screen.queryByText(/Draft — legal text to follow/)).not.toBeInTheDocument();
    } else {
      expect(screen.getByText(/Draft — legal text to follow/)).toBeInTheDocument();
    }
  });
  test('payout terms state the 2026 1099-NEC line and the earlier W-9 hold', () => {
    wrap(<LegalPage kind="payouts" />);
    expect(screen.getByRole('heading', { name: 'Form 1099-NEC' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Form W-9' })).toBeInTheDocument();
    expect(screen.getByText(/at least \$2,000/)).toBeInTheDocument();
    expect(screen.getByText(/before the year’s payouts reach \$600/)).toBeInTheDocument();
    expect(screen.getByText(/24%/)).toBeInTheDocument();
    expect(screen.getByText(/\$20/)).toBeInTheDocument();
    expect(screen.queryByText(/Stripe Connect/)).not.toBeInTheDocument();
  });
  test('unknown kind renders the not-found copy, not a crash', () => {
    wrap(<LegalPage kind="cookies" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/isn't here/);
    expect(screen.getByRole('link', { name: 'Back to the start' })).toBeInTheDocument();
  });
});
