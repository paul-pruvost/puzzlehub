import { PrismaClient } from '@prisma/client';

import {
  MemoryOfflineClearStore,
  MemorySelectionStore,
  MemorySessionStore,
  MemoryTxStore,
  MemoryUserStore,
} from './memory';
import {
  PrismaOfflineClearStore,
  PrismaSelectionStore,
  PrismaSessionStore,
  PrismaTxStore,
  PrismaUserStore,
} from './prisma';
import type {
  OfflineClearStore,
  SelectionStore,
  SessionStore,
  TxStore,
  UserStore,
} from './types';

export interface AuthStores {
  users: UserStore;
  sessions: SessionStore;
  tx: TxStore;
}

export interface GameStores {
  cosmetics: SelectionStore;
  offlineClears: OfflineClearStore;
}

/**
 * Fabrique des stores auth (APRISMA-D-2) :
 *  - `DATABASE_URL` défini → Prisma/Postgres (prod) ;
 *  - sinon → in-memory (dev sans DB + tests/CI verts sans Postgres).
 *
 * Un seul `PrismaClient` partagé entre les stores.
 */
export function createAuthStores(databaseUrl: string | undefined = process.env.DATABASE_URL): AuthStores {
  if (!databaseUrl) {
    return {
      users: new MemoryUserStore(),
      sessions: new MemorySessionStore(),
      tx: new MemoryTxStore(),
    };
  }
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  return {
    users: new PrismaUserStore(prisma),
    sessions: new PrismaSessionStore(prisma),
    tx: new PrismaTxStore(prisma),
  };
}

/**
 * Fabrique des stores de jeu persistants (COSM-D-5). Même critère `DATABASE_URL`
 * que {@link createAuthStores}, sans polluer la factory auth (les stores de jeu
 * étaient jusqu'ici montés à la main — APRISMA-D-8). Prépare la migration des
 * autres stores de jeu (progress/daily) vers Prisma.
 */
export function createGameStores(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
): GameStores {
  if (!databaseUrl) {
    return {
      cosmetics: new MemorySelectionStore(),
      offlineClears: new MemoryOfflineClearStore(),
    };
  }
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  return {
    cosmetics: new PrismaSelectionStore(prisma),
    offlineClears: new PrismaOfflineClearStore(prisma),
  };
}
