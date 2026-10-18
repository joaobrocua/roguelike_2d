import { describe, expect, it } from 'vitest';
import { guardResult, isFrontal, isParry } from '../src/logic/guard';

describe('guarda do escudo', () => {
  it('só os golpes que vêm de frente são frontais', () => {
    expect(isFrontal(1, 100, 140)).toBe(true); // olhando para a direita, golpe da direita
    expect(isFrontal(1, 100, 60)).toBe(false); // golpe pelas costas
    expect(isFrontal(-1, 100, 60)).toBe(true); // olhando para a esquerda, golpe da esquerda
    expect(isFrontal(-1, 100, 140)).toBe(false);
  });

  it('a defesa perfeita é a dos primeiros instantes da guarda', () => {
    expect(isParry(0, 150)).toBe(true);
    expect(isParry(150, 150)).toBe(true);
    expect(isParry(151, 150)).toBe(false);
    expect(isParry(-5, 150)).toBe(false);
  });

  it('sem guarda erguida ou por trás nada é bloqueado', () => {
    expect(guardResult(false, 1, 100, 140, 10, 150)).toBe(0);
    expect(guardResult(true, 1, 100, 60, 10, 150)).toBe(0);
  });

  it('bloqueia de frente: defesa perfeita no começo, bloqueio comum depois', () => {
    expect(guardResult(true, 1, 100, 140, 40, 150)).toBe(2);
    expect(guardResult(true, 1, 100, 140, 600, 150)).toBe(1);
    expect(guardResult(true, -1, 100, 60, 600, 150)).toBe(1);
  });
});
