import type { EnemySheet } from './enemySprites';

/** Quem segura o machado: ninguém (solto), a mão da frente, a de trás ou as duas. */
export type AxeHand = 'none' | 'front' | 'back' | 'both';

/**
 * Poses do mini-chefe "O Carrasco em Chamas" (o desenho está em src/systems/carrascoSprite.ts).
 * Quadro de 84 x 112 (corpo de colisão 28 x 46 mais a folga de 28 px dos lados e de 33 em cima e
 * embaixo): a folga de cima dá lugar ao machado erguido da telegrafia e a da frente, ao corte no chão.
 * Olhando para a direita; `bob` positivo = sobe.
 */
export interface CarrascoPose {
  bob: number;
  /** Quanto o tronco avança (+) ou recua (-); a cabeça acompanha um pouco menos. */
  lean: number;
  /** Deslocamento do pé da frente e de trás em relação ao quadril, e quanto cada um sobe. */
  legF: number;
  legB: number;
  liftF: number;
  liftB: number;
  /** Punhos em relação ao ombro correspondente (dy negativo = acima do ombro). */
  armF: { dx: number; dy: number };
  armB: { dx: number; dy: number };
  /**
   * O machado. `ang` é a direção do cabo, do cabo para a lâmina, em graus (0 = para a frente,
   * -90 = para cima, 90 = para baixo). `hand`: quem o segura (`none` = solto no ar ou no chão,
   * e então `x` e `y` dão a empunhadura em relação ao centro e aos pés). `flip` vira a lâmina
   * para o outro lado do cabo (machado deitado).
   */
  axe: { ang: number; hand: AxeHand; x: number; y: number; flip: boolean };
  /** Brasa dos olhos e da lâmina: 0 = apagada, 1 = normal, 2 = em brasa viva (golpe). */
  heat: 0 | 1 | 2;
  /** Fase da tremulação das chamas (0 a 3): cada quadro mexe as línguas de fogo. */
  fire: number;
  /** As correntes e o avental balançam para o lado (-1, 0 ou 1). */
  sway: number;
  /** Quanto a cabeça pende para a frente e para baixo. */
  droop: number;
  /** 0 = em pé, 1 = ajoelhado, 2 = tombado de bruços. */
  kneel: 0 | 1 | 2;
  /** Faíscas e pedra estilhaçada onde a lâmina bate: 0 = nada, 1 = pancada, 2 = brasas que sobram. */
  impact: 0 | 1 | 2;
}

/** Machado nas mãos: cabo em `ang` graus, seguro pela mão da frente, a de trás ou as duas. */
const held = (ang: number, hand: AxeHand): CarrascoPose['axe'] => ({
  ang,
  hand,
  x: 0,
  y: 0,
  flip: false,
});

/** Machado solto: o ponto de empunhadura em (x, y) em relação ao centro e aos pés. */
const loose = (x: number, y: number, ang: number, flip = false): CarrascoPose['axe'] => ({
  ang,
  hand: 'none',
  x,
  y,
  flip,
});

const BASE: CarrascoPose = {
  bob: 0,
  lean: 0,
  legF: 0,
  legB: 0,
  liftF: 0,
  liftB: 0,
  armF: { dx: 4, dy: 18 },
  armB: { dx: -6, dy: 9 },
  axe: held(-92, 'back'),
  heat: 1,
  fire: 0,
  sway: 0,
  droop: 0,
  kneel: 0,
  impact: 0,
};

const pose = (o: Partial<CarrascoPose>): CarrascoPose => ({ ...BASE, ...o });

export const CARRASCO_SHEET: EnemySheet<CarrascoPose> = {
  id: 'carrasco',
  pad: { x: 28, y: 33 },
  frames: [
    { name: 'idle0', pose: pose({}) },
    {
      name: 'idle1',
      pose: pose({ bob: 1, fire: 1, sway: 1, armF: { dx: 4, dy: 17 }, armB: { dx: -6, dy: 8 } }),
    },
    { name: 'idle2', pose: pose({ fire: 2, sway: -1 }) },
    {
      name: 'walk0',
      pose: pose({
        bob: -1,
        lean: 1,
        legF: 6,
        legB: -6,
        liftB: 4,
        armF: { dx: 9, dy: 16 },
        sway: 1,
      }),
    },
    {
      name: 'walk1',
      pose: pose({ bob: 1, legF: 1, legB: -1, fire: 1, armF: { dx: 5, dy: 18 } }),
    },
    {
      name: 'walk2',
      pose: pose({
        bob: -1,
        lean: 1,
        legF: -6,
        legB: 6,
        liftF: 4,
        armF: { dx: -1, dy: 17 },
        fire: 2,
        sway: -1,
      }),
    },
    {
      name: 'walk3',
      pose: pose({ bob: 1, legF: -1, legB: 1, fire: 3, armF: { dx: 3, dy: 18 } }),
    },
    {
      name: 'jump',
      pose: pose({
        bob: 2,
        lean: 1,
        legF: 3,
        legB: -3,
        liftF: 7,
        liftB: 5,
        armF: { dx: 4, dy: -5 },
        axe: held(-135, 'both'),
        heat: 2,
        fire: 1,
      }),
    },
    {
      name: 'windup0',
      pose: pose({
        lean: -1,
        armF: { dx: 5, dy: -3 },
        axe: held(-142, 'both'),
        heat: 2,
        fire: 0,
      }),
    },
    {
      name: 'windup1',
      pose: pose({
        bob: 1,
        lean: -2,
        armF: { dx: 5, dy: -8 },
        axe: held(-126, 'both'),
        heat: 2,
        fire: 1,
      }),
    },
    {
      name: 'windup2',
      pose: pose({
        bob: 1,
        lean: -3,
        legF: 1,
        legB: -2,
        armF: { dx: 4, dy: -10 },
        axe: held(-118, 'both'),
        heat: 2,
        fire: 2,
      }),
    },
    {
      name: 'strike',
      pose: pose({
        bob: -2,
        lean: 3,
        legF: 3,
        legB: -3,
        armF: { dx: 6, dy: 2 },
        axe: held(50, 'both'),
        heat: 2,
        fire: 3,
        droop: 2,
        impact: 1,
      }),
    },
    {
      name: 'recover',
      pose: pose({
        bob: -2,
        lean: 2,
        armF: { dx: 5, dy: 6 },
        axe: held(58, 'both'),
        droop: 1,
        impact: 2,
        fire: 1,
      }),
    },
    {
      name: 'hurt',
      pose: pose({
        lean: -4,
        legF: 2,
        legB: -2,
        armF: { dx: 3, dy: 12 },
        armB: { dx: -5, dy: 6 },
        axe: held(-100, 'back'),
        heat: 0,
        fire: 3,
      }),
    },
    {
      name: 'dead0',
      pose: pose({
        bob: -7,
        lean: 4,
        armF: { dx: 3, dy: 15 },
        armB: { dx: -1, dy: 15 },
        axe: loose(15, -30, 55),
        heat: 0,
        fire: 1,
        droop: 4,
        kneel: 1,
      }),
    },
    {
      name: 'dead1',
      pose: pose({
        axe: loose(10, -3, -6, true),
        heat: 0,
        fire: 2,
        kneel: 2,
        impact: 2,
      }),
    },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1', 'idle2'], fps: 2.2, loop: true },
    walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 4.5, loop: true },
    jump: { frames: ['jump'], fps: 1, loop: false },
    windup: { frames: ['windup0', 'windup1', 'windup2'], fps: 5, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 2.5, loop: false },
  },
};
