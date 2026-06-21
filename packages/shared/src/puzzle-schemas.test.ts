import { describe, expect, it } from 'vitest';

import {
  parsePuzzle,
  patchesPuzzleSchema,
  puzzleSchemaFor,
  queensPuzzleSchema,
  tangoPuzzleSchema,
  zipPuzzleSchema,
} from './puzzle-schemas';

const validTango = {
  size: 2,
  given: [
    [0, null],
    [null, 1],
  ],
  constraints: [{ a: { r: 0, c: 0 }, b: { r: 0, c: 1 }, type: '=' }],
};

const validQueens = {
  size: 2,
  regions: [
    [0, 1],
    [1, 0],
  ],
};

const validZip = {
  size: 2,
  numbers: [
    [1, null],
    [null, 2],
  ],
  walls: ['0,0-0,1'],
};

const validPatches = {
  size: 3,
  clues: [
    { r: 0, c: 0, value: 3 },
    { r: 1, c: 1, value: 6 },
  ],
};

describe('puzzle-schemas — formes valides', () => {
  it('accepte un Tango bien formé', () => {
    expect(tangoPuzzleSchema.safeParse(validTango).success).toBe(true);
  });
  it('accepte un Queens bien formé', () => {
    expect(queensPuzzleSchema.safeParse(validQueens).success).toBe(true);
  });
  it('accepte un Zip bien formé', () => {
    expect(zipPuzzleSchema.safeParse(validZip).success).toBe(true);
  });
  it('accepte un Patches bien formé', () => {
    expect(patchesPuzzleSchema.safeParse(validPatches).success).toBe(true);
  });
});

describe('puzzle-schemas — rejets de formes malformées', () => {
  it('Tango : given non carré', () => {
    expect(tangoPuzzleSchema.safeParse({ ...validTango, given: [[0, null]] }).success).toBe(false);
  });
  it('Tango : symbole hors {0,1,null}', () => {
    expect(
      tangoPuzzleSchema.safeParse({
        ...validTango,
        given: [
          [2, null],
          [null, 1],
        ],
      }).success,
    ).toBe(false);
  });
  it('Tango : type de contrainte invalide', () => {
    expect(
      tangoPuzzleSchema.safeParse({
        ...validTango,
        constraints: [{ a: { r: 0, c: 0 }, b: { r: 0, c: 1 }, type: '+' }],
      }).success,
    ).toBe(false);
  });
  it('Queens : id de région hors [0,size)', () => {
    expect(
      queensPuzzleSchema.safeParse({
        size: 2,
        regions: [
          [0, 2],
          [1, 0],
        ],
      }).success,
    ).toBe(false);
  });
  it('Queens : regions non carré', () => {
    expect(queensPuzzleSchema.safeParse({ size: 2, regions: [[0, 1]] }).success).toBe(false);
  });
  it('Zip : numbers de mauvaise taille', () => {
    expect(zipPuzzleSchema.safeParse({ ...validZip, numbers: [[1, null]] }).success).toBe(false);
  });
  it('Patches : indice hors limites', () => {
    expect(
      patchesPuzzleSchema.safeParse({ size: 2, clues: [{ r: 5, c: 0, value: 3 }] }).success,
    ).toBe(false);
  });
  it('size ≤ 0 rejeté', () => {
    expect(tangoPuzzleSchema.safeParse({ ...validTango, size: 0 }).success).toBe(false);
  });
});

describe('parsePuzzle / puzzleSchemaFor', () => {
  it('parsePuzzle retourne le puzzle typé si valide', () => {
    expect(parsePuzzle('tango', validTango)).not.toBeNull();
  });
  it('parsePuzzle retourne null si malformé (durcissement front)', () => {
    expect(parsePuzzle('tango', { size: 2, given: 'nope', constraints: [] })).toBeNull();
    expect(parsePuzzle('queens', null)).toBeNull();
  });
  it('puzzleSchemaFor renvoie le bon schéma par jeu', () => {
    expect(puzzleSchemaFor('zip').safeParse(validZip).success).toBe(true);
    expect(puzzleSchemaFor('zip').safeParse(validTango).success).toBe(false);
  });
});
