/**
 * Poses e animações do mini-chefe "A Condessa Pálida" (Salões e Capela): uma dama espectral, alta e
 * magra, de cabelos negros que flutuam e vestido de gala em farrapos. O desenho fica em
 * src/systems/condessaSprite.ts. Olha para a direita (a cena espelha). O quadro tem folga grande
 * dos lados (mangas abertas, garras e a barra que se arrasta) e em cima (cabelo erguido pelo grito).
 */
import type { EnemySheet } from './enemySprites';

/** Posição dos braços: de braços caídos a garras varrendo para a frente. */
export type CondessaArms =
  'rest' | 'present' | 'float' | 'rise' | 'open' | 'wide' | 'sweep' | 'flail';

export interface CondessaPose {
  /** Flutua acima do chão (px): o deslizar e o pulo. */
  bob: number;
  /** Tronco e cabeça inclinados para a frente (+) ou para trás (-), em px. */
  lean: number;
  /** O corpo todo avança (o bote), em px. */
  lunge: number;
  /** Fase da ondulação do vestido e do cabelo (radianos). */
  phase: number;
  /** Amplitude da ondulação (px). */
  wave: number;
  /** Ângulo do cabelo a partir de caído (graus): 0 pendurado, 90 estendido para trás, acima disso sobe. */
  flow: number;
  /** Abertura da saia na barra (px de meia largura além da cintura). */
  flare: number;
  /** Quanto a barra é puxada para trás (px). */
  trail: number;
  /** Trapo da barra arrastando no chão (px de comprimento). */
  drag: number;
  /** Desloca o padrão de farrapos da barra (0 a 7). */
  sway: number;
  arms: CondessaArms;
  /** Olhos: 0 = fechados, 1 = acesos, 2 = bem acesos, 3 = em brasa (aviso e ataque). */
  eyes: 0 | 1 | 2 | 3;
  /** Abertura da boca (px da mandíbula): 0 = fechada com as presas à mostra, 3 = grito. */
  mouth: 0 | 1 | 2 | 3;
  /** Morte: 0 = em pé, 1 = desabando, 2 = monte de tecido no chão. */
  dead: 0 | 1 | 2;
}

const BASE: CondessaPose = {
  bob: 0,
  lean: 0,
  lunge: 0,
  phase: 0,
  wave: 1,
  flow: 20,
  flare: 8,
  trail: 1,
  drag: 0,
  sway: 0,
  arms: 'rest',
  eyes: 1,
  mouth: 0,
  dead: 0,
};

const pose = (o: Partial<CondessaPose>): CondessaPose => ({ ...BASE, ...o });

export const CONDESSA_SHEET: EnemySheet<CondessaPose> = {
  id: 'condessa',
  pad: { x: 14, y: 8 },
  frames: [
    // Parado: paira, o vestido e o cabelo ondulam
    { name: 'idle0', pose: pose({ arms: 'present', wave: 1, flow: 15 }) },
    {
      name: 'idle1',
      pose: pose({
        arms: 'present',
        bob: 1,
        phase: 1.6,
        wave: 2,
        flow: 22,
        sway: 2,
        flare: 9,
        trail: 2,
      }),
    },
    {
      name: 'idle2',
      pose: pose({
        arms: 'rest',
        bob: 2,
        phase: 3.2,
        wave: 2,
        flow: 28,
        sway: 5,
        flare: 9,
        trail: 2,
      }),
    },
    // Deslizar: o corpo quase não se mexe, a barra arrasta e o cabelo corre para trás
    {
      name: 'walk0',
      pose: pose({ arms: 'present', bob: 1, lean: 1, flow: 45, trail: 3, drag: 2, wave: 2 }),
    },
    {
      name: 'walk1',
      pose: pose({
        arms: 'rest',
        bob: 2,
        lean: 1,
        lunge: 1,
        phase: 1.6,
        flow: 50,
        trail: 4,
        wave: 2,
        sway: 2,
        flare: 9,
      }),
    },
    {
      name: 'walk2',
      pose: pose({
        arms: 'present',
        bob: 1,
        lean: 1,
        phase: 3.2,
        flow: 45,
        trail: 3,
        drag: 3,
        wave: 2,
        sway: 4,
      }),
    },
    {
      name: 'walk3',
      pose: pose({
        arms: 'rest',
        bob: 2,
        lean: 1,
        lunge: -1,
        phase: 4.8,
        flow: 40,
        trail: 4,
        wave: 2,
        sway: 6,
        flare: 9,
      }),
    },
    // Pulo: flutua com o vestido esvoaçando, o cabelo sobe na queda
    {
      name: 'jump0',
      pose: pose({
        arms: 'float',
        bob: 4,
        lean: 1,
        flow: 70,
        flare: 11,
        trail: 3,
        wave: 2,
        sway: 1,
        phase: 1,
      }),
    },
    {
      name: 'jump1',
      pose: pose({
        arms: 'rise',
        bob: 3,
        flow: 105,
        flare: 12,
        trail: 1,
        wave: 3,
        sway: 5,
        phase: 3,
      }),
    },
    // Telegrafia do grito: abre os braços e a boca, o cabelo se ergue, os olhos acendem
    {
      name: 'windup0',
      pose: pose({ arms: 'rise', bob: 1, lean: -1, eyes: 2, mouth: 1, flow: 35, wave: 1 }),
    },
    {
      name: 'windup1',
      pose: pose({
        arms: 'open',
        bob: 1,
        lean: -2,
        eyes: 2,
        mouth: 2,
        flow: 65,
        flare: 10,
        wave: 2,
        phase: 1.6,
        sway: 3,
      }),
    },
    {
      name: 'windup2',
      pose: pose({
        arms: 'wide',
        bob: 2,
        lean: -3,
        eyes: 3,
        mouth: 3,
        flow: 100,
        flare: 11,
        trail: 0,
        wave: 3,
        phase: 3.2,
        sway: 6,
      }),
    },
    // Golpe: as garras varrem para a frente num bote
    {
      name: 'strike',
      pose: pose({
        arms: 'sweep',
        lunge: 2,
        lean: 2,
        eyes: 3,
        mouth: 3,
        flow: 68,
        flare: 9,
        trail: 5,
        drag: 3,
      }),
    },
    {
      name: 'recover',
      pose: pose({
        arms: 'rest',
        lunge: 1,
        lean: 2,
        mouth: 1,
        flow: 40,
        trail: 2,
        drag: 2,
        sway: 3,
      }),
    },
    {
      name: 'hurt',
      pose: pose({
        arms: 'flail',
        bob: 1,
        lean: -3,
        lunge: -1,
        eyes: 0,
        mouth: 3,
        flow: 100,
        flare: 10,
        trail: 0,
        wave: 2,
        phase: 2,
      }),
    },
    // Morte: o vestido desaba e vira um monte amarrotado, a poeira sobe
    { name: 'dead0', pose: pose({ dead: 1, eyes: 0, mouth: 1 }) },
    { name: 'dead1', pose: pose({ dead: 2, eyes: 0 }) },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1', 'idle2', 'idle1'], fps: 3, loop: true },
    walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 6, loop: true },
    jump: { frames: ['jump0', 'jump1'], fps: 5, loop: false },
    windup: { frames: ['windup0', 'windup1', 'windup2'], fps: 6.5, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 3, loop: false },
  },
};
