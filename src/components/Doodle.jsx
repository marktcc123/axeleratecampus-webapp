// Tints a design-system doodle through the same mask trick Icon.jsx uses.
// Doodles are decorative marker strokes, so they are always aria-hidden and
// always take their colour from the element they sit on.
//
// `no-inline` matters for the same reason it does in Icon.jsx: without it,
// anything under Vite's 4KB assetsInlineLimit becomes a base64 data URI baked
// into the JS bundle, and the whole set is globbed eagerly.
const DOODLES = import.meta.glob('/node_modules/axelerate-design-system/assets/doodles/*.svg', {
  eager: true, query: '?url&no-inline', import: 'default',
});

export default function Doodle({ name, style, className = '', ...rest }) {
  const src = DOODLES[`/node_modules/axelerate-design-system/assets/doodles/${name}.svg`];
  if (!src) throw new Error(`Doodle "${name}" is not in the design system's doodle set`);
  return (
    <span
      aria-hidden="true"
      className={`doodle${className ? ` ${className}` : ''}`}
      style={{ '--doodle': `url(${src})`, ...style }}
      {...rest}
    />
  );
}
