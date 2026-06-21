import { DIFFICULTIES, type Difficulty } from '@puzzlehub/shared';

/** Parse une difficulté issue de l'URL (`?d=`), repli sur `facile` si invalide. */
export function parseDifficulty(value: string | null | undefined): Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value ?? '') ? (value as Difficulty) : 'facile';
}
