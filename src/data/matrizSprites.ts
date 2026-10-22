/**
 * Poses e animações do mini-chefe "A Matriz de Cristal" (Minas Desabadas): um elemental de rocha
 * rachada fundida com cristais azul-turquesa. O desenho está em src/systems/matrizSprite.ts.
 * Quadro de 62 x 62 (corpo de colisão 34 x 38 mais a folga de 14 px dos lados e 12 em cima e
 * embaixo): a folga das laterais dá lugar aos braços grossos e aos estilhaços da pancada; a de cima,
 * aos cristais das costas e aos punhos erguidos da telegrafia.
 * Olhando para a direita (a cena espelha); `bob` positivo = sobe.
 */
import type { EnemySheet } from './enemySprites';

export interface MatrizPose {
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
  /** Núcleo, olhos e cristais: 0 = apagado, 1 = normal, 2 = forte, 3 = a mil (telegrafia e golpe). */
  glow: 0 | 1 | 2 | 3;
  /** Brilho só do núcleo do peito (o pulsar do idle); se faltar, acompanha `glow`. */
  core?: 0 | 1 | 2 | 3;
  /** Os cristais das costas crescem (0 = normais, 1 = esticados, 2 = bem esticados). */
  spike: 0 | 1 | 2;
  /** Rachaduras da rocha: 1 = normais, 2 = abertas e fundas. */
  cracks: 1 | 2;
  /** Cacos: 0 = nenhum, 1 = no chão, 2 = voando da pancada, 3 = lascas saltando do corpo. */
  shards: 0 | 1 | 2 | 3;
  /** Desmoronamento (a morte): 0 = inteiro, 1 = caindo aos pedaços, 2 = só a pilha de cacos. */
  crumble: 0 | 1 | 2;
  /** Quanto a cabeça afunda e pende para a frente. */
  droop: number;
}

const BASE: MatrizPose = {
  bob: 0,
  lean: 0,
  legF: 0,
  legB: 0,
  liftF: 0,
  liftB: 0,
  armF: { dx: 3, dy: 12 },
  armB: { dx: -1, dy: 12 },
  glow: 1,
  spike: 0,
  cracks: 1,
  shards: 0,
  crumble: 0,
  droop: 0,
};

const matriz = (o: Partial<MatrizPose>): MatrizPose => ({ ...BASE, ...o });

export const MATRIZ_SHEET: EnemySheet<MatrizPose> = {
  id: 'matriz',
  pad: { x: 14, y: 12 },
  frames: [
    // Parado: o núcleo pulsa
    { name: 'idle0', pose: matriz({}) },
    {
      name: 'idle1',
      pose: matriz({ bob: 1, core: 2, armF: { dx: 3, dy: 11 }, armB: { dx: -1, dy: 11 } }),
    },
    {
      name: 'idle2',
      pose: matriz({ armF: { dx: 4, dy: 12 }, armB: { dx: -2, dy: 12 }, droop: 1 }),
    },
    // Passo pesado: o corpo afunda quando o pé pousa
    {
      name: 'walk0',
      pose: matriz({
        bob: -1,
        lean: 1,
        legF: 3,
        legB: -3,
        liftB: 2,
        armF: { dx: 0, dy: 12 },
        armB: { dx: 3, dy: 12 },
      }),
    },
    { name: 'walk1', pose: matriz({ bob: 1, lean: 1, legF: 1, legB: -1 }) },
    {
      name: 'walk2',
      pose: matriz({
        bob: -1,
        lean: 1,
        legF: -3,
        legB: 3,
        liftF: 2,
        armF: { dx: 6, dy: 12 },
        armB: { dx: -4, dy: 12 },
      }),
    },
    { name: 'walk3', pose: matriz({ bob: 1, lean: 1, legF: -1, legB: 1 }) },
    {
      name: 'jump',
      pose: matriz({
        bob: 3,
        lean: 1,
        legF: 2,
        legB: -2,
        liftF: 5,
        liftB: 4,
        armF: { dx: 5, dy: 3 },
        armB: { dx: -5, dy: 3 },
        glow: 2,
        spike: 1,
      }),
    },
    // Telegrafia: os braços sobem e os cristais acendem e crescem
    {
      name: 'windup0',
      pose: matriz({
        lean: -1,
        armF: { dx: 1, dy: 2 },
        armB: { dx: -1, dy: 2 },
        glow: 2,
        spike: 1,
      }),
    },
    {
      name: 'windup1',
      pose: matriz({
        bob: 1,
        lean: -1,
        armF: { dx: 0, dy: -6 },
        armB: { dx: 0, dy: -6 },
        glow: 3,
        spike: 1,
      }),
    },
    {
      name: 'windup2',
      pose: matriz({
        bob: 1,
        lean: -1,
        armF: { dx: 0, dy: -15 },
        armB: { dx: 0, dy: -15 },
        glow: 3,
        spike: 2,
        cracks: 2,
      }),
    },
    {
      name: 'strike',
      pose: matriz({
        bob: -2,
        lean: 3,
        legF: 3,
        legB: -3,
        armF: { dx: 5, dy: 14 },
        armB: { dx: 11, dy: 14 },
        glow: 3,
        shards: 2,
        droop: 1,
      }),
    },
    {
      name: 'recover',
      pose: matriz({
        bob: -2,
        lean: 2,
        armF: { dx: 5, dy: 14 },
        armB: { dx: 9, dy: 14 },
        shards: 1,
        droop: 1,
      }),
    },
    {
      name: 'hurt',
      pose: matriz({
        lean: -3,
        armF: { dx: 4, dy: 8 },
        armB: { dx: -4, dy: 9 },
        glow: 0,
        cracks: 2,
        shards: 3,
      }),
    },
    {
      name: 'dead0',
      pose: matriz({
        bob: -7,
        lean: -2,
        armF: { dx: 2, dy: 9 },
        armB: { dx: -2, dy: 9 },
        glow: 0,
        cracks: 2,
        shards: 3,
        crumble: 1,
        droop: 3,
      }),
    },
    { name: 'dead1', pose: matriz({ glow: 0, cracks: 2, crumble: 2 }) },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1', 'idle2'], fps: 1.8, loop: true },
    walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 4, loop: true },
    jump: { frames: ['jump'], fps: 1, loop: false },
    windup: { frames: ['windup0', 'windup1', 'windup2'], fps: 4.5, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 3, loop: false },
  },
};
