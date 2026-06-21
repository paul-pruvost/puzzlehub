import { createHmac, timingSafeEqual } from 'node:crypto';

/** Charge utile du token de début (signé HMAC, PLAY-D-3). */
export interface StartTokenPayload {
  attemptId: string;
  puzzleId: string;
  userId: string;
  startedAt: number;
}

function b64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

export function signStartToken(payload: StartTokenPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const mac = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

/** Vérifie l'intégrité (HMAC temps constant) et la forme. `null` si invalide. */
export function verifyStartToken(token: string, secret: string): StartTokenPayload | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (
      typeof p.attemptId === 'string' &&
      typeof p.puzzleId === 'string' &&
      typeof p.userId === 'string' &&
      typeof p.startedAt === 'number'
    ) {
      return p as unknown as StartTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}
