import { describe, expect, it } from 'vitest';
import {
  consumeDodgeBonus,
  createDodgeBonus,
  grantDodgeBonus,
  isPerfectDodge,
} from '../src/logic/perfectDodge';

describe('isPerfectDodge', () => {
  it('dentro da janela e invulnerável é perfeita', () => {
    expect(isPerfectDodge(50, true, 120)).toBe(true);
  });

  it('na borda exata da janela ainda é perfeita', () => {
    expect(isPerfectDodge(120, true, 120)).toBe(true);
  });

  it('um ms depois da borda não é perfeita', () => {
    expect(isPerfectDodge(121, true, 120)).toBe(false);
  });

  it('sem invulnerabilidade não é perfeita, mesmo dentro da janela', () => {
    expect(isPerfectDodge(50, false, 120)).toBe(false);
  });

  it('logo no início da rolagem (0ms) conta', () => {
    expect(isPerfectDodge(0, true, 120)).toBe(true);
  });
});

describe('bônus da esquiva perfeita', () => {
  it('começa sem bônus', () => {
    expect(createDodgeBonus()).toEqual({ ready: false });
  });

  it('sem bônus, consumir retorna 1', () => {
    const b = createDodgeBonus();
    expect(consumeDodgeBonus(b, 2)).toBe(1);
    expect(b.ready).toBe(false);
  });

  it('concedido uma vez, é consumido uma vez', () => {
    const b = createDodgeBonus();
    grantDodgeBonus(b);
    expect(b.ready).toBe(true);
    expect(consumeDodgeBonus(b, 2)).toBe(2);
    expect(b.ready).toBe(false);
    expect(consumeDodgeBonus(b, 2)).toBe(1);
  });

  it('conceder duas vezes não acumula', () => {
    const b = createDodgeBonus();
    grantDodgeBonus(b);
    grantDodgeBonus(b);
    expect(consumeDodgeBonus(b, 1.5)).toBe(1.5);
    expect(consumeDodgeBonus(b, 1.5)).toBe(1);
  });
});
