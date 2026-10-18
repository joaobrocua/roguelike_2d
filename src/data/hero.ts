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
  /**
   * Ângulo da arma na mão da frente (rad; 0 = apontando para cima, positivo gira para a frente e
   * para baixo, 1,57 = na horizontal para a frente). Sem valor, vale o do estado (HERO_WEAPON_ANGLE).
   */
  weaponAngle?: number;
  /**
   * Ângulo (rad) da arma ou do escudo da mão de trás (a segunda lâmina, o escudo). Sem valor, vale o
   * do estado (HERO_WEAPON_ANGLE) somado ao `restBias` do item.
   */
  offWeaponAngle?: number;
  /**
   * Armas de duas mãos: distância (px) ao longo do cabo, a partir da mão da frente, onde a mão de
   * trás segura (positivo = rumo à ponta, negativo = rumo à base). Sem valor, o braço de trás fica
   * solto no ângulo `armBack`.
   */
  backHold?: number;
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
  | 'idle'
  | 'run'
  | 'jump'
  | 'apex'
  | 'fall'
  | 'land'
  | 'roll'
  | 'windup'
  | 'swing'
  | 'recover'
  | 'hurt'
  | 'dead';

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

/**
 * Estilos de golpe: cada arma escolhe um por golpe do combo (src/data/weapons.ts). Todos têm 7
 * quadros: 2 de preparação, 3 de golpe (o arco da arma) e 2 de recuperação, e o jogo escolhe o
 * quadro pelo andamento da fase (os golpes são rápidos: cada quadro dura poucos milissegundos).
 * 'slashA' é o corte de cima para baixo com uma mão; 'slashB', o contra-golpe de baixo para cima;
 * 'thrust' e 'lunge', a estocada com duas mãos e com uma; 'overhead', a pancada pesada de cima;
 * 'sweep', o varrido largo; 'bow', o arco; 'cast', o gesto de conjurar; 'dual', o corte cruzado
 * com duas lâminas; 'guard', a guarda com o escudo à frente (também o golpe de escudo); 'crossbow',
 * a mira da besta, com as duas mãos.
 */
export type AttackStyle =
  | 'slashA'
  | 'slashB'
  | 'thrust'
  | 'lunge'
  | 'overhead'
  | 'sweep'
  | 'bow'
  | 'cast'
  | 'dual'
  | 'guard'
  | 'crossbow';

export const ATTACK_STYLES: readonly AttackStyle[] = [
  'slashA',
  'slashB',
  'thrust',
  'lunge',
  'overhead',
  'sweep',
  'bow',
  'cast',
  'dual',
  'guard',
  'crossbow',
];

/** Nomes dos quadros de cada fase de um estilo, na ordem em que tocam. */
export interface AttackSet {
  windup: readonly string[];
  swing: readonly string[];
  recover: readonly string[];
}

/** Um quadro-chave de um golpe: braço da frente e de trás, inclinação, passada e ângulo da arma. */
interface AttackKey {
  arm: number;
  back: number;
  lean: number;
  stride: number;
  weapon: number;
  bob?: number;
  /** Duas mãos: onde a mão de trás segura (ver HeroPose.backHold). */
  hold?: number;
  /** Arma ou escudo da mão de trás (ver HeroPose.offWeaponAngle). */
  off?: number;
  cape?: number;
}

const ATTACK_KEYS: Readonly<
  Record<AttackStyle, { windup: AttackKey[]; swing: AttackKey[]; recover: AttackKey[] }>
