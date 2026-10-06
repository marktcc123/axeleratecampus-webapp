import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiOrigin } from '../../src/lib/api-origin.js';

describe('api origin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stays on this computer when the public host is unset', () => {
    expect(apiOrigin()).toBe('http://127.0.0.1:8787');
  });

  it('uses the public https host and drops a trailing path', () => {
    vi.stubEnv('VITE_API_ORIGIN', 'https://api.example.com/checkout/');
    expect(apiOrigin()).toBe('https://api.example.com');
  });

  it('ignores a non-http value', () => {
    vi.stubEnv('VITE_API_ORIGIN', 'javascript:alert(1)');
    expect(apiOrigin()).toBe('http://127.0.0.1:8787');
  });
});
