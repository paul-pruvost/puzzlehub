/**
 * Application des cosmétiques équipés sur la racine (COSM-D-4), analogue à
 * {@link applyTheme}. Les `token` (ex. 'emerald', 'glyph') pilotent les règles
 * CSS `[data-palette]` / `[data-skin]` définies dans `tokens.css`. Le token
 * 'default' retire l'attribut (retour aux tokens de base).
 */
export interface AppliedCosmetics {
  /** Token de palette (accent) — ex. 'default' | 'emerald' | 'sunset'. */
  palette: string;
  /** Token de skin de pièces — ex. 'default' | 'glyph' | 'neon' | 'retro'. */
  skin: string;
  /** Token de thème de plateau — ex. 'default' | 'paper' | 'slate'. */
  boardTheme: string;
}

interface AttrTarget {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

function setOrRemove(root: AttrTarget, name: string, token: string): void {
  if (token && token !== 'default') root.setAttribute(name, token);
  else root.removeAttribute(name);
}

export function applyCosmetics(root: AttrTarget, cosmetics: AppliedCosmetics): void {
  setOrRemove(root, 'data-palette', cosmetics.palette);
  setOrRemove(root, 'data-skin', cosmetics.skin);
  setOrRemove(root, 'data-board-theme', cosmetics.boardTheme);
}
