/** Préférence de thème choisie par l'utilisateur. */
export type ThemePref = 'light' | 'dark' | 'system';

/** Thème effectivement appliqué. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'puzzlehub-theme';

/** Résout la préférence en thème concret selon la préférence système. */
export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

/** Valide une valeur arbitraire (ex. localStorage) en `ThemePref`, défaut `system`. */
export function parseThemePref(value: unknown): ThemePref {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

/** Applique le thème résolu sur l'élément racine via `data-theme`. */
export function applyTheme(
  root: { setAttribute(name: string, value: string): void },
  theme: ResolvedTheme,
): void {
  root.setAttribute('data-theme', theme);
}
