import { describe, expect, it } from 'vitest';
import { ENT_SHEET } from '../src/data/entSprites';
import { ENEMY_BODIES } from '../src/data/enemies';
import { FROG_KING_SHEET } from '../src/data/frogKingSprites';
import { BIOME_CONFIG, ALL_BIOMES, RUN_PLAN, type BiomeId } from '../src/data/mapRules';
import {
  BIOME_MINIBOSS,
  MINIBOSS_REWARD,
  MINI_BOSSES,
  type MiniBossId,
} from '../src/data/miniBosses';
import { SOUL_REWARD } from '../src/data/meta';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';
import { exitUnlocked } from '../src/logic/run';
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
    expect(ENT_SHEET.id).toBe(MINI_BOSSES.ent.id);
    expect(FROG_KING_SHEET.id).toBe(MINI_BOSSES.saporei.id);
  });

  it('cada mini-chefe rende almas e o prêmio é razoável', () => {
    for (const id of IDS) expect(SOUL_REWARD[id], id).toBe(MINIBOSS_REWARD.souls);
    expect(MINIBOSS_REWARD.souls).toBeGreaterThan(8); // mais que o inimigo comum mais caro
    expect(MINIBOSS_REWARD.souls).toBeLessThan(40); // menos que o Guardião
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
