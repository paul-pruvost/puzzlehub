import type { ReactNode } from 'react';
import { DIFFICULTIES, type Difficulty } from '@puzzlehub/shared';
import { Button, Panel, cn } from '@puzzlehub/ui';

export type TrainingStatus = 'valid' | 'invalid' | 'incomplete';

export interface TrainingShellProps {
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onRestart: () => void;
  /** Éléments de la liste « comment jouer » (déplié par défaut au 1ᵉʳ usage). */
  tutorial: ReactNode;
  status: TrainingStatus;
  statusText: string;
  /** Niveau courant (0-based) et total — campagne hors-ligne (OFLP-D-4/D-8). */
  levelIndex?: number;
  levelCount?: number;
  onPrev?: () => void;
  onNext?: () => void;
  /** Le plateau présentational du jeu. */
  children: ReactNode;
}

/**
 * Coque d'entraînement partagée (chrome commun des 6 jeux) : tutoriel, onglets
 * de difficulté, plateau centré, et bannière de statut/victoire (RD-D-4). Le
 * plateau reste rejouable même résolu (aucun verrou en entraînement).
 */
export function TrainingShell({
  difficulty,
  onDifficulty,
  onRestart,
  tutorial,
  status,
  statusText,
  levelIndex = 0,
  levelCount = 0,
  onPrev,
  onNext,
  children,
}: TrainingShellProps): JSX.Element {
  const hasNext = onNext !== undefined && levelIndex < levelCount - 1;
  return (
    <div className="space-y-5">
      <details className="group rounded-card border border-border bg-surface p-4 text-sm">
        <summary className="flex cursor-pointer select-none items-center gap-2 font-display font-semibold text-text">
          <span className="text-accent transition-transform group-open:rotate-90" aria-hidden>
            ›
          </span>
          Comment jouer
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">{tutorial}</ul>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-muted">Difficulté</span>
        {DIFFICULTIES.map((d) => (
          <Button
            key={d}
            variant={d === difficulty ? 'primary' : 'secondary'}
            size="sm"
            className="capitalize"
            onClick={() => onDifficulty(d)}
            aria-pressed={d === difficulty}
          >
            {d}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onRestart}>
          Recommencer
        </Button>
      </div>

      {levelCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Niveau</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onPrev}
            disabled={onPrev === undefined || levelIndex <= 0}
            aria-label="Niveau précédent"
          >
            ‹
          </Button>
          <span className="font-display font-semibold tabular-nums text-text">
            {levelIndex + 1} <span className="text-muted">/ {levelCount}</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Niveau suivant"
          >
            ›
          </Button>
        </div>
      )}

      <Panel
        className={cn(
          'board-stage w-fit max-w-full overflow-auto p-4 transition-shadow duration-300 sm:p-5',
          status === 'valid' && 'ring-2 ring-success',
        )}
      >
        {/* Entrée animée du plateau à chaque niveau (clé = index) — discret. */}
        <div key={levelIndex} className="animate-pop-in">
          {children}
        </div>
      </Panel>

      {status === 'valid' ? (
        <Panel tone="success" className="flex flex-wrap items-center gap-3 px-4 py-2.5" role="status">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-xs font-bold text-white" aria-hidden>
            ✓
          </span>
          <span className="text-sm font-semibold text-success">{statusText}</span>
          {hasNext && (
            <Button size="sm" className="ml-auto" onClick={onNext}>
              Niveau suivant →
            </Button>
          )}
        </Panel>
      ) : (
        <p
          className={cn('text-sm', status === 'invalid' ? 'text-danger' : 'text-muted')}
          role="status"
        >
          {statusText}
        </p>
      )}

      <p className="text-xs text-muted">
        Mode entraînement hors-ligne. En partie classée, la grille et la validation sont fournies par
        le serveur (anti-triche).
      </p>
    </div>
  );
}
