import { describe, expect, it } from 'vitest';
import { ALL_BIOMES } from '../src/data/mapRules';
import { FURNITURE, WINGS, type FurnitureKind } from '../src/data/wings';
import { GLYPH_SET, unsupportedChars } from '../src/logic/glyphs';
import { furnitureSize } from '../src/systems/furnitureArt';

describe('alas e mobília (dados)', () => {
  it('todo bioma tem pelo menos duas alas, com ids únicos no jogo todo', () => {
    const ids = new Set<string>();
    for (const biome of ALL_BIOMES) {
      expect(WINGS[biome].length, biome).toBeGreaterThanOrEqual(2);
      for (const wing of WINGS[biome]) {
        expect(ids.has(wing.id), wing.id).toBe(false);
        ids.add(wing.id);
      }
    }
  });

  it('o nome da ala cabe na tela e só usa letras que a fonte tem', () => {
    for (const biome of ALL_BIOMES) {
      for (const wing of WINGS[biome]) {
        expect(wing.name.length * 8, wing.id).toBeLessThanOrEqual(21 * 8);
        expect(unsupportedChars(wing.name, GLYPH_SET), wing.id).toBe('');
      }
    }
  });

  it('cada ala tem mobília com peso, uma contagem coerente e peças que existem', () => {
    for (const biome of ALL_BIOMES) {
      for (const wing of WINGS[biome]) {
        expect(wing.furniture.length, wing.id).toBeGreaterThanOrEqual(3);
        for (const entry of wing.furniture) {
          expect(entry.weight, `${wing.id}/${entry.kind}`).toBeGreaterThan(0);
          expect(FURNITURE[entry.kind], entry.kind).toBeDefined();
        }
        expect(wing.count.min, wing.id).toBeGreaterThanOrEqual(1);
        expect(wing.count.max, wing.id).toBeGreaterThanOrEqual(wing.count.min);
        // Ninguém repete a mesma peça duas vezes na lista da ala
        const kinds = wing.furniture.map((e) => e.kind);
        expect(new Set(kinds).size, wing.id).toBe(kinds.length);
      }
    }
  });

  it('toda peça é usada por alguma ala e tem tamanho, variantes e luz coerentes', () => {
    const used = new Set<FurnitureKind>();
    for (const biome of ALL_BIOMES) {
      for (const wing of WINGS[biome]) for (const e of wing.furniture) used.add(e.kind);
    }
    for (const [kind, spec] of Object.entries(FURNITURE) as [
      FurnitureKind,
      typeof FURNITURE.barrel,
    ][]) {
      expect(used.has(kind), `${kind} sem ala`).toBe(true);
      expect(spec.widthTiles, kind).toBeGreaterThanOrEqual(1);
      expect(spec.heightTiles, kind).toBeGreaterThanOrEqual(1);
      expect(spec.heightTiles, kind).toBeLessThanOrEqual(4); // cabe nas salas mais baixas
      expect(spec.variants, kind).toBeGreaterThanOrEqual(1);
      if (spec.light) {
        expect(spec.light.radius, kind).toBeGreaterThan(0);
        expect(spec.light.strength, kind).toBeGreaterThan(0);
        expect(spec.light.strength, kind).toBeLessThanOrEqual(1);
      }
      const { width, height } = furnitureSize(kind);
      expect(width, kind).toBe(spec.widthTiles * 16);
      expect(height, kind).toBe(spec.heightTiles * 16);
    }
  });
});
