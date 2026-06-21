import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  clearMask,
  globalLevel,
  nextUnclearedIndex,
  type Difficulty,
  type GameId,
  type OfflineClears,
} from '@puzzlehub/shared';
import { clearOffline, syncOffline } from '../api/client';
import { getLocalClears, recordLocalClear, setLocalClears } from '../play/offlineProgress';
import { useAuth } from './AuthProvider';

interface OfflineProgressCtx {
  clears: OfflineClears;
  /** Niveau global déduit des seuls clears hors-ligne (affichage déconnecté). */
  localLevel: number;
  /** Index du prochain niveau non terminé pour (jeu, difficulté). */
  nextLevel: (game: GameId, difficulty: Difficulty, levelCount: number) => number;
  /** Enregistre un clear (local + serveur si connecté). Idempotent / first-clear. */
  recordClear: (game: GameId, difficulty: Difficulty, index: number) => void;
}

const Ctx = createContext<OfflineProgressCtx | null>(null);

export function OfflineProgressProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user, refresh } = useAuth();
  const [clears, setClears] = useState<OfflineClears>(() => getLocalClears());
  const syncedFor = useRef<string | null>(null);

  // Au login : fusion (OR) des clears locaux dans le compte serveur, puis miroir local.
  useEffect(() => {
    if (!user) {
      syncedFor.current = null;
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    let cancelled = false;
    void syncOffline(getLocalClears()).then((res) => {
      if (cancelled || !res) return;
      setLocalClears(res.clears);
      setClears(res.clears);
      void refresh(); // l'XP/niveau global (header) reflète la fusion
    });
    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  const recordClear = useCallback(
    (game: GameId, difficulty: Difficulty, index: number): void => {
      const credited = recordLocalClear(game, difficulty, index);
      if (!credited) return; // déjà terminé → aucun recrédit (first-clear strict)
      setClears(getLocalClears());
      if (user) {
        void clearOffline(game, difficulty, index).then((res) => {
          if (res?.credited) void refresh();
        });
      }
    },
    [user, refresh],
  );

  const nextLevel = useCallback(
    (game: GameId, difficulty: Difficulty, levelCount: number): number =>
      nextUnclearedIndex(clearMask(clears, game, difficulty), levelCount),
    [clears],
  );

  return (
    <Ctx.Provider value={{ clears, localLevel: globalLevel(0, clears), nextLevel, recordClear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOfflineProgress(): OfflineProgressCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOfflineProgress doit être utilisé dans un OfflineProgressProvider');
  return ctx;
}
