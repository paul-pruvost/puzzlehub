import { describe, it, expect, beforeAll } from 'vitest';
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  createLocalJWKSet,
  type JWTVerifyGetKey,
} from 'jose';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import {
  MemoryOfflineClearStore,
  MemorySelectionStore,
  MemorySessionStore,
  MemoryTxStore,
  MemoryUserStore,
} from './store/memory';
import { buildBank } from './play/bank';
import { MemoryAttemptStore } from './play/attempt';
import { MemoryProgressStore } from './play/progress';
import { MemoryDailyStore } from './play/daily';
import type { TxStore } from './store/types';
import type { Env } from './config/env';

const env: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  WEB_ORIGIN: 'http://localhost:5173',
  COOKIE_SECRET: 'test-cookie-secret-of-at-least-32-chars!!',
  GOOGLE_CLIENT_ID: 'client-123',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback',
  SESSION_TTL_HOURS: 168,
  TRUST_PROXY_HOPS: 0,
};

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

async function signId(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuedAt()
    .setIssuer('https://accounts.google.com')
    .setAudience(env.GOOGLE_CLIENT_ID)
    .setExpirationTime('5m')
    .sign(privateKey);
}

async function freshApp(): Promise<{
  app: FastifyInstance;
  token: { value: string };
  tx: TxStore;
}> {
  const token = { value: '' };
  const tx = new MemoryTxStore();
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ id_token: token.value }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;
  const app = await buildApp({
    env,
    users: new MemoryUserStore(),
    sessions: new MemorySessionStore(),
    tx,
    fetch: fetchImpl,
    jwks,
    tokenEndpoint: 'https://token.test/',
    bank: buildBank({ games: ['tango'], difficulties: ['facile'], perCombo: 1 }),
    attempts: new MemoryAttemptStore(),
    progress: new MemoryProgressStore(),
    daily: new MemoryDailyStore(),
    cosmetics: new MemorySelectionStore(),
    offlineClears: new MemoryOfflineClearStore(),
  });
  return { app, token, tx };
}

/** Crée une transaction OIDC côté serveur et renvoie le cookie signé correspondant. */
async function txCookie(
  app: FastifyInstance,
  tx: TxStore,
  state: string,
  nonce: string,
): Promise<string> {
  const id = await tx.create({ state, nonce, verifier: 'VERIFIER' }, 600_000);
  return app.signCookie(id);
}

async function login(app: FastifyInstance, token: { value: string }, tx: TxStore) {
  token.value = await signId({
    sub: 'g1',
    email: 'alice@example.com',
    email_verified: true,
    name: 'Alice',
    nonce: 'N',
  });
  const res = await app.inject({
    method: 'GET',
    url: '/auth/google/callback?code=abc&state=STATE',
    cookies: { oidc_tx: await txCookie(app, tx, 'STATE', 'N') },
  });
  const sid = res.cookies.find((c) => c.name === 'sid');
  const csrf = res.cookies.find((c) => c.name === 'csrf');
  return { res, sid, csrf };
}

describe('API auth', () => {
  it('/auth/me sans session → 401', async () => {
    const { app } = await freshApp();
    const r = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(r.statusCode).toBe(401);
  });

  it('login Google complet → session + /auth/me', async () => {
    const { app, token, tx } = await freshApp();
    const { res, sid } = await login(app, token, tx);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(env.WEB_ORIGIN);
    expect(sid).toBeTruthy();

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { sid: sid?.value ?? '' },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email: 'alice@example.com', displayName: 'Alice' });
  });

  it('callback avec state incohérent → 400 state_mismatch', async () => {
    const { app, token, tx } = await freshApp();
    token.value = await signId({ sub: 'g1', email: 'a@b.com', email_verified: true, nonce: 'N' });
    const res = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=abc&state=WRONG',
      cookies: { oidc_tx: await txCookie(app, tx, 'STATE', 'N') },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'state_mismatch' });
  });

  it('callback avec id_token au nonce falsifié → 401', async () => {
    const { app, token, tx } = await freshApp();
    token.value = await signId({ sub: 'g1', email: 'a@b.com', email_verified: true, nonce: 'BAD' });
    const res = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=abc&state=STATE',
      cookies: { oidc_tx: await txCookie(app, tx, 'STATE', 'N') },
    });
    expect(res.statusCode).toBe(401);
  });

  it('callback avec email non vérifié → 403', async () => {
    const { app, token, tx } = await freshApp();
    token.value = await signId({ sub: 'g1', email: 'a@b.com', email_verified: false, nonce: 'N' });
    const res = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=abc&state=STATE',
      cookies: { oidc_tx: await txCookie(app, tx, 'STATE', 'N') },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejette le rejeu du même callback (transaction à usage unique, SEC-C1)', async () => {
    const { app, token, tx } = await freshApp();
    token.value = await signId({
      sub: 'g1',
      email: 'alice@example.com',
      email_verified: true,
      nonce: 'N',
    });
    const cookie = await txCookie(app, tx, 'STATE', 'N');
    const first = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=abc&state=STATE',
      cookies: { oidc_tx: cookie },
    });
    expect(first.statusCode).toBe(302);
    const replay = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=abc&state=STATE',
      cookies: { oidc_tx: cookie },
    });
    expect(replay.statusCode).toBe(400);
    expect(replay.json()).toMatchObject({ error: 'tx_expired' });
  });

  it('logout exige le CSRF puis détruit la session', async () => {
    const { app, token, tx } = await freshApp();
    const { sid, csrf } = await login(app, token, tx);

    const noCsrf = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { sid: sid?.value ?? '', csrf: csrf?.value ?? '' },
    });
    expect(noCsrf.statusCode).toBe(403);

    const ok = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { sid: sid?.value ?? '', csrf: csrf?.value ?? '' },
      headers: { 'x-csrf-token': csrf?.value ?? '' },
    });
    expect(ok.statusCode).toBe(204);

    const me = await app.inject({ method: 'GET', url: '/auth/me', cookies: { sid: sid?.value ?? '' } });
    expect(me.statusCode).toBe(401);
  });

  it('suppression de compte exige le CSRF et purge l’utilisateur (RGPD)', async () => {
    const { app, token, tx } = await freshApp();
    const { sid, csrf } = await login(app, token, tx);

    const noCsrf = await app.inject({
      method: 'DELETE',
      url: '/account',
      cookies: { sid: sid?.value ?? '', csrf: csrf?.value ?? '' },
    });
    expect(noCsrf.statusCode).toBe(403);

    const ok = await app.inject({
      method: 'DELETE',
      url: '/account',
      cookies: { sid: sid?.value ?? '', csrf: csrf?.value ?? '' },
      headers: { 'x-csrf-token': csrf?.value ?? '' },
    });
    expect(ok.statusCode).toBe(204);

    const me = await app.inject({ method: 'GET', url: '/auth/me', cookies: { sid: sid?.value ?? '' } });
    expect(me.statusCode).toBe(401);
  });
});

