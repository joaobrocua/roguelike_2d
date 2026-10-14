import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/data/balance';
import { BIOME_CONFIG, ALL_BIOMES, type BiomeId } from '../src/data/mapRules';
import { TILE_SIZE } from '../src/data/rooms';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';
import { generateBiomeMap, validateMap } from '../src/logic/map/generateMap';
import { detectExits, templateInfo, validateTemplate } from '../src/logic/map/roomExits';
import { entryCandidates } from '../src/logic/map/roomRuntime';
import { isSolidTile, parseRoom } from '../src/logic/roomParser';
import { exitsConnected, unreachableMarkers } from '../src/logic/map/reachability';
import type { RoomKind, RoomTemplate } from '../src/logic/map/types';

/** Mínimo de modelos de cada tipo por bioma (variedade suficiente para o gerador). */
const MIN_PER_KIND: Readonly<Record<RoomKind, number>> = {
  start: 2,
  combat: 10,
  rest: 2,
  chest: 2,
  secret: 2,
  exit: 2,
  boss: 1,
};

const FINAL_BIOME: BiomeId = 'catacumbas';
const SEEDS = 120;

function ofBiome(biome: BiomeId): RoomTemplate[] {
  return ROOM_TEMPLATES.filter((t) => t.biome === biome);
}

function exitsOf(t: RoomTemplate): string {
  return detectExits(t.layout)
    .map((e) => `${e.side}${e.side === 'up' || e.side === 'down' ? e.cell : ''}`)
    .sort()
    .join('+');
}

describe('modelos de sala: ids', () => {
  it('ids únicos e começando pelo nome do bioma', () => {
    const ids = ROOM_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of ROOM_TEMPLATES) {
      if (t.biome !== 'any') expect(t.id.startsWith(`${t.biome}-`), t.id).toBe(true);
    }
  });
});

for (const biome of ALL_BIOMES) {
  describe(`modelos de sala: ${biome}`, () => {
    const templates = ofBiome(biome);
    const isFinal = biome === FINAL_BIOME;

    it('todo modelo é válido (tamanho, bordas, portas, marcadores)', () => {
      for (const t of templates) expect(validateTemplate(t), t.id).toEqual([]);
    });

    it('todas as portas de um modelo se alcançam entre si', () => {
      for (const t of templates) {
        const result = exitsConnected(t.layout);
        expect(result.problems, t.id).toEqual([]);
      }
    });

    it('todo inimigo, baú, fogueira e porta está ao alcance de alguma porta', () => {
      for (const t of templates) expect(unreachableMarkers(t.layout), t.id).toEqual([]);
    });

    it('tem variedade mínima de cada tipo de sala', () => {
      for (const [kind, min] of Object.entries(MIN_PER_KIND) as [RoomKind, number][]) {
        // O último bioma termina no chefe; os outros, na porta de saída
        if (kind === 'boss' && !isFinal) continue;
        if (kind === 'exit' && isFinal) continue;
        const count = templates.filter((t) => t.kind === kind).length;
        expect(count, `${biome}/${kind}`).toBeGreaterThanOrEqual(min);
      }
    });

    it('as salas de combate variam de portas e de largura', () => {
      const combat = templates.filter((t) => t.kind === 'combat');
      const horizontal = combat.filter(
        (t) => exitsOf(t).includes('left') && exitsOf(t).includes('right'),
      );
      expect(horizontal.length, 'esquerda+direita').toBeGreaterThanOrEqual(4);
      expect(
        combat.filter((t) => exitsOf(t).includes('up')).length,
        'com porta em cima',
      ).toBeGreaterThanOrEqual(2);
      expect(
        combat.filter((t) => exitsOf(t).includes('down')).length,
        'com porta embaixo',
      ).toBeGreaterThanOrEqual(2);
      expect(
        combat.filter((t) => templateInfo(t).cellsW === 2).length,
        'largas',
      ).toBeGreaterThanOrEqual(2);
    });

    it(`o gerador monta ${SEEDS} mapas válidos com os modelos reais`, () => {
      const catalog = ROOM_TEMPLATES.map(templateInfo);
      const config = BIOME_CONFIG[biome];
      for (let seed = 1; seed <= SEEDS; seed++) {
        const options = { final: isFinal };
        const map = generateBiomeMap(seed, biome, catalog, config, options);
        expect(validateMap(map, catalog, config, options), `seed ${seed}`).toEqual([]);
      }
    });
  });
}

describe('pontos de entrada', () => {
  it('toda porta de todo modelo tem algum ponto de chegada fora de blocos', () => {
    const half = PLAYER.height / TILE_SIZE / 2;
    for (const template of ROOM_TEMPLATES) {
      const room = parseRoom(template.layout);
      for (const exit of detectExits(template.layout)) {
        const candidates = entryCandidates(exit.side, exit.cell, room.cols, half * 2);
        const free = candidates.some(
          (c) =>
            !isSolidTile(room, Math.floor(c.col), Math.floor(c.row - half)) &&
            !isSolidTile(room, Math.floor(c.col), Math.floor(c.row + half - 0.05)),
        );
        expect(free, `${template.id} (${exit.side}, célula ${exit.cell})`).toBe(true);
      }
    }
  });
});
