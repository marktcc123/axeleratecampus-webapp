import { useState } from 'react';
import { saveW9 } from '../../lib/w9.js';
import { useWallet } from '../wallet.jsx';

// A one-line reminder for the W-9 that a 1099 needs. It stays small on the
// wallet and in the cash-out sheet, and never takes the place of Withdraw.
export default function W9Upload({ pendingReview, verified }) {
  const { noteW9 } = useWallet();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    setError('');
    setBusy(true);
    const result = await saveW9(file);
    setBusy(false);
    if (!result?.ok) {
      setError(result?.error || 'The W-9 was not saved.');
      return;
    }
    noteW9();
  };

  const note = verified
    ? 'W-9 on file for your 1099.'
    : pendingReview
      ? 'W-9 in, waiting to be checked.'
      : 'Upload a W-9 for your 1099.';
  const action = busy ? 'Uploading…' : (verified || pendingReview ? 'Replace' : 'Upload');

  return (
    <div className="w9line" data-testid="w9-upload">
      <span data-testid={pendingReview ? 'w9-pending' : undefined}>{note}</span>
      <label>
        {action}
        <input
          className="wal__file"
          type="file"
          accept=".pdf,application/pdf,image/jpeg,image/png"
          onChange={onFile}
          disabled={busy}
        />
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
