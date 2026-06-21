# Plan — Cosmétiques déblocables & expérience XP

- **Date** : 2026-06-19
- **Phase** : 3 (Planification — agent Opus). Plan technique uniquement, aucun code écrit.
- **Source de vérité** : [`documents/feature-cosmetics-xp.md`](feature-cosmetics-xp.md) — décisions XP-D-1..3, COSM-D-1..5.
- **Dépendances documentaires** :
  - [`documents/feature-progression.md`](feature-progression.md) — XP backend (PROG-D-1..8), `GET /me/progress`, `xpThresholdForLevel`/`levelForXp`.
  - [`documents/feature-auth-prisma.md`](feature-auth-prisma.md) — pattern stores in-memory↔Prisma (`createAuthStores`, `store/types.ts`, cascade RGPD, migration offline).
  - [`documents/feature-jeux-interactions.md`](feature-jeux-interactions.md) — **UX-D-4** : tokens de palette de jeu (`--game-1..9`) servent de base aux cosmétiques de palette (dépendance dure).
- **Résumé** : rendre la progression XP vivante (feedback de gain, level-up, page Profil) et livrer un catalogue v1 de cosmétiques esthétiques déblocables par niveau, sélection persistée serveur (in-memory↔Prisma), éligibilité serveur-only, application front via tokens de thème.

---

## 0. État réel du code (vérifié) & écarts vs décisions

| Élément | État réel (fichier:ligne) | Conséquence pour le plan |
| --- | --- | --- |
| Réponse `/play/submit` | `apps/api/src/app.ts:354-362` renvoie déjà `{accepted, valid, status, timeMs, xpGained, xp, level}` | **XP-D-1 prêt côté API** : aucune modif backend pour le feedback de gain. Le front (`useRankedPlay`) reçoit déjà `result.xpGained/xp/level`. |
| Front XP | `apps/web/src/app/XpBar.tsx` = barre statique header ; `xpGained` jamais affiché | À enrichir (toast + animation + level-up). |
| Formule de niveau partagée | `packages/shared/src/progression.ts` (`xpThresholdForLevel`, `levelForXp`) ; ré-exportée par `apps/api/src/play/xp.ts:4` | Source unique OK ; `unlockedCosmetics(level)` ira dans shared à côté du catalogue. |
| Stores | `apps/api/src/store/{types,memory,prisma,index}.ts` ; factory `createAuthStores(DATABASE_URL)` | **ÉCART** : la factory s'appelle `createAuthStores` et ne porte **que** auth (`users/sessions/tx`). Les stores de jeu (`progress/daily/attempt`) sont in-memory **construits à la main dans `server.ts:26-29`** (APRISMA-D-8). COSM-D-5 dit « réutiliser le pattern `createAuthStores` » — on le **suit fidèlement** (même interface/sélection par `DATABASE_URL`) mais le store cosmétiques est branché dans `server.ts` comme `progress`, pas ajouté à `createAuthStores` (qui reste auth-only). Voir E5/E6. |
| Migration Prisma | `apps/api/prisma/schema.prisma` (User/Session/OidcTx) + migration offline `prisma/migrations/20260619000000_init/` | Migration cosmétiques = **additive** (nouveau dossier `_add_cosmetic_selection`), même procédure offline (`migrate diff`). Cascade via `onDelete: Cascade` sur `User`. |
| Cascade RGPD | `apps/api/src/app.ts:249-258` (`DELETE /account`) appelle `sessions.deleteAllForUser` + `users.deleteById` | **ÉCART/risque** : la sélection cosmétiques in-memory n'est PAS reliée à `deleteById`. En Prisma la cascade SQL suffit ; en in-memory il faut nettoyer explicitement (voir E6/E8 — sécurité RGPD). |
| Tokens palette `--game-*` | **ABSENT** de `packages/ui/src/tokens.css` (un seul accent indigo) | **DÉPENDANCE DURE** : les cosmétiques de palette s'appuient sur UX-D-4 (`feature-jeux-interactions.md`). UX-D-4 n'est pas encore livré. Voir « Dépendances » + E0. |
| `Progress` côté front | `apps/web/src/api/client.ts:31-34` + `AuthProvider` expose `{user, progress, refresh}` | Étendre `AuthProvider` avec l'état cosmétiques (E10). |
| Page Profil | inexistante ; routes dans `apps/web/src/app/App.tsx` | Nouvelle route `/profil` (E9/E11). |

