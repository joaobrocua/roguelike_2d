import { describe, expect, it } from 'vitest';
import { BIOME_ORDER } from '../src/data/mapRules';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';
import { buildCatalog } from '../src/logic/map/catalog';
import {
  advanceBiome,
  biomeAt,
  biomeSeed,
  createRun,
  enterRoom,
  isLastBiome,
  propKey,
} from '../src/logic/run';

const catalog = buildCatalog(ROOM_TEMPLATES).infos;

describe('biomeSeed', () => {
  it('é estável e diferente por bioma', () => {
    expect(biomeSeed(123, 0)).toBe(biomeSeed(123, 0));
    const seeds = new Set(BIOME_ORDER.map((_, i) => biomeSeed(123, i)));
    expect(seeds.size).toBe(BIOME_ORDER.length);
  });

  it('muda com a semente da run', () => {
    expect(biomeSeed(1, 0)).not.toBe(biomeSeed(2, 0));
  });
});

describe('createRun', () => {
  it('começa no primeiro bioma, na sala inicial, com ela já visitada', () => {
    const run = createRun(77, catalog);
    expect(run.biomeIndex).toBe(0);
    expect(run.map.biome).toBe(biomeAt(0));
    expect(run.roomId).toBe(run.map.startId);
    expect([...run.visited]).toEqual([run.map.startId]);
    expect(run.cleared.size).toBe(0);
    expect(run.finished).toBe(false);
  });

  it('a mesma semente gera a mesma run', () => {
    expect(createRun(5, catalog).map).toEqual(createRun(5, catalog).map);
  });

  it('sementes diferentes dão mapas diferentes (em geral)', () => {
    const shapes = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const map = createRun(seed, catalog).map;
      shapes.add(JSON.stringify(map.rooms.map((r) => [r.gx, r.gy, r.kind])));
    }
    expect(shapes.size).toBeGreaterThan(10);
  });
});

describe('enterRoom', () => {
  it('muda a sala atual e marca como visitada', () => {
    const run = createRun(9, catalog);
    const other = run.map.rooms.find((r) => r.id !== run.roomId);
    expect(other).toBeDefined();
    enterRoom(run, other?.id ?? 0);
    expect(run.roomId).toBe(other?.id);
    expect(run.visited.has(other?.id ?? -1)).toBe(true);
    expect(run.visited.has(run.map.startId)).toBe(true);
  });
});

describe('advanceBiome', () => {
  it('passa pelos três biomas e então termina a run', () => {
    const run = createRun(31, catalog);
    run.cleared.add(3);
    run.usedProps.add(propKey(1, 2, 3));

    expect(advanceBiome(run, catalog)).toBe(true);
    expect(run.biomeIndex).toBe(1);
    expect(run.map.biome).toBe(biomeAt(1));
    expect(run.roomId).toBe(run.map.startId);
    // Cada bioma começa limpo
    expect(run.cleared.size).toBe(0);
    expect(run.usedProps.size).toBe(0);
    expect([...run.visited]).toEqual([run.map.startId]);

    expect(advanceBiome(run, catalog)).toBe(true);
    expect(isLastBiome(run.biomeIndex)).toBe(true);
    // O último bioma termina no chefe
    expect(run.map.rooms.some((r) => r.kind === 'boss')).toBe(true);

    expect(advanceBiome(run, catalog)).toBe(false);
    expect(run.finished).toBe(true);
  });

  it('só o último bioma tem sala de chefe; os outros têm porta de saída', () => {
    const run = createRun(8, catalog);
    expect(run.map.rooms.some((r) => r.kind === 'exit')).toBe(true);
    expect(run.map.rooms.some((r) => r.kind === 'boss')).toBe(false);
  });
});

describe('propKey', () => {
  it('identifica o objeto pela sala e pela posição', () => {
    expect(propKey(2, 5, 9)).toBe('2:5,9');
    expect(propKey(2, 5, 9)).not.toBe(propKey(3, 5, 9));
  });
});

describe('biomeAt', () => {
  it('rejeita biomas que não existem', () => {
    expect(() => biomeAt(99)).toThrow();
  });
});
