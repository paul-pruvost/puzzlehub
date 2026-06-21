# Plan — Interactions par jeu & lisibilité (couleurs)

- **Date** : 2026-06-19
- **Phase** : 3 — Planification (agent Opus)
- **Source de vérité** : [feature-jeux-interactions.md](feature-jeux-interactions.md) (décisions UX-D-1..7)
- **Statut** : plan produit, **validation Phase 4 en attente** (aucune ligne de code avant validation utilisateur).
- **Périmètre** : `apps/web/src/games/*` (Board.tsx + cells.ts + ranked.tsx/rankedConfig.tsx + *BoardPage.tsx), `apps/web/src/play/`, `packages/ui/src/{tokens.css,tailwind-preset.cjs,index.ts}`. **Aucune** modification de `packages/engine` ni de `apps/api` (interactions purement client, anti-triche inchangé — cf. Impact du doc source).

## 0. Cartographie du code réel (vérifiée)

Constats issus de la lecture du code (servent de base et révèlent les écarts, cf. §Écarts) :

- **Surface partagée entraînement ↔ classé** confirmée : chaque jeu a un `*BoardPage.tsx` (entraînement offline, `samplePuzzles.json` + `client.validate`) et un `ranked.tsx`/`rankedConfig.tsx` (mode classé via `RankedPlay`). **Les deux importent le même `*Board.tsx` et le même `cells.ts`.** Toute modif de plateau/cells impacte les deux.
- **Tango** : la logique de toggle (`nextSymbol`) est **dupliquée** dans `rankedConfig.tsx` (`renderTangoBoard`) ET dans `TangoBoardPage.tsx` (`toggle`). Même schéma de duplication pour les autres jeux (la fonction `cells.ts` est appelée des deux côtés).
- **Sudoku** identique : `renderSudokuBoard` (ranked) et `SudokuBoardPage` appellent tous deux `nextDigit`.
- **Zip** : `ZipBoard` n'a qu'un `onCellClick` (button par case). Pas de conteneur captant le pointeur. `nextPath` est déjà exactement la logique drag voulue (extension/recul/troncature/mur).
- **Queens** : `QueensBoard` dessine déjà bordures + numéro de région ; **aucune couleur de fond**. `puzzle.regions[r][c]` (0-based) est l'index de région disponible pour mapper une couleur.
- **Patches** : `PatchesBoard` colore via `inActive ? bg-surface-2 : bg-surface` ; pas de couleur par rectangle (`owner[r][c]` = index dispo).
- **`packages/ui`** : `tokens.css` = neutres + 1 accent indigo ; `tailwind-preset.cjs` mappe les vars → classes ; `index.ts` exporte `theme`+`cn` (pas de tokens supplémentaires à exporter, la palette passe par CSS+preset). **Pas d'API de helper couleur existante.**
- **Garde-fou ESLint** : `no-restricted-imports` interdit `@puzzlehub/engine/server` dans `apps/web/**`. Aucun nouveau code ne doit importer ce module — les boards consomment uniquement types + `client.validate`.
- **Tests** : aucun `cells.test.ts` front n'existe encore (à créer). Vitest config racine ; un fichier se lance via `npx vitest run <path>`.

## Ordre global & dépendances (vue d'ensemble)

```
E1 (palette tokens UI) ──┬──> E5 (Queens régions colorées)
                         ├──> E6 (Patches couleurs)
                         └──> E7 (lisibilité Zip/Tango/Nonogram/Sudoku)
E2 (Zip drag) ───────────────> (indépendant des couleurs)
E3 (Tango G/D) ──────────────> (indépendant des couleurs)
E4 (Sudoku sélection+pavé) ──> (indépendant des couleurs)
E8 (a11y transverse) ────────> dépend de E2..E7 (revue finale)
E9 (tests) ──────────────────> suit chaque E concerné (peut être incrémental)
```

E1 est **prérequis** de E5/E6/E7. E2/E3/E4 sont indépendants entre eux et de E1 (peuvent être parallélisés). E8 et E9 closent.

---

## E1 — Palette de jeu daltonien-safe (UX-D-4)

**Objectif** : introduire une palette catégorielle réutilisable, déclinée light/dark, exposée à Tailwind. Source unique pour Queens/Patches et toute future région.

