import { createRemoteJWKSet } from 'jose';
import { loadEnv } from './config/env';
import { GOOGLE_JWKS_URI } from './auth/oidc';
import { buildApp } from './app';
import { createAuthStores, createGameStores } from './store';
import { buildBank } from './play/bank';
import { MemoryAttemptStore } from './play/attempt';
import { MemoryProgressStore } from './play/progress';
import { MemoryDailyStore } from './play/daily';

/**
 * Entrée serveur (AUTH-D-8 / APRISMA-D-2). Les stores auth sont choisis par
 * `createAuthStores()` : Prisma/Postgres si `DATABASE_URL` est défini, sinon
 * in-memory (dev sans DB). Les stores de jeu restent in-memory (APRISMA-D-8).
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const auth = createAuthStores();
  const game = createGameStores();
  const app = await buildApp({
    env,
    users: auth.users,
    sessions: auth.sessions,
    tx: auth.tx,
    fetch: globalThis.fetch,
    jwks: createRemoteJWKSet(new URL(GOOGLE_JWKS_URI)),
    bank: buildBank(),
    attempts: new MemoryAttemptStore(),
    progress: new MemoryProgressStore(),
    daily: new MemoryDailyStore(),
    cosmetics: game.cosmetics,
    offlineClears: game.offlineClears,
  });
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`puzzlehub api en écoute sur :${env.PORT}`);
}

main().catch((err) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
