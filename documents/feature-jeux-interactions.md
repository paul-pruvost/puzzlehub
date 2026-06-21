# Feature — Interactions par jeu & lisibilité (couleurs)

- **Date** : 2026-06-19
- **Statut** : **implémenté (E1→E9), typecheck/lint/179 tests/build verts** — validation utilisateur en attente.
- **Source** : besoin utilisateur 2026-06-19 ; rattachement FND-D-2 (tokens thème), FND-D-24 (validate live), FND-D-27 (a11y daltonisme/onboarding).
- **Résumé** : refondre les modèles d'interaction des plateaux (Zip drag, Tango clic G/D, Sudoku sélection+saisie) et introduire une **palette de jeu** pour la lisibilité, Queens en tête, sans casser l'accessibilité.

## Contexte & besoin (Phase 1 — Écoute)

Reformulation fidèle du besoin exprimé :

1. **Zip** doit se jouer **en maintenant le clic et en déplaçant la souris** pour tracer un chemin (au lieu de cliquer case par case).
2. **Tango** : **clic gauche = soleil**, **clic droit = lune** (deux boutons distincts).
3. **Sudoku** : choisir le nombre à poser **soit au clavier**, **soit en sélectionnant un chiffre** une fois une case cliquée (sélection de case + pavé de chiffres).
4. **Couleurs** : ajouter des couleurs pour rendre les jeux plus clairs, **notamment Queens** (régions), et **revoir ce type de feature pour tous les jeux**.

## État actuel (RAG + lecture code)

- `apps/web/src/games/zip/ZipBoard.tsx` + `cells.ts` : tracé **clic case par case** (`onClick` → `nextPath`). Pas de drag.
- `apps/web/src/games/tango/cells.ts::nextSymbol` : **cycle clic gauche** vide→soleil(0)→lune(1)→vide. Pas de distinction de bouton.
- `apps/web/src/games/sudoku/cells.ts::nextDigit` : **cycle clic** vide→1→…→size→vide. Pas de sélection ni de saisie clavier.
- `apps/web/src/games/queens/QueensBoard.tsx` : régions distinguées **par bordure épaisse + numéro uniquement** (aucune couleur de fond).
- `packages/ui/src/tokens.css` + `tailwind-preset.cjs` : **un seul accent indigo**, neutres ; pas de palette multi-couleurs pour les jeux.
- Plateaux partagés : utilisés en entraînement (`*BoardPage.tsx`) **et** en mode classé (`games/*/ranked.tsx` via le shell `play/RankedPlay`). Toute modif de plateau impacte les deux surfaces.

## Décisions (Phase 2 — tranchées en mode autonome)

### Interactions