> **Écart de périmètre signalé (non bloquant)** : COSM-D-5 écrit « réutiliser `createAuthStores()` ». Le code réel sépare auth (factory) et jeu (montage manuel `server.ts`). Le plan respecte l'**intention** (sélection in-memory↔Prisma par `DATABASE_URL`, derrière interface) sans polluer la factory auth. Décision de planification consignée ici, révisable par l'utilisateur (règle d'or §4).

---

## Catalogue v1 proposé (COSM-D-1/COSM-D-2)

5 cosmétiques, esthétique pure, déblocage par niveau seul (pas de monnaie — Q-COSM-1). Tous neutres/sobres (FND-D-2). Deux catégories v1 : `palette` (couleur d'accent des plateaux / régions) et `pieceSkin` (rendu des pièces). Le niveau 0 = défaut toujours débloqué par catégorie.

| id | category | nom | requiredLevel | description (aperçu) |
| --- | --- | --- | --- | --- |
| `palette-default` | `palette` | Indigo (défaut) | 0 | Accent indigo standard. |
| `palette-emerald` | `palette` | Émeraude | 2 | Accent vert sobre pour les plateaux/chemins. |
| `palette-sunset` | `palette` | Crépuscule | 5 | Accent ambre/orangé désaturé. |
| `skin-default` | `pieceSkin` | Classique (défaut) | 0 | Pièces standard (soleil/lune, couronne…). |
| `skin-glyph` | `pieceSkin` | Glyphes | 3 | Variante de glyphes des pièces (Tango ☀/☾ stylisés, Queens ♛). |

- **2 catégories** (`palette`, `pieceSkin`), **1 équipé par catégorie** (COSM-D-3).
- `requiredLevel: 0` = débloqué d'office (le défaut). Sélection par défaut = l'item `*-default` de chaque catégorie.
- Aucun pay-to-win, aucune monnaie, purement visuel (COSM-D-1/COSM-D-4).
- **Catégories extensibles** ; v2 pourra ajouter `boardTheme` (fond/bordures) sans changement de contrat.

> Les couleurs concrètes (hex) des palettes seront définies dans `packages/ui` (E1/E0) en réutilisant les tokens UX-D-4 ; le catalogue shared ne contient que des **identifiants de tokens/classes**, pas de hex (découplage moteur/thème, COSM-D-4).

---

## Découpage en étapes ordonnées

Ordre global : **shared (contrats) → backend (store + API) → front (état + UI + application)**. Les étapes XP pures (toast/level-up) sont indépendantes des cosmétiques et peuvent être faites en parallèle de E1–E8.

### E0 — (Pré-requis) Tokens de palette UX-D-4 — *dépendance externe*

- **Statut** : appartient à `feature-jeux-interactions.md` (UX-D-4), **pas** à cette feature. Listé ici car les **cosmétiques de palette en dépendent**.
- **Fichiers** : `packages/ui/src/tokens.css`, `packages/ui/src/tailwind-preset.cjs`, `packages/ui/src/index.ts`.
- **Contrat attendu** : variables CSS `--game-1..--game-9` (ou un set d'accents nommés) déclinées light/dark, exposées au preset Tailwind.
- **Décision de planification** : si UX-D-4 n'est pas encore livré au moment d'implémenter les cosmétiques de palette, livrer dans **E1** un **set minimal d'accents de palette** (`--accent-emerald`, `--accent-sunset`) suffisant pour le catalogue v1, en notant la dette « fusionner avec `--game-*` quand UX-D-4 arrive ». Les **skins de pièces (E-skin)** n'ont aucune dépendance à UX-D-4 et peuvent avancer sans E0.

### E1 — Catalogue cosmétiques typé + helper d'éligibilité (shared) — **COSM-D-1, COSM-D-2**

- **Fichiers** :
  - nouveau `packages/shared/src/cosmetics.ts`,
  - `packages/shared/src/index.ts` (ajouter `export * from './cosmetics'`),
  - nouveau `packages/shared/src/cosmetics.test.ts`.
- **Contrats (types)** :
  ```ts
  export type CosmeticCategory = 'palette' | 'pieceSkin';
  export interface Cosmetic {
    id: string;            // ex. 'palette-emerald'
    category: CosmeticCategory;
    name: string;          // libellé FR
    requiredLevel: number; // 0 = débloqué d'office
    token: string;         // identifiant de classe/variable thème appliqué côté front (COSM-D-4)
  }
  export const COSMETICS: readonly Cosmetic[];                 // catalogue statique versionné
  export const DEFAULT_COSMETICS: Record<CosmeticCategory, string>; // id par défaut/catégorie
  export function unlockedCosmetics(level: number): Cosmetic[];      // filter requiredLevel <= level
  export function isUnlocked(id: string, level: number): boolean;    // éligibilité (serveur ET front)
  export function findCosmetic(id: string): Cosmetic | undefined;
  ```
- **Invariants** : ids uniques ; chaque catégorie possède exactement un `*-default` à `requiredLevel 0` ; `token` non vide.
- **Sécurité** : `isUnlocked` est la **fonction de vérité d'éligibilité réutilisée par le serveur** (jamais une décision client — COSM-D-2). Le front l'utilise seulement pour griser l'UI.
- **Tests (shared)** : `unlockedCosmetics(0)` ne renvoie que les `*-default` ; seuils (level 2 débloque `palette-emerald`, pas `palette-sunset`) ; `isUnlocked` aux bornes ; déterminisme/unicité du catalogue ; `DEFAULT_COSMETICS` pointe sur des ids existants `requiredLevel 0`.

### E2 — Interface `SelectionStore` + implémentation in-memory — **COSM-D-3, COSM-D-5**

- **Fichiers** :
  - `apps/api/src/store/types.ts` (ajouter l'interface — cohérent avec le pattern existant),
  - nouveau `apps/api/src/play/cosmetics.ts` **ou** `apps/api/src/store/cosmetics-memory.ts` (choix de planification : **`apps/api/src/play/cosmetics.ts`** pour rester homogène avec `progress.ts`/`daily.ts` qui co-localisent interface + impl in-memory),
  - nouveau test `apps/api/src/play/cosmetics.test.ts`.
- **Contrat (interface)** :
  ```ts
  export type CosmeticSelection = Record<CosmeticCategory, string>; // catégorie → id équipé
  export interface SelectionStore {
    get(userId: string): Promise<CosmeticSelection>;        // défaut si aucune sélection
    set(userId: string, category: CosmeticCategory, id: string): Promise<CosmeticSelection>;
    deleteForUser(userId: string): Promise<void>;           // RGPD (in-memory)
  }
  export class MemorySelectionStore implements SelectionStore { … }
  ```
- **Comportement** : `get` retourne `DEFAULT_COSMETICS` mergé avec les choix stockés ; `set` écrase la catégorie. **La vérification d'éligibilité ne vit PAS dans le store** (le store ne connaît pas le niveau) — elle est faite dans le handler avant `set` (E4). `deleteForUser` pour la cascade RGPD in-memory.
- **Tests (api)** : `get` d'un nouvel user = défauts ; `set` puis `get` reflète le choix ; `set` n'affecte qu'une catégorie ; `deleteForUser` réinitialise aux défauts.

### E3 — Implémentation Prisma `SelectionStore` + schéma/migration additive — **COSM-D-5**

- **Fichiers** :
  - `apps/api/prisma/schema.prisma` (nouveau modèle `CosmeticSelection`),
  - nouvelle migration offline `apps/api/prisma/migrations/<ts>_add_cosmetic_selection/migration.sql` (générée via `prisma migrate diff --from-... --to-schema-datamodel` comme APRISMA-D-7, **additive**),
  - `apps/api/src/play/cosmetics.ts` (classe `PrismaSelectionStore`) **ou** `apps/api/src/store/prisma.ts` (cohérence : placer à côté des autres Prisma stores → **`store/prisma.ts`** privilégié, mais alors l'interface vit dans `store/types.ts` ; arbitrage final dans E2 : interface+memory dans `play/cosmetics.ts`, Prisma dans `store/prisma.ts`, comme pour auth). **Décision retenue** : pour rester strictement homogène avec l'existant (memory dans `store/memory.ts`, prisma dans `store/prisma.ts`), placer **interface + types dans `store/types.ts`**, **memory dans `store/memory.ts`**, **prisma dans `store/prisma.ts`**. (Réviser E2 en conséquence : `MemorySelectionStore` → `store/memory.ts`.)
- **Modèle Prisma** :
  ```prisma
  model CosmeticSelection {
    userId    String
    category  String   // 'palette' | 'pieceSkin'
    cosmeticId String
    updatedAt DateTime @updatedAt
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@id([userId, category])   // une sélection par (user, catégorie)
  }
  ```
  + ajouter `cosmeticSelections CosmeticSelection[]` sur `model User` (relation).
- **Migration SQL (additive)** : `CREATE TABLE "CosmeticSelection" (...)`, PK composite `(userId, category)`, FK `userId → User(id) ON DELETE CASCADE`. **Aucune** altération des tables existantes.
- **Cascade RGPD (COSM-D-5, FND-D-21)** : assurée par `onDelete: Cascade` → la suppression de compte purge les sélections en Prisma sans code applicatif. (in-memory : voir E6/E8.)
- **Atomicité** : `set` = `upsert` Prisma sur PK `(userId, category)`.
- **Vérif (sans DB, cf. APRISMA-D-7)** : `prisma generate` + `tsc --noEmit` sur `store/prisma.ts` + `migrate diff` génère le SQL. Application réelle = côté dev/CI avec Postgres (non vérifiable en sandbox).
- **Tests** : ré-utiliser le pattern `store/index.test.ts` si la sélection passe par une factory (voir E6) — sinon test d'instanciation `PrismaSelectionStore`.

### E4 — Endpoints API `GET /me/cosmetics` & `POST /me/cosmetics/select` — **COSM-D-3, COSM-D-2 (sécurité)**

- **Fichiers** : `apps/api/src/app.ts` (ajouter les routes + champ `cosmetics: SelectionStore` dans `AppDeps`), `apps/api/src/app.test.ts` (tests d'intégration).
- **AppDeps** : ajouter `cosmetics: SelectionStore;` à l'interface `AppDeps` (app.ts:24-46).
- **`GET /me/cosmetics`** (auth requise, lecture) :
  - réponse :
    ```jsonc
    {
      "catalog": [ { "id","category","name","requiredLevel","token" }, ... ], // COSMETICS
      "level": 3,                       // niveau serveur courant (depuis deps.progress.get)
      "unlocked": ["palette-default","palette-emerald","skin-default","skin-glyph"], // ids éligibles
      "equipped": { "palette": "palette-emerald", "pieceSkin": "skin-default" }      // sélection serveur
    }
    ```
  - `level` ← `(await deps.progress.get(user.id)).level` ; `unlocked` ← `unlockedCosmetics(level).map(c=>c.id)` ; `equipped` ← `deps.cosmetics.get(user.id)`.
- **`POST /me/cosmetics/select`** (auth + **CSRF** requis comme toutes les mutations, cf. `requireCsrf` app.ts:123/282) :
  - body Zod **strict** : `z.object({ id: z.string() }).strict()` (400 si invalide).
  - logique **serveur-autoritative (COSM-D-2)** :
    1. `currentUser` → 401 sinon ;
    2. `requireCsrf` → 403 sinon ;
    3. parse body → 400 sinon ;
    4. `cosmetic = findCosmetic(id)` → 400 `unknown_cosmetic` si absent ;
    5. `level = (await deps.progress.get(user.id)).level` ;
    6. **`if (!isUnlocked(id, level)) return 403 { error: 'locked' }`** ← jamais débloqué par le client ;
    7. `equipped = await deps.cosmetics.set(user.id, cosmetic.category, id)` ;
    8. réponse `{ equipped }` (idempotent : re-sélectionner le même id renvoie 200).
  - **rate-limit** : réutiliser le rate-limit global (mutation peu coûteuse) ; pas de route dédiée nécessaire (≠ `/play/*`).
- **Sécurité (transverse)** :
  - éligibilité dérivée du **niveau serveur** (`deps.progress.get`), jamais d'un champ client (COSM-D-2, cohérent PROG-D-3/FND-D-7b) ;
  - cosmétiques **purement esthétiques** → aucune surface d'abus de scoring (rappel COSM-D-1) ;
  - CSRF double-submit sur la mutation comme `/play/start`, `/account` ;
  - body strict (pas de champ `level`/`unlocked` accepté du client).
- **Tests (api intégration)** :
  - `GET /me/cosmetics` 401 sans session ;
  - select 403 `csrf` sans header ;
  - select 400 sur id inconnu / body non strict ;
  - **select 403 `locked` sur cosmétique non débloqué** (user niveau 0 tentant `palette-sunset`) ;
  - select 200 sur cosmétique débloqué → `equipped` mis à jour ;
  - `GET /me/cosmetics` reflète `level`/`unlocked`/`equipped` après award d'XP simulé (manipuler `deps.progress`) ;
  - idempotence : re-select même id → 200, état inchangé.

### E5 — Branchement du store dans `server.ts` — **COSM-D-5**

- **Fichiers** : `apps/api/src/server.ts`.
- **Action** : instancier le `SelectionStore` selon `DATABASE_URL` (même critère que `createAuthStores`) et le passer à `buildApp({ …, cosmetics })`.
  - **Décision de planification (cf. §0 écart)** : pour respecter COSM-D-5 « pattern `createAuthStores` » sans muter la factory auth, deux options :
    - (a) ajouter une **factory dédiée** `createGameStores(databaseUrl)` dans `store/index.ts` renvoyant `{ cosmetics }` (et, à terme, progress/daily — extensible, lève la dette APRISMA-D-8) ;
    - (b) instancier en ligne dans `server.ts` (`databaseUrl ? new PrismaSelectionStore(prisma) : new MemorySelectionStore()`).
  - **Retenu : (a) `createGameStores`** — plus testable (réutilise le pattern `store/index.test.ts`), prépare la migration des autres stores de jeu, sélection unique par `DATABASE_URL`. Partage du `PrismaClient` à clarifier (un client par factory acceptable en v1 ; mutualisation = amélioration future notée).
- **Tests** : étendre `store/index.test.ts` → `createGameStores(undefined)` = Memory, `createGameStores(url)` = Prisma.

### E6 — Cascade RGPD in-memory — **COSM-D-5 (FND-D-21), correction d'écart sécurité**

- **Fichiers** : `apps/api/src/app.ts` (`DELETE /account`, ligne ~249).
- **Action** : après `users.deleteById(user.id)`, appeler `await deps.cosmetics.deleteForUser(user.id)` afin que la suppression de compte purge aussi la sélection **en mode in-memory** (en Prisma la cascade SQL le fait déjà, mais l'appel reste sûr/idempotent : la table sera déjà vide via cascade, `deleteForUser` côté Prisma = `deleteMany` no-op).
- **Justification** : sans cela, un nouvel utilisateur réutilisant un id (peu probable mais auditable) hériterait d'une sélection fantôme ; surtout, RGPD exige la purge complète des données utilisateur (FND-D-21).
- **Tests (api)** : `DELETE /account` puis vérifier que `cosmetics.get` renvoie les **défauts** (sélection purgée).

### E7 — Client API front cosmétiques — **COSM-D-3/COSM-D-4**

- **Fichiers** : `apps/web/src/api/client.ts`.
- **Contrats** :
  ```ts
  export interface CosmeticsState {
    catalog: Cosmetic[];                       // type importé de @puzzlehub/shared
    level: number;
    unlocked: string[];
    equipped: Record<CosmeticCategory, string>;
  }
  export async function getCosmetics(): Promise<CosmeticsState | null>;     // GET, null si non connecté
  export async function selectCosmetic(id: string): Promise<CosmeticsState['equipped']>; // POST + CSRF
  ```
  - `getCosmetics` suit le pattern `getProgress` (try/catch → `null` si 401).
  - `selectCosmetic` envoie `csrfHeader()` ; mappe 403 → erreur typée `'locked'` (pour message UI « débloqué au niveau X »).
- **Tests** : couverts indirectement par les tests d'intégration api + tests composant front (E11).

### E8 — Fallback localStorage pré-login (affichage) — **COSM-D-3 (« fallback localStorage »)**

- **Fichiers** : nouveau `apps/web/src/cosmetics/storage.ts` (helpers `readLocalCosmetics()/writeLocalCosmetics()`), réutilisé par le provider (E10).
- **Comportement** : avant login (ou si `getCosmetics` renvoie `null`), l'**application visuelle** des cosmétiques équipés utilise un fallback localStorage (clé `puzzlehub-cosmetics`) **purement esthétique**. **La sélection autoritative reste serveur** (COSM-D-2/COSM-D-3) : le fallback n'autorise aucun déblocage non mérité (on n'applique localement qu'un id parmi les `*-default`, ou le dernier `equipped` connu après login). Pas d'écriture serveur sans session.
- **Décision de planification** : pour rester strict anti-triche/esthétique, le fallback **n'expose pas** d'items verrouillés ; il ne sert qu'à éviter un flash de thème par défaut pour un utilisateur connu. Si l'utilisateur n'est jamais connecté → défauts.
- **Tests** : parse/garde du localStorage (valeur corrompue → défauts).

### E9 — `unlockedCosmetics`/tokens : couche d'application front (CosmeticsProvider + CSS) — **COSM-D-4**

- **Fichiers** :
  - nouveau `packages/ui/src/cosmetics.css` (ou ajout dans `tokens.css`) : définit les variables/classes par `token` (`[data-palette='emerald']`, `[data-skin='glyph']`, …) déclinées light/dark, **désaturées** (FND-D-2) ;
  - `packages/ui/src/index.ts` (export éventuel d'un helper `applyCosmetics(root, equipped)`),
  - nouveau `apps/web/src/cosmetics/CosmeticsProvider.tsx`.
- **Mécanisme (COSM-D-4)** : le cosmétique `palette` équipé pose un attribut `data-palette=<token>` sur `document.documentElement` (analogue à `applyTheme`/`data-theme`, cf. `ThemeProvider`/`theme.ts`) ; le `pieceSkin` pose `data-skin=<token>`. Les plateaux lisent ces variables via Tailwind/CSS — **aucune modification du moteur** (`packages/engine`), aucun impact gameplay/anti-triche.
- **Skins de pièces** : pour v1, paramétrage **CSS/contenu** (glyphes via variables ou classes) sans logique. Si un skin requiert un composant de rendu différent (ex. SVG couronne), prévoir un point d'extension dans les `*Board.tsx` lisant `data-skin` — **borné v1 au strict nécessaire** pour le catalogue ci-dessus (glyphes Tango/Queens). Aucune fuite de solution (rappel : `validate` seul côté client).
- **Tests (ui)** : `applyCosmetics` pose les bons attributs ; mapping token→attribut stable.

### E10 — Intégration état cosmétiques dans `AuthProvider` (ou provider dédié) — **XP-D / COSM-D-3**

- **Fichiers** : `apps/web/src/app/AuthProvider.tsx` (étendre) **ou** `CosmeticsProvider.tsx` (E9) consommant `useAuth`.
- **Décision de planification** : **provider dédié `CosmeticsProvider`** (E9) qui appelle `getCosmetics()` au login/refresh et applique les attributs via `applyCosmetics`. Évite de surcharger `AuthProvider` (séparation des responsabilités). `CosmeticsProvider` est monté sous `AuthProvider` dans `main.tsx`.
- **Refresh** : `refresh()` d'`AuthProvider` met déjà à jour `progress` après chaque submit (`useRankedPlay` l'appelle, app.ts/useRankedPlay.ts:105). `CosmeticsProvider` re-fetch `getCosmetics` quand `user`/`progress.level` change → la grille reflète les nouveaux déblocages.
- **Tests** : provider applique le fallback avant login, applique l'`equipped` serveur après login.

### E11 — Page Profil / grille de cosmétiques — **XP-D-3, COSM-D-3 (UI)**

- **Fichiers** :
  - nouveau `apps/web/src/pages/ProfilePage.tsx`,
  - `apps/web/src/app/App.tsx` (route `/profil`),
  - `apps/web/src/app/Layout.tsx` (lien « Profil » + lien depuis `AuthControls`/`displayName`),
  - nouveau composant `apps/web/src/cosmetics/CosmeticGrid.tsx`.
- **Contenu (XP-D-3)** : XP totale, niveau, **progression vers le niveau suivant** (réutilise `xpThresholdForLevel(level)`/`(level+1)` comme `XpBar`), puis la **grille de cosmétiques** par catégorie :
  - items débloqués sélectionnables (clic → `selectCosmetic(id)` → maj `equipped`) ;
  - items verrouillés **grisés** avec « Niveau X requis » (via `isUnlocked(id, level)` côté client, **affichage seulement** — le serveur reste l'autorité, 403 `locked` géré) ;
  - item équipé marqué (badge/anneau).
- **Sécurité front** : la garde client est cosmétique ; toute sélection passe par `POST /me/cosmetics/select` qui re-valide (E4). Un 403 `locked` affiche un message sans casser l'UI.
- **Accessibilité** : grille navigable clavier, état équipé/verrouillé non porté par la seule couleur (badge + texte « Niveau X requis »), `aria-pressed` sur l'item équipé (cohérent UX-D-7/FND-D-27).
- **Tests (front)** : rendu de la grille (débloqués vs verrouillés), clic sur item débloqué appelle `selectCosmetic`, item verrouillé non sélectionnable, affichage progression niveau.

### E12 — XpBar enrichie : feedback « +X XP » + level-up — **XP-D-1, XP-D-2**

- **Fichiers** :
  - `apps/web/src/play/useRankedPlay.ts` (exposer le delta de gain au consommateur) **ou** un hook/composant de notification global,
  - `apps/web/src/app/XpBar.tsx` (animation de la barre),
  - nouveau `apps/web/src/app/XpToast.tsx` (toast « +X XP » + level-up),
  - éventuel montage du toast dans `Layout.tsx`.
- **Source de vérité (XP-D-1)** : le gain vient de la **réponse serveur** `result.xpGained` (déjà présent, app.ts:359 ; `SubmitResponse.xpGained` client.ts:26). Aucune confiance au client.
- **Mécanisme** :
  - **Feedback gain** : à réception d'un `submit` accepté avec `xpGained > 0`, afficher un toast « +X XP » et animer la barre header de l'ancien ratio au nouveau.
  - **Level-up (XP-D-2)** : détecter `level` croissant entre deux états `progress`. **Idempotence d'affichage** : comparer au niveau précédent mémorisé (ref), déclencher **une seule fois**, **pas** au simple refetch (le re-`getProgress` au mount ne doit pas re-trigger). Utiliser un `useRef(previousLevel)` initialisé au premier `progress` connu.
  - **Annonce déblocage** (XP-D-2 + COSM-D-3) : au level-up, si `unlockedCosmetics(newLevel)` contient un id absent de `unlockedCosmetics(oldLevel)`, afficher « Nouveau cosmétique débloqué ! » avec lien `/profil`.
- **Accessibilité (XP-D-1)** : respect `prefers-reduced-motion` (transition réduite/instantanée), toast en `role="status"`/`aria-live="polite"`.
- **Tests (front)** :
  - barre animée déclenchée sur `xpGained > 0` ;
  - level-up déclenché **une seule fois** (pas de re-trigger au refetch identique) ;
  - pas de toast si `xpGained === 0` (résolution déjà créditée / idempotence) ;
  - annonce déblocage cohérente avec les seuils du catalogue.

---

## Ordre & graphe de dépendances

```
E0 (UX-D-4, externe) ┐ (palette uniquement)
                     ↓
E1 (shared catalogue + helpers)  ──────────────┐
   ↓                                           ↓
E2 (interface + memory store)            E12 (XP toast/level-up)  ← indépendant (API déjà prête)
   ↓                                           │ (utilise unlockedCosmetics de E1 pour l'annonce)
E3 (Prisma + migration)                        │
   ↓                                           │
E4 (endpoints API + sécurité 403 locked)       │
   ↓                                           │
E5 (branchement server.ts / createGameStores)  │
   ↓                                           │
E6 (cascade RGPD in-memory)                     │
   ↓                                           │
E7 (client API front) ──→ E8 (fallback localStorage)
   ↓
E9 (UI tokens + applyCosmetics) ──→ E10 (CosmeticsProvider)
   ↓
E11 (Page Profil + grille)
```

- **Chemin critique cosmétiques** : E1 → E2 → E3 → E4 → E5 → E6 → E7 → E9 → E10 → E11.
- **E12 (XP feedback/level-up)** ne dépend que de E1 (pour l'annonce de déblocage) et de l'API existante ; **livrable en parallèle**.
- **E0** ne bloque que les **cosmétiques de palette** ; les **skins** (E1 catalogue + E9/E11) avancent sans E0. Mitigation dans E0/E1 : set d'accents minimal si UX-D-4 en retard.

---

## Dépendances clés (synthèse)

1. **UX-D-4 (palette `--game-*`)** — `feature-jeux-interactions.md` — **prérequis des cosmétiques de palette** (COSM-D-1 le dit explicitement). Mitigation : accents minimaux dans E1/E0, dette tracée.
2. **XP backend (PROG-D-1..8)** — déjà livré ; `level` serveur consommé par E4 (éligibilité) et `xpGained` par E12.
3. **Pattern stores (`createAuthStores`/`store/types.ts`)** — réutilisé pour `SelectionStore` (E2/E3/E5), avec l'écart de périmètre noté (factory `createGameStores` dédiée).
4. **Cascade RGPD (FND-D-21)** — Prisma via `onDelete: Cascade` (E3) + in-memory via `deleteForUser` dans `DELETE /account` (E6).

---

## Sécurité (récapitulatif transverse)

- **Éligibilité serveur-only (COSM-D-2)** : `isUnlocked(id, serverLevel)` calculé dans le handler `POST /me/cosmetics/select` à partir de `deps.progress.get(user.id).level` ; **jamais** un champ fourni par le client. 403 `locked` sinon (E4).
- **CSRF** sur la mutation `select` (double-submit, comme `/play/*` et `/account`).
- **Body Zod strict** : aucun champ `level`/`unlocked` accepté du client.
- **Aucun impact anti-triche/scoring** : cosmétiques 100 % esthétiques (COSM-D-1) ; moteur intact (COSM-D-4) ; pas de fuite de solution (split client/serveur engine inchangé).
- **RGPD** : purge complète de la sélection à la suppression de compte (E3 Prisma + E6 in-memory).
- **Fallback localStorage (E8)** : esthétique seulement, n'autorise aucun déblocage non mérité.

---

## Risques & points de vigilance

- **R1 — UX-D-4 non livré** : bloque les palettes. *Mitigation* : E0/E1 livrent un set d'accents minimal, dette « fusionner avec `--game-*` ».
- **R2 — Écart périmètre factory** (COSM-D-5 « `createAuthStores` » vs code réel auth-only) : tranché par `createGameStores` dédiée (E5) ; **à valider par l'utilisateur** (règle d'or §4).
- **R3 — Prisma non vérifiable en sandbox** (cf. APRISMA-D-7) : migration additive générée offline, application réelle côté dev/CI avec Postgres. Tests CI restent in-memory.
- **R4 — Re-trigger level-up** : risque de double animation au refetch ; mitigé par `useRef` du niveau précédent (E12) et test dédié.
- **R5 — `PrismaClient` dupliqué** (un par factory) : acceptable v1, mutualisation = amélioration future.
- **R6 — Skins de pièces** : si un skin demande un vrai composant SVG, la surface dépasse « CSS pur » ; borné v1 au catalogue glyphes ci-dessus pour rester dans COSM-D-4 (« composants de rendu paramétrés, pas de logique »).

---

## Couverture des décisions (contrôle Phase 4 anticipé)

| Décision | Étape(s) |
| --- | --- |
| XP-D-1 (feedback +X XP, reduced-motion, source serveur) | E12 (API déjà prête) |
| XP-D-2 (level-up, idempotent affichage, annonce déblocage) | E12 |
| XP-D-3 (barre header + page Profil) | E11, E12 |
| COSM-D-1 (catalogue statique shared, esthétique pur, types) | E1, catalogue v1 |
| COSM-D-2 (éligibilité serveur par niveau, 403) | E1 (`isUnlocked`), E4 |
| COSM-D-3 (sélection serveur, `GET`/`POST select`, fallback localStorage) | E2, E4, E7, E8, E11 |
| COSM-D-4 (application via tokens thème, découplé moteur) | E9, E10 |
| COSM-D-5 (store in-memory↔Prisma, migration additive, cascade RGPD, catalogue hors base) | E2, E3, E5, E6 |

---

## Tests — vue d'ensemble

- **shared** : `cosmetics.test.ts` — `unlockedCosmetics`, `isUnlocked`, invariants catalogue (E1).
- **api** : `cosmetics.test.ts` (store), `app.test.ts` (endpoints : 401/403 csrf/400/**403 locked**/200/idempotence/`GET` reflète niveau), `index.test.ts` (`createGameStores`), `DELETE /account` purge (E2–E6).
- **ui** : `applyCosmetics` pose les attributs (E9).
- **front** : `CosmeticGrid` (débloqués/verrouillés/sélection), `ProfilePage` (progression niveau), `XpToast`/`XpBar` (gain animé, level-up une seule fois, pas de toast si gain 0) (E11, E12).

---

## Backlog (à ouvrir après validation Phase 4)

> Claude ne passe jamais en `DONE` (réservé utilisateur). Priorités KISS HOT/WARM/COLD.

- `COSMETICS-shared` [WARM][TODO] — E1 catalogue + helpers (bloque tout le reste).
- `COSMETICS-store` [WARM][TODO] — E2/E3/E5/E6 store + migration + RGPD.
- `COSMETICS-api` [WARM][TODO] — E4 endpoints + sécurité 403.
- `COSMETICS-front` [WARM][TODO] — E7/E8/E9/E10/E11 application + page Profil.
- `XP-FEEDBACK` [WARM][TODO] — E12 toast/level-up (parallélisable).
- `COSMETICS-palette-merge` [COLD][TODO] — dette : fusionner accents minimaux avec `--game-*` quand UX-D-4 livré (R1).
```
