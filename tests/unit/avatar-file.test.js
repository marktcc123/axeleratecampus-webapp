import { inspectAvatar } from '../../src/lib/avatar-file.js';

describe('avatar file', () => {
  test('accepts a small photo and refuses anything else', () => {
    expect(inspectAvatar({ type: 'image/png', byteLength: 12 }).ext).toBe('png');
    expect(inspectAvatar({ type: 'image/jpeg', byteLength: 12 }).ext).toBe('jpg');
    expect(inspectAvatar({ type: 'application/pdf', byteLength: 12 }).error).toMatch(/JPG/);
    expect(inspectAvatar({ type: 'image/png', byteLength: 0 }).error).toMatch(/Choose/);
    expect(inspectAvatar({ type: 'image/png', byteLength: 3 * 1024 * 1024 }).error).toMatch(/2 MB/);
  });
});
