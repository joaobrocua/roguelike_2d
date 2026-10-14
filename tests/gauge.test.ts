import { describe, expect, it } from 'vitest';
import { clampFraction, trailFraction } from '../src/logic/gauge';

describe('clampFraction', () => {
  it('limita a 0..1', () => {
    expect(clampFraction(-3)).toBe(0);
    expect(clampFraction(0.4)).toBe(0.4);
    expect(clampFraction(7)).toBe(1);
  });
});

describe('trailFraction', () => {
  it('desce devagar até a vida nova depois de um dano', () => {
    // vida caiu de 100% para 40%; o rastro perde 0,35 da barra por segundo
    expect(trailFraction(1, 0.4, 0.35, 1000)).toBeCloseTo(0.65);
    expect(trailFraction(0.65, 0.4, 0.35, 1000)).toBeCloseTo(0.4);
  });

  it('nunca passa da vida real (para exatamente nela)', () => {
    expect(trailFraction(0.45, 0.4, 0.35, 5000)).toBe(0.4);
  });

  it('ao curar, cola na vida nova de uma vez', () => {
    expect(trailFraction(0.4, 0.8, 0.35, 16)).toBe(0.8);
  });

  it('começa colado quando já nasce com a vida atual (sem falso dano ao entrar na sala)', () => {
    expect(trailFraction(0.4, 0.4, 0.35, 16)).toBe(0.4);
  });

  it('vida zero ou acima do máximo é limitada', () => {
    expect(trailFraction(0.2, -1, 0.35, 5000)).toBe(0);
    expect(trailFraction(0.2, 3, 0.35, 16)).toBe(1);
  });
});
