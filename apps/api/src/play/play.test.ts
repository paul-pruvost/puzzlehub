import { describe, it, expect, beforeAll } from 'vitest';
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  createLocalJWKSet,
  type JWTVerifyGetKey,
} from 'jose';
import type { FastifyInstance } from 'fastify';
import type { TangoBoard, TangoPuzzle } from '@puzzlehub/engine';
import { tangoEngine } from '@puzzlehub/engine/server';
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
import { signStartToken } from './token';
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
  clock: { t: number };
  sid: string;
  csrf: string;
}

async function setup(): Promise<Ctx> {
  const clock = { t: 1_000_000 };
  const tx = new MemoryTxStore();
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
    progress: new MemoryProgressStore(),
    daily: new MemoryDailyStore(),
    cosmetics: new MemorySelectionStore(),
    offlineClears: new MemoryOfflineClearStore(),
    now: () => clock.t,
  });

  // Login OIDC mocké.
  tokenHolder.value = await signId('N');
  const txId = await tx.create({ state: 'S', nonce: 'N', verifier: 'V' }, 600_000);
  const cb = await app.inject({
    method: 'GET',
    url: '/auth/google/callback?code=abc&state=S',
    cookies: { oidc_tx: app.signCookie(txId) },
  });
  const sid = cb.cookies.find((c) => c.name === 'sid')?.value ?? '';
  const csrf = cb.cookies.find((c) => c.name === 'csrf')?.value ?? '';
  return { app, clock, sid, csrf };
}

async function start(ctx: Ctx) {
  return ctx.app.inject({
    method: 'POST',
    url: '/play/start',
    cookies: { sid: ctx.sid, csrf: ctx.csrf },
    headers: { 'x-csrf-token': ctx.csrf },
    payload: { game: 'tango', difficulty: 'facile' },
  });
}

async function submit(ctx: Ctx, token: string, board: unknown) {
  return ctx.app.inject({
    method: 'POST',
    url: '/play/submit',
    cookies: { sid: ctx.sid, csrf: ctx.csrf },
    headers: { 'x-csrf-token': ctx.csrf },
    payload: { token, board },
  });
}

