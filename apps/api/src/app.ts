import { timingSafeEqual } from 'node:crypto';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { JWTVerifyGetKey, KeyLike } from 'jose';
import type { Env } from './config/env';
import { createPkcePair, generateNonce, generateState } from './auth/pkce';
import { buildAuthUrl, exchangeCode, GOOGLE_ISSUER } from './auth/oidc';
import { verifyIdToken } from './auth/idtoken';
import { z } from 'zod';
import { generateCsrfToken, verifyCsrf } from './auth/csrf';
import { maskEmail } from './logging/redact';
import type {
  OfflineClearStore,
  SelectionStore,
  SessionStore,
  TxStore,
  User,
  UserStore,
} from './store/types';
import {
  COSMETICS,
  type Difficulty,
  DIFFICULTIES,
  findCosmetic,
  isUnlocked,
  levelForXp,
  OFFLINE_BANK_SIZE,
  offlineXpTotal,
  type OfflineClears,
  unlockedCosmetics,
} from '@puzzlehub/shared';
import { randomToken } from './auth/pkce';
import { PLAYABLE_GAMES, SERVER_GAMES, type Bank, type PlayableGame } from './play/bank';
import type { AttemptStore } from './play/attempt';
import { signStartToken, verifyStartToken } from './play/token';
import type { ProgressStore } from './play/progress';
import { xpForDifficulty, DAILY_MULTIPLIER } from './play/xp';
import { dailyDateKey, dailySeed, type DailyStore } from './play/daily';

export interface AppDeps {
  env: Env;
  users: UserStore;
  sessions: SessionStore;
  /** Transactions OIDC à usage unique (SEC-C1/E1). */
  tx: TxStore;
  /** `fetch` injectable (tests : mock de l'échange de code). */
  fetch: typeof fetch;
  /** Résolveur de clé id_token : JWKS distant (prod) ou local (tests). */
  jwks: JWTVerifyGetKey | KeyLike | Uint8Array;
  /** Endpoint token override (tests). */
  tokenEndpoint?: string;
  /** Banque de puzzles (jeu solo, PLAY-D-1). */
  bank: Bank;
  /** Attempts à usage unique (PLAY-D-4). */
  attempts: AttemptStore;
  /** Progression XP serveur-autoritative (PROG-D-3). */
  progress: ProgressStore;
  /** Suivi du défi quotidien (PROG-D-6). */
  daily: DailyStore;
  /** Sélection de cosmétiques (COSM-D-3). */
  cosmetics: SelectionStore;
  /** Progression hors-ligne first-clear (OFLP-D-2/D-3/D-6). */
  offlineClears: OfflineClearStore;
  /** Horloge injectable pour le temps serveur (PLAY-D-8). */
  now?: () => number;
}

const START_TOKEN_TTL_MS = 30 * 60_000;
const MIN_HUMAN_MS = 1000;

const SID = 'sid';
const CSRF = 'csrf';
const OIDC_TX = 'oidc_tx';
const TX_TTL_MS = 600_000;

