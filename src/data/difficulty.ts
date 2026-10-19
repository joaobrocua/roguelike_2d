/**
 * Dificuldade por etapa da jornada (índice em RUN_PLAN): os inimigos comuns ficam mais resistentes
 * e batem mais forte conforme o herói avança. O chefe não entra aqui: ele tem os números dele
 * (src/data/boss.ts). Ajuste só esta tabela para deixar a descida mais fácil ou mais dura.
 */
export interface StageScaling {
  /** Multiplica a vida máxima dos inimigos comuns. */
  hpMult: number;
  /** Multiplica o dano dos golpes e projéteis dos inimigos comuns. */
  damageMult: number;
}

/** Uma entrada por etapa, na ordem do plano; etapas além da última repetem a última. */
export const STAGE_SCALING: readonly StageScaling[] = [
  { hpMult: 1, damageMult: 1 },
  { hpMult: 1.08, damageMult: 1 },
  { hpMult: 1.18, damageMult: 1.08 },
  { hpMult: 1.3, damageMult: 1.15 },
  { hpMult: 1.45, damageMult: 1.22 },
  { hpMult: 1.6, damageMult: 1.3 },
];
