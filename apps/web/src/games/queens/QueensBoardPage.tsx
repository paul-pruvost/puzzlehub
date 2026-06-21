import { useMemo, useState } from 'react';
import { type Difficulty } from '@puzzlehub/shared';
import { queensClient, type QueensPuzzle } from '@puzzlehub/engine';
import { TrainingShell } from '../TrainingShell';
import { useTrainingLevel } from '../useTrainingLevel';
import { useTrainingClear } from '../useTrainingClear';
import { boardFromGrid, cellKey, cycle, emptyGrid, type CellState } from './cells';
import { QueensBoard } from './QueensBoard';

const STATUS_TEXT: Record<string, string> = {
  valid: 'Résolu, bravo !',
  invalid: 'Conflit : deux reines se gênent (cases en rouge).',
  incomplete: 'Place une reine par ligne, colonne et région…',
};

export default function QueensBoardPage(): JSX.Element {
  const [difficulty, setDifficulty] = useState<Difficulty>('facile');
  const { puzzle, index, levelCount, goPrev, goNext } = useTrainingLevel<QueensPuzzle>('queens', difficulty);

  const [grid, setGrid] = useState<CellState[][]>([]);
  const [forPuzzle, setForPuzzle] = useState<QueensPuzzle | null>(null);
  if (puzzle && puzzle !== forPuzzle) {
    setForPuzzle(puzzle);
    setGrid(emptyGrid(puzzle.size));
  }

  const result = useMemo(
    () =>
      puzzle
        ? queensClient.validate(puzzle, boardFromGrid(grid))
        : { status: 'incomplete' as const, violations: [] },
    [puzzle, grid],
  );
  useTrainingClear('queens', difficulty, index, result.status === 'valid');

  const violations = useMemo(() => {
    const set = new Set<string>();
    for (const v of result.violations) for (const c of v.cells) set.add(cellKey(c.r, c.c));
    return set;
  }, [result]);

  const onCycle = (r: number, c: number): void => {
    setGrid((prev) => {
      const next = prev.map((row) => row.slice());
      const nx = cycle(next[r][c]);
      if (nx === 'queen') {
        for (let cc = 0; cc < next[r].length; cc++) if (next[r][cc] === 'queen') next[r][cc] = 'empty';
      }
      next[r][c] = nx;
      return next;
    });
  };

  return (
    <TrainingShell
      difficulty={difficulty}
      onDifficulty={setDifficulty}
      onRestart={() => puzzle && setGrid(emptyGrid(puzzle.size))}
      status={result.status}
      statusText={STATUS_TEXT[result.status]}
      levelIndex={index}
      levelCount={levelCount}
      onPrev={goPrev}
      onNext={goNext}
      tutorial={
        <>
          <li>Place une couronne par ligne, par colonne et par région (numérotée).</li>
          <li>Deux couronnes ne se touchent jamais, même en diagonale.</li>
          <li>Clique pour alterner vide → croix (×, case exclue) → couronne → vide.</li>
          <li>Les régions sont délimitées par des bordures épaisses et un numéro.</li>
        </>
      }
    >
      {puzzle ? (
        <QueensBoard puzzle={puzzle} grid={grid} violations={violations} onCycle={onCycle} />
      ) : (
        <p className="text-sm text-muted">Chargement du niveau…</p>
      )}
    </TrainingShell>
  );
}
