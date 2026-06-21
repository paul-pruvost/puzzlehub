# Feature — Nonogram / Picross (GAME-Nonogram)

- **Date** : 2026-06-19
- **Statut** : implémenté, validation utilisateur en attente
- **Source** : backlog `GAME-extras` (Nonogram), pattern moteur, FND-D-24 (unicité) / FND-D-16 (offline) / FND-D-20 (anti-fuite).
- **Résumé** : nouveau jeu Nonogram N×N (indices de blocs par ligne/colonne), moteur seedé à unicité garantie + intégration complète (banque, schéma Zod, registre, entraînement + classé).

## Note de procédure (mode autonome)

Décisions tranchées par défaut. Solveur/générateur = la partie sensible → tests rigoureux (déterminisme, unicité, `validate(solve)`, cohérence indices↔solution). Pas d'agent Opus.

## Décisions

- **NONO-D-1 — Format** : grille N×N, tailles `facile 5 / moyen 8 / difficile 10`. `rowClues[r]`/`colClues[c]` = longueurs de blocs pleins consécutifs (liste vide = ligne/colonne vide).
- **NONO-D-2 — Modèle** : `NonogramPuzzle { size, rowClues:number[][], colClues:number[][] }` ; `NonogramBoard = (0|1|null)[][]` (1 = plein, 0 = croix, null = inconnu).
- **NONO-D-3 — Solveur** : énumération des dispositions par ligne (`linePatterns`) + **élagage par faisabilité de préfixe de colonne** (`colFeasible`) pour éviter l'explosion combinatoire. `countSolutions` à cap dur.
- **NONO-D-4 — Génération seedée déterministe** : image aléatoire (densité variée) → indices dérivés → conservée si **solution unique** (`countSolutions cap 2 === 1`), sinon reseed borné (les petites grilles aléatoires sont souvent ambiguës → budget d'essais large, le comptage cap 2 est quasi instantané).
- **NONO-D-5 — Validateur durci** : forme N×N + domaine `{0,1,null}` ; `valid` ssi tous les blocs (lignes+colonnes) correspondent aux indices ; `invalid` si surcharge (plus de pleins que la somme d'un indice) ; sinon `incomplete`.
- **NONO-D-6 — Surfaces** : `nonogramValidate` côté client ; `nonogramEngine` (generate/solve/count) serveur uniquement. Pas de fuite de solution.
- **NONO-D-7 — Intégration** : `GameId += 'nonogram'`, schéma Zod, banque, registre, plateau entraînement + mode classé, samples.

## Impact

- `packages/shared` (`GameId`, `nonogramPuzzleSchema`), `packages/engine` (`nonogram.ts` + exports + tests + proptest + cohérence), `apps/api` (`bank.ts`), `apps/web` (`games/nonogram/*`, registre, samples).
- Aucun changement de contrat serveur `/play/*`.

## Vérif

- 8 tests moteur (déterminisme, taille, unicité, indices↔solution, validate(solve)=valid, incomplete, surcharge invalid, malformé) + proptest + cohérence schéma. typecheck/lint/build verts.

---

# BUG-Nonogram-gen — Génération `difficile` (10×10) non fiable

- **Date** : 2026-06-21
- **Statut** : **implémenté + testé**, validation utilisateur en attente (4 phases bouclées).
- **Source** : backlog `BUG-Nonogram-gen`. Découvert au boot api (`buildBank` plantait).

## Phase 1 — Constat

`generate(seed, 'difficile')` (`packages/engine/src/nonogram.ts:156-176`) lève
`nonogram: aucune grille unique générée` après épuisement de 5000 essais. **Bloque le
démarrage de l'API** : `buildBank` (`apps/api/src/play/bank.ts`) génère 4 puzzles
`nonogram/difficile` au boot et tombe dessus quasi systématiquement.

## Phase 2 — Challenge & évidence

Mesures reproductibles (scripts jetables via `tsx`, moteur appelé tel quel) :

- **Taux d'échec actuel** : `difficile` (10×10) = **112/200 seeds échouent (~56 %)**, ~0,6 s/puzzle (les échecs paient les 5000 essais → bien plus lents). `facile`/`moyen` OK.
- **Cause racine** : la prob. qu'une **image i.i.d. de Bernoulli** 10×10 soit à solution unique est **< 1 % à toutes les densités** :

  | densité | unique | dégénérées (ligne/col vide) |
  |---|---|---|
  | 20 % | 0,3 % | 86,8 % |
  | 28 % | 0,8 % | 51,6 % |
  | 35 % | 0,1 % | 23,5 % |
  | 42 % | 0,1 % | 8,8 % |
  | 50 % | 0,0 % | 2,1 % |
  | 60 % | 0,0 % | 0,3 % |

  → Le rejection sampling d'images aléatoires **ne peut pas** garantir l'unicité dans un budget borné. Ce n'est pas un réglage de densité (NONO-D-4 est l'approche fautive).

## Décisions (tranchées par défaut, mode autonome — révisables par l'utilisateur)

- **NGB-D-1 — Invariants conservés (non négociables)** : génération **seedée déterministe** (`generate(seed,d)` reproductible, FND-D-16), **solution unique garantie** (FND-D-24), **aucune fuite de solution** (split client/serveur, FND-D-20). `validate`/`solve`/`countSolutions` et leurs contrats restent inchangés.
- **NGB-D-2 — Terminaison garantie** : `generate` doit **toujours réussir** pour tout `(seed, difficulty)`. Plus de `throw` probabiliste « aucune grille unique ». Augmenter le budget d'essais est **rejeté** (cause structurelle, pas budgétaire).
- **NGB-D-3 — Remplacer NONO-D-4** : abandonner le rejection sampling i.i.d. au profit d'une génération qui produit *par construction* (ou avec garantie de repli) des grilles à solution unique. Choix concret de l'algorithme délégué au plan Phase 3 (agent Opus), parmi : (a) génération d'images **structurées** (formes contiguës / peu de blocs par ligne) biaisées vers l'unicité + repli garanti ; (b) **réparation d'unicité** : à partir de 2 solutions distinctes renvoyées par le solveur, contraindre la grille jusqu'à unicité ; (c) autre approche prouvée. Contrainte : **minimiser les changements de modèle/contrat** (idéalement aucun changement de `NonogramPuzzle`/`NonogramBoard`/schéma Zod ; si une variante exige des cases pré-révélées, c'est un changement de modèle à signaler explicitement, pas à acter en douce).
- **NGB-D-4 — Performance** : génération hors chemin de requête (banque pré-construite, FND-D-16) mais doit rester raisonnable et **bornée dans le pire cas** (cible indicative : < ~100 ms/puzzle en typique, worst-case borné déterministe). Pas de boucle non bornée.
- **NGB-D-5 — Tests** : ajouter un test qui **génère sur une plage de seeds (≥ 100) aux 3 difficultés sans exception** + déterminisme + `countSolutions === 1` + `validate(solve)=valid`. Étendre le proptest existant.

## Questions ouvertes

- Le choix (a) vs (b) vs (c) et le pseuil exact (densité, nb de blocs, stratégie de repli) → **à trancher par le plan Phase 3** puis validés en Phase 4.

## Impact

- `packages/engine/src/nonogram.ts` (`generate`, possiblement helpers de construction + réutilisation de `search` pour récupérer 2 solutions). Tests `nonogram.test.ts` + proptest.
- **Aucun** changement attendu côté `apps/api` (`bank.ts`), `apps/web`, schéma Zod, ni contrat `/play/*` — sauf si l'algo retenu impose un changement de modèle (à signaler).

## Phase 3 — Plan (agent Opus)

Option **(b) réparation par cases révélées rejetée** : les indices sont une fonction pure de l'image, donc « forcer une case » sans champ `givens` est impossible → ce serait un changement de modèle (interdit en douce). Retenu : **option (a) hybride**, génération en 3 phases déterministes, première qui donne `countSolutions(cap2)===1` gagne, dernière prouvée toujours unique :

- **Phase A — candidats structurés (chemin rapide)** : K≈12 images seedées *structurées* (peu de blocs/ligne, blobs contigus, squelettes) testées à `count===1`. K constant ⇒ O(1).
- **Phase B — réparation déterministe bornée** : récupérer 2 solutions distinctes via `search` (étendu pour renvoyer un 2ᵉ témoin), trouver la 1ʳᵉ case divergente (row-major), **fixer cette case à 1 dans l'image**, re-dériver les indices, répéter. Borné par N² étapes. Best-effort (pas de garantie d'unicité en fin).
- **Phase C — fallback terminal garanti** : image **escalier triangulaire** `image[r][c]=1 ⇔ c≤r` (ou anti-triangulaire), **prouvée à solution unique pour tout N**. Inconditionnelle → remplace le `throw`. Garantit NGB-D-2.

Fonctions : étendre `SearchOut` (`first`+`second`, additif → `solve`/`countSolutions` inchangés) ; ajouter `mixSeed`, `isDegenerate`, `fixDegenerate`, `structuredImage`, `repairToUnique`, `terminalUniqueImage` ; réécrire `generate` (A→B→C, supprimer le `throw` et la boucle 5000). Étapes E1..E9 (cf. plan complet). **Aucun changement de modèle/contrat** confirmé par l'agent.

## Phase 4 — Validation

Plan relu point par point vs NGB-D-1..5 :

| Décision | Couverture | Preuve / note |
|---|---|---|
| NGB-D-1 (invariants, contrats) | ✅ | `SearchOut` étendu de façon **additive** ; `solve`/`countSolutions`/`validate`/split inchangés. Pas de fuite (pas de `givens`). |
| NGB-D-2 (terminaison, plus de throw) | ✅ **vérifié** | Phase C inconditionnelle. **Templates triangulaire ET anti-triangulaire mesurés `countSolutions(cap2)===1` à N=5/8/10.** La garantie ne dépend pas du seed. Phase B best-effort n'est PAS la garantie (correct). |
| NGB-D-3 (remplacer rejection i.i.d., pas de modèle) | ✅ | Option (a) ; (b) explicitement écartée comme infaisable sans champ `givens`. Pas de changement de `NonogramPuzzle`/Board/schéma Zod. |
| NGB-D-4 (perf bornée) | ✅ borné / ⚠️ nuance | Pire cas `(K + N²) × search(cap2)` déterministe, pas de boucle non bornée. **Nuance mesurée** : rendement Phase A faible (few-blocks naïf ~2,6 % unique, 46 % dégénérées) → Phase B sera souvent le chemin courant. Reste < 100 ms (search cap2 ≈ sub-ms, ≤100 itérations). Implémenteur libre de renforcer les générateurs structurés (blobs/squelettes) pour relever le rendement Phase A. |
| NGB-D-5 (tests) | ✅ | Sweep ≥100 seeds × 3 difficultés sans exception + déterminisme/`count===1`/`validate(solve)=valid` (timeout explicite) + proptest difficile. |

**Écarts bloquants** : aucun. **Observation (non bloquante)** : Phase A peu performante seule — à surveiller à l'implémentation (le correctif reste correct et borné quoi qu'il arrive grâce à Phase C). 

