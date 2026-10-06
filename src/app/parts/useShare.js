import { useState } from 'react';

// Share a URL: the platform's own sheet where there is one (navigator.share —
// phones), the clipboard where there is not (desktops), and a moment of "done"
// either way for the control to show. A dismissed sheet is not an error and
// says nothing. Me, the mission page and the event page all share this.
export default function useShare(url, title) {
  const [shared, setShared] = useState(false);
  const share = async () => {
    if (!url) return;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
      setShared(true); setTimeout(() => setShared(false), 2200);
    } catch { /* the sheet was dismissed; nothing to say */ }
  };
  return { share, shared };
}
