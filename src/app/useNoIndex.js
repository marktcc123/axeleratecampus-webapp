import { useEffect } from 'react';

// Adds <meta name="robots" content="noindex"> while the calling screen is
// mounted, and removes it on the way out.
//
// A static tag in index.html cannot do this job: the app is one HTML document
// served for every path, so a tag there would de-index the whole product.
//
// What this tag does NOT do is cover the case robots.txt misses. As shipped it
// is unreachable by a compliant crawler: public/robots.txt disallows /u/, so
// such a crawler never fetches the page and never reads this tag. The two are
// mutually defeating, not belt and braces. It is here for the deployed
// configuration public/robots.txt describes — an X-Robots-Tag: noindex header
// for /u/* with the Disallow removed, in one change — where it becomes the
// fallback for a crawler that does run JavaScript.
//
// Neither is access control. Anyone holding the link reads the page.
export function useNoIndex() {
  useEffect(() => {
    const existing = document.head.querySelector('meta[name="robots"]');
    if (existing) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
