# Feature — Intégration continue (GitHub Actions)

- **Date** : 2026-06-19
- **Statut** : implémenté, validation utilisateur en attente
- **Source** : backlog `L0-bis-api` (volet CI), `plan-foundation.md` L0.
- **Résumé** : pipeline CI GitHub Actions reproduisant les vérifs locales (install gelé, typecheck, lint, test, build) sur push `main` et pull requests.

## Note de procédure (mode autonome)

Tâche d'infra à faible espace de décision (aucun doute architectural). Le cérémonial 4 phases est **collapsé** : décisions documentées ci-dessous + implémentation + vérif, **sans agent Opus de planification** (réservé aux features à vrai espace de conception, ex. mode classé). Tranché par défaut, révisable.

## Décisions

- **CI-D-1 — GitHub Actions.** Fichier `.github/workflows/ci.yml`. Pas d'autre fournisseur CI (KISS).
- **CI-D-2 — Déclencheurs** : `push` sur `main` + `pull_request` (toutes branches cibles). Évite les runs en double sur les branches de PR via `concurrency` (annule les runs obsolètes).
- **CI-D-3 — Environnement** : Ubuntu latest, Node 20 (aligné `.nvmrc`), pnpm 9.12.0 via Corepack (aligné `packageManager`). Cache du store pnpm via `actions/setup-node` (`cache: pnpm`).
- **CI-D-4 — Étapes** (mêmes commandes que local, ordre rapide→lent) : `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`. Un seul job séquentiel (KISS) ; l'échec d'une étape stoppe le run.
- **CI-D-5 — `--frozen-lockfile`** : la CI échoue si `pnpm-lock.yaml` n'est pas à jour (intégrité des deps, reproductibilité).

## Impact

- Aucun changement de code applicatif ; ajout d'un workflow CI.
- Devient le filet de sécurité des PRs (les 119 tests + lint + typecheck + build doivent rester verts).
- Backlog : volet CI de `L0-bis-api`. (Le volet `apps/api` Fastify est déjà livré, cf. AUTH.)

## Vérif

- Les commandes `pnpm typecheck/lint/test/build` passent en local (équivalent du job CI). Le workflow YAML ne peut pas s'exécuter hors GitHub ; validé par revue + parité des commandes.
