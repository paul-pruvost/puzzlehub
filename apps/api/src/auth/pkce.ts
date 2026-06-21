import { createHash, randomBytes } from 'node:crypto';

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

/** Jeton aléatoire base64url (défaut 32 octets ≈ 256 bits). */
export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

/** Paire PKCE : `verifier` secret + `challenge` S256 (AUTH-D-2). */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomToken(32);
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return randomToken(32);
}

export function generateNonce(): string {
  return randomToken(32);
}
