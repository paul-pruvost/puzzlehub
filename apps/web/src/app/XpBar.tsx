import { Link } from 'react-router-dom';
import { findCosmetic, xpThresholdForLevel } from '@puzzlehub/shared';
import { useAuth } from './AuthProvider';
import { useCosmetics } from './CosmeticsProvider';

export function XpBar(): JSX.Element | null {
  const { user, progress } = useAuth();
  const { equipped } = useCosmetics();
  if (!user || !progress) return null;

  const { xp, level } = progress;
  const base = xpThresholdForLevel(level);
  const next = xpThresholdForLevel(level + 1);
  const ratio = next > base ? Math.min(1, Math.max(0, (xp - base) / (next - base))) : 0;

  const palette = findCosmetic(equipped.palette);
  const skin = findCosmetic(equipped.pieceSkin);
  const skinGlyph = skin?.token === 'glyph';

  return (
    <Link
      to="/profil"
      className="hidden items-center gap-2.5 rounded-pill border border-border bg-surface py-1 pl-1.5 pr-3 transition-colors hover:border-accent hover:bg-surface-2 sm:flex"
      title={`Niveau ${level} · ${xp} XP — palette ${palette?.name ?? 'défaut'}, pièces ${skin?.name ?? 'défaut'}`}
      aria-label={`Niveau ${level}, ${xp} XP. Cosmétiques équipés : ${palette?.name ?? 'défaut'}, ${skin?.name ?? 'défaut'}. Voir le profil.`}
    >
      {/* Pastille d'identité = palette cosmétique équipée (suit l'accent via tokens). */}
      <span
        className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-accent text-[11px] font-bold text-accent-fg shadow-1"
        aria-hidden
      >
        {skinGlyph ? '✦' : level}
      </span>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold leading-none text-text">
          <span className="tabular-nums">Niv. {level}</span>
          <span className="text-muted tabular-nums">· {xp} XP</span>
        </div>
        <div className="h-1.5 w-24 overflow-hidden rounded-pill bg-surface-2" aria-hidden>
          <div
            className="h-full rounded-pill bg-gradient-accent transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
