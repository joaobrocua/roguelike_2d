import type { EnemySheet } from './enemySprites';

/**
 * Poses do mini-chefe "O Ent Apodrecido" (o desenho está em src/systems/entSprite.ts).
 * Quadro de 52 x 68 (corpo de colisão 28 x 44 mais a folga de 12 px dos lados e em cima e embaixo):
 * a folga grande em cima dá lugar aos galhos erguidos da telegrafia; a das laterais, ao soco no chão.
 * Olhando para a direita; `bob` positivo = sobe.
 */
export interface EntPose {
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
  /** Brasas do peito e olhos: 0 = apagado, 1 = normal, 2 = aceso (telegrafia, golpe e fase 2). */
  glow: 0 | 1 | 2;
  /** Cipós e folhas penduradas balançam para o lado (-1, 0 ou 1). */
  sway: number;
  /** Quanto a cabeça pende para a frente e para baixo. */
  droop: number;
  /** Lascas de casca no chão: 0 = nenhuma, 1 = poucas (pancada), 2 = monte (desmoronou). */
  debris: 0 | 1 | 2;
}

const BASE: EntPose = {
  bob: 0,
  lean: 0,
  legF: 0,
  legB: 0,
  liftF: 0,
  liftB: 0,
  armF: { dx: 2, dy: 17 },
  armB: { dx: -1, dy: 17 },
  glow: 1,
  sway: 0,
  droop: 0,
  debris: 0,
};

const ent = (o: Partial<EntPose>): EntPose => ({ ...BASE, ...o });

export const ENT_SHEET: EnemySheet<EntPose> = {
  id: 'ent',
  pad: { x: 12, y: 12 },
  frames: [
    { name: 'idle0', pose: ent({}) },
    {
      name: 'idle1',
      pose: ent({ bob: 1, sway: 1, armF: { dx: 2, dy: 16 }, armB: { dx: -1, dy: 16 } }),
    },
    { name: 'idle2', pose: ent({ sway: -1, armF: { dx: 3, dy: 17 }, armB: { dx: -2, dy: 17 } }) },
    {
      name: 'walk0',
      pose: ent({
        lean: 1,
        legF: 4,
        legB: -4,
        liftB: 3,
        armF: { dx: -2, dy: 17 },
        armB: { dx: 2, dy: 17 },
      }),
    },
    { name: 'walk1', pose: ent({ bob: 1, sway: 1, legF: 1, legB: -1 }) },
    {
      name: 'walk2',
      pose: ent({
        lean: 1,
        legF: -4,
        legB: 4,
        liftF: 3,
        armF: { dx: 4, dy: 17 },
        armB: { dx: -4, dy: 17 },
      }),
    },
    { name: 'walk3', pose: ent({ bob: 1, sway: -1, legF: -1, legB: 1 }) },
    {
      name: 'jump',
      pose: ent({
        bob: 2,
        lean: 1,
        legF: 2,
        legB: -2,
        liftF: 5,
        liftB: 4,
        armF: { dx: 5, dy: 6 },
        armB: { dx: -5, dy: 6 },
        glow: 2,
        sway: 1,
      }),
    },
    {
      name: 'windup0',
      pose: ent({ lean: -1, armF: { dx: 3, dy: 5 }, armB: { dx: -3, dy: 5 }, glow: 2 }),
    },
    {
      name: 'windup1',
      pose: ent({ bob: 1, lean: -1, armF: { dx: 1, dy: -6 }, armB: { dx: -1, dy: -6 }, glow: 2 }),
    },
    {
      name: 'windup2',
      pose: ent({
        bob: 1,
        lean: -1,
        armF: { dx: 0, dy: -16 },
        armB: { dx: 0, dy: -16 },
        glow: 2,
        sway: 1,
      }),
    },
    {
      name: 'strike',
      pose: ent({
        bob: -2,
        lean: 3,
        legF: 3,
        legB: -3,
        armF: { dx: 6, dy: 23 },
        armB: { dx: 13, dy: 23 },
        glow: 2,
        droop: 2,
        debris: 1,
      }),
    },
    {
      name: 'recover',
      pose: ent({
        bob: -2,
        lean: 2,
        armF: { dx: 5, dy: 21 },
        armB: { dx: 8, dy: 21 },
        droop: 1,
        debris: 1,
      }),
    },
    {
      name: 'hurt',
      pose: ent({
        lean: -3,
        armF: { dx: 4, dy: 8 },
        armB: { dx: -4, dy: 9 },
        glow: 0,
        sway: -1,
      }),
    },
    {
      name: 'dead0',
      pose: ent({
        bob: -6,
        lean: 2,
        legF: 2,
        legB: -2,
        armF: { dx: 5, dy: 19 },
        armB: { dx: -4, dy: 19 },
        glow: 0,
        droop: 3,
        debris: 1,
      }),
    },
    {
      name: 'dead1',
      pose: ent({
        bob: -16,
        lean: 2,
        legF: 3,
        legB: -3,
        armF: { dx: 5, dy: 13 },
        armB: { dx: -6, dy: 13 },
        glow: 0,
        droop: 4,
        debris: 2,
      }),
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
