/**
 * O Último Vigia: medidas, poses e animações do herói. O desenho é feito em código
 * (src/systems/heroSprites.ts) a partir destas poses; a arte final pode substituir as
 * texturas mantendo os mesmos nomes de quadros e animações.
 *
 * Os quadros têm 32x32 e o herói olha para a direita (a cena espelha ao olhar para a
 * esquerda). Medidas em pixels do quadro; ângulos em radianos (0 = para a frente,
 * positivo = para baixo).
 */

export const HERO_CELL = 32;

/** Altura (px) da bota: o pé desenhado ocupa as linhas footY e footY + bota - 1. */
export const HERO_BOOT_HEIGHT = 2;

/** Posição do corpo de colisão dentro do quadro: o centro dele fica no centro do quadro. */
export const HERO_BODY_OFFSET = { x: 10, y: 5 } as const;

/** Bola da rolagem: centro e raio no quadro (o giro acontece em torno do centro). */
export const HERO_TUCK = { centerX: 16, centerY: 20, radius: 6 } as const;

/** Herói caído: ponto do quadro onde o corpo deitado se apoia e ponto do corpo em pé usado como pivô. */
export const HERO_FALLEN = { groundX: 16, groundY: 23, pivotX: 16, pivotY: 15 } as const;

/** Medidas do esqueleto usado para calcular as juntas de cada pose. */
export interface HeroGeometry {
  centerX: number;
  /** Altura (y) do quadril em pé. */
  hipY: number;
  /** Altura (y) dos pés no chão. */
  footY: number;
  torsoH: number;
  headW: number;
  headH: number;
  /** Ombros: deslocamento horizontal em relação ao centro e vertical em relação ao topo do tronco. */
  shoulderFrontDX: number;
  shoulderBackDX: number;
  shoulderDY: number;
  upperArm: number;
  foreArm: number;
  hipFrontDX: number;
  hipBackDX: number;
  /** Alcance horizontal da passada (px) com stride = 1. */
  strideReach: number;
  /** Quanto o joelho avança para a frente em relação ao meio da perna. */
  kneeBend: number;
  /** Pés no ar: deslocamento em relação ao quadril (x) e ao chão (y; negativo = mais alto). */
  jumpFeet: { front: { dx: number; dy: number }; back: { dx: number; dy: number } };
  fallFeet: { front: { dx: number; dy: number }; back: { dx: number; dy: number } };
}

export const HERO_GEOMETRY: HeroGeometry = {
  centerX: 16,
  hipY: 18,
  footY: 25,
  torsoH: 8,
  headW: 8,
  headH: 8,
  shoulderFrontDX: 1,
  shoulderBackDX: -1,
  shoulderDY: 2,
  upperArm: 4,
  foreArm: 4,
  hipFrontDX: 1,
  hipBackDX: -2,
  strideReach: 4,
  kneeBend: 2,
  jumpFeet: { front: { dx: 3, dy: -3 }, back: { dx: -3, dy: -1 } },
  fallFeet: { front: { dx: 2, dy: 0 }, back: { dx: -2, dy: 0 } },
};

export type HeroLegs = 'walk' | 'jump' | 'fall';

export interface HeroPose {
  /** Quanto o corpo sobe (px): respiração e passos. */
  bob: number;
  /** Quanto o tronco e a cabeça avançam (+) ou recuam (-), em px. */
  lean: number;
  /** Passada: -1 a 1 (positivo = perna da frente à frente). Só vale com legs = 'walk'. */
  stride: number;
  /** Quanto cada pé sobe do chão (px), na passada. */
  liftFront: number;
  liftBack: number;
  legs: HeroLegs;
  armFront: number;
  armBack: number;
  /** Capa: colunas de comprimento, amplitude da onda (px) e fase da onda (rad). */
  capeLen: number;
  capeAmp: number;
  capePhase: number;
  /** Enrolado em bola (rolagem): desenha uma bola em vez do corpo. */
  tuck: boolean;
  /** Giro do corpo todo (rad): a rolagem gira de 90 em 90 graus; a morte deita o herói. */
  rotation: number;
}

export const HERO_BASE_POSE: HeroPose = {
  bob: 0,
  lean: 0,
  stride: 0,
  liftFront: 0,
  liftBack: 0,
  legs: 'walk',
  armFront: 1.35,
  armBack: 1.7,
  capeLen: 9,
  capeAmp: 1,
  capePhase: 0,
  tuck: false,
  rotation: 0,
};

function pose(overrides: Partial<HeroPose>): HeroPose {
  return { ...HERO_BASE_POSE, ...overrides };
}

export type HeroState =
  'idle' | 'run' | 'jump' | 'fall' | 'roll' | 'windup' | 'swing' | 'recover' | 'hurt' | 'dead';

export interface HeroFrame {
  /** Nome do quadro na textura (ex.: 'run-3'). */
  name: string;
  pose: HeroPose;
}

const RUN_FRAMES = 6;
const IDLE_BOB = [0, 1, 1, 0] as const;

function idleFrames(): HeroFrame[] {
  return IDLE_BOB.map((bob, i) => ({
    name: `idle-${i}`,
    pose: pose({ bob, capePhase: i * 1.3, capeLen: 9 + (bob === 1 ? 1 : 0) }),
  }));
}

