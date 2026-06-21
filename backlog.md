# Backlog — puzzlehub

Priorités (KISS) : `HOT`, `WARM`, `COLD`. Statuts : `TODO`, `DOING`, `DONE`.
> Claude ne passe jamais une entrée à `DONE` de sa propre initiative — seul l'utilisateur valide.

## Fondations

- [HOT][DONE-pending-user] FND — Décisions fondatrices FND-D-1..27 + boucle multi-agents Opus close (challenge/sécu/plan/compréhension), Phase 4 validée. _(attend ta validation pour DONE)_
- [HOT][DONE-pending-user] SEC-DOC — Modèle de menace `documents/security-threat-model.md` rédigé. _(implémentation = lot L3)_
- [HOT][DONE-pending-user] L0 — Scaffolding monorepo pnpm (`packages/shared`, `packages/engine`), TS strict, ESLint, Vitest, tsconfig base + paths. `typecheck`/`lint`/`test` verts. _(reste : apps/web, apps/api, packages/ui, CI GitHub Actions)_
- [HOT][DONE-pending-user] ENG — Contrat moteur commun (`GameEngine`) + PRNG seedé portable (mulberry32) dans `packages/shared`.
- [HOT][DONE-pending-user] GAME-Tango (moteur) — générateur seedé + solveur + `countSolutions` (cap) + validateur, 3 difficultés, **unicité garantie**, 6 tests verts. _(reste : UI + tutoriel)_
- [HOT][DOING] L1 — Spike faisabilité génération — **superséd​é** : la faisabilité Queens/Zip/Patches est démontrée par les moteurs livrés (unicité garantie, tests verts) ; spike Zip chiffré dans `documents/feature-zip.md`. Plus de blocage. _(attend ta validation pour DONE)_
- [HOT][DONE-pending-user] L0-bis-ui — packages/ui (tokens light/dark sobres + preset Tailwind + theme utils, 4 tests) + apps/web (shell React/Vite/Tailwind, thème+toggle anti-FOUC, routing, registre Tango/Queens/Zip/Patches, accueil). typecheck/lint/test/build verts.
- [HOT][DONE-pending-user] SEC-FRONT — Audit front (`docs/audit/front-2026-06-18.md`) : FOUC/focus/reduced-motion/contraste corrigés + garde-fou ESLint anti-import moteur serveur.
- [HOT][DOING] L0-bis-api — apps/api (Fastify) **livré** (cf. AUTH) + **CI GitHub Actions livrée** : `.github/workflows/ci.yml` (push main + PR, Node 20/pnpm 9.12, install gelé → typecheck/lint/test/build). Doc `feature-ci.md`. Parité commandes vérifiée en local. _(attend ta validation pour DONE)_
- [WARM][DOING] FRONT-board-contract — contrat d'extension **documenté** (section technique `CLAUDE.md` : registre `GameMeta` + `loadBoard`/`loadRanked` lazy, shell `play/`, frontière par-jeu ↔ infra). Tutoriel par jeu présent (bloc `<details>` des BoardPages). _(attend ta validation pour DONE)_
- [WARM][TODO] CSP-hash — hash SHA-256 du script anti-FOUC pour CSP stricte (RF-12, avec L3).
- [COLD][TODO] FRONT-i18n — extraire les libellés en dur (FND-D-15, RF-16).

## Expérience de jeu (interactions & lisibilité)

> Doc `documents/feature-jeux-interactions.md` (UX-D-1..7). Plateaux partagés entraînement ↔ classé : vérifier les deux surfaces.

- [HOT][DOING] OFLP — **IMPLÉMENTÉ (attend validation)** — Progression hors-ligne + niveaux par jeu + niveau global → cosmétiques : XP aussi en entraînement (first-clear par niveau distinct, anti-farm), campagne de niveaux ordonnés par jeu (banque générée au build, puzzles seuls — pas de fuite de solution), **un seul niveau global** (classé autoritatif + offline en sommants disjoints) débloquant des cosmétiques étendus. Réouvre PROG-D-3 (XP client) — sanctionné, cosmétique only. Décisions OFLP-D-1..8 + CORR-1 (clears bitmask) appliqués. Banque générée au build (puzzles seuls), `OfflineClearStore` + endpoints idempotents, store local + provider + fusion au login, boucle « niveau N / suivant » dans les 6 jeux, +3 palettes, progression accueil/profil. Impl. via **sous-agents Opus** (banque, serveur) + moi (shared/web). `pnpm typecheck/lint/test (206/206)/build` ✅, boot api ✅. Doc `feature-offline-progression.md`. _(attend ta validation pour DONE)_
- [HOT][DOING] REDESIGN — **IMPLÉMENTÉ (attend validation)** : refonte UI complète + correction fin de niveau. Direction « atelier de logique » : neutres chauds papier/encre, police display **Bricolage Grotesque** + Inter (déviation assumée vs Space Grotesk, cf. doc), accent indigo + identité couleur par jeu, hero, header sticky, écran de jeu + timer + **état de victoire célébré** (overlay), plateau classé verrouillé proprement (corrige le « plateau inerte »). `packages/ui` gagne 8 composants (Button/Card/Panel/Badge/Hero/IconGlyph/Timer/ResultOverlay) ; `TrainingShell` factorisé. Périmètre visuel only (moteurs/contrats/anti-triche/gestes intacts). `pnpm typecheck/lint/test (182/182)/build` ✅. Doc `feature-redesign.md` (L0..L6). **Complément** : design des 6 plateaux amélioré (2 sous-agents Opus bg), barre d'XP + cosmétiques (palette/skin équipés), tokens `accent-soft`/`danger-soft` en color-mix (fix des `/opacity` inopérants). **Reste** : vérif visuelle classé (auth Google) + ton aval. _(attend ta validation pour DONE)_

