import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { createPkcePair, generateNonce, generateState, randomToken } from './pkce';

describe('pkce', () => {
  it('challenge = base64url(sha256(verifier))', () => {
    const { verifier, challenge } = createPkcePair();
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });

  it('produit des jetons aléatoires uniques et de taille suffisante', () => {
    expect(generateState()).not.toBe(generateState());
    expect(generateNonce()).not.toBe(generateNonce());
    expect(randomToken(32).length).toBeGreaterThanOrEqual(43);
  });
});
