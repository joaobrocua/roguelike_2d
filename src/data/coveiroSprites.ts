import type { EnemySheet } from './enemySprites';

/**
 * Poses do mini-chefe "O Coveiro Insone" (o desenho está em src/systems/coveiroSprite.ts).
 * Quadro de 78 x 100 (corpo de colisão 30 x 44 mais 24 px de folga dos lados e 28 em cima e embaixo):
 * a folga de cima dá lugar à pá erguida da telegrafia; a da frente, à pancada no chão.
 * Olhando para a direita; `bob` positivo = sobe.
 */
export interface CoveiroPose {
  bob: number;
  /** Quanto o tronco avança (+) ou recua (-); a cabeça acompanha. */
  lean: number;
  /** Deslocamento do pé da frente e de trás em relação ao quadril, e quanto cada um sobe. */
  legF: number;
  legB: number;
  liftF: number;
  liftB: number;
  /** Mão de trás na pá, em relação ao ombro da frente (dy negativo = acima do ombro). */
  grip: { dx: number; dy: number };
  /** Direção da pá a partir da mão, em graus: 0 = lâmina para baixo, 90 = para a frente, 180 = para cima. */
  angle: number;
  /** Olhos: 0 = apagados, 1 = acesos, 2 = muito acesos (telegrafia e golpe). */
  glow: 0 | 1 | 2;
  /** Lampião e vermes balançam para o lado (-1, 0 ou 1). */
  sway: number;
  /** Quanto a cabeça pende para baixo (negativo = jogada para trás). */
  droop: number;
  /** Fase da terra que cai do casaco (0 a 3). */
  fall: 0 | 1 | 2 | 3;
  /** Terra lançada pela lâmina: 0 = nenhuma, 1 = pouca, 2 = muita. */
  burst: 0 | 1 | 2;
  /** 0 = em pé, 1 = de joelhos, 2 = desabado no chão. */
  kneel: 0 | 1 | 2;
}

const BASE: CoveiroPose = {
  bob: 0,
  lean: 0,
  legF: 0,
  legB: 0,
  liftF: 0,
  liftB: 0,
  grip: { dx: 9, dy: -4 },
  angle: 12,
  glow: 1,
  sway: 0,
  droop: 0,
  fall: 0,
  burst: 0,
  kneel: 0,
};

const coveiro = (o: Partial<CoveiroPose>): CoveiroPose => ({ ...BASE, ...o });

export const COVEIRO_SHEET: EnemySheet<CoveiroPose> = {
  id: 'coveiro',
  pad: { x: 24, y: 28 },
  frames: [
    { name: 'idle0', pose: coveiro({}) },
    {
      name: 'idle1',
      pose: coveiro({ bob: -1, lean: 1, sway: 1, fall: 1, droop: 1, grip: { dx: 9, dy: -5 } }),
    },
    { name: 'idle2', pose: coveiro({ sway: -1, fall: 2, grip: { dx: 9, dy: -3 } }) },
    {
      name: 'walk0',
      pose: coveiro({ lean: 2, legF: 5, legB: -4, liftF: 1, angle: 20, grip: { dx: 5, dy: -3 } }),
    },
    {
      name: 'walk1',
      pose: coveiro({
        bob: -1,
        lean: 1,
        legF: 2,
        legB: -1,
        sway: 1,
        fall: 1,
        grip: { dx: 6, dy: -4 },
      }),
    },
    {
      name: 'walk2',
      pose: coveiro({
        lean: 2,
        legF: -4,
        legB: 5,
        liftB: 1,
        angle: 20,
        grip: { dx: 5, dy: -3 },
        sway: -1,
        fall: 2,
      }),
    },
    {
      name: 'walk3',
      pose: coveiro({
        bob: -1,
        lean: 1,
        legF: -1,
        legB: 2,
        sway: 1,
        fall: 3,
        grip: { dx: 6, dy: -4 },
      }),
    },
    {
      name: 'jump',
      pose: coveiro({
        bob: 3,
        lean: 2,
        legF: 3,
        legB: -3,
        liftF: 5,
        liftB: 4,
        grip: { dx: 6, dy: -4 },
        angle: 135,
        sway: 1,
        fall: 3,
      }),
    },
    {
      name: 'windup0',
      pose: coveiro({ lean: -1, grip: { dx: 6, dy: -5 }, angle: 130, glow: 2, fall: 1 }),
    },
    {
      name: 'windup1',
      pose: coveiro({
        bob: 1,
        lean: -2,
        grip: { dx: 8, dy: -9 },
        angle: 168,
        glow: 2,
        sway: 1,
        fall: 2,
      }),
    },
    {
      name: 'windup2',
      pose: coveiro({
        bob: 1,
        lean: -3,
        grip: { dx: 0, dy: -16 },
        angle: 222,
        glow: 2,
        sway: -1,
        droop: -1,
        fall: 3,
      }),
    },
    {
      name: 'strike',
      pose: coveiro({
        bob: -2,
        lean: 3,
        legF: 3,
        legB: -3,
        grip: { dx: 0, dy: 4 },
        angle: 48,
        glow: 2,
        droop: 2,
        burst: 2,
      }),
    },
    {
      name: 'recover',
      pose: coveiro({
        bob: -2,
        lean: 3,
        grip: { dx: 0, dy: 1 },
        angle: 40,
        droop: 2,
        burst: 1,
        fall: 2,
      }),
    },
    {
      name: 'hurt',
      pose: coveiro({
        lean: -3,
        grip: { dx: 3, dy: -3 },
        angle: 40,
        glow: 0,
        sway: -1,
        droop: -1,
      }),
    },
    {
      name: 'dead0',
      pose: coveiro({
        bob: -9,
        lean: 4,
        grip: { dx: 4, dy: -14 },
        angle: 8,
        glow: 0,
        droop: 3,
        kneel: 1,
      }),
    },
    {
      name: 'dead1',
      pose: coveiro({ angle: 8, glow: 0, droop: 4, kneel: 2, burst: 1 }),
    },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1', 'idle2'], fps: 1.6, loop: true },
    walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 4, loop: true },
    jump: { frames: ['jump'], fps: 1, loop: false },
    windup: { frames: ['windup0', 'windup1', 'windup2'], fps: 4.5, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 2.5, loop: false },
  },
};
