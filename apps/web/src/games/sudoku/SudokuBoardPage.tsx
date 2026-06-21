import { useMemo, useState } from 'react';
import { type Difficulty } from '@puzzlehub/shared';
import { sudokuClient, type SudokuBoard as Board, type SudokuPuzzle } from '@puzzlehub/engine';
import { TrainingShell } from '../TrainingShell';
import { useTrainingLevel } from '../useTrainingLevel';
import { useTrainingClear } from '../useTrainingClear';
import { boardFromGiven, cellKey } from './cells';
import { SudokuPlay } from './SudokuPlay';

const STATUS_TEXT: Record<string, string> = {
  valid: 'Résolu, bravo !',
  invalid: 'Conflit : un chiffre se répète (cases en rouge).',
  incomplete: 'Remplis chaque ligne, colonne et boîte avec 1 à 6…',
};

export default function SudokuBoardPage(): JSX.Element {
  const [difficulty, setDifficulty] = useState<Difficulty>('facile');
  const { puzzle, index, levelCount, goPrev, goNext } = useTrainingLevel<SudokuPuzzle>('sudoku', difficulty);

  const [board, setBoard] = useState<Board>([]);
  const [forPuzzle, setForPuzzle] = useState<SudokuPuzzle | null>(null);
  if (puzzle && puzzle !== forPuzzle) {
    setForPuzzle(puzzle);
    setBoard(boardFromGiven(puzzle));
  }

  const result = useMemo(
    () => (puzzle ? sudokuClient.validate(puzzle, board) : { status: 'incomplete' as const, violations: [] }),
    [puzzle, board],
  );
  useTrainingClear('sudoku', difficulty, index, result.status === 'valid');

  const violations = useMemo(() => {
    const set = new Set<string>();
    for (const v of result.violations) for (const c of v.cells) set.add(cellKey(c.r, c.c));
    return set;
  }, [result]);

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
          <li>Remplis la grille avec les chiffres 1 à 6.</li>
          <li>Chaque ligne, chaque colonne et chaque boîte 2×3 contient 1 à 6 une seule fois.</li>
          <li>Clique une case puis tape un chiffre (1 à 6) ou utilise le pavé ; flèches pour te déplacer.</li>
          <li>Les cases grisées sont des indices fixes.</li>
        </>
      }
    >
      {puzzle ? (
        <SudokuPlay puzzle={puzzle} board={board} violations={violations} setBoard={setBoard} />
      ) : (
        <p className="text-sm text-muted">Chargement du niveau…</p>
      )}
    </TrainingShell>
  );
}