- [HOT][DOING] UX-palette — tokens palette daltonien-safe `--game-1..9` + `--game-fg` + `--tango-sun/moon` (light/dark) dans `packages/ui` + preset + helper `gameColorVar` (3 tests). Plan E1/UX-D-4. _(attend validation pour DONE)_
- [HOT][DOING] UX-zip-drag — tracé Zip au pointeur (`onPointerDown`+`onPointerEnter`, `touch-action:none`, clavier Entrée/Espace), `nextPath` réutilisé ; +3 tests drag/mur/troncature. Plan E2/UX-D-1. _(attend validation pour DONE)_
- [HOT][DOING] UX-tango-clic — Tango clic gauche=soleil / droit=lune (`applyTangoClick` centralisé, `onContextMenu` neutralisé, clavier cycle) + couleurs ambre/ardoise ; +2 tests. Plan E3/UX-D-2. _(attend validation pour DONE)_
- [HOT][DOING] UX-sudoku-saisie — wrapper `SudokuPlay` (sélection + clavier 1..size/flèches/effacement + pavé), `setDigit`/`moveSelection`/`sharesUnit`, surbrillance ligne/col/boîte ; +6 tests. Plan E4/UX-D-3. _(attend validation pour DONE)_
- [HOT][DOING] UX-queens-couleurs — Queens régions colorées (`gameColorVar` + bordures/numéros conservés, contenu en `--game-fg`). Plan E5/UX-D-5. _(attend validation pour DONE)_
- [WARM][DOING] UX-lisibilite-jeux — Patches rectangles colorés, Nonogram plein en accent, Zip départ/arrivée annelés. Plan E6/E7/UX-D-6. _(reste : passe a11y contrastes E8 fine ; attend validation)_

## Moteur & jeux

