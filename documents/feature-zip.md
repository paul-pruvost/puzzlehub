# Feature — Moteur Zip (chemin hamiltonien) & spike (lot L6)

- **Date** : 2026-06-19
- **Statut** : en implémentation (mode autonome)
- **Source** : `plan-foundation.md` L1/L6, FND-D-16 (budget déterministe), FND-D-22 (règles Zip), FND-D-23/24.

## Décisions

- **ZIP-D-1 — Règles** (FND-D-22) : chemin **orthogonal** visitant **toutes** les cases exactement une fois (hamiltonien), démarrant sur la case `1`, finissant sur la case `k` (plus grand nombre), passant par les nombres dans l'ordre croissant ; **murs** = arêtes infranchissables. Solution unique.
- **ZIP-D-2 — Budget en nœuds déterministe** (FND-D-16, leçon PAT-F-3) : `solve`/`countSolutions` bornés par un **compteur de nœuds**, jamais le wall-clock → reproductible inter-machines. `countSolutions(puzzle,cap,timeoutMs?)` : `timeoutMs` ignoré au profit du budget nœuds.
- **ZIP-D-3 — Modèle** : `ZipPuzzle{size, numbers:(number|null)[][], walls:string[]}` ; `ZipBoard = Coord[]` (le chemin tracé, ordonné).
- **ZIP-D-4 — Génération** : chemin hamiltonien aléatoire seedé par **backbite** (depuis un serpentin) ; on numérote les extrémités puis on **ajoute des points de passage** (aux positions du chemin) jusqu'à l'**unicité** (countSolutions cap=2, budget nœuds). Convergence garantie (numérotation complète ⇒ chemin forcé). Difficultés 5×5/6×6/7×7.
- **ZIP-D-5 — Validateur durci** (FND-D-24) : forme/domaine (coords entières en grille, ≤ N² cases, distinctes), adjacence orthogonale + murs, ordre des nombres, départ sur 1, complétude + fin sur k ⇒ `valid`.
- **ZIP-D-6 — Surfaces client/serveur** comme les autres jeux.

## Spike — mesures (budget nœuds 400k génération / 6M comptage)

Mesuré 2026-06-19 (8 puzzles/difficulté, déterministe) :

| Taille | Points de passage moyens | Unicité | Coût génération |
|--------|--------------------------|---------|------------------|
| 5×5 (facile) | ~14 / 25 cases | ✅ | ~8 ms/puzzle |
| 6×6 (moyen) | ~25 / 36 | ✅ | ~190 ms/puzzle |
| 7×7 (difficile) | ~35 / 49 | ✅ | ~1.1 s/puzzle |

**Verdict** : faisable et déterministe jusqu'à 7×7. **Limitation connue** : le Zip purement numérique (sans murs) exige **beaucoup** de points de passage pour l'unicité (56–71 % des cases numérotées) → puzzles « reliez les points » plutôt qu'élégants. **Amélioration future (ZIP-D-7)** : introduire des **murs** en génération pour contraindre le chemin avec moins de nombres (plus proche du vrai Zip). La banque de production est **pré-générée offline** (le coût 7×7 est hors chemin requête).

## Intégration
Banque serveur, samples, registre front `available`, plateau jouable (tracé clic/clavier, validation live, tutoriel, lazy-load).
