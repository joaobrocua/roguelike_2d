import { describe, expect, it } from 'vitest';
import { createRng, randomInt } from '../src/utils/rng';

describe('createRng', () => {
  it('é determinístico: mesma seed gera a mesma sequência', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it('seeds diferentes geram sequências diferentes', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('devolve valores em [0, 1)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 5000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('avança a sequência (não repete o mesmo valor)', () => {
    const rng = createRng(7);
    expect(rng()).not.toBe(rng());
  });

  it('tem média próxima de 0.5', () => {
    const rng = createRng(99);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) sum += rng();
    expect(sum / n).toBeGreaterThan(0.47);
    expect(sum / n).toBeLessThan(0.53);
  });
});

describe('randomInt', () => {
  it('respeita os limites [min, max)', () => {
    const rng = createRng(5);
    for (let i = 0; i < 2000; i++) {
      const v = randomInt(rng, 3, 7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(7);
    }
  });

  it('com rng nos extremos devolve o mínimo e o máximo-1', () => {
    expect(randomInt(() => 0, 2, 6)).toBe(2);
    expect(randomInt(() => 0.999999, 2, 6)).toBe(5);
  });

  it('intervalo de um só valor devolve esse valor', () => {
    expect(randomInt(createRng(1), 4, 5)).toBe(4);
  });

  it('distribui de forma aproximadamente uniforme', () => {
    const rng = createRng(2024);
    const counts = [0, 0, 0, 0];
    const n = 8000;
    for (let i = 0; i < n; i++) {
      const k = randomInt(rng, 0, 4);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(n / 4 - 300);
      expect(c).toBeLessThan(n / 4 + 300);
    }
  });
});