- [HOT][TODO] ENG — Contrat moteur commun + PRNG seedé + harness de tests d'unicité.
- [HOT][TODO] GAME-Tango — générateur/solveur/validateur + UI + tutoriel.
- [HOT][DONE-pending-user] GAME-Queens (moteur) — générateur seedé + sculptage de régions (unicité garantie) + solveur + validateur durci, 10 tests verts. _(reste : UI + tutoriel)_
- [HOT][DONE-pending-user] SEC-ENG — Audit moteur (`docs/audit/engine-2026-06-18.md`) : BUG-03 (validate forme/domaine) + BUG-07 (split client/serveur) corrigés + tests adverses.
- [HOT][DONE-pending-user] ENG-budget — `countSolutions(puzzle,cap,timeoutMs?)` (signature) ; Patches utilise un **budget en nœuds déterministe** (FND-D-16, PAT-F-3).
- [HOT][DONE-pending-user] GAME-Patches — moteur Shikaku (génération guillotine seedée + unicité + validateur durci/assertion Σaires, 8 tests) + intégration banque/samples/registre + plateau jouable (modèle peinture, a11y bordures+numéros). Audit `docs/audit/patches-2026-06-19.md`.
- [WARM][TODO] PATCHES-a11y — `role=grid` + navigation flèches (PAT-F-4).
- [WARM][DOING] ENG-proptest — **implémenté** : `fast-check` + `packages/engine/src/proptest.test.ts` (P1 `validate(solve)`=valid, P2 unicité cap 2 sur seeds aléatoires, runs bornés CI). Doc `feature-proptest.md`. _(attend ta validation pour DONE)_
- [HOT][DONE-pending-user] GAME-Zip — spike chiffré (5×5/6×6/7×7, déterministe budget-nœuds) + moteur (génération backbite + unicité + validateur durci, 8 tests) + intégration banque/samples/registre + plateau jouable (tracé clic). Audit `docs/audit/zip-2026-06-19.md`. **Les 4 jeux LinkedIn jouables.**
- [WARM][TODO] ZIP-walls — murs en génération pour réduire le nb de points de passage (ZIP-D-7, qualité).
- [WARM][TODO] ZIP-a11y — `role=grid` + navigation flèches (ZIP-F-3).
- [HOT][DOING] GAME-Sudoku — **Mini-Sudoku 6×6 implémenté** : moteur seedé unicité garantie + solveur + validateur durci (`packages/engine/src/sudoku.ts`, 9 tests + proptest + cohérence schéma), schéma Zod, banque (`PLAYABLE_GAMES`/`SERVER_GAMES`), registre, plateau entraînement (`SudokuBoardPage`) + mode classé (`games/sudoku/ranked.tsx`) + samples. Doc `feature-sudoku.md`. **5ᵉ jeu jouable.** _(attend ta validation pour DONE)_
- [HOT][DOING] GAME-Nonogram — **Nonogram/Picross implémenté** : moteur seedé unicité garantie (solveur énumération lignes + élagage colonnes), validateur durci (`packages/engine/src/nonogram.ts`, 8 tests + proptest + cohérence schéma), schéma Zod, banque, registre, plateau entraînement + mode classé + samples. Doc `feature-nonogram.md`. **6ᵉ jeu jouable.** _(attend ta validation pour DONE)_
- [HOT][DOING] BUG-Nonogram-gen — **CORRIGÉ (attend validation)** : génération nonogram `difficile` 10×10 était non fiable (rejection sampling i.i.d. <1 % unique → ~56 % d'échecs → boot api bloqué). Remplacé par génération déterministe 3 phases (A structuré → B réparation bornée par 2 témoins du solveur → C fallback escalier **prouvé unique**, ne lève jamais) dans `packages/engine/src/nonogram.ts`. Décisions NGB-D-1..5 + plan Opus + validation Phase 4 dans `feature-nonogram.md`. `pnpm test` 180/180, boot api OK, sweep 120 seeds × 3 diff sans exception. Perf : typique ~6 ms, pic borné ~525 ms (offline). _(attend ta validation pour DONE)_
- [COLD][TODO] GAME-extras — Lights Out (Mini-Sudoku + Nonogram livrés ci-dessus). Note : Lights Out n'a pas d'unicité garantie en général (noyau de la matrice de bascule) → cadrer avant impl.

## Auth & sécurité

- [HOT][DONE-pending-user] AUTH — apps/api Fastify : Google OIDC (Authorization Code + PKCE), validation id_token (JWKS/iss/aud/exp/nonce, RS256 épinglé), session cookie httpOnly/Secure/SameSite + rotation, CSRF double-submit, Helmet/CORS/rate-limit, suppression compte RGPD, audit+redact PII. 18 tests (pkce/csrf/idtoken/app). Stores in-memory.
- [HOT][DONE-pending-user] SEC-AUTH — Audit sécu (`docs/audit/auth-2026-06-19.md`) : SEC-C1/C2/E1 (state usage-unique via TxStore serveur) + SEC-E2 (rotation) + SEC-M1 (audit/redact) + SEC-M2 (trustProxy) corrigés + test de rejeu.
- [HOT][DOING] AUTH-prisma — **implémenté** : stores Prisma `User`/`Session`/`OidcTx` (`src/store/prisma.ts`) derrière les interfaces existantes, factory `createAuthStores()` (`DATABASE_URL` → Prisma, sinon in-memory), `consume` atomique (delete-returning, anti-rejeu), cascade sessions RGPD, schema + migration initiale (`prisma/migrations/`), `docker-compose.yml` + `.env.example`, scripts `db:generate/migrate/deploy` + postinstall. Doc `feature-auth-prisma.md`. 121 tests verts. **Reste (non vérifiable ici)** : appliquer les migrations sur un Postgres réel + tests d'intégration I/O. _(attend ta validation pour DONE)_
- [WARM][TODO] AUTH-hardening — idle timeout session (SEC-E3), CSP stricte (SEC-F1), liaison renforcée du state (SEC-C2 résiduel).
- [HOT][DONE-pending-user] ANTICHEAT — Boucle de jeu solo serveur-autoritative : banque in-memory, `/play/start` (token de début signé HMAC) + `/play/submit` (temps serveur, validation rejouée, attempt usage unique, anti-bot too_fast). 14 tests. Audit `docs/audit/play-2026-06-19.md` (F1/F3/F4/F6 corrigés).
- [HOT][DONE-pending-user] GAME-Tango (front) — plateau jouable hors-ligne (samples), validation live client, tutoriel, sélecteur difficulté, lazy-load (RF-14).
- [HOT][DONE-pending-user] GAME-Queens (front) — plateau jouable (a11y daltonisme bordures+numéros, croix d'exclusion, validation live, tutoriel, lazy-load). Audit `docs/audit/front-queens-2026-06-19.md` (a11y/garde corrigés).
- [HOT][DONE-pending-user] AUTH-front — client API (`api/client.ts`, credentials+CSRF, URL via env) + AuthProvider/AuthControls (login Google top-level, logout, /auth/me).
- [HOT][DOING] PLAY-ranked-ui — mode classé 4 jeux **implémenté** (E1→E6) : schémas Zod `packages/shared/src/puzzle-schemas.ts` (E1), hook `apps/web/src/play/useRankedPlay.ts` (E2), shell `RankedPlay.tsx` (E3), configs `games/*/ranked.tsx` (E4), routes `/classe` + `/classe/:game` (E5), `DailyPage` dédupliquée (E6). 119 tests verts, lint/typecheck/build verts. Décisions `feature-ranked-play.md` RANK-D-1..4, plan `plan-ranked-play.md`. _(attend ta validation pour DONE)_
- [WARM][DOING] FRONT-factor — réalisé via PLAY-ranked-ui : hook `useRankedPlay` + shell `RankedPlay` partagés (E2/E3), DailyPage dédupliquée (E6). _(attend ta validation pour DONE)_
- [WARM][TODO] PLAY-tournoi — T-C4/C5/C8 (attempt non réinitialisable, moves incrémentaux, fenêtre, clusters, gain XP serveur).

## Méta-progression & expérience

- [HOT][DONE-pending-user] XP — XP serveur-autoritative idempotente (barème F/M/D, crédit sur valid && !too_fast) + niveaux (formule partagée shared) + barre d'XP front. Audit `docs/audit/progression-2026-06-19.md` (F7 TOCTOU corrigé).
- [HOT][DONE-pending-user] DAILY — Défi quotidien (seed date UTC, même puzzle, 1 démarrage/jour atomique, bonus +50%) + page Défi du jour (mode classé Tango, soumission serveur).
- [WARM][DOING] RANKED-queens — **couvert par PLAY-ranked-ui** : `/classe/queens` (config `games/queens/ranked.tsx`, soumission serveur via le shell partagé). _(attend ta validation pour DONE)_
- [WARM][TODO] DAILY-resume — reprise d'un défi en cours (au lieu du blocage si abandon).
> Doc `documents/feature-cosmetics-xp.md` + plan `plan-cosmetics-xp.md` (E0..E12).

- [WARM][DOING] XP-FEEDBACK — `XpToast` global (« +X XP » + level-up idempotent via `useRef` + annonce déblocage, `aria-live`, reduced-motion), barre header cliquable→/profil. Plan E12, XP-D-1/2/3. _(attend validation pour DONE)_
- [WARM][DOING] COSMETICS-shared — catalogue `packages/shared/src/cosmetics.ts` (5 items, 2 catégories) + `unlockedCosmetics`/`isUnlocked`/`findCosmetic` + 6 tests. Plan E1. COSM-D-1/2. _(attend validation)_
- [WARM][DOING] COSMETICS-store — `SelectionStore` in-memory↔Prisma + modèle `CosmeticSelection` + migration `20260620000000_add_cosmetic_selection` + factory `createGameStores` + cascade RGPD in-memory + tests. Plan E2/E3/E5/E6. COSM-D-5. _(reste : appliquer la migration sur un Postgres réel, non vérifiable ici ; attend validation)_
- [WARM][DOING] COSMETICS-api — `GET /me/cosmetics` + `POST /me/cosmetics/select` (CSRF, Zod strict, **403 `locked`** par niveau serveur) + 6 tests d'intégration. Plan E4. COSM-D-2/3. _(attend validation)_
- [WARM][DOING] COSMETICS-front — client API + fallback localStorage + `applyCosmetics`/tokens (palette accent + skin glyphes Tango) + `CosmeticsProvider` + page Profil `/profil` + `CosmeticGrid`. Plan E7..E11. COSM-D-3/4, XP-D-3. _(attend validation)_
- [COLD][TODO] COSMETICS-palette-merge — dette : la palette cosmétique redéfinit `--color-accent` ; envisager d'unifier avec `--game-*` si besoin. Plan R1.
- [COLD][TODO] AUDIO — musique ambiance + SFX, mute/volume persistés.
- [WARM][TODO] ONBOARD — tutoriels interactifs par jeu, rejouables.

## Multijoueur & tournois

- [COLD][TODO] TOURN — tournois publics/privés asynchrones (même seed, classement serveur).
- [COLD][TODO] MP-RT — duel temps réel WebSocket.
