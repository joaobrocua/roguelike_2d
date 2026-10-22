import { describe, expect, it } from 'vitest';
import { ENEMY_BODIES } from '../src/data/enemies';
import { BIOME_CONFIG, ALL_BIOMES, RUN_PLAN, type BiomeId } from '../src/data/mapRules';
import { BIOME_MINIBOSS, MINI_BOSSES, type MiniBossId } from '../src/data/miniBosses';
import { SOUL_REWARD } from '../src/data/meta';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';
import { exitUnlocked } from '../src/logic/run';
import { enemyDrawers } from '../src/systems/enemySprites';
import { buildCatalog } from '../src/logic/map/catalog';
import { generateBiomeMap } from '../src/logic/map/generateMap';
import { parseRoom } from '../src/logic/roomParser';
import type { BiomeMap, PlacedRoom } from '../src/logic/map/types';

const IDS = Object.keys(MINI_BOSSES) as MiniBossId[];
const CATALOG = buildCatalog(ROOM_TEMPLATES);

describe('mini-chefes: dados', () => {
  it('cada mini-chefe tem corpo, os três golpes e uma IA com a fase 2', () => {
    for (const id of IDS) {
      const def = MINI_BOSSES[id];
      expect(def.id, id).toBe(id);
      expect(def.maxHp, id).toBeGreaterThan(60);
      expect(def.attacks.slam.attack.damage, id).toBeGreaterThan(0);
      expect(def.attacks.lunge.attack.damage, id).toBeGreaterThan(0);
      expect(def.attacks.quake.shape, id).toBe('around');
      expect(def.ai.phase2Threshold, id).toBeGreaterThan(0);
      expect(def.ai.phase2Threshold, id).toBeLessThan(1);
      expect(def.ai.walkSpeed, id).toBeGreaterThan(0);
    }
  });

  it('um mini-chefe é mais fraco que o Guardião e mais forte que um inimigo comum', () => {
    const strongestCommon = Math.max(...ENEMY_BODIES.map((e) => e.maxHp));
    for (const id of IDS) {
      expect(MINI_BOSSES[id].maxHp, id).toBeGreaterThan(strongestCommon);
      expect(MINI_BOSSES[id].maxHp, id).toBeLessThan(260);
    }
  });

  it('os ids são únicos (não colidem com os inimigos comuns) e batem com as folhas de arte', () => {
    const common = new Set(ENEMY_BODIES.map((e) => e.id));
    for (const id of IDS) expect(common.has(id), id).toBe(false);
    const drawn = new Map(enemyDrawers().map((d) => [d.sheet.id, d.body.id]));
    for (const id of IDS) expect(drawn.get(id), `${id} tem folha de arte`).toBe(id);
  });

  it('cada mini-chefe rende mais almas que o inimigo comum mais caro e menos que o Guardião', () => {
    const priciestCommon = Math.max(...ENEMY_BODIES.map((e) => SOUL_REWARD[e.id] ?? 0));
    for (const id of IDS) {
      expect(SOUL_REWARD[id], id).toBeGreaterThan(priciestCommon);
      expect(SOUL_REWARD[id], id).toBeLessThan(SOUL_REWARD.guardiao ?? 0);
    }
  });

  it('os mini-chefes ficam mais duros a cada etapa da jornada', () => {
    // As áreas de uma mesma etapa são alternativas (o jogador escolhe uma)
    const stages: BiomeId[][] = [
      ['floresta', 'pantano'],
      ['cemiterio', 'minas'],
      ['vila'],
      ['muralhas'],
      ['saloes'],
    ];
    const hp = (b: BiomeId): number => MINI_BOSSES[BIOME_MINIBOSS[b] as MiniBossId].maxHp;
    for (let i = 1; i < stages.length; i++) {
      const before = Math.max(...(stages[i - 1] as BiomeId[]).map(hp));
      const now = Math.min(...(stages[i] as BiomeId[]).map(hp));
      expect(now, `etapa ${i}`).toBeGreaterThanOrEqual(before);
    }
  });

  it('só as áreas que configuram um mini-chefe têm um, e ele existe', () => {
    for (const biome of ALL_BIOMES) {
      const configured = (BIOME_CONFIG[biome].miniboss ?? 0) > 0;
      expect(Boolean(BIOME_MINIBOSS[biome]), biome).toBe(configured);
      const id = BIOME_MINIBOSS[biome];
      if (id) expect(MINI_BOSSES[id], biome).toBeDefined();
    }
  });

  it('a última área (o chefe final) nunca tem mini-chefe', () => {
    const last = RUN_PLAN[RUN_PLAN.length - 1]?.options ?? [];
    for (const biome of last) expect(BIOME_MINIBOSS[biome], biome).toBeUndefined();
  });
});

