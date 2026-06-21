import type { ReactNode } from 'react';
import { tangoClient, type Cell, type TangoBoard as Board, type TangoPuzzle } from '@puzzlehub/engine';

import { TangoBoard } from './TangoBoard';
import { applyTangoClick, boardFromGiven, isGiven, nextSymbol, type TangoButton } from './cells';
import type { GameRankedConfig } from '../../play/types';

// Pièces partagées Tango (config + rendu), isolées de la page par défaut pour
// que `DailyPage` (route statique) et le chargeur lazy du registre n'importent
// pas le même module statiquement + dynamiquement (évite un chunk fusionné).
export const tangoRankedConfig: GameRankedConfig<Board, Board, TangoPuzzle> = {
  id: 'tango',
  client: tangoClient,
  initialState: (puzzle) => boardFromGiven(puzzle),
  toServerBoard: (state) => state,
};

export function renderTangoBoard(ctx: {
  puzzle: TangoPuzzle;
  state: Board;
  violations: Set<string>;
  setState: (updater: (prev: Board) => Board) => void;
}): ReactNode {
  const mutate = (r: number, c: number, fn: (cell: Cell) => Cell): void => {
    if (isGiven(ctx.puzzle, r, c)) return;
    ctx.setState((prev) => {
      const next = prev.map((row) => row.slice()) as Cell[][];
      next[r][c] = fn(next[r][c]);
      return next;
    });
  };
  const onSet = (r: number, c: number, button: TangoButton): void =>
    mutate(r, c, (cell) => applyTangoClick(cell, button));
  const onCycle = (r: number, c: number): void => mutate(r, c, nextSymbol);
  return (
    <TangoBoard
      puzzle={ctx.puzzle}
      board={ctx.state}
      violations={ctx.violations}
      onSet={onSet}
      onCycle={onCycle}
    />
  );
}
