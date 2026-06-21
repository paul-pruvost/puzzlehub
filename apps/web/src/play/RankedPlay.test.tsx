// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Cell, TangoPuzzle } from '@puzzlehub/engine';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRefresh = vi.fn();
vi.mock('../app/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1', displayName: 'Joueur' }, refresh: mockRefresh }),
}));
vi.mock('../api/client', () => ({
  startPlay: vi.fn(),
  startDaily: vi.fn(),
  submitPlay: vi.fn(),
  loginUrl: () => '/login',
}));

import { startPlay, submitPlay } from '../api/client';
import type { GameRankedConfig } from './types';
import { RankedPlay } from './RankedPlay';

const puzzle: TangoPuzzle = { size: 2, given: [[0, null], [null, 1]], constraints: [] };

const config: GameRankedConfig<Cell[][], Cell[][], TangoPuzzle> = {
  id: 'tango',
  client: { id: 'tango', validate: () => ({ status: 'valid', violations: [] }) },
  initialState: (p) => p.given.map((row) => row.slice()),
  toServerBoard: (s) => s,
};

function renderPlay(): void {
  render(
    <MemoryRouter>
      <RankedPlay
        config={config}
        source={{ kind: 'ranked', game: 'tango', difficulty: 'facile' }}
        title="Tango classé"
        renderBoard={({ state }) => (
          <div data-testid="board">
            <button type="button">cellule {state.length}</button>
          </div>
        )}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(startPlay).mockResolvedValue({
    token: 'tok',
    game: 'tango',
    difficulty: 'facile',
    puzzle,
  });
});

describe('RankedPlay — état de fin de niveau (RD-D-4)', () => {
  it('victoire → plateau verrouillé, overlay résultat (+XP), Valider masqué', async () => {
    vi.mocked(submitPlay).mockResolvedValue({
      accepted: true,
      valid: true,
      timeMs: 4200,
      xpGained: 30,
      xp: 30,
      level: 1,
    });
    renderPlay();

    await act(async () => {
      screen.getByRole('button', { name: 'Commencer' }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Valider' }).click();
    });

    // Overlay de victoire + gain d'XP affiché.
    await waitFor(() => expect(screen.getByText('+30 XP')).toBeTruthy());
    // Plateau verrouillé : le wrapper coupe les interactions.
    const board = screen.getByTestId('board');
    expect(board.closest('.pointer-events-none')).not.toBeNull();
    // « Valider » disparaît une fois résolu (plus d'action de jeu).
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull();
    // Actions de suite présentes.
    expect(screen.getAllByRole('button', { name: 'Rejouer' }).length).toBeGreaterThan(0);
  });

  it('refus too_fast → plateau NON verrouillé, Valider toujours là, pas d’overlay', async () => {
    vi.mocked(submitPlay).mockResolvedValue({ accepted: false, reason: 'too_fast' });
    renderPlay();

    await act(async () => {
      screen.getByRole('button', { name: 'Commencer' }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: 'Valider' }).click();
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Rejouer' })).toBeTruthy());
    const board = screen.getByTestId('board');
    expect(board.closest('.pointer-events-none')).toBeNull();
    expect(screen.getByRole('button', { name: 'Valider' })).toBeTruthy();
    // Pas d'overlay de victoire.
    expect(screen.queryByText('Niveau résolu !')).toBeNull();
  });
});
