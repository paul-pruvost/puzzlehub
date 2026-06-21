/**
 * Point d'entrée SERVEUR du moteur (`@puzzlehub/engine/server`).
 * Contient `generate` / `solve` / `countSolutions` — ne JAMAIS importer côté
 * front (FND-D-16 génération offline, FND-D-20 anti-fuite de solution).
 */
export { tangoEngine } from './tango';
export { queensEngine } from './queens';
export { patchesEngine } from './patches';
export { zipEngine } from './zip';
export { sudokuEngine } from './sudoku';
export { nonogramEngine } from './nonogram';
