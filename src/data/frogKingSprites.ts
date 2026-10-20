/**
 * Poses e animações do mini-chefe "O Rei dos Charcos" (Pântano dos Afogados): um sapo imenso de
 * coroa torta. O desenho fica em src/systems/frogKingSprite.ts. Olha para a direita (a cena
 * espelha). O quadro tem folga grande dos lados (pulo esticado e língua) e em cima (coroa e juncos).
 */
import type { EnemySheet } from './enemySprites';

export interface FrogKingPose {
  /** Sobe o corpo todo (px). */
  bob: number;
  /** O corpo abaixa e se achata (agachado, pouso), em px. */
  crouch: number;
  /** Corpo todo no ar (px acima do chão): o pulo. */
  air: number;
  /** Quanto as patas traseiras se esticam para trás: 0 = dobradas, 6 = esticadas. */
  legs: number;
  /** Tronco e cabeça se inclinam para a frente (+) ou para trás (-), em px. */
  lean: number;
  /** O corpo inteiro avança (o bote), em px. */
  lunge: number;
  /** O corpo se alonga para a frente (px a mais no comprimento). */
  long: number;
  /** Tamanho do papo da garganta: 0 = murcho, 3 = cheio e brilhando. */
  sac: number;
  /** Boca aberta (px). */
  mouth: number;
  /** Comprimento da língua para fora da boca (px). */
  tongue: number;
  /** Olhos: 0 = fechados, 1 = acesos normais, 2 = bem acesos, 3 = em brasa (aviso e fase 2). */
  eyes: 0 | 1 | 2 | 3;
  /** Mãos da frente: 0 = no chão, 1 = erguidas, 2 = esticadas para o bote. */
  reach: 0 | 1 | 2;
  /** Morte: 0 = em pé, 1 = de barriga para cima inchado, 2 = esvaziado. */
  dead: 0 | 1 | 2;
}

const BASE: FrogKingPose = {
  bob: 0,
  crouch: 0,
  air: 0,
  legs: 0,
  lean: 0,
  lunge: 0,
  long: 0,
  sac: 0,
  mouth: 0,
  tongue: 0,
  eyes: 1,
  reach: 0,
  dead: 0,
};

const pose = (o: Partial<FrogKingPose>): FrogKingPose => ({ ...BASE, ...o });

export const FROG_KING_SHEET: EnemySheet<FrogKingPose> = {
  id: 'saporei',
  pad: { x: 14, y: 11 },
  frames: [
    // Parado: o papo incha e esvazia
    { name: 'idle0', pose: pose({}) },
    { name: 'idle1', pose: pose({ sac: 1 }) },
    { name: 'idle2', pose: pose({ sac: 2, bob: 1 }) },
    // Pulinhos curtos: junta, decola, no ar, pousa
    { name: 'walk0', pose: pose({ crouch: 2, sac: 1 }) },
    { name: 'walk1', pose: pose({ air: 4, legs: 3, lean: 1, reach: 1 }) },
    { name: 'walk2', pose: pose({ air: 3, legs: 2, lean: 1, reach: 1, sac: 1 }) },
    { name: 'walk3', pose: pose({ crouch: 3, sac: 1, long: 1 }) },
    // O grande salto: agacha esticando e voa de patas esticadas
    { name: 'jump0', pose: pose({ crouch: 4, lean: 2, legs: 1, long: 1, sac: 1 }) },
    {
      name: 'jump1',
      pose: pose({ air: 5, legs: 6, lean: 4, long: 3, crouch: 2, reach: 2, mouth: 1, eyes: 2 }),
    },
    // Telegrafia: agacha, o papo incha, os olhos acendem
    { name: 'windup0', pose: pose({ crouch: 3, sac: 1, eyes: 2 }) },
    { name: 'windup1', pose: pose({ crouch: 5, sac: 2, eyes: 2, long: 1, lean: -1 }) },
    {
      name: 'windup2',
      pose: pose({ crouch: 6, sac: 3, eyes: 3, long: 2, lean: -2, mouth: 1 }),
    },
    // Bote: barrigada com o corpo esticado à frente, boca escancarada e a língua chicoteando
    {
      name: 'strike',
      pose: pose({
        lunge: 4,
        long: 3,
        crouch: 3,
        lean: 3,
        legs: 5,
        mouth: 5,
        tongue: 5,
        reach: 2,
        eyes: 3,
      }),
    },
    { name: 'recover', pose: pose({ crouch: 2, sac: 1, mouth: 2, tongue: 2, lean: -1 }) },
    { name: 'hurt', pose: pose({ eyes: 0, crouch: 2, lean: -3, mouth: 2, sac: 1 }) },
    { name: 'dead0', pose: pose({ dead: 1, eyes: 0, mouth: 2, tongue: 4 }) },
    { name: 'dead1', pose: pose({ dead: 2, eyes: 0, mouth: 2, tongue: 6 }) },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1', 'idle2', 'idle1'], fps: 3, loop: true },
    walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 5, loop: true },
    jump: { frames: ['jump0', 'jump1'], fps: 8, loop: false },
    windup: { frames: ['windup0', 'windup1', 'windup2'], fps: 6, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 3, loop: false },
  },
};
