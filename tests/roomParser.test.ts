import { describe, expect, it } from 'vitest';
import { isSolidAt, isSolidTile, parseRoom } from '../src/logic/roomParser';
import { GAME_SIZE } from '../src/data/balance';
import { DECOR_MARKERS } from '../src/data/atmosphere';
import { ENEMY_MARKERS } from '../src/data/enemies';
import { PROP_MARKERS, TILE_SIZE } from '../src/data/rooms';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';

describe('parseRoom', () => {
  it('lê blocos sólidos e o ponto de nascimento', () => {
    const room = parseRoom(['###', '#P#', '###']);
    expect(room.cols).toBe(3);
    expect(room.rows).toBe(3);
    expect(room.solids).toHaveLength(8);
    expect(room.spawn).toEqual({ col: 1, row: 1 });
  });

  it('rejeita linhas de tamanhos diferentes', () => {
    expect(() => parseRoom(['###', '#P'])).toThrow();
  });

  it("sala sem 'P' é válida (spawn nulo)", () => {
    expect(parseRoom(['###', '#.#']).spawn).toBeNull();
  });

  it('todo marcador dos modelos de sala é inimigo, decoração, objeto, o chefe ou o mini-chefe', () => {
    const known = [
      ...Object.keys(ENEMY_MARKERS),
      ...Object.keys(DECOR_MARKERS),
      ...Object.keys(PROP_MARKERS),
      'G',
      'g',
    ];
    for (const template of ROOM_TEMPLATES) {
      for (const marker of parseRoom(template.layout).markers) {
        expect(known, `${template.id}: '${marker.char}'`).toContain(marker.char);
      }
    }
  });

  it('os modelos têm o tamanho de 1 ou 2 telas (em blocos e em pixels)', () => {
    for (const template of ROOM_TEMPLATES) {
      const room = parseRoom(template.layout);
      expect([GAME_SIZE.width, GAME_SIZE.width * 2], template.id).toContain(room.cols * TILE_SIZE);
      expect(room.rows * TILE_SIZE, template.id).toBeGreaterThanOrEqual(GAME_SIZE.height);
    }
  });
});

describe('marcadores e consulta de sólidos', () => {
  const room = parseRoom(['#####', '#CP.#', '#.A.#', '#####']);

  it('lê marcadores de inimigos (qualquer caractere fora de # . P)', () => {
    expect(room.markers).toEqual([
      { char: 'C', col: 1, row: 1 },
      { char: 'A', col: 2, row: 2 },
    ]);
  });

  it('isSolidTile: bloco, vazio e fora da sala', () => {
    expect(isSolidTile(room, 0, 0)).toBe(true);
    expect(isSolidTile(room, 2, 1)).toBe(false);
    expect(isSolidTile(room, -1, 1)).toBe(true);
    expect(isSolidTile(room, 1, 9)).toBe(true);
  });

  it('isSolidAt converte pixels em tiles', () => {
    expect(isSolidAt(room, 5, 5, 16)).toBe(true); // tile (0,0)
    expect(isSolidAt(room, 20, 20, 16)).toBe(false); // tile (1,1)
    expect(isSolidAt(room, 15.9, 16, 16)).toBe(true); // tile (0,1), parede da esquerda
  });
});