describe('API cosmétiques (COSM-D-2/3)', () => {
  it('GET /me/cosmetics sans session → 401', async () => {
    const { app } = await freshApp();
    const r = await app.inject({ method: 'GET', url: '/me/cosmetics' });
    expect(r.statusCode).toBe(401);
  });

  it('GET /me/cosmetics reflète niveau, débloqués et équipés (user niveau 0)', async () => {
    const { app, token, tx } = await freshApp();
    const { sid } = await login(app, token, tx);
    const r = await app.inject({
      method: 'GET',
      url: '/me/cosmetics',
      cookies: { sid: sid?.value ?? '' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      level: 0,
      unlocked: ['palette-default', 'skin-default', 'theme-default'],
      equipped: { palette: 'palette-default', pieceSkin: 'skin-default', boardTheme: 'theme-default' },
    });
  });

  it('select exige le CSRF', async () => {
    const { app, token, tx } = await freshApp();
    const { sid, csrf } = await login(app, token, tx);
    const r = await app.inject({
      method: 'POST',
      url: '/me/cosmetics/select',
      cookies: { sid: sid?.value ?? '', csrf: csrf?.value ?? '' },
      payload: { id: 'palette-default' },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ error: 'csrf' });
  });

  it('select 400 sur id inconnu', async () => {
    const { app, token, tx } = await freshApp();
    const { sid, csrf } = await login(app, token, tx);
    const r = await app.inject({
      method: 'POST',
      url: '/me/cosmetics/select',
      cookies: { sid: sid?.value ?? '', csrf: csrf?.value ?? '' },
      headers: { 'x-csrf-token': csrf?.value ?? '' },
      payload: { id: 'inexistant' },
    });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: 'unknown_cosmetic' });
  });

  it('select 403 locked sur cosmétique non débloqué (niveau insuffisant)', async () => {
    const { app, token, tx } = await freshApp();
    const { sid, csrf } = await login(app, token, tx);
    const r = await app.inject({
      method: 'POST',
      url: '/me/cosmetics/select',
      cookies: { sid: sid?.value ?? '', csrf: csrf?.value ?? '' },
      headers: { 'x-csrf-token': csrf?.value ?? '' },
      payload: { id: 'palette-emerald' },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ error: 'locked' });
  });

  it('select 200 sur cosmétique débloqué → equipped mis à jour, idempotent', async () => {
    const { app, token, tx } = await freshApp();
    const { sid, csrf } = await login(app, token, tx);
    const inject = () =>
      app.inject({
        method: 'POST',
        url: '/me/cosmetics/select',
        cookies: { sid: sid?.value ?? '', csrf: csrf?.value ?? '' },
        headers: { 'x-csrf-token': csrf?.value ?? '' },
        payload: { id: 'skin-default' },
      });
    const r1 = await inject();
    expect(r1.statusCode).toBe(200);
    expect(r1.json()).toMatchObject({ equipped: { pieceSkin: 'skin-default' } });
    const r2 = await inject();
    expect(r2.statusCode).toBe(200);
  });
});
