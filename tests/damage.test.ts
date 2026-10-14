import { describe, expect, it } from 'vitest';
import { computeDamage, directionAway } from '../src/logic/damage';

describe('computeDamage', () => {
  it('multiplicador 1 mantém o dano base', () => {
    expect(computeDamage(10, 1)).toBe(10);
  });

  it('multiplicador 2 dobra o dano', () => {
    expect(computeDamage(10, 2)).toBe(20);
  });

  it('arredonda para o inteiro mais próximo', () => {
    expect(computeDamage(10, 1.24)).toBe(12);
    expect(computeDamage(10, 1.26)).toBe(13);
    expect(computeDamage(3, 0.5)).toBe(2); // 1.5 arredonda para cima
  });

  it('nunca retorna negativo', () => {
    expect(computeDamage(-5, 2)).toBe(0);
    expect(computeDamage(10, -1)).toBe(0);
  });

  it('multiplicador 0 zera o dano', () => {
    expect(computeDamage(10, 0)).toBe(0);
  });
});

describe('directionAway', () => {
  it('alvo à direita da fonte: empurra para a direita', () => {
    expect(directionAway(100, 150)).toBe(1);
  });

  it('alvo à esquerda da fonte: empurra para a esquerda', () => {
    expect(directionAway(100, 50)).toBe(-1);
  });

  it('empate (mesma posição) empurra para a direita', () => {
    expect(directionAway(100, 100)).toBe(1);
  });
});