function constantEquals(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env } = deps;
  const secure = env.NODE_ENV === 'production';
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'test' ? 'silent' : 'info' },
    trustProxy: env.TRUST_PROXY_HOPS, // SEC-M2 : pas de confiance aveugle au XFF
  });

  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(helmet, { contentSecurityPolicy: true });
  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(rateLimit, {
    max: env.NODE_ENV === 'test' ? 10000 : 100,
    timeWindow: '1 minute',
  });

  const sessionCookieOpts = {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    signed: true,
  };

  /** Crée une session + cookies, en invalidant l'éventuelle session précédente (SEC-E2). */
  const rotateSession = async (
    request: FastifyRequest,
    reply: FastifyReply,
    user: User,
  ): Promise<void> => {
    const oldRaw = request.cookies[SID];
    if (oldRaw) {
      const un = request.unsignCookie(oldRaw);
      if (un.valid && un.value) await deps.sessions.delete(un.value);
    }
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600_000);
    const session = await deps.sessions.create(user.id, expiresAt);
    reply.setCookie(SID, session.id, { ...sessionCookieOpts, maxAge: env.SESSION_TTL_HOURS * 3600 });
    reply.setCookie(CSRF, generateCsrfToken(), {
      path: '/',
      httpOnly: false, // lisible par JS pour le double-submit
      secure,
      sameSite: 'lax',
      maxAge: env.SESSION_TTL_HOURS * 3600,
    });
  };

  const clearAuthCookies = (reply: FastifyReply): void => {
    reply.clearCookie(SID, { path: '/' });
    reply.clearCookie(CSRF, { path: '/' });
  };

  const currentUser = async (request: FastifyRequest): Promise<User | null> => {
    const raw = request.cookies[SID];
    if (!raw) return null;
    const un = request.unsignCookie(raw);
    if (!un.valid || !un.value) return null;
    const session = await deps.sessions.get(un.value);
    if (!session) return null;
    return deps.users.findById(session.userId);
  };

  const requireCsrf = (request: FastifyRequest): boolean =>
    verifyCsrf(request.cookies[CSRF], request.headers['x-csrf-token']);

  app.get('/health', async () => ({ status: 'ok' }));

  // --- Démarrage du flow OIDC (AUTH-D-2) ---
  app.get('/auth/google/start', async (request, reply) => {
    const state = generateState();
    const nonce = generateNonce();
    const { verifier, challenge } = createPkcePair();
    const txId = await deps.tx.create({ state, nonce, verifier }, TX_TTL_MS);
    reply.setCookie(OIDC_TX, txId, {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      signed: true,
      maxAge: TX_TTL_MS / 1000,
    });
    const url = buildAuthUrl({
      clientId: env.GOOGLE_CLIENT_ID,
      redirectUri: env.GOOGLE_REDIRECT_URI,
      state,
      nonce,
      codeChallenge: challenge,
    });
    return reply.redirect(url);
  });

  // --- Callback OIDC (AUTH-D-3) ---
  app.get('/auth/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };
    // Le cookie de transaction est effacé dans TOUS les cas (anti-rejeu, SEC-E1).
    reply.clearCookie(OIDC_TX, { path: '/' });

    if (query.error) return reply.code(400).send({ error: 'oauth_error' });
    if (!query.code || !query.state) return reply.code(400).send({ error: 'missing_params' });

    const rawTx = request.cookies[OIDC_TX];
    if (!rawTx) return reply.code(400).send({ error: 'missing_tx' });
    const unTx = request.unsignCookie(rawTx);
    if (!unTx.valid || !unTx.value) return reply.code(400).send({ error: 'bad_tx' });

    // Consommation atomique à usage unique (SEC-C1/C2/E1).
    const tx = await deps.tx.consume(unTx.value);
    if (!tx) return reply.code(400).send({ error: 'tx_expired' });

    if (!constantEquals(tx.state, query.state)) {
      app.log.warn({ event: 'login_failed', reason: 'state_mismatch' });
      return reply.code(400).send({ error: 'state_mismatch' });
    }

    let idToken: string;
    try {
      const tokens = await exchangeCode(
        { fetch: deps.fetch, tokenEndpoint: deps.tokenEndpoint },
        {
          code: query.code,
          codeVerifier: tx.verifier,
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectUri: env.GOOGLE_REDIRECT_URI,
        },
      );
      idToken = tokens.id_token;
    } catch {
      return reply.code(502).send({ error: 'token_exchange_failed' });
    }

    let claims;
    try {
      claims = await verifyIdToken(idToken, {
        keys: deps.jwks,
        issuer: GOOGLE_ISSUER,
        audience: env.GOOGLE_CLIENT_ID,
        nonce: tx.nonce,
      });
    } catch {
      app.log.warn({ event: 'login_failed', reason: 'invalid_id_token' });
      return reply.code(401).send({ error: 'invalid_id_token' });
    }

    if (claims.email_verified !== true || typeof claims.email !== 'string') {
      app.log.warn({ event: 'login_failed', reason: 'email_not_verified' });
      return reply.code(403).send({ error: 'email_not_verified' });
    }

    const user = await deps.users.upsertByGoogleSub({
      googleSub: claims.sub,
      email: claims.email,
      displayName: claims.name ?? claims.email.split('@')[0] ?? 'Joueur',
      avatarUrl: typeof claims.picture === 'string' ? claims.picture : null,
    });

    await rotateSession(request, reply, user);
    app.log.info({ event: 'login', userId: user.id, email: maskEmail(user.email) });
    return reply.redirect(env.WEB_ORIGIN);
  });

  app.get('/auth/me', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    return reply.send({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
    });
  });

  app.post('/auth/logout', async (request, reply) => {
    if (!requireCsrf(request)) return reply.code(403).send({ error: 'csrf' });
    const raw = request.cookies[SID];
    if (raw) {
      const un = request.unsignCookie(raw);
      if (un.valid && un.value) {
        await deps.sessions.delete(un.value);
        app.log.info({ event: 'logout' });
      }
    }
    clearAuthCookies(reply);
    return reply.code(204).send();
  });

  // --- Suppression de compte (RGPD, AUTH-D-7) ---
  app.delete('/account', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    if (!requireCsrf(request)) return reply.code(403).send({ error: 'csrf' });
    await deps.sessions.deleteAllForUser(user.id);
    await deps.cosmetics.deleteForUser(user.id); // purge cosmétiques (RGPD in-memory, COSM-D-5)
    await deps.offlineClears.deleteForUser(user.id); // purge progression hors-ligne (RGPD, OFLP-D-6)
    await deps.users.deleteById(user.id);
    app.log.info({ event: 'account_deleted', userId: user.id });
    clearAuthCookies(reply);
    return reply.code(204).send();
  });

  // --- Boucle de jeu solo (lot L4, serveur autoritatif) ---
  const now = deps.now ?? ((): number => Date.now());
  const playSecret = env.PLAY_TOKEN_SECRET ?? env.COOKIE_SECRET; // secret HMAC dédié (F3)
  // Rate-limit par route, clé IP + session (F1) : limite le brute-force de boards.
  const playKey = (request: FastifyRequest): string =>
    `${request.ip}:${request.cookies[SID] ?? 'anon'}`;
  const startRoute = { config: { rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: playKey } } };
  const submitRoute = {
    bodyLimit: 16_384, // un board 9×9 fait < 1 Ko ; borne le DoS (F4)
    config: { rateLimit: { max: 30, timeWindow: '1 minute', keyGenerator: playKey } },
  };
  const startBody = z
    .object({
      game: z.enum(['tango', 'queens', 'patches', 'zip']),
      difficulty: z.enum(['facile', 'moyen', 'difficile']),
    })
    .strict();
  const submitBody = z.object({ token: z.string(), board: z.unknown() }).strict();

  app.post('/play/start', startRoute, async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    if (!requireCsrf(request)) return reply.code(403).send({ error: 'csrf' });
    const parsed = startBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });

    const { game, difficulty } = parsed.data;
    const puzzle = deps.bank.getRandom(game, difficulty);
    if (!puzzle) return reply.code(503).send({ error: 'no_puzzle' });

    const attemptId = randomToken(16);
    const startedAt = now();
    await deps.attempts.create({
      id: attemptId,
      userId: user.id,
      puzzleId: puzzle.id,
      game,
      difficulty,
      startedAt,
    });
    const token = signStartToken(
      { attemptId, puzzleId: puzzle.id, userId: user.id, startedAt },
      playSecret,
    );
    // Ne renvoie JAMAIS la solution (FND-D-20). `attemptId` non exposé (F6) : il vit dans le token.
    return reply.send({ token, game, difficulty, puzzle: puzzle.data });
  });

  app.post('/play/submit', submitRoute, async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    if (!requireCsrf(request)) return reply.code(403).send({ error: 'csrf' });
    const parsed = submitBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });

    const payload = verifyStartToken(parsed.data.token, playSecret);
    if (!payload) return reply.code(401).send({ error: 'bad_token' });
    if (payload.userId !== user.id) return reply.code(403).send({ error: 'not_owner' });

    // Temps officiel calculé SERVEUR (PLAY-D-3), le temps client est ignoré.
    const elapsed = now() - payload.startedAt;
    if (elapsed > START_TOKEN_TTL_MS) return reply.code(410).send({ error: 'attempt_expired' });

    const attempt = await deps.attempts.consume(payload.attemptId); // usage unique
    if (!attempt) return reply.code(409).send({ error: 'already_submitted' });
    if (attempt.puzzleId !== payload.puzzleId || attempt.userId !== user.id) {
      return reply.code(400).send({ error: 'attempt_mismatch' });
    }

    const sg = SERVER_GAMES[attempt.game as PlayableGame];
    if (!sg) return reply.code(400).send({ error: 'unknown_game' });
    const puzzle = deps.bank.getById(attempt.puzzleId);
    if (!puzzle) return reply.code(500).send({ error: 'puzzle_gone' });

    const result = sg.validate(puzzle.data, parsed.data.board);
    const valid = result.status === 'valid';

    // Anti-bot : une résolution valide en temps humainement impossible n'est pas créditée.
    if (valid && elapsed < MIN_HUMAN_MS) {
      app.log.warn({ event: 'submit_anomaly', userId: user.id, elapsed });
      return reply.send({ accepted: false, reason: 'too_fast' });
    }

    // Crédit XP serveur-autoritatif, idempotent par attemptId (PROG-D-5).
    let xpGained = 0;
    if (valid) {
      const base = xpForDifficulty(attempt.difficulty);
      const amount = attempt.daily ? Math.floor(base * DAILY_MULTIPLIER) : base;
      const awarded = await deps.progress.award(user.id, attempt.id, amount);
      xpGained = awarded.gained;
    }
    const progress = await deps.progress.get(user.id);

    app.log.info({ event: 'submit', userId: user.id, game: attempt.game, valid, timeMs: elapsed });
    return reply.send({
      accepted: true,
      valid,
      status: result.status,
      timeMs: elapsed,
      xpGained,
      xp: progress.xp,
      level: progress.level,
    });
  });

  /**
   * Niveau global (OFLP-D-3) = `levelForXp(xpClassé + xpHors-ligne)`. L'XP
   * hors-ligne (dérivée des clears) est un SOMMANT DISJOINT de l'XP classé
   * (créditée par attemptId dans `/play/submit`) → aucun double-compte, le
   * classé serveur-autoritatif reste intact.
   */
  const combinedProgress = async (
    userId: string,
  ): Promise<{ xp: number; level: number; clears: OfflineClears }> => {
    const ranked = await deps.progress.get(userId);
    const clears = await deps.offlineClears.get(userId);
    const xp = ranked.xp + offlineXpTotal(clears);
    return { xp, level: levelForXp(xp), clears };
  };

  app.get('/me/progress', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    const { xp, level } = await combinedProgress(user.id);
    return reply.send({ xp, level });
  });

  // --- Cosmétiques (COSM-D-2/COSM-D-3) : éligibilité serveur-only par niveau ---
  app.get('/me/cosmetics', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    const { level } = await combinedProgress(user.id);
    const equipped = await deps.cosmetics.get(user.id);
    return reply.send({
      catalog: COSMETICS,
      level,
      unlocked: unlockedCosmetics(level).map((c) => c.id),
      equipped,
    });
  });

  const selectBody = z.object({ id: z.string() }).strict();
  app.post('/me/cosmetics/select', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    if (!requireCsrf(request)) return reply.code(403).send({ error: 'csrf' });
    const parsed = selectBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });

    const cosmetic = findCosmetic(parsed.data.id);
    if (!cosmetic) return reply.code(400).send({ error: 'unknown_cosmetic' });

    // Éligibilité dérivée du NIVEAU SERVEUR (classé + hors-ligne), jamais d'un champ client (COSM-D-2).
    const { level } = await combinedProgress(user.id);
    if (!isUnlocked(cosmetic.id, level)) return reply.code(403).send({ error: 'locked' });

    const equipped = await deps.cosmetics.set(user.id, cosmetic.category, cosmetic.id);
    return reply.send({ equipped });
  });

  // --- Progression hors-ligne (OFLP-D-2/D-3/D-6) : first-clear non-compétitif ---
  // Rate-limit `playKey` comme `/play/*` ; index borné par OFFLINE_BANK_SIZE ;
  // l'XP créditée est un sommant disjoint du classé (pas de double-compte).
  const offlineRoute = {
    bodyLimit: 16_384,
    config: { rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: playKey } },
  };
  const offlineClearBody = z
    .object({
      game: z.enum(PLAYABLE_GAMES as [PlayableGame, ...PlayableGame[]]),
      difficulty: z.enum(DIFFICULTIES as [Difficulty, ...Difficulty[]]),
      index: z.number().int().min(0).max(OFFLINE_BANK_SIZE - 1),
    })
    .strict();

  app.post('/me/offline/clear', offlineRoute, async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    if (!requireCsrf(request)) return reply.code(403).send({ error: 'csrf' });
    const parsed = offlineClearBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });

    const { game, difficulty, index } = parsed.data;
    const { credited } = await deps.offlineClears.claim(user.id, game, difficulty, index);
    const { xp, level } = await combinedProgress(user.id);
    return reply.send({ credited, xp, level });
  });

  // Masque hors-ligne brut : objet jeu→difficulté→entier (bitmask). Validation
  // lenient — on ignore les clés inconnues et on clamp via `mergeClears`/sanitize.
  const maskRecord = z.record(z.string(), z.number().int());
  const offlineSyncBody = z.object({ clears: z.record(z.string(), maskRecord) }).strict();

  app.post('/me/offline/sync', offlineRoute, async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    if (!requireCsrf(request)) return reply.code(403).send({ error: 'csrf' });
    const parsed = offlineSyncBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });

    // Ne garde que les (jeu, difficulté) connus ; masque clampé à OFFLINE_BANK_SIZE bits.
    const maskCap = (1 << OFFLINE_BANK_SIZE) - 1;
    const sanitized: OfflineClears = {};
    for (const game of PLAYABLE_GAMES) {
      const byDiff = parsed.data.clears[game];
      if (!byDiff) continue;
      for (const d of DIFFICULTIES) {
        const raw = byDiff[d];
        if (typeof raw !== 'number' || raw === 0) continue;
        const masked = (raw & maskCap) >>> 0;
        if (masked === 0) continue;
        (sanitized[game] ??= {})[d] = masked;
      }
    }

    const clears = await deps.offlineClears.sync(user.id, sanitized);
    const { xp, level } = await combinedProgress(user.id);
    return reply.send({ clears, xp, level });
  });

  // --- Défi quotidien (PROG-D-6) ---
  app.post('/play/daily', startRoute, async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    if (!requireCsrf(request)) return reply.code(403).send({ error: 'csrf' });
    const parsed = z
      .object({ game: z.enum(['tango', 'queens', 'patches', 'zip']) })
      .strict()
      .safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });

    const { game } = parsed.data;
    const dateKey = dailyDateKey(new Date(now()));
    // Réservation atomique AVANT toute opération async (F7, anti double-bonus).
    if (!(await deps.daily.claim(user.id, dateKey, game))) {
      return reply.code(409).send({ error: 'already_played' });
    }

    // Même puzzle pour tous ce jour-là : généré à la volée puis mis en banque.
    const puzzleId = `daily:${dateKey}:${game}`;
    let puzzle = deps.bank.getById(puzzleId);
    if (!puzzle) {
      try {
        const data = SERVER_GAMES[game].generate(dailySeed(dateKey, game), 'moyen');
        puzzle = { id: puzzleId, game, difficulty: 'moyen', data };
        deps.bank.put(puzzle);
      } catch {
        return reply.code(503).send({ error: 'daily_unavailable' });
      }
    }

    const attemptId = randomToken(16);
    const startedAt = now();
    await deps.attempts.create({
      id: attemptId,
      userId: user.id,
      puzzleId,
      game,
      difficulty: 'moyen',
      startedAt,
      daily: true,
    });
    const token = signStartToken({ attemptId, puzzleId, userId: user.id, startedAt }, playSecret);
    return reply.send({ token, game, difficulty: 'moyen', daily: true, puzzle: puzzle.data });
  });

  return app;
}
