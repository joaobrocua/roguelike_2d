import { describe, expect, it } from 'vitest';
import { BIOME_CONFIG, ALL_BIOMES, type BiomeConfig } from '../src/data/mapRules';
import { findLink, generateBiomeMap, validateMap } from '../src/logic/map/generateMap';
import type {
  BiomeId,
  BiomeMap,
  PlacedRoom,
  ExitInfo,
  RoomKind,
  TemplateInfo,
} from '../src/logic/map/types';

// ---- catálogo falso -------------------------------------------------------------------

function ex(...parts: string[]): ExitInfo[] {
  // 'l' 'r' = esquerda/direita; 'u0' 'u1' 'd0' 'd1' = cima/baixo na célula 0/1
  return parts.map((p) => {
    if (p === 'l') return { side: 'left', cell: 0 };
    if (p === 'r') return { side: 'right', cell: 0 };
    return { side: p[0] === 'u' ? 'up' : 'down', cell: Number(p[1]) };
  });
}

function tpl(
  id: string,
  biome: BiomeId | 'any',
  kind: RoomKind,
  cellsW: number,
  parts: string[],
): TemplateInfo {
  return { id, biome, kind, cellsW, exits: ex(...parts) };
}

function buildCatalog(): TemplateInfo[] {
  const out: TemplateInfo[] = [];
  const biomes: (BiomeId | 'any')[] = ['muralhas', 'saloes', 'catacumbas', 'any'];
  for (const b of biomes) {
    const p = (s: string): string => `${b}-${s}`;
    // início: sempre sai pela direita
    out.push(tpl(p('start-r'), b, 'start', 1, ['r']));
    out.push(tpl(p('start-rd'), b, 'start', 1, ['r', 'd0']));
    out.push(tpl(p('start-ru'), b, 'start', 1, ['r', 'u0']));
    out.push(tpl(p('start-w'), b, 'start', 2, ['r', 'u1', 'd0', 'd1']));
    // saída / chefe: entram pela esquerda
    for (const kind of ['exit', 'boss'] as const) {
      out.push(tpl(p(`${kind}-l`), b, kind, 1, ['l']));
      out.push(tpl(p(`${kind}-lu`), b, kind, 1, ['l', 'u0']));
      out.push(tpl(p(`${kind}-ld`), b, kind, 1, ['l', 'd0']));
      out.push(tpl(p(`${kind}-w`), b, kind, 2, ['l', 'u0', 'u1', 'd0', 'd1']));
    }
    // combate e descanso: de passagem, com variações verticais
    for (const kind of ['combat', 'rest'] as const) {
      out.push(tpl(p(`${kind}-lr`), b, kind, 1, ['l', 'r']));
      out.push(tpl(p(`${kind}-lru`), b, kind, 1, ['l', 'r', 'u0']));
      out.push(tpl(p(`${kind}-lrd`), b, kind, 1, ['l', 'r', 'd0']));
      out.push(tpl(p(`${kind}-lrud`), b, kind, 1, ['l', 'r', 'u0', 'd0']));
      out.push(tpl(p(`${kind}-ud`), b, kind, 1, ['u0', 'd0']));
      out.push(tpl(p(`${kind}-lu`), b, kind, 1, ['l', 'u0']));
      out.push(tpl(p(`${kind}-rd`), b, kind, 1, ['r', 'd0']));
      out.push(tpl(p(`${kind}-w-all`), b, kind, 2, ['l', 'r', 'u0', 'u1', 'd0', 'd1']));
      out.push(tpl(p(`${kind}-w-u0d1`), b, kind, 2, ['l', 'r', 'u0', 'd1']));
      out.push(tpl(p(`${kind}-w-lr`), b, kind, 2, ['l', 'r']));
    }
    // mini-chefe: sala de passagem só com portas laterais (arena)
    out.push(tpl(p('miniboss-lr'), b, 'miniboss', 1, ['l', 'r']));
    out.push(tpl(p('miniboss-w-lr'), b, 'miniboss', 2, ['l', 'r']));
    // becos: uma porta só, em lados variados
    for (const kind of ['secret', 'chest'] as const) {
      for (const side of ['l', 'r', 'u0', 'd0']) {
        out.push(tpl(p(`${kind}-${side}`), b, kind, 1, [side]));
      }
      out.push(tpl(p(`${kind}-w-l`), b, kind, 2, ['l']));
    }
  }
  return out;
}

