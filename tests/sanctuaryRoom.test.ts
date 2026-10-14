import { describe, expect, it } from 'vitest';
import { ALL_BIOMES } from '../src/data/mapRules';
import { SANCTUARY_DECOR, SANCTUARY_LAYOUT, SANCTUARY_LOOK } from '../src/data/sanctuaryRoom';
import { CELL } from '../src/data/mapRules';
import { TILE_SIZE } from '../src/data/rooms';
import { reachableFrom, unreachableMarkers } from '../src/logic/map/reachability';
import { isSolidTile, parseRoom } from '../src/logic/roomParser';

const room = parseRoom(SANCTUARY_LAYOUT);

describe('sala do santuário', () => {
  it('tem o tamanho de uma célula e está fechada nas bordas (sem portas laterais)', () => {
    expect(room.cols).toBe(CELL.cols);
    expect(room.rows).toBe(CELL.rows);
    for (let row = 0; row < room.rows; row++) {
      expect(isSolidTile(room, 0, row), `esquerda ${row}`).toBe(true);
      expect(isSolidTile(room, room.cols - 1, row), `direita ${row}`).toBe(true);
    }
    for (let col = 0; col < room.cols; col++) {
      expect(isSolidTile(room, col, 0), `teto ${col}`).toBe(true);
      expect(isSolidTile(room, col, room.rows - 1), `chão ${col}`).toBe(true);
    }
  });

  it('tem um ponto de nascimento, uma porta e uma estátua', () => {
    expect(room.spawn).not.toBeNull();
    expect(room.markers.filter((m) => m.char === 'X')).toHaveLength(1);
    expect(room.markers.filter((m) => m.char === 'S')).toHaveLength(1);
  });

  it('a estátua fica no eixo da sala, sobre o degrau de cima, com espaço livre', () => {
    const statue = room.markers.find((m) => m.char === 'S');
    if (!statue) throw new Error('sem estátua');
    expect(statue.col * TILE_SIZE).toBe((room.cols * TILE_SIZE) / 2);
    // 3 tiles de largura (48 px) e 4 de altura (64 px) livres; degrau embaixo dos 4 tiles do meio
    for (let dc = -2; dc <= 1; dc++) {
      expect(isSolidTile(room, statue.col + dc, statue.row + 1), `degrau ${dc}`).toBe(true);
    }
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = 0; dr < 4; dr++) {
        expect(isSolidTile(room, statue.col + dc, statue.row - dr), `livre ${dc},${dr}`).toBe(
          false,
        );
      }
    }
  });

  it('o herói chega à estátua e à porta andando e pulando', () => {
    expect(unreachableMarkers([...SANCTUARY_LAYOUT])).toEqual([]);
    const spawn = room.spawn;
    const statue = room.markers.find((m) => m.char === 'S');
    const door = room.markers.find((m) => m.char === 'X');
    if (!spawn || !statue || !door) throw new Error('faltam marcadores');
    const reached = reachableFrom([...SANCTUARY_LAYOUT], spawn);
    expect(reached.has(`${statue.col},${statue.row}`)).toBe(true);
    expect(reached.has(`${door.col},${door.row}`)).toBe(true);
  });

  it('o cenário é simétrico em relação ao eixo da sala', () => {
    const axis = (room.cols * TILE_SIZE) / 2;
    const pairs = [SANCTUARY_DECOR.pillars, SANCTUARY_DECOR.braziers, SANCTUARY_DECOR.banners];
    for (const [left, right] of pairs) {
      expect(axis - (left ?? 0), 'espelho').toBe((right ?? 0) - axis);
    }
    expect(SANCTUARY_DECOR.colossus.x).toBe(axis);
  });

  it('o desenho e as velas também são espelhados, e não há inimigos nem objetos de sala', () => {
    for (const marker of room.markers) {
      expect(['T', 'S', 'X', 'Y'], marker.char).toContain(marker.char);
      if (marker.char === 'S') continue;
      const twin = room.markers.find(
        (m) => m.row === marker.row && m.col === room.cols - 1 - marker.col,
      );
      if (marker.char === 'T') expect(twin?.char, `tocha ${marker.col}`).toBe('T');
      // Os dois portais são espelhos um do outro
      if (marker.char === 'X') expect(twin?.char, 'portal espelhado').toBe('Y');
      if (marker.char === 'Y') expect(twin?.char, 'portal espelhado').toBe('X');
    }
    // As velas formam pares simétricos em torno do eixo
    const width = room.cols * TILE_SIZE;
    for (const [x, y] of SANCTUARY_DECOR.candles) {
      const twin = SANCTUARY_DECOR.candles.some(([cx, cy]) => cy === y && cx === width - (x ?? 0));
      expect(twin, `vela ${x}`).toBe(true);
    }
    // O degrau é simétrico em cada linha
    for (let row = 0; row < room.rows; row++) {
      for (let col = 0; col < room.cols; col++) {
        expect(isSolidTile(room, col, row), `${col},${row}`).toBe(
          isSolidTile(room, room.cols - 1 - col, row),
        );
      }
    }
  });

  it('todo bioma tem cores próprias para o santuário', () => {
    for (const biome of ALL_BIOMES) {
      const look = SANCTUARY_LOOK[biome];
      expect(look.flame).toHaveLength(3);
    }
    const banners = new Set(ALL_BIOMES.map((b) => SANCTUARY_LOOK[b].banner));
    expect(banners.size).toBe(ALL_BIOMES.length);
  });

  it('o portal cabe entre os braseiros e a parede e o herói o alcança pelo chão', () => {
    const door = room.markers.find((m) => m.char === 'X');
    if (!door) throw new Error('sem portal');
    const g = SANCTUARY_DECOR.gate;
    const x = door.col * TILE_SIZE + TILE_SIZE / 2;
    const rightBrazier = SANCTUARY_DECOR.braziers[1] ?? 0;
    expect(x - g.width / 2).toBeGreaterThan(rightBrazier + 16);
    expect(x + g.width / 2).toBeLessThanOrEqual((room.cols - 1) * TILE_SIZE);
    // O vão e a região de entrada ficam dentro do arco, e o arco não passa do teto
    expect(g.trigger.halfWidth * 2).toBeLessThanOrEqual(g.opening.width);
    expect(g.trigger.height).toBeLessThanOrEqual(g.height - g.opening.top);
    expect(SANCTUARY_DECOR.floorY - g.height).toBeGreaterThanOrEqual(TILE_SIZE);
    expect(g.portalFrames).toBeGreaterThan(1);
    // O portal da esquerda (quando há duas áreas) cabe entre a parede e o braseiro, e o herói
    // nasce fora dele (senão sairia da sala no primeiro frame)
    const left = room.markers.find((m) => m.char === 'Y');
    if (!left || !room.spawn) throw new Error('sem portal esquerdo');
    const lx = left.col * TILE_SIZE + TILE_SIZE / 2;
    expect(lx - g.width / 2).toBeGreaterThanOrEqual(TILE_SIZE);
    expect(lx + g.width / 2).toBeLessThan((SANCTUARY_DECOR.braziers[0] ?? 0) - 16 + 1);
    const spawnX = room.spawn.col * TILE_SIZE + TILE_SIZE / 2;
    expect(Math.abs(spawnX - lx)).toBeGreaterThan(g.trigger.halfWidth + 12);
    expect(Math.abs(spawnX - x)).toBeGreaterThan(g.trigger.halfWidth + 12);
  });
});
