import { describe, expect, it } from 'vitest';
import { parseRoom } from '../src/logic/roomParser';
import { TILE_EDGE, tileHash, tileLook } from '../src/logic/tileVariant';
import { lerpColor } from '../src/utils/color';

const room = parseRoom(['#####', '#...#', '#.P.#', '#####']);

describe('tileLook', () => {
  it('bloco com ar em cima é superfície; bloco com bloco em cima é interno', () => {
    expect(tileLook(room, 2, 3, 3).kind).toBe('top'); // chão da sala (ar acima)
    expect(tileLook(room, 2, 0, 3).kind).toBe('fill'); // teto (fora da sala conta como sólido)
    expect(tileLook(room, 0, 2, 3).kind).toBe('fill'); // parede com parede em cima
  });

  it('a variação é estável e fica dentro do limite', () => {
    for (let col = 0; col < 5; col++) {
      const a = tileLook(room, col, 3, 4);
      const b = tileLook(room, col, 3, 4);
      expect(a).toEqual(b);
      expect(a.variant).toBeGreaterThanOrEqual(0);
      expect(a.variant).toBeLessThan(4);
    }
  });

  it('variants menor que 1 vira uma única variação', () => {
    expect(tileLook(room, 1, 3, 0).variant).toBe(0);
  });

  it('o hash espalha as variações (não devolve sempre a mesma)', () => {
    const seen = new Set<number>();
    for (let col = 0; col < 40; col++) seen.add(tileHash(col, 7) % 3);
    expect(seen.size).toBe(3);
  });
});

describe('lados ao ar livre', () => {
  const ledge = parseRoom(['#######', '#.....#', '#.###.#', '#.#.#.#', '#######']);

  it('o chão da sala só tem ar em cima (nenhum lado aberto)', () => {
    expect(tileLook(room, 2, 3, 3).edges).toBe(0);
  });

  it('uma plataforma tem as quinas da esquerda e da direita e a base abertas', () => {
    expect(tileLook(ledge, 2, 2, 3).edges & TILE_EDGE.left).toBe(TILE_EDGE.left);
    expect(tileLook(ledge, 4, 2, 3).edges & TILE_EDGE.right).toBe(TILE_EDGE.right);
    expect(tileLook(ledge, 3, 2, 3).edges & TILE_EDGE.bottom).toBe(TILE_EDGE.bottom);
    expect(tileLook(ledge, 3, 2, 3).edges & TILE_EDGE.left).toBe(0);
  });

  it('fora da sala conta como parede (borda da sala não abre lados)', () => {
    expect(tileLook(ledge, 0, 0, 3).edges).toBe(0);
  });
});

describe('lerpColor', () => {
  it('devolve as pontas e o meio', () => {
    expect(lerpColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(lerpColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(lerpColor(0x000000, 0xfefefe, 0.5)).toBe(0x7f7f7f);
  });

  it('mistura canal a canal e limita t a 0..1', () => {
    expect(lerpColor(0xff0000, 0x0000ff, 0.5)).toBe(0x800080);
    expect(lerpColor(0x102030, 0x405060, -3)).toBe(0x102030);
    expect(lerpColor(0x102030, 0x405060, 9)).toBe(0x405060);
  });
});
