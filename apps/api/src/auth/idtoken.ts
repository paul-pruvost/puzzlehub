import { jwtVerify, type JWTPayload, type JWTVerifyGetKey, type KeyLike } from 'jose';

export interface IdTokenClaims extends JWTPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export interface VerifyIdTokenParams {
  /** Résolveur de clé : JWKS distant (prod) ou JWKS local (tests). */
  keys: JWTVerifyGetKey | KeyLike | Uint8Array;
  issuer: string | string[];
  audience: string;
  nonce: string;
}

export class IdTokenError extends Error {}

/**
 * Valide un `id_token` Google (AUTH-D-3) : signature (RS256 épinglé), iss, aud,
 * exp/iat, puis nonce (anti-replay) et présence du `sub`.
 */
export async function verifyIdToken(
  token: string,
  params: VerifyIdTokenParams,
): Promise<IdTokenClaims> {
  let payload: JWTPayload;
  try {
    const res = await jwtVerify(token, params.keys as JWTVerifyGetKey, {
      issuer: params.issuer,
      audience: params.audience,
      algorithms: ['RS256'],
    });
    payload = res.payload;
  } catch (err) {
    throw new IdTokenError(`id_token invalide: ${(err as Error).message}`);
  }
  if (typeof payload.nonce !== 'string' || payload.nonce !== params.nonce) {
    throw new IdTokenError('nonce_mismatch');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new IdTokenError('missing_sub');
  }
  return payload as IdTokenClaims;
}