const CATALOG = buildCatalog();

/** Resumo da forma do mapa (posições e tipos), para comparar variedade. */
function shapeOf(map: BiomeMap): string {
  return JSON.stringify(map.rooms.map((r) => [r.kind, r.gx, r.gy, r.cellsW]));
}

// ---- geração ----------------------------------------------------------------------------

describe('generateBiomeMap', () => {
  it('é determinístico: mesma seed, mesmo mapa', () => {
    for (const biome of ALL_BIOMES) {
      for (const seed of [0, 1, 42, 987654321]) {
        const a = generateBiomeMap(seed, biome, CATALOG, BIOME_CONFIG[biome]);
        const b = generateBiomeMap(seed, biome, CATALOG, BIOME_CONFIG[biome]);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    }
  });

  it('300 seeds x todos os biomas x final sim/não: o mapa passa em todas as regras', () => {
    for (const biome of ALL_BIOMES) {
      for (const final of [false, true]) {
        for (let seed = 1; seed <= 300; seed++) {
          const map = generateBiomeMap(seed, biome, CATALOG, BIOME_CONFIG[biome], { final });
          const problems = validateMap(map, CATALOG, BIOME_CONFIG[biome], { final });
          expect(problems, `${biome} seed ${seed} final=${final}`).toEqual([]);
        }
      }
    }
  }, 30000);

  it('confere por fora do validador: contagens, posições e becos', () => {
    for (const biome of ALL_BIOMES) {
      const cfg = BIOME_CONFIG[biome];
      for (let seed = 1; seed <= 60; seed++) {
        const final = seed % 2 === 0;
        const map = generateBiomeMap(seed, biome, CATALOG, cfg, { final });
        const count = (k: RoomKind): number => map.rooms.filter((r) => r.kind === k).length;
        expect(map.rooms.length).toBeGreaterThanOrEqual(cfg.minRooms);
        expect(map.rooms.length).toBeLessThanOrEqual(cfg.maxRooms);
        expect(count('start')).toBe(1);
        expect(count(final ? 'boss' : 'exit')).toBe(1);
        expect(count(final ? 'exit' : 'boss')).toBe(0);
        expect(count('rest')).toBe(cfg.rests);
        expect(count('chest')).toBe(cfg.chests);
        expect(count('secret')).toBe(cfg.secrets);
        expect(at(map.rooms, map.startId).kind).toBe('start');
        expect(at(map.rooms, map.endId).kind).toBe(final ? 'boss' : 'exit');
        expect(map.links.length).toBeGreaterThanOrEqual(map.rooms.length - 1);
        expect(map.links.length).toBeLessThanOrEqual(map.rooms.length - 1 + cfg.extraLinks);
        const minGx = Math.min(...map.rooms.map((r) => r.gx));
        expect(at(map.rooms, map.startId).gx).toBe(minGx);
        const end = at(map.rooms, map.endId);
        expect(end.gx + end.cellsW).toBe(Math.max(...map.rooms.map((r) => r.gx + r.cellsW)));
        for (const r of map.rooms) {
          if (r.kind !== 'secret' && r.kind !== 'chest') continue;
          const degree = map.links.filter((l) => l.from === r.id || l.to === r.id).length;
          expect(degree).toBe(1);
        }
      }
    }
  });

  it('seeds diferentes geram mapas diferentes', () => {
    for (const biome of ALL_BIOMES) {
      const shapes = new Set<string>();
      for (let seed = 1; seed <= 50; seed++) {
        shapes.add(shapeOf(generateBiomeMap(seed, biome, CATALOG, BIOME_CONFIG[biome])));
      }
      expect(shapes.size, biome).toBeGreaterThanOrEqual(25);
    }
  });

  it('usa ligações extras quando o catálogo permite', () => {
    let withExtra = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const map = generateBiomeMap(seed, 'catacumbas', CATALOG, BIOME_CONFIG.catacumbas);
      if (map.links.length > map.rooms.length - 1) withExtra++;
    }
    expect(withExtra).toBeGreaterThan(0);
  });

  it('só usa modelos do bioma (ou "any")', () => {
    const byId = new Map(CATALOG.map((t) => [t.id, t]));
    const map = generateBiomeMap(7, 'saloes', CATALOG, BIOME_CONFIG.saloes);
    for (const r of map.rooms) {
      const t = byId.get(r.templateId);
      expect(t === undefined || t.biome === 'saloes' || t.biome === 'any').toBe(true);
    }
  });

  it('lança Error claro quando o catálogo é impossível', () => {
    expect(() => generateBiomeMap(1, 'muralhas', [], BIOME_CONFIG.muralhas)).toThrow(Error);
    const noChest = CATALOG.filter((t) => t.kind !== 'chest');
    expect(() => generateBiomeMap(1, 'muralhas', noChest, BIOME_CONFIG.muralhas)).toThrow(/chest/);
    // modelos sem nenhuma porta: existem, mas nunca se conectam
    const sealed = CATALOG.map((t) => ({ ...t, exits: [] }));
    expect(() => generateBiomeMap(1, 'muralhas', sealed, BIOME_CONFIG.muralhas)).toThrow(
      /Não foi possível/,
    );
  });

  it('lança Error quando a configuração não comporta as salas obrigatórias', () => {
    const cfg: BiomeConfig = { ...BIOME_CONFIG.muralhas, minRooms: 3, maxRooms: 3 };
    expect(() => generateBiomeMap(1, 'muralhas', CATALOG, cfg)).toThrow(/minRooms/);
  });
});

