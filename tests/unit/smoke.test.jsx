// tests/unit/smoke.test.jsx
import { render, screen } from '@testing-library/react';
import { Button } from 'axelerate-design-system';

test('the design system renders under Vitest (proves .jsx transpilation)', () => {
  render(<Button>Shape what's next</Button>);
  const btn = screen.getByRole('button', { name: "Shape what's next" });
  expect(btn).toHaveClass('ax-btn');
  expect(btn).toHaveClass('ax-btn--primary');
});
