import { describe, expect, it } from 'vitest';
import { hasLineOfSight } from '../src/logic/lineOfSight';
import { parseRoom } from '../src/logic/roomParser';

const TILE = 16;

// 10 colunas: uma laje no meio separa o andar de cima do de baixo, com uma abertura à direita.
const room = parseRoom([
  '##########',
  '#........#',
  '#........#',
  '#.######.#',
  '#........#',
  '#........#',
  '##########',
]);

describe('linha de visão', () => {
  it('no mesmo salão aberto o alvo é visto', () => {
    expect(hasLineOfSight(room, 24, 24, 120, 40, TILE)).toBe(true);
    expect(hasLineOfSight(room, 24, 72, 130, 72, TILE)).toBe(true);
  });

  it('uma laje no meio tapa a visão entre o andar de cima e o de baixo', () => {
    expect(hasLineOfSight(room, 56, 24, 56, 72, TILE)).toBe(false);
    expect(hasLineOfSight(room, 24, 24, 110, 80, TILE)).toBe(false);
  });

  it('pela abertura da laje dá para ver o outro andar', () => {
    expect(hasLineOfSight(room, 136, 24, 136, 72, TILE)).toBe(true);
  });

  it('pontos iguais: só vale se o ponto está no ar', () => {
    expect(hasLineOfSight(room, 40, 24, 40, 24, TILE)).toBe(true);
    expect(hasLineOfSight(room, 40, 56, 40, 56, TILE)).toBe(false); // dentro da laje
  });
});
