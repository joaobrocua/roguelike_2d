import { describe, expect, it } from 'vitest';
import {
  cooldownFraction,
  createCooldown,
  isReady,
  startCooldown,
  updateCooldown,
} from '../src/logic/cooldown';

describe('createCooldown', () => {
  it('começa pronto', () => {
    const c = createCooldown();
    expect(c).toEqual({ remainingMs: 0, totalMs: 0 });
    expect(isReady(c)).toBe(true);
  });
});

describe('startCooldown', () => {
  it('define restante e total e deixa de estar pronto', () => {
    const c = createCooldown();
    startCooldown(c, 3500);
    expect(c.remainingMs).toBe(3500);
    expect(c.totalMs).toBe(3500);
    expect(isReady(c)).toBe(false);
  });

  it('duração negativa vira 0', () => {
    const c = createCooldown();
    startCooldown(c, -100);
    expect(c).toEqual({ remainingMs: 0, totalMs: 0 });
    expect(isReady(c)).toBe(true);
  });
});

describe('updateCooldown', () => {
  it('desconta o tempo e fica pronto ao zerar', () => {
    const c = createCooldown();
    startCooldown(c, 1000);
    updateCooldown(c, 600);
    expect(c.remainingMs).toBe(400);
    expect(isReady(c)).toBe(false);
    updateCooldown(c, 400);
    expect(c.remainingMs).toBe(0);
    expect(isReady(c)).toBe(true);
  });

  it('não passa de 0', () => {
    const c = createCooldown();
    startCooldown(c, 100);
    updateCooldown(c, 5000);
    expect(c.remainingMs).toBe(0);
  });

  it('dt negativo não aumenta a recarga', () => {
    const c = createCooldown();
    startCooldown(c, 1000);
    updateCooldown(c, -200);
    expect(c.remainingMs).toBe(1000);
  });

  it('mantém o total ao descontar', () => {
    const c = createCooldown();
    startCooldown(c, 1000);
    updateCooldown(c, 300);
    expect(c.totalMs).toBe(1000);
  });
});

describe('cooldownFraction', () => {
  it('vai de 1 (recém iniciado) a 0 (pronto)', () => {
    const c = createCooldown();
    startCooldown(c, 1000);
    expect(cooldownFraction(c)).toBe(1);
    updateCooldown(c, 250);
    expect(cooldownFraction(c)).toBeCloseTo(0.75);
    updateCooldown(c, 750);
    expect(cooldownFraction(c)).toBe(0);
  });

  it('total 0 devolve 0', () => {
    expect(cooldownFraction(createCooldown())).toBe(0);
  });
});
