import { describe, it, expect, beforeAll } from 'vitest';
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  createLocalJWKSet,
  type JWTVerifyGetKey,
} from 'jose';
import type { FastifyInstance } from 'fastify';
import { OFFLINE_BANK_SIZE } from '@puzzlehub/shared';
import { buildApp } from '../app';
import {
  MemoryOfflineClearStore,
  MemorySelectionStore,
  MemorySessionStore,
  MemoryTxStore,
  MemoryUserStore,
} from '../store/memory';
import { buildBank } from './bank';
import { MemoryAttemptStore } from './attempt';
import { MemoryProgressStore } from './progress';
import { MemoryDailyStore } from './daily';
import type { Env } from '../config/env';

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

async function signId(nonce: string): Promise<string> {
  return new SignJWT({ sub: 'g1', email: 'alice@example.com', email_verified: true, name: 'Alice', nonce })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuedAt()
    .setIssuer('https://accounts.google.com')
    .setAudience(env.GOOGLE_CLIENT_ID)
    .setExpirationTime('5m')
    .sign(privateKey);
}

interface Ctx {
  app: FastifyInstance;
  progress: MemoryProgressStore;
  offline: MemoryOfflineClearStore;
  sid: string;
  csrf: string;
}

async function setup(): Promise<Ctx> {
  const tx = new MemoryTxStore();
  const progress = new MemoryProgressStore();
  const offline = new MemoryOfflineClearStore();
  const tokenHolder = { value: '' };
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ id_token: tokenHolder.value }), {
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
    progress,
    daily: new MemoryDailyStore(),
    cosmetics: new MemorySelectionStore(),
    offlineClears: offline,
  });

  tokenHolder.value = await signId('N');
  const txId = await tx.create({ state: 'S', nonce: 'N', verifier: 'V' }, 600_000);
  const cb = await app.inject({
    method: 'GET',
    url: '/auth/google/callback?code=abc&state=S',
    cookies: { oidc_tx: app.signCookie(txId) },
  });
  const sid = cb.cookies.find((c) => c.name === 'sid')?.value ?? '';
  const csrf = cb.cookies.find((c) => c.name === 'csrf')?.value ?? '';
  return { app, progress, offline, sid, csrf };
}

function clear(
  ctx: Ctx,
  body: Record<string, unknown>,
  opts: { csrf?: boolean } = {},
) {
  const withCsrf = opts.csrf !== false;
  return ctx.app.inject({
    method: 'POST',
    url: '/me/offline/clear',
    cookies: { sid: ctx.sid, csrf: ctx.csrf },
    headers: withCsrf ? { 'x-csrf-token': ctx.csrf } : {},
    payload: body,
  });
}

function sync(ctx: Ctx, clears: Record<string, unknown>) {
  return ctx.app.inject({
    method: 'POST',
    url: '/me/offline/sync',
    cookies: { sid: ctx.sid, csrf: ctx.csrf },
    headers: { 'x-csrf-token': ctx.csrf },
    payload: { clears },
  });
}

function progress(ctx: Ctx) {
  return ctx.app.inject({ method: 'GET', url: '/me/progress', cookies: { sid: ctx.sid } });
}

