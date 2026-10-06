export const W9_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export function inspectW9({ type, byteLength }) {
  if (!byteLength) return { error: 'Choose a file to upload.' };
  if (!ALLOWED.has(type)) return { error: 'Use a PDF, JPG, or PNG file.' };
  if (byteLength > W9_MAX_BYTES) return { error: 'File must be 5 MB or smaller.' };
  const ext = type === 'application/pdf' ? 'pdf' : type === 'image/jpeg' ? 'jpg' : 'png';
  return { ext };
}