> = {
  slashA: {
    windup: [
      { arm: -1.2, back: 1.9, lean: 0, stride: -0.1, weapon: -0.2 },
      { arm: -2.0, back: 1.8, lean: -1, stride: -0.3, weapon: -0.9 },
    ],
    swing: [
      { arm: -1.0, back: 2.0, lean: 0, stride: 0.1, weapon: 0.6, cape: 12 },
      { arm: -0.2, back: 2.1, lean: 1, stride: 0.4, weapon: 1.45, cape: 14 },
      { arm: 0.5, back: 2.2, lean: 2, stride: 0.5, weapon: 2.2, cape: 14 },
    ],
    recover: [
      { arm: 0.9, back: 2.0, lean: 2, stride: 0.3, weapon: 2.1 },
      { arm: 1.1, back: 1.8, lean: 1, stride: 0.1, weapon: 1.2 },
    ],
  },
  slashB: {
    windup: [
      { arm: 0.9, back: 1.6, lean: 1, stride: 0.2, weapon: 2.0 },
      { arm: 0.6, back: 1.8, lean: 0, stride: 0, weapon: 1.7 },
    ],
    swing: [
      { arm: 0.2, back: 2.0, lean: 1, stride: 0.2, weapon: 1.2, cape: 12 },
      { arm: -0.5, back: 2.2, lean: 1, stride: 0.4, weapon: 0.3, cape: 14 },
      { arm: -1.2, back: 2.3, lean: 0, stride: 0.3, weapon: -0.7, cape: 14 },
    ],
    recover: [
      { arm: -1.5, back: 2.0, lean: 0, stride: 0.1, weapon: -0.9 },
      { arm: -0.6, back: 1.8, lean: 0, stride: 0, weapon: -0.2 },
    ],
  },
  thrust: {
    windup: [
      { arm: 1.2, back: 1.8, lean: -1, stride: -0.2, weapon: 1.45, hold: -7 },
      { arm: 2.6, back: 1.8, lean: -2, stride: -0.4, weapon: 1.5, hold: -7 },
    ],
    swing: [
      { arm: 0.6, back: 1.8, lean: 1, stride: 0.3, weapon: 1.55, hold: -7, cape: 12 },
      { arm: 0.05, back: 1.8, lean: 2, stride: 0.6, weapon: 1.57, hold: -7, cape: 14 },
      { arm: -0.05, back: 1.8, lean: 3, stride: 0.6, weapon: 1.57, hold: -7, cape: 14 },
    ],
    recover: [
      { arm: 0.3, back: 1.8, lean: 2, stride: 0.4, weapon: 1.5, hold: -7 },
      { arm: 0.8, back: 1.8, lean: 1, stride: 0.1, weapon: 1.3, hold: -7 },
    ],
  },
  lunge: {
    windup: [
      { arm: 1.2, back: 1.0, lean: -1, stride: -0.2, weapon: 1.45 },
      { arm: 2.6, back: 0.4, lean: -2, stride: -0.4, weapon: 1.5 },
    ],
    swing: [
      { arm: 0.6, back: 0.8, lean: 1, stride: 0.3, weapon: 1.55, cape: 12 },
      { arm: 0.05, back: 1.0, lean: 2, stride: 0.6, weapon: 1.57, cape: 14 },
      { arm: -0.05, back: 1.2, lean: 3, stride: 0.6, weapon: 1.57, cape: 14 },
    ],
    recover: [
      { arm: 0.3, back: 1.4, lean: 2, stride: 0.4, weapon: 1.5 },
      { arm: 0.8, back: 1.6, lean: 1, stride: 0.1, weapon: 1.3 },
    ],
  },
  overhead: {
    windup: [
      { arm: -1.0, back: -0.8, lean: 0, stride: -0.1, weapon: -0.1, hold: 6 },
      { arm: -2.3, back: -1.9, lean: -2, stride: -0.3, weapon: -0.6, hold: 6, bob: -1 },
    ],
    swing: [
      { arm: -1.3, back: -1.0, lean: -1, stride: 0.1, weapon: 0.5, hold: 6, cape: 12 },
      { arm: -0.1, back: 0.1, lean: 1, stride: 0.4, weapon: 1.6, hold: 6, cape: 14 },
      { arm: 0.8, back: 0.9, lean: 3, stride: 0.5, weapon: 2.7, hold: 6, bob: -1, cape: 14 },
    ],
    recover: [
      { arm: 1.0, back: 1.1, lean: 3, stride: 0.4, weapon: 2.8, hold: 6, bob: -1 },
      { arm: 1.1, back: 1.3, lean: 2, stride: 0.2, weapon: 2.2, hold: 6 },
    ],
  },
  sweep: {
    windup: [
      { arm: 1.6, back: 1.4, lean: -1, stride: -0.2, weapon: 0.9, hold: -6 },
      { arm: 2.5, back: 2.0, lean: -2, stride: -0.4, weapon: 0.2, hold: -6 },
    ],
    swing: [
      { arm: 1.5, back: 1.6, lean: 0, stride: 0.1, weapon: 0.8, hold: -6, cape: 12 },
      { arm: 0.8, back: 1.2, lean: 1, stride: 0.4, weapon: 1.5, hold: -6, cape: 14 },
      { arm: 0.3, back: 0.9, lean: 2, stride: 0.5, weapon: 2.1, hold: -6, cape: 14 },
    ],
    recover: [
      { arm: 0.5, back: 1.0, lean: 2, stride: 0.3, weapon: 2.2, hold: -6 },
      { arm: 0.9, back: 1.3, lean: 1, stride: 0.1, weapon: 1.5, hold: -6 },
    ],
  },
  bow: {
    windup: [
      { arm: -0.05, back: 0.6, lean: 0, stride: 0, weapon: 0 },
      { arm: -0.05, back: 3.0, lean: -1, stride: -0.1, weapon: 0 },
    ],
    swing: [
      { arm: -0.05, back: 2.8, lean: 0, stride: 0, weapon: 0, cape: 12 },
      { arm: 0, back: 2.2, lean: 1, stride: 0.1, weapon: 0.05, cape: 13 },
      { arm: 0.05, back: 1.6, lean: 1, stride: 0.1, weapon: 0.08, cape: 13 },
    ],
    recover: [
      { arm: 0.1, back: 1.4, lean: 1, stride: 0, weapon: 0.1 },
      { arm: 0.6, back: 1.6, lean: 0, stride: 0, weapon: 0.2 },
    ],
  },
  cast: {
    windup: [
      { arm: -0.8, back: 1.9, lean: 0, stride: 0, weapon: 0 },
      { arm: -1.3, back: 2.0, lean: -1, stride: -0.1, weapon: 0, bob: 1 },
    ],
    swing: [
      { arm: -0.5, back: 2.0, lean: 0, stride: 0, weapon: 0, cape: 13 },
      { arm: -0.1, back: 2.1, lean: 1, stride: 0.1, weapon: 0, cape: 14 },
      { arm: 0.05, back: 2.1, lean: 1, stride: 0.1, weapon: 0, cape: 14 },
    ],
    recover: [
      { arm: 0.5, back: 1.9, lean: 1, stride: 0, weapon: 0 },
      { arm: 0.9, back: 1.8, lean: 0, stride: 0, weapon: 0 },
    ],
  },
  dual: {
    windup: [
      { arm: -1.2, back: -1.0, lean: 0, stride: -0.1, weapon: -0.2, off: -0.1 },
      { arm: -2.0, back: -1.8, lean: -1, stride: -0.3, weapon: -0.9, off: -0.7 },
    ],
    swing: [
      { arm: -0.9, back: -0.7, lean: 0, stride: 0.1, weapon: 0.7, off: 0.9, cape: 12 },
      { arm: -0.1, back: 0.1, lean: 1, stride: 0.4, weapon: 1.5, off: 1.6, cape: 14 },
      { arm: 0.6, back: 0.7, lean: 2, stride: 0.5, weapon: 2.3, off: 2.4, cape: 14 },
    ],
    recover: [
      { arm: 1.0, back: 1.1, lean: 2, stride: 0.3, weapon: 2.1, off: 2.2 },
      { arm: 1.2, back: 1.3, lean: 1, stride: 0.1, weapon: 1.2, off: 1.3 },
    ],
  },
  guard: {
    windup: [
      { arm: 1.3, back: 0.6, lean: 0, stride: 0, weapon: 0.2, off: 0 },
      { arm: 1.2, back: -0.1, lean: 1, stride: 0.1, weapon: 0.3, off: 0 },
    ],
    swing: [
      { arm: 1.2, back: -0.2, lean: 1, stride: 0.1, weapon: 0.3, off: 0, cape: 12 },
      { arm: 1.2, back: -0.25, lean: 2, stride: 0.2, weapon: 0.3, off: 0, cape: 13 },
      { arm: 1.2, back: -0.2, lean: 1, stride: 0.1, weapon: 0.3, off: 0, cape: 12 },
    ],
    recover: [
      { arm: 1.3, back: 0.4, lean: 1, stride: 0, weapon: 0.3, off: 0 },
      { arm: 1.35, back: 1.0, lean: 0, stride: 0, weapon: 0.4, off: 0 },
    ],
  },
  crossbow: {
    windup: [
      { arm: -0.3, back: 0.3, lean: 0, stride: 0, weapon: 1.5, hold: -5 },
      { arm: -0.15, back: 0.2, lean: -1, stride: -0.1, weapon: 1.55, hold: -5 },
    ],
    swing: [
      { arm: -0.1, back: 0.2, lean: -1, stride: 0, weapon: 1.5, hold: -5, cape: 12 },
      { arm: -0.1, back: 0.2, lean: -2, stride: 0, weapon: 1.45, hold: -5, cape: 13 },
      { arm: 0, back: 0.2, lean: -1, stride: 0, weapon: 1.4, hold: -5, cape: 13 },
    ],
    recover: [
      { arm: 0.4, back: 0.7, lean: 0, stride: 0, weapon: 1.0, hold: -5 },
      { arm: 0.9, back: 1.1, lean: 0, stride: 0, weapon: 0.6, hold: -5 },
    ],
  },
};