**Fichiers touchés**
- `packages/ui/src/tokens.css` : ajouter `--game-1`…`--game-9` (+ une variante `*-fg` de texte lisible) dans `[data-theme='light']` et `[data-theme='dark']`.
- `packages/ui/src/tailwind-preset.cjs` : mapper `game-1`…`game-9` (et `game-1-fg`…) dans `colors`.
- (Optionnel) `packages/ui/src/index.ts` + nouveau `packages/ui/src/game-palette.ts` : helper `gameColorVar(index: number): string` retournant `var(--game-N)` avec **cyclage modulo 9** (réutilisé par Queens/Patches pour le style inline). Recommandé pour centraliser le cyclage et éviter la duplication N≤9.

**Nature du changement**
- Palette **Okabe-Ito désaturée** (pastel) pour respecter FND-D-2 (sobre, sans néon) tout en restant daltonien-safe. Teintes claires pastel pour le light (texte sombre par-dessus), teintes plus saturées/sombres pour le dark (texte clair).

Valeurs concrètes proposées (prêtes à coller) :

```css
/* tokens.css — dans [data-theme='light'] / :root */
  --game-1: #fde6d2; /* orange pâle      (Okabe-Ito orange désaturé) */
  --game-2: #d6ecf5; /* bleu ciel pâle   (sky blue) */
  --game-3: #d6efe4; /* vert d'eau pâle  (bluish green) */
  --game-4: #fbf4cf; /* jaune pâle       (yellow) */
  --game-5: #d9def0; /* bleu nuit pâle   (blue) */
  --game-6: #f7ddd0; /* vermillon pâle   (vermillion) */
  --game-7: #f4dcec; /* rose pâle        (reddish purple) */
  --game-8: #e6e8ea; /* gris-bleu neutre */
  --game-9: #e2ecd6; /* olive pâle */
  --game-fg: #18181b; /* texte sur teintes pastel claires (= --color-text light) */

/* tokens.css — dans [data-theme='dark'] */
  --game-1: #6b4a25; /* orange profond */
  --game-2: #1f4a5c; /* bleu ciel profond */
  --game-3: #1e5040; /* vert d'eau profond */
  --game-4: #5e571f; /* jaune/olive profond */
  --game-5: #2c3360; /* bleu nuit */
  --game-6: #6a3422; /* vermillon profond */
  --game-7: #5a2c4c; /* rose/pourpre profond */
  --game-8: #3a3d42; /* gris-bleu */
  --game-9: #3e4a2c; /* olive profond */
  --game-fg: #fafafa; /* texte sur teintes sombres (= --color-text dark) */
```

```js
// tailwind-preset.cjs — dans colors
  'game-1': 'var(--game-1)', 'game-2': 'var(--game-2)', 'game-3': 'var(--game-3)',
  'game-4': 'var(--game-4)', 'game-5': 'var(--game-5)', 'game-6': 'var(--game-6)',
  'game-7': 'var(--game-7)', 'game-8': 'var(--game-8)', 'game-9': 'var(--game-9)',
  'game-fg': 'var(--game-fg)',
```

> Note : un **seul** `--game-fg` par thème suffit car les teintes light sont toutes pastel claires (texte sombre lisible) et les teintes dark toutes sombres (texte clair lisible). Vérifier le contraste AA au cas par cas en E8 ; ajuster une teinte si un couple échoue.

**Tests**
- Pas de test unitaire CSS. Si `game-palette.ts` (helper) est ajouté : test `game-palette.test.ts` (cyclage : `index 0 → --game-1`, `index 9 → --game-1`, `index 12 → --game-4`).

**Points de vigilance**
- FND-D-2 : teintes désaturées obligatoires (pas de néon). Les hex ci-dessus sont volontairement pâles/profonds.
- Ne pas casser les classes existantes : on **ajoute** des entrées `colors`, on n'en retire aucune.
- L'export d'un helper depuis `@puzzlehub/ui` ne doit pas créer de cycle d'import ni toucher au moteur (aucun lien engine).

**Dépendances** : aucune (fondation). Prérequis de E5, E6, E7.

---

## E2 — Zip : tracé au pointeur (drag) (UX-D-1)

**Objectif** : tracer le chemin en maintenant le clic et glissant ; clic simple conservé en fallback ; support tactile.

