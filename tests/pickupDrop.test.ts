import { describe, expect, it } from 'vitest';
import { floorYAt } from '../src/logic/pickupDrop';
import { parseRoom } from '../src/logic/roomParser';

const TILE = 16;
// Sala 7x6: chão na linha 5, uma plataforma na linha 3 (colunas 2 a 4) e um buraco na coluna 6
const room = parseRoom(['#######', '#.....#', '#.....#', '#.###.#', '#.....#', '#####.#']);

describe('floorYAt', () => {
  it('desce até o topo do chão', () => {
    expect(floorYAt(room, 1.5 * TILE, 1.2 * TILE, TILE)).toBe(5 * TILE);
  });

  it('para no topo de uma plataforma que está no caminho', () => {
    expect(floorYAt(room, 3.5 * TILE, 1.2 * TILE, TILE)).toBe(3 * TILE);
  });

  it('um ponto já dentro de um bloco sobe até o ar e cai de lá', () => {
    // (3, 3) é a plataforma: o ponto sai por cima e para no topo dela
    expect(floorYAt(room, 3.5 * TILE, 3.4 * TILE, TILE)).toBe(3 * TILE);
  });

  it('sem chão embaixo (buraco) devolve o próprio y', () => {
    // coluna 5: sem nenhum bloco até o fim da sala (o buraco do chão)
    expect(floorYAt(room, 5.5 * TILE, 2 * TILE, TILE)).toBe(2 * TILE);
  });

  it('limita x e y à sala', () => {
    expect(floorYAt(room, -50, -50, TILE)).toBeGreaterThanOrEqual(0);
    expect(floorYAt(room, 9999, 9999, TILE)).toBeGreaterThanOrEqual(0);
  });
});
