import { useCallback, useMemo, useState } from 'react';
import { parsePuzzle, type Difficulty, type GameId, type ValidationResult } from '@puzzlehub/shared';

import { startDaily, startPlay, submitPlay, type SubmitResponse } from '../api/client';
import { useAuth } from '../app/AuthProvider';
import { mapError, rankedError, type RankedError } from './errors';
import type { GameRankedConfig } from './types';

export type RankedStatus = 'idle' | 'loading' | 'playing' | 'submitting' | 'done';

/** Origine d'une partie classée : flux classé normal ou défi quotidien. */
export type RankedSource =
  | { kind: 'ranked'; game: GameId; difficulty: Difficulty }
  | { kind: 'daily'; game: GameId };

export interface UseRankedPlay<UiState, Puzzle> {
  status: RankedStatus;
  puzzle: Puzzle | null;
  state: UiState | null;
  setState: (updater: (prev: UiState) => UiState) => void;
  validation: ValidationResult | null;
  violations: Set<string>;
  /** Garde UX (H4) : le serveur reste l'autorité finale. */
  canSubmit: boolean;
  result: SubmitResponse | null;
  error: RankedError | null;
  start: (src: RankedSource) => Promise<void>;
  submit: () => Promise<void>;
  /** « Rejouer » (H3) : relance un `start` → nouveau token. */
  reset: () => void;
}

/**
 * Boucle de jeu classée serveur-autoritative, factorisée pour les 4 jeux
 * (RANK-D-4). Le token de début reste interne (jamais exposé au DOM, PLAY-D-3).
 */
export function useRankedPlay<UiState, ServerBoard, Puzzle>(
  config: GameRankedConfig<UiState, ServerBoard, Puzzle>,
): UseRankedPlay<UiState, Puzzle> {
  const { refresh } = useAuth();
  const [status, setStatus] = useState<RankedStatus>('idle');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [state, setUiState] = useState<UiState | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<RankedError | null>(null);
  const [lastSource, setLastSource] = useState<RankedSource | null>(null);

  const validation = useMemo<ValidationResult | null>(
    () =>
      puzzle !== null && state !== null
        ? config.client.validate(puzzle, config.toServerBoard(state))
        : null,
    [config, puzzle, state],
  );

  const violations = useMemo(() => {
    const set = new Set<string>();
    if (validation) for (const v of validation.violations) for (const c of v.cells) set.add(`${c.r},${c.c}`);
    return set;
  }, [validation]);

  const canSubmit = status === 'playing' && validation?.status === 'valid';

  const start = useCallback(
    async (src: RankedSource): Promise<void> => {
      setStatus('loading');
      setError(null);
      setResult(null);
      setPuzzle(null);
      setUiState(null);
      setToken(null);
      setLastSource(src);
      try {
        const r = src.kind === 'daily' ? await startDaily(src.game) : await startPlay(src.game, src.difficulty);
        const parsed = parsePuzzle<Puzzle>(config.id, r.puzzle);
        if (parsed === null) {
          // Durcissement (PLAY-D-6) : un puzzle malformé n'initialise jamais un plateau.
          setError(rankedError('parse'));
          setStatus('idle');
          return;
        }
        setPuzzle(parsed);
        setToken(r.token);
        setUiState(config.initialState(parsed));
        setStatus('playing');
      } catch (e) {
        setError(mapError(e));
        setStatus('idle');
      }
    },
    [config],
  );

  const submit = useCallback(async (): Promise<void> => {
    if (token === null || state === null) return;
    setStatus('submitting');
    setError(null);
    try {
      const res = await submitPlay(token, config.toServerBoard(state));
      setResult(res);
      setStatus('done');
      // Refus anti-bot (PLAY-D-5) : réponse 200 `accepted:false`, pas une exception.
      if (!res.accepted && res.reason === 'too_fast') setError(rankedError('too_fast'));
      await refresh();
    } catch (e) {
      setError(mapError(e));
      setStatus('playing');
    }
  }, [config, refresh, state, token]);

  const setState = useCallback((updater: (prev: UiState) => UiState): void => {
    setUiState((prev) => (prev === null ? prev : updater(prev)));
  }, []);

  const reset = useCallback((): void => {
    if (lastSource) void start(lastSource);
  }, [lastSource, start]);

  return {
    status,
    puzzle,
    state,
    setState,
    validation,
    violations,
    canSubmit,
    result,
    error,
    start,
    submit,
    reset,
  };
}
