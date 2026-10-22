/**
 * Poses e animações do mini-chefe "A Górgola Rachada" (Muralhas e Pátio): uma estátua viva de
 * pedra azul-acinzentada, agachada e corpulenta, que salta muito. O desenho fica em
 * src/systems/gargulaSprite.ts. Olha para a direita (a cena espelha). O quadro tem folga grande
 * dos lados (asas abertas e bote de garras) e em cima (o salto com as asas erguidas).
 */
import type { EnemySheet } from './enemySprites';

export interface GargulaPose {
  /** Sobe o tronco e a cabeça (respiração), em px; os pés ficam no chão. */
  bob: number;
  /** O tronco abaixa e se achata (agachada, pouso), em px. */
  crouch: number;
  /** Corpo todo no ar (px acima do chão): o salto. */
  air: number;
  /** O corpo inteiro avança (o bote), em px. */
  lunge: number;
  /** Cabeça e ombros se inclinam para a frente (+) ou para trás (-), em px. */
  lean: number;
  /** Asas: 0 = dobradas nas costas, 1 = se soltando, 2 = erguidas, 3 = abertas no salto. */
  wings: 0 | 1 | 2 | 3;
  /** Olhos: 0 = fechados, 1 = brasa fraca, 2 = acesos, 3 = em brasa viva. */
  eyes: 0 | 1 | 2 | 3;
  /** Boca aberta (px). */
  mouth: number;
  /** Braços: 0 = apoiados no chão, 1 = erguidos para bater, 2 = garras esticadas no bote. */
  arms: 0 | 1 | 2;
  /** Pernas: 0 = plantadas, 1 = recolhidas debaixo do corpo, 2 = esticadas para trás. */
  legs: 0 | 1 | 2;
  /** Brilho das rachaduras: 0 = apagadas, 3 = em brasa. */
  glow: 0 | 1 | 2 | 3;
  /** Lascas de pedra voando (dano e pouso pesado): 0 = nenhuma. */
  chips: 0 | 1 | 2;
  /** Morte: 0 = em pé, 1 = rachando e desabando, 2 = pilha de escombros. */
  dead: 0 | 1 | 2;
}

const BASE: GargulaPose = {
  bob: 0,
  crouch: 0,
  air: 0,
  lunge: 0,
  lean: 0,
  wings: 0,
  eyes: 1,
  mouth: 0,
  arms: 0,
  legs: 0,
  glow: 1,
  chips: 0,
  dead: 0,
};

const pose = (o: Partial<GargulaPose>): GargulaPose => ({ ...BASE, ...o });

export const GARGULA_SHEET: EnemySheet<GargulaPose> = {
  id: 'gargula',
  pad: { x: 16, y: 16 },
  frames: [
    // Parado: o peito de pedra sobe e desce, as rachaduras pulsam
    { name: 'idle0', pose: pose({}) },
    { name: 'idle1', pose: pose({ bob: 1, glow: 2 }) },
    { name: 'idle2', pose: pose({ bob: 2, lean: 1, glow: 1 }) },
    // Pulinhos pesados: apoia, empurra, no ar, pouso com lascas
    { name: 'walk0', pose: pose({ crouch: 2 }) },
    { name: 'walk1', pose: pose({ air: 2, lunge: 2, lean: 2, legs: 2, arms: 1 }) },
    { name: 'walk2', pose: pose({ air: 4, lunge: 3, lean: 1, legs: 1, arms: 1, wings: 1 }) },
    { name: 'walk3', pose: pose({ crouch: 4, lunge: 1, lean: 1, chips: 1 }) },
    // O grande salto: agacha tomando impulso e voa com as asas abertas
    { name: 'jump0', pose: pose({ crouch: 5, lean: 2, wings: 1, eyes: 2, glow: 2 }) },
    {
      name: 'jump1',
      pose: pose({
        air: 9,
        lunge: 2,
        lean: 2,
        wings: 3,
        eyes: 2,
        mouth: 2,
        arms: 1,
        legs: 2,
        glow: 2,
      }),
    },
    // Telegrafia: agacha, as asas se erguem e os olhos acendem
    { name: 'windup0', pose: pose({ crouch: 3, wings: 1, eyes: 2, glow: 2 }) },
    { name: 'windup1', pose: pose({ crouch: 5, wings: 2, eyes: 2, arms: 1, lean: -1, glow: 2 }) },
    {
      name: 'windup2',
      pose: pose({ crouch: 6, wings: 2, eyes: 3, arms: 1, lean: -2, mouth: 1, glow: 3 }),
    },
    // Bote: o corpo avança e as garras rasgam para a frente
    {
      name: 'strike',
      pose: pose({
        crouch: 3,
        lunge: 4,
        lean: 3,
        wings: 2,
        eyes: 3,
        mouth: 3,
        arms: 2,
        legs: 2,
        glow: 3,
      }),
    },
    { name: 'recover', pose: pose({ crouch: 4, lean: 1, mouth: 1, glow: 1, eyes: 1 }) },
    { name: 'hurt', pose: pose({ eyes: 0, crouch: 2, lean: -3, mouth: 2, wings: 1, chips: 2 }) },
    { name: 'dead0', pose: pose({ dead: 1, eyes: 0, glow: 3 }) },
    { name: 'dead1', pose: pose({ dead: 2, eyes: 0, glow: 1 }) },
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