describe('boucle de jeu solo (anti-triche)', () => {
  it('start exige une session', async () => {
    const ctx = await setup();
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/play/start',
      payload: { game: 'tango', difficulty: 'facile' },
    });
    expect(r.statusCode).toBe(401);
  });

  it('start ne révèle jamais la solution', async () => {
    const ctx = await setup();
    const r = await start(ctx);
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.token).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('solution');
    expect(body.puzzle).toBeTruthy();
  });

  it('soumission valide → accepté, temps serveur indépendant du client', async () => {
    const ctx = await setup();
    const s = await start(ctx);
    const { token, puzzle } = s.json();
    const board = tangoEngine.solve(puzzle as TangoPuzzle) as TangoBoard;
    ctx.clock.t += 5000; // 5 s côté serveur
    const r = await submit(ctx, token, board);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ accepted: true, valid: true, status: 'valid', timeMs: 5000 });
  });

  it('rejette une résolution valide trop rapide (anti-bot)', async () => {
    const ctx = await setup();
    const s = await start(ctx);
    const { token, puzzle } = s.json();
    const board = tangoEngine.solve(puzzle as TangoPuzzle) as TangoBoard;
    ctx.clock.t += 100; // 100 ms : humainement impossible
    const r = await submit(ctx, token, board);
    expect(r.json()).toMatchObject({ accepted: false, reason: 'too_fast' });
  });

  it('une grille incomplète → valid:false', async () => {
    const ctx = await setup();
    const s = await start(ctx);
    const { token } = s.json();
    const empty: TangoBoard = Array.from({ length: 6 }, () => Array(6).fill(null));
    ctx.clock.t += 5000;
    const r = await submit(ctx, token, empty);
    expect(r.json()).toMatchObject({ accepted: true, valid: false });
  });

  it('rejette un token falsifié', async () => {
    const ctx = await setup();
    const r = await submit(ctx, 'pas-un-vrai-token', []);
    expect(r.statusCode).toBe(401);
  });

  it('rejette le rejeu d’un attempt (usage unique)', async () => {
    const ctx = await setup();
    const s = await start(ctx);
    const { token, puzzle } = s.json();
    const board = tangoEngine.solve(puzzle as TangoPuzzle) as TangoBoard;
    ctx.clock.t += 5000;
    await submit(ctx, token, board);
    const replay = await submit(ctx, token, board);
    expect(replay.statusCode).toBe(409);
  });

  it('rejette un token expiré', async () => {
    const ctx = await setup();
    const s = await start(ctx);
    const { token, puzzle } = s.json();
    const board = tangoEngine.solve(puzzle as TangoPuzzle) as TangoBoard;
    ctx.clock.t += 31 * 60_000; // au-delà du TTL 30 min
    const r = await submit(ctx, token, board);
    expect(r.statusCode).toBe(410);
  });

  it('rejette un token appartenant à un autre utilisateur', async () => {
    const ctx = await setup();
    const forged = signStartToken(
      { attemptId: 'x', puzzleId: 'p', userId: 'autre-user', startedAt: ctx.clock.t },
      env.COOKIE_SECRET,
    );
    const r = await submit(ctx, forged, []);
    expect(r.statusCode).toBe(403);
  });

  it('start/submit exigent le CSRF', async () => {
    const ctx = await setup();
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/play/start',
      cookies: { sid: ctx.sid, csrf: ctx.csrf },
      payload: { game: 'tango', difficulty: 'facile' },
    });
    expect(r.statusCode).toBe(403);
  });

  function progress(ctx: Ctx) {
    return ctx.app.inject({ method: 'GET', url: '/me/progress', cookies: { sid: ctx.sid } });
  }

  function daily(ctx: Ctx) {
    return ctx.app.inject({
      method: 'POST',
      url: '/play/daily',
      cookies: { sid: ctx.sid, csrf: ctx.csrf },
      headers: { 'x-csrf-token': ctx.csrf },
      payload: { game: 'tango' },
    });
  }

  it('crédite l’XP sur résolution valide (Facile = 10)', async () => {
    const ctx = await setup();
    const s = await start(ctx);
    const { token, puzzle } = s.json();
    const board = tangoEngine.solve(puzzle as TangoPuzzle) as TangoBoard;
    ctx.clock.t += 5000;
    const r = await submit(ctx, token, board);
    expect(r.json()).toMatchObject({ accepted: true, valid: true, xpGained: 10, xp: 10 });
    expect((await progress(ctx)).json()).toMatchObject({ xp: 10, level: 0 });
  });

  it('ne crédite pas d’XP sur grille incomplète', async () => {
    const ctx = await setup();
    const s = await start(ctx);
    const { token } = s.json();
    const empty: TangoBoard = Array.from({ length: 6 }, () => Array(6).fill(null));
    ctx.clock.t += 5000;
    expect((await submit(ctx, token, empty)).json()).toMatchObject({ valid: false, xpGained: 0 });
    expect((await progress(ctx)).json()).toMatchObject({ xp: 0 });
  });

  it('ne crédite pas d’XP si trop rapide', async () => {
    const ctx = await setup();
    const s = await start(ctx);
    const { token, puzzle } = s.json();
    const board = tangoEngine.solve(puzzle as TangoPuzzle) as TangoBoard;
    ctx.clock.t += 100;
    await submit(ctx, token, board);
    expect((await progress(ctx)).json()).toMatchObject({ xp: 0 });
  });

  it('défi quotidien : bonus XP (+50%) et une seule tentative par jour', async () => {
    const ctx = await setup();
    const d1 = await daily(ctx);
    expect(d1.statusCode).toBe(200);
    const { token, puzzle } = d1.json();
    const board = tangoEngine.solve(puzzle as TangoPuzzle) as TangoBoard;
    ctx.clock.t += 5000;
    expect((await submit(ctx, token, board)).json()).toMatchObject({ valid: true, xpGained: 30 });
    expect((await daily(ctx)).statusCode).toBe(409);
  });
});
