import { levelForXp } from './xp';

export interface Progress {
  xp: number;
  level: number;
}

export interface XpEvent {
  userId: string;
  attemptId: string;
  amount: number;
  at: number;
}

/** Store de progression serveur-autoritatif, idempotent par attemptId (PROG-D-3). */
export interface ProgressStore {
  get(userId: string): Promise<Progress>;
  award(
    userId: string,
    attemptId: string,
    amount: number,
  ): Promise<{ progress: Progress; gained: number }>;
}

export class MemoryProgressStore implements ProgressStore {
  private readonly xp = new Map<string, number>();
  private readonly awarded = new Set<string>();
  private readonly events: XpEvent[] = [];

  async get(userId: string): Promise<Progress> {
    const xp = this.xp.get(userId) ?? 0;
    return { xp, level: levelForXp(xp) };
  }

  async award(
    userId: string,
    attemptId: string,
    amount: number,
  ): Promise<{ progress: Progress; gained: number }> {
    if (this.awarded.has(attemptId)) {
      // Déjà crédité pour cet attempt : aucun double crédit (idempotence).
      return { progress: await this.get(userId), gained: 0 };
    }
    this.awarded.add(attemptId);
    const total = (this.xp.get(userId) ?? 0) + amount;
    this.xp.set(userId, total);
    this.events.push({ userId, attemptId, amount, at: Date.now() });
    return { progress: { xp: total, level: levelForXp(total) }, gained: amount };
  }
}
