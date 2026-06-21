# Feature — Moteur Patches (Shikaku) & timeout (lot L6)

- **Date** : 2026-06-19
- **Statut** : en implémentation (mode autonome)
- **Source** : `plan-foundation.md` L6, FND-D-16 (banque offline + cap/timeout), FND-D-22 (Patches=Shikaku), FND-D-23/24.

## Décisions

- **PAT-D-1 — Timeout moteur** (FND-D-16) : `countSolutions(puzzle, cap, timeoutMs?)` accepte un budget temps. Implémenté pour Patches (jeu combinatoire) ; Tango/Queens restent bornés par le `cap` (rapides) et ignorent le paramètre.
- **PAT-D-2 — Règles Patches/Shikaku** : grille N×N partitionnée en rectangles non chevauchants ; chaque rectangle contient **exactement un indice** = son aire ; toutes les cases couvertes. Solution unique.
- **PAT-D-3 — Modèle** : `PatchesPuzzle{size, clues:{r,c,value}[]}` ; `PatchesBoard = (clueIndex|null)[][]` (chaque case pointe le rectangle/indice auquel elle appartient).
- **PAT-D-4 — Génération** : partition **guillotine** aléatoire seedée → rectangles ; un indice (aire) posé sur une case de chaque rectangle ; **unicité vérifiée** par solveur (`countSolutions` cap=2 + timeout) ; régénération sinon. Difficultés 5×5 / 7×7 / 9×9.
- **PAT-D-5 — Validateur durci** (FND-D-24, anti-triche) : forme n×n + domaine (index ∈ [0, clues) ou null) ; par indice : pas plus de cases que l'aire, bbox ⊆ aire, aucun autre indice dans la bbox. `valid` ssi complet sans violation (la complétude + ces gardes impliquent des rectangles parfaits).
- **PAT-D-6 — Surface client/serveur** : `patchesValidate` (client, jamais la solution) ; `patchesEngine` (serveur, generate/solve/countSolutions).

## Intégration
Banque serveur (`SERVER_GAMES.patches`), samples, registre front `available`, plateau jouable (dessin/assignation de rectangles, validation live, tutoriel, lazy-load), factorisation du shell de plateau si pertinent (ARCH-02).

## Suite
ZIP (chemin hamiltonien, #P-difficile) : **spike de faisabilité chiffré** (mesures temps countSolutions) AVANT de figer le moteur ; bridage de taille si nécessaire.