/** Elemento que sabemos existir (o tsconfig não aceita índice possivelmente undefined). */
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`sem item no índice ${index}`);
  return item;
}

/** Troca campos de uma sala do mapa montado à mão. */
function patchRoom(map: BiomeMap, index: number, patch: Partial<PlacedRoom>): void {
  map.rooms[index] = { ...at(map.rooms, index), ...patch };
}

// ---- validação (mapas montados à mão) ----------------------------------------------------

const SMALL_CONFIG: BiomeConfig = {
  minRooms: 3,
  maxRooms: 4,
  gridCols: 4,
  gridRows: 2,
  chests: 0,
  rests: 0,
  secrets: 0,
  extraLinks: 0,
};

const SMALL_CATALOG: TemplateInfo[] = [
  tpl('S', 'any', 'start', 1, ['r']),
  tpl('C', 'any', 'combat', 1, ['l', 'r']),
  tpl('Cud', 'any', 'combat', 1, ['u0', 'd0']),
  tpl('Cl', 'any', 'combat', 1, ['l']),
  tpl('E', 'any', 'exit', 1, ['l']),
  tpl('B', 'any', 'boss', 1, ['l']),
  tpl('X', 'any', 'secret', 1, ['l', 'r']),
  tpl('Xl', 'any', 'secret', 1, ['l']),
];

function goodMap(): BiomeMap {
  return {
    seed: 1,
    biome: 'muralhas',
    rooms: [
      { id: 0, templateId: 'S', kind: 'start', gx: 0, gy: 0, cellsW: 1 },
      { id: 1, templateId: 'C', kind: 'combat', gx: 1, gy: 0, cellsW: 1 },
      { id: 2, templateId: 'E', kind: 'exit', gx: 2, gy: 0, cellsW: 1 },
    ],
    links: [
      { from: 0, to: 1, fromSide: 'right', fromCell: 0, toCell: 0 },
      { from: 1, to: 2, fromSide: 'right', fromCell: 0, toCell: 0 },
    ],
    startId: 0,
    endId: 2,
  };
}