const PHASE_LETTER = { windup: 'w', swing: 's', recover: 'r' } as const;

function attackPose(key: AttackKey): HeroPose {
  return pose({
    bob: key.bob ?? 0,
    lean: key.lean,
    stride: key.stride,
    armFront: key.arm,
    armBack: key.back,
    capeLen: key.cape ?? 11,
    capeAmp: key.cape ? 2 : 1,
    weaponAngle: key.weapon,
    backHold: key.hold,
    offWeaponAngle: key.off,
  });
}

/** Os quadros de todos os estilos de golpe (7 por estilo) e os nomes de cada fase. */
const ATTACK_FRAMES: HeroFrame[] = [];
export const HERO_ATTACK_SETS = {} as Record<AttackStyle, AttackSet>;
for (const style of ATTACK_STYLES) {
  const keys = ATTACK_KEYS[style];
  const set: AttackSet = { windup: [], swing: [], recover: [] };
  for (const phase of ['windup', 'swing', 'recover'] as const) {
    keys[phase].forEach((key, i) => {
      const name = `${style}-${PHASE_LETTER[phase]}${i}`;
      ATTACK_FRAMES.push({ name, pose: attackPose(key) });
      (set[phase] as string[]).push(name);
    });
  }
  HERO_ATTACK_SETS[style] = set;
}

