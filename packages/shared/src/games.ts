/** Identifiants des mini-jeux du catalogue (FND-D-8). */
export type GameId = 'tango' | 'queens' | 'zip' | 'patches' | 'sudoku' | 'nonogram';

/** Paliers de difficulté communs (FND-D-23). */
export type Difficulty = 'facile' | 'moyen' | 'difficile';

export const DIFFICULTIES: readonly Difficulty[] = ['facile', 'moyen', 'difficile'] as const;

/** Coordonnée de case (ligne, colonne), 0-indexée. */
export interface Coord {
  r: number;
  c: number;
}

/** Violation de règle détectée par un validateur, avec les cases fautives. */
export interface Violation {
  rule: string;
  cells: Coord[];
}

export type ValidationStatus = 'valid' | 'invalid' | 'incomplete';

/** Résultat de validation (FND-D-24). `incomplete` = aucune violation mais grille non terminée. */
export interface ValidationResult {
  status: ValidationStatus;
  violations: Violation[];
}
