/**
 * Catalogue de cosmétiques (COSM-D-1/COSM-D-2) — statique, versionné, partagé
 * front/back. Esthétique pur, déblocage par **niveau serveur** (no pay-to-win).
 * Le serveur réutilise {@link isUnlocked} comme vérité d'éligibilité ; le front
 * ne s'en sert que pour griser l'UI.
 */

export type CosmeticCategory = 'palette' | 'pieceSkin' | 'boardTheme';

export interface Cosmetic {
  /** Identifiant stable (ex. 'palette-emerald'). */
  id: string;
  category: CosmeticCategory;
  /** Libellé FR affiché. */
  name: string;
  /** Niveau requis pour débloquer (0 = débloqué d'office). */
  requiredLevel: number;
  /** Jeton appliqué côté front (attribut `data-*`, COSM-D-4). */
  token: string;
}

/** Catalogue v1 (5 items, 2 catégories). */
export const COSMETICS: readonly Cosmetic[] = [
  { id: 'palette-default', category: 'palette', name: 'Indigo (défaut)', requiredLevel: 0, token: 'default' },
  { id: 'palette-emerald', category: 'palette', name: 'Émeraude', requiredLevel: 2, token: 'emerald' },
  { id: 'palette-sunset', category: 'palette', name: 'Crépuscule', requiredLevel: 5, token: 'sunset' },
  { id: 'palette-ocean', category: 'palette', name: 'Océan', requiredLevel: 8, token: 'ocean' },
  { id: 'palette-rose', category: 'palette', name: 'Rose poudré', requiredLevel: 12, token: 'rose' },
  { id: 'palette-mono', category: 'palette', name: 'Monochrome', requiredLevel: 18, token: 'mono' },
  { id: 'skin-default', category: 'pieceSkin', name: 'Classique (défaut)', requiredLevel: 0, token: 'default' },
  { id: 'skin-glyph', category: 'pieceSkin', name: 'Glyphes', requiredLevel: 3, token: 'glyph' },
  { id: 'skin-neon', category: 'pieceSkin', name: 'Néon', requiredLevel: 7, token: 'neon' },
  { id: 'skin-retro', category: 'pieceSkin', name: 'Rétro', requiredLevel: 15, token: 'retro' },
  { id: 'theme-default', category: 'boardTheme', name: 'Standard (défaut)', requiredLevel: 0, token: 'default' },
  { id: 'theme-paper', category: 'boardTheme', name: 'Papier', requiredLevel: 4, token: 'paper' },
  { id: 'theme-slate', category: 'boardTheme', name: 'Ardoise', requiredLevel: 10, token: 'slate' },
];

export const COSMETIC_CATEGORIES: readonly CosmeticCategory[] = ['palette', 'pieceSkin', 'boardTheme'];

/** Cosmétique équipé par défaut pour chaque catégorie (toujours débloqué). */
export const DEFAULT_COSMETICS: Record<CosmeticCategory, string> = {
  palette: 'palette-default',
  pieceSkin: 'skin-default',
  boardTheme: 'theme-default',
};

/** Cosmétiques éligibles pour un niveau donné. */
export function unlockedCosmetics(level: number): Cosmetic[] {
  return COSMETICS.filter((c) => c.requiredLevel <= level);
}

export function findCosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

/** Éligibilité d'un cosmétique pour un niveau (vérité serveur ET front). */
export function isUnlocked(id: string, level: number): boolean {
  const c = findCosmetic(id);
  return c !== undefined && c.requiredLevel <= level;
}
