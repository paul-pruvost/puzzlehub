import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { patchesClient, type PatchesBoard as Owner, type PatchesPuzzle } from '@puzzlehub/engine';

import { RankedPlay } from '../../play/RankedPlay';
import { parseDifficulty } from '../../play/difficulty';
import type { GameRankedConfig } from '../../play/types';
import { PatchesBoard as PatchesGrid } from './PatchesBoard';
import { buildClueMap, cellKey, initialOwner } from './cells';

/** UiState composite : owner (board serveur) + rectangle actif (interaction). */
export interface PatchesUiState {
  owner: Owner;
  active: number | null;
}

export const patchesRankedConfig: GameRankedConfig<PatchesUiState, Owner, PatchesPuzzle> = {
  id: 'patches',
  client: patchesClient,
  initialState: (puzzle) => ({ owner: initialOwner(puzzle), active: 0 }),
  toServerBoard: (state) => state.owner,
};

export function renderPatchesBoard(ctx: {
  puzzle: PatchesPuzzle;
  state: PatchesUiState;
  violations: Set<string>;
  setState: (updater: (prev: PatchesUiState) => PatchesUiState) => void;
}): ReactNode {
  const clues = buildClueMap(ctx.puzzle);
  const onCellClick = (r: number, c: number): void => {
    const clue = clues.get(cellKey(r, c));
    if (clue) {
      ctx.setState((prev) => ({ ...prev, active: clue.index }));
      return;
    }
    ctx.setState((prev) => {
      if (prev.active === null) return prev;
      const owner = prev.owner.map((row) => row.slice());
      owner[r][c] = owner[r][c] === prev.active ? null : prev.active;
      return { ...prev, owner };
    });
  };
  return (
    <PatchesGrid
      puzzle={ctx.puzzle}
      owner={ctx.state.owner}
      active={ctx.state.active}
      violations={ctx.violations}
      onCellClick={onCellClick}
    />
  );
}

export default function RankedPatches(): JSX.Element {
  const [params] = useSearchParams();
  const difficulty = parseDifficulty(params.get('d'));
  return (
    <RankedPlay
      config={patchesRankedConfig}
      source={{ kind: 'ranked', game: 'patches', difficulty }}
      title="Patches — Classé"
      intro="Grille servie et validée par le serveur (anti-triche). XP créditée à la résolution."
      renderBoard={renderPatchesBoard}
    />
  );
}
