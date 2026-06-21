# Feature — Progression XP & défi quotidien (lot L5)

- **Date** : 2026-06-19
- **Statut** : en implémentation (mode autonome)
- **Source** : `plan-foundation.md` L5, FND-D-25 (XP), FND-D-26 (défi quotidien), T-C7/C8.
- **Résumé** : XP serveur-autoritative idempotente + défi quotidien déterministe.

## Décisions

- **PROG-D-1 — Barème XP** (FND-D-25) : Facile 10 / Moyen 20 / Difficile 35. **+50 %** sur le défi quotidien (`floor(base·1.5)`).
- **PROG-D-2 — Niveau** : `level = max n` tel que `50·n·(n+1) ≤ xp` (XP cumulée pour le niveau n = 50·n·(n+1)).
- **PROG-D-3 — Serveur autoritatif + idempotence** (T-C7) : XP créditée **uniquement** sur `Attempt` valide (`valid && !too_fast`), **idempotente par attemptId** (jamais de double crédit). `ProgressStore` in-memory `{userId→xp}` + journal `XpEvent`. Aucun endpoint d'écriture d'XP côté client.
- **PROG-D-4 — `GET /me/progress`** : renvoie `{xp, level}` de l'utilisateur courant (auth requise).
- **PROG-D-5 — Crédit dans `/play/submit`** : sur résolution valide non *too_fast*, award `xpForDifficulty(attempt.difficulty)·(daily?1.5:1)` par `attempt.id`. Réponse enrichie `{xpGained, xp, level}`.
- **PROG-D-6 — Défi quotidien** (FND-D-26) : `POST /play/daily {game}`. Seed = `FNV(dateUTC + game)` → **même puzzle pour tous** ce jour-là (difficulté Moyen fixe). **1 tentative/user/jour/jeu** (`DailyStore`). L'attempt porte `daily:true` (bonus XP). Puzzle généré à la volée puis mis en banque (`bank.put`, id `daily:<date>:<game>`) pour que `/play/submit` le retrouve. Soumission via le `/play/submit` existant.
- **PROG-D-7 — Horloge** : la date du jour vient de `deps.now()` (testable).
- **PROG-D-8 — Défi = 1 *démarrage*/jour non réinitialisable** (anti-triche, suite revue F6/F7) : la tentative est **réservée au démarrage** (`/play/daily`) via un **test-and-set atomique** (`DailyStore.claim`, avant tout `await`) — pas au submit. Conséquence assumée : un joueur qui démarre puis abandonne n'a **pas** de seconde chance ce jour-là (empêche le re-roll de grille défavorable, T-C4). Le front distingue « déjà soumis » (409) ; la reprise d'un daily en cours (resume) est une amélioration future.

## Front
- Barre d'XP + niveau dans le header (via `/me/progress` après login).
- Écran/bouton défi quotidien.
- Amorce du **mode classé** : page qui consomme `startPlay`/`submitPlay` (parse Zod du puzzle reçu, soumission serveur autoritative).

## Tests
- `levelForXp` (seuils), award idempotent (1 seule fois), pas d'XP sur invalide ni *too_fast*, bonus quotidien, `/play/daily` 1/jour, déterminisme de la seed par date.
