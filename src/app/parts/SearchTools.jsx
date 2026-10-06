import { useEffect, useRef, useState } from 'react';
import { Input } from 'axelerate-design-system';
import Icon from '../../components/Icon.jsx';

// The tools row: Filter — a glyph with its word and how many filters are on,
// no pill (owner, 2026-09-08) — and Search, which grows out of its glyph.
// Written for the shop and lifted out on 2026-09-22 when Discover's Brands
// row grew the same two tools; the styles stay in perks-shop.css under .shop,
// the one screen both rows live on.
//
// The search field is the system's Input, always in the tree so its width can
// animate out of the glyph: closed it is 0 wide, hidden and out of the tab
// order; open it runs from the glyph leftwards. Blur with nothing typed folds
// it back; a live query keeps it open so a list never filters on something
// you cannot see. Clearing is the field's own cancel mark, or Escape, which
// also hands focus back to the glyph. Input does not forward a ref, so focus
// goes through the group and finds the <input>.
//
// `ids` are the test ids — search (the glyph), field, and filter when there is
// one — because two of these rows sit on one screen and a test must be able to
// tell them apart. No `onFilter` means no Filter at all: the Brands row is
// search alone (owner, 2026-09-23), and the search group then takes the row.
export default function SearchTools({ q, onQ, onFilter, filterN = 0, placeholder, label, ids, className = '' }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const glyph = useRef(null);
  useEffect(() => { if (open) wrap.current?.querySelector('input')?.focus(); }, [open]);
  const close = () => { onQ(''); setOpen(false); glyph.current?.focus(); };
  return (
    <div className={`shop__tools ${className}`.trim()}>
      {onFilter && (
        <button type="button" className="shop__tool" onClick={onFilter} data-testid={ids.filter}>
          <Icon name="filter" set="app" size={20} />
          Filter{filterN > 0 && <span className="shop__tool-n" aria-label={`${filterN} on`}>{filterN}</span>}
        </button>
      )}
      <div ref={wrap} className={`shop__search${open ? ' shop__search--open' : ''}`}>
        <Input
          className="shop__search-in"
          type="search" inputMode="search" enterKeyHint="search" autoComplete="off"
          placeholder={placeholder} aria-label={label}
          value={q}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          onChange={(e) => onQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } }}
          onBlur={(e) => { if (!q && !wrap.current?.contains(e.relatedTarget)) setOpen(false); }}
          data-testid={ids.field}
        />
        <button
          ref={glyph}
          type="button" className="shop__tool shop__tool--icon"
          onClick={() => (open ? close() : setOpen(true))}
          aria-label={open ? 'Close search' : label}
          aria-expanded={open}
          data-testid={ids.search}
        >
          <Icon name="search" size={22} />
        </button>
      </div>
    </div>
  );
}
