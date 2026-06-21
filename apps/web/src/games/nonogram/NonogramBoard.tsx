import type { NonogramBoard as Board, NonogramPuzzle } from '@puzzlehub/engine';
import { cn } from '@puzzlehub/ui';
import { cellKey } from './cells';

export interface NonogramBoardProps {
  puzzle: NonogramPuzzle;
  board: Board;
  violations: Set<string>;
  onCellClick: (r: number, c: number) => void;
}

export function NonogramBoard({ puzzle, board, violations, onCellClick }: NonogramBoardProps): JSX.Element {
  const n = puzzle.size;
  return (
    <div
      className="inline-grid gap-0 rounded-card border border-border bg-surface-2 p-2.5 shadow-2"
      style={{ gridTemplateColumns: `auto repeat(${n}, 40px)` }}
    >
      {/* Coin + indices de colonnes */}
      <div />
      {puzzle.colClues.map((clue, c) => (
        <div
          key={`cc-${c}`}
          className={cn(
            'flex flex-col items-center justify-end gap-0.5 pb-2 text-xs font-semibold tabular-nums text-muted',
            c % 5 === 0 && c !== 0 && 'border-l-2 border-l-[color-mix(in_srgb,var(--color-text)_40%,transparent)]',
          )}
        >
          {(clue.length ? clue : [0]).map((v, i) => (
            <span key={i}>{v}</span>
          ))}
        </div>
      ))}

      {board.map((row, r) => (
        <FragmentRow
          key={`r-${r}`}
          rowClue={puzzle.rowClues[r]}
          row={row}
          r={r}
          violations={violations}
          onCellClick={onCellClick}
        />
      ))}
    </div>
  );
}

function FragmentRow({
  rowClue,
  row,
  r,
  violations,
  onCellClick,
}: {
  rowClue: number[];
  row: (0 | 1 | null)[];
  r: number;
  violations: Set<string>;
  onCellClick: (r: number, c: number) => void;
}): JSX.Element {
  return (
    <>
      <div
        className={cn(
          'flex items-center justify-end gap-1.5 pr-2.5 text-xs font-semibold tabular-nums text-muted',
          r % 5 === 0 && r !== 0 && 'border-t-2 border-t-[color-mix(in_srgb,var(--color-text)_40%,transparent)]',
        )}
      >
        {(rowClue.length ? rowClue : [0]).map((v, i) => (
          <span key={i}>{v}</span>
        ))}
      </div>
      {row.map((value, c) => {
        const bad = violations.has(cellKey(r, c));
        return (
          <button
            key={cellKey(r, c)}
            type="button"
            onClick={() => onCellClick(r, c)}
            aria-label={`Case ${r + 1},${c + 1} : ${value === 1 ? 'pleine' : value === 0 ? 'croix' : 'vide'}${bad ? ', en conflit' : ''}`}
            aria-invalid={bad || undefined}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center border border-border transition-colors duration-100 motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
              c % 5 === 0 && c !== 0 && 'border-l-2 border-l-[color-mix(in_srgb,var(--color-text)_40%,transparent)]',
              r % 5 === 0 && r !== 0 && 'border-t-2 border-t-[color-mix(in_srgb,var(--color-text)_40%,transparent)]',
              value === 1
                ? 'border-transparent text-accent-fg shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.18)] bg-gradient-accent'
                : 'bg-surface hover:bg-accent-soft',
              bad && 'z-10 ring-2 ring-inset ring-danger',
            )}
          >
            {value === 1 && (
              <span
                className="h-3.5 w-3.5 rounded-[3px] bg-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] motion-safe:animate-cell-fill"
                aria-hidden
              />
            )}
            {value === 0 && (
              <span
                className="text-base font-semibold leading-none text-muted motion-safe:animate-cell-fill"
                aria-hidden
              >
                ×
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}