**Fichiers touchés**
- `apps/web/src/games/zip/ZipBoard.tsx` : passer le conteneur en cible de Pointer Events.
- `apps/web/src/games/zip/cells.ts` : `nextPath` **inchangé** (réutilisé par case entrée). Éventuel helper `cellFromPoint` si on résout la case via `elementFromPoint`/`data-*`.
- Aucun changement de signature côté `ranked.tsx` (`renderZipBoard` continue de fournir `onCellClick` → `nextPath`) **si** on garde l'extension par case. Voir vigilance.

**Nature du changement**
- Sur le `<div>` grille : `onPointerDown` (capture du pointeur via `setPointerCapture`), `onPointerMove`, `onPointerUp`, `onPointerLeave`/`onPointerCancel`.
- État local `isDragging` (useState/useRef dans `ZipBoard`). À chaque `pointermove`, déterminer la case survolée (via `data-r`/`data-c` sur chaque button + `document.elementFromPoint`, ou `getBoundingClientRect`), et **appeler `onCellClick(r,c)` une seule fois par nouvelle case entrée** (mémoriser la dernière case traitée pour éviter les répétitions). `nextPath` gère extension/recul/troncature/mur.
- `onPointerDown` sur une case démarre/continue (équivaut à un clic). `onPointerUp`/leave termine le drag.
- CSS : `touch-action: none` sur la grille (style inline ou classe) pour le tactile.
- **Fallback clic** : conserver `onClick` par button (souris sans drag + tests).

