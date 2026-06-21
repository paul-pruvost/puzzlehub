import { describe, it, expect } from 'vitest';
import { generateCsrfToken, verifyCsrf } from './csrf';

describe('csrf double-submit', () => {
  it('valide deux jetons identiques', () => {
    const t = generateCsrfToken();
    expect(verifyCsrf(t, t)).toBe(true);
  });

  it('rejette les jetons différents ou manquants', () => {
    expect(verifyCsrf('aaaa', 'bbbb')).toBe(false);
    expect(verifyCsrf(undefined, 'bbbb')).toBe(false);
    expect(verifyCsrf('aaaa', undefined)).toBe(false);
    expect(verifyCsrf('', '')).toBe(false);
  });
});