describe('mini-chefes: mapa', () => {
  const withMini = ALL_BIOMES.filter((b) => (BIOME_CONFIG[b].miniboss ?? 0) > 0);

  it('há ao menos uma área com mini-chefe', () => {
    expect(withMini.length).toBeGreaterThan(0);
  });

  for (const biome of withMini) {
    it(`${biome}: a sala do mini-chefe vem logo antes da saída, ligada a ela, em muitas sementes`, () => {
      const config = { ...BIOME_CONFIG[biome], secrets: 0 };
      for (let seed = 1; seed <= 80; seed++) {
        const map = generateBiomeMap(seed, biome, CATALOG.infos, config);
        const minis = map.rooms.filter((r) => r.kind === 'miniboss');
        expect(minis.length, `#${seed}`).toBe(1);
        const mini = minis[0] as PlacedRoom;
        const linked = map.links.some(
          (l) =>
            (l.from === mini.id && l.to === map.endId) ||
            (l.to === mini.id && l.from === map.endId),
        );
        expect(linked, `#${seed} ligada à saída`).toBe(true);
        // O modelo sorteado tem exatamente um marcador 'g'
        const layout = CATALOG.byId.get(mini.templateId)?.layout ?? [];
        expect(parseRoom(layout).markers.filter((m) => m.char === 'g').length, `#${seed}`).toBe(1);
      }
    });
  }
});

describe('mini-chefes: arenas jogáveis', () => {
  const arenas = ROOM_TEMPLATES.filter((t) => t.kind === 'miniboss');

  it('há 3 arenas por área com mini-chefe', () => {
    for (const biome of ALL_BIOMES) {
      if (!BIOME_MINIBOSS[biome]) continue;
      expect(arenas.filter((t) => t.biome === biome).length, biome).toBeGreaterThanOrEqual(3);
    }
  });

  it('o espaço do chefe é livre: nas linhas 11 a 13 não há bloco no interior da sala', () => {
    // O herói salta ~3,5 blocos e os chefes têm até 3 blocos de altura: nada de plataformas baixas
    // ou pilares onde eles andam (plataformas de 2 a 4 blocos prendem o chefe alto ou ficam fora do pulo)
    for (const t of arenas) {
      const cols = t.layout[0]?.length ?? 0;
      for (const row of [11, 12, 13]) {
        for (let c = 1; c < cols - 1; c++) {
          expect(t.layout[row]?.charAt(c), `${t.id} linha ${row} col ${c}`).not.toBe('#');
        }
      }
    }
  });

  it('o chão ao redor do chefe é livre (6 blocos de cada lado do g)', () => {
    for (const t of arenas) {
      const row = t.layout[14] ?? '';
      const g = row.indexOf('g');
      expect(g, t.id).toBeGreaterThan(0);
      for (let c = g - 6; c <= g + 6; c++) {
        expect(row.charAt(c), `${t.id} col ${c}`).not.toBe('#');
      }
    }
  });

  it('na linha 14 só há tocos baixos de 1 bloco (o chefe os salta)', () => {
    for (const t of arenas) {
      const row = t.layout[14] ?? '';
      const above = t.layout[13] ?? '';
      for (let c = 1; c < row.length - 1; c++) {
        if (row.charAt(c) === '#') expect(above.charAt(c), `${t.id} col ${c}`).not.toBe('#');
      }
    }
  });

  it('nenhum bloco flutua: tudo está ligado às paredes, ao teto ou ao chão', () => {
    for (const t of arenas) {
      const H = t.layout.length;
      const W = t.layout[0]?.length ?? 0;
      const solid = (r: number, c: number): boolean => t.layout[r]?.charAt(c) === '#';
      const seen = new Set<string>();
      const stack: [number, number][] = [];
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          if ((r === 0 || r === H - 1 || c === 0 || c === W - 1) && solid(r, c)) {
            seen.add(`${r},${c}`);
            stack.push([r, c]);
          }
        }
      }
      while (stack.length > 0) {
        const [r, c] = stack.pop() as [number, number];
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const rr = r + dr;
          const cc = c + dc;
          if (solid(rr, cc) && !seen.has(`${rr},${cc}`)) {
            seen.add(`${rr},${cc}`);
            stack.push([rr, cc]);
          }
        }
      }
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          if (solid(r, c))
            expect(seen.has(`${r},${c}`), `${t.id} bloco solto ${r},${c}`).toBe(true);
        }
      }
    }
  });
});

describe('exitUnlocked', () => {
  const rooms: PlacedRoom[] = [
    { id: 0, templateId: 'a', kind: 'start', gx: 0, gy: 0, cellsW: 1 },
    { id: 1, templateId: 'b', kind: 'miniboss', gx: 1, gy: 0, cellsW: 1 },
    { id: 2, templateId: 'c', kind: 'exit', gx: 2, gy: 0, cellsW: 1 },
  ];
  const map = { rooms } as unknown as BiomeMap;

  it('selada enquanto a sala do mini-chefe não foi limpa', () => {
    expect(exitUnlocked({ map, cleared: new Set([0]) })).toBe(false);
    expect(exitUnlocked({ map, cleared: new Set() })).toBe(false);
  });

  it('abre quando o mini-chefe cai', () => {
    expect(exitUnlocked({ map, cleared: new Set([1]) })).toBe(true);
  });

  it('sem mini-chefe no mapa a saída está sempre aberta', () => {
    const plain = { rooms: rooms.filter((r) => r.kind !== 'miniboss') } as unknown as BiomeMap;
    expect(exitUnlocked({ map: plain, cleared: new Set() })).toBe(true);
  });
});

/** Só para o tipo: as áreas do plano existem. */
export const _biomes: readonly BiomeId[] = ALL_BIOMES;
