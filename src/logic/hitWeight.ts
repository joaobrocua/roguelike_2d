import type { HitFeedback } from '../data/fx';

/**
 * "Peso" de um golpe: golpes fracos (adaga, combo rápido) dão pouco congelamento, tremor e
 * faíscas; golpes pesados (martelo, machado, dano dobrado) dão bastante. Lógica pura.
 */
export interface HitWeight {
  /** Dano que vale o peso mínimo e dano que vale o máximo (entre os dois, interpola). */
  damageMin: number;
  damageMax: number;
  /** Fator aplicado ao feedback base no dano mínimo e no máximo. */
  scaleMin: number;
  scaleMax: number;
}

/** Fator (entre scaleMin e scaleMax) que o dano pede. */
export function hitWeightFactor(damage: number, weight: HitWeight): number {
  const span = Math.max(1e-6, weight.damageMax - weight.damageMin);
  const t = Math.min(1, Math.max(0, (damage - weight.damageMin) / span));
  return weight.scaleMin + (weight.scaleMax - weight.scaleMin) * t;
}

/** Escreve em `out` o feedback `base` multiplicado pelo fator do dano (sem criar objeto novo). */
export function scaleHitFeedback(
  out: HitFeedback,
  base: HitFeedback,
  damage: number,
  weight: HitWeight,
): HitFeedback {
  const factor = hitWeightFactor(damage, weight);
  out.hitStopMs = base.hitStopMs * factor;
  out.shakeMs = base.shakeMs * factor;
  out.shakeIntensity = base.shakeIntensity * factor;
  out.sparks = Math.max(1, Math.round(base.sparks * factor));
  return out;
}
