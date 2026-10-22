import { describe, expect, it } from 'vitest';
import { GUARDIAO, RAGE_AURA } from '../src/data/boss';
import { MINI_BOSSES } from '../src/data/miniBosses';
import { ragePulse } from '../src/logic/rage';

describe('aura da fase 2: dados', () => {
  const bosses = [GUARDIAO, ...Object.values(MINI_BOSSES)];

  it('todo chefe tem cor de brilho, cor de brasa e um ritmo de brasas', () => {
    for (const boss of bosses) {
      expect(boss.rage.color, boss.id).toBeGreaterThan(0);
      expect(boss.rage.emberColor, boss.id).toBeGreaterThan(0);
      expect(boss.rage.embersPerSecond, boss.id).toBeGreaterThan(2);
      expect(boss.rage.embersPerSecond, boss.id).toBeLessThan(40);
    }
  });

  it('cada mini-chefe tem uma cor de aura própria', () => {
    const colors = Object.values(MINI_BOSSES).map((b) => b.rage.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('o brilho é suave: opacidades em ordem e o pulso é lento', () => {
    expect(RAGE_AURA.alphaMin).toBeGreaterThan(0);
    expect(RAGE_AURA.alphaMax).toBeGreaterThan(RAGE_AURA.alphaMin);
    expect(RAGE_AURA.alphaMax).toBeLessThanOrEqual(0.7);
    expect(RAGE_AURA.pulseMs).toBeGreaterThanOrEqual(500);
  });
});

describe('ragePulse', () => {
  it('oscila entre o mínimo e o máximo, uma volta por período', () => {
    expect(ragePulse(0, 1000, 0.2, 0.6)).toBeCloseTo(0.2);
    expect(ragePulse(500, 1000, 0.2, 0.6)).toBeCloseTo(0.6);
    expect(ragePulse(1000, 1000, 0.2, 0.6)).toBeCloseTo(0.2);
    for (let t = 0; t < 3000; t += 37) {
      const v = ragePulse(t, 1000, 0.2, 0.6);
      expect(v).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(v).toBeLessThanOrEqual(0.6 + 1e-9);
    }
  });

  it('período inválido devolve o máximo (sem dividir por zero)', () => {
    expect(ragePulse(123, 0, 0.2, 0.6)).toBe(0.6);
    expect(ragePulse(123, -5, 0.2, 0.6)).toBe(0.6);
  });
});
