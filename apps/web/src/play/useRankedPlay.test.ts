// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import type { Cell, TangoPuzzle } from '@puzzlehub/engine';
import type { ValidationResult } from '@puzzlehub/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRefresh = vi.fn();
vi.mock('../app/AuthProvider', () => ({ useAuth: () => ({ refresh: mockRefresh }) }));
vi.mock('../api/client', () => ({
  startPlay: vi.fn(),
  startDaily: vi.fn(),
  submitPlay: vi.fn(),
}));

import { startDaily, startPlay, submitPlay } from '../api/client';
import type { GameRankedConfig } from './types';
import { useRankedPlay } from './useRankedPlay';

const validPuzzle: TangoPuzzle = {
  size: 2,
  given: [
    [0, null],
    [null, 1],
  ],
  constraints: [],
};

let validity: ValidationResult['status'] = 'valid';
const config: GameRankedConfig<Cell[][], Cell[][], TangoPuzzle> = {
  id: 'tango',
  client: { id: 'tango', validate: () => ({ status: validity, violations: [] }) },
  initialState: (p) => p.given.map((row) => row.slice()),
  toServerBoard: (s) => s,
};

beforeEach(() => {
  vi.clearAllMocks();
  validity = 'valid';
});

describe('useRankedPlay', () => {
  it('start : puzzle valide → status playing + état initialisé', async () => {
    vi.mocked(startPlay).mockResolvedValue({ token: 'tok', game: 'tango', difficulty: 'facile', puzzle: validPuzzle });
    const { result } = renderHook(() => useRankedPlay(config));
    await act(async () => {
      await result.current.start({ kind: 'ranked', game: 'tango', difficulty: 'facile' });
    });
    expect(result.current.status).toBe('playing');
    expect(result.current.puzzle).not.toBeNull();
    expect(result.current.state).toHaveLength(2);
  });

  it('start : puzzle malformé → error parse, pas d’initialisation (durcissement)', async () => {
    vi.mocked(startPlay).mockResolvedValue({
      token: 'tok',
      game: 'tango',
      difficulty: 'facile',
      puzzle: { size: 2, given: 'nope', constraints: [] },
    });
    const { result } = renderHook(() => useRankedPlay(config));
    await act(async () => {
      await result.current.start({ kind: 'ranked', game: 'tango', difficulty: 'facile' });
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.error?.kind).toBe('parse');
    expect(result.current.state).toBeNull();
  });

  it('canSubmit suit la validation client (H4)', async () => {
    vi.mocked(startPlay).mockResolvedValue({ token: 'tok', game: 'tango', difficulty: 'facile', puzzle: validPuzzle });
    validity = 'incomplete';
    const { result } = renderHook(() => useRankedPlay(config));
    await act(async () => {
      await result.current.start({ kind: 'ranked', game: 'tango', difficulty: 'facile' });
    });
    expect(result.current.canSubmit).toBe(false);
  });

  it('submit succès → result + refresh XP', async () => {
    vi.mocked(startPlay).mockResolvedValue({ token: 'tok', game: 'tango', difficulty: 'facile', puzzle: validPuzzle });
    vi.mocked(submitPlay).mockResolvedValue({ accepted: true, valid: true, timeMs: 4200, xpGained: 30, xp: 30, level: 1 });
    const { result } = renderHook(() => useRankedPlay(config));
    await act(async () => {
      await result.current.start({ kind: 'ranked', game: 'tango', difficulty: 'facile' });
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.status).toBe('done');
    expect(result.current.result?.timeMs).toBe(4200);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('submit too_fast (200 accepted:false) → error too_fast mais result conservé', async () => {
    vi.mocked(startPlay).mockResolvedValue({ token: 'tok', game: 'tango', difficulty: 'facile', puzzle: validPuzzle });
    vi.mocked(submitPlay).mockResolvedValue({ accepted: false, reason: 'too_fast' });
    const { result } = renderHook(() => useRankedPlay(config));
    await act(async () => {
      await result.current.start({ kind: 'ranked', game: 'tango', difficulty: 'facile' });
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.error?.kind).toBe('too_fast');
    expect(result.current.result?.accepted).toBe(false);
  });

  it('mappe 401 → auth, 409 → already, 410 → expired', async () => {
    const { result } = renderHook(() => useRankedPlay(config));
    vi.mocked(startPlay).mockRejectedValueOnce(new Error('start_failed_401'));
    await act(async () => {
      await result.current.start({ kind: 'ranked', game: 'tango', difficulty: 'facile' });
    });
    expect(result.current.error?.kind).toBe('auth');
    expect(result.current.status).toBe('idle');

    vi.mocked(startPlay).mockResolvedValue({ token: 'tok', game: 'tango', difficulty: 'facile', puzzle: validPuzzle });
    await act(async () => {
      await result.current.start({ kind: 'ranked', game: 'tango', difficulty: 'facile' });
    });
    vi.mocked(submitPlay).mockRejectedValueOnce(new Error('submit_failed_410'));
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.error?.kind).toBe('expired');
    expect(result.current.status).toBe('playing');
  });

  it('daily : reset relance startDaily (H3)', async () => {
    vi.mocked(startDaily).mockResolvedValue({ token: 'tok', game: 'tango', difficulty: 'facile', puzzle: validPuzzle });
    const { result } = renderHook(() => useRankedPlay(config));
    await act(async () => {
      await result.current.start({ kind: 'daily', game: 'tango' });
    });
    await act(async () => {
      result.current.reset();
    });
    expect(vi.mocked(startDaily)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(startPlay)).not.toHaveBeenCalled();
  });
});
