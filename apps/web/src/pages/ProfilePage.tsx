import { DIFFICULTIES, OFFLINE_BANK_SIZE, clearMask, clearedCount, xpThresholdForLevel } from '@puzzlehub/shared';
import { Card, IconGlyph, Panel, gameColorVar } from '@puzzlehub/ui';
import { GAMES } from '../games/registry';
import { useAuth } from '../app/AuthProvider';
import { useCosmetics } from '../app/CosmeticsProvider';
import { useOfflineProgress } from '../app/OfflineProgressProvider';
import { CosmeticGrid } from '../app/CosmeticGrid';

export function ProfilePage(): JSX.Element {
  const { user, progress } = useAuth();
  const { state } = useCosmetics();
  const { clears } = useOfflineProgress();

  if (!user) {
    return (
      <Panel className="space-y-2 p-6">
        <h1 className="font-display text-xl font-bold text-text">Profil</h1>
        <p className="text-muted">Connecte-toi pour voir ta progression et tes cosmétiques.</p>
      </Panel>
    );
  }

  const xp = progress?.xp ?? 0;
  const level = state?.level ?? progress?.level ?? 0;
  const base = xpThresholdForLevel(level);
  const next = xpThresholdForLevel(level + 1);
  const ratio = next > base ? Math.min(1, Math.max(0, (xp - base) / (next - base))) : 0;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl font-bold text-text">{user.displayName}</h1>
          <p className="text-sm text-muted">
            Niveau <span className="font-semibold tabular-nums text-text">{level}</span> ·{' '}
            <span className="tabular-nums">{xp}</span> XP
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Niveau {level}</span>
            <span className="tabular-nums">
              {Math.max(0, next - xp)} XP avant le niveau {level + 1}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-pill bg-surface-2">
            <div
              className="h-full rounded-pill bg-gradient-accent transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-text">Progression par jeu</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.filter((g) => g.available).map((g) => (
            <Card key={g.id} className="flex items-center gap-3 p-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-game-fg shadow-1"
                style={{ backgroundColor: gameColorVar(g.accentIndex) }}
              >
                <IconGlyph game={g.id} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-semibold text-text">{g.name}</div>
                <div className="mt-1.5 space-y-1">
                  {DIFFICULTIES.map((d) => {
                    const done = clearedCount(clearMask(clears, g.id, d));
                    return (
                      <div key={d} className="flex items-center gap-2 text-xs">
                        <span className="w-14 shrink-0 capitalize text-muted">{d}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-2">
                          <div
                            className="h-full rounded-pill bg-gradient-accent"
                            style={{ width: `${Math.round((done / OFFLINE_BANK_SIZE) * 100)}%` }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right tabular-nums text-muted">
                          {done}/{OFFLINE_BANK_SIZE}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-text">Cosmétiques</h2>
        <p className="text-sm text-muted">
          Débloque des palettes et des skins en gagnant des niveaux. Purement esthétique.
        </p>
        <CosmeticGrid level={level} />
      </section>
    </div>
  );
}
