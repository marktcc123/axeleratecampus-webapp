import './avatar.css';

// A person's disc. With a photo it is the photo; without one it is an accent
// disc carrying the name's initial — the pattern the mission page's "going"
// pips already used, made general (owner, 2026-09-08).
//
// "Random" but STABLE: the accent is picked by hashing the name, so the same
// person is the same colour on every screen and every render. A truly random
// pick would recolour on each mount and read as a glitch. Six accents, ink
// type on all of them — white fails AA on every one at text sizes (see
// sub-screen.css for the measurements).
export const TONES = ['coral', 'orange', 'pink', 'blush', 'lavender', 'yellow'];

export const toneFor = (name = '') => {
  const s = String(name).trim().toLowerCase();
  if (!s) return 'lavender';
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
};

export const initialOf = (name = '') => {
  const s = String(name).trim();
  return s ? [...s][0].toUpperCase() : '';
};

// The type rung follows the disc: the app's type ladder has no calc() rung
// (type-scale.test), so three sizes map to three tokens.
const scale = (size) => (size >= 64 ? 'lg' : size >= 40 ? 'md' : 'sm');

// `tone` overrides the hash for a SET that should read as the palette in order
// (the brands row, owner 2026-09-09) — one disc alone still hashes.
export default function Avatar({ name, src, size = 36, tone: toneProp, className = '', children, ...rest }) {
  const tone = toneProp ?? toneFor(name);
  const initial = initialOf(name);
  return (
    <span
      className={('avatar ' + className).trim()}
      data-tone={src ? undefined : tone}
      data-scale={scale(size)}
      style={{ width: size, height: size, ...(src ? null : { background: `var(--accent-${tone})` }) }}
      aria-hidden="true"
      {...rest}
    >
      {src ? <img className="avatar__img" src={src} alt="" /> : initial ? <span className="avatar__initial">{initial}</span> : null}
      {children}
    </span>
  );
}
