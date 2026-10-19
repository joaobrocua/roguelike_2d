import type { StageScaling } from '../data/difficulty';

const NEUTRAL: StageScaling = { hpMult: 1, damageMult: 1 };

/**
 * A escala da etapa `stage`: etapa negativa vale a primeira, etapa além da tabela repete a última
 * e tabela vazia não escala nada.
 */
export function stageScaling(stage: number, table: readonly StageScaling[]): StageScaling {
  if (table.length === 0) return NEUTRAL;
  const index = Math.min(table.length - 1, Math.max(0, Math.floor(stage)));
  return table[index] ?? NEUTRAL;
}

/** Vida máxima já escalada (nunca menos que 1). */
export function scaledHp(baseHp: number, hpMult: number): number {
  return Math.max(1, Math.round(baseHp * hpMult));
}
