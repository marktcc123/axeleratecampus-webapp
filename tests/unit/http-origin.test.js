import { describe, expect, it } from 'vitest';
import { allowOrigin, parseAllowedOrigins } from '../../server/http-origin.mjs';

describe('checkout origins', () => {
  const extra = parseAllowedOrigins('https://campus.example, http://not-a-url, https://api.example/path');

  it('keeps localhost and the listed public site', () => {
    expect(allowOrigin('http://localhost:5173', extra)).toBe('http://localhost:5173');
    expect(allowOrigin('http://127.0.0.1:4173', extra)).toBe('http://127.0.0.1:4173');
    expect(allowOrigin('https://campus.example', extra)).toBe('https://campus.example');
  });

  it('refuses a site that was not listed', () => {
    expect(allowOrigin('https://evil.example', extra)).toBe('');
    expect(allowOrigin('http://192.168.1.41:5173', extra)).toBe('');
  });
});
