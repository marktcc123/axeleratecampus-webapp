export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export function inspectAvatar({ type, byteLength }) {
  if (!byteLength) return { error: 'Choose a photo to upload.' };
  const ext = ALLOWED.get(type);
  if (!ext) return { error: 'Use a JPG, PNG, WEBP, or GIF photo.' };
  if (byteLength > AVATAR_MAX_BYTES) return { error: 'Photo must be 2 MB or smaller.' };
  return { ext };
}