**Verdict** : plan validé, **aval donné**, implémenté.

## Réalisation (E1..E9)

- `packages/engine/src/nonogram.ts` : `SearchOut` étendu (`second`, additif → `solve`/`countSolutions` inchangés) ; helpers `mixSeed`/`fixDegenerate`/`structuredImage`(3 variantes)/`repairToUnique`/`terminalUniqueImage` ; `generate` réécrit A→B→C, `throw` et boucle 5000 supprimés.
- `nonogram.test.ts` : sweep **120 seeds × 3 difficultés sans exception** (count===1 + validate(solve)=valid, timeout 60 s), déterminisme + unicité + cohérence indices↔solution étendus à `difficile`. `proptest.test.ts` : ajout `difficile` (numRuns 10).
- **Vérifs** : `pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm test` **180/180** ✅. Boot api confirmé (`puzzlehub api en écoute`, banque générée sans exception).
- **Perf mesurée** (450 générations 0–149 × 3 diff) : 0 exception, déterministe, typique ~6 ms/puzzle ; **6/450 > 50 ms, pic ~525 ms** (recherche sur états intermédiaires fragmentés en Phase B, `difficile`). Borné, déterministe, hors chemin de requête (banque pré-construite) → conforme NGB-D-4 (worst-case borné ; cible <100 ms = typique). Marge d'amélioration possible (renforcer les générateurs structurés de Phase A) si on veut écraser ces pics, non bloquant.

_(reste : ta validation pour passer `BUG-Nonogram-gen` en DONE.)_
