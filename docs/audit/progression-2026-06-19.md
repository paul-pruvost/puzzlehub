# Audit — Progression XP & défi quotidien (L5) — 2026-06-19

- **Auteur** : agent REVUE (Opus), boucle multi-agents.
- **Périmètre** : `apps/api/src/play/{xp,progress,daily}.ts` + routes `/play/submit`/`/me/progress`/`/play/daily`, front `DailyPage`/`XpBar`/`AuthProvider`/`client.ts`.
- **Référence** : `feature-progression.md` (PROG-D-1..8), T-C2/C5/C7/C8, FND-D-25/26.

## Findings & état

| ID | Sév. | Description | État |
|----|------|-------------|------|
| F7 | 🟠 Élevé | TOCTOU `hasAttempted`→`markAttempted` du défi → double bonus +50% concurrent. | ✅ **Corrigé** : `DailyStore.claim` test-and-set atomique réservé **avant** tout `await`. |
| F6 | 🟠 Élevé (produit) | Tentative perdue (start sans submit) = blocage jusqu'au lendemain. | ✅ **Acté + documenté** (PROG-D-8, anti re-roll) ; front distingue le 409. |
| F3 | 🟡 Moyen | Formule de niveau dupliquée front/back. | ✅ **Corrigé** : source unique `@puzzlehub/shared` (`xpThresholdForLevel`/`levelForXp`). |
| F14 | 🟡 Moyen | `asTangoPuzzle` garde structurelle faible. | ✅ **Renforcé** : vérifie size/given (dim) /constraints. |
| F12 | 🟢 Faible | 409 submit avalé en message générique. | ✅ **Corrigé** : message « déjà soumise ». |
| F15/F16 | ℹ️ | `bank.put` non purgé ; in-memory mono-instance (perte au restart, idempotence/1-jour multi-instance). | ⏳ **Dette tracée** (bascule Prisma). |

## Couverture
T-C7 (XP serveur-autoritative, montant depuis l'attempt jamais le client) ✅ · T-C8 (difficulté/daily serveur) ✅ · idempotence (consume usage-unique + Set attemptId) ✅ · crédit seulement si `valid && !too_fast` ✅ · défi déterministe date UTC + même puzzle ✅ · bonus serveur ✅ · pas de fuite de solution (FND-D-20) ✅. **Tests** : 3 unit progression + 4 intégration (XP valide/incomplet/too_fast, daily bonus+1/jour).

## Verdict
Cœur sécurité solide, **0 critique**. Les 2 élevés (TOCTOU daily, sémantique 1-start/jour) sont corrigés/actés. Reste la dette in-memory (Prisma).
