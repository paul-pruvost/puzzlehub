# Brainstorm — Fondations puzzlehub

- **Date** : 2026-06-18
- **Auteur** : Paul Pruvost (besoin) + Claude (rédaction)
- **Statut** : Phase 4 validée le 2026-06-18 (boucle multi-agents Opus close) — voir [Résolutions Phase 2/4](#résolutions-phase-24--arbitrages-multi-agents)
- **Résumé** : Décisions fondatrices d'une plateforme de mini-jeux de logique (style LinkedIn) avec méta-progression, multijoueur, tournois, auth Google, sécurité priorité n°1.

## Contexte & besoin (Phase 1 — Écoute)

Plateforme web hébergeant des mini-jeux de logique rejouables à l'infini. Jeux imposés : **Tango, Patches, Zip, Queens** (LinkedIn) + jeux supplémentaires au choix. Exigences :

- Thème **light/dark sobre**, style **moderne, minimaliste, sans néon**.
- **Expérience joueur ultime** : barre d'XP, musique d'ambiance, animations, cosmétiques déblocables, mode multijoueur, tournois publics et privés.
- **Connexion uniquement via Google**.
- **Sécurité = priorité absolue** ; codes d'un site professionnel + du jeu vidéo.
- **Rétention** : tutoriels, onboarding clair, joueur jamais perdu d'entrée.
- Chaque jeu **rejouable indéfiniment**, niveaux **générés aléatoirement** avec difficultés variées.

## Règles des jeux (vérifiées 2026-06-18)

- **Tango** — grille 6×6, deux symboles (soleil/lune). Pas plus de 2 identiques consécutifs (ligne/colonne). Autant de soleils que de lunes par ligne et par colonne. Contraintes `=` (mêmes symboles) et `×` (opposés) entre cases adjacentes. Solution unique.
- **Queens** — grille N×N divisée en N régions colorées. Exactement 1 reine par ligne, par colonne et par région ; deux reines jamais adjacentes (y compris diagonale). Solution unique.
- **Zip** — grille avec cases numérotées 1..k. Tracer un chemin unique passant par les nombres dans l'ordre croissant et **remplissant toutes les cases** (chemin hamiltonien contraint), sans recouvrement, parfois murs.
- **Patches** (= Shikaku) — partitionner toute la grille en rectangles non chevauchants ; chaque rectangle contient exactement un indice numérique égal à son aire ; toutes les cases couvertes. Couleurs purement esthétiques.

## Décisions (Phase 2)

### Stack & architecture

- **FND-D-1** — Monorepo **pnpm workspaces**. Découpage :
  - `apps/web` — front React + Vite + TypeScript.
  - `apps/api` — back Fastify + TypeScript.
  - `packages/engine` — logique de jeu **pure, déterministe, testée** (générateurs, solveurs, validateurs).
  - `packages/shared` — types + schémas Zod partagés front/back.
  - `packages/ui` — primitives UI + design tokens (thème light/dark).
- **FND-D-2** — Front : **React 18 + Vite + TS + TailwindCSS**. Thème light/dark via attribut `data-theme` + variables CSS (tokens), aucun néon. Data-fetching **TanStack Query**, état local léger **Zustand**. Animations **Framer Motion** (sobres, respect `prefers-reduced-motion`).
- **FND-D-3** — Back : **Fastify + TS + Prisma + PostgreSQL**. Validation **Zod** sur toute entrée.
- **FND-D-15** — i18n-ready, **FR par défaut** (EN ultérieur). Pas de texte en dur hors couche i18n.

### Auth & sécurité (priorité n°1)

- **FND-D-4** — Auth **Google OAuth 2.0 / OIDC uniquement**. Flow **Authorization Code + PKCE** côté serveur. **Aucun JWT en localStorage**. Session serveur, **cookie httpOnly + Secure + SameSite=Lax**, secret de session fort, rotation à l'élévation de privilège. State+nonce OAuth vérifiés.
- **FND-D-7** — Baseline sécurité (inspirée des audits plateforme-aei) : **Helmet** (CSP stricte), **rate limiting** global + par route sensible, **CORS allowlist**, **CSRF** (token double-submit + SameSite), **session binding** (IP/UA via HMAC), secrets hors client, **logs d'audit**, masquage PII dans les logs, `pnpm audit` en CI.
- **FND-D-7b** — **Serveur autoritatif anti-triche** : le client n'envoie jamais un score ; il envoie sa solution + traces de temps, le serveur **rejoue/valide** la solution et calcule le temps. XP/classements/tournois ne créditent que des résultats validés serveur. Détection d'incohérences (temps impossible, soumissions hors session).

### Moteur de jeu

- **FND-D-6** — Chaque jeu expose un contrat commun dans `packages/engine` :
  - `generate(seed, difficulty) -> Puzzle` (PRNG **seedé**, reproductible),
  - `solve(puzzle) -> Solution | null` et `countSolutions(puzzle, cap) -> n` (garantie d'**unicité** pour les puzzles logiques),
  - `validate(puzzle, move|solution) -> Result`.
  - Génération = « pose puzzle → vérifie unicité → sinon régénère/ajuste indices ». Tests de propriété : tout puzzle généré est **uniquement solvable**.
- **FND-D-13** — Rejouabilité infinie : génération procédurale seedée + **paliers de difficulté** par jeu (taille de grille, densité d'indices). **Défi quotidien** (seed dérivée de la date) optionnel.

### Catalogue de jeux

- **FND-D-8** — Imposés : **Tango, Queens, Zip, Patches**. Choix Claude (bien cadrés, même moteur) : **Mini-Sudoku 6×6**, **Nonogram/Picross**, **Lights Out**. Priorité de livraison : Tango → Queens → Patches → Zip, puis extras.

### Méta-progression & expérience

- **FND-D-9** — **XP/niveaux serveur-autoritatifs** ; barre d'XP. Cosmétiques **purement esthétiques** (thèmes de plateau, skins de pièces, palettes) déblocables par XP/succès. **Aucun pay-to-win**, aucun achat (cosmétique gratuit via progression).
- **FND-D-10** — Audio : musique d'ambiance + SFX via Web Audio, **démarrage sur interaction** (politique autoplay), **mute + volume persistés**, respect `prefers-reduced-motion`/préférence silence.
- **FND-D-12** — Onboarding : **tutoriel interactif par jeu**, détection premier passage, **rejouable** depuis le menu. Règles accessibles à tout moment. Niveau « facile » par défaut au premier lancement.

### Multijoueur & tournois

- **FND-D-5** — Multijoueur via **WebSocket** (serveur autoritatif). Même seed pour tous les participants. Reconnexion gérée.
- **FND-D-11** — **Tournois publics et privés** (code d'invitation pour privé). Même puzzle (seed) pour tous, classement par temps/score **validés serveur**. États : ouvert → en cours → terminé. Anti-triche via validation serveur (FND-D-7b).

### Tests & qualité

- **FND-D-14** — **Vitest** (unitaire, couverture forte sur `packages/engine`), **Playwright** (E2E parcours auth + une partie par jeu). Lint **ESLint + Prettier**, **TypeScript strict**. CI : typecheck + lint + test + `pnpm audit`.

## Questions ouvertes (tranchées par Claude — mode autonome)

- **Q1 — Redis nécessaire ?** → Démarrer **sans Redis** : sessions + état tournoi en Postgres ; déploiement **mono-instance** assumé pour le MVP. Introduire Redis seulement si scaling multi-instances OU rate-limit partagé requis. _(confirmé par challenge)_
- **Q2 — « Patches » ambigu ?** → Confirmé = **Shikaku** (partition rectangles, indice=aire). Décision figée.
- **Q3 — Multijoueur temps réel vs asynchrone pour le MVP ?** → MVP : **tournois asynchrones** (même seed, fenêtre de temps, classement) d'abord ; **duel temps réel** en second. Réduit le risque avant le WebSocket lourd.
- **Q4 — Stockage cosmétiques** → catalogue cosmétiques en base + table `unlock` par user ; application purement front via tokens de thème.

## Impact

- Nouveau dépôt : tout est à scaffolder. Aucun code existant à casser.
- Sécurité transverse → un document de **modèle de menace** dédié sera créé (`documents/security-threat-model.md`).
- Le plan d'implémentation (Phase 3) découpera en lots : L0 socle, L1 engine+jeux, L2 auth/sécurité, L3 méta-progression, L4 multijoueur/tournois, L5 polish/audio/anim.

## Notes & exploration

- Sources règles : connectsafely.ai, tango-unlimited.com, askdavetaylor (Patches), fandomwire (récap jeux).
- Boucle multi-agents Opus lancée en Phase 2 : Challenger (décisions), Sécurité (modèle de menace), Planificateur (plan Phase 3), Compréhension-sans-contexte (clarté/onboarding doc).

## Résolutions Phase 2/4 — arbitrages multi-agents

Boucle Opus close le 2026-06-18 (Challenger / Sécurité / Planificateur / Compréhension). Décisions additionnelles tranchées par Claude (mode autonome) :

- **FND-D-16 — Génération offline (pas à la volée).** Le risque CPU de l'unicité (Zip = chemin hamiltonien, **#P-difficile** ; Shikaku/Queens combinatoires) interdit de générer+valider à la requête. → **Banque de puzzles pré-générée offline** (job CPU illimité, idempotent), stockée en base `Puzzle(game, difficulty, seed, payload, solutionHash, schemaVersion)`, contrainte unique `(game, difficulty, seed)`. `countSolutions` borné par **cap dur + timeout**. Un **spike chiffré (lot L1)** précède le gel du moteur.
- **FND-D-17 — Frontière MVP figée.** MVP = **Tango + Queens jouables solo + auth Google + sécurité socle + XP basique + défi quotidien**. Hors MVP : Zip, Patches, extras, cosmétiques, audio, multijoueur, tournois.
- **FND-D-18 — WebSocket hors MVP.** Tournois MVP-suivant = **asynchrones HTTP/REST** (même seed, fenêtre de temps, classement Postgres). Le **temps réel WebSocket** (FND-D-5) est reclassé **post-MVP** (lot L9, le plus risqué).
- **FND-D-19 — Temps officiel serveur (anti-triche).** À l'ouverture d'une partie, le serveur émet un **token de début signé** (HMAC : `attemptId`, `puzzleId`, `userId`, `startedAtServer`, TTL). Temps officiel = `t_soumission_serveur − t_début_serveur`. Les traces client servent **uniquement à la détection d'anomalies** (temps inhumain), jamais au scoring. **`attemptId` usage unique**, un seul attempt par (user, puzzle), anti-rejeu/idempotence.
- **FND-D-20 — Le client n'apprend jamais la solution.** `solve()` n'est jamais exposé ; le service ne renvoie que le puzzle. La validation est **serveur-only** ; en tournoi, la solution n'est pas révélée avant clôture. Le **seed partagé** étant la faille structurelle des tournois, l'équité repose sur le **temps de saisie mesuré serveur** + détection de clusters, pas sur le secret du puzzle.
- **FND-D-21 — RGPD socle.** Scopes OIDC **`openid email profile`** stricts. Stockage minimal : `googleSub` (clé de compte, **jamais l'email comme identité**), email, displayName, avatarUrl. `email_verified` requis. **Suppression de compte** (purge/anonymisation) dès le socle. **Masquage PII dans les logs**. Mapping par `sub`, rôle serveur (défaut `user`).
- **FND-D-22 — Règles Zip précisées.** Déplacements **orthogonaux uniquement** (pas de diagonale). Le chemin **démarre sur la case `1`**, finit sur la case `k` (plus grand nombre), visite les nombres dans l'ordre croissant, et **remplit chaque case exactement une fois** (chemin hamiltonien sur toutes les cases non bloquées). Les **murs** = arêtes infranchissables entre deux cases adjacentes. Solution unique.
- **FND-D-23 — Paliers de difficulté (3 par jeu).** `Facile / Moyen / Difficile`.
  - Tango : grille 6×6 fixe ; difficulté = **densité d'indices pré-remplis + contraintes `=`/`×`** (plus d'indices = plus facile).
  - Queens : **N = 7 / 8 / 9**.
  - Zip : grille **5×5 / 6×6 / 7×7**, nb de points de passage croissant.
  - Patches : grille **5×5 / 7×7 / 9×9**.
  - Premier lancement d'un jeu = **Facile** par défaut + tutoriel.
- **FND-D-24 — Contrat `validate` précisé.** `Result = { status: 'valid' | 'invalid' | 'incomplete', violations: Violation[] }`, `Violation = { rule: string, cells: Coord[] }`. La **validation live côté front** (feedback UX immédiat, surlignage des contraintes violées **sans pénalité**) est autorisée via le moteur partagé `validate(move)` ; le **serveur reste autoritatif** pour le scoring via `validate(solution)`.
- **FND-D-25 — Score & XP (MVP, ajustables).** Métrique de classement officielle = **temps serveur** (plus bas = meilleur). XP par puzzle **validé** : Facile **10** / Moyen **20** / Difficile **35**, **+50 %** sur le défi quotidien. Courbe de niveau : seuil cumulatif `XP(niveau n) = 50·n·(n+1)`. XP **idempotente par `attemptId`** (aucun double-crédit), créditée uniquement si `Attempt.valid`. Barème marqué **tunable** (équilibrage itératif).
- **FND-D-26 — Défi quotidien confirmé MVP.** Un défi par jeu, **seed dérivée de la date (UTC)**, **une tentative/user/jour**, classement par temps serveur. Hook de rétention prioritaire.
- **FND-D-27 — Onboarding renforcé.** Tuto **interactif « faire, pas lire »** par jeu (surlignage de la prochaine action, validation micro-étape), sur **petite grille** d'abord (ex. 4×4). Feedback d'erreur live (FND-D-24). Accessibilité daltonisme : régions Queens **non distinguées par la seule couleur** (motif/numéro). Patches sous-titré « découpe en rectangles » (nom peu parlant). Geste d'exclusion (croix) enseigné pour Queens.

Documents liés produits par la boucle : [plan-foundation.md](plan-foundation.md) (Phase 3), [security-threat-model.md](security-threat-model.md) (modèle de menace).
