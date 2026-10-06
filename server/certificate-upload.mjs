import { claimNeedsCertificate, inspectCertificate } from '../src/lib/certificate-file.js';

const BUCKET = 'career-certificates';

function bucketExists(err) {
  const message = err?.message || '';
  return /already exists|duplicate|BucketAlreadyExists|resource already exists/i.test(message);
}

// Attaches the PDF to the student's claim. Status stays as it is: uploading
// the file is not the same as approving the request.
export async function storeCertificate(admin, { claimId, type, name, data }) {
  const id = String(claimId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: 'Missing claim.' };
  const buf = Buffer.from(String(data || ''), 'base64');
  const checked = inspectCertificate({ type, name, byteLength: buf.length });
  if (checked.error) return { ok: false, error: checked.error };

  const row = await admin
    .from('career_rewards')
    .select('id, user_id, reward_key')
    .eq('id', id)
    .maybeSingle();
  if (row.error) return { ok: false, error: row.error.message };
  if (!row.data) return { ok: false, error: 'Request not found.' };
  if (!claimNeedsCertificate(row.data.reward_key)) {
    return { ok: false, error: 'This request does not take a certificate file.' };
  }

  const created = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf'],
  });
  if (created.error && !bucketExists(created.error)) {
    console.warn('[certificate] createBucket', created.error.message);
  }

  const path = `${row.data.user_id}/${id}.pdf`;
  const uploaded = await admin.storage.from(BUCKET).upload(path, buf, {
    upsert: true,
    contentType: 'application/pdf',
  });
  if (uploaded.error) return { ok: false, error: uploaded.error.message || 'Upload failed.' };

  const saved = await admin
    .from('career_rewards')
    .update({ certificate_pdf_path: path })
    .eq('id', id);
  if (saved.error) return { ok: false, error: saved.error.message };
  return { ok: true, name: String(name || 'certificate.pdf') };
}
