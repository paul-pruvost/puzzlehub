# Feature — Refonte UI & expérience de fin de niveau (REDESIGN)

- **Date** : 2026-06-21
- **Statut** : **implémenté + testé** (L0..L6), validation utilisateur en attente.
- **Source** : demande utilisateur — « le design n'est pas beau, sans âme » + « quand on finit un niveau il n'est plus possible d'interagir avec ».
- **Résumé** : refonte visuelle et UX complète du front (identité, typo, couleur, profondeur, motion) **sans toucher** aux moteurs, contrats serveur, anti-triche ni à l'archi registre/shell. Inclut la correction de l'expérience de fin de niveau (plateau « inerte »).

## Phase 1 — Besoin (écoute)

1. Le design actuel est jugé **fade et sans personnalité** : thème neutre + 1 accent indigo, cartes plates, pas de hero, pas d'identité par jeu, pas de motion, pas de moment de victoire. Fonctionnel mais générique.
2. **Fin de niveau** : « on ne peut plus interagir ». Constat code : aucun gel `pointer-events` explicite, mais en **classé**, après `submit` → `status='done'`, le plateau reste affiché et éditable *sans effet utile* (bouton **Valider** grisé, aucune célébration, seul « Rejouer »). Résultat : plateau perçu comme **mort/figé**, sans état de victoire clair ni étape suivante. En **entraînement**, résoudre la grille ne déclenche aucun feedback de victoire.

## Phase 2 — Challenge & décisions

### Contraintes existantes à préserver (RAG)

- Archi : tokens CSS (`packages/ui/src/tokens.css`) → preset Tailwind (`tailwind-preset.cjs`) → classes sémantiques. Refonte surtout **au niveau tokens + composants**.
- A11y/UX déjà décidées : `focus-visible`, `prefers-reduced-motion`, palette de jeu **daltonien-safe** (UX-D-4), gestes par jeu (UX-D-1..7 : Zip drag, Tango clic G/D, Sudoku sélection…), anti-FOUC thème.
- Sécurité/contrats : split client/serveur moteur (jamais de `solve` au front), anti-triche `/play/*`, cosmétiques via `data-palette`/`data-skin` (COSM-D, no pay-to-win), CSP (RF-12 : pas de CDN externe → polices **auto-hébergées**).

### Décisions (tranchées par défaut, mode autonome — révisables par l'utilisateur)

