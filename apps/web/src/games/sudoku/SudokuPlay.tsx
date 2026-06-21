import { useState } from 'react';
import type { SudokuBoard as Board, SudokuPuzzle } from '@puzzlehub/engine';
import { cn } from '@puzzlehub/ui';
import { SudokuBoard } from './SudokuBoard';
import { isGiven, moveSelection, setDigit, type SudokuSelection } from './cells';

export interface SudokuPlayProps {
  puzzle: SudokuPuzzle;
  board: Board;
  violations: Set<string>;
  setBoard: (updater: (prev: Board) => Board) => void;
}

/**
 * Enrobage interactif Sudoku (UX-D-3) : sélection de case + saisie clavier
 * (1..size, effacement, flèches) + pavé de chiffres. L'état de sélection est
 * **local** ici — le shell `RankedPlay` ne porte que le board serveur (Écart-1).
 */
export function SudokuPlay({ puzzle, board, violations, setBoard }: SudokuPlayProps): JSX.Element {
  const [selected, setSelected] = useState<SudokuSelection | null>(null);

  const select = (r: number, c: number): void => {
    if (isGiven(puzzle, r, c)) return;
    setSelected({ r, c });
  };

  const place = (value: number | null): void => {
    if (!selected) return;
    setBoard((prev) => setDigit(puzzle, prev, selected.r, selected.c, value));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!selected) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      setSelected((prev) => (prev ? moveSelection(prev, dr, dc, puzzle.size) : prev));
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      place(null);
      return;
    }
    const digit = Number(e.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= puzzle.size) {
      e.preventDefault();
      place(digit);
    }
  };

  const digits = Array.from({ length: puzzle.size }, (_, i) => i + 1);

  return (
    <div className="space-y-3" role="group" tabIndex={0} onKeyDown={onKeyDown}>
      <SudokuBoard
        puzzle={puzzle}
        board={board}
        violations={violations}
        selected={selected}
        onSelect={select}
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Pavé de chiffres">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            disabled={!selected}
            onClick={() => place(d)}
            className={cn(
              'h-9 w-9 rounded-md border border-border bg-surface text-base tabular-nums text-text transition-colors',
              'hover:bg-surface-2 disabled:opacity-40',
            )}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          disabled={!selected}
          onClick={() => place(null)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text transition-colors hover:bg-surface-2 disabled:opacity-40"
        >
          Effacer
        </button>
      </div>
      <p className="text-xs text-muted">
        Sélectionne une case, puis tape un chiffre (ou utilise le pavé). Flèches pour te déplacer.
      </p>
    </div>
  );
}
