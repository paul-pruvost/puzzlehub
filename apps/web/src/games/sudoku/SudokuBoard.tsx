import type { SudokuBoard as Board, SudokuPuzzle } from '@puzzlehub/engine';
import { cn } from '@puzzlehub/ui';
import { boxSides, cellKey, isGiven, sharesUnit, type SudokuSelection } from './cells';

export interface SudokuBoardProps {
  puzzle: SudokuPuzzle;
  board: Board;
  violations: Set<string>;
  selected: SudokuSelection | null;
  onSelect: (r: number, c: number) => void;
}

export function SudokuBoard({
  puzzle,
  board,
  violations,
  selected,
  onSelect,
}: SudokuBoardProps): JSX.Element {
  const n = puzzle.size;
  const strong = 'color-mix(in srgb, var(--color-text) 82%, transparent)';
  const weak = 'var(--color-border)';
  return (
    <div className="inline-block rounded-card border border-border bg-surface-2 p-2 shadow-2">
      <div
        className="inline-grid gap-0 overflow-hidden rounded-md bg-surface shadow-[inset_0_1px_3px_rgba(40,33,20,0.08)] ring-1 ring-border"
        style={{ gridTemplateColumns: `repeat(${n}, 44px)` }}
      >
      {board.map((row, r) =>
        row.map((value, c) => {
          const given = isGiven(puzzle, r, c);
          const bad = violations.has(cellKey(r, c));
          const sides = boxSides(puzzle, r, c);
          const isSelected = selected?.r === r && selected?.c === c;
          const inUnit = selected ? sharesUnit(puzzle, selected, r, c) : false;
          return (
            <button
              key={cellKey(r, c)}
              type="button"
              onClick={() => onSelect(r, c)}
              aria-label={`Case ${r + 1},${c + 1} : ${value ?? 'vide'}${given ? ', indice' : ''}${bad ? ', en conflit' : ''}`}
              aria-invalid={bad || undefined}
              aria-pressed={isSelected || undefined}
              className={cn(
                'relative flex h-11 w-11 items-center justify-center text-xl tabular-nums leading-none transition-colors duration-100 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                given ? 'font-bold text-muted' : 'font-semibold text-accent',
                isSelected
                  ? 'bg-accent-soft'
                  : inUnit
                    ? 'bg-surface-2'
                    : given
                      ? 'bg-surface-2'
                      : 'bg-surface',
                !isSelected && !bad && 'hover:bg-accent-soft',
                bad && 'z-10 bg-danger-soft text-danger ring-2 ring-inset ring-danger',
              )}
              style={{
                borderStyle: 'solid',
                borderTopWidth: sides.top ? 2 : 1,
                borderRightWidth: sides.right ? 2 : 1,
                borderBottomWidth: sides.bottom ? 2 : 1,
                borderLeftWidth: sides.left ? 2 : 1,
                borderTopColor: sides.top ? strong : weak,
                borderRightColor: sides.right ? strong : weak,
                borderBottomColor: sides.bottom ? strong : weak,
                borderLeftColor: sides.left ? strong : weak,
                ...(isSelected
                  ? { outline: '2px solid var(--color-accent)', outlineOffset: '-2px' }
                  : {}),
              }}
            >
              {value != null ? (
                <span
                  key={value}
                  className={cn(!given && 'motion-safe:animate-cell-fill', 'drop-shadow-[0_1px_0_rgba(255,255,255,0.25)]')}
                >
                  {value}
                </span>
              ) : (
                ''
              )}
            </button>
          );
        }),
      )}
      </div>
    </div>
  );
}
