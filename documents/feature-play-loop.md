# Feature — Boucle de jeu solo & anti-triche (lot L4)

- **Date** : 2026-06-19
- **Statut** : en implémentation (mode autonome)
- **Source** : `plan-foundation.md` L4, `security-threat-model.md` (T-C1..C8), FND-D-16/D-19/D-20/D-24.
- **Résumé** : endpoints `/play/start` + `/play/submit` serveur-autoritatifs, banque de puzzles, anti-triche.

## Décisions

- **PLAY-D-1 — Banque in-memory** (FND-D-16) : peuplée au démarrage par le générateur **offline** `@puzzlehub/engine/server` (Tango+Queens × 3 difficultés). `BankPuzzle{id,game,difficulty,data}` — `data` = puzzle SANS solution. Bascule Postgres = avec AUTH-prisma.
- **PLAY-D-2 — Serveur autoritatif** (T-C1/C7) : le client n'envoie jamais de score/XP. `/play/start` sert un puzzle ; `/play/submit` rejoue la solution via `engine.validate` côté serveur. Aucun endpoint d'écriture de score.
- **PLAY-D-3 — Token de début signé** (T-C2/C3) : HMAC-SHA256 `payload{attemptId,puzzleId,userId,startedAt}` (secret = `COOKIE_SECRET`). Temps officiel = `now_serveur − startedAt`. Le temps client est ignoré. TTL 30 min.
- **PLAY-D-4 — Attempt à usage unique** (T-C3/C6) : `AttemptStore.consume` (getAndDelete) ; un attempt ne peut être soumis qu'une fois (anti-rejeu). Vérif `userId`/`puzzleId` croisée token ↔ store.
- **PLAY-D-5 — Anti-bot temps** (T-C2/C5) : si solution valide mais `elapsed < MIN_HUMAN_MS` (1 s) → non crédité, `reason:too_fast`, log d'anomalie. Plancher calibrable.
- **PLAY-D-6 — Le client n'apprend jamais la solution** (FND-D-20) : `/play/start` ne renvoie que le puzzle ; validation serveur-only ; `engine/server` jamais importé côté front (garde-fou ESLint déjà en place).
- **PLAY-D-7 — Auth + CSRF** : `/play/*` exigent une session + CSRF double-submit (mutations).
- **PLAY-D-8 — Horloge injectable** : `deps.now()` pour tester le temps serveur indépendamment du client (anomalie, expiration).
- **PLAY-D-9 — XP/classement hors périmètre L4** : crédités au lot L5 à partir d'un résultat `valid` (idempotent par attempt).

## Front (suite du jalon)
- Plateaux jouables Tango/Queens (React, clavier+souris), validation live via `@puzzlehub/engine` (client `validate`, sans fuite de solution), branchés au registre (loader lazy + tutoriel, RF-14), tutoriel interactif minimal par jeu (FND-D-27).

## Tests
- Token falsifié/expiré/rejoué rejeté ; solution invalide → `valid:false` ; temps calculé serveur (horloge injectée) ; `too_fast` rejeté ; non-propriétaire rejeté ; auth/CSRF requis.
