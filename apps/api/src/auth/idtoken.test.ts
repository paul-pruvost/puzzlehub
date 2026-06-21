import { describe, it, expect, beforeAll } from 'vitest';
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  createLocalJWKSet,
  type JWTVerifyGetKey,
} from 'jose';
import { IdTokenError, verifyIdToken } from './idtoken';

const ISS = 'https://accounts.google.com';
const AUD = 'client-123';

let jwks: JWTVerifyGetKey;
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

beforeAll(async () => {
  const kp = await generateKeyPair('RS256');
  privateKey = kp.privateKey;
  const jwk = await exportJWK(kp.publicKey);
  jwk.kid = 'test';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  jwks = createLocalJWKSet({ keys: [jwk] });
});

async function sign(
  payload: Record<string, unknown>,
  opts: { iss?: string; aud?: string; exp?: string | number } = {},
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuedAt()
    .setIssuer(opts.iss ?? ISS)
    .setAudience(opts.aud ?? AUD)
    .setExpirationTime(opts.exp ?? '5m')
    .sign(privateKey);
}

describe('verifyIdToken', () => {
  it('accepte un token valide et renvoie les claims', async () => {
    const t = await sign({ sub: 'g1', email: 'a@b.com', email_verified: true, nonce: 'N' });
    const c = await verifyIdToken(t, { keys: jwks, issuer: ISS, audience: AUD, nonce: 'N' });
    expect(c.sub).toBe('g1');
    expect(c.email).toBe('a@b.com');
  });

  it('rejette une mauvaise audience', async () => {
    const t = await sign({ sub: 'g1', nonce: 'N' }, { aud: 'autre-client' });
    await expect(
      verifyIdToken(t, { keys: jwks, issuer: ISS, audience: AUD, nonce: 'N' }),
    ).rejects.toBeInstanceOf(IdTokenError);
  });

  it('rejette un mauvais issuer', async () => {
    const t = await sign({ sub: 'g1', nonce: 'N' }, { iss: 'https://evil.example' });
    await expect(
      verifyIdToken(t, { keys: jwks, issuer: ISS, audience: AUD, nonce: 'N' }),
    ).rejects.toBeInstanceOf(IdTokenError);
  });

  it('rejette un nonce qui ne correspond pas', async () => {
    const t = await sign({ sub: 'g1', nonce: 'N' });
    await expect(
      verifyIdToken(t, { keys: jwks, issuer: ISS, audience: AUD, nonce: 'AUTRE' }),
    ).rejects.toBeInstanceOf(IdTokenError);
  });

  it('rejette un token expiré', async () => {
    const t = await sign({ sub: 'g1', nonce: 'N' }, { exp: Math.floor(Date.now() / 1000) - 60 });
    await expect(
      verifyIdToken(t, { keys: jwks, issuer: ISS, audience: AUD, nonce: 'N' }),
    ).rejects.toBeInstanceOf(IdTokenError);
  });

  it('rejette une signature provenant d’une autre clé', async () => {
    const other = await generateKeyPair('RS256');
    const t = await new SignJWT({ sub: 'g1', nonce: 'N' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuedAt()
      .setIssuer(ISS)
      .setAudience(AUD)
      .setExpirationTime('5m')
      .sign(other.privateKey);
    await expect(
      verifyIdToken(t, { keys: jwks, issuer: ISS, audience: AUD, nonce: 'N' }),
    ).rejects.toBeInstanceOf(IdTokenError);
  });
});
