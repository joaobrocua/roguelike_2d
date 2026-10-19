import { describe, expect, it } from 'vitest';
import { STAGE_SCALING } from '../src/data/difficulty';
import { RUN_PLAN } from '../src/data/mapRules';
import { scaledHp, stageScaling } from '../src/logic/difficulty';

describe('escala de dificuldade por etapa', () => {
  it('a tabela cobre todas as etapas do plano e a primeira não escala nada', () => {
    expect(STAGE_SCALING.length).toBeGreaterThanOrEqual(RUN_PLAN.length);
    expect(STAGE_SCALING[0]).toEqual({ hpMult: 1, damageMult: 1 });
  });

  it('nunca fica mais fácil ao avançar e os valores são razoáveis', () => {
    for (let i = 1; i < STAGE_SCALING.length; i++) {
      const prev = STAGE_SCALING[i - 1];
      const cur = STAGE_SCALING[i];
      expect(cur?.hpMult, `vida ${i}`).toBeGreaterThanOrEqual(prev?.hpMult ?? 0);
      expect(cur?.damageMult, `dano ${i}`).toBeGreaterThanOrEqual(prev?.damageMult ?? 0);
    }
    for (const step of STAGE_SCALING) {
      expect(step.hpMult).toBeLessThanOrEqual(2);
      expect(step.damageMult).toBeLessThanOrEqual(1.5);
    }
  });

  it('stageScaling limita a etapa à tabela', () => {
    expect(stageScaling(0, STAGE_SCALING)).toBe(STAGE_SCALING[0]);
    expect(stageScaling(-3, STAGE_SCALING)).toBe(STAGE_SCALING[0]);
    expect(stageScaling(2.9, STAGE_SCALING)).toBe(STAGE_SCALING[2]);
    expect(stageScaling(99, STAGE_SCALING)).toBe(STAGE_SCALING[STAGE_SCALING.length - 1]);
    expect(stageScaling(3, [])).toEqual({ hpMult: 1, damageMult: 1 });
  });

  it('scaledHp arredonda e nunca zera', () => {
    expect(scaledHp(40, 1)).toBe(40);
    expect(scaledHp(40, 1.3)).toBe(52);
    expect(scaledHp(14, 1.08)).toBe(15);
    expect(scaledHp(1, 0.1)).toBe(1);
  });
});
