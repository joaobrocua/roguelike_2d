import { describe, expect, it } from 'vitest';
import {
  createHealth,
  heal,
  isDead,
  isHurtInvulnerable,
  isStunned,
  takeDamage,
  updateHealth,
} from '../src/logic/health';

describe('createHealth', () => {
  it('começa com vida cheia e timers zerados', () => {
    expect(createHealth(5)).toEqual({ hp: 5, maxHp: 5, iframeMs: 0, stunMs: 0 });
  });
});

describe('takeDamage', () => {
  it('desconta a vida e arma i-frames e stun', () => {
    const h = createHealth(5);
    expect(takeDamage(h, 2, 600, 200)).toBe(true);
    expect(h.hp).toBe(3);
    expect(h.iframeMs).toBe(600);
    expect(h.stunMs).toBe(200);
    expect(isHurtInvulnerable(h)).toBe(true);
    expect(isStunned(h)).toBe(true);
  });

  it('i-frames bloqueiam o dano e não mudam nada', () => {
    const h = createHealth(5);
    takeDamage(h, 1, 600, 200);
    updateHealth(h, 100);
    expect(takeDamage(h, 3, 999, 999)).toBe(false);
    expect(h).toEqual({ hp: 4, maxHp: 5, iframeMs: 500, stunMs: 100 });
  });

  it('volta a levar dano quando os i-frames acabam', () => {
    const h = createHealth(5);
    takeDamage(h, 1, 600, 200);
    updateHealth(h, 600);
    expect(takeDamage(h, 1, 600, 200)).toBe(true);
    expect(h.hp).toBe(3);
  });

  it('não dá dano <= 0', () => {
    const h = createHealth(5);
    expect(takeDamage(h, 0, 600, 200)).toBe(false);
    expect(takeDamage(h, -3, 600, 200)).toBe(false);
    expect(h).toEqual({ hp: 5, maxHp: 5, iframeMs: 0, stunMs: 0 });
  });

  it('a vida não fica negativa e a morte é detectada', () => {
    const h = createHealth(3);
    expect(isDead(h)).toBe(false);
    expect(takeDamage(h, 10, 600, 200)).toBe(true);
    expect(h.hp).toBe(0);
    expect(isDead(h)).toBe(true);
  });

  it('morto não toma dano nem rearma timers, mesmo sem i-frames', () => {
    const h = createHealth(3);
    takeDamage(h, 3, 0, 0);
    expect(isDead(h)).toBe(true);
    expect(takeDamage(h, 1, 600, 200)).toBe(false);
    expect(h).toEqual({ hp: 0, maxHp: 3, iframeMs: 0, stunMs: 0 });
  });
});

describe('updateHealth', () => {
  it('reduz os timers e trava em 0', () => {
    const h = createHealth(5);
    takeDamage(h, 1, 600, 200);
    updateHealth(h, 150);
    expect(h.iframeMs).toBe(450);
    expect(h.stunMs).toBe(50);
    updateHealth(h, 100);
    expect(h.stunMs).toBe(0);
    expect(isStunned(h)).toBe(false);
    expect(isHurtInvulnerable(h)).toBe(true);
    updateHealth(h, 10000);
    expect(h.iframeMs).toBe(0);
    expect(isHurtInvulnerable(h)).toBe(false);
  });

  it('não altera a vida', () => {
    const h = createHealth(5);
    updateHealth(h, 1000);
    expect(h.hp).toBe(5);
  });
});

describe('heal', () => {
  it('recupera vida sem passar do máximo e informa o quanto recuperou', () => {
    const h = createHealth(10);
    takeDamage(h, 6, 0, 0);
    expect(heal(h, 3)).toBe(3);
    expect(h.hp).toBe(7);
    expect(heal(h, 100)).toBe(3);
    expect(h.hp).toBe(10);
  });

  it('não cura quem está morto nem aceita valor <= 0', () => {
    const h = createHealth(10);
    expect(heal(h, 0)).toBe(0);
    expect(heal(h, -5)).toBe(0);
    takeDamage(h, 10, 0, 0);
    expect(heal(h, 5)).toBe(0);
    expect(h.hp).toBe(0);
  });
});

describe('takeDamage: atordoamento só aumenta', () => {
  it('um golpe com atordoamento curto não encurta o atordoamento longo que já existe', () => {
    const h = createHealth(100);
    takeDamage(h, 5, 0, 1100); // ex.: onda do Martelo
    takeDamage(h, 5, 0, 160); // golpe comum logo depois
    expect(h.stunMs).toBe(1100);
  });

  it('um golpe com atordoamento maior prolonga o existente', () => {
    const h = createHealth(100);
    takeDamage(h, 5, 0, 160);
    takeDamage(h, 5, 0, 1100);
    expect(h.stunMs).toBe(1100);
  });
});
