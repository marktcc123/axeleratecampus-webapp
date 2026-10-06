import { inspectW9 } from '../src/lib/w9-file.js';

const BUCKET = 'w9-forms';

function bucketExists(err) {
  const message = err?.message || '';
  return /already exists|duplicate|BucketAlreadyExists|resource already exists/i.test(message);
}

// Stores the file privately and marks it waiting for a check.
// Verification goes back to false until someone approves it.
export async function storeW9(admin, userId, { type, data }) {
  const buf = Buffer.from(String(data || ''), 'base64');
  const checked = inspectW9({ type, byteLength: buf.length });
  if (checked.error) return { ok: false, error: checked.error };

  const created = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  });
  if (created.error && !bucketExists(created.error)) {
    console.warn('[w9] createBucket', created.error.message);
  }

  const path = `${userId}/w9.${checked.ext}`;
  const uploaded = await admin.storage.from(BUCKET).upload(path, buf, {
    upsert: true,
    contentType: type,
  });
  if (uploaded.error) return { ok: false, error: uploaded.error.message || 'Upload failed.' };

  const now = new Date().toISOString();
  const { error } = await admin.from('profiles').update({
    w9_document_path: path,
    w9_submitted_at: now,
    is_w9_verified: false,
    updated_at: now,
  }).eq('id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
