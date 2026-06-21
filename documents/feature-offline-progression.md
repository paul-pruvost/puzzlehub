# Feature — Progression hors-ligne, niveaux par jeu & niveau global (OFLP)

- **Date** : 2026-06-21
- **Statut** : **implémenté + testé** (L0..L6, CORR-1 appliqué), validation utilisateur en attente.
- **Source** : demande utilisateur — « l'XP ne devrait pas être qu'en classé, même hors-ligne c'est possible » ; « se souvenir du dernier niveau fini par jeu pour ne pas refaire les mêmes » ; « un niveau global qui monte grâce à tous les jeux et débloque d'autres cosmétiques ».
- **Résumé** : étendre la progression au mode entraînement (hors-ligne), avec une **campagne de niveaux ordonnés par jeu** (mémorisation du dernier niveau fini), alimentant **un niveau global unique** (tous jeux, deux modes) qui débloque des cosmétiques. (L'amélioration esthétique des jeux est traitée à part, dans REDESIGN.)

## Phase 1 — Besoin (écoute)

1. **XP hors-ligne** : actuellement l'XP n'est créditée qu'en **classé** (serveur autoritatif). L'utilisateur veut que l'entraînement compte aussi.
2. **Mémoire par jeu** : se souvenir du **dernier niveau terminé** par jeu, pour proposer le suivant et ne pas rejouer les mêmes grilles.
3. **Niveau global** : un seul niveau qui monte grâce à **tous** les jeux (classé + entraînement) et **débloque davantage de cosmétiques**.

## Phase 2 — Challenge & décisions

### Le « pourquoi » d'origine (RAG) et sa réconciliation

- **PROG-D-3 / T-C7** : « XP créditée uniquement sur Attempt valide, **aucun endpoint d'écriture d'XP côté client** » → choix **anti-triche** : le client n'est pas fiable, donc seul le serveur (token de début signé, validation, idempotence) crédite l'XP. L'entraînement est purement client → une XP y serait falsifiable.
- **Réconciliation** : les cosmétiques sont **purement esthétiques, no-pay-to-win** (COSM-D), et l'XP **ne pilote aucun classement compétitif** dans le MVP. Donc tricher l'XP hors-ligne ne donne qu'un avantage **cosmétique pour soi-même** → risque acceptable. On peut ouvrir la progression hors-ligne **sans casser** l'autorité serveur du classé.

### Décisions (tranchées par défaut, mode autonome — révisables ; sanctionnées par la demande utilisateur)

- **OFLP-D-1 — Progression hors-ligne activée** : l'entraînement crédite de l'XP vers **le même niveau global** et débloque les cosmétiques. Supersède l'implicite « XP classé-only » de PROG-D-3 **pour la progression cosmétique** (l'autorité serveur du classé reste, cf. D-2).
- **OFLP-D-2 — Frontière anti-triche préservée** : le **classé** garde token signé + validation + idempotence + bonus, et reste la **seule source admissible pour tout futur classement compétitif**. L'XP hors-ligne est explicitement marquée **non-compétitive**. Pour limiter l'abus *et* implémenter la mémoire de progression : l'XP hors-ligne est créditée **une seule fois par niveau distinct terminé** (`game × difficulté × index`), au premier clear ; **rejouer ne donne rien**. (Le classé reste la voie « grind » répétable et équitable.)
- **OFLP-D-3 — Niveau global unique** : formule inchangée (PROG-D-2 : `50·n·(n+1)`), alimenté par classé (autoritatif) **+** hors-ligne (first-clear). Déblocage cosmétiques par niveau global (mécanisme COSM inchangé).
- **OFLP-D-4 — Niveaux par jeu** : suivre, par `(jeu, difficulté)`, l'**index du dernier niveau terminé** (et donc le prochain à jouer). L'entraînement charge **le prochain niveau non terminé** au lieu d'un sample fixe ; navigation « précédent / suivant / niveau N ».
- **OFLP-D-5 — Banque de niveaux hors-ligne** : générer **au build** (script Node utilisant `@puzzlehub/engine/server`, **jamais dans le navigateur** — garde-fou ESLint FND-D-20) une banque **ordonnée** par `(jeu, difficulté)` → JSON livré au front (FND-D-16, banque offline seedée). Ne livre **que le puzzle** (jamais la solution ; validation client = `validate` seul). Remplace/étend `samplePuzzles.json`. Volume cible : ~20 niveaux × 3 difficultés × 6 jeux (à ajuster selon le poids).
- **OFLP-D-6 — Persistance** : source de vérité = **serveur si connecté**, sinon **localStorage**. Modèle : `{ perGame: { game: { difficulty: highestClearedIndex } }, claimedLevels }`. XP/niveau global dérivent des clears. Connecté : endpoint **idempotent** par `(user, game, difficulté, index)` (le serveur fait confiance au claim hors-ligne — cosmétique only — mais borne : idempotence + rate-limit). Au login : **fusion** des clears locaux non synchronisés vers le serveur (rejoués, idempotents), puis purge locale. *(Mécanisme détaillé en Phase 3.)*
- **OFLP-D-7 — Cosmétiques étendus** : enrichir le catalogue (COSM, `packages/shared`) avec de nouveaux items à des niveaux plus élevés (ex. +2-3 palettes, +1-2 skins, éventuellement nouvelle catégorie « thème de plateau »), pour que la montée du niveau global continue de débloquer. No-pay-to-win conservé.
- **OFLP-D-8 — UX** : l'entraînement affiche le **numéro de niveau courant** + progression par jeu, et propose **« Niveau suivant »** après un clear (réutilise l'état de victoire RD-D-4). Accueil/Profil : progression par jeu + niveau global (la barre d'XP du header montre déjà le niveau global + cosmétiques équipés).

## Impact (pressenti, à préciser par le plan)

- `packages/shared` : catalogue cosmétiques étendu (COSM), éventuels types de progression partagés.
- `packages/engine/server` + **script de build** : génération de la banque de niveaux ordonnée.
- `apps/web` : source des niveaux (banque générée vs `samplePuzzles.json`), store de progression local (+ sync serveur), boucle entraînement « niveau N / suivant », affichages par jeu, mémoire du dernier niveau.
- `apps/api` : endpoint(s) de progression hors-ligne idempotents + fusion au login (si connecté), `ProgressStore`/Prisma.
- Cohérence anti-triche : aucune fuite de solution (banque = puzzles seuls) ; classé inchangé.

## Questions ouvertes (tranchées par défaut, à confirmer)

- Volume exact de la banque (poids JSON vs nombre de niveaux) → arbitré au plan (lazy-load par jeu probable).
- XP hors-ligne au **même barème** que le classé (sans le bonus quotidien) — first-clear-only ; à confirmer si on veut un facteur réducteur supplémentaire.
- Périmètre cosmétiques v2 (combien d'items, catégories) → proposé au plan.

## Phase 3 — Plan (agent Opus)

Plan en **8 lots L0..L7** (résumé) :
- **L0 — Fondations shared** : déplacer `xpForDifficulty`/barème dans `packages/shared` (re-export côté api → `/play/submit` inchangé) ; nouveau `offline-progress.ts` (types + fonctions XP pures) + `OFFLINE_BANK_SIZE` ; catalogue cosmétiques v2 + (option) catégorie `boardTheme` + câblage `applyCosmetics`.
- **L1 — Banque de niveaux** : script build `apps/api/scripts/build-offline-bank.ts` (hors glob ESLint front, utilise `engine/server`), seed déterministe `offlineSeed(game,diff,index)` (FNV, comme le daily), émet `apps/web/src/games/offline/<game>.levels.json` (puzzles seuls, **jamais** de solution), test de déterminisme.
- **L2 — Persistance serveur** : `OfflineClearStore` (types/memory/prisma, migration additive `@@unique(user,game,difficulty)`), endpoints **idempotents** `POST /me/offline/clear` + `/me/offline/sync` (rate-limit `playKey`, index borné par `OFFLINE_BANK_SIZE`), fold de l'XP offline dans `/me/progress` + `/me/cosmetics`.
- **L3 — Store web + provider** : `offlineProgress.ts` (localStorage) + `OfflineProgressProvider` (sous `AuthProvider`), helpers `api/client`, fusion au login (`max`-merge idempotent puis purge locale).
- **L4 — Boucle entraînement** : `loadLevels.ts` (dynamic import par jeu), `useTrainingLevel.ts`, extension `TrainingShell` (indicateur niveau N, prev/next, **« Niveau suivant »** dans le panneau victoire RD-D-4), migration des 6 `*BoardPage` (détection clear → `recordClear` une fois → `refresh()`), suppression de `samplePuzzles.json` à la fin. **Aucun** import `engine/server`, validation `client.validate` seule.
- **L5 — UI** : progression par jeu (cartes accueil + section profil) ; XpBar inchangée (lit `progress` qui inclut désormais l'offline).
- **L6 — Tests/no-leak** ; **L7 — audit bundle / tuning N** (Zip/Nonogram).

**Clé anti-double-compte** : XP classé (par `attemptId`) et XP offline (dérivée des clears) sont des **sommants disjoints** d'un seul `levelForXp(rankedXp + offlineXp)` → un seul niveau, pas de double crédit, classé intact.

## Phase 4 — Validation

Plan relu point par point vs OFLP-D-1..8 :

| Décision | Couverture | Note |
|---|---|---|
| D-1 (XP offline → niveau global) | ✅ | fold dans `/me/progress`. |
| D-2 (frontière anti-triche, first-clear) | ✅ avec **correctif** ⬇ | classé intact ; sommants disjoints ; rate-limit + index borné. |
| D-3 (niveau global unique) | ✅ | `levelForXp(ranked+offline)`, formule inchangée. |
| D-4 (mémoire niveau par jeu) | ✅ avec correctif ⬇ | suivi par (jeu,difficulté) + nav. |
| D-5 (banque build, pas de fuite) | ✅ | script hors front, JSON puzzles seuls, lazy-load, `parsePuzzle`. |
| D-6 (persistance + merge idempotent) | ✅ | serveur si connecté sinon localStorage, `max`-merge, purge. |
| D-7 (cosmétiques v2) | ✅ | catalogue étendu ; `boardTheme` **optionnel** (peut être différé pour rester léger). |
| D-8 (UX) | ✅ | nav + « Niveau suivant » + progression accueil/profil. |

**Écart bloquant — 1, à corriger avant impl. (CORR-1)** : le plan compacte la progression en un seul **high-water mark** (`highest`) et calcule l'XP offline `= (highest+1)·barème`. Or la **nav « aller au niveau N »** (D-8) permet de finir le niveau 5 sans les 0–4 → sur-crédit de 6 niveaux d'XP (exploit cosmétique + mémoire fausse). 
**Correctif retenu** : suivre l'**ensemble des index distincts terminés** par (jeu, difficulté) — implémentation compacte par **bitmask entier** (N≤~30 tient dans un nombre ; sinon tableau trié). XP offline = `popcount(bitmask)·barème` (first-clear strict, D-2). « Reprendre » = plus petit index non terminé ; nav libre conservée. Le store local, l'endpoint `claim` (idempotent : OR du bit), le `sync` (OR des bitmasks) et `offlineXpTotal` utilisent ce bitmask. *(Remplace la mention « highest cleared index » du plan partout.)*

**Observation (non bloquante)** : `boardTheme` (nouvelle catégorie cosmétique) ajoute du câblage (`applyCosmetics`, tokens, styles de plateau) — livré v2 avec palettes + skins d'abord, puis `boardTheme` + skins néon/rétro en lot séparé. **→ Fait** (voir _Cosmétiques v2 (suite)_ ci-dessous, 2026-06-21).

## Cosmétiques v2 (suite) — `boardTheme` + skins néon/rétro

À la demande de l'utilisateur, la catégorie différée et les skins ont été implémentés :
- **Type** : `CosmeticCategory` étendu à `'boardTheme'` (widening propagé : `DEFAULT_COSMETICS.boardTheme='theme-default'`, `COSMETIC_CATEGORIES`, stores api `Record<CosmeticCategory,…>` via spread de `DEFAULT_COSMETICS` — pas de migration Prisma, la table cosmétique est clé `(userId, category)`).
- **Catalogue** : skins `skin-neon` (niv. 7), `skin-retro` (niv. 15) ; thèmes `theme-default` (0), `theme-paper` (4), `theme-slate` (10).
- **Application** : `applyCosmetics` pose `data-board-theme` (en plus de `data-palette`/`data-skin`) ; les skins ciblent les pièces Tango (`[data-piece]`, comme le skin glyphe, avec `!important` pour battre les styles inline) ; les thèmes ciblent la classe **`.board-stage`** ajoutée aux panneaux de plateau (TrainingShell + RankedPlay). CSS écrit dans `tokens.css` (sous-agent Opus).
- `CosmeticGrid`/Profil affichent la nouvelle catégorie automatiquement (label « Plateau »).
- Tests existants mis à jour (catalogue, stores, `/me/cosmetics`, `applyCosmetics`). `pnpm typecheck`/`lint`/`test (206/206)` verts.

**Verdict** : plan **validé sous réserve de CORR-1** (bitmask au lieu de high-water mark) **et de ton aval explicite** (gros chantier, Phase 4 → autorisation avant code).

> ⚠️ Cette feature **réouvre une décision fondatrice** (PROG-D-3 « pas d'XP côté client », anti-triche) au nom de la progression cosmétique. C'est sanctionné par ta demande, mais c'est un choix structurant : il est tracé ici (OFLP-D-1/D-2) et je l'assume comme révisable.

## Réalisation (L0..L6, multi-agents Opus)

- **L0 (moi)** : barème XP déplacé dans `shared/progression.ts` (api re-exporte) ; `shared/offline-progress.ts` (CORR-1 : clears en **bitmask**, `clearedCount`/`nextUnclearedIndex`/`offlineXpTotal`/`mergeClears`/`globalLevel`, `OFFLINE_BANK_SIZE=20`) ; cosmétiques **+3 palettes** (Océan 8 / Rose 12 / Mono 18) + overrides `tokens.css`. 6 tests.
- **L1 (sous-agent Opus)** : `apps/api/scripts/build-offline-bank.ts` (seed FNV déterministe, `engine/server`, gate unicité in-script, **puzzles seuls**), 6 `apps/web/src/games/offline/<jeu>.levels.json` (20×3, ≤45 ko), `build:bank`, 5 tests (déterminisme + anti-fuite).
- **L2 (sous-agent Opus)** : `OfflineClearStore` (types/memory/prisma + migration `OfflineClear` cascade) ; `POST /me/offline/clear` + `/me/offline/sync` (idempotents, OR de bits, rate-limit 60/min, index borné) ; `/me/progress` + `/me/cosmetics` foldent l'XP offline (`levelForXp(rankedXp+offlineXpTotal)`) ; classé intact. 13 tests.
- **L3 (moi)** : `offlineProgress.ts` (localStorage bitmask), `OfflineProgressProvider` (clears, `recordClear` local+serveur, fusion idempotente au login), helpers `clearOffline`/`syncOffline`.
- **L4 (moi)** : `offline/loadLevels.ts` (chunk lazy par jeu), `useTrainingLevel` (charge banque, démarre au prochain non terminé, nav), `useTrainingClear` (first-clear unique), `TrainingShell` (indicateur niveau N/total, prev/next, **« Niveau suivant »** dans le panneau victoire), **6 pages migrées** (pattern reset-state-during-render, plus de flash). `samplePuzzles.json` supprimé.
- **L5 (moi)** : progression par jeu sur l'accueil (badges `difficulté N/20`) et le profil (barres par difficulté).
- **Vérifs** : `pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm test` **206/206** ✅, `pnpm build` ✅ (banques en chunks lazy par jeu, ~0.9–3.2 ko gzip), boot api ✅.

_(attend ta validation pour DONE)_
