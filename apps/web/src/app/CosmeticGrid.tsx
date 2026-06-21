import { useState } from 'react';
import {
  COSMETICS,
  COSMETIC_CATEGORIES,
  isUnlocked,
  type Cosmetic,
  type CosmeticCategory,
} from '@puzzlehub/shared';
import { cn } from '@puzzlehub/ui';
import { useCosmetics } from './CosmeticsProvider';

const CATEGORY_LABEL: Record<CosmeticCategory, string> = {
  palette: 'Palette',
  pieceSkin: 'Pièces',
  boardTheme: 'Plateau',
};

export function CosmeticGrid({ level }: { level: number }): JSX.Element {
  const { equipped, select } = useCosmetics();
  const [error, setError] = useState<string | null>(null);

  const onPick = async (c: Cosmetic): Promise<void> => {
    setError(null);
    const ok = await select(c.id);
    if (!ok) setError(`« ${c.name} » se débloque au niveau ${c.requiredLevel}.`);
  };

  return (
    <div className="space-y-6">
      {COSMETIC_CATEGORIES.map((cat) => (
        <section key={cat} className="space-y-2">
          <h3 className="text-sm font-medium text-muted">{CATEGORY_LABEL[cat]}</h3>
          <div className="flex flex-wrap gap-2">
            {COSMETICS.filter((c) => c.category === cat).map((c) => {
              const unlocked = isUnlocked(c.id, level);
              const isEquipped = equipped[cat] === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={isEquipped}
                  onClick={() => void onPick(c)}
                  className={cn(
                    'min-w-[8rem] rounded-card border px-3 py-2 text-left text-sm transition-all',
                    isEquipped
                      ? 'border-accent bg-surface-2 text-text shadow-1 ring-1 ring-accent'
                      : 'border-border bg-surface text-text hover:-translate-y-0.5 hover:border-accent hover:shadow-1 motion-reduce:transform-none',
                    !unlocked && 'cursor-not-allowed opacity-50 hover:translate-y-0 hover:border-border hover:shadow-none',
                  )}
                >
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-muted">
                    {isEquipped ? 'Équipé' : unlocked ? 'Disponible' : `Niveau ${c.requiredLevel} requis`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {error && (
        <p className="text-sm text-danger" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
