# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

**puzzlehub** — plateforme pour héberger divers mini-jeux. Voir `README.md`.

> État actuel : early scaffolding. Le dépôt ne contient encore que `README.md` (et ce fichier). Aucun code source, build, ni test. La méthodologie ci-dessous s'applique dès la première expression de besoin.

## ⚖️ Règle d'or absolue (prime sur toutes les autres)

> **La documentation pilote le code, et non l'inverse. Toute décision technique doit être écrite dans la documentation AVANT d'être codée.**

Conséquences pratiques :

1. **Aucune ligne de code** ne doit être écrite tant que la décision technique correspondante (choix d'archi, choix de lib, contrat d'API, modèle de données, comportement attendu, etc.) **n'est pas documentée** dans `./documents/` et référencée dans l'[Index documentaire](#index-documentaire).
2. Si une décision n'est pas encore documentée, Claude **arrête le code** et :
   - rédige (ou demande à l'utilisateur de valider) le document de décision dans `./documents/`,
   - met à jour l'index,
   - ouvre une entrée correspondante dans `./backlog.md` si l'implémentation suit.
3. Quand un changement de code révèle qu'une décision implicite n'a jamais été documentée, **on documente d'abord, puis on code** — jamais l'inverse.
4. La documentation est la **source de vérité** ; en cas de désaccord doc ↔ code, c'est le code qui est considéré comme bogué (à corriger ou à ré-aligner sur la doc), sauf si l'utilisateur valide explicitement une mise à jour de la doc.
5. Tout PR / commit / patch significatif s'accompagne du document de décision qui l'a précédé (ou de la mise à jour d'un doc existant).

## 🤖 Mode autonome (par défaut)

> **Claude travaille en autonomie : il ne sollicite pas l'utilisateur et mène lui-même les boucles multi-agents.**

1. **Pas de sollicitation interactive.** Claude n'utilise pas de questions bloquantes (type `AskUserQuestion`) pour faire avancer le travail. Quand une décision n'est pas tranchée, Claude **tranche lui-même** en consignant le choix + la justification + les alternatives écartées dans la section _Décisions_ du document concerné. L'utilisateur reste l'autorité finale et peut réviser après coup (cf. règle d'or §4).
2. **Boucles multi-agents menées seul.** Les phases qui demandent des agents (Phase 3 planification `model: "opus"`, audits, challenge croisé) sont lancées et bouclées par Claude sans demander l'aval intermédiaire de l'utilisateur.
3. **Exceptions où Claude s'arrête quand même** : actions destructrices/irréversibles ou sortantes (cf. politique d'outils), opérations Git interdites (commit/push — l'humain s'en charge), et le passage d'une entrée backlog en `DONE` (réservé à l'utilisateur).
4. Toute hypothèse retenue faute d'information est écrite explicitement dans le doc (section _Décisions_ ou _Questions ouvertes_ marquée « tranché par défaut ») pour rester auditable.

## 🔁 Workflow standard en 4 phases (déclenché à chaque expression de besoin)

Quand l'utilisateur exprime un besoin (feature, évolution, bug à traiter, refacto), Claude **suit strictement ces 4 phases dans l'ordre**, sans en sauter aucune.

### Phase 1 — Écoute

- Claude est en **mode prise de notes uniquement**.
- **Aucune proposition de code**, aucune solution, aucune architecture suggérée.
- Claude consigne ce que dit l'utilisateur dans un document dédié sous `./documents/` (créé à l'ouverture de la phase, format `feature-<slug>.md` ou réutilisation d'un doc existant ; on peut aussi démarrer via `/brainstorm <thème>`).
- Claude peut reformuler ce qu'il a compris pour vérifier, mais sans extrapoler.

### Phase 2 — Challenge

- Claude relit le document de Phase 1 + l'**Index documentaire** (RAG) pour identifier ce qui existe déjà sur le sujet.
- Claude **challenge** le besoin :
  - questions de clarification (cas limites, périmètre, hypothèses implicites),
  - recoupement avec les documents existants (incohérences, doublons, dépendances),
  - analyse d'impact sur le reste du projet (autres docs, modules, contrats).
- Les questions et l'analyse d'impact sont **ajoutées au document** (sections _Questions ouvertes_, _Impact_, _Décisions_).
- On itère **tant qu'il reste un doute**. Pas de passage à la phase 3 tant que la section _Décisions_ n'est pas complète et validée par l'utilisateur.

### Phase 3 — Planification

- Une fois les doutes levés et le doc de décisions validé, Claude **lance un agent** pour produire un plan d'implémentation technique.
- **Contrainte stricte** : l'agent doit être appelé avec `model: "opus"` (Plan ou général, mais modèle Opus obligatoire). Pas de Sonnet, pas de Haiku pour cette étape.
- L'agent reçoit en briefing : le document de décisions validé + les contraintes du projet (règle d'or, conventions backlog, etc.).
- Le plan retourné est enregistré dans le même document (ou un doc lié, `plan-<slug>.md`) et indexé.

### Phase 4 — Validation

- Claude analyse le plan produit par l'agent **point par point** face aux décisions consignées en Phase 2.
- Vérifie : couverture complète des décisions, absence de dérive (l'agent n'invente rien d'extérieur aux décisions), faisabilité, ordre de réalisation, dépendances.
- Liste explicitement les **écarts éventuels** doc ↔ plan, et propose à l'utilisateur de soit (a) corriger le plan, soit (b) mettre à jour le doc de décisions si une nouvelle info émerge.
- Seulement après validation explicite de l'utilisateur, on ouvre les entrées correspondantes dans `./backlog.md` et on peut envisager le code.

> ⚠️ **Aucune ligne de code n'est produite avant la fin validée de la Phase 4.** Les 4 phases sont l'application opérationnelle de la [règle d'or](#%EF%B8%8F-r%C3%A8gle-dor-absolue-prime-sur-toutes-les-autres).

## Rôle de ce fichier

Ce `CLAUDE.md` sert d'**index documentaire (RAG)** pour le projet. Il référence tous les documents stockés dans `./documents/` afin que Claude puisse retrouver rapidement la source pertinente avant de répondre.

## Convention obligatoire

1. **Tout document de référence** (specs, notes, recherches, comptes-rendus, données, extraits, etc.) doit être placé dans `./documents/`.
2. **Chaque nouveau document ajouté ou modifié** doit être référencé dans la section [Index documentaire](#index-documentaire) ci-dessous, sous la forme :
   - `- [Titre court](documents/<fichier>) — résumé en une ligne (tags: tag1, tag2)`
3. Avant de répondre à une question susceptible d'être couverte par un document, **Claude lit l'index, identifie les documents pertinents via leur résumé/tags, puis lit les fichiers concernés** avant de formuler la réponse.
4. Si Claude crée ou reçoit un nouveau document, il l'enregistre dans `./documents/` **et** met à jour l'index dans le même tour.
5. Si un document devient obsolète, le retirer de l'index (ou le marquer `[obsolète]`) et déplacer le fichier dans `./documents/_archive/` plutôt que le supprimer.

## Format recommandé pour les documents

- Extension `.md` par défaut (autres formats acceptés : `.txt`, `.pdf`, `.csv`, `.json`).
- Nom de fichier en `kebab-case`, ex. `cahier-des-charges-v1.md`.
- Inclure en tête du document : titre, date (format `YYYY-MM-DD`), auteur/source, et un résumé de 1-3 lignes.

## Index documentaire

<!-- Ajouter ici une entrée par document. Garder l'ordre par thème puis par date décroissante. -->

- [Feature — Progression hors-ligne & niveau global](documents/feature-offline-progression.md) — décisions OFLP-D-1..8 : XP aussi en entraînement (first-clear par niveau distinct), campagne de niveaux ordonnés par jeu (banque générée au build, puzzles seuls), niveau global unique (classé autoritatif + offline, sommants disjoints) débloquant des cosmétiques étendus ; réouvre PROG-D-3 (XP client) au nom de la progression cosmétique no-pay-to-win. Plan Opus 8 lots, **implémenté + testé (206/206, CORR-1 bitmask appliqué, banque générée/puzzles seuls, endpoints idempotents, boucle niveau N+suivant), validation en attente** (tags: xp, progression, hors-ligne, niveaux, cosmétiques, anti-triche, plan, opus)

- [Feature — Refonte UI & fin de niveau](documents/feature-redesign.md) — décisions RD-D-1..7 (refonte visuelle/UX complète : identité, police display auto-hébergée, gradient signature, identité par jeu, hero, header sticky, écran de jeu + timer + état de victoire célébré ; périmètre **visuel only**, moteurs/contrats/gestes intacts) + correction fin de niveau (plateau classé verrouillé+overlay résultat), plan Opus 7 lots L0..L6, **implémenté + testé (182/182, build OK), validation en attente** — direction finale : neutres chauds + Bricolage Grotesque (déviation vs Space Grotesk), 8 composants `@puzzlehub/ui`, `TrainingShell` (tags: front, design, ux, refonte, a11y, plan, opus)

### Fondations & socle

- [Brainstorm — Fondations puzzlehub](documents/brainstorm-foundation.md) — décisions fondatrices FND-D-1..27 (stack pnpm/React/Fastify/Prisma, auth Google OIDC, serveur autoritatif anti-triche, banque offline seedée, catalogue, XP/cosmétiques, multijoueur/tournois, MVP réduit Tango+Queens, règles Zip, difficulté, score/XP), **Phase 4 validée 2026-06-18** (tags: fondation, archi, sécurité, jeux, validé)
- [Plan — Fondations puzzlehub](documents/plan-foundation.md) — plan Phase 3 (agent Opus) 10 lots L0..L9 / étapes E1..E50, frontière MVP, spike génération bloquant, **validé Phase 4 le 2026-06-18** (tags: fondation, plan, lots, opus, validé)
- [Modèle de menace — puzzlehub](documents/security-threat-model.md) — STRIDE léger (auth OIDC, sessions, anti-triche tournoi, abus, WebSocket, RGPD), tableaux T-A..T-F + 18 must-have MVP + pièges anti-triche (tags: sécurité, menace, anti-triche, oidc, rgpd)
- [Feature — API & Auth Google OIDC](documents/feature-auth-api.md) — décisions AUTH-D-1..8 (jose, PKCE, validation id_token, session cookie, CSRF, RGPD, abstraction store in-memory→Prisma) (tags: api, auth, oidc, sécurité, fastify)
- [Audit — Auth Google OIDC — 2026-06-19](docs/audit/auth-2026-06-19.md) — audit Opus du code auth : state usage-unique (TxStore), rotation session, audit/redact, trustProxy **corrigés + testés** ; reste persistance Prisma + idle/CSP (tags: audit, auth, oidc, sécurité)
- [Feature — Boucle de jeu solo & anti-triche](documents/feature-play-loop.md) — décisions PLAY-D-1..9 (banque offline, token de début signé, attempt usage unique, temps serveur, anti-bot, pas de fuite de solution) (tags: jeu, anti-triche, serveur-autoritatif)
- [Audit — Boucle de jeu (L4) — 2026-06-19](docs/audit/play-2026-06-19.md) — audit Opus anti-triche `/play/*` : rate-limit par route, secret HMAC dédié, bodyLimit, attemptId retiré **corrigés** ; reste tournoi (T-C4/C5/C8) (tags: audit, jeu, anti-triche, sécurité)
- [Audit — Queens + client API + auth front — 2026-06-19](docs/audit/front-queens-2026-06-19.md) — audit Opus : a11y Queens (aria-invalid, numéro, libellé), garde samples **corrigés** ; CSRF/env/PII OK ; reste mode classé + factorisation (tags: audit, front, a11y, queens, auth)
- [Feature — Mode classé (UI play/start+submit)](documents/feature-ranked-play.md) — décisions RANK-D-1..4 + H1..H4 (4 jeux, Zod dans shared, route /classe, factoriser d'abord), **Phase 4 validée 2026-06-19** (tags: jeu, classé, front, anti-triche, zod, validé)
- [Plan — Mode classé](documents/plan-ranked-play.md) — plan Phase 3 (agent Opus) E1..E7 : schémas Zod shared, hook useRankedPlay, shell RankedPlay, 4 configs jeu, routing /classe, dédup DailyPage (tags: classé, plan, opus, front, validé)
- [Feature — Intégration continue (GitHub Actions)](documents/feature-ci.md) — décisions CI-D-1..5 (workflow `.github/workflows/ci.yml`, push main + PR, Node 20/pnpm 9.12, install gelé → typecheck/lint/test/build) (tags: ci, infra, github-actions)
- [Feature — Persistance Prisma/Postgres auth](documents/feature-auth-prisma.md) — décisions APRISMA-D-1..8 (stores Prisma User/Session/OidcTx derrière interfaces existantes, factory par `DATABASE_URL`, consume atomique delete-returning, cascade RGPD, migration offline + docker-compose), **implémenté, validation en attente** (tags: auth, prisma, postgres, persistance, sécurité)
- [Feature — Tests property-based moteurs](documents/feature-proptest.md) — décisions PROP-D-1..3 (fast-check, P1 validate(solve)=valid + P2 unicité cap 2 sur seeds aléatoires, runs bornés CI) (tags: tests, property-based, moteur, unicité)
- [Feature — Mini-Sudoku 6×6](documents/feature-sudoku.md) — décisions SUD-D-1..7 (6×6 boîtes 2×3, génération seedée à unicité garantie, validateur durci, intégration banque/schéma/registre/classé), **implémenté, validation en attente** (tags: jeu, sudoku, moteur, unicité, classé) (5ᵉ jeu)
- [Feature — Nonogram / Picross](documents/feature-nonogram.md) — décisions NONO-D-1..7 (grille 5/8/10, solveur énumération lignes + élagage colonnes, génération seedée unicité garantie, validateur durci, intégration complète) + **BUG-Nonogram-gen** NGB-D-1..5 : génération `difficile` 10×10 non fiable (rejection sampling i.i.d. <1 % unique → boot api bloqué), plan Opus 3 phases (structuré→réparation→fallback triangulaire prouvé unique), **implémenté + testé (180/180, boot api OK), validation en attente** (tags: jeu, nonogram, picross, moteur, unicité, classé, bug, plan, opus) (6ᵉ jeu)
- [Feature — Progression XP & défi quotidien](documents/feature-progression.md) — décisions PROG-D-1..8 (barème XP, niveau 50·n·(n+1), idempotence attemptId, défi seed date UTC, 1 démarrage/jour atomique, bonus +50%) (tags: xp, progression, défi-quotidien, anti-triche)
- [Audit — Progression XP (L5) — 2026-06-19](docs/audit/progression-2026-06-19.md) — audit Opus : TOCTOU défi (claim atomique), formule partagée, garde puzzle, 409 **corrigés** ; reste dette in-memory/Prisma (tags: audit, xp, défi, sécurité)
- [Feature — Moteur Patches (Shikaku) & timeout](documents/feature-patches.md) — décisions PAT-D-1..6 (budget nœuds déterministe, génération guillotine, validateur durci, surfaces client/serveur) (tags: jeu, patches, shikaku, moteur)
- [Audit — Patches (L6) — 2026-06-19](docs/audit/patches-2026-06-19.md) — audit Opus : déterminisme génération (budget nœuds), soundness validateur (assertion Σaires) **corrigés** ; reste a11y clavier-grille (tags: audit, patches, anti-triche, déterminisme)
- [Feature — Moteur Zip (chemin hamiltonien) & spike](documents/feature-zip.md) — décisions ZIP-D-1..7 + spike chiffré (faisabilité 5/6/7, budget-nœuds déterministe, limitation murs) (tags: jeu, zip, hamiltonien, spike, moteur)
- [Audit — Zip (L6) — 2026-06-19](docs/audit/zip-2026-06-19.md) — audit Opus : déterminisme OK, countSolutions troncature + daily try/catch **corrigés** ; reste murs/a11y. **4 jeux LinkedIn jouables** (tags: audit, zip, anti-triche, déterminisme)
- [Audit — Moteur de jeu — 2026-06-18](docs/audit/engine-2026-06-18.md) — audit Opus du moteur Tango/Queens : BUG-03 (validate forme/domaine, anti-triche) + BUG-07 (split surface client/serveur) **corrigés + testés** ; reste timeout/property-based (tags: audit, moteur, anti-triche, sécurité)
- [Audit — Front (ui+web) — 2026-06-18](docs/audit/front-2026-06-18.md) — audit Opus du front : FOUC thème, focus-visible, reduced-motion, contraste muted **corrigés** + garde-fou ESLint anti-fuite `solve` ; reste contrat plateau/CSP-hash/i18n (tags: audit, front, thème, accessibilité, sécurité)
- [Feature — Interactions par jeu & lisibilité](documents/feature-jeux-interactions.md) — décisions UX-D-1..7 (Zip drag pointeur, Tango clic G=soleil/D=lune, Sudoku sélection+saisie clavier/pavé, palette de jeu daltonien-safe, Queens régions colorées, lisibilité tous jeux, a11y préservée), **Phase 4 validée 2026-06-19** (tags: front, ux, interactions, couleurs, a11y, jeux, validé)
- [Plan — Interactions par jeu & lisibilité](documents/plan-jeux-interactions.md) — plan Phase 3 (agent Opus) E1..E9 (palette tokens → Zip drag / Tango G-D / Sudoku sélection → Queens/Patches couleurs → a11y → tests), 4 écarts tranchés (wrapper local sélection, tokens Tango dédiés, centraliser cells.ts), **validé Phase 4 le 2026-06-19** (tags: front, ux, plan, opus, validé)
- [Feature — Cosmétiques déblocables & expérience XP](documents/feature-cosmetics-xp.md) — décisions XP-D-1..3 + COSM-D-1..5 (feedback gain/level-up, catalogue cosmétiques statique shared, déblocage serveur par niveau, sélection persistée store in-memory↔Prisma, application via tokens thème, no pay-to-win), **Phase 4 validée 2026-06-19** (tags: xp, cosmétiques, méta-progression, front, store, sécurité, validé)
- [Plan — Cosmétiques déblocables & expérience XP](documents/plan-cosmetics-xp.md) — plan Phase 3 (agent Opus) E0..E12 (catalogue shared → SelectionStore in-memory/Prisma + migration additive → endpoints /me/cosmetics* sécu 403 locked → CosmeticsProvider/tokens → page Profil → XpToast/level-up), catalogue v1 5 items, dép. UX-D-4, **validé Phase 4 le 2026-06-19** (tags: cosmétiques, xp, plan, opus, store, sécurité, validé)

## Audit de code — comportement & commande `/audit`

Les rapports d'audit vivent dans un **dossier séparé** : `./docs/audit/` (distinct du RAG général `./documents/`). Ils sont quand même indexés dans cet `CLAUDE.md` pour rester découvrables.

- **Audit initial** : rapport dans `./docs/audit/<composant>-<YYYY-MM-DD>.md`.
  - Contenu : résumé exécutif, findings numérotés (F-1, F-2…) avec sévérité / localisation / impact / recommandation, recommandations transverses.
  - Indexer immédiatement dans la section [Index documentaire](#index-documentaire) avec tag `audit`.

- **Re-vérification** (l'utilisateur fournit un ancien rapport) :
  - Lire l'ancien rapport, lister les findings.
  - Analyser le code actuel, recouper avec les commits (lecture seule : `git log`, `git diff`, `git show`).
  - Vérifier **point par point** : ✅ corrigé / ⚠️ partiel / ❌ non corrigé / 🗑️ obsolète, **avec preuves** (fichier:ligne + SHA).
  - Produire une **synthèse claire et propre** dans `./docs/audit/<composant>-recheck-<YYYY-MM-DD>.md` et l'indexer.
  - Signaler aussi les **nouveaux problèmes** détectés dans le code actuel non listés dans l'audit initial.

- Aucune correction de code automatique : tout correctif demandé suit le [workflow 4 phases](#-workflow-standard-en-4-phases-déclenché-à-chaque-expression-de-besoin).

## Commande `/brainstorm <thème>`

Quand l'utilisateur lance `/brainstorm <thème>` :

1. Déduire un nom de fichier court et clair : `brainstorm-<slug-kebab>.md` (suffixer `-2`, `-3`... si collision).
2. Créer ce fichier dans `./documents/` avec un squelette (date, thème, statut, contexte, décisions, questions ouvertes, notes).
3. Ajouter immédiatement la ligne d'index correspondante dans la section [Index documentaire](#index-documentaire).
4. Pendant toute la conversation qui suit, **chaque décision prise** est tracée dans la section _Décisions_ du fichier. Les questions non tranchées vont dans _Questions ouvertes_, les pistes en cours dans _Notes & exploration_.
5. Cohérent avec la règle d'or : tant qu'une décision n'est pas écrite dans ce doc, aucun code n'est produit.

## Git — interdiction d'exécution

- **Claude n'exécute JAMAIS** `git commit`, `git push`, ni aucune commande qui modifie l'historique distant ou crée un commit. L'humain s'en charge.
- Rôle de Claude côté Git : **proposer des messages de commit**, rien d'autre.
- Les messages de commit doivent être :
  - **en anglais**,
  - conformes à **Conventional Commits** : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`, `build:`, `ci:`, `style:`, `revert:` (avec scope optionnel : `feat(api): ...`).
- Claude peut exécuter les commandes Git **en lecture seule** (`git status`, `git diff`, `git log`, `git show`...) pour analyser l'état et rédiger un bon message, mais pas plus.

## Backlog (`./backlog.md`)

- **Toute évolution** du projet (ajout, modif, bug, idée, refacto) doit être tracée dans `./backlog.md`.
- Priorités autorisées (KISS) : `HOT`, `WARM`, `COLD`. **Aucune autre.**
- Statuts : `TODO`, `DOING`, `DONE`.
- **Règle absolue : Claude ne passe JAMAIS une entrée à `DONE` de sa propre initiative.** Seul l'utilisateur valide le passage en `DONE`. Claude peut créer/éditer/déplacer entre `TODO`/`DOING` mais s'arrête là.

## Notes

- Le dossier `./documents/` est la source de vérité **documentaire** (specs, décisions, brainstorms, RAG général).
- Le dossier `./docs/audit/` est dédié aux **rapports d'audit code** (séparé du RAG mais indexé ici).
- L'index ci-dessus doit rester court (1 ligne par doc). Les détails restent dans les fichiers eux-mêmes.
## Section technique

### Stack

Monorepo **pnpm** (workspaces `apps/*` + `packages/*`), **TypeScript strict**, Node ≥ 20, pnpm 9.12.0.

- `apps/web` — front **React 18 + Vite + Tailwind** (thème light/dark, routing react-router).
- `apps/api` — **Fastify 5** (Google OIDC, sessions, anti-triche `/play/*`, XP/défi), Zod pour les bornes d'entrée, Prisma/Postgres en option (`DATABASE_URL`).
- `packages/shared` — types & utilitaires communs (PRNG seedé `mulberry32`, `Difficulty`/`GameId`, formule XP, **schémas Zod de forme des puzzles**).
- `packages/engine` — moteurs des 6 jeux (Tango/Queens/Zip/Patches/Mini-Sudoku/Nonogram). Surface **client** (`@puzzlehub/engine` = `validate` seul, sûr) vs **serveur** (`@puzzlehub/engine/server` = `generate/solve/countSolutions`, JAMAIS importé côté front — garde-fou ESLint).
- `packages/ui` — tokens de thème + preset Tailwind + utilitaires (`cn`).

### Commandes

| But | Commande |
| --- | --- |
| Install | `pnpm install` (postinstall → `prisma generate`) |
| Dev front | `pnpm --filter @puzzlehub/web dev` |
| Dev api | `pnpm --filter @puzzlehub/api dev` |
| Typecheck (tout) | `pnpm typecheck` |
| Lint | `pnpm lint` · format : `pnpm format` |
| Tests (tout) | `pnpm test` (= `vitest run`) |
| **Un seul fichier** | `npx vitest run packages/engine/src/zip.test.ts` |
| **Un seul cas** | `npx vitest run -t "fragment du nom du test"` |
| Watch | `pnpm test:watch` |
| Build | `pnpm build` |
| DB locale | `docker compose -f apps/api/docker-compose.yml up -d` puis `pnpm --filter @puzzlehub/api db:migrate` |

CI (`.github/workflows/ci.yml`) rejoue install gelé → typecheck → lint → test → build sur push `main` + PR.

### Architecture haut-niveau

- **Registre de mini-jeux** (`apps/web/src/games/registry.ts`) : `GameMeta` par jeu avec chargeurs **lazy** `loadBoard` (entraînement hors-ligne) et `loadRanked` (mode classé serveur-autoritatif). Découverte via `findGame(id)`.
- **Shell de plateforme partagé** (front) : `apps/web/src/play/` = hook `useRankedPlay` (boucle start→board→submit→XP, serveur-autoritative) + shell `RankedPlay` (UI commune) + mapping d'erreurs. Chaque jeu fournit une `GameRankedConfig` (`games/<jeu>/ranked.tsx` : `client` validate, `initialState`, `toServerBoard`, `renderBoard`).
- **Frontière par-jeu ↔ infra commune** :
  - par-jeu = moteur (`packages/engine/src/<jeu>.ts`), interactions (`apps/web/src/games/<jeu>/cells.ts`), plateau présentational (`<Game>Board.tsx`), config classée (`ranked.tsx`) ;
  - infra commune = registre, shell `play/`, client API (`api/client.ts`), auth (`app/AuthProvider`), schémas Zod partagés, contrats moteur (`GameEngine`/`ClientEngine`).
- **Anti-triche** : serveur autoritatif (`apps/api/src/play/`), banque offline seedée, token de début signé HMAC, attempt usage unique, XP idempotente. Le front ne reçoit jamais la solution (split client/serveur engine).
- **Persistance** : stores auth derrière interfaces (`apps/api/src/store/types.ts`), sélection in-memory ↔ Prisma par `createAuthStores()` (`DATABASE_URL`).
