# Feature — Cosmétiques déblocables & expérience XP

- **Date** : 2026-06-19
- **Statut** : **implémenté (E1→E12), typecheck/lint/179 tests/build verts** — validation utilisateur en attente. Reste non vérifiable ici : appliquer la migration Prisma sur un Postgres réel.
- **Source** : besoin utilisateur 2026-06-19 ; FND-D-9 (XP/niveaux + cosmétiques gratuits, no pay-to-win), Q4 (stockage cosmétiques), entrée backlog `COSMETICS` (COLD/TODO).
- **Résumé** : rendre la progression visible (barre d'XP enrichie + feedback de gain/level-up) et livrer un **catalogue de cosmétiques purement esthétiques déblocables par XP/niveau**, appliqués via les tokens de thème, serveur-autoritatif.

> **v2 (2026-06-21)** : catalogue étendu et catégorie `boardTheme` ajoutée — palettes Océan/Rose/Mono, skins de pièces **Néon/Rétro**, thèmes de plateau **Papier/Ardoise**. `CosmeticCategory` widené (`palette`/`pieceSkin`/`boardTheme`), `applyCosmetics` pose `data-board-theme`, CSS dans `tokens.css` (skins → pièces Tango `[data-piece]` ; thèmes → `.board-stage`). Détails et décisions dans `documents/feature-offline-progression.md` (section _Cosmétiques v2_).

## Contexte & besoin (Phase 1 — Écoute)

Reformulation fidèle : « tu as complètement oublié la partie avec les barres d'exp, les cosmétiques déblocables etc. » → l'utilisateur veut que la **méta-progression** soit réellement présente :

1. **Barres d'XP** visibles et vivantes (feedback de gain, niveau).
2. **Cosmétiques déblocables** par la progression.

## État actuel (RAG + lecture code)

- **XP backend livré** (`feature-progression.md`, PROG-D-1..8) : crédit serveur idempotent, `GET /me/progress` → `{xp, level}`, formule de niveau partagée (`xpThresholdForLevel`).
- **Front XP minimal** : `apps/web/src/app/XpBar.tsx` = « Niv. N » + barre de ratio statique dans le header. Pas de feedback de gain (`xpGained` renvoyé par `/play/submit` n'est pas mis en avant), pas d'animation, pas de level-up.
- **Cosmétiques : rien.** `COSMETICS [COLD][TODO]` au backlog. Brainstorm FND-D-9 (cosmétiques esthétiques : thèmes de plateau, skins de pièces, palettes ; gratuits via XP/succès ; no pay-to-win) ; Q4 (catalogue en base + table `unlock` par user + application front via tokens de thème).

## Décisions (Phase 2 — tranchées en mode autonome)

### Expérience XP

- **XP-D-1 — Feedback de gain.** À la résolution validée (`/play/submit` renvoie `{xpGained, xp, level}`), afficher un **toast/animation « +X XP »** et animer la barre. _Respect `prefers-reduced-motion`_ (transition réduite). Source de vérité = réponse serveur (anti-triche FND-D-7b inchangé).
- **XP-D-2 — Level-up.** Détecter `level` croissant entre deux états de progression → **animation de montée de niveau** + éventuel déblocage cosmétique annoncé (cf. COSM-D-3). Idempotent à l'affichage (pas de re-trigger au refetch).
- **XP-D-3 — Barre enrichie.** Garder la barre header (compacte) ; ajouter une **page/section Profil** montrant XP totale, niveau, progression vers le niveau suivant, et la grille de cosmétiques.

### Cosmétiques

- **COSM-D-1 — Périmètre = esthétique pur (FND-D-9).** Types v1 : **palettes de plateau** (réutilise les tokens palette UX-D-4 / accent), **thèmes de plateau** (fond/bordures), **skins de pièces** (ex. soleil/lune Tango, couronne Queens). **Aucun pay-to-win, aucun achat.** Catalogue **statique versionné** côté `packages/shared` (id, type, nom, niveau requis, aperçu).
- **COSM-D-2 — Déblocage serveur-autoritatif par niveau.** L'**éligibilité** d'un cosmétique est dérivée du **niveau serveur** du joueur (`level ≥ requiredLevel`) — jamais décidée par le client (cohérent FND-D-7b / PROG-D-3). Pas de monnaie en v1 (niveau seul). _Alt écartée : succès/achievements comme condition (reporté, pas encore de système de succès)._
- **COSM-D-3 — Sélection persistée serveur.** Le cosmétique **équipé** par catégorie est stocké côté serveur par user (`SelectionStore` derrière interface, in-memory ↔ Prisma, comme l'auth/progress). Endpoints : `GET /me/cosmetics` (catalogue + débloqués + équipés), `POST /me/cosmetics/select {id}` (refuse si non débloqué → 403). Fallback localStorage pour l'affichage avant login.
- **COSM-D-4 — Application front via tokens de thème (Q4).** Le cosmétique équipé mappe vers des **variables CSS / classes** (palette, skin) appliquées aux plateaux. Découplé du moteur ; aucun impact gameplay/anti-triche. Skins de pièces = composants de rendu paramétrés (pas de logique).
- **COSM-D-5 — Persistance.** Réutiliser le pattern `createAuthStores()` / interfaces `store/types.ts` : nouveau store cosmétiques sélectionnable in-memory ↔ Prisma par `DATABASE_URL`. Migration Prisma additive (table `CosmeticSelection` par user, cascade RGPD). Le **catalogue n'est pas en base** (statique shared) pour rester simple ; seule la sélection l'est.

## Impact

- **Backend** : nouveaux endpoints `/me/cosmetics*`, nouveau store + (option) migration Prisma. Dépend de `level` déjà calculé (PROG-D-2). Cascade suppression compte RGPD à étendre (FND-D-21).
- **Shared** : catalogue cosmétiques typé + helper d'éligibilité (`unlockedCosmetics(level)`), réutilisé front/back pour cohérence.
- **Front** : `XpBar` enrichie + toasts + page Profil/Cosmétiques + couche d'application des tokens cosmétiques sur les plateaux (croise UX-D-4 palette).
- **Croisement avec `feature-jeux-interactions.md`** : les **palettes de jeu** (UX-D-4) servent à la fois la lisibilité (Queens/Patches) **et** de base aux cosmétiques de palette. → Livrer UX-D-4 (tokens palette) **avant** les cosmétiques de palette (dépendance).
- **Sécurité** : éligibilité serveur-only ; un client ne peut pas équiper un cosmétique non débloqué (403). Purement cosmétique, pas de surface d'abus de scoring.

## Questions ouvertes (tranchées par défaut)

- **Q-COSM-1 — Monnaie/boutique ?** → tranché : **non en v1**, déblocage par niveau seul (FND-D-9 « gratuit via progression »). Monnaie = évolution future éventuelle.
- **Q-COSM-2 — Catalogue en base ou en code ?** → tranché : **en code (shared, versionné)** ; seule la sélection user va en base. Simplicité + cohérence front/back.
- **Q-COSM-3 — Succès comme condition de déblocage ?** → reporté : pas de système de succès encore ; v1 = niveau.

## Phase 4 — Validation du plan (2026-06-19)

Plan [`plan-cosmetics-xp.md`](plan-cosmetics-xp.md) (agent Opus) confronté aux décisions XP-D-1..3 + COSM-D-1..5 : **couverture complète** (tableau de contrôle inclus dans le plan), éligibilité serveur-only respectée. Écarts remontés, **tranchés (mode autonome)** :

- **Écart-1 (XP-D-1 déjà servi par l'API)** → confirmation : `/play/submit` renvoie déjà `{xpGained, xp, level}` (`app.ts`), `useRankedPlay` les reçoit. **Aucune modif backend** pour le feedback ; seul le front manque (E12).
- **Écart-2 (COSM-D-5 « réutiliser `createAuthStores` » vs code réel)** → résolu : la factory réelle est **auth-only** (les stores de jeu sont montés à la main dans `server.ts`). On suit l'**intention** (sélection in-memory↔Prisma par `DATABASE_URL`, derrière interface) via une **factory dédiée `createGameStores`** sans polluer la factory auth. **Précise COSM-D-5.**
- **Écart-3 (cascade RGPD in-memory)** → résolu : ajouter `cosmetics.deleteForUser(userId)` dans `DELETE /account` (en Prisma la cascade SQL `onDelete: Cascade` suffit). Renforce **COSM-D-5 / FND-D-21**.
- **Risques notés** : `PrismaClient` dupliqué (accepté v1), re-trigger level-up (mitigé `useRef`), skins SVG (bornés v1 aux glyphes CSS).

**Dépendance dure** : les **cosmétiques de palette** dépendent de **UX-D-4** (`feature-jeux-interactions.md`, tokens `--game-*`). Mitigation si UX-D-4 en retard : accents minimaux + dette `COSMETICS-palette-merge`. Les **skins** n'en dépendent pas. Chemin critique : E1→E2→E3→E4→E5→E6→E7→E9→E10→E11 ; **E12 (XP feedback) parallélisable**.

## Tests (cibles)

- `unlockedCosmetics(level)` (seuils), shared : déterminisme catalogue.
- Endpoint select : refuse (403) un cosmétique non débloqué, accepte un débloqué, idempotent ; `GET /me/cosmetics` reflète niveau courant.
- Front : barre animée sur `xpGained`, level-up déclenché une seule fois, application d'un skin/palette sur un plateau.