export const HERO_FRAMES: readonly HeroFrame[] = [
  ...idleFrames(),
  ...runFrames(),
  {
    name: 'jump-0',
    pose: pose({ legs: 'jump', armFront: -0.9, armBack: -0.3, capeLen: 12, capeAmp: 1.5, lean: 1 }),
  },
  {
    name: 'jump-1',
    pose: pose({ legs: 'jump', armFront: -0.5, armBack: 0.1, capeLen: 10, capeAmp: 1.5, lean: 1 }),
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
  {
    name: 'land-0',
    pose: pose({
      bob: -2,
      lean: 1,
      armFront: 0.9,
      armBack: 1.2,
      capeLen: 12,
      capeAmp: 2,
      capePhase: 0.5,
    }),
  },
  ...rollFrames(),
  ...ATTACK_FRAMES,
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
  { state: 'apex', frames: ['jump-1'], fps: 1, loop: false },
  { state: 'fall', frames: ['fall-0'], fps: 1, loop: false },
  { state: 'land', frames: ['land-0'], fps: 1, loop: false },
  { state: 'roll', frames: names('roll', 4), fps: 18, loop: true },
  // Os golpes escolhem o quadro pelo andamento da fase (HERO_ATTACK_SETS); estes são o reserva.
  { state: 'windup', frames: ['slashA-w0'], fps: 1, loop: false },
  { state: 'swing', frames: ['slashA-s1'], fps: 1, loop: false },
  { state: 'recover', frames: ['slashA-r0'], fps: 1, loop: false },
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
 * Ângulo da arma na mão fora dos golpes (rad; 0 = para cima, positivo gira para a frente e para
 * baixo). Nos golpes, cada quadro traz o seu (HeroPose.weaponAngle). Cada arma soma o seu
 * `restBias` (src/data/weapons.ts): a lança vai mais em pé, a adaga mais à frente.
 */
export const HERO_WEAPON_ANGLE: Readonly<Record<HeroState, number>> = {
  idle: 0.45,
  run: 0.9,
  jump: -0.3,
  apex: 0.2,
  fall: 0.75,
  land: 0.95,
  roll: 0,
  windup: -0.6,
  swing: 1.5,
  recover: 2.1,
  hurt: -0.7,
  dead: 0,
};

/** Quanto a arma balança (rad) ao correr e parada, e a velocidade do balanço (ms por volta). */
export const HERO_WEAPON_SWAY = {
  run: 0.12,
  idle: 0.04,
  runPeriodMs: 330,
  idlePeriodMs: 1600,
} as const;

/** Estados em que a arma some da mão (enrolado em bola, caído). */
export const HERO_WEAPON_HIDDEN: readonly HeroState[] = ['roll', 'dead'];

/** O Tomo flutua ao lado do herói em vez de ser empunhado. */
export const HERO_TOME_FLOAT = { offsetX: -11, offsetY: -6, bobPx: 2, bobPeriodMs: 1400 } as const;

/** Velocidade vertical (px/s) abaixo da qual, no ar, o herói está no ponto mais alto do pulo. */
export const HERO_APEX_THRESHOLD = 55;

/** Quanto tempo (ms) o quadro de pouso dura depois de tocar o chão vindo de uma queda. */
export const HERO_LAND_MS = 90;

/** Queda mínima (px/s de velocidade vertical ao pousar) para o herói se agachar no pouso. */
export const HERO_LAND_MIN_SPEED = 160;

const POSE_BY_NAME: ReadonlyMap<string, HeroPose> = new Map(
  HERO_FRAMES.map((frame) => [frame.name, frame.pose]),
);

/** Pose (quadro) de cada nome, para consultar o ângulo da arma e outros dados por quadro. */
export function heroFramePose(name: string): HeroPose | undefined {
  return POSE_BY_NAME.get(name);
}

/** Opacidade de cada imagem do rastro da arma durante o golpe (da mais recente à mais antiga). */
export const HERO_WEAPON_TRAIL = [0.38, 0.24, 0.12] as const;
