import { describe, expect, it } from 'vitest';
import {
  canAcquireAttack,
  createPack,
  holdsAttack,
  releaseAttack,
  tryAcquireAttack,
  updatePack,
} from '../src/logic/ai/pack';

describe('createPack', () => {
  it('pré-aloca os slots livres e o intervalo zerado', () => {
    expect(createPack(2, 500)).toEqual({ holders: [-1, -1], slots: 2, gapMs: 500, gapTimerMs: 0 });
  });
});

describe('tryAcquireAttack', () => {
  it('respeita o limite de slots simultâneos', () => {
    const p = createPack(2, 0);
    expect(tryAcquireAttack(p, 1)).toBe(true);
    expect(tryAcquireAttack(p, 2)).toBe(true);
    expect(tryAcquireAttack(p, 3)).toBe(false);
    expect(holdsAttack(p, 3)).toBe(false);
  });

  it('espaça os ataques: bloqueia durante o gap e libera depois', () => {
    const p = createPack(3, 400);
    expect(tryAcquireAttack(p, 1)).toBe(true);
    expect(p.gapTimerMs).toBe(400);
    expect(tryAcquireAttack(p, 2)).toBe(false);
    updatePack(p, 399);
    expect(tryAcquireAttack(p, 2)).toBe(false);
    updatePack(p, 1);
    expect(tryAcquireAttack(p, 2)).toBe(true);
    expect(p.gapTimerMs).toBe(400);
  });

  it('é idempotente para quem já segura o slot (mesmo durante o gap) e não reinicia o gap', () => {
    const p = createPack(1, 400);
    expect(tryAcquireAttack(p, 7)).toBe(true);
    updatePack(p, 100);
    expect(tryAcquireAttack(p, 7)).toBe(true);
    expect(p.gapTimerMs).toBe(300);
    expect(p.holders).toEqual([7]);
  });

  it('não ocupa dois slots para o mesmo membro', () => {
    const p = createPack(3, 0);
    tryAcquireAttack(p, 5);
    tryAcquireAttack(p, 5);
    expect(p.holders.filter((h) => h === 5)).toHaveLength(1);
  });

  it('negar não reinicia o gap nem ocupa slot', () => {
    const p = createPack(1, 300);
    tryAcquireAttack(p, 1);
    updatePack(p, 300);
    expect(tryAcquireAttack(p, 2)).toBe(false); // sem slot livre
    expect(p.gapTimerMs).toBe(0);
    expect(holdsAttack(p, 2)).toBe(false);
  });

  it('com zero slots ninguém ataca', () => {
    const p = createPack(0, 0);
    expect(tryAcquireAttack(p, 1)).toBe(false);
  });

  it('rejeita -1, que é o marcador de slot livre', () => {
    const p = createPack(2, 0);
    expect(tryAcquireAttack(p, -1)).toBe(false);
    expect(holdsAttack(p, -1)).toBe(false);
    expect(p.holders).toEqual([-1, -1]);
  });
});

describe('releaseAttack', () => {
  it('libera o slot para outro membro', () => {
    const p = createPack(1, 0);
    tryAcquireAttack(p, 1);
    expect(tryAcquireAttack(p, 2)).toBe(false);
    releaseAttack(p, 1);
    expect(holdsAttack(p, 1)).toBe(false);
    expect(tryAcquireAttack(p, 2)).toBe(true);
  });

  it('não mexe em nada se o membro não tem slot (ids não vistos)', () => {
    const p = createPack(2, 0);
    tryAcquireAttack(p, 1);
    releaseAttack(p, 99);
    releaseAttack(p, -1);
    expect(p.holders).toEqual([1, -1]);
  });

  it('não zera o gap', () => {
    const p = createPack(1, 500);
    tryAcquireAttack(p, 1);
    releaseAttack(p, 1);
    expect(p.gapTimerMs).toBe(500);
    expect(tryAcquireAttack(p, 2)).toBe(false);
  });
});

describe('holdsAttack', () => {
  it('é falso para ids que nunca foram vistos', () => {
    const p = createPack(2, 0);
    expect(holdsAttack(p, 42)).toBe(false);
  });

  it('é verdadeiro só para quem adquiriu', () => {
    const p = createPack(2, 0);
    tryAcquireAttack(p, 4);
    expect(holdsAttack(p, 4)).toBe(true);
    expect(holdsAttack(p, 5)).toBe(false);
  });
});

describe('updatePack', () => {
  it('desconta o gap sem passar de zero', () => {
    const p = createPack(1, 200);
    tryAcquireAttack(p, 1);
    updatePack(p, 50);
    expect(p.gapTimerMs).toBe(150);
    updatePack(p, 10_000);
    expect(p.gapTimerMs).toBe(0);
  });

  it('ignora dt negativo', () => {
    const p = createPack(1, 200);
    tryAcquireAttack(p, 1);
    updatePack(p, -100);
    expect(p.gapTimerMs).toBe(200);
  });

  it('não altera os slots', () => {
    const p = createPack(2, 100);
    tryAcquireAttack(p, 1);
    updatePack(p, 1000);
    expect(p.holders).toEqual([1, -1]);
  });
});

describe('canAcquireAttack', () => {
  it('só consulta: não ocupa slot nem reinicia o intervalo', () => {
    const p = createPack(1, 500);
    expect(canAcquireAttack(p, 1)).toBe(true);
    expect(canAcquireAttack(p, 2)).toBe(true);
    expect(p.holders).toEqual([-1]);
    expect(p.gapTimerMs).toBe(0);
  });

  it('é falso sem slot livre ou durante o intervalo, e verdadeiro para quem já segura', () => {
    const p = createPack(1, 500);
    tryAcquireAttack(p, 1);
    expect(canAcquireAttack(p, 1)).toBe(true);
    expect(canAcquireAttack(p, 2)).toBe(false);
    releaseAttack(p, 1);
    expect(canAcquireAttack(p, 2)).toBe(false); // ainda dentro do intervalo
    updatePack(p, 500);
    expect(canAcquireAttack(p, 2)).toBe(true);
  });

  it('ignora o id -1 (slot livre)', () => {
    expect(canAcquireAttack(createPack(1, 0), -1)).toBe(false);
  });
});
