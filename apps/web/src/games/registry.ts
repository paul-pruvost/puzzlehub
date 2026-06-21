import type { ComponentType } from 'react';
import { DIFFICULTIES, type Difficulty, type GameId } from '@puzzlehub/shared';

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  /** Résumé des règles, base du tutoriel (FND-D-27). */
  how: string;
  difficulties: Difficulty[];
  /** Jouable maintenant (moteur prêt) ou à venir. */
  available: boolean;
  /** Index de couleur d'identité (palette daltonien-safe, cf. gameColorVar). */
  accentIndex: number;
  /** Chargeur paresseux du plateau jouable (entraînement, RF-14). */
  loadBoard?: () => Promise<{ default: ComponentType }>;
  /** Chargeur paresseux du plateau classé (mode serveur-autoritatif). */
  loadRanked?: () => Promise<{ default: ComponentType }>;
}

export const GAMES: GameMeta[] = [
  {
    id: 'tango',
    name: 'Tango',
    tagline: 'Soleils & lunes en équilibre',
    how: 'Remplis la grille de soleils et de lunes : jamais 3 identiques à la suite, autant de chaque par ligne et colonne, et respecte les signes = (mêmes) et × (opposés).',
    difficulties: [...DIFFICULTIES],
    available: true,
    accentIndex: 0,
    loadBoard: () => import('./tango/TangoBoardPage'),
    loadRanked: () => import('./tango/ranked'),
  },
  {
    id: 'queens',
    name: 'Queens',
    tagline: 'Une couronne par région',
    how: 'Place une couronne par ligne, par colonne et par région colorée. Deux couronnes ne se touchent jamais, même en diagonale.',
    difficulties: [...DIFFICULTIES],
    available: true,
    accentIndex: 6,
    loadBoard: () => import('./queens/QueensBoardPage'),
    loadRanked: () => import('./queens/ranked'),
  },
  {
    id: 'zip',
    name: 'Zip',
    tagline: 'Relie les nombres d’un seul trait',
    how: 'Trace un chemin qui relie les nombres dans l’ordre croissant et remplit toutes les cases de la grille.',
    difficulties: [...DIFFICULTIES],
    available: true,
    accentIndex: 1,
    loadBoard: () => import('./zip/ZipBoardPage'),
    loadRanked: () => import('./zip/ranked'),
  },
  {
    id: 'patches',
    name: 'Patches',
    tagline: 'Découpe la grille en rectangles',
    how: 'Partage la grille en rectangles sans chevauchement : chaque nombre indique l’aire (le nombre de cases) de son rectangle.',
    difficulties: [...DIFFICULTIES],
    available: true,
    accentIndex: 2,
    loadBoard: () => import('./patches/PatchesBoardPage'),
    loadRanked: () => import('./patches/ranked'),
  },
  {
    id: 'sudoku',
    name: 'Mini-Sudoku',
    tagline: 'Le sudoku 6×6, version express',
    how: 'Remplis la grille 6×6 avec les chiffres 1 à 6 : chaque ligne, chaque colonne et chaque boîte 2×3 les contient tous une seule fois.',
    difficulties: [...DIFFICULTIES],
    available: true,
    accentIndex: 4,
    loadBoard: () => import('./sudoku/SudokuBoardPage'),
    loadRanked: () => import('./sudoku/ranked'),
  },
  {
    id: 'nonogram',
    name: 'Nonogram',
    tagline: 'Dessine l’image cachée',
    how: 'Remplis les cases d’après les indices : chaque nombre est la longueur d’un bloc de cases pleines consécutives sur sa ligne ou sa colonne.',
    difficulties: [...DIFFICULTIES],
    available: true,
    accentIndex: 5,
    loadBoard: () => import('./nonogram/NonogramBoardPage'),
    loadRanked: () => import('./nonogram/ranked'),
  },
];

export function findGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
