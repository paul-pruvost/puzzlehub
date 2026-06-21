import { Link } from 'react-router-dom';
import { OFFLINE_BANK_SIZE, clearMask, clearedCount } from '@puzzlehub/shared';
import { Badge, Card, Hero, IconGlyph, buttonClasses, cn, gameColorVar } from '@puzzlehub/ui';
import { GAMES } from '../games/registry';
import { useOfflineProgress } from '../app/OfflineProgressProvider';

const firstPlayable = GAMES.find((g) => g.available);

export function HomePage(): JSX.Element {
  const { clears } = useOfflineProgress();
  return (
    <div className="space-y-10">
      <Hero
        eyebrow="Mini-jeux de logique"
        title={
          <>
            Réfléchis, relie, résous.
            <br />
            Une grille à la fois.
          </>
        }
        tagline="Des casse-têtes courts et élégants — Tango, Queens, Zip, Sudoku et plus. Joue librement ou affronte le mode classé."
        actions={
          <>
            {firstPlayable && (
              <Link to={`/jeu/${firstPlayable.id}`} className={buttonClasses('primary')}>
                Jouer maintenant
              </Link>
            )}
            <Link to="/defi" className={buttonClasses('secondary')}>
              Défi du jour
            </Link>
          </>
        }
      />

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight text-text">Les jeux</h2>
          <Link to="/classe" className="text-sm font-medium text-accent hover:underline">
            Mode classé →
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {GAMES.map((g, i) => (
            <li key={g.id} className="animate-fade-rise" style={{ animationDelay: `${i * 45}ms` }}>
              <Link
                to={`/jeu/${g.id}`}
                className="block h-full rounded-card focus-visible:outline-none"
                aria-label={`Jouer à ${g.name}`}
              >
                <Card interactive className={cn('flex h-full gap-4 p-5', !g.available && 'opacity-70')}>
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-game-fg shadow-1"
                    style={{ backgroundColor: gameColorVar(g.accentIndex) }}
                  >
                    <IconGlyph game={g.id} size={26} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-text">{g.name}</h3>
                      {!g.available && <Badge>Bientôt</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{g.tagline}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {g.difficulties.map((d) => {
                        const done = clearedCount(clearMask(clears, g.id, d));
                        return (
                          <Badge
                            key={d}
                            tone={done >= OFFLINE_BANK_SIZE ? 'success' : done > 0 ? 'accent' : 'muted'}
                            className="capitalize"
                          >
                            {d}
                            <span className="tabular-nums opacity-80">
                              {done}/{OFFLINE_BANK_SIZE}
                            </span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
