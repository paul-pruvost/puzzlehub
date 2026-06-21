import { Suspense, lazy, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconGlyph, Panel, gameColorVar } from '@puzzlehub/ui';
import { findGame } from '../games/registry';

export function GamePage(): JSX.Element {
  const { id = '' } = useParams();
  const game = findGame(id);
  const Board = useMemo(() => (game?.loadBoard ? lazy(game.loadBoard) : null), [game]);

  if (!game) {
    return (
      <section className="space-y-3">
        <p className="text-text">Ce jeu n’existe pas.</p>
        <Link to="/" className="text-sm font-medium text-accent hover:underline">
          ← Tous les jeux
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-text"
      >
        <span aria-hidden>←</span> Tous les jeux
      </Link>

      <header className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card text-game-fg shadow-1"
          style={{ backgroundColor: gameColorVar(game.accentIndex) }}
        >
          <IconGlyph game={game.id} size={30} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text">{game.name}</h1>
          <p className="mt-0.5 text-muted">{game.tagline}</p>
        </div>
      </header>

      {Board ? (
        <Suspense fallback={<p className="text-sm text-muted">Chargement du plateau…</p>}>
          <Board />
        </Suspense>
      ) : (
        <>
          <Panel className="p-5">
            <h2 className="font-display font-semibold text-text">Comment jouer</h2>
            <p className="mt-2 text-sm text-muted">{game.how}</p>
          </Panel>
          <p className="text-sm text-muted">
            {game.available
              ? 'Plateau jouable en cours d’implémentation — disponible très bientôt.'
              : 'Ce jeu arrive prochainement.'}
          </p>
        </>
      )}
    </section>
  );
}
