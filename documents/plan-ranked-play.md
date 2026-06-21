# Plan — Mode classé (Phase 3, agent Opus)

- **Date** : 2026-06-19
- **Statut** : Phase 3 produit (agent Opus) → **validé Phase 4 ci-dessous**
- **Source décisions** : `feature-ranked-play.md` (RANK-D-1..4, H1..H4)

## Découpage en étapes

- **E1 — Schémas Zod de forme dans `packages/shared`** (RANK-D-2). Crée `packages/shared/src/puzzle-schemas.ts` (un schéma par jeu + `puzzleSchemaFor(game)` / `parsePuzzle`), export dans `index.ts`, ajoute `zod ^3.24.1` à `packages/shared/package.json`. Schémas = forme servie **sans solution** (PLAY-D-6), alignés sur les `*Puzzle` engine. Caste vers types engine après `safeParse`. Test de cohérence type.
- **E2 — Hook `useRankedPlay`** (RANK-D-4, cœur). `apps/web/src/play/useRankedPlay.ts` + `types.ts` (`GameRankedConfig<UiState,ServerBoard,Puzzle>`) + `errors.ts` (mapping HTTP→FR). Distingue **UI state** (interaction) et **board serveur** (dérivé via `toServerBoard`). `start`→safeParse, `submit`→`toServerBoard`+refresh XP, `canSubmit`=validation valid (H4), `reset`=relance start (H3), `result.timeMs` officiel (H1). Token gardé interne (jamais exposé). `kind: 'ranked'|'daily'` pour choisir `startPlay`/`startDaily`.
- **E3 — Shell `RankedPlay`** (RANK-D-4). `apps/web/src/play/RankedPlay.tsx` : gate connexion (RANK-D-3), Commencer/Rejouer, slot `renderBoard`, Valider (disabled si !canSubmit), zone résultat (XP/temps/too_fast), erreurs. Générique : ne connaît aucune forme de board.
- **E4 — Configs par jeu (4 jeux, RANK-D-1)**, parallélisables : `games/{tango,queens,zip,patches}/rankedConfig.ts` réutilisant `cells.ts` + `<Game>Board`. Patches = UI state composite `{owner,active}`. `registry.ts` : chargeur classé lazy (pattern `loadBoard`).
- **E5 — Routing `/classe` + `/classe/:game`** (RANK-D-3, H2). `RankedHomePage` (choix jeu+difficulté) + `RankedGamePage` (`findGame`, `<Navigate to="/classe"/>` si inconnu, lazy comme `GamePage`). Routes dans `App.tsx`.
- **E6 — Refactor `DailyPage` sur le hook** (déduplication, RANK-D-4) : supprime `asTangoPuzzle`/état local, monte `<RankedPlay config=tango source={{kind:'daily'}}/>`. Preuve de non-duplication.
- **E7 — (optionnel) Adoption schémas côté API** : non requis (validateur engine déjà robuste, BUG-03). Ne pas borner `board` via Zod serveur. **Écarté du périmètre** (cf. Phase 4).

## Tests

1. Schémas Zod par jeu (`packages/shared`) : parse OK (fixtures/samples) + **malformé rejeté** (given non carré, regions hors domaine, numbers taille≠size, clues manquant, size≤0) + cohérence type (un `*Puzzle` engine passe le schéma).
2. Hook `useRankedPlay` (jsdom + `@testing-library/react`, devDeps à ajouter à `apps/web`) : start OK→playing, malformé→error parse, submit→result+refresh XP, mapping 401/403/409/410/too_fast/network, canSubmit (H4), reset (H3).
3. Garde-fou ESLint anti-`engine/server` couvre `apps/web/src/play/**` (déjà via pattern `apps/web/**`).
4. (opt) rendu shell : gate connexion, Valider disabled.

## Ordre & parallélisme

Critique : E1 → E2 → E3 → E4a(Tango) → E6 (valide l'archi) → E4b/c/d en parallèle → E5. Tests schémas dès E1, tests hook dès E2 (après outillage jsdom). E7 omis.

## Risques (synthèse)

Formes board hétérogènes (Tango Cell[][], Queens 1D dérivé, Zip Coord[], Patches owner+active) ; `too_fast` arrive en **200 OK** (`accepted:false`), pas en exception ; mapping erreurs couplé aux messages `*_failed_${status}` du client (fragile, acceptable) ; outillage test front manquant (jsdom/testing-library) ; `zod` à ajouter à shared (aligner major ^3.24.1) ; divergence Zod↔types engine → test de cohérence ; afficher `result.timeMs` serveur uniquement (H1) ; token jamais exposé.
