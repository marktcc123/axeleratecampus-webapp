import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewSheet from '../../src/app/parts/ReviewSheet.jsx';
import { ReviewsProvider, useReviews } from '../../src/app/reviews.jsx';
// The catalogue as a screen sees it: the fixtures with the brand's name joined
// in from the brands table. The raw JSON carries `brandId` and no display name.
import { FIXTURES as shop } from '../../src/app/content.jsx';

const product = shop.products.find((p) => p.id === 'p2');

describe('ReviewSheet', () => {
  test('renders nothing when there is no product', () => {
    render(<ReviewsProvider><ReviewSheet product={null} onClose={() => {}} /></ReviewsProvider>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('names the product it is about', () => {
    render(<ReviewsProvider><ReviewSheet product={product} onClose={() => {}} /></ReviewsProvider>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(product.title)).toBeInTheDocument();
    expect(screen.getByText(product.brand)).toBeInTheDocument();
  });

  test('the rating control is a radiogroup of five real, named radios', () => {
    render(<ReviewsProvider><ReviewSheet product={product} onClose={() => {}} /></ReviewsProvider>);
    expect(screen.getByRole('radiogroup', { name: 'Rating' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '5 stars' })).toBeInTheDocument();
  });

  test('a star is reachable and selectable by keyboard alone', async () => {
    const user = userEvent.setup();
    render(<ReviewsProvider><ReviewSheet product={product} onClose={() => {}} /></ReviewsProvider>);
    const fourStars = screen.getByRole('radio', { name: '4 stars' });
    fourStars.focus();
    await user.keyboard(' ');
    expect(fourStars).toBeChecked();
  });

  test('submit is disabled until a rating is picked', async () => {
    const user = userEvent.setup();
    render(<ReviewsProvider><ReviewSheet product={product} onClose={() => {}} /></ReviewsProvider>);
    const submit = screen.getByRole('button', { name: 'Submit review' });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    expect(submit).toBeEnabled();
  });

  test('Escape closes the sheet', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReviewsProvider><ReviewSheet product={product} onClose={onClose} /></ReviewsProvider>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  test('submitting adds the review and says plainly that nothing was sent', async () => {
    const user = userEvent.setup();
    let ctx;
    function Spy() { ctx = useReviews(); return null; }
    render(
      <ReviewsProvider>
        <Spy />
        <ReviewSheet product={product} onClose={() => {}} />
      </ReviewsProvider>,
    );
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByLabelText('Your review'), 'Great tea, would buy again.');
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(ctx.added[product.id]).toEqual({ rating: 4, body: 'Great tea, would buy again.' });
    expect(screen.getByText(/Nothing was sent/)).toBeInTheDocument();
    expect(screen.getByText(/Reviews open at launch/)).toBeInTheDocument();
    // The form is gone once it is sent — nothing left to resubmit.
    expect(screen.queryByRole('button', { name: 'Submit review' })).toBeNull();
  });
});
