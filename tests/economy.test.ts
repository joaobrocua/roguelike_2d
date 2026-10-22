import { describe, expect, it } from 'vitest';
import { PLAYER_COMBAT } from '../src/data/combat';
import { BIOME_CONFIG, type BiomeId } from '../src/data/mapRules';
import { ENEMY_BODIES } from '../src/data/enemies';
import { SOUL_REWARD, META_CAPS } from '../src/data/meta';
import { RELIC_DROP } from '../src/data/relics';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';
import { buildCatalog } from '../src/logic/map/catalog';
import { generateBiomeMap } from '../src/logic/map/generateMap';

const CATALOG = buildCatalog(ROOM_TEMPLATES);
const BIOMES = Object.keys(BIOME_CONFIG) as BiomeId[];

describe('economia de cura e relíquias', () => {
  it('a cura do arco e do baú e a chance de relíquia ficam em faixas sensatas', () => {
    expect(PLAYER_COMBAT.exitHealFraction).toBeGreaterThan(0);
    expect(PLAYER_COMBAT.exitHealFraction).toBeLessThan(0.5); // a fogueira continua sendo a cura de verdade
    expect(PLAYER_COMBAT.chestHealFraction).toBeGreaterThan(PLAYER_COMBAT.exitHealFraction);
    expect(RELIC_DROP.chance).toBeGreaterThan(0.05);
    // Mesmo com o bônus máximo da árvore, nem todo inimigo solta relíquia
    expect(RELIC_DROP.chance + META_CAPS.relicChanceBonus).toBeLessThan(0.6);
  });

  it('áreas com mais inimigos têm pelo menos tantas fogueiras quanto as menores', () => {
    const rests = (biome: BiomeId): number => BIOME_CONFIG[biome].rests;
    expect(rests('saloes')).toBeGreaterThanOrEqual(rests('muralhas'));
    expect(rests('catacumbas')).toBeGreaterThanOrEqual(rests('saloes'));
  });

  it('todo inimigo comum e todo chefe rende almas', () => {
    for (const { id } of ENEMY_BODIES) expect(SOUL_REWARD[id], id).toBeGreaterThan(0);
    for (const [id, souls] of Object.entries(SOUL_REWARD)) {
      expect(souls, id).toBeGreaterThan(0);
    }
  });

  it('o gerador entrega exatamente as fogueiras e os baús pedidos em muitas sementes', () => {
    for (const biome of BIOMES) {
      const config = { ...BIOME_CONFIG[biome], secrets: 0 };
      for (let seed = 1; seed <= 60; seed++) {
        const map = generateBiomeMap(seed, biome, CATALOG.infos, config, {
          final: biome === 'catacumbas',
        });
        const count = (kind: string): number => map.rooms.filter((r) => r.kind === kind).length;
        expect(count('rest'), `${biome} #${seed} fogueiras`).toBe(config.rests);
        expect(count('chest'), `${biome} #${seed} baús`).toBe(config.chests);
      }
    }
  });

  it('com o máximo de salas secretas da árvore, o gerador nunca falha (todas as áreas)', () => {
    for (const biome of BIOMES) {
      const config = { ...BIOME_CONFIG[biome], secrets: META_CAPS.secretRooms };
      for (let seed = 1; seed <= 400; seed++) {
        const map = generateBiomeMap(seed, biome, CATALOG.infos, config, {
          final: biome === 'catacumbas',
        });
        expect(map.rooms.length, `${biome} #${seed}`).toBeGreaterThan(0);
      }
    }
  });
});
