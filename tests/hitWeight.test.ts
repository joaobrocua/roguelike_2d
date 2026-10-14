import { describe, expect, it } from 'vitest';
import { HIT_FEEDBACK, HIT_WEIGHT, type HitFeedback } from '../src/data/fx';
import { hitWeightFactor, scaleHitFeedback } from '../src/logic/hitWeight';

describe('hitWeightFactor', () => {
  it('vale o mínimo nos golpes fracos e o máximo nos pesados', () => {
    expect(hitWeightFactor(HIT_WEIGHT.damageMin, HIT_WEIGHT)).toBeCloseTo(HIT_WEIGHT.scaleMin);
    expect(hitWeightFactor(HIT_WEIGHT.damageMax, HIT_WEIGHT)).toBeCloseTo(HIT_WEIGHT.scaleMax);
  });

  it('interpola no meio e não passa das pontas', () => {
    const mid = (HIT_WEIGHT.damageMin + HIT_WEIGHT.damageMax) / 2;
    expect(hitWeightFactor(mid, HIT_WEIGHT)).toBeCloseTo(
      (HIT_WEIGHT.scaleMin + HIT_WEIGHT.scaleMax) / 2,
    );
    expect(hitWeightFactor(0, HIT_WEIGHT)).toBeCloseTo(HIT_WEIGHT.scaleMin);
    expect(hitWeightFactor(999, HIT_WEIGHT)).toBeCloseTo(HIT_WEIGHT.scaleMax);
  });

  it('um golpe mais pesado nunca pesa menos que um mais leve', () => {
    let previous = 0;
    for (let damage = 0; damage <= 40; damage++) {
      const factor = hitWeightFactor(damage, HIT_WEIGHT);
      expect(factor).toBeGreaterThanOrEqual(previous);
      previous = factor;
    }
  });
});

describe('scaleHitFeedback', () => {
  const base = HIT_FEEDBACK.enemyHit;

  it('golpe leve congela menos e golpe pesado congela mais que o feedback base', () => {
    const out: HitFeedback = { hitStopMs: 0, shakeMs: 0, shakeIntensity: 0, sparks: 0 };
    scaleHitFeedback(out, base, 5, HIT_WEIGHT);
    const light = out.hitStopMs;
    scaleHitFeedback(out, base, 28, HIT_WEIGHT);
    const heavy = out.hitStopMs;
    expect(light).toBeLessThan(base.hitStopMs);
    expect(heavy).toBeGreaterThan(base.hitStopMs);
  });

  it('escreve no objeto recebido e devolve o mesmo (sem criar outro)', () => {
    const out: HitFeedback = { hitStopMs: 0, shakeMs: 0, shakeIntensity: 0, sparks: 0 };
    expect(scaleHitFeedback(out, base, 12, HIT_WEIGHT)).toBe(out);
  });

  it('sempre solta pelo menos uma faísca e a base não é alterada', () => {
    const out: HitFeedback = { hitStopMs: 0, shakeMs: 0, shakeIntensity: 0, sparks: 0 };
    const before = { ...base };
    scaleHitFeedback(out, { ...base, sparks: 0 }, 5, HIT_WEIGHT);
    expect(out.sparks).toBeGreaterThanOrEqual(1);
    expect({ ...base }).toEqual(before);
  });
});
