import type { Cell, TangoConstraint, TangoPuzzle } from '@puzzlehub/engine';
import { cn } from '@puzzlehub/ui';
import { cellKey, isGiven } from './cells';

const STEP = 52; // 48px de case + 4px de gap

function CellSymbol({ value }: { value: Cell }): JSX.Element | null {
  // Soleil = disque ambre plein ; lune = anneau ardoise (forme + couleur, a11y).
  // `data-piece` permet au skin « glyphes » (cosmétique) de substituer ☀/☾.
  if (value === 0)
    return (
      <span
        data-piece="sun"
        className="flex h-6 w-6 items-center justify-center rounded-full shadow-1 transition-transform duration-150 motion-safe:animate-cell-fill motion-reduce:transition-none"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--tango-sun) 60%, white), var(--tango-sun) 72%, color-mix(in srgb, var(--tango-sun) 80%, black) 100%)',
          boxShadow:
            'inset 0 1px 1.5px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(40,33,20,0.18), 0 1px 3px rgba(40,33,20,0.3)',
        }}
        aria-hidden
      />
    );
  if (value === 1)
    return (
      <span
        data-piece="moon"
        className="flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-[var(--tango-moon)] transition-transform duration-150 motion-safe:animate-cell-fill motion-reduce:transition-none"
        style={{
          background:
            'radial-gradient(circle at 68% 32%, transparent 52%, color-mix(in srgb, var(--tango-moon) 16%, transparent))',
          boxShadow:
            'inset 0 0 0 1px color-mix(in srgb, var(--tango-moon) 28%, transparent), inset 2px 1px 3px color-mix(in srgb, var(--tango-moon) 22%, transparent), 0 1px 2px rgba(40,33,20,0.2)',
        }}
        aria-hidden
      />
    );
  return null;
}

function label(value: Cell): string {
  return value === 0 ? 'soleil' : value === 1 ? 'lune' : 'vide';
}

function ConstraintMark({
  constraint,
  n,
}: {
  constraint: TangoConstraint;
  n: number;
}): JSX.Element | null {
  const { a, b, type } = constraint;
  const horizontal = a.r === b.r;
  const left = horizontal ? a.c * STEP + 48 + 2 : a.c * STEP + 24;
  const top = horizontal ? a.r * STEP + 24 : a.r * STEP + 48 + 2;
  if (a.r >= n || b.r >= n) return null;
  return (
    <span
      className="absolute z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[12px] font-bold leading-none text-muted shadow-1 ring-1 ring-white/40"
      style={{ left: left - 10, top: top - 10 }}
      aria-hidden
    >
      {type === '=' ? '=' : '×'}
    </span>
  );
}

export interface TangoBoardProps {
  puzzle: TangoPuzzle;
  board: Cell[][];
  violations: Set<string>;
  /** Pose un symbole via un bouton de souris (gauche = soleil, droit = lune). */
  onSet: (r: number, c: number, button: 'sun' | 'moon') => void;
  /** Cycle au clavier (Espace/Entrée) : vide → soleil → lune → vide. */
  onCycle: (r: number, c: number) => void;
}

export function TangoBoard({
  puzzle,
  board,
  violations,
  onSet,
  onCycle,
}: TangoBoardProps): JSX.Element {
  const n = puzzle.size;
  return (
    // Cadre padé EXTÉRIEUR ; la grille intérieure (sans padding) est le contexte
    // de positionnement des marques `=`/`×` → alignement correct (sinon le padding
    // décale les marques absolues).
    <div className="inline-block rounded-card border border-border bg-surface-2 p-2.5 shadow-2">
      <div
        className="relative inline-grid gap-1"
        style={{ gridTemplateColumns: `repeat(${n}, 48px)` }}
      >
        {board.map((row, r) =>
        row.map((value, c) => {
          const fixed = isGiven(puzzle, r, c);
          const bad = violations.has(cellKey(r, c));
          return (
            <button
              key={cellKey(r, c)}
              type="button"
              disabled={fixed}
              onClick={() => onSet(r, c, 'sun')}
              onContextMenu={(e) => {
                // Clic droit = lune ; neutralise le menu natif (UX-D-7, plateau seul).
                e.preventDefault();
                if (!fixed) onSet(r, c, 'moon');
              }}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onCycle(r, c);
                }
              }}
              aria-label={`Case ${r + 1},${c + 1} : ${label(value)}${fixed ? ' (imposée)' : ''}${bad ? ', en conflit' : ''}`}
              aria-invalid={bad || undefined}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-md border transition-all duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface-2',
                fixed
                  ? 'bg-surface-3 shadow-[inset_0_1px_3px_rgba(40,33,20,0.14)]'
                  : 'bg-surface shadow-1 hover:-translate-y-px hover:border-accent hover:shadow-2 active:translate-y-0 active:shadow-1 motion-reduce:hover:translate-y-0',
                bad
                  ? 'border-danger ring-2 ring-inset ring-danger bg-danger-soft'
                  : 'border-border',
              )}
            >
              <CellSymbol value={value} />
            </button>
          );
        }),
      )}
        {puzzle.constraints.map((constraint, i) => (
          <ConstraintMark key={i} constraint={constraint} n={n} />
        ))}
      </div>
    </div>
  );
}