describe('progression hors-ligne (OFLP-D-2/D-3/D-6)', () => {
  it('clear : first-clear crédite, rejouer le même slot ne recrédite pas (idempotent)', async () => {
    const ctx = await setup();
    const r1 = await clear(ctx, { game: 'tango', difficulty: 'facile', index: 0 });
    expect(r1.statusCode).toBe(200);
    expect(r1.json()).toMatchObject({ credited: true, xp: 10 });
    const level1 = r1.json().level;

    const r2 = await clear(ctx, { game: 'tango', difficulty: 'facile', index: 0 });
    expect(r2.json()).toMatchObject({ credited: false, xp: 10, level: level1 });
  });

  it('clear : niveaux distincts cumulent l’XP (Facile = 10 chacun)', async () => {
    const ctx = await setup();
    await clear(ctx, { game: 'tango', difficulty: 'facile', index: 0 });
    const r = await clear(ctx, { game: 'tango', difficulty: 'facile', index: 1 });
    expect(r.json()).toMatchObject({ credited: true, xp: 20 });
  });

  it('clear : index hors borne (>= OFFLINE_BANK_SIZE) → 400', async () => {
    const ctx = await setup();
    const r = await clear(ctx, { game: 'tango', difficulty: 'facile', index: OFFLINE_BANK_SIZE });
    expect(r.statusCode).toBe(400);
  });

  it('clear : index négatif → 400', async () => {
    const ctx = await setup();
    const r = await clear(ctx, { game: 'tango', difficulty: 'facile', index: -1 });
    expect(r.statusCode).toBe(400);
  });

  it('clear : jeu inconnu → 400', async () => {
    const ctx = await setup();
    const r = await clear(ctx, { game: 'nope', difficulty: 'facile', index: 0 });
    expect(r.statusCode).toBe(400);
  });

  it('clear : exige une session (401)', async () => {
    const ctx = await setup();
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/me/offline/clear',
      payload: { game: 'tango', difficulty: 'facile', index: 0 },
    });
    expect(r.statusCode).toBe(401);
  });

  it('clear : exige le CSRF (403)', async () => {
    const ctx = await setup();
    const r = await clear(ctx, { game: 'tango', difficulty: 'facile', index: 0 }, { csrf: false });
    expect(r.statusCode).toBe(403);
  });

  it('clear : rate-limit → 429 au-delà du bucket (60/min)', async () => {
    const ctx = await setup();
    let last = 200;
    for (let i = 0; i < 65; i++) {
      const r = await clear(ctx, {
        game: 'tango',
        difficulty: 'facile',
        index: i % OFFLINE_BANK_SIZE,
      });
      last = r.statusCode;
      if (last === 429) break;
    }
    expect(last).toBe(429);
  });

  it('/me/progress reflète la somme classé + hors-ligne', async () => {
    const ctx = await setup();
    // XP classé simulée directement dans le store (sommant disjoint).
    await ctx.progress.award('not-this-user', 'a1', 999); // bruit, autre user
    const ranked = await ctx.app.inject({ method: 'GET', url: '/me/progress', cookies: { sid: ctx.sid } });
    expect(ranked.json()).toMatchObject({ xp: 0 });

    await clear(ctx, { game: 'tango', difficulty: 'facile', index: 0 });
    await clear(ctx, { game: 'queens', difficulty: 'moyen', index: 0 }); // +20
    const r = await progress(ctx);
    expect(r.json()).toMatchObject({ xp: 30 });
  });

  it('/me/offline/sync : OR-merge idempotent des masques', async () => {
    const ctx = await setup();
    await clear(ctx, { game: 'tango', difficulty: 'facile', index: 0 }); // bit 0
    // sync ajoute le bit 2 ; le bit 0 déjà présent ne double-compte pas.
    const r = await sync(ctx, { tango: { facile: 0b101 } });
    expect(r.statusCode).toBe(200);
    expect(r.json().clears.tango.facile).toBe(0b101);
    // 2 niveaux distincts (bits 0 et 2) × 10 = 20.
    expect(r.json().xp).toBe(20);
  });

  it('/me/offline/sync : ignore les clés inconnues / clamp hors-banque', async () => {
    const ctx = await setup();
    const overflowBit = 1 << OFFLINE_BANK_SIZE; // au-delà de la banque
    const r = await sync(ctx, {
      tango: { facile: 0b1, difficile: overflowBit },
      bogus: { facile: 0b1 },
    });
    expect(r.statusCode).toBe(200);
    const clears = r.json().clears;
    expect(clears.tango.facile).toBe(0b1);
    // difficile : seul le bit hors-banque était présent → clampé à 0 → absent.
    expect(clears.tango.difficile ?? 0).toBe(0);
    expect(clears.bogus).toBeUndefined();
    expect(r.json().xp).toBe(10);
  });
});

describe('MemoryOfflineClearStore.claim (unitaire)', () => {
  it('est idempotent : 2ᵉ claim du même slot → credited:false', async () => {
    const store = new MemoryOfflineClearStore();
    const first = await store.claim('u1', 'tango', 'facile', 3);
    expect(first.credited).toBe(true);
    const second = await store.claim('u1', 'tango', 'facile', 3);
    expect(second.credited).toBe(false);
    expect(second.clears.tango?.facile).toBe(first.clears.tango?.facile);
  });

  it('refuse un index hors borne (non crédité)', async () => {
    const store = new MemoryOfflineClearStore();
    const r = await store.claim('u1', 'tango', 'facile', OFFLINE_BANK_SIZE);
    expect(r.credited).toBe(false);
    expect(r.clears.tango).toBeUndefined();
  });
});
