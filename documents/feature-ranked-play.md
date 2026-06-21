# Feature — Mode classé (UI sur /play/start + /play/submit)

- **Date** : 2026-06-19
- **Statut** : **implémenté (E1→E6), validation utilisateur en attente** — Phases 1-4 closes le 2026-06-19. 119 tests verts, lint/typecheck/build verts.
- **Source** : backlog `PLAY-ranked-ui`, `feature-play-loop.md` (PLAY-D-1..9), `feature-progression.md` (XP/daily), `security-threat-model.md` (T-C*).
- **Résumé** : brancher le front sur `/play/start` + `/play/submit` pour un **mode classé** (puzzle servi par le serveur, soumission validée serveur, XP créditée serveur), avec **parsing Zod** du puzzle reçu.

## Contexte (état actuel)

- API prête : `POST /play/start {game,difficulty} → {token,game,difficulty,puzzle}` ; `POST /play/submit {token,board} → {accepted,valid,timeMs,reason,xpGained,xp,level}`. Auth + CSRF requis (PLAY-D-7).
- Client front prêt : `startPlay`, `submitPlay`, `getProgress` dans `apps/web/src/api/client.ts`.
- **Seul consommateur classé aujourd'hui** : `DailyPage.tsx` (Tango uniquement, validation ad-hoc `asTangoPuzzle`, pas de Zod).
- Chaque jeu : `<Game>BoardPage.tsx` (mode **entraînement** hors-ligne via samples) + `<Game>Board.tsx` (présentation pure).
- `zod` présent dans `apps/api` mais **pas** dans `apps/web`.
- WARM dépendant : `FRONT-factor` (shell de plateau + hook validation + cellKey) — non fait.

## Questions ouvertes (Phase 2)

- Q1 — Périmètre : mode classé sur les 4 jeux d'emblée, ou Tango+Queens d'abord (frontière MVP) puis Zip/Patches ?
- Q2 — Schémas Zod : où vivent-ils ? (a) dans `packages/shared` réutilisés api+web (source unique), (b) dupliqués côté web. Impact sur PLAY-D-6 (engine/server jamais côté front — les schémas de *forme* sans solution sont sûrs).
- Q3 — UX/routing : toggle entraînement/classé sur la page de jeu existante, ou route dédiée `/ranked` / `/jouer/:game/classe` ?
- Q4 — Factorisation : extraire un shell/hook « ranked play » partagé (start → board → submit → XP) d'abord (FRONT-factor), ou implémenter par jeu puis factoriser ?

## Décisions (validées Phase 2 — 2026-06-19)

- **RANK-D-1 — Périmètre : les 4 jeux.** Mode classé pour Tango, Queens, Zip et Patches d'emblée. Implique de factoriser la boucle commune pour ne pas dupliquer la logique 4×.
- **RANK-D-2 — Schémas Zod de forme dans `packages/shared`.** Source unique réutilisée api + web. Les schémas décrivent la **forme du puzzle servi (sans solution)** — conforme à PLAY-D-6 (pas de fuite, `engine/server` jamais côté front). Ajoute `zod` aux deps de `shared` (et `web` le récupère transitivement). L'API peut adopter ces schémas partagés pour ses bornes d'entrée ; le web s'en sert pour `parse` le `puzzle` reçu de `/play/start`. Remplace le `asTangoPuzzle` ad-hoc.
- **RANK-D-3 — Route dédiée `/classe`.** Le mode classé est séparé du mode entraînement (pages `<Game>BoardPage` existantes restent en samples hors-ligne). Routing : `/classe` (choix jeu + difficulté) puis `/classe/:game` (plateau classé). Le mode classé exige une session (sinon invite à la connexion Google, comme `DailyPage`).
- **RANK-D-4 — Factoriser d'abord (FRONT-factor).** Extraire un hook `useRankedPlay` (start → état puzzle/token/board → submit → refresh XP, gestion erreurs 401/403/409/too_fast) + un shell de plateau classé partagé, **avant** de brancher chaque jeu. Chaque jeu fournit : son schéma Zod, son adaptateur board initial, son composant `<Game>Board` présentational, sa validation client live (`@puzzlehub/engine` client, sans solution). `DailyPage` sera ré-aligné sur le même hook (déduplication).

