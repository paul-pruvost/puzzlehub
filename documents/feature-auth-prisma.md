# Feature — Persistance Prisma/Postgres des stores auth (AUTH-prisma)

- **Date** : 2026-06-19
- **Statut** : **implémenté, validation utilisateur en attente**. Prisma installé + client généré dans l'environnement ; typecheck/lint/tests verts (121 tests, stores in-memory par défaut). Migration SQL initiale générée hors-ligne. Application réelle des migrations sur Postgres = à exécuter côté dev/CI (non vérifiable ici).
- **Source** : backlog `AUTH-prisma`, `feature-auth-api.md` (AUTH-D-8 abstraction store), audit `auth-2026-06-19.md` (TxStore usage-unique, rotation session).
- **Résumé** : remplacer les stores in-memory `UserStore`/`SessionStore`/`TxStore` par des implémentations Prisma/Postgres, derrière les interfaces existantes (`apps/api/src/store/types.ts`), sans changer le code applicatif.

## Note de procédure (mode autonome)

Décisions tranchées par défaut ci-dessous. Pas d'agent Opus de planification : le périmètre est cadré par les interfaces existantes (`store/types.ts`) et l'audit auth ; l'enjeu est l'implémentation fidèle (atomicité, TTL, cascade), pas la conception d'architecture.

## Décisions

- **APRISMA-D-1 — Prisma + PostgreSQL** (AUTH-D-8). Schema dans `apps/api/prisma/schema.prisma` (seul `apps/api` consomme la base).
- **APRISMA-D-2 — Sélection par env** : si `DATABASE_URL` est défini → stores Prisma ; sinon → stores in-memory (dev sans DB + **tests/CI restent verts sans Postgres**). Factory `createStores()` dans `apps/api/src/store/index.ts`.
- **APRISMA-D-3 — Modèle de données** :
  - `User { id, googleSub @unique, email, displayName, avatarUrl?, role (enum user|admin), createdAt }`.
  - `Session { id, userId → User onDelete: Cascade, expiresAt, createdAt, @@index([userId]) }`.
  - `OidcTx { id, state, nonce, verifier, expiresAt }`.
- **APRISMA-D-4 — TxStore.consume atomique & usage unique** (SEC-C1/E1) : transaction interactive `findUnique` + `delete` (ligne unique) ; supprime AVANT de vérifier le TTL (rejeu impossible même expiré). Reconduit le contrat in-memory.
- **APRISMA-D-5 — SessionStore** : `get` filtre `expiresAt > now` et supprime l'entrée expirée ; `deleteAllForUser` pour rotation (audit SEC-E2) + logout global + RGPD.
- **APRISMA-D-6 — RGPD** : `deleteById(user)` → cascade supprime les sessions (`onDelete: Cascade`), conforme suppression de compte (feature-auth-api).
- **APRISMA-D-7 — Migrations** : `prisma migrate` ; Postgres local via `docker-compose.yml` + `.env.example` (`DATABASE_URL`). La CI **n'exécute pas** de DB (tests in-memory). Migration initiale générée hors-ligne via `prisma migrate diff --from-empty` (vérifiable sans serveur).
- **APRISMA-D-8 — Périmètre** : auth uniquement (User/Session/Tx). Les stores de jeu (`play/attempt`, `progress`, `daily`, `bank`) restent in-memory — persistance traitée séparément (dette déjà tracée, audits progression/play).

## Impact

- `apps/api` : deps `@prisma/client` + `prisma` (dev), scripts `db:generate`/`db:migrate`, `prisma/schema.prisma`, `src/store/prisma.ts`, factory `src/store/index.ts`, `docker-compose.yml`, `.env.example`.
- Aucun changement des routes/handlers (interfaces inchangées) → tests existants inchangés et verts (in-memory par défaut).
- CI inchangée (pas de Postgres) ; vérif Prisma = `prisma generate` + typecheck.

## Vérif

- **Risque environnement** : `@prisma/client`/`prisma` téléchargent des binaires moteur au postinstall (réseau). Si l'installation échoue hors-ligne dans ce sandbox, l'implémentation est livrée mais **non vérifiable ici** ; la génération + migration seront à exécuter côté dev/CI avec réseau + Postgres.
- Vérifiable sans DB : `prisma generate` (types client) + `tsc --noEmit` sur `src/store/prisma.ts` ; migration SQL via `migrate diff --from-empty`.
- Non vérifiable ici : application réelle des migrations + I/O Postgres (nécessite une instance).
