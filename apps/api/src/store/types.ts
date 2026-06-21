import type { CosmeticCategory, Difficulty, GameId, OfflineClears } from '@puzzlehub/shared';

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  googleSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
}

export interface UpsertUserInput {
  googleSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Abstraction de stockage utilisateur (AUTH-D-8) : in-memory (tests) ou Prisma (prod). */
export interface UserStore {
  upsertByGoogleSub(input: UpsertUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  deleteById(id: string): Promise<void>;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface SessionStore {
  create(userId: string, expiresAt: Date): Promise<Session>;
  get(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}

/** Transaction OIDC pré-login (state/nonce/verifier), stockée côté serveur. */
export interface OidcTx {
  state: string;
  nonce: string;
  verifier: string;
}

/**
 * Store de transactions OIDC (SEC-C1/C2/E1) : `consume` est atomique et à
 * USAGE UNIQUE (getAndDelete) → empêche le rejeu du callback / login-CSRF.
 */
export interface TxStore {
  create(tx: OidcTx, ttlMs: number): Promise<string>;
  consume(id: string): Promise<OidcTx | null>;
}

/** Cosmétique équipé par catégorie pour un utilisateur (COSM-D-3). */
export type CosmeticSelection = Record<CosmeticCategory, string>;

/**
 * Store de sélection de cosmétiques (COSM-D-3/COSM-D-5). N'évalue PAS
 * l'éligibilité (il ignore le niveau) : la vérif `isUnlocked` est faite dans le
 * handler avant `set`. Persistance in-memory ↔ Prisma par `DATABASE_URL`.
 */
export interface SelectionStore {
  /** Renvoie la sélection (défauts fusionnés avec les choix stockés). */
  get(userId: string): Promise<CosmeticSelection>;
  set(userId: string, category: CosmeticCategory, id: string): Promise<CosmeticSelection>;
  /** Purge RGPD (FND-D-21) à la suppression de compte. */
  deleteForUser(userId: string): Promise<void>;
}

/**
 * Store de progression hors-ligne (OFLP-D-2/D-3/D-6, CORR-1). Les niveaux
 * terminés sont stockés en **bitmask** entier par `(jeu, difficulté)` (bit i =
 * niveau i terminé) → first-clear STRICT et comptage exact. L'XP hors-ligne en
 * dérive ; c'est un SOMMANT DISJOINT de l'XP classé (aucun double-compte, le
 * classé serveur-autoritatif reste intact). Persistance in-memory ↔ Prisma.
 */
export interface OfflineClearStore {
  /** Renvoie tous les masques de niveaux terminés de l'utilisateur. */
  get(userId: string): Promise<OfflineClears>;
  /**
   * Marque le niveau `index` terminé pour `(game, difficulty)` (OR du bit,
   * idempotent). `credited` = true UNIQUEMENT au premier clear (bit absent avant).
   * Un `index` hors de [0, OFFLINE_BANK_SIZE[ n'est jamais crédité.
   */
  claim(
    userId: string,
    game: GameId,
    difficulty: Difficulty,
    index: number,
  ): Promise<{ clears: OfflineClears; credited: boolean }>;
  /** Fusion idempotente (OR) des masques fournis avec le stocké (OFLP-D-6). */
  sync(userId: string, clears: OfflineClears): Promise<OfflineClears>;
  /** Purge RGPD (FND-D-21) à la suppression de compte. */
  deleteForUser(userId: string): Promise<void>;
}