### Hypothèses tranchées par défaut (mode autonome, révisables)

- H1 — Le **temps officiel** affiché vient de la réponse serveur (`timeMs`) ; un chrono client n'est qu'indicatif. Pas de soumission du temps client (PLAY-D-3).
- H2 — `/classe/:game` redirige vers `/classe` si `game` inconnu/indisponible (`findGame`).
- H3 — Un seul attempt actif à l'écran à la fois ; « Rejouer » relance un `startPlay` (nouveau token), l'ancien attempt expirant seul (TTL 30 min, PLAY-D-3).
- H4 — Soumission seulement quand la validation client = `valid` (garde UX), mais le serveur reste l'autorité (peut refuser `too_fast`/`409`).

## Impact

- `packages/shared` : nouveau module `puzzle-schemas` (Zod) + dépendance `zod`. Réutilisé par `apps/api` (bornes d'entrée `/play/submit` board, optionnel) et `apps/web`.
- `apps/web` : nouvelle dépendance `zod` (transitive via shared), nouveau hook `useRankedPlay`, shell `RankedPlay`, route `/classe` + `/classe/:game`, refactor `DailyPage` sur le hook.
- `feature-play-loop.md` / `feature-progression.md` : pas de changement de contrat serveur ; le mode classé consomme les endpoints existants tels quels.
- Backlog : clôt `PLAY-ranked-ui` et `FRONT-factor` (partiellement → la factorisation du shell de plateau y est incluse).
- Sécurité : aucun nouvel endpoint ; respecte CSRF/auth (PLAY-D-7), pas de fuite de solution (PLAY-D-6). Le parsing Zod durcit le front contre un puzzle malformé.

## Phase 4 — Validation du plan (2026-06-19)

Plan : [plan-ranked-play.md](plan-ranked-play.md). Couverture des décisions :

| Décision | Couvert par | Verdict |
| --- | --- | --- |
| RANK-D-1 (4 jeux) | E4a..d + registry | ✅ |
| RANK-D-2 (Zod dans shared) | E1 (schémas + dép `zod` shared) | ✅ |
| RANK-D-3 (route `/classe`, session requise) | E5 + gate connexion shell | ✅ |
| RANK-D-4 (factoriser d'abord) | E2/E3 avant E4, E6 dédup DailyPage | ✅ |
| H1 (temps serveur) | hook affiche `result.timeMs` | ✅ |
| H2 (redirect si game inconnu) | E5 `<Navigate to="/classe"/>` | ✅ |
| H3 (rejouer = nouveau start) | E2 `reset()` | ✅ |
| H4 (canSubmit = valid) | E2 | ✅ |

Aucune dérive : le plan ne couvre rien hors décisions. Écarts/points laissés ouverts par l'agent → **tranchés par défaut** (mode autonome) :

- **D4-1 — E7 (adoption schémas Zod côté API) : ÉCARTÉ.** Le validateur engine serveur est déjà robuste (BUG-03) ; ne pas borner `board` via Zod côté serveur. Hors périmètre, aucun changement de contrat.
- **D4-2 — Outillage de test front : AJOUTÉ.** `apps/web` reçoit `jsdom` + `@testing-library/react` en devDeps pour tester `useRankedPlay` (`@vitest-environment jsdom` en tête du fichier de test). Nécessaire pour la couverture du hook.
- **D4-3 — Lazy-load : PAR PAGE via registry.** Chaque jeu expose `loadRanked?: () => Promise<{default: ComponentType}>` (même pattern que `loadBoard`) pointant une page classée fine qui monte `<RankedPlay>` avec sa config. `RankedGamePage` fait `lazy(game.loadRanked)` + `Suspense`, cohérent avec `GamePage`.
- **D4-4 — Découvrabilité : lien `/classe` ajouté** dans la navigation (`Layout.tsx`) — sinon le mode classé est inatteignable. Risque faible, améliore l'usabilité.

> Backlog : ouvre `PLAY-ranked-ui` (DOING) et avance `FRONT-factor` (le shell de plateau + hook validation y sont inclus). Code autorisé à partir d'ici (Phase 4 validée).
