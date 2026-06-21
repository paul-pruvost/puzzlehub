import { useMemo, useState } from 'react';
import { type Difficulty } from '@puzzlehub/shared';
import { tangoClient, type Cell, type TangoPuzzle } from '@puzzlehub/engine';
import { TrainingShell } from '../TrainingShell';
import { useTrainingLevel } from '../useTrainingLevel';
import { useTrainingClear } from '../useTrainingClear';
import { applyTangoClick, boardFromGiven, cellKey, isGiven, nextSymbol, type TangoButton } from './cells';
import { TangoBoard } from './TangoBoard';

const STATUS_TEXT: Record<string, string> = {
  valid: 'Résolu, bravo !',
  invalid: 'Une règle n’est pas respectée (cases en rouge).',
  incomplete: 'Continue à remplir la grille…',
};

export default function TangoBoardPage(): JSX.Element {
  const [difficulty, setDifficulty] = useState<Difficulty>('facile');
  const { puzzle, index, levelCount, goPrev, goNext } = useTrainingLevel<TangoPuzzle>('tango', difficulty);

  const [board, setBoard] = useState<Cell[][]>([]);
  const [forPuzzle, setForPuzzle] = useState<TangoPuzzle | null>(null);
  // Réinitialise le plateau quand le niveau change (pattern React sans flash).
  if (puzzle && puzzle !== forPuzzle) {
    setForPuzzle(puzzle);
    setBoard(boardFromGiven(puzzle));
  }

  const result = useMemo(
    () => (puzzle ? tangoClient.validate(puzzle, board) : { status: 'incomplete' as const, violations: [] }),
    [puzzle, board],
  );
  useTrainingClear('tango', difficulty, index, result.status === 'valid');

  const violations = useMemo(() => {
    const set = new Set<string>();
    for (const v of result.violations) for (const c of v.cells) set.add(cellKey(c.r, c.c));
    return set;
  }, [result]);

  const mutate = (r: number, c: number, fn: (cell: Cell) => Cell): void => {
    if (!puzzle || isGiven(puzzle, r, c)) return;
    setBoard((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = fn(next[r][c]);
      return next;
    });
  };
  const onSet = (r: number, c: number, button: TangoButton): void =>
    mutate(r, c, (cell) => applyTangoClick(cell, button));
  const onCycle = (r: number, c: number): void => mutate(r, c, nextSymbol);

  return (
    <TrainingShell
      difficulty={difficulty}
      onDifficulty={setDifficulty}
      onRestart={() => puzzle && setBoard(boardFromGiven(puzzle))}
      status={result.status}
      statusText={STATUS_TEXT[result.status]}
      levelIndex={index}
      levelCount={levelCount}
      onPrev={goPrev}
      onNext={goNext}
      tutorial={
        <>
          <li>Clic gauche = soleil ● ; clic droit = lune ○ ; recliquer le même vide la case.</li>
          <li>Jamais 3 soleils (ou 3 lunes) à la suite, en ligne ou en colonne.</li>
          <li>Autant de soleils que de lunes dans chaque ligne et chaque colonne.</li>
          <li>« = » : les deux cases sont identiques ; « × » : elles sont opposées.</li>
        </>
      }
    >
      {puzzle ? (
        <TangoBoard puzzle={puzzle} board={board} violations={violations} onSet={onSet} onCycle={onCycle} />
      ) : (
        <p className="text-sm text-muted">Chargement du niveau…</p>
      )}
    </TrainingShell>
  );
}
