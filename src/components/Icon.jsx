// Tints a design-system doodle icon via the system's .ax-icon mask utility.
// Vite resolves each SVG to a URL. `no-inline` matters: without it, icons
// under Vite's 4KB assetsInlineLimit become base64 data URIs baked into the
// JS bundle, and all 38+16 are globbed eagerly.
const SETS = {
  outline: import.meta.glob('/node_modules/axelerate-design-system/assets/icons/*.svg', {
    eager: true, query: '?url&no-inline', import: 'default',
  }),
  solid: import.meta.glob('/node_modules/axelerate-design-system/assets/icons-solid/*.svg', {
    eager: true, query: '?url&no-inline', import: 'default',
  }),
  // The app's own, for a shape the design system does not have yet. One so
  // far — a gear, drawn in the system's idiom — and it belongs in the system
  // the next time its pin moves rather than living here forever.
  app: import.meta.glob('/src/assets/icons/*.svg', {
    eager: true, query: '?url&no-inline', import: 'default',
  }),
};
const ROOTS = {
  outline: '/node_modules/axelerate-design-system/assets/icons',
  solid: '/node_modules/axelerate-design-system/assets/icons-solid',
  app: '/src/assets/icons',
};

// Small icons get a 1px inset on the mask. The doodle set is drawn to the very
// edge of its own viewBox (tick-2's geometry reaches within 0.5 of 170 units of
// the right edge — 0.04px at 13px), so `contain` puts the glyph's outermost
// stroke in the box's last device pixel, and iOS Safari's mask rasteriser drops
// it: the owner's phone showed the campus tick with a flat corner. Chromium and
// desktop WebKit painted it whole, which is why three rounds of emulation
// found nothing. Under 20px the inset is invisible and the edge is safe; above,
// a device pixel is a smaller share of the glyph and the set draws fine.
const EDGE_SAFE_PX = 20;

export default function Icon({ name, set = 'outline', size = 22, style, className = '', ...rest }) {
  const src = SETS[set]?.[`${ROOTS[set]}/${name}.svg`];
  if (!src) throw new Error(`Icon "${name}" is not in the ${set} icon set`);
  // Inline longhands on the element itself, which the .ax-icon shorthand
  // (`mask: … center/contain`) then cannot override — this is the app's own
  // component setting its own element, not app CSS naming a system class.
  const inset = size < EDGE_SAFE_PX ? { WebkitMaskSize: 'calc(100% - 2px)', maskSize: 'calc(100% - 2px)' } : null;
  return (
    <i
      aria-hidden="true"
      // Merged, not replaced: a caller passing className used to knock out
      // ax-icon, which is the mask utility, and the icon vanished silently.
      className={`ax-icon${className ? ` ${className}` : ''}`}
      style={{ '--icon': `url(${src})`, width: size, height: size, ...inset, ...style }}
      {...rest}
    />
  );
}