**Tests** (`apps/web/src/games/zip/cells.test.ts`)
- Drag multi-cases : `nextPath` enchaîné sur une séquence adjacente → chemin étendu pas à pas.
- Mur bloque l'extension (séquence où `edgeKey` est dans `walls`).
- Recul (repasse sur l'avant-dernière → `slice(0,-1)`), troncature (repasse sur une case ancienne → `slice(0, existing+1)`).
- Départ : première case doit être le repère `1` (sinon chemin vide).
- (Optionnel, composant) test léger de `ZipBoard` simulant `pointerdown`+`pointermove` si l'environnement jsdom le permet ; sinon se limiter à la logique `cells`.

**Points de vigilance**
- **Compat shell RankedPlay** : `renderBoard` reçoit `setState`/`state` ; la nouvelle gestion pointer reste **interne à `ZipBoard`** et continue d'appeler `onCellClick`. Le contrat `ZipBoardProps` peut rester identique → zéro impact sur `RankedPlay`/`useRankedPlay`.
- **Plateau partagé** : `ZipBoardPage.tsx` utilise aussi `ZipBoard` → le drag profite à l'entraînement gratuitement. Vérifier qu'il passe bien un `onCellClick` (lire `ZipBoardPage` lors de l'implémentation).
- jsdom n'implémente pas `elementFromPoint`/PointerEvent complètement → privilégier la résolution par `data-r/data-c` + un handler attaché au button (`onPointerEnter` par case) plutôt que `elementFromPoint`, plus testable et plus robuste. **Décision d'implémentation recommandée** : `onPointerEnter` sur chaque button (déclenché au survol pendant un drag) + `onPointerDown` sur le button + état `isDragging` au niveau grille. Cela évite `elementFromPoint`.
- Accessibilité : garder les `<button>` focusables ; le drag est un **plus**, le clic/clavier reste opérationnel (E8 ajoutera flèches si besoin).

**Dépendances** : aucune.

---

## E3 — Tango : boutons gauche/droite dédiés (UX-D-2)

**Objectif** : clic gauche = soleil, clic droit = lune, toggle même bouton, remplacement bouton opposé ; clavier conserve le cycle ; `onContextMenu` neutralisé sur le plateau.

**Fichiers touchés**
- `apps/web/src/games/tango/cells.ts` : ajouter une fonction pure `applyTangoClick(cell, button: 'sun' | 'moon'): Cell` (toggle si même état, sinon pose). **Conserver `nextSymbol`** (réservé au clavier Espace/Entrée).
- `apps/web/src/games/tango/TangoBoard.tsx` : remplacer `onClick` par `onPointerDown`/`onClick`+`onContextMenu` distinguant le bouton ; `preventDefault` sur `onContextMenu` (plateau uniquement) ; `onKeyDown` (Espace/Entrée → cycle).
- `apps/web/src/games/tango/rankedConfig.tsx` (`renderTangoBoard`) : remplacer le `toggle` actuel par un `onSet(r,c,button)` qui appelle `applyTangoClick` ; clavier → `nextSymbol`.
- `apps/web/src/games/tango/TangoBoardPage.tsx` : **mêmes** handlers (refléter la même logique) + mettre à jour le tutoriel (« clic gauche = soleil ●, clic droit = lune ○ »).

**Nature du changement**
- Nouveau contrat `TangoBoardProps` : remplacer `onToggle(r,c)` par p.ex. `onSet(r, c, button: 'sun' | 'moon')` et `onKeyboardCycle(r, c)` (ou un seul `onAction` discriminé). Choix recommandé : `onSet(r,c,button)` + `onCycle(r,c)` pour le clavier — explicites.
- Bouton droit capté via `onContextMenu` (preventDefault + traiter comme lune) **et/ou** `onPointerDown` avec `e.button === 2`. Recommandé : `onContextMenu` pour la pose lune (déclenché au clic droit) + `onClick` (button 0) pour le soleil. `onPointerDown` est moins fiable cross-navigateur pour le bouton droit ; `onContextMenu` est le canal standard.
- `applyTangoClick(cell, 'sun')` : si `cell===0` → `null` (toggle), sinon `0`. `applyTangoClick(cell, 'moon')` : si `cell===1` → `null`, sinon `1`.

**Tests** (`apps/web/src/games/tango/cells.test.ts`)
- `applyTangoClick(null,'sun')===0` ; `applyTangoClick(0,'sun')===null` (toggle) ; `applyTangoClick(1,'sun')===0` (remplacement).
- `applyTangoClick(null,'moon')===1` ; `applyTangoClick(1,'moon')===null` ; `applyTangoClick(0,'moon')===1`.
- `nextSymbol` (clavier) inchangé : cycle null→0→1→null (test de non-régression).

**Points de vigilance**
- **Cases imposées** (`isGiven`) restent non modifiables (garder le garde `if (isGiven) return` dans les deux surfaces ; le button est déjà `disabled={fixed}` → le clic droit sur une case disabled ne doit pas non plus poser ; neutraliser `onContextMenu` même sur cases imposées pour éviter le menu natif).
- `onContextMenu` neutralisé **uniquement sur le plateau Tango** (UX-D-7), pas globalement.
- **Duplication** : la logique existe en double (ranked + page). Recommandé d'extraire dans `cells.ts` (`applyTangoClick`) et de l'appeler des deux côtés pour éviter la dérive. (Voir Écart-3.)
- Compat shell : `renderTangoBoard` continue d'utiliser `setState` ; seul le contrat `TangoBoardProps` change → impact contenu dans le couple Board/render, pas dans `RankedPlay`.

**Dépendances** : aucune.

---

## E4 — Sudoku : sélection de case + saisie (UX-D-3)

**Objectif** : un clic sélectionne une case libre (surbrillance) ; saisie clavier (1..size, 0/Backspace/Delete, flèches) ; pavé de chiffres (souris/tactile) ; suppression du cyclage au clic.

**Fichiers touchés**
- `apps/web/src/games/sudoku/cells.ts` : ajouter `setDigit(board, r, c, value): SudokuBoard` (pose/efface immuable) et helpers de déplacement de sélection (`moveSelection(sel, dr, dc, size)`), validation `0<=v<=size`. **Retirer l'usage** de `nextDigit` (peut rester exporté mais non utilisé, ou être supprimé — voir vigilance).
- `apps/web/src/games/sudoku/SudokuBoard.tsx` : ajouter prop `selected: {r,c}|null`, `onSelect(r,c)`, surbrillance (case + ligne/colonne/boîte), `onKeyDown` global (sur le conteneur, `tabIndex`), distinction visuelle imposé vs saisi.
- **Nouveau** composant pavé : `apps/web/src/games/sudoku/NumberPad.tsx` (boutons 1..size + gomme), ou intégré sous le board.
- `apps/web/src/games/sudoku/ranked.tsx` (`renderSudokuBoard`) : gérer l'état de sélection. **Problème** : `RankedPlay` ne fournit que `state`/`setState` du board serveur. La sélection est un état **UI local** non sérialisé. Voir vigilance/Écart-1.
- `apps/web/src/games/sudoku/SudokuBoardPage.tsx` : mêmes interactions + pavé.

**Nature du changement**
- Sélection : état `{r,c}|null`. Clic sur case libre → sélectionne. Case imposée non sélectionnable (`isGiven`).
- Clavier : `keydown` sur conteneur focusable → chiffres posent via `setDigit`, `0/Backspace/Delete` effacent, flèches déplacent la sélection (en sautant éventuellement les cases imposées, ou non — décision : déplacement libre, la pose est refusée sur imposée).
- Pavé : boutons → `setDigit(board, sel.r, sel.c, v)`.
- Surbrillance ligne/colonne/boîte de la case sélectionnée (UX-D-6) via classes (`bg-surface-2`) ; `boxRows/boxCols` déjà dispo dans le puzzle.

**Gestion de l'état de sélection (clé)**
- Option A (recommandée) : encapsuler la sélection dans un **composant wrapper** `SudokuPlay`/`SudokuInteractive` qui possède son propre `useState(selected)` et reçoit `(board, onChange)` en props. Ce wrapper est utilisé par `renderSudokuBoard` (passant `state`/`setState`) ET par `SudokuBoardPage`. Évite de polluer `useRankedPlay`/`RankedPlay` avec un état non sérialisé. **Aucune modif du shell.**
- Option B (écartée) : étendre `useRankedPlay` pour porter un état UI générique → surdimensionné, casse l'abstraction « state = board serveur ».

**Tests** (`apps/web/src/games/sudoku/cells.test.ts`)
- `setDigit` pose une valeur sur case libre ; refuse/no-op sur case imposée (ou laisser le garde au composant — tester le garde côté helper si on l'y met).
- `setDigit(...,0)` / efface → `null`.
- `moveSelection` : flèches bornées aux limites de la grille.
- Bornes : valeur hors `1..size` ignorée.
- (Composant, si testable) sélection d'une case libre met `selected` ; case imposée ne sélectionne pas.

**Points de vigilance**
- **Suppression du cyclage** : `nextDigit` n'est plus le modèle d'interaction. `renderSudokuBoard` et `SudokuBoardPage` doivent être réécrits pour la sélection. Garder `nextDigit` exporté seulement s'il est encore utilisé ailleurs (sinon le supprimer pour éviter le code mort — vérifier les imports).
- **Compat shell** : ne pas toucher `RankedPlay`/`useRankedPlay` (Option A). Le wrapper local gère la sélection ; `setState` reste le seul canal vers le board serveur.
- a11y : conteneur focusable (`tabIndex={0}` + `role="grid"` idéalement), `aria-selected` sur la case, libellé du pavé.
- `toServerBoard` inchangé (`state` = board) → soumission anti-triche identique.

**Dépendances** : aucune (E7 ajoutera/affinera le style imposé-vs-saisi et la surbrillance ; peut être fait dans E4 directement). Recommandé : faire la surbrillance dans E4, garder E7 pour l'harmonisation visuelle finale.

---

## E5 — Queens : régions colorées (UX-D-5)

**Objectif** : fond de case teinté par région (palette E1), **en plus** des bordures + numéro (encodage redondant, FND-D-27).

**Fichiers touchés**
- `apps/web/src/games/queens/QueensBoard.tsx` : appliquer une couleur de fond dérivée de `puzzle.regions[r][c]` via la palette (style inline `backgroundColor: var(--game-N)` ou classe `bg-game-N`).
- (Si helper E1 créé) import de `gameColorVar` depuis `@puzzlehub/ui`.

**Nature du changement**
- Remplacer/compléter `bg-surface hover:bg-surface-2` par la teinte de région. Conserver bordures (frontières région) + numéro + couronne/croix.
- Couronne (`text-text`) et croix (`text-muted`) doivent rester lisibles sur teinte pastel : utiliser `--game-fg` pour le contenu si nécessaire, ou garder `text-text` (foncé en light, clair en dark — cohérent avec teintes pastel claires / sombres). Conflit `bad` (ring-danger) inchangé.
- Cyclage région > 9 via modulo (helper E1) — en pratique N≤9.

**Tests**
- `cells.test.ts` Queens : test du **mapping région→couleur stable et déterministe** (même `regionIndex` → même var ; cyclage modulo 9). Si helper centralisé en E1, ce test peut y vivre ; sinon ajouter une petite fonction pure `regionColor(index)` dans `queens/cells.ts` et la tester.

**Points de vigilance**
- Ne pas perdre le redondant : bordures + numéro **restent** (FND-D-27). La couleur est un ajout.
- Contraste AA de la couronne/croix sur chaque teinte → vérifié en E8.
- `hover:bg-surface-2` actuel masquerait la teinte ; remplacer par un hover compatible (ex. légère sur-opacité / ring) pour ne pas écraser la couleur de région.
- Plateau partagé : `QueensBoardPage` utilise le même `QueensBoard` → couleurs en entraînement aussi.

**Dépendances** : **E1** (palette).

---

## E6 — Patches : rectangles colorés (UX-D-6)

**Objectif** : une couleur par patch (rectangle) via la palette partagée.

**Fichiers touchés**
- `apps/web/src/games/patches/PatchesBoard.tsx` : teinter le fond selon `owner[r][c]` (index de rectangle) via la palette ; case libre (`owner===null`) garde `bg-surface`.

**Nature du changement**
- Remplacer `inActive ? bg-surface-2 : bg-surface` par : si `ownerIdx !== null` → teinte `game-(ownerIdx % 9)` ; conserver l'emphase du rectangle actif (ring-accent existant) et la croix de conflit (ring-danger).
- Indices (`clue`) gardent `text-text` lisible sur teinte.

**Tests**
- Mapping `ownerIdx → couleur` déterministe (réutilise le helper E1 / `regionColor`). Test dans `patches/cells.test.ts` ou partagé.

**Points de vigilance**
- L'état `active` (rectangle en cours) doit rester distinguable **par-dessus** la couleur (garder le ring-accent).
- Cases-indices : pas de régression de lisibilité du chiffre.
- Plateau partagé : `PatchesBoardPage`.

**Dépendances** : **E1**.

---

## E7 — Lisibilité homogène des autres jeux (UX-D-6)

**Objectif** : revue cohérente Zip / Tango / Nonogram / Sudoku (volet visuel, distinct des interactions E2/E3/E4).

**Fichiers touchés**
- `apps/web/src/games/zip/ZipBoard.tsx` : chemin coloré (accent), case départ `1` et arrivée `k` distinguées, opacité/dégradé léger par étape pour suivre le sens.
- `apps/web/src/games/tango/TangoBoard.tsx` : soleil = teinte chaude (ambre), lune = teinte froide (ardoise) **en plus** de la forme (pleine vs contour conservée pour a11y).
- `apps/web/src/games/nonogram/NonogramBoard.tsx` : case pleine en accent net (au lieu de `bg-text`), croix « vide » discrète, indices ligne/colonne lisibles (contraste).
- `apps/web/src/games/sudoku/SudokuBoard.tsx` : imposé vs saisi visuellement distincts (déjà `bg-surface-2`/`text-accent` — renforcer), surbrillance case/ligne/colonne/boîte (si pas déjà faite en E4).

**Nature du changement**
- Zip : numéros départ/arrivée mis en évidence (badge/anneau) ; étapes intermédiaires conservent le `•` + gradient d'opacité selon `step`.
- Tango : ajouter une teinte de fond/forme : soleil `#…` ambre, lune ardoise. **Utiliser des tokens existants ou 2 nouveaux tokens dédiés** (`--tango-sun`, `--tango-moon`) si la palette catégorielle ne convient pas — décision : réutiliser `--color-accent` (soleil) serait ambigu ; préférer 2 entrées palette (`game-1` ambre, `game-5` bleu) OU 2 tokens sémantiques dédiés. **Tranché par défaut** : 2 tokens sémantiques `--tango-sun`/`--tango-moon` (light/dark) pour ne pas détourner la palette catégorielle de son rôle « régions ». À ajouter en E1 ou ici (les ajouter ici reste cohérent ; signalé comme micro-écart, cf. Écart-2).
- Nonogram : `bg-text` → `bg-accent` (ou un token dédié rempli) ; croix `text-muted` discrète conservée.

**Tests**
- Pas de logique nouvelle testable unitairement (purement visuel) sauf si un helper de couleur d'étape Zip est extrait (alors test déterministe). Revue visuelle manuelle + a11y en E8.

**Points de vigilance**
- FND-D-2 : rester sobre, pas de néon ; teintes ambre/ardoise désaturées.
- FND-D-27 : forme **toujours** présente (soleil plein / lune contour) ; la couleur est un ajout, jamais l'unique porteur d'info.
- Contraste AA (E8).
- Plateaux partagés (toutes les pages d'entraînement).

**Dépendances** : **E1** (au moins pour les tokens couleur). Peut suivre E2/E3/E4 pour ne pas entrer en conflit d'édition sur les mêmes fichiers Board.

---

## E8 — Accessibilité transverse & contrastes (UX-D-7)

**Objectif** : garantir qu'aucune info n'est portée par la seule couleur, navigation clavier sur chaque plateau, `prefers-reduced-motion`, contrastes AA, `onContextMenu` neutralisé seulement sur Tango.

**Fichiers touchés**
- Tous les `*Board.tsx` (revue) ; `tokens.css` (ajustement de teintes si un contraste échoue) ; éventuellement classes utilitaires.

**Nature du changement / checklist**
- **Redondance** : Queens (bordure+numéro+couleur ✓), Patches (bordure+couleur, ajouter/garder distinction non-couleur — bordures de rectangle déjà présentes ✓), Tango (forme+couleur ✓), Nonogram (croix vs plein ✓), Zip (numéros+•), Sudoku (police imposé/saisi).
- **Clavier** : Zip (flèches optionnelles — au minimum focus button + Entrée = extend), Tango (Espace/Entrée cycle déjà prévu E3), Sudoku (flèches + chiffres E4), Queens/Patches/Nonogram (focus + Entrée/Espace pour cycler — vérifier que `<button>` natif suffit).
- **reduced-motion** : si E2 (drag) ou E7 (gradient/transition) ajoutent des animations, les désactiver sous `@media (prefers-reduced-motion: reduce)`.
- **Contraste AA** : valider chaque couple teinte/texte (numéro de région `text-muted` sur `--game-N` light ; couronne `text-text` ; etc.). Ajuster les hex E1 si échec.
- **onContextMenu** : confirmer qu'il n'est neutralisé **que** sur le plateau Tango.

**Tests**
- Revue manuelle ; éventuels tests d'attributs aria (jsdom) : `aria-selected` Sudoku, `aria-label` enrichis, `aria-invalid` conservés.

**Dépendances** : E2..E7 (revue finale).

---

## E9 — Tests (consolidation)

**Objectif** : couvrir la cible de tests du doc source. À mener **incrémentalement** avec chaque E, puis vérifier la complétude ici.

**Fichiers créés**
- `apps/web/src/games/zip/cells.test.ts` (drag enchaîné, mur, recul, troncature).
- `apps/web/src/games/tango/cells.test.ts` (G/D toggle/remplacement, clavier cycle).
- `apps/web/src/games/sudoku/cells.test.ts` (setDigit, erase, moveSelection, imposée non sélectionnable).
- `apps/web/src/games/queens/cells.test.ts` + `apps/web/src/games/patches/cells.test.ts` (mapping région/owner → couleur déterministe) — ou un test partagé du helper palette si centralisé.
- (Optionnel) `packages/ui/src/game-palette.test.ts` (cyclage modulo 9).

**Commande** : `npx vitest run apps/web/src/games/<jeu>/cells.test.ts` ; suite complète `pnpm test`.

**Points de vigilance**
- Garder les tests **purement sur les fonctions `cells.ts`** quand le rendu pointer/clavier est mal supporté par jsdom (cf. E2).
- Pas de test moteur (aucune modif `packages/engine`).

**Dépendances** : suit les étapes correspondantes.

---

## Risques & points de vigilance globaux

1. **Plateaux partagés entraînement ↔ classé** : chaque modif de `*Board.tsx`/`cells.ts` impacte `*BoardPage.tsx` (offline) ET `ranked.tsx`/`rankedConfig.tsx` (classé). Vérifier les deux surfaces à chaque étape. La **duplication des handlers** (toggle/setDigit copiés entre page et ranked) impose de centraliser la logique dans `cells.ts` pour éviter la dérive (Écart-3).
2. **Compat shell `RankedPlay`/`useRankedPlay`** : le shell ne connaît que `state`(=board serveur)/`setState`/`violations`. Tout **état UI non sérialisé** (sélection Sudoku, isDragging Zip) doit rester **local au Board/wrapper** — ne pas étendre le shell (Option A en E4). Les contrats `*BoardProps` peuvent changer sans toucher `RankedPlay` tant que `renderBoard` adapte.
3. **Garde-fou ESLint anti-import moteur serveur** : aucun nouveau fichier ne doit importer `@puzzlehub/engine/server`. Les boards utilisent seulement types + `client.validate`. Aucune fuite de solution.
4. **FND-D-2 (sobre/sans néon)** : palette désaturée (pastel/profonde) ; teintes Tango ambre/ardoise désaturées. Pas de couleurs vives.
5. **FND-D-27 (a11y/daltonisme)** : couleur **toujours** redondante (forme/numéro/bordure). Contrastes AA validés en E8.
6. **Anti-triche inchangé** : interactions purement client ; `toServerBoard`/soumission `/play/*` non modifiés.
7. **Tactile / Pointer Events** : `touch-action: none` requis sur la grille Zip ; tester sur mobile (revue manuelle).
8. **Code mort** : `nextDigit` (Sudoku) et potentiellement `nextSymbol` (si non réutilisé au clavier) — décider suppression vs conservation pour éviter le warning `no-unused-vars` (configuré en erreur).

---

## Écarts & ambiguïtés détectés (doc ↔ code)

- **Écart-1 — État de sélection Sudoku non prévu par le shell.** Le doc (UX-D-3) introduit une sélection de case, mais `RankedPlay`/`useRankedPlay` ne gèrent qu'un `state` = board serveur. La sélection est un état UI supplémentaire. **Résolution proposée (non décidée dans le doc)** : wrapper local par-jeu (Option A) sans toucher le shell. À valider en Phase 4.
- **Écart-2 — Couleurs Tango (ambre/ardoise) hors palette catégorielle.** UX-D-4 définit `--game-1..9` pour les **régions** ; UX-D-6 demande ambre/ardoise pour soleil/lune (sémantique différente). Proposition : 2 tokens sémantiques dédiés `--tango-sun`/`--tango-moon` plutôt que détourner la palette catégorielle. Choix par défaut, à confirmer.
- **Écart-3 — Duplication des handlers d'interaction.** La logique de clic (toggle/digit) est dupliquée entre `*BoardPage.tsx` et `ranked.tsx`/`rankedConfig.tsx`. Le doc ne tranche pas la factorisation. Proposition : centraliser dans `cells.ts` (fonctions pures `applyTangoClick`/`setDigit`/`applyZipPointer`) appelées des deux côtés. Recommandé mais non imposé par le doc.
- **Écart-4 — `nextPath` déjà conforme au drag.** UX-D-1 décrit exactement le comportement actuel de `nextPath` (extension/recul/troncature/mur). E2 ne change donc **pas** la logique, seulement l'enrobage Pointer Events. Pas un écart bloquant, juste une confirmation.
- **Ambiguïté — Bouton droit Tango via `onContextMenu` vs `pointerdown button===2`.** Le doc dit « clic droit = lune » et « `onContextMenu` neutralisé ». Recommandation : utiliser `onContextMenu` (preventDefault) comme **canal** de pose lune (le plus fiable cross-navigateur) plutôt que `pointerdown`. Décision d'implémentation, cohérente avec le doc.
- **Ambiguïté — granularité du drag Zip en jsdom.** `elementFromPoint` mal supporté en test ; recommandation `onPointerEnter` par case (testable) plutôt que résolution géométrique. Décision d'implémentation.

---

## Suite (post-validation Phase 4)

Après validation explicite, ouvrir dans `./backlog.md` les entrées correspondantes (E1..E9), priorité suggérée : **E1 HOT** (prérequis), E2/E3/E4 **WARM** (interactions cœur du besoin), E5/E6/E7 **WARM**, E8/E9 **WARM**. Statut initial `TODO`. (Claude ne passe jamais en `DONE`.)
