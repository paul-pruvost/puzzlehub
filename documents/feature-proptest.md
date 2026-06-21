# Feature — Tests property-based des moteurs (ENG-proptest)

- **Date** : 2026-06-19
- **Statut** : implémenté, validation utilisateur en attente
- **Source** : backlog `ENG-proptest`, audit `engine-2026-06-18.md` (reste property-based).
- **Résumé** : valider sur de nombreux seeds aléatoires les invariants des 4 moteurs (unicité + `validate(solve)`), via `fast-check`.

## Note de procédure (mode autonome)

Choix de lib (`fast-check`) documenté ci-dessous (golden rule). Pas d'agent Opus : périmètre = tests, pas de conception. Décisions tranchées par défaut.

## Décisions

- **PROP-D-1 — `fast-check`** comme runner property-based (devDep racine, aux côtés de Vitest).
- **PROP-D-2 — Propriétés par moteur** (sur seed aléatoire) :
  - P1 : `solve(generate(seed,d))` ≠ null **et** `validate(puzzle, solve)` = `valid` (soundness solveur ↔ validateur).
  - P2 : `countSolutions(puzzle, 2)` = 1 (unicité garantie, FND-D-24).
- **PROP-D-3 — Budget CI** : `numRuns` borné par moteur (les générations/comptages coûtent, surtout Zip 7×7). Difficulté `facile` (et `moyen` quand peu coûteux) ; cap de comptage à 2 (suffit pour prouver l'unicité). Timeout de test élargi pour Zip.

## Impact

- Ajout `fast-check` (devDep racine), nouveau fichier `packages/engine/src/proptest.test.ts`.
- Aucun code applicatif modifié ; renforce la confiance dans les moteurs (anti-régression unicité/soundness).
- CI : runs bornés pour rester rapide.
