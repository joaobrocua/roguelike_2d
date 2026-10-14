import { describe, expect, it } from 'vitest';
import { easeOutQuad, lifeProgress } from '../src/logic/floatingText';

describe('lifeProgress', () => {
  it('é 0 no início e 1 no fim da vida', () => {
    expect(lifeProgress(0, 800)).toBe(0);
    expect(lifeProgress(800, 800)).toBe(1);
  });

  it('é proporcional no meio da vida', () => {
    expect(lifeProgress(400, 800)).toBe(0.5);
    expect(lifeProgress(200, 800)).toBe(0.25);
  });

  it('é limitado ao intervalo 0..1', () => {
    expect(lifeProgress(1600, 800)).toBe(1);
    expect(lifeProgress(-100, 800)).toBe(0);
  });

  it('lifeMs 0 ou negativo retorna 1', () => {
    expect(lifeProgress(0, 0)).toBe(1);
    expect(lifeProgress(100, 0)).toBe(1);
    expect(lifeProgress(100, -50)).toBe(1);
  });
});

describe('easeOutQuad', () => {
  it('vale 0 em 0, 0.75 em 0.5 e 1 em 1', () => {
    expect(easeOutQuad(0)).toBe(0);
    expect(easeOutQuad(0.5)).toBe(0.75);
    expect(easeOutQuad(1)).toBe(1);
  });

  it('sai rápido e desacelera (acima da reta no começo)', () => {
    expect(easeOutQuad(0.25)).toBe(0.4375);
  });

  it('limita t fora do intervalo', () => {
    expect(easeOutQuad(-1)).toBe(0);
    expect(easeOutQuad(2)).toBe(1);
  });
});
