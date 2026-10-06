import { useEffect, useRef } from 'react';
import { Button } from 'axelerate-design-system';
import './shop-filter-sheet.css';

// The filter sheet's shell: overlay, focus trap, Escape, scroll lock, the head
// (Filters · Reset all · close) that sticks while the sections scroll, and the
// foot whose one button says how many things the picks leave and closes.
// Written as the shop's sheet (owner, 2026-09-08, from a reference screen) and
// lifted out on 2026-09-22 for a Brands sheet that lasted a day (the owner
// wanted search alone there). Kept as the shell: a sheet supplies its sections
// as children and its own Reset, and `noun` names what the foot counts.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';

export default function FilterSheet({ open, onClose, onReset, count, noun = ['result', 'results'], showTestId = 'filter-show', children }) {
  const ref = useRef(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) { wasOpen.current = false; return undefined; }
    const sheet = ref.current;
    const focusables = () => [...sheet.querySelectorAll(FOCUSABLE)];
    if (!wasOpen.current) {
      focusables()[0]?.focus();
      wasOpen.current = true;
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables(); const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="sfs__overlay" onClick={onClose} aria-hidden="true" />
      <div className="sfs" role="dialog" aria-modal="true" aria-labelledby="sfs-title" ref={ref}>
        {/* Head and foot stick while the middle scrolls (owner, 2026-09-09):
            the title row stays at the top of the sheet, Show N at its bottom,
            so the count is always in reach as you pick. */}
        <div className="sfs__head">
          <div className="sfs__grab" aria-hidden="true" />
          <div className="sfs__top">
            <h2 className="sfs__h" id="sfs-title">Filters</h2>
            <button type="button" className="sfs__reset" onClick={onReset}>Reset all</button>
            <button type="button" className="sfs__x" onClick={onClose} aria-label="Close"><span className="sfs__x-mark" aria-hidden="true" /></button>
          </div>
        </div>

        {children}

        <div className="sfs__act">
          <Button variant="primary" size="md" fullWidth onClick={onClose} data-testid={showTestId}>
            {count === 0 ? 'Nothing matches — adjust' : `Show ${count} ${count === 1 ? noun[0] : noun[1]} »`}
          </Button>
        </div>
      </div>
    </>
  );
}