function check(map: BiomeMap, cfg: BiomeConfig = SMALL_CONFIG): string[] {
  return validateMap(map, SMALL_CATALOG, cfg);
}

describe('validateMap', () => {
  it('aceita um mapa correto montado à mão', () => {
    expect(check(goodMap())).toEqual([]);
  });

  it('detecta sala sobreposta', () => {
    const m = goodMap();
    patchRoom(m, 2, { gx: 1 });
    expect(check(m).some((p) => p.includes('se sobrepõem'))).toBe(true);
  });

  it('detecta sala fora da grade', () => {
    const m = goodMap();
    patchRoom(m, 2, { gx: 4 });
    expect(check(m).some((p) => p.includes('fora da grade'))).toBe(true);
  });

  it('detecta ligação sem porta no modelo', () => {
    const m = goodMap();
    // 'Cud' só tem portas em cima/embaixo: a ligação horizontal fica sem porta
    patchRoom(m, 1, { templateId: 'Cud' });
    expect(check(m).filter((p) => p.includes('não tem a porta')).length).toBe(2);
  });

  it('detecta ligação entre salas que não são vizinhas', () => {
    const m = goodMap();
    patchRoom(m, 2, { gy: 1 });
    expect(check(m).some((p) => p.includes('vizinhas'))).toBe(true);
  });

  it('detecta portas verticais desalinhadas', () => {
    const m = goodMap();
    patchRoom(m, 1, { templateId: 'Cud' });
    m.rooms[2] = { id: 2, templateId: 'Cl', kind: 'combat', gx: 2, gy: 1, cellsW: 1 };
    m.links = [
      { from: 0, to: 1, fromSide: 'right', fromCell: 0, toCell: 0 },
      { from: 1, to: 2, fromSide: 'down', fromCell: 0, toCell: 0 },
    ];
    expect(check(m).some((p) => p.includes('vizinhas'))).toBe(true);
  });

  it('detecta sala desconectada', () => {
    const m = goodMap();
    m.links = [at(m.links, 0)];
    const problems = check(m);
    expect(problems.some((p) => p.includes('desconectado'))).toBe(true);
    expect(problems.some((p) => p.includes('caminho da entrada'))).toBe(true);
  });

  it('detecta contagem de tipos errada', () => {
    const m = goodMap();
    m.rooms.push({ id: 3, templateId: 'S', kind: 'start', gx: 3, gy: 0, cellsW: 1 });
    m.links.push({ from: 2, to: 3, fromSide: 'right', fromCell: 0, toCell: 0 });
    expect(check(m).some((p) => p.includes("tipo 'start'"))).toBe(true);
  });

  it("exige 'boss' no último bioma e 'exit' nos outros", () => {
    expect(
      validateMap(goodMap(), SMALL_CATALOG, SMALL_CONFIG, { final: true }).some((p) =>
        p.includes("'boss'"),
      ),
    ).toBe(true);
  });

  it('detecta secret com grau 2 e o número de secrets', () => {
    const m: BiomeMap = {
      seed: 1,
      biome: 'muralhas',
      rooms: [
        { id: 0, templateId: 'S', kind: 'start', gx: 0, gy: 0, cellsW: 1 },
        { id: 1, templateId: 'X', kind: 'secret', gx: 1, gy: 0, cellsW: 1 },
        { id: 2, templateId: 'C', kind: 'combat', gx: 2, gy: 0, cellsW: 1 },
        { id: 3, templateId: 'E', kind: 'exit', gx: 3, gy: 0, cellsW: 1 },
      ],
      links: [
        { from: 0, to: 1, fromSide: 'right', fromCell: 0, toCell: 0 },
        { from: 1, to: 2, fromSide: 'right', fromCell: 0, toCell: 0 },
        { from: 2, to: 3, fromSide: 'right', fromCell: 0, toCell: 0 },
      ],
      startId: 0,
      endId: 3,
    };
    const cfg: BiomeConfig = { ...SMALL_CONFIG, secrets: 1 };
    expect(check(m, cfg).some((p) => p.includes('beco'))).toBe(true);
    expect(check(m, SMALL_CONFIG).some((p) => p.includes("tipo 'secret'"))).toBe(true);
  });

  it('detecta início fora da coluna mais à esquerda e final fora da mais à direita', () => {
    const m = goodMap();
    patchRoom(m, 0, { gx: 1 });
    patchRoom(m, 1, { gx: 2 });
    patchRoom(m, 2, { gx: 0, gy: 1 });
    m.links = [];
    const problems = check(m);
    expect(problems.some((p) => p.includes('mais à esquerda'))).toBe(true);
    expect(problems.some((p) => p.includes('mais à direita'))).toBe(true);
  });

  it('detecta modelo inexistente ou de tipo errado', () => {
    const m = goodMap();
    patchRoom(m, 1, { templateId: 'nao-existe' });
    patchRoom(m, 2, { templateId: 'B' });
    const problems = check(m);
    expect(problems.some((p) => p.includes('não existe'))).toBe(true);
    expect(problems.some((p) => p.includes('não combina'))).toBe(true);
  });

  it('detecta número de salas fora do intervalo e ligações demais', () => {
    const m = goodMap();
    expect(check(m, { ...SMALL_CONFIG, minRooms: 4 }).some((p) => p.includes('intervalo'))).toBe(
      true,
    );
    m.links.push({ ...at(m.links, 0) });
    expect(check(m).some((p) => p.includes('Ligações demais'))).toBe(true);
    expect(check(m).some((p) => p.includes('lado da sala já usado'))).toBe(true);
  });
});

