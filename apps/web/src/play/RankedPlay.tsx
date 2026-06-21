import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Panel, ResultOverlay, Timer, buttonClasses, cn } from '@puzzlehub/ui';

import { loginUrl } from '../api/client';
import { useAuth } from '../app/AuthProvider';
import type { GameRankedConfig } from './types';
import { useRankedPlay, type RankedSource } from './useRankedPlay';

interface RenderBoardCtx<UiState, Puzzle> {
  puzzle: Puzzle;
  state: UiState;
  violations: Set<string>;
  setState: (updater: (prev: UiState) => UiState) => void;
}

export interface RankedPlayProps<UiState, ServerBoard, Puzzle> {
  config: GameRankedConfig<UiState, ServerBoard, Puzzle>;
  source: RankedSource;
  title: string;
  intro?: ReactNode;
  /** Chaque jeu branche ici son `<Game>Board` présentational + ses gestes. */
  renderBoard: (ctx: RenderBoardCtx<UiState, Puzzle>) => ReactNode;
}

/**
 * Shell de plateau classé partagé (RANK-D-4) : pilote la boucle serveur-
 * autoritative (`useRankedPlay`) et délègue le rendu du plateau à `renderBoard`.
 * Ignore totalement la forme du board de chaque jeu.
 */
export function RankedPlay<UiState, ServerBoard, Puzzle>({
  config,
  source,
  title,
  intro,
  renderBoard,
}: RankedPlayProps<UiState, ServerBoard, Puzzle>): JSX.Element {
  const { user } = useAuth();
  const play = useRankedPlay(config);
  // Clé de partie : remet le chrono à zéro à chaque démarrage / rejouer.
  const [attempt, setAttempt] = useState(0);
  // L'overlay de victoire est fermable pour admirer le plateau résolu derrière.
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  const onStart = (): void => {
    setAttempt((a) => a + 1);
    setOverlayDismissed(false);
    void play.start(source);
  };
  const onReset = (): void => {
    setAttempt((a) => a + 1);
    setOverlayDismissed(false);
    play.reset();
  };

  // RANK-D-3 : le mode classé exige une session.
  if (!user) {
    return (
      <Panel className="space-y-3 p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">{title}</h1>
        <p className="text-muted">Connecte-toi pour jouer en mode classé.</p>
        <a href={loginUrl()} className={buttonClasses('primary')}>
          Connexion Google
        </a>
      </Panel>
    );
  }

  const started = play.puzzle !== null && play.state !== null;
  // RD-D-4 : victoire = état explicite et verrouillé ; refus/invalide reste éditable.
  const won = play.status === 'done' && !!play.result?.accepted && !!play.result?.valid;
  const refused = play.status === 'done' && !!play.result && !won;
  const backHref = source.kind === 'daily' ? '/' : '/classe';

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">{title}</h1>
          {intro && <div className="mt-1 max-w-2xl text-sm text-muted">{intro}</div>}
        </div>
        {started && (
          <div className="flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-muted">
            <span aria-hidden>⏱</span>
            <Timer key={attempt} running={play.status === 'playing'} frozenMs={play.result?.timeMs} />
          </div>
        )}
      </header>

      {!started && (
        <div className="space-y-3">
          <Button onClick={onStart} disabled={play.status === 'loading'}>
            {play.status === 'loading' ? 'Chargement…' : 'Commencer'}
          </Button>
          {play.error && (
            <p className="text-sm text-danger" role="status">
              {play.error.message}
            </p>
          )}
        </div>
      )}

      {started && play.puzzle !== null && play.state !== null && (
        <div className="space-y-4">
          <Panel
            tone={won ? 'success' : 'default'}
            className={cn('board-stage relative w-fit max-w-full overflow-hidden p-4 sm:p-5', won && 'shadow-2')}
          >
            <div className={cn('transition-opacity', won && 'pointer-events-none select-none opacity-80')}>
              {renderBoard({
                puzzle: play.puzzle,
                state: play.state,
                violations: play.violations,
                setState: play.setState,
              })}
            </div>
            {won && (
              <span
                aria-hidden
                className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-success text-sm font-bold text-white shadow-1"
              >
                ✓
              </span>
            )}
          </Panel>

          <div className="flex flex-wrap items-center gap-2">
            {!won && (
              <Button
                onClick={() => void play.submit()}
                disabled={!play.canSubmit || play.status === 'submitting'}
              >
                {play.status === 'submitting' ? 'Validation…' : 'Valider'}
              </Button>
            )}
            {play.status === 'done' && (
              <Button variant="secondary" onClick={onReset}>
                Rejouer
              </Button>
            )}
            {play.status === 'done' && (
              <Link to={backHref} className={buttonClasses('ghost', 'md')}>
                {source.kind === 'daily' ? 'Accueil' : 'Autres jeux'}
              </Link>
            )}
          </div>

          {refused && (
            <Panel tone="danger" className="p-3" role="status">
              <p className="text-sm text-danger">
                {play.result?.accepted
                  ? 'Grille invalide — corrige et revalide.'
                  : (play.error?.message ?? 'Soumission refusée.')}
              </p>
            </Panel>
          )}

          {play.error && play.status === 'playing' && (
            <p className="text-sm text-danger" role="status">
              {play.error.message}
            </p>
          )}
        </div>
      )}

      <ResultOverlay
        open={won && !overlayDismissed}
        timeMs={play.result?.timeMs}
        xpGained={play.result?.xpGained}
        onClose={() => setOverlayDismissed(true)}
        actions={
          <>
            <Button onClick={onReset}>Rejouer</Button>
            <Link to={backHref} className={buttonClasses('secondary', 'md')}>
              {source.kind === 'daily' ? 'Accueil' : 'Autres jeux'}
            </Link>
          </>
        }
      />
    </section>
  );
}
