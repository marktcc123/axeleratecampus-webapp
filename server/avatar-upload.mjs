import { inspectAvatar } from '../src/lib/avatar-file.js';

function bucketExists(err) {
  const message = err?.message || '';
  return /already exists|duplicate|BucketAlreadyExists|resource already exists/i.test(message);
}

const BUCKET = 'avatars';

export async function storeAvatar(admin, userId, { type, data }) {
  const buf = Buffer.from(String(data || ''), 'base64');
  const checked = inspectAvatar({ type, byteLength: buf.length });
  if (checked.error) return { ok: false, error: checked.error };

  const created = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });
  if (created.error && !bucketExists(created.error)) {
    console.warn('[avatar] createBucket', created.error.message);
  }

  const path = `${userId}/avatar.${checked.ext}`;
  const uploaded = await admin.storage.from(BUCKET).upload(path, buf, {
    upsert: true,
    contentType: type,
  });
  if (uploaded.error) return { ok: false, error: 'The photo was not saved.' };

  const pub = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = `${pub.data.publicUrl}?v=${Date.now()}`;
  const { error } = await admin.from('profiles').update({
    avatar_url: url,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
  if (error) return { ok: false, error: 'The photo was not saved.' };
  return { ok: true, url };
}
