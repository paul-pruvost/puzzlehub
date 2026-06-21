import type { ClientEngine } from '@puzzlehub/engine';
import type { GameId } from '@puzzlehub/shared';

/**
 * Contrat de factorisation du mode classé (RANK-D-4) : ce que chaque jeu
 * fournit au hook `useRankedPlay` et au shell `RankedPlay`.
 *
 * Deux types distincts par jeu (point d'architecture central) :
 *  - `UiState` : état d'interaction (ce que l'utilisateur manipule à l'écran) ;
 *  - `ServerBoard` : plateau au format attendu par le validateur engine et par
 *    `/play/submit`, dérivé de l'UiState via `toServerBoard`.
 *
 * Pour Tango/Zip ils coïncident ; pour Queens (grille d'affichage → colonnes)
 * et Patches (owner + case active) ils diffèrent.
 */
export interface GameRankedConfig<UiState, ServerBoard, Puzzle> {
  readonly id: GameId;
  /** Surface moteur SÛRE côté client (`validate` only — jamais engine/server). */
  readonly client: ClientEngine<Puzzle, ServerBoard>;
  /** État d'interaction initial dérivé du puzzle servi. */
  initialState(puzzle: Puzzle): UiState;
  /** Projection vers le plateau soumis au serveur / validé. */
  toServerBoard(state: UiState): ServerBoard;
}
