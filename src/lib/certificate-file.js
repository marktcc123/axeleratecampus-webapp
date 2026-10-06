export const CERT_MAX_BYTES = 8 * 1024 * 1024;

// A certificate claim takes a PDF. A referral lane does not.
export function claimNeedsCertificate(rewardKey) {
  const key = String(rewardKey || '').trim();
  if (!key || key.endsWith(':referral')) return false;
  if (key === 'general_cert' || key.endsWith(':cert')) return true;
  return /certificate/i.test(key);
}

export function inspectCertificate({ type, name, byteLength }) {
  if (!byteLength) return { error: 'Choose a PDF to upload.' };
  const pdf = type === 'application/pdf' || String(name || '').toLowerCase().endsWith('.pdf');
  if (!pdf) return { error: 'Use a PDF.' };
  if (byteLength > CERT_MAX_BYTES) return { error: 'File must be 8 MB or smaller.' };
  return { ext: 'pdf' };
}
