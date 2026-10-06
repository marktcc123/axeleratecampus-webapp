import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('What is Axelerate', () => {
  test('opens on the demand headline', () => {
    at('/app/me/about');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What is Axelerate');
    expect(document.querySelector('.abt__lede')).toHaveTextContent(/Tell us what you want/);
    expect(screen.getByText(/Demand first\. Supply second/)).toBeInTheDocument();
  });

  test('the formula stays the centrepiece', () => {
    at('/app/me/about');
    expect(screen.getByText('Demand → Aggregation → Offers → Choice')).toBeInTheDocument();
    const legend = within(screen.getByTestId('about-legend'));
    for (const [term, word] of [['Ask', 'Say what you want'], ['Gather', 'Find similar demand'], ['Choose', 'Pick a brand offer']]) {
      expect(legend.getByText(term)).toBeInTheDocument();
      expect(legend.getByText(word)).toBeInTheDocument();
    }
  });

  test('shows the demo demand block', () => {
    at('/app/me/about');
    const card = within(screen.getByTestId('example-demand'));
    expect(card.getByText('Lightweight Korean Sunscreen Under $25')).toBeInTheDocument();
    expect(card.getByText('Demo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a Demand »' })).toHaveAttribute('href', '/app/demand/new');
  });

  test('ranks on fit, not ads', () => {
    at('/app/me/about');
    const rows = within(screen.getByTestId('about-pays'));
    expect(rows.getByText('Fit')).toBeInTheDocument();
    expect(rows.getByText('Price')).toBeInTheDocument();
    expect(rows.getByText('Trust')).toBeInTheDocument();
  });

  test('merchant and live demand are one tap away', () => {
    at('/app/me/about');
    expect(screen.getByRole('link', { name: 'Explore Live Demand »' })).toHaveAttribute('href', '/app/discover');
    expect(screen.getByRole('link', { name: 'Respond as a brand »' })).toHaveAttribute('href', '/merchant');
  });

  test('FAQ no longer frames this as a student-only product', () => {
    at('/app/me/about');
    const faq = within(screen.getByTestId('about-faq'));
    expect(faq.getByText('Who is this for?')).toBeInTheDocument();
    expect(faq.getByText(/not a student platform/)).toBeInTheDocument();
    expect(faq.getByText('Is this advertising?')).toBeInTheDocument();
    expect(screen.queryByText('Who it’s for')).toBeNull();
  });
});
