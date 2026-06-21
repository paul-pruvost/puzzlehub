import {
  type CosmeticCategory,
  DEFAULT_COSMETICS,
  type Difficulty,
  type GameId,
  isLevelCleared,
  mergeClears,
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

/** Transactions OIDC in-memory, consommées une seule fois (SEC-C1/E1). */
export class MemoryTxStore implements TxStore {
  private readonly txs = new Map<string, { tx: OidcTx; expiresAt: number }>();

  async create(tx: OidcTx, ttlMs: number): Promise<string> {
    const id = randomToken(24);
    this.txs.set(id, { tx, expiresAt: Date.now() + ttlMs });
    return id;
  }

  async consume(id: string): Promise<OidcTx | null> {
    const entry = this.txs.get(id);
    if (!entry) return null;
    this.txs.delete(id); // usage unique : supprimé dès la lecture
    if (entry.expiresAt <= Date.now()) return null;
    return entry.tx;
  }
}

/** Implémentation in-memory (dev + tests, sans DB) — AUTH-D-8. */
export class MemoryUserStore implements UserStore {
  private readonly bySub = new Map<string, User>();
  private readonly byId = new Map<string, User>();

  async upsertByGoogleSub(input: UpsertUserInput): Promise<User> {
    const existing = this.bySub.get(input.googleSub);
    const user: User = {
      id: existing?.id ?? randomToken(16),
      googleSub: input.googleSub,
      email: input.email,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      role: existing?.role ?? 'user',
    };
    this.bySub.set(user.googleSub, user);
    this.byId.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async deleteById(id: string): Promise<void> {
    const user = this.byId.get(id);
    if (user) {
      this.byId.delete(id);
      this.bySub.delete(user.googleSub);
    }
  }
}

export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  async create(userId: string, expiresAt: Date): Promise<Session> {
    const session: Session = { id: randomToken(32), userId, expiresAt };
    this.sessions.set(session.id, session);
    return session;
  }

  async get(id: string): Promise<Session | null> {
    const s = this.sessions.get(id);
    if (!s) return null;
    if (s.expiresAt.getTime() <= Date.now()) {
      this.sessions.delete(id);
      return null;
    }
    return s;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    for (const [id, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(id);
    }
  }
}

/** Sélection de cosmétiques in-memory (dev + tests). */
export class MemorySelectionStore implements SelectionStore {
  private readonly byUser = new Map<string, Partial<CosmeticSelection>>();

  async get(userId: string): Promise<CosmeticSelection> {
    return { ...DEFAULT_COSMETICS, ...this.byUser.get(userId) };
  }

  async set(userId: string, category: CosmeticCategory, id: string): Promise<CosmeticSelection> {
    const current = this.byUser.get(userId) ?? {};
    current[category] = id;
    this.byUser.set(userId, current);
    return { ...DEFAULT_COSMETICS, ...current };
  }

  async deleteForUser(userId: string): Promise<void> {
    this.byUser.delete(userId);
  }
}

/** Progression hors-ligne in-memory (dev + tests) — bitmask par (jeu, difficulté). */
export class MemoryOfflineClearStore implements OfflineClearStore {
  private readonly byUser = new Map<string, OfflineClears>();

  async get(userId: string): Promise<OfflineClears> {
    // Copie défensive pour ne pas exposer la structure interne mutable.
    return mergeClears(this.byUser.get(userId) ?? {}, {});
  }

  async claim(
    userId: string,
    game: GameId,
    difficulty: Difficulty,
    index: number,
  ): Promise<{ clears: OfflineClears; credited: boolean }> {
    const stored = this.byUser.get(userId) ?? {};
    if (index < 0 || index >= OFFLINE_BANK_SIZE) {
      // Hors bornes : jamais crédité, état inchangé.
      return { clears: await this.get(userId), credited: false };
    }
    const current = stored[game]?.[difficulty] ?? 0;
    const credited = !isLevelCleared(current, index);
    if (credited) {
      const byDiff = (stored[game] ??= {});
      byDiff[difficulty] = setLevelCleared(current, index);
      this.byUser.set(userId, stored);
    }
    return { clears: await this.get(userId), credited };
  }

  async sync(userId: string, clears: OfflineClears): Promise<OfflineClears> {
    const merged = mergeClears(this.byUser.get(userId) ?? {}, clears);
    this.byUser.set(userId, merged);
    return merged;
  }

  async deleteForUser(userId: string): Promise<void> {
    this.byUser.delete(userId);
  }
}
