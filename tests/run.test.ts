import { describe, expect, it } from 'vitest';
import {
  ALL_BIOMES,
  EARTH_BIOMES,
  OUTDOOR_BIOMES,
  ROCK_BIOMES,
  RUN_PLAN,
  type RunStage,
} from '../src/data/mapRules';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';
import { BANNER } from '../src/data/ui';
import { buildCatalog } from '../src/logic/map/catalog';
import {
  advanceBiome,
  areaOptions,
  biomeSeed,
  createRun,
  enterRoom,
  enterSanctuaryBetweenBiomes,
  isLastStage,
  pickArea,
  leaveSanctuary,
  propKey,
  startInSanctuary,
} from '../src/logic/run';

const catalog = buildCatalog(ROOM_TEMPLATES).infos;

describe('biomeSeed', () => {
  it('é estável e diferente por bioma', () => {
    expect(biomeSeed(123, 0)).toBe(biomeSeed(123, 0));
    const seeds = new Set(ALL_BIOMES.map((_, i) => biomeSeed(123, i)));
    expect(seeds.size).toBe(ALL_BIOMES.length);
  });

  it('muda com a semente da run', () => {
    expect(biomeSeed(1, 0)).not.toBe(biomeSeed(2, 0));
  });
});

describe('createRun', () => {
  it('começa no primeiro bioma, na sala inicial, com ela já visitada', () => {
    const run = createRun(77, catalog);
    expect(run.stage).toBe(0);
    expect(run.route).toEqual([run.map.biome]);
    expect(run.map.biome).toBe(RUN_PLAN[0]?.options[0]);
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
  it('passa por todas as etapas do plano e então termina a run', () => {
    const run = createRun(31, catalog);
    run.cleared.add(3);
    run.usedProps.add(propKey(1, 2, 3));

    expect(advanceBiome(run, catalog)).toBe(true);
    expect(run.stage).toBe(1);
    expect(run.map.biome).toBe(RUN_PLAN[1]?.options[0]);
    expect(run.route).toHaveLength(2);
    expect(run.roomId).toBe(run.map.startId);
    // Cada bioma começa limpo
    expect(run.cleared.size).toBe(0);
    expect(run.usedProps.size).toBe(0);
    expect([...run.visited]).toEqual([run.map.startId]);

    while (!isLastStage(run.stage)) expect(advanceBiome(run, catalog)).toBe(true);
    expect(run.stage).toBe(RUN_PLAN.length - 1);
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

describe('almas e salas secretas da run', () => {
  it('a run nasce sem almas e, sem upgrades, sem salas secretas', () => {
    const run = createRun(5, catalog);
    expect(run.souls).toBe(0);
    expect(run.secretRooms).toBe(0);
    expect(run.map.rooms.some((r) => r.kind === 'secret')).toBe(false);
  });

  it('com o upgrade, cada bioma ganha a sala secreta, inclusive os seguintes', () => {
    const run = createRun(5, catalog, { secretRooms: 1 });
    expect(run.map.rooms.filter((r) => r.kind === 'secret')).toHaveLength(1);
    advanceBiome(run, catalog);
    expect(run.map.rooms.filter((r) => r.kind === 'secret')).toHaveLength(1);
    advanceBiome(run, catalog);
    expect(run.map.rooms.filter((r) => r.kind === 'secret')).toHaveLength(1);
  });

  it('gera mapas válidos sem salas secretas em muitas sementes', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const run = createRun(seed, catalog);
      advanceBiome(run, catalog);
      advanceBiome(run, catalog);
      expect(run.map.rooms.length).toBeGreaterThan(4);
    }
  });
});

describe('santuário na run', () => {
  it('uma run nova não começa no santuário', () => {
    expect(createRun(1, catalog).sanctuary).toBeNull();
  });

  it('entre biomas o santuário veste o bioma que acabou e a porta leva ao próximo', () => {
    const run = createRun(2, catalog);
    enterSanctuaryBetweenBiomes(run);
    expect(run.sanctuary).toEqual({
      biome: RUN_PLAN[0]?.options[0],
      leadsTo: 'nextBiome',
      options: RUN_PLAN[1]?.options,
    });
    expect(run.stage).toBe(0); // ainda não passou de bioma
    expect(leaveSanctuary(run, catalog)).toBe(true);
    expect(run.sanctuary).toBeNull();
    expect(run.stage).toBe(1);
    expect(run.map.biome).toBe(RUN_PLAN[1]?.options[0]);
    expect(run.roomId).toBe(run.map.startId);
  });

  it('a jornada começa fora do castelo: a primeira área é ao ar livre e o castelo vem depois', () => {
    const outdoors = OUTDOOR_BIOMES;
    const castle = ['muralhas', 'saloes', 'catacumbas'];
    const first = RUN_PLAN[0]?.options ?? [];
    expect(first.length).toBeGreaterThan(0);
    for (const biome of first) expect(outdoors).toContain(biome);
    // Nenhuma área de fora aparece depois que o herói entra no castelo
    const firstCastle = RUN_PLAN.findIndex((stage) =>
      stage.options.some((b) => castle.includes(b)),
    );
    RUN_PLAN.slice(firstCastle).forEach((stage) => {
      for (const biome of stage.options) expect(castle).toContain(biome);
    });
  });

  it('há um algarismo romano de ato para cada etapa da jornada', () => {
    expect(BANNER.acts.length).toBeGreaterThanOrEqual(RUN_PLAN.length);
  });

  it('toda área fora do castelo é de terra ou de rocha (nunca de tijolo por esquecimento)', () => {
    for (const biome of OUTDOOR_BIOMES) {
      const kinds = [EARTH_BIOMES.includes(biome), ROCK_BIOMES.includes(biome)].filter(Boolean);
      expect(kinds.length, biome).toBe(1);
    }
  });

  it('no despertar a porta não muda de bioma', () => {
    const run = createRun(3, catalog);
    startInSanctuary(run, 'catacumbas');
    expect(run.sanctuary).toEqual({
      biome: 'catacumbas',
      leadsTo: 'start',
      options: RUN_PLAN[0]?.options,
    });
    expect(leaveSanctuary(run, catalog)).toBe(true);
    expect(run.sanctuary).toBeNull();
    expect(run.stage).toBe(0);
  });

  it('sair sem estar no santuário não faz nada, e no último bioma não há próximo', () => {
    const run = createRun(4, catalog);
    expect(leaveSanctuary(run, catalog)).toBe(true);
    expect(run.stage).toBe(0);
    while (!isLastStage(run.stage)) advanceBiome(run, catalog);
    enterSanctuaryBetweenBiomes(run);
    expect(leaveSanctuary(run, catalog)).toBe(false);
  });
});

/**
 * Um plano de teste com escolha: duas áreas já na primeira etapa (com o que existe hoje só duas
 * áreas têm sala de saída e só uma tem sala de chefe), a que sobrar na segunda e o chefe no fim.
 */
const CHOICE_PLAN: readonly RunStage[] = [
  { options: ['muralhas', 'saloes'] },
  { options: ['saloes', 'muralhas'] },
  { options: ['catacumbas'] },
];

describe('escolha de área (plano com duas opções)', () => {
  it('areaOptions tira as áreas que a run já visitou', () => {
    expect(areaOptions(0, [], CHOICE_PLAN)).toEqual(['muralhas', 'saloes']);
    expect(areaOptions(1, ['saloes'], CHOICE_PLAN)).toEqual(['muralhas']);
    // Nada sobrando (plano com repetição): vale a lista inteira
    expect(areaOptions(1, ['saloes', 'muralhas'], CHOICE_PLAN)).toEqual(['saloes', 'muralhas']);
    expect(areaOptions(9, [], CHOICE_PLAN)).toEqual([]);
  });

  it('pickArea usa a área escolhida só se ela foi ofertada', () => {
    expect(pickArea(['saloes', 'catacumbas'], 'catacumbas')).toBe('catacumbas');
    expect(pickArea(['saloes', 'catacumbas'], 'muralhas')).toBe('saloes');
    expect(pickArea(['saloes', 'catacumbas'], null)).toBe('saloes');
    expect(() => pickArea([])).toThrow();
  });

  it('a passagem escolhida define a primeira área e as seguintes sobram para as outras etapas', () => {
    const run = createRun(5, catalog, { secretRooms: 0, firstBiome: 'saloes' }, CHOICE_PLAN);
    expect(run.map.biome).toBe('saloes');
    enterSanctuaryBetweenBiomes(run, CHOICE_PLAN);
    expect(run.sanctuary?.options).toEqual(['muralhas']);
    // Uma passagem que não foi ofertada cai na primeira opção
    expect(leaveSanctuary(run, catalog, 'catacumbas', CHOICE_PLAN)).toBe(true);
    expect(run.stage).toBe(1);
    expect(run.map.biome).toBe('muralhas');
    expect(run.route).toEqual(['saloes', 'muralhas']);
    enterSanctuaryBetweenBiomes(run, CHOICE_PLAN);
    expect(run.sanctuary?.options).toEqual(['catacumbas']);
    expect(leaveSanctuary(run, catalog, 'catacumbas', CHOICE_PLAN)).toBe(true);
    expect(isLastStage(run.stage, CHOICE_PLAN)).toBe(true);
    expect(run.map.rooms.some((r) => r.kind === 'boss')).toBe(true);
  });

  it('a primeira área também é escolhida na passagem do despertar', () => {
    expect(createRun(1, catalog, { secretRooms: 0 }, CHOICE_PLAN).map.biome).toBe('muralhas');
    const run = createRun(1, catalog, { secretRooms: 0 }, CHOICE_PLAN);
    startInSanctuary(run, 'catacumbas', CHOICE_PLAN);
    expect(run.sanctuary?.options).toEqual(['muralhas', 'saloes']);
  });
});

describe('plano da jornada (dados)', () => {
  const kindsOf = (biome: string): Set<string> =>
    new Set(catalog.filter((t) => t.biome === biome).map((t) => t.kind));

  it('cada etapa tem uma ou duas áreas que existem, sem repetir dentro da etapa', () => {
    for (const stage of RUN_PLAN) {
      expect(stage.options.length).toBeGreaterThanOrEqual(1);
      expect(stage.options.length).toBeLessThanOrEqual(2);
      expect(new Set(stage.options).size).toBe(stage.options.length);
      for (const biome of stage.options) expect(ALL_BIOMES).toContain(biome);
    }
  });

  it('a etapa final só oferece áreas com sala de chefe, e as outras, com sala de saída', () => {
    RUN_PLAN.forEach((stage, index) => {
      for (const biome of stage.options) {
        const kinds = kindsOf(biome);
        expect(kinds.has('start'), biome).toBe(true);
        expect(kinds.has(isLastStage(index) ? 'boss' : 'exit'), `${biome} (etapa ${index})`).toBe(
          true,
        );
      }
    });
  });

  it('uma run sempre chega ao fim, qualquer que seja o caminho escolhido', () => {
    // Percorre todos os caminhos possíveis do plano
    const walk = (route: string[], stage: number): void => {
      if (stage >= RUN_PLAN.length) return;
      for (const biome of areaOptions(stage, route as never)) {
        walk([...route, biome], stage + 1);
        if (stage === RUN_PLAN.length - 1) expect([...route, biome]).toHaveLength(RUN_PLAN.length);
      }
    };
    walk([], 0);
    const run = createRun(11, catalog);
    while (!isLastStage(run.stage)) expect(advanceBiome(run, catalog)).toBe(true);
    expect(advanceBiome(run, catalog)).toBe(false);
  });
});
