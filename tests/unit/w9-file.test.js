import { inspectW9 } from '../../src/lib/w9-file.js';

describe('a W-9 file', () => {
  test('accepts a pdf, jpg, or png under 5 MB', () => {
    expect(inspectW9({ type: 'application/pdf', byteLength: 1200 }).ext).toBe('pdf');
    expect(inspectW9({ type: 'image/jpeg', byteLength: 1200 }).ext).toBe('jpg');
    expect(inspectW9({ type: 'image/png', byteLength: 1200 }).ext).toBe('png');
  });

  test('refuses an empty file, a wrong type, or one over 5 MB', () => {
    expect(inspectW9({ type: 'application/pdf', byteLength: 0 }).error).toMatch(/Choose a file/);
    expect(inspectW9({ type: 'text/plain', byteLength: 12 }).error).toMatch(/PDF, JPG, or PNG/);
    expect(inspectW9({ type: 'application/pdf', byteLength: 5 * 1024 * 1024 + 1 }).error).toMatch(/5 MB/);
  });
});
