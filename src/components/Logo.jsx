import logo from 'axelerate-design-system/assets/logo.png?url&no-inline';
import logoWhite from 'axelerate-design-system/assets/logo-white.png?url&no-inline';

// The drawn wordmark, from the design system's own asset. The brand rule is
// "use the asset, never retype it" (guidelines/brand-wordmark, readme →
// Iconography), and until 2026-09-08 every screen retyped it — five spans of
// "axelerate" in the display face. One component now, so the import, the alt
// and the rule live in one place and a sixth screen cannot drift.
//
// `tone="light"` is the white cut, for ink, violet or a dark photo; the default
// gradient cut is for white and paper. Never on an accent fill.
//
// `?url&no-inline`: the same query Icon.jsx uses, and for the same reason —
// without it Vite bakes anything under its inline limit into the JS bundle as
// a data URI. The logo is well over the limit today, but the rule should not
// depend on a PNG staying heavy.
//
// The size is the caller's: each site keeps its own class and sets a height,
// so the mark sits where the typed word sat and at the weight that spot had.
export default function Logo({ tone = 'gradient', className = '', ...rest }) {
  return (
    <img
      src={tone === 'light' ? logoWhite : logo}
      alt="Axelerate"
      className={className ? `logo ${className}` : 'logo'}
      draggable={false}
      {...rest}
    />
  );
}