- **RD-D-1 — Périmètre** : refonte **visuelle/UX uniquement**. AUCUN changement de `packages/engine`, `packages/shared`, contrats `apps/api`, anti-triche, registre, ni des gestes par jeu (`games/*/cells.ts`). On touche : `tokens.css`, `tailwind-preset.cjs`, `index.css`, nouveaux composants UI partagés (`packages/ui`), et la couche présentation `apps/web` (Layout, pages, shell `play/`, chrome des `*Board.tsx` — **pas** leur logique d'interaction).
- **RD-D-2 — Langage visuel** :
  - **Identité** : « atelier de logique » — calme, tactile, avec une personnalité géométrique ludique. Wordmark `puzzlehub` retravaillé.
  - **Typo** : police **display** géométrique auto-hébergée pour les titres (défaut : *Space Grotesk*), **Inter** pour le corps, **tabular-nums** pour timer/score.
  - **Couleur** : base neutre conservée + **accent signature** plus riche (dégradé indigo→violet) ; **couleur d'identité par jeu** (issue de la palette daltonien-safe) sur cartes/chrome/état de victoire ; **dark mode** soigné, premier-classe (défaut = préférence système).
  - **Profondeur & texture** : surfaces en couches, rayons plus généreux (cartes ~16px), ombres affinées, **motif de fond discret** (grille/points évoquant les puzzles), halos dégradés derrière le hero.
  - **Motion** : micro-interactions discrètes (hover lift, press, remplissage de case, célébration de victoire) — **toutes** conditionnées par `prefers-reduced-motion`.
- **RD-D-3 — Écrans** :
  - **Accueil** : hero (tagline + motif animé + CTA *Jouer* / *Défi du jour*) + grille de cartes de jeu riches (couleur d'identité, glyphe/aperçu, puces de difficulté, hover).
  - **En-tête** : sticky, raffiné, wordmark + nav + XP en pilule + toggle thème + auth.
  - **Écran de jeu** : surface de jeu focalisée — bandeau (nom du jeu, difficulté, **timer live**), plateau centré sur panneau tactile, barre d'actions, et **état de victoire** clair.
- **RD-D-4 — Fin de niveau (corrige le bug)** : la complétion devient un **état explicite et célébré**, pas un plateau figé ambigu.
  - *Classé* (`status='done'` + `accepted&&valid`) : plateau passe en **lecture seule assumée** (visuellement « verrouillé/résolu »), + **panneau/overlay de résultat** (temps, +XP) et **actions claires** (*Rejouer*, *Changer de difficulté*, *Retour*). En cas d'invalide/refus : message + plateau **reste éditable** pour corriger.
  - *Entraînement* : bannière de **succès** quand `valid`, le plateau **reste rejouable** (pas de verrou). 
- **RD-D-5 — A11y & perf préservées** : contraste AA, `focus-visible`, `prefers-reduced-motion`, aria intacts ; gestes UX-D inchangés ; chargements **lazy** des plateaux conservés ; bundle maîtrisé.
- **RD-D-6 — Cosmétiques** : le mécanisme `data-palette`/`data-skin` (override de tokens) doit **continuer de fonctionner** après refonte (les nouveaux tokens restent surchargeables).
- **RD-D-7 — Dépendances** : pas de grosse dépendance. Polices auto-hébergées (`@fontsource` ou fichiers locaux). Célébration de victoire en **CSS léger** par défaut (lib confetti seulement si justifiée dans le plan).

### Non-objectifs

Pas de nouveau jeu, pas d'extraction i18n (backlog `FRONT-i18n` séparé), pas de changement backend, pas de refonte de l'anti-triche.

### Questions ouvertes (tranchées par défaut, à confirmer)

- Police display exacte (*Space Grotesk* par défaut) ; thème par défaut (système) ; confetti (CSS léger par défaut).
- **Repro du bug classé** : le mode classé exige une **session Google réelle** → non reproductible avec mes creds placeholder en local. Vérification visuelle possible en **entraînement** (`/jeu/:id`, sans auth) ; le verrou de fin de partie classé sera couvert par les tests `useRankedPlay`/`RankedPlay` + revue manuelle, la vérif visuelle classée nécessitera ton auth.

## Impact

- `packages/ui` : `tokens.css` (refonte tokens + nouveaux : radius, ombres, motif, dégradés, polices), `tailwind-preset.cjs` (mapping étendu, fontFamily display), `index.css`/web base, **nouveaux composants** (Button, Card, Panel, Hero, badges…) à factoriser.
- `apps/web` : `app/Layout`, `pages/*` (Home, RankedHome, GamePage, RankedGamePage, Daily, Profile, NotFound), `play/RankedPlay` (état de victoire + verrou), `app/{XpBar,XpToast,AuthControls,ThemeToggle,CosmeticGrid}`, chrome présentationnel des `games/*/*Board.tsx` et `SudokuPlay`.
- Tests : garder les 180 verts ; ajouter le cas « plateau verrouillé en `done` » sur `RankedPlay`.

## Phase 3 — Plan (agent Opus)

Plan en **7 lots** (L0..L6), séquencés pour que l'app reste verte/buildable entre chaque lot :

- **L0 — Fondations** : polices auto-hébergées (`@fontsource-variable/inter` + `space-grotesk`, bundlées, CSP-safe) ; `tokens.css` **additif** (vars `--font-display/-body`, `--color-accent-2`, `--gradient-accent` dérivé des vars accent, échelle d'ombres `--shadow-1..3` avec `--shadow-card` aliasé, échelle de rayons `--radius-*` dont card→16px, `--color-surface-3`, motif) ; `tailwind-preset.cjs` étendu (noms existants conservés, repointés) ; `index.css` `font-body` + `.motif-bg` ; `:focus-visible`/reduced-motion **inchangés**. → aucune régression visuelle, build vert.
- **L1 — Bibliothèque UI** (`packages/ui`, React en **peerDependency**) : `Button`/`Card`/`Panel`/`Badge`/`Hero`/`IconGlyph`(SVG par jeu)/`Timer`(tabular-nums)/`ResultOverlay`. Présentationnels, a11y, sans dépendance lourde.
- **L2 — Layout/Accueil/pages** : `accentVar` (donnée) par jeu dans le registre ; header sticky + wordmark display ; HomePage hero + cartes riches (glyphe, identité couleur, puces) ; Ranked/Daily/Game/Profile/NotFound recomposés sur les composants L1.
- **L3 — Shell de jeu + fin de niveau (corrige le bug)** : dans `RankedPlay.tsx` uniquement — `locked = done && result.accepted && result.valid`, plateau en lecture seule assumée (wrapper `pointer-events-none` + look « résolu », **gestes intacts**), `ResultOverlay` (temps, +XP, *Rejouer*/*Difficulté*/*Retour*), `Timer` live local (jamais envoyé au serveur). Invalide/refusé → reste éditable. Entraînement : bannière succès, reste rejouable.
- **L4 — Chrome des 6 plateaux** : restyle `className`/`style` seulement ; points de vigilance documentés (Zip drag + listeners + `touch-action:none`, Tango `onContextMenu`/`disabled`/`data-piece`, Sudoku sélection dans `SudokuPlay`, régions Queens/Patches via `gameColorVar`, géométrie `STEP` Tango cohérente).
- **L5 — Motion & célébration** : keyframes/transitions Tailwind, célébration **CSS only** (pas de lib confetti), tout `prefers-reduced-motion`-gated, sans layout shift.
- **L6 — Tests & vérif** : 180 tests verts ; **nouveau test `RankedPlay.test.tsx`** (done→verrou + overlay +XP ; `too_fast`→pas de verrou) ; vérif visuelle via `pnpm dev:up` + entraînement `/jeu/:id` ; `pnpm build`.

Parallélisable : L2 ∥ L3 ; les 6 plateaux de L4 ; les composants L1.

## Phase 4 — Validation

| Décision | Couverture | Note |
|---|---|---|
| RD-D-1 (visuel only, gestes/contrats intacts) | ✅ | `cells.ts`/handlers/`useRankedPlay`/contrats non touchés ; verrou par wrapper ; registre = champ donnée. **Nuance** : `packages/ui` gagne React (peer) + ses 1ʳˢ composants JSX — en périmètre. |
| RD-D-2/3 (identité, écrans) | ✅ | polices display, gradient signature, identité par jeu (palette existante), hero, header, écran de jeu + timer + état de victoire. |
| RD-D-4 (fin de niveau / bug) | ✅ | `locked` dérivé, verrou ssi `done && accepted && valid` ; invalide/`too_fast` éditable ; entraînement rejouable. Test dédié L6. |
| RD-D-5 (a11y/perf/lazy) | ✅ | focus-visible/reduced-motion/aria conservés ; lazy boards ; bundle (fonts variables + CSS). Overlay gère le focus sans piéger. |
| RD-D-6 (cosmétiques) | ✅ | `--gradient-accent` dérivé des vars accent → overrides cascadent ; `data-piece` préservé. |
| RD-D-7 (deps/CSP) | ✅ | fontsource bundlé (pas de CDN), célébration CSS, React peer. |

**Écarts bloquants** : aucun. **À confirmer à l'implémentation** (l'agent les a lus mais à re-vérifier) : script anti-FOUC `index.html`, ordre d'import `main.tsx`, `darkMode` de `tailwind.config.cjs`. **Limite connue** : la vérif **visuelle du verrou classé** exige ta session Google (placeholder en local) → couverte par test unitaire + entraînement.

**Verdict** : plan **validé sous réserve de ton aval explicite** (Phase 4 → autorisation avant code). À ton OK : entrée backlog en `[DOING]`, implémentation L0→L6 (j'utiliserai le skill `frontend-design` pour la qualité des composants).

## Choix de goût à confirmer (tranchés par défaut)

Tu es l'autorité finale (règle d'or §4). Avant que je code, dis si tu veux infléchir :
- **Police display** : *Space Grotesk* (géométrique, ludique-raffinée). Alternatives : *Sora*, *Clash Display*, *Outfit*.
- **Accent signature** : dégradé **indigo→violet**. Alternatives : indigo→cyan, ou un duo chaud ambre→rose.
- **Thème par défaut** : préférence système (sinon dark-first).
- **Célébration** : burst CSS léger (sinon plus sobre : halo/sheen).

## Réalisation (L0..L6)

> **Déviations de goût assumées (mode autonome, révisables)** : le skill `frontend-design` déconseille explicitement *Space Grotesk* et les *dégradés violets sur blanc* (clichés « AI »). J'ai donc tranché : **police display = Bricolage Grotesque** (caractérielle, distinctive) + **Inter** corps ; **neutres chauds papier/encre** au lieu du gris froid ; accent **indigo net** + identité couleur par jeu (variété chromatique), dégradé signature **indigo→indigo** réservé au wordmark/hero/CTA (pas de wash violet). Reste révisable si tu préfères les défauts initiaux.

- **L0 — Fondations** : `@fontsource-variable/{bricolage-grotesque,inter}` (bundlés, CSP-safe) importés dans `main.tsx` ; `tokens.css` réécrit (neutres chauds light+dark, `--font-display/-body`, `--color-accent-2`, `--gradient-accent` dérivé des vars accent, `--shadow-1..3` + `--shadow-card` alias, `--radius-sm/md/card(16px)/pill`, `--color-surface-3`, `--color-celebrate`, `--motif-dot`) ; cosmétiques `[data-palette]` surchargent aussi `accent-2` ; `tailwind-preset.cjs` étendu (noms conservés + display/gradient/keyframes) ; `index.css` (font-body, motif de fond, a11y inchangée) ; `tailwind.config.cjs` scanne `packages/ui`.
- **L1 — `packages/ui`** (React en peerDependency, tsconfig JSX) : `Button`(+`buttonClasses`), `Card`, `Panel`, `Badge`, `Hero`, `IconGlyph` (6 glyphes SVG), `Timer` (tabular-nums, jamais envoyé serveur), `ResultOverlay` (overlay victoire + confetti CSS + focus géré).
- **L2** : registre `accentIndex` par jeu ; `Layout` (header sticky + wordmark dégradé + footer) ; `HomePage` (Hero + cartes riches glyphe/identité/puces + reveal échelonné) ; Ranked/Daily/Game/Profile/NotFound recomposés ; `ThemeToggle`/`AuthControls`/`XpBar`/`XpToast` sur composants ; `CosmeticGrid` (fix `bg-accent/10` inopérant).
- **L3 — fin de niveau (bug)** : `RankedPlay` — `won = done && accepted && valid`, plateau verrouillé (wrapper `pointer-events-none` + badge ✓, **gestes intacts**), `ResultOverlay` (temps/+XP, *Rejouer*/*Retour*, fermable), `Timer` live, refus/invalide **reste éditable**.
- **L4** : `TrainingShell` factorisé (tutoriel + onglets difficulté + plateau en `Panel` + **bannière de succès**, reste rejouable) ; les 6 `*BoardPage` y sont branchées. Intérieur des `*Board.tsx` laissé intact (gestes + déjà tokenisés).
- **L5** : keyframes/animations Tailwind (fade-rise, pop-in, confetti, sheen), célébration CSS, tout neutralisé par `prefers-reduced-motion`.
- **L6** : `RankedPlay.test.tsx` (verrou victoire + refus non verrouillé) ; `vitest.config.ts` inclut `.tsx` + JSX automatique. **`pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm test` 182/182 ✅, `pnpm build` ✅** (polices bundlées, CSS 6,2 kB gzip, plateaux en lazy-chunks).

**Limite** : vérif **visuelle du mode classé** non faite (exige ta session Google ; placeholder en local). Vérifiable sans auth en **entraînement** (`/jeu/:id`) via `pnpm dev:up`. _(attend ta validation pour DONE)_

## Complément (2026-06-21) — plateaux + barre d'XP/cosmétiques

- **Design des 6 plateaux** amélioré via **2 sous-agents Opus en background** (consigne permanente de Paul) sur fichiers disjoints — grid-cell (Tango/Sudoku/Nonogram) et région/chemin (Queens/Patches/Zip) : cellules tactiles (élévation/inset, hover), soleil Tango en dégradé radial, structure des boîtes Sudoku renforcée, cases Nonogram en dégradé accent + séparateurs /5, couronne Queens enrichie, puces de clue Patches, chemin Zip en dégradé + waypoints annelés. **Gestes/handlers/`cells.ts`/`data-piece`/drag Zip/aria intacts** (vérifié).
- **Barre d'XP + cosmétiques** (`app/XpBar.tsx`) : pastille d'identité thémée par la **palette cosmétique équipée**, `Niv. X · XP`, jauge dégradé, indicateur de **skin** (✦ si « Glyphes »), `aria-label`/`title` nommant palette+skin. Lien profil.
- **Correctif token** : les agents (et un reliquat de mon Layout) utilisaient des modificateurs d'opacité Tailwind (`bg-accent/15`, `border-border/70`, `bg-surface/85`…) **inopérants** car nos tokens sont des `var()` sans canal alpha (le pire : case Sudoku sélectionnée = accent plein → chiffre `text-accent` invisible). Ajout de tokens **`--color-accent-soft`/`--color-danger-soft`** calculés en **`color-mix`** (suivent l'accent → la palette cosmétique → ET le thème, définis une fois) + mapping preset `accent-soft`/`danger-soft` ; header givré via `color-mix` arbitraire. Tous les `/opacity` sur tokens supprimés (grep à zéro).
- **Vérifs** : `pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm test` **182/182** ✅, `pnpm build` ✅ (tokens/utilitaires présents dans le CSS final).

### 2ᵉ passe esthétique des plateaux (2026-06-21, sous-agent Opus bg)

Polissage approfondi des 6 `*Board.tsx` (cadres « parchemin » en couches, soleil Tango en dégradé sphérique 3 stops, grille Sudoku gravée + dividers de boîtes, regroupement /5 Nonogram en color-mix encre, couronne Queens à halo `celebrate` + sièges, clue Patches en boutons « cousus », chemin Zip biseauté + têtes/​waypoints éclairés), micro-anim `cell-fill` (motion-safe). Gestes/handlers/`data-piece`/drag/`STEP` Tango/a11y intacts ; tokens only (color-mix / `bg-*-soft` / black-white alpha, **zéro `/opacity` sur token**). typecheck/lint/**182 tests**/build verts.
