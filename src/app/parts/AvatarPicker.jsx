import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Avatar, { initialOf } from '../Avatar.jsx';
import './avatar-picker.css';

// The photo disc that is also the control. The <input type=file> IS the target
// — laid invisibly over a 74px disc, so one element takes focus and the tap,
// Enter/Space open the picker, and the app-wide touch sweep (which reads
// `input` boxes) sees 74px rather than a display:none or 1×1 sr-only input.
//
// Sign-up and Settings both draw this. Sign-up keeps a draft until the form
// goes and says "optional" under the disc; Settings commits at once and wears
// the camera badge on the disc's corner instead of a caption (owner,
// 2026-09-08). The component owns nothing but the file check: it hands the File
// up and shows whatever `src` it is given back.
export default function AvatarPicker({ src, name, onPick, label = 'Profile photo', hint, problem, caption, badge = false, className = '', testId }) {
  const [error, setError] = useState('');
  const onChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !file.type.startsWith('image/')) { setError('That file is not a photo.'); return; }
    setError('');
    if (file) onPick(file);
  };
  const line = error || problem || hint;
  return (
    <div className={('avp ' + className).trim()} data-testid={testId} data-has-photo={src ? 'true' : 'false'}>
      <span className="avp__stack">
        {/* Photo, or the accent disc with the initial (Avatar.jsx). The add
            glyph shows only when there is neither — no photo and no name yet. */}
        <Avatar className="avp__disc" name={name} src={src} size={74}>
          {!src && !initialOf(name) && <Icon name="user-add" size={22} className="avp__ico" />}
        </Avatar>
        {/* The camera on the corner: the sign that this disc can be changed,
            where a caption used to say so. Decorative — the input carries the
            name. Outside the disc so its overflow:hidden does not clip it. */}
        {badge && (
          <span className="avp__badge" aria-hidden="true" data-testid="avatar-badge">
            <Icon name="camera" set="app" size={13} />
          </span>
        )}
        <input
          className="avp__file"
          type="file"
          accept="image/*"
          aria-label={label}
          aria-describedby={line ? 'avp-line' : undefined}
          onChange={onChange}
        />
      </span>
      {line && (
        <p className={(error || problem) ? 'avp__line avp__line--error' : 'avp__line'} id="avp-line" role={(error || problem) ? 'alert' : undefined}>
          {line}
        </p>
      )}
      {caption && !line && <p className="avp__line">{caption}</p>}
    </div>
  );
}