- **UX-D-1 — Zip : tracé au pointeur (drag).** Passer ZipBoard en **Pointer Events** : `onPointerDown` sur une case démarre/continue le tracé, `onPointerMove` (avec `pointer` capturé sur le conteneur) étend le chemin à chaque case **adjacente sans mur** survolée, `onPointerUp`/`onPointerLeave` termine. La logique reste **`nextPath` réutilisée par case entrée** (extension, recul si retour sur l'avant-dernière, troncature si case déjà visitée). Le **clic simple reste un fallback** (étend d'une case) pour souris sans drag et tests. Support tactile via Pointer Events (`touch-action: none` sur la grille). _Alt écartée : drag HTML5 (pas adapté aux grilles), handlers mouse+touch séparés (redondant)._
- **UX-D-2 — Tango : boutons G/D dédiés.** Clic **gauche = soleil**, clic **droit = lune**. Re-cliquer du **même** bouton sur une case déjà dans cet état la **vide** (toggle) ; cliquer de l'autre bouton **remplace** le symbole. `onContextMenu` est **neutralisé sur le plateau uniquement** (`preventDefault`). Accessibilité clavier conservée : **Espace/Entrée cycle** vide→soleil→lune→vide (l'ancien `nextSymbol` sert au clavier). Indice de manipulation ajouté au tutoriel/légende. _Alt écartée : long-press pour la lune (ambigu en desktop)._
- **UX-D-3 — Sudoku : sélection de case + saisie.** Un **clic sélectionne** une case (non imposée) et la met en surbrillance ; ensuite :
  - **clavier** : touches `1`…`size` posent le chiffre, `0`/`Backspace`/`Delete` effacent, **flèches** déplacent la sélection (a11y) ;
  - **souris/tactile** : un **pavé de chiffres** (1…size + gomme) sous la grille pose la valeur dans la case sélectionnée.
  Le **cycle au clic est remplacé** par ce modèle (plus l'ancien comportement de cyclage). Une case imposée n'est pas sélectionnable. _Alt écartée : garder le cycle en plus (incohérent avec « taper le chiffre »)._

### Couleurs & lisibilité

- **UX-D-4 — Palette de jeu partagée.** Introduire dans `packages/ui` des tokens de **palette catégorielle** (`--game-1`…`--game-9`) **daltonien-safe** (variante Okabe-Ito / palette qualitative), déclinés light/dark, exposés au preset Tailwind (ex. `bg-game-1`). Source unique réutilisée par Queens, Patches, et toute future région colorée. _Alt écartée : couleurs en dur par jeu (non thémable, non cohérent)._
- **UX-D-5 — Queens : régions colorées.** Fond de case **teinté par région** via la palette (UX-D-4), **en plus** des bordures + numéros déjà présents (encodage **redondant**, FND-D-27). Couronne et croix d'exclusion gardent un contraste suffisant sur chaque teinte (teintes pastel + texte sombre/clair selon thème). Région > 9 : cyclage de palette (N≤9 en pratique).
- **UX-D-6 — Lisibilité des autres jeux.** Revue homogène :
  - **Zip** : chemin coloré (accent), case de départ `1` et d'arrivée `k` distinguées, dégradé/opacité léger par étape pour suivre le sens.
  - **Tango** : soleil = teinte chaude (ambre), lune = teinte froide (ardoise) — pas seulement plein/contour ; conserver une forme distincte (a11y).
  - **Patches** : rectangles colorés via la palette partagée (déjà « esthétique » FND-D-8/brainstorm), une couleur par patch.
  - **Nonogram** : cases remplies en accent net, croix « vide » discrète ; indices ligne/colonne lisibles.
  - **Sudoku** : indices imposés vs saisis visuellement distincts ; surbrillance de la case/ligne/colonne/boîte sélectionnée.
- **UX-D-7 — Accessibilité préservée (transverse).** Jamais d'information portée par la **seule couleur** (formes/numéros/bordures redondants, FND-D-27) ; **navigation clavier** sur chaque plateau ; respect `prefers-reduced-motion` ; contrastes AA. `onContextMenu` neutralisé **uniquement** sur le plateau Tango.

## Impact

- **Plateaux partagés entraînement ↔ classé** : les modifs touchent `*Board.tsx` + `cells.ts`, donc les deux surfaces (`*BoardPage` et `ranked.tsx`). Les configs classées passent le même plateau → vérifier que les nouveaux handlers (pointer/boutons/sélection) restent compatibles avec le shell `RankedPlay`.
- **`packages/ui`** : ajout de tokens palette (tokens.css + preset + index) → impacte le garde-fou « sobre/sans néon » (FND-D-2) : choisir des teintes désaturées.
- **Anti-triche inchangé** : interactions purement client ; la soumission/validation serveur (`/play/*`) n'est pas modifiée. Aucune fuite de solution.
- **Tests** : `cells.test.ts` par jeu à étendre (nextPath par drag, toggle G/D Tango, set/erase Sudoku, sélection). Pas de changement moteur (`packages/engine`).
- **i18n** : nouveaux libellés (légende boutons, pavé) → couche i18n (FND-D-15) / libellés FR pour l'instant.

## Questions ouvertes (tranchées par défaut)

- **Q-UX-1 — Drag Zip qui « repasse » sur une case** → tranché : repasser sur l'avant-dernière case recule d'un pas (cohérent avec `nextPath` actuel) ; repasser sur une case plus ancienne tronque le chemin jusqu'à elle.
- **Q-UX-2 — Pavé Sudoku : surligner les chiffres déjà complets ?** → tranché par défaut : v1 sans grisage de chiffre complet (amélioration future), garder simple.

## Phase 4 — Validation du plan (2026-06-19)

Plan [`plan-jeux-interactions.md`](plan-jeux-interactions.md) (agent Opus) confronté point par point aux décisions UX-D-1..7 : **couverture complète, aucune dérive**, anti-triche/`packages/engine` non touchés, garde-fou ESLint respecté. Écarts remontés par l'agent, **tranchés (mode autonome)** :

- **Écart-1 (état sélection Sudoku non prévu par le shell)** → résolu : **wrapper local par-jeu** (`SudokuPlay`/wrapper) portant son `useState(selected)`, **shell `RankedPlay`/`useRankedPlay` non modifié** (`state` = board serveur uniquement). Complète **UX-D-3**.
- **Écart-2 (couleurs Tango hors palette catégorielle)** → résolu : **2 tokens sémantiques dédiés** `--tango-sun` (ambre désaturé) / `--tango-moon` (ardoise), light/dark, distincts de `--game-1..9` (régions). Complète **UX-D-6**.
- **Écart-3 (duplication des handlers page ↔ ranked)** → résolu : **centraliser les fonctions pures dans `cells.ts`** (`applyTangoClick`, `setDigit`, logique drag Zip) appelées des deux surfaces. Transverse.
- **Écart-4 (`nextPath` déjà conforme au drag)** → confirmation : E2 n'ajoute que l'enrobage Pointer Events, logique inchangée.
- **Ambiguïtés d'implémentation** → tranchées : bouton droit Tango via `onContextMenu` (preventDefault) ; drag Zip via `onPointerEnter` par case (testable jsdom) plutôt qu'`elementFromPoint`.

Ordre retenu : **E1 (palette) prérequis** → E2/E3/E4 (interactions, parallélisables) → E5/E6/E7 (couleurs) → E8 (a11y) → E9 (tests). Backlog ouvert (`UX-*`), statut `TODO`.

## Tests (cibles)

- Zip : `nextPath` enchaîné simulant un drag multi-cases ; mur bloque l'extension ; recul/troncature.
- Tango : clic gauche pose soleil/toggle, clic droit pose lune/toggle, remplacement croisé ; clavier cycle.
- Sudoku : sélection d'une case libre, saisie clavier 1..size, effacement, déplacement flèches, pavé pose la valeur, case imposée non sélectionnable.
- Queens/Patches : mapping région→couleur stable et déterministe.
