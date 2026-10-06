import './app.css';

// Stands in for photography that does not exist yet — or carries the real
// thing once there is one.
//
// Decorative either way. The caption describes the shot for whoever supplies
// it, not for a screen reader, and a real cover sits beside the title that
// already names the event, so the <img> takes an empty alt rather than
// repeating it. The wrapper stays aria-hidden for the same reason.
export default function ImageSlot({ label, src, ratio = '1 / 1', radius = 10, style }) {
  return (
    <div
      aria-hidden="true"
      className={src ? 'app__slot app__slot--shot' : 'app__slot'}
      style={{ aspectRatio: ratio, borderRadius: radius, ...style }}
    >
      {src ? <img className="app__slot-img" src={src} alt="" /> : <span>{label}</span>}
    </div>
  );
}
