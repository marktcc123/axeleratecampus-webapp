// The card's title without its brand. The fixture writes the brand into the
// title — "Solra — unboxing reel on your feed" — and the detail page, the
// tracker and the console keep it that way. The two board cards name the brand
// on a line of their own (owner, 2026-09-22), so there the lead goes — and only
// when it really is the brand: the whole joined name, or the word(s) it opens
// with ("August" for August Uncommon Tea). Anything else is the title's own
// words and stays; a title with nothing after the dash stays whole too.
const DASH = ' — ';

export function cardTitle(m = {}) {
  const title = m.title ?? '';
  const i = title.indexOf(DASH);
  if (i < 0) return title;
  const lead = title.slice(0, i).trim().toLowerCase();
  const brand = String(m.brand ?? '').trim().toLowerCase();
  if (!lead || !brand || !(brand === lead || brand.startsWith(`${lead} `))) return title;
  const rest = title.slice(i + DASH.length).trim();
  if (!rest) return title;
  return rest[0].toUpperCase() + rest.slice(1);
}
