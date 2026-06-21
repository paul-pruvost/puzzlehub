import { describe, it, expect } from 'vitest';
import { signStartToken, verifyStartToken } from './token';

const SECRET = 'a-test-secret-of-sufficient-length-1234';
const payload = { attemptId: 'a1', puzzleId: 'p1', userId: 'u1', startedAt: 1000 };

describe('token de début', () => {
  it('signe puis vérifie un token valide', () => {
    const t = signStartToken(payload, SECRET);
    expect(verifyStartToken(t, SECRET)).toEqual(payload);
  });

  it('rejette une signature falsifiée', () => {
    const t = signStartToken(payload, SECRET);
    const tampered = `${t.slice(0, -2)}xx`;
    expect(verifyStartToken(tampered, SECRET)).toBeNull();
  });

  it('rejette un mauvais secret', () => {
    const t = signStartToken(payload, SECRET);
    expect(verifyStartToken(t, 'autre-secret')).toBeNull();
  });

  it('rejette un payload corrompu', () => {
    const fake = `${Buffer.from('{"attemptId":1}').toString('base64url')}.zzz`;
    expect(verifyStartToken(fake, SECRET)).toBeNull();
    expect(verifyStartToken('pas-un-token', SECRET)).toBeNull();
  });
});
