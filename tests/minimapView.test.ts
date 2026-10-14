import { describe, expect, it } from 'vitest';
import { minimapLinks, minimapRooms } from '../src/logic/map/minimapView';
import type { BiomeMap, MapLink, PlacedRoom, RoomKind } from '../src/logic/map/types';

function room(id: number, gx: number, kind: RoomKind = 'combat'): PlacedRoom {
  return { id, templateId: `t${id}`, kind, gx, gy: 0, cellsW: 1 };
}

function link(from: number, to: number): MapLink {
  return { from, to, fromSide: 'right', fromCell: 0, toCell: 0 };
}

// 0 - 1 - 2 - 3 (3 é secreta, ligada a 2)
const map: BiomeMap = {
  seed: 1,
  biome: 'muralhas',
  rooms: [room(0, 0, 'start'), room(1, 1), room(2, 2), room(3, 3, 'secret')],
  links: [link(0, 1), link(1, 2), link(2, 3)],
  startId: 0,
  endId: 2,
};

describe('minimapRooms', () => {
  it('no começo só a sala inicial é visitada e a vizinha é "conhecida"', () => {
    expect(minimapRooms(map, new Set([0]))).toEqual([
      { id: 0, state: 'visited' },
      { id: 1, state: 'known' },
    ]);
  });

  it('salas distantes ainda não aparecem', () => {
    const ids = minimapRooms(map, new Set([0])).map((r) => r.id);
    expect(ids).not.toContain(2);
  });

  it('sala secreta só aparece depois de visitada', () => {
    const before = minimapRooms(map, new Set([0, 1, 2])).map((r) => r.id);
    expect(before).not.toContain(3);
    const after = minimapRooms(map, new Set([0, 1, 2, 3])).map((r) => r.id);
    expect(after).toContain(3);
  });

  it('o vizinho vale nos dois sentidos da ligação', () => {
    const rooms = minimapRooms(map, new Set([2]));
    expect(rooms.map((r) => r.id).sort()).toEqual([1, 2]); // 3 é secreta e some
  });
});

describe('minimapLinks', () => {
  it('só desenha ligações entre salas visíveis', () => {
    const visible = minimapRooms(map, new Set([0, 1]));
    expect(minimapLinks(map, visible)).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ]);
  });
});
