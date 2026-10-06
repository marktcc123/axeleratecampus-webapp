import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import hub from '../../src/data/hub.example.json';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
// By id, not position: the newest order leads the fixture now (ord4, packed).
const byId = (id) => hub.orders.find((o) => o.id === id);
const inTransit = byId('ord1');
const allCash = byId('ord2');
const delivered = byId('ord3');
const packed = byId('ord4');

describe('order receipt', () => {
  test('reads as a receipt: order number, date, line, total', () => {
    at(`/app/me/orders/${inTransit.id}`);
    expect(screen.getByText('perks shop receipt')).toBeInTheDocument();
    expect(screen.getByText(inTransit.no)).toBeInTheDocument();
    // The date also appears as the "Ordered" step's date, so scope to the paper.
    const paper = document.querySelector('.rc__paper');
    expect(within(paper).getByText(inTransit.date)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(inTransit.name);
    expect(screen.getByText(inTransit.brand)).toBeInTheDocument();
    expect(screen.getAllByText('$32.00')).toHaveLength(2);   // line and total
    expect(screen.getByText(inTransit.note)).toBeInTheDocument();
  });

  test('the tracker keeps every step, done or not', () => {
    at(`/app/me/orders/${inTransit.id}`);
    const steps = screen.getAllByTestId('order-step');
    expect(steps).toHaveLength(inTransit.steps.length);
    for (const [i, s] of inTransit.steps.entries()) {
      expect(within(steps[i]).getByText(s.label)).toBeInTheDocument();
      expect(steps[i].dataset.done).toBe(String(s.done));
    }
    // Three done, one not: ord1 has shipped and is waiting to land.
    expect(steps.filter((s) => s.dataset.done === 'true')).toHaveLength(3);
  });

  test('a delivered order has every step done', () => {
    at(`/app/me/orders/${delivered.id}`);
    const steps = screen.getAllByTestId('order-step');
    expect(steps.every((s) => s.dataset.done === 'true')).toBe(true);
  });

  test('an order paid partly with credits says so under the total; an all-cash one says nothing extra (owner, 2026-09-22)', () => {
    at(`/app/me/orders/${inTransit.id}`);
    const paid = within(screen.getByTestId('paid-with'));
    expect(paid.getByText('Paid with')).toBeInTheDocument();
    expect(paid.getByText('Credits')).toBeInTheDocument();
    expect(paid.getByText('1,200 pts · $12.00')).toBeInTheDocument();   // the points with their shop value (R1)
    expect(paid.getByText('Cash')).toBeInTheDocument();
    expect(paid.getByText('$20.00')).toBeInTheDocument();
    expect(screen.getAllByText('$32.00')).toHaveLength(2);   // the total is still the order's value
    document.body.innerHTML = '';
    at(`/app/me/orders/${allCash.id}`);
    expect(screen.queryByTestId('paid-with')).toBeNull();
  });

  test('Track it carries the carrier and number once shipped, and Copy copies it', async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true });
    at(`/app/me/orders/${inTransit.id}`);
    expect(screen.getByText(inTransit.tracking.carrier)).toBeInTheDocument();
    expect(screen.getByText(inTransit.tracking.number)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy tracking number' }));
    expect(write).toHaveBeenCalledWith(inTransit.tracking.number);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  test('before it ships, the number is promised rather than blank', () => {
    at(`/app/me/orders/${packed.id}`);
    expect(packed.tracking).toBeUndefined();
    expect(screen.getByText('Tracking number arrives when it ships.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
    // Two steps done, two to come.
    expect(screen.getAllByTestId('order-step').filter((s) => s.dataset.done === 'true')).toHaveLength(2);
  });

  test('back returns to the list', () => {
    at(`/app/me/orders/${inTransit.id}`);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/app/me/orders');
  });

  test('an unknown order is not found rather than blank', () => {
    at('/app/me/orders/nope');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/isn't here/);
  });

  test('renders no emoji', () => {
    at(`/app/me/orders/${inTransit.id}`);
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
