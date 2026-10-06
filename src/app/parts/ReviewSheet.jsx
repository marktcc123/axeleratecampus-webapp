import { useEffect, useRef, useState } from 'react';
import { Button, Textarea } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';
import ImageSlot from '../ImageSlot.jsx';
import { cover } from './cover.js';
import { useReviews } from '../reviews.jsx';
import './review-sheet.css';

// Write a review for a product already bought. The owner's one dialog
// pattern — same focus trap, Escape and body scroll lock as GiftSheet —
// copied rather than reinvented, so a second sheet does not drift from the
// first.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])';

const STARS = [1, 2, 3, 4, 5];

export default function ReviewSheet({ product, onClose }) {
  const ref = useRef(null);
  const { addReview } = useReviews();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [savedLive, setSavedLive] = useState(false);

  useEffect(() => {
    setRating(0);
    setBody('');
    setSent(false);
    setError('');
    setSavedLive(false);
  }, [product]);

  useEffect(() => {
    if (!product) return undefined;
    const sheet = ref.current;
    const focusables = () => [...sheet.querySelectorAll(FOCUSABLE)];
    focusables()[0]?.focus();

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  const submit = async () => {
    setError('');
    const result = await Promise.resolve(addReview(product.id, { rating, body: body.trim() }));
    if (result && result.ok === false) {
      setError(result.error || 'The review was not saved.');
      return;
    }
    setSavedLive(Boolean(result?.live));
    setSent(true);
  };

  return (
    <>
      <div className="rs__overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="rs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rs-title"
        ref={ref}
      >
        <div className="rs__grab" aria-hidden="true" />

        <div className="rs__top">
          <h2 id="rs-title" className="rs__title">
            <Icon name="star" set="solid" size={17} className="rs__title-ico" />
            Write a review
          </h2>
          <button type="button" className="rs__x" onClick={onClose} aria-label="Close">
            <span className="rs__x-mark" aria-hidden="true" />
          </button>
        </div>

        <div className="rs__item">
          <span className="rs__thumb"><ImageSlot label={product.photo} src={cover(product.covers?.[0])} radius={10} /></span>
          <span className="rs__item-text">
            <span className="rs__item-title">{product.title}</span>
            <span className="rs__item-brand">{product.brand}</span>
          </span>
        </div>

        {sent ? (
          <>
            <p className="rs__done">Your review is added below.</p>
            {savedLive
              ? <p className="rs__nothing">It is saved on this product.</p>
              : <p className="rs__nothing">Nothing was sent. Reviews open at launch.</p>}
          </>
        ) : (
          <>
            <div className="rs__field">
              <p className="rs__field-lab" id="rs-rating-lab">Rating</p>
              {/* Real radio inputs, not click handlers on spans: keyboard-
                  operable by default and each one announces its own name to a
                  screen reader. The icon is aria-hidden; the visually-hidden
                  span after it is what a screen reader reads as the radio's
                  name. */}
              <div className="rs__stars" role="radiogroup" aria-labelledby="rs-rating-lab">
                {STARS.map((n) => (
                  <label key={n} className="rs__star">
                    <input
                      type="radio"
                      name="rs-rating"
                      className="rs__star-input"
                      value={n}
                      checked={rating === n}
                      onChange={() => setRating(n)}
                    />
                    <Icon
                      name="star"
                      set={n <= rating ? 'solid' : 'outline'}
                      size={22}
                      className={`rs__star-ico${n <= rating ? ' is-on' : ''}`}
                    />
                    <span className="sr-only">{n} {n === 1 ? 'star' : 'stars'}</span>
                  </label>
                ))}
              </div>
            </div>

            <Textarea
              label="Your review"
              rows={4}
              placeholder="What stood out?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="rs__body"
            />

            {error && <p className="rs__nothing" role="alert">{error}</p>}
            <div className="rs__submit">
              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={rating === 0}
                onClick={submit}
              >
                Submit review
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