function runFrames(): HeroFrame[] {
  const frames: HeroFrame[] = [];
  for (let i = 0; i < RUN_FRAMES; i++) {
    const phase = (i / RUN_FRAMES) * Math.PI * 2;
    const stride = Math.sin(phase);
    frames.push({
      name: `run-${i}`,
      pose: pose({
        bob: i % 3 === 1 ? 1 : 0,
        lean: 1,
        stride,
        liftFront: Math.max(0, Math.round(3 * Math.cos(phase))),
        liftBack: Math.max(0, Math.round(-3 * Math.cos(phase))),
        armFront: 0.6 - stride * 0.9,
        armBack: 0.6 + stride * 0.9,
        capeLen: 13,
        capeAmp: 2,
        capePhase: phase * 2,
      }),
    });
  }
  return frames;
}

function rollFrames(): HeroFrame[] {
  return [0, 1, 2, 3].map((i) => ({
    name: `roll-${i}`,
    pose: pose({ tuck: true, rotation: (i * Math.PI) / 2, capeLen: 5, capeAmp: 1, capePhase: i }),
  }));
}

export const HERO_FRAMES: readonly HeroFrame[] = [
  ...idleFrames(),
  ...runFrames(),
  {
    name: 'jump-0',
    pose: pose({ legs: 'jump', armFront: -0.9, armBack: -0.3, capeLen: 12, capeAmp: 1.5, lean: 1 }),
  },
  {
    name: 'fall-0',
    pose: pose({
      legs: 'fall',
      armFront: -1.2,
      armBack: -1.9,
      capeLen: 8,
      capeAmp: 2,
      capePhase: 1,
    }),
  },
  ...rollFrames(),
  {
    name: 'windup-0',
    pose: pose({ lean: -1, stride: -0.3, armFront: -2.2, armBack: 1.8, capeLen: 10 }),
  },
  {
    name: 'swing-0',
    pose: pose({ lean: 2, stride: 0.5, armFront: 0.05, armBack: 2.2, capeLen: 14, capeAmp: 2 }),
  },
  {
    name: 'recover-0',
    pose: pose({ lean: 1, stride: 0.2, armFront: 0.8, armBack: 1.9, capeLen: 11 }),
  },
  {
    name: 'hurt-0',
    pose: pose({
      lean: -2,
      legs: 'fall',
      armFront: -1,
      armBack: -1.5,
      capeLen: 6,
      capeAmp: 2,
      capePhase: 2,
    }),
  },
  {
    name: 'dead-0',
    pose: pose({ armFront: 1.9, armBack: 2.2, capeLen: 3, capeAmp: 0, rotation: -Math.PI / 2 }),
  },
];

export interface HeroAnimation {
  /** Estado do herói que usa esta animação. */
  state: HeroState;
  /** Quadros, em ordem. Um só quadro = pose fixa. */
  frames: readonly string[];
  fps: number;
  loop: boolean;
}

function names(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

export const HERO_ANIMATIONS: readonly HeroAnimation[] = [
  { state: 'idle', frames: names('idle', IDLE_BOB.length), fps: 4, loop: true },
  { state: 'run', frames: names('run', RUN_FRAMES), fps: 12, loop: true },
  { state: 'jump', frames: ['jump-0'], fps: 1, loop: false },
  { state: 'fall', frames: ['fall-0'], fps: 1, loop: false },
  { state: 'roll', frames: names('roll', 4), fps: 18, loop: true },
  { state: 'windup', frames: ['windup-0'], fps: 1, loop: false },
  { state: 'swing', frames: ['swing-0'], fps: 1, loop: false },
  { state: 'recover', frames: ['recover-0'], fps: 1, loop: false },
  { state: 'hurt', frames: ['hurt-0'], fps: 1, loop: false },
  { state: 'dead', frames: ['dead-0'], fps: 1, loop: false },
];

/** Velocidade horizontal (px/s) a partir da qual o herói passa a "correr". */
export const HERO_RUN_THRESHOLD = 20;

export const HERO_SHEET_KEY = 'hero';

export function heroAnimationKey(state: HeroState): string {
  return `hero-${state}`;
}

/** Altura (px, em relação ao centro do corpo) do marcador do bônus de esquiva perfeita. */
export const HERO_MARKER_OFFSET_Y = -19;

/**
 * Inclinação da arma da relíquia na mão (rad, 0 = lâmina para cima e para a frente; positivo
 * gira para baixo). Cada estado mostra um "gesto" diferente: armada, golpeando, recuperando.
 */
export const HERO_WEAPON_ANGLE: Readonly<Record<HeroState, number>> = {
  idle: -0.25,
  run: -0.55,
  jump: -0.9,
  fall: -0.1,
  roll: 0,
  windup: -1.9,
  swing: 0.85,
  recover: 0.5,
  hurt: -0.3,
  dead: 0,
};

/** Estados em que a arma some da mão (enrolado em bola, caído). */
export const HERO_WEAPON_HIDDEN: readonly HeroState[] = ['roll', 'dead'];

/** Ponto de empunhadura nos ícones de arma (fração do ícone; o cabo fica embaixo à esquerda). */
export const HERO_WEAPON_GRIP = { x: 0.12, y: 0.92 } as const;

/** O Tomo flutua ao lado do herói em vez de ser empunhado. */
export const HERO_TOME_FLOAT = { offsetX: -11, offsetY: -6, bobPx: 2, bobPeriodMs: 1400 } as const;
