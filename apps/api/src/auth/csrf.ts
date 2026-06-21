import { timingSafeEqual } from 'node:crypto';
import { randomToken } from './pkce';

export function generateCsrfToken(): string {
  return randomToken(32);
}

/** Vérifie le double-submit CSRF en temps constant (AUTH-D-5). */
export function verifyCsrf(cookieToken: string | undefined, headerToken: unknown): boolean {
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') return false;
  if (cookieToken.length === 0 || cookieToken.length !== headerToken.length) return false;
  return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}
