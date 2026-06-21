# Plan d'implémentation — Fondations puzzlehub (Phase 3)

- **Date** : 2026-06-18
- **Auteur** : Agent Planificateur (Opus) — Phase 3, validé Phase 4 (Claude, mode autonome)
- **Source** : `brainstorm-foundation.md` (FND-D-1..27) + arbitrages challenge multi-agents
- **Principe** : sécurité = priorité n°1 ; doc pilote le code ; MVP réduit, post-MVP en lots différés.

## Cadre transverse

- **Notation** : lots `L0..L9`, étapes `E1, E2…` ordonnées globalement.
- **Definition of Done / étape** : typecheck strict OK + lint OK + tests verts + `pnpm audit` sans vuln haute/critique + doc de décision à jour + backlog à jour.
- **Frontière MVP (FND-D-17)** : Tango + Queens solo + auth Google + XP basique + défi quotidien + sécurité socle. Reste = post-MVP.
- **Décisions structurantes** : banque offline (FND-D-16) ; temps officiel serveur (FND-D-19) ; mono-instance / pas de Redis (Q1) ; tournois async d'abord, WS post-MVP (FND-D-18) ; RGPD socle (FND-D-21).

## L0 — Scaffolding monorepo & socle qualité
**Objectif** : monorepo pnpm fonctionnel, TS strict, lint/format/test/CI verts.
- **E1** Init pnpm workspaces : `apps/web`, `apps/api`, `packages/engine|shared|ui`, scripts racine `-r`.
- **E2** `tsconfig.base.json` strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`…), project refs ; `engine`/`shared` sans dépendance sur web/api.
- **E3** ESLint + Prettier racine (`no-floating-promises`, import/order), Husky + lint-staged (sans violer « Claude ne commit jamais »).
- **E4** Vitest par package (coverage v8, seuils forts sur `engine`), Playwright dans `apps/web`.
- **E5** CI : `install → typecheck → lint → test → pnpm audit`, cache pnpm.
- **E6** `packages/shared` : conventions Zod (schéma = source de vérité, `z.infer`), i18n-ready FR par défaut.
- **E7** `packages/ui` : design tokens light/dark (`data-theme` + variables CSS), preset Tailwind, primitives minimales, `prefers-reduced-motion`.
**Tests** : canari Vitest/package vert ; CI verte ; `engine`/`shared` n'importent rien d'`api`/`web`.
**Risques** : ESM/CJS entre packages ; project refs mal câblées.

## L1 — Spike faisabilité génération (chiffré, AVANT de figer le moteur) — BLOQUANT
**Objectif** : dérisquer génération/unicité par jeu, produire des chiffres + go/no-go.
- **E8** Harnais de bench reproductible (PRNG seedé, mesure temps, `countSolutions` cap+timeout), sorties JSON/CSV.
- **E9** Spike **Queens** (N=7,8,9) : taux d'unicité, temps p50/p95.
- **E10** Spike **Tango** (6×6) : densité d'indices vs unicité.
- **E11** Spike **Zip** (#P-difficile) : `countSolutions` cap+timeout strict, déterminer palier soutenable ou report.
- **E12** Spike **Patches/Shikaku** : faisabilité partition + unicité.
- **E13** Synthèse chiffrée + décision banque (seeds/difficulté, budget CPU, cap/timeout) avant L2.
**Tests** : harnais déterministe ; tout puzzle « unique » vérifié `countSolutions==1` ; cap/timeout respectés.
**Risques** : explosion Zip/Patches (atténuation cap+timeout, bridage tailles, report).

## L2 — Contrat moteur & banque offline (Tango + Queens)
- **E14** Contrat figé (types `shared`) : `generate(seed,difficulty)`, `solve`, `countSolutions(cap)`, `validate(puzzle, move|solution)->Result` (FND-D-24). PRNG seedé portable. `generate` = **offline only**.
- **E15** Queens complet + property tests (unicité, déterminisme).
- **E16** Tango complet idem.
- **E17** Prisma `Puzzle(id, game, difficulty, seed, payload, solutionHash, schemaVersion)`, unique `(game,difficulty,seed)`, migration.
- **E18** **Job offline** (CLI) remplit la banque par difficulté (unicité garantie avant insert), idempotent, journalisé.
- **E19** Service « obtenir puzzle » (tirage banque, dérivation date pour défi quotidien), **ne renvoie jamais la solution**.
- **E20** Validation serveur autoritative : reçoit la solution, rejoue via `engine.validate`, calcule valide/invalide.
**Tests** : property unicité banque ; service ne fuit pas la solution ; validation rejette solution forgée ; job insère N uniques sans doublon.
**Risques** : couplage engine↔api (garder engine pur) ; versionner `payload` (`schemaVersion`) ; banque trop maigre.

## L3 — Auth Google sécurisée & socle sécurité — voir `security-threat-model.md`
- **E21** `User` minimal (RGPD) : `googleSub`, email, displayName, avatarUrl ; table `Session` Postgres.
- **E22** OIDC Authorization Code **+ PKCE**, `state`+`nonce` vérifiés, **validation `id_token`** (JWKS, `iss`, `aud`, `exp`, `nonce`, algo RS256 épinglé). Aucun JWT en localStorage.
- **E23** Session : cookie **httpOnly+Secure+SameSite=Lax**, rotation post-login, session binding IP/UA (HMAC, tolérant).
- **E24** Helmet (CSP stricte), CORS allowlist, rate limiting (IP+compte), CSRF double-submit, env validés Zod au boot.
- **E25** Logs d'audit + masquage PII.
- **E26** **Suppression de compte** (purge/anonymisation).
- **E27** Middleware d'authz, routes protégées.
**Tests** : `id_token` invalide rejeté (signature/aud/iss/nonce/exp) ; PKCE/state mismatch rejeté ; CSRF requis ; rate-limit déclenché ; E2E login (IdP mocké) + suppression compte ; en-têtes Helmet présents ; CORS hors allowlist refusé.
**Risques** : JWKS rotation/clock skew ; CSP trop stricte ; binding trop agressif (faux positifs proxy).

## L4 — Boucle de jeu solo MVP (anti-triche)
- **E28** `Attempt(id, userId, puzzleId, startToken, startedAtServer, submittedAtServer, status, valid)`.
- **E29** « Commencer » : sert puzzle + **token de début signé** (HMAC, TTL), pas la solution.
- **E30** « Soumettre » : vérifie token (signature/non-rejeu/TTL), **temps serveur** = delta, rejoue la solution, valide/invalide.
- **E31** Détection anomalies (temps impossible, hors fenêtre, rejeu) → flag/refus, audité.
- **E32** Front : registre mini-jeux + shell plateforme, plateaux Tango/Queens (React/Tailwind/tokens), Zustand + TanStack Query, animations sobres.
- **E33** Onboarding (FND-D-27) : tuto interactif léger Tango/Queens, niveau facile défaut.
**Tests** : token falsifié/expiré/rejoué rejeté ; temps indépendant du client ; E2E une partie/jeu jusqu'à soumission validée ; triche temps rejetée.
**Risques** : fuite solution ; clock skew TTL ; UI contraintes Tango ; faux positifs anti-triche.

## L5 — XP basique & défi quotidien (clôture MVP)
- **E34** `Progress(userId, xp, level)` + `XpEvent`. XP seulement si `Attempt.valid`.
- **E35** Barème FND-D-25, idempotent par `attemptId`, niveau dérivé.
- **E36** Défi quotidien (seed date UTC, 1 tentative/jour, classement temps serveur).
- **E37** Front : barre d'XP + écran défi + feedback progression.
**Tests** : XP seulement si valide ; idempotence (rejeu = pas de double XP) ; sélection défi déterministe/date ; E2E gain XP visible.
**Risques** : double-crédit (idempotence) ; barème à équilibrer ; fuseau (UTC fixé).

> ✅ **Jalon MVP** à la fin de L5. Lots suivants post-MVP, par valeur/risque.

## L6 — Post-MVP : extras de jeux
- **E38** Patches/Shikaku (engine + banque + solo). **E39** Zip bridé selon L1. **E40** Mini-Sudoku, Nonogram, Lights Out.

## L7 — Post-MVP : cosmétiques (sans pay-to-win)
- **E41** catalogue + table `unlock`. **E42** application front via tokens de thème. **E43** déblocage serveur lié XP/succès.

## L8 — Post-MVP : audio & polish
- **E44** Web Audio démarrage sur interaction, mute/volume persistés. **E45** `prefers-reduced-motion`/silence. **E46** polish animations sobres.

## L9 — Post-MVP : tournois async puis temps réel
- **E47** Tournois async HTTP (même seed, fenêtre, états ouvert→en cours→terminé, classement temps serveur, privé = code d'invitation non devinable). Anti-triche réutilise L4.
- **E48** Durcissement scaling : Redis si multi-instance/rate-limit partagé requis.
- **E49** WebSocket temps réel (serveur autoritatif, reconnexion). **E50** tournois temps réel.

## Ordre recommandé (chemin critique)
L0 → **L1 (bloquant)** → L2 → L3 (parallélisable avec L1/L2 après L0) → L4 → L5 (**fin MVP**) → L6/L7/L8 (priorisables) → **L9 en dernier** (le plus risqué).

## Risques majeurs
Génération Zip (#P) → L1 + cap/timeout/report. OIDC/CSP (L3) → tests négatifs. Anti-triche/temps (L4) → fuite solution + faux positifs. Dimensionnement banque → chiffrer CPU. WebSocket/multi-instance (L9) → reporté. Double-crédit XP (L5) → idempotence.
