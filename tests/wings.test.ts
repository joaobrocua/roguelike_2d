import { describe, expect, it } from 'vitest';
import { wingForRoom, wingOrder } from '../src/logic/wings';
import { ALL_BIOMES, BIOME_CONFIG } from '../src/data/mapRules';
import { WINGS, type WingDef } from '../src/data/wings';

const SEEDS = Array.from({ length: 30 }, (_, i) => i * 7919 + 1);

describe('wingOrder', () => {
  it('a mesma seed dá a mesma ordem', () => {
    for (const biome of ALL_BIOMES) {
      for (const seed of SEEDS) {
        expect(wingOrder(biome, seed).map((w) => w.id)).toEqual(
          wingOrder(biome, seed).map((w) => w.id),
        );
      }
    }
  });

  it('é uma permutação das alas do bioma (nenhuma some nem repete)', () => {
    for (const biome of ALL_BIOMES) {
      for (const seed of SEEDS) {
        const ids = wingOrder(biome, seed)
          .map((w) => w.id)
          .sort();
        expect(ids).toEqual(WINGS[biome].map((w) => w.id).sort());
      }
    }
  });

  it('seeds diferentes embaralham de formas diferentes (biomas com 3 alas)', () => {
    const orders = new Set(
      SEEDS.map((s) =>
        wingOrder('saloes', s)
          .map((w) => w.id)
          .join(),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('não altera a lista de dados original', () => {
    const before = WINGS.saloes.map((w) => w.id);
    for (const seed of SEEDS) wingOrder('saloes', seed);
    expect(WINGS.saloes.map((w) => w.id)).toEqual(before);
  });
});

describe('wingForRoom', () => {
  it('a mesma seed dá a mesma ala para a mesma sala', () => {
    for (const biome of ALL_BIOMES) {
      for (let gx = 0; gx < BIOME_CONFIG[biome].gridCols; gx++) {
        expect(wingForRoom(biome, { gx, cellsW: 1 }, 99).id).toBe(
          wingForRoom(biome, { gx, cellsW: 1 }, 99).id,
        );
      }
    }
  });

  it('a ala devolvida é a da faixa certa da ordem embaralhada', () => {
    for (const biome of ALL_BIOMES) {
      const { gridCols } = BIOME_CONFIG[biome];
      for (const seed of SEEDS) {
        const order = wingOrder(biome, seed);
        const first = wingForRoom(biome, { gx: 0, cellsW: 1 }, seed);
        const last = wingForRoom(biome, { gx: gridCols - 1, cellsW: 1 }, seed);
        expect(first.id).toBe(order[0]?.id);
        expect(last.id).toBe(order[order.length - 1]?.id);
      }
    }
  });

  it('atravessar do primeiro ao último gx passa por todas as alas, sem voltar atrás', () => {
    for (const biome of ALL_BIOMES) {
      const { gridCols } = BIOME_CONFIG[biome];
      for (const seed of SEEDS) {
        const order = wingOrder(biome, seed).map((w) => w.id);
        const walked: string[] = [];
        for (let gx = 0; gx < gridCols; gx++) {
          const id = wingForRoom(biome, { gx, cellsW: 1 }, seed).id;
          if (walked[walked.length - 1] !== id) walked.push(id);
        }
        expect(walked).toEqual(order);
      }
    }
  });

  it('salas vizinhas na mesma faixa ficam na mesma ala', () => {
    // Com 5 colunas e 3 alas, as colunas 0 e 1 (centros 0,5 e 1,5) ficam na primeira faixa.
    const a = wingForRoom('saloes', { gx: 0, cellsW: 1 }, 5);
    const b = wingForRoom('saloes', { gx: 1, cellsW: 1 }, 5);
    expect(a.id).toBe(b.id);
    // Sala larga: o centro (gx + cellsW / 2) decide.
    const wide = wingForRoom('saloes', { gx: 0, cellsW: 2 }, 5);
    expect(wide.id).toBe(wingForRoom('saloes', { gx: 0, cellsW: 1 }, 5).id);
    const wideRight = wingForRoom('saloes', { gx: 3, cellsW: 2 }, 5);
    expect(wideRight.id).toBe(wingForRoom('saloes', { gx: 4, cellsW: 1 }, 5).id);
  });

  it('um bioma com uma ala só devolve sempre ela', () => {
    // Nenhum bioma real tem uma ala só: troca temporariamente os dados e restaura no fim.
    const original = WINGS.muralhas;
    const only = original[0] as WingDef;
    Object.assign(WINGS, { muralhas: [only] });
    try {
      for (const seed of SEEDS) {
        expect(wingOrder('muralhas', seed)).toEqual([only]);
        for (let gx = -2; gx < 10; gx++) {
          expect(wingForRoom('muralhas', { gx, cellsW: 1 }, seed).id).toBe(only.id);
        }
      }
    } finally {
      Object.assign(WINGS, { muralhas: original });
    }
  });

  it('gx fora da grade não lança e cai na primeira ou na última faixa', () => {
    for (const biome of ALL_BIOMES) {
      const order = wingOrder(biome, 7);
      expect(() => wingForRoom(biome, { gx: -50, cellsW: 1 }, 7)).not.toThrow();
      expect(() => wingForRoom(biome, { gx: 500, cellsW: 2 }, 7)).not.toThrow();
      expect(() => wingForRoom(biome, { gx: Number.NaN, cellsW: 1 }, 7)).not.toThrow();
      expect(wingForRoom(biome, { gx: -50, cellsW: 1 }, 7).id).toBe(order[0]?.id);
      expect(wingForRoom(biome, { gx: 500, cellsW: 2 }, 7).id).toBe(order[order.length - 1]?.id);
    }
  });
});