// ---- findLink ------------------------------------------------------------------------------

describe('findLink', () => {
  const map: BiomeMap = {
    seed: 0,
    biome: 'muralhas',
    rooms: [],
    links: [
      { from: 0, to: 1, fromSide: 'right', fromCell: 0, toCell: 0 },
      { from: 1, to: 2, fromSide: 'down', fromCell: 1, toCell: 0 },
    ],
    startId: 0,
    endId: 2,
  };

  it('acha a ligação a partir da sala de origem', () => {
    expect(findLink(map, 0, 'right')).toEqual(at(map.links, 0));
    expect(findLink(map, 1, 'down')).toEqual(at(map.links, 1));
  });

  it('devolve a ligação invertida vista da sala de destino', () => {
    expect(findLink(map, 1, 'left')).toEqual({
      from: 1,
      to: 0,
      fromSide: 'left',
      fromCell: 0,
      toCell: 0,
    });
    expect(findLink(map, 2, 'up')).toEqual({
      from: 2,
      to: 1,
      fromSide: 'up',
      fromCell: 0,
      toCell: 1,
    });
  });

  it('devolve undefined quando não há ligação naquele lado', () => {
    expect(findLink(map, 0, 'left')).toBeUndefined();
    expect(findLink(map, 0, 'up')).toBeUndefined();
    expect(findLink(map, 2, 'down')).toBeUndefined();
    expect(findLink(map, 9, 'right')).toBeUndefined();
  });

  it('funciona sobre mapas gerados, nos dois sentidos', () => {
    const gen = generateBiomeMap(5, 'catacumbas', CATALOG, BIOME_CONFIG.catacumbas);
    for (const l of gen.links) {
      expect(findLink(gen, l.from, l.fromSide)).toEqual(l);
      const back = findLink(gen, l.to, l.fromSide === 'right' ? 'left' : 'up');
      expect(back?.to).toBe(l.from);
      expect(back?.fromCell).toBe(l.toCell);
      expect(back?.toCell).toBe(l.fromCell);
    }
  });
});
