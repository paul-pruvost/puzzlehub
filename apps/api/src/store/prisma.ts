import type { PrismaClient } from '@prisma/client';

import {
  type CosmeticCategory,
  DEFAULT_COSMETICS,
  type Difficulty,
  type GameId,
  isLevelCleared,
  OFFLINE_BANK_SIZE,
  type OfflineClears,
  setLevelCleared,
} from '@puzzlehub/shared';
import { randomToken } from '../auth/pkce';
import type {
  CosmeticSelection,
  OfflineClearStore,
  OidcTx,
  SelectionStore,
  Session,
  SessionStore,
  TxStore,
  UpsertUserInput,
  User,
  UserStore,
} from './types';

/** Implémentations Prisma/Postgres des stores auth (APRISMA-D-1..6). */

interface DbUser {
  id: string;
  googleSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
}

function toUser(u: DbUser): User {
  return {
    id: u.id,
    googleSub: u.googleSub,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    role: u.role,
  };
}

export class PrismaUserStore implements UserStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertByGoogleSub(input: UpsertUserInput): Promise<User> {
    const u = await this.prisma.user.upsert({
      where: { googleSub: input.googleSub },
      update: { email: input.email, displayName: input.displayName, avatarUrl: input.avatarUrl },
      create: {
        googleSub: input.googleSub,
        email: input.email,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
      },
    });
    return toUser(u);
  }

  async findById(id: string): Promise<User | null> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    return u ? toUser(u) : null;
  }

  async deleteById(id: string): Promise<void> {
    // Idempotent (no-op si absent) ; les sessions sont supprimées en cascade (RGPD, APRISMA-D-6).
    await this.prisma.user.deleteMany({ where: { id } });
  }
}

export class PrismaSessionStore implements SessionStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, expiresAt: Date): Promise<Session> {
    // id à haute entropie côté application (pas un cuid devinable).
    const id = randomToken(32);
    await this.prisma.session.create({ data: { id, userId, expiresAt } });
    return { id, userId, expiresAt };
  }

  async get(id: string): Promise<Session | null> {
    const s = await this.prisma.session.findUnique({ where: { id } });
    if (!s) return null;
    if (s.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.deleteMany({ where: { id } });
      return null;
    }
    return { id: s.id, userId: s.userId, expiresAt: s.expiresAt };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id } });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}

export class PrismaTxStore implements TxStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tx: OidcTx, ttlMs: number): Promise<string> {
    const id = randomToken(24);
    await this.prisma.oidcTx.create({
      data: {
        id,
        state: tx.state,
        nonce: tx.nonce,
        verifier: tx.verifier,
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return id;
  }

  async consume(id: string): Promise<OidcTx | null> {
    // Usage unique + atomique : `delete` exécute un DELETE … RETURNING (une seule
    // requête) → impossible de consommer deux fois, même en concurrence (SEC-C1/E1).
    try {
      const row = await this.prisma.oidcTx.delete({ where: { id } });
      // Supprimé dans tous les cas ; un TTL dépassé n'est jamais rejouable.
      if (row.expiresAt.getTime() <= Date.now()) return null;
      return { state: row.state, nonce: row.nonce, verifier: row.verifier };
    } catch {
      // P2025 : ligne absente (déjà consommée ou inexistante).
      return null;
    }
  }
}

/** Sélection de cosmétiques persistée (COSM-D-5). Cascade RGPD via Prisma. */
export class PrismaSelectionStore implements SelectionStore {
  constructor(private readonly prisma: PrismaClient) {}

  async get(userId: string): Promise<CosmeticSelection> {
    const rows = await this.prisma.cosmeticSelection.findMany({ where: { userId } });
    const picks: Partial<CosmeticSelection> = {};
    for (const r of rows) picks[r.category as CosmeticCategory] = r.cosmeticId;
    return { ...DEFAULT_COSMETICS, ...picks };
  }

  async set(userId: string, category: CosmeticCategory, id: string): Promise<CosmeticSelection> {
    await this.prisma.cosmeticSelection.upsert({
      where: { userId_category: { userId, category } },
      update: { cosmeticId: id },
      create: { userId, category, cosmeticId: id },
    });
    return this.get(userId);
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.prisma.cosmeticSelection.deleteMany({ where: { userId } });
  }
}

/** Progression hors-ligne persistée (OFLP-D-6) — bitmask par (user, jeu, difficulté). Cascade RGPD. */
export class PrismaOfflineClearStore implements OfflineClearStore {
  constructor(private readonly prisma: PrismaClient) {}

  async get(userId: string): Promise<OfflineClears> {
    const rows = await this.prisma.offlineClear.findMany({ where: { userId } });
    const out: OfflineClears = {};
    for (const r of rows) {
      const byDiff = (out[r.game as GameId] ??= {});
      byDiff[r.difficulty as Difficulty] = r.mask >>> 0;
    }
    return out;
  }

  async claim(
    userId: string,
    game: GameId,
    difficulty: Difficulty,
    index: number,
  ): Promise<{ clears: OfflineClears; credited: boolean }> {
    if (index < 0 || index >= OFFLINE_BANK_SIZE) {
      return { clears: await this.get(userId), credited: false };
    }
    // Lecture puis OR du bit. La contrainte @@unique(user,game,difficulty) + l'upsert
    // garantissent une ligne unique ; le bit est idempotent (OR), donc même en course
    // un double claim ne crédite pas deux fois la même valeur d'XP (popcount stable).
    const existing = await this.prisma.offlineClear.findUnique({
      where: { userId_game_difficulty: { userId, game, difficulty } },
    });
    const current = existing?.mask ?? 0;
    const credited = !isLevelCleared(current, index);
    if (credited) {
      const next = setLevelCleared(current, index);
      await this.prisma.offlineClear.upsert({
        where: { userId_game_difficulty: { userId, game, difficulty } },
        update: { mask: next },
        create: { userId, game, difficulty, mask: next },
      });
    }
    return { clears: await this.get(userId), credited };
  }

  async sync(userId: string, clears: OfflineClears): Promise<OfflineClears> {
    for (const game of Object.keys(clears) as GameId[]) {
      const byDiff = clears[game];
      if (!byDiff) continue;
      for (const difficulty of Object.keys(byDiff) as Difficulty[]) {
        const incoming = (byDiff[difficulty] ?? 0) >>> 0;
        if (incoming === 0) continue;
        const existing = await this.prisma.offlineClear.findUnique({
          where: { userId_game_difficulty: { userId, game, difficulty } },
        });
        const next = ((existing?.mask ?? 0) | incoming) >>> 0;
        await this.prisma.offlineClear.upsert({
          where: { userId_game_difficulty: { userId, game, difficulty } },
          update: { mask: next },
          create: { userId, game, difficulty, mask: next },
        });
      }
    }
    return this.get(userId);
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.prisma.offlineClear.deleteMany({ where: { userId } });
  }
}
