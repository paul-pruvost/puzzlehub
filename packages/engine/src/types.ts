import type { Difficulty, GameId, ValidationResult } from '@puzzlehub/shared';

/**
 * Contrat commun de tous les moteurs de jeu (FND-D-6 / FND-D-24).
 *
 * - `generate` est utilisé UNIQUEMENT hors-ligne pour remplir la banque de
 *   puzzles (FND-D-16) ; il n'est jamais appelé dans le chemin d'une requête.
 * - `solve` / `countSolutions` servent à garantir l'unicité avant insertion.
 * - `validate` est rejoué côté serveur (autoritatif) et peut aussi être appelé
 *   côté front pour un feedback live (sans pénalité).
 *
 * @typeParam Puzzle - état initial servi au joueur (sans la solution).
 * @typeParam Board - état de grille candidat (peut être partiel pour le live).
 */
export interface GameEngine<Puzzle, Board> {
  readonly id: GameId;
  /** Génération déterministe seedée (offline). */
  generate(seed: number, difficulty: Difficulty): Puzzle;
  /** Première solution trouvée, ou `null` si insoluble. */
  solve(puzzle: Puzzle): Board | null;
  /** Nombre de solutions, borné par `cap` (+ `timeoutMs` optionnel, FND-D-16). */
  countSolutions(puzzle: Puzzle, cap: number, timeoutMs?: number): number;
  /** Validation d'un plateau candidat (partiel ou complet). */
  validate(puzzle: Puzzle, board: Board): ValidationResult;
}
