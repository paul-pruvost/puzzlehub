import type { Difficulty, GameId } from '@puzzlehub/shared';

export interface Attempt {
  id: string;
  userId: string;
  puzzleId: string;
  game: GameId;
  difficulty: Difficulty;
  startedAt: number;
  /** Tentative du défi quotidien (bonus XP, PROG-D-6). */
  daily?: boolean;
}

/** Store d'attempts à usage unique (PLAY-D-4) : `consume` = getAndDelete. */
export interface AttemptStore {
  create(attempt: Attempt): Promise<void>;
  consume(id: string): Promise<Attempt | null>;
}

export class MemoryAttemptStore implements AttemptStore {
  private readonly attempts = new Map<string, Attempt>();

  async create(attempt: Attempt): Promise<void> {
    this.attempts.set(attempt.id, attempt);
  }

  async consume(id: string): Promise<Attempt | null> {
    const a = this.attempts.get(id);
    if (!a) return null;
    this.attempts.delete(id);
    return a;
  }
}
