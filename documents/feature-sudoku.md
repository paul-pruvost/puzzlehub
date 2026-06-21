# Feature — Mini-Sudoku 6×6 (GAME-Sudoku)

- **Date** : 2026-06-19
- **Statut** : implémenté, validation utilisateur en attente
- **Source** : backlog `GAME-extras` (Mini-Sudoku), `feature-foundation.md` (FND-D-24 unicité, FND-D-16 génération offline, FND-D-20 anti-fuite), pattern moteur Tango/Queens.
- **Résumé** : nouveau jeu Mini-Sudoku 6×6 (chiffres 1..6, boîtes 2×3), moteur seedé à unicité garantie + intégration complète (banque, schéma Zod, registre, plateau entraînement + mode classé).

## Note de procédure (mode autonome)

Nouveau jeu calqué sur le contrat moteur existant (`GameEngine`/`ClientEngine`, surfaces client/serveur). Décisions tranchées par défaut ci-dessous ; pas d'agent Opus (espace de conception cadré par le pattern Tango/Queens). Entièrement vérifiable par tests (déterminisme, unicité, `validate(solve)`).

## Décisions

- **SUD-D-1 — Format** : grille 6×6, chiffres 1..6, **boîtes 2 lignes × 3 colonnes** (6 boîtes de 6 cases). Taille fixe quelle que soit la difficulté.
- **SUD-D-2 — Modèle** :
  - `SudokuPuzzle { size: 6, boxRows: 2, boxCols: 3, given: (number|null)[][] }` (servi SANS solution).
  - `SudokuBoard = (number|null)[][]` (candidat, partiel ou complet).
- **SUD-D-3 — Génération seedée déterministe** (`mulberry32`, FND-D-16) : (1) solution complète par backtracking avec ordre des chiffres mélangé seedé ; (2) retrait des cases dans un ordre seedé tant que l'**unicité** est préservée (`countSolutions(cap=2)===1`). Difficulté = nombre de givens cible (facile garde plus d'indices, difficile en retire davantage).
- **SUD-D-4 — Unicité garantie** (FND-D-24) : aucune case retirée si cela crée une 2ᵉ solution. Cap de comptage = 2 (suffit à prouver l'unicité).
- **SUD-D-5 — Validateur durci** (anti-triche, BUG-03) : board issu du réseau → vérif forme 6×6 + domaine `{1..6, null}` ; respect des givens ; pas de doublon en ligne / colonne / boîte. `status` = `valid` (complet & cohérent) / `invalid` (conflit ou forme) / `incomplete`.
- **SUD-D-6 — Surfaces** : `sudokuValidate` exposé côté client (sûr) ; `sudokuEngine` (generate/solve/countSolutions) **serveur uniquement** (`@puzzlehub/engine/server`). Pas de fuite de solution (FND-D-20).
- **SUD-D-7 — Intégration** : `GameId` étendu à `'sudoku'` ; schéma Zod `sudokuPuzzleSchema` (shared) ; banque (`PLAYABLE_GAMES`/`SERVER_GAMES`) ; registre + plateau entraînement (`SudokuBoardPage`) + mode classé (`games/sudoku/ranked.tsx`) via le shell partagé ; samples offline.

## Impact

- `packages/shared` : `GameId += 'sudoku'`, `sudokuPuzzleSchema`. **Tous les `Record<GameId,...>` doivent intégrer la clé** (le compilateur guide).
- `packages/engine` : `sudoku.ts` + exports (index/client/server), tests + proptest + cohérence schéma.
- `apps/api` : `bank.ts` (PlayableGame + SERVER_GAMES).
- `apps/web` : `games/sudoku/*`, registre, samples.
- Aucun changement de contrat serveur `/play/*` (le nouveau jeu réutilise les endpoints existants).

## Vérif

- Déterminisme (même seed → même puzzle), unicité (`countSolutions(cap2)===1`), `validate(solve)=valid`, rejet board malformé, doublons ligne/col/boîte détectés. Property-based ajouté.
