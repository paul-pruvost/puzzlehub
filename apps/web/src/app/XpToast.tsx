import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { unlockedCosmetics } from '@puzzlehub/shared';
import { useAuth } from './AuthProvider';

interface Toast {
  id: number;
  text: string;
  level?: boolean;
  unlock?: boolean;
}

/**
 * Feedback de progression (XP-D-1/XP-D-2). Observe l'état `progress` (source
 * serveur) : un gain d'XP affiche « +X XP », une montée de niveau une annonce
 * dédiée + un éventuel déblocage de cosmétique. Idempotent : la comparaison se
 * fait sur la valeur **précédente** mémorisée (pas de re-déclenchement au refetch
 * identique). Respecte `prefers-reduced-motion`.
 */
export function XpToast(): JSX.Element | null {
  const { progress } = useAuth();
  const prev = useRef<{ xp: number; level: number } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!progress) {
      prev.current = null;
      return;
    }
    const before = prev.current;
    prev.current = { xp: progress.xp, level: progress.level };
    if (!before) return; // premier état connu : aucune notif (pas un gain)

    const next: Toast[] = [];
    const gained = progress.xp - before.xp;
    if (gained > 0) next.push({ id: Date.now(), text: `+${gained} XP` });
    if (progress.level > before.level) {
      next.push({ id: Date.now() + 1, text: `Niveau ${progress.level} !`, level: true });
      const newly = unlockedCosmetics(progress.level).filter(
        (c) => c.requiredLevel > before.level,
      );
      if (newly.length > 0) {
        next.push({ id: Date.now() + 2, text: 'Nouveau cosmétique débloqué !', unlock: true });
      }
    }
    if (next.length === 0) return;
    setToasts((t) => [...t, ...next]);
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => !next.some((n) => n.id === x.id)));
    }, 4000);
    return () => clearTimeout(timer);
  }, [progress]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            'pointer-events-auto animate-pop-in rounded-pill border px-4 py-2 text-sm shadow-2 ' +
            (t.level || t.unlock
              ? 'border-transparent bg-gradient-accent font-semibold text-accent-fg'
              : 'border-border bg-surface font-medium text-text')
          }
        >
          {t.unlock ? (
            <Link to="/profil" className="underline">
              {t.text}
            </Link>
          ) : (
            <span>{t.text}</span>
          )}
        </div>
      ))}
    </div>
  );
}
