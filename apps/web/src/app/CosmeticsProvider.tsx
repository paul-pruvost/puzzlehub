import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_COSMETICS, findCosmetic, type CosmeticCategory } from '@puzzlehub/shared';
import { applyCosmetics } from '@puzzlehub/ui';
import { getCosmetics, selectCosmetic, type CosmeticsState } from '../api/client';
import { useAuth } from './AuthProvider';

const STORAGE_KEY = 'puzzlehub-cosmetics';

type Equipped = Record<CosmeticCategory, string>;

interface CosmeticsCtx {
  state: CosmeticsState | null;
  equipped: Equipped;
  /** Équipe un cosmétique (serveur autoritatif). Renvoie false si refusé (403). */
  select: (id: string) => Promise<boolean>;
}

const Ctx = createContext<CosmeticsCtx | null>(null);

/** Lit le fallback localStorage, en se limitant aux ids existants (anti-triche). */
function readLocal(): Equipped {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COSMETICS };
    const parsed = JSON.parse(raw) as Partial<Equipped>;
    const out: Equipped = { ...DEFAULT_COSMETICS };
    for (const cat of Object.keys(DEFAULT_COSMETICS) as CosmeticCategory[]) {
      const id = parsed[cat];
      if (typeof id === 'string' && findCosmetic(id)?.category === cat) out[cat] = id;
    }
    return out;
  } catch {
    return { ...DEFAULT_COSMETICS };
  }
}

function writeLocal(equipped: Equipped): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipped));
  } catch {
    /* stockage indisponible : application en mémoire seulement */
  }
}

/** Mappe la sélection (ids) vers les tokens appliqués sur la racine. */
function applyEquipped(equipped: Equipped): void {
  applyCosmetics(document.documentElement, {
    palette: findCosmetic(equipped.palette)?.token ?? 'default',
    skin: findCosmetic(equipped.pieceSkin)?.token ?? 'default',
    boardTheme: findCosmetic(equipped.boardTheme)?.token ?? 'default',
  });
}

export function CosmeticsProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user, progress } = useAuth();
  const [state, setState] = useState<CosmeticsState | null>(null);
  const [equipped, setEquipped] = useState<Equipped>(() => readLocal());

  // Application visuelle à chaque changement (fallback avant login).
  useEffect(() => {
    applyEquipped(equipped);
  }, [equipped]);

  // Au login / changement de niveau : re-fetch la source de vérité serveur.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getCosmetics().then((s) => {
      if (cancelled || !s) return;
      setState(s);
      setEquipped(s.equipped);
      writeLocal(s.equipped);
    });
    return () => {
      cancelled = true;
    };
  }, [user, progress?.level]);

  const select = useCallback(async (id: string): Promise<boolean> => {
    try {
      const next = await selectCosmetic(id);
      setEquipped(next);
      writeLocal(next);
      setState((prev) => (prev ? { ...prev, equipped: next } : prev));
      return true;
    } catch {
      return false;
    }
  }, []);

  return <Ctx.Provider value={{ state, equipped, select }}>{children}</Ctx.Provider>;
}

export function useCosmetics(): CosmeticsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCosmetics doit être utilisé dans un CosmeticsProvider');
  return ctx;
}
