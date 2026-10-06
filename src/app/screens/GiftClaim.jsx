import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from 'axelerate-design-system';
import SubScreen from '../parts/SubScreen.jsx';
import { claimGift } from '../../lib/checkout.js';
import { isLiveBackend } from '../../lib/supabase.js';

export default function GiftClaim() {
  const { token } = useParams();
  const live = isLiveBackend();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const unwrap = async () => {
    if (!live) {
      setMessage('Nothing was charged. Gifting opens at launch.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await claimGift(token);
      if (!result?.ok) {
        setMessage(result?.error || 'This gift link is invalid or expired.');
        return;
      }
      setDone(true);
    } catch (err) {
      setMessage(err?.message || 'This gift link is invalid or expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen title="A gift" band="pink">
      {done ? (
        <>
          <p>It’s in your orders. Nothing else is due.</p>
          <Link to="/app/me/orders">My orders</Link>
        </>
      ) : (
        <>
          <p>Unwrap it and it ships to the address on your account. You are not charged.</p>
          {message ? <p role="alert">{message}</p> : null}
          <Button variant="primary" size="md" disabled={busy} onClick={unwrap}>
            {busy ? 'Unwrapping…' : 'Unwrap'}
          </Button>
        </>
      )}
    </SubScreen>
  );
}
