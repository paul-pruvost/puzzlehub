import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  applyTheme,
  parseThemePref,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePref,
} from '@puzzlehub/ui';

interface ThemeCtx {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [pref, setPrefState] = useState<ThemePref>(() =>
    parseThemePref(
      typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null,
    ),
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => applyTheme(document.documentElement, resolveTheme(pref, mq.matches));
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);

  const setPref = (p: ThemePref): void => {
    setPrefState(p);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, p);
    } catch {
      /* stockage indisponible : on garde la préférence en mémoire */
    }
  };

  return <Ctx.Provider value={{ pref, setPref }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  return ctx;
}
