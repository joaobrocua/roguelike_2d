/**
 * Poses e animações dos inimigos. O desenho é feito em código (src/systems/enemySprites.ts) a
 * partir destas poses, quadro a quadro; a arte final pode substituir as texturas mantendo os
 * mesmos nomes de quadros e animações (`<id>-<estado>`).
 *
 * Todos os quadros mostram o inimigo olhando para a direita (a cena espelha ao olhar para a
 * esquerda). O quadro é centrado no corpo de colisão: a folga é igual dos dois lados e em cima
 * e embaixo. Medidas em pixels do quadro; `bob` positivo = sobe.
 */
import type { EnemyAnimState } from '../logic/enemyAnim';

/** Todos os estados de animação, na ordem em que as animações são criadas. */
export const ENEMY_ANIM_STATES: readonly EnemyAnimState[] = [
  'idle',
  'walk',
  'jump',
  'windup',
  'strike',
  'recover',
  'hurt',
  'dead',
];

export interface EnemyAnimation {
  frames: readonly string[];
  fps: number;
  loop: boolean;
}

export interface EnemySheet<P> {
  /** Mesmo id de `src/data/enemies.ts` (é também a chave da textura). */
  id: string;
  /** Folga do quadro em volta do corpo de colisão (cada lado). */
  pad: { x: number; y: number };
  frames: readonly { name: string; pose: P }[];
  animations: Readonly<Record<EnemyAnimState, EnemyAnimation>>;
}

/** Velocidade (px/s) acima da qual o inimigo conta como "andando" na animação. */
export const ENEMY_WALK_THRESHOLD = 6;

/** Depois de morrer, o corpo fica um instante no chão e some devagar. */
export const ENEMY_DEATH_FADE = { holdMs: 650, fadeMs: 350 } as const;

/** A telegrafia do golpe pisca em laranja neste ritmo (um quadro de cada `period` fica laranja). */
export const ENEMY_WARN_FLICKER = { periodMs: 70, litEvery: 3 } as const;

// --- Carniçal ----------------------------------------------------------------------------

export interface GhoulPose {
  bob: number;
  /** Quanto o tronco e a cabeça avançam (+) ou recuam (-). */
  lean: number;
  /** Deslocamento do pé da frente e de trás em relação ao quadril, e quanto cada um sobe. */
  legF: number;
  legB: number;
  liftF: number;
  liftB: number;
  /** Mãos em relação ao ombro correspondente. */
  armF: { dx: number; dy: number };
  armB: { dx: number; dy: number };
  /** Boca aberta (rosnando). */
  mouth: boolean;
  /** Giro do corpo todo (rad), para cair para trás. */
  rotation: number;
  /** Olhos acesos mais forte (preparando o golpe). */
  glare: boolean;
}

const GHOUL_BASE: GhoulPose = {
  bob: 0,
  lean: 1,
  legF: 0,
  legB: 0,
  liftF: 0,
  liftB: 0,
  armF: { dx: 2, dy: 8 },
  armB: { dx: 0, dy: 8 },
  mouth: false,
  rotation: 0,
  glare: false,
};

const ghoul = (o: Partial<GhoulPose>): GhoulPose => ({ ...GHOUL_BASE, ...o });

export const CARNICAL_SHEET: EnemySheet<GhoulPose> = {
  id: 'carnical',
  pad: { x: 9, y: 4 },
  frames: [
    { name: 'idle0', pose: ghoul({}) },
    { name: 'idle1', pose: ghoul({ bob: 1, armF: { dx: 2, dy: 7 }, armB: { dx: 1, dy: 7 } }) },
    {
      name: 'walk0',
      pose: ghoul({
        lean: 2,
        legF: 3,
        legB: -3,
        liftB: 2,
        armF: { dx: 4, dy: 7 },
        armB: { dx: -2, dy: 8 },
      }),
    },
    { name: 'walk1', pose: ghoul({ lean: 2, bob: 1, legF: 1, legB: -1, armF: { dx: 3, dy: 8 } }) },
    {
      name: 'walk2',
      pose: ghoul({
        lean: 2,
        legF: -3,
        legB: 3,
        liftF: 2,
        armF: { dx: -1, dy: 8 },
        armB: { dx: 3, dy: 7 },
      }),
    },
    { name: 'walk3', pose: ghoul({ lean: 2, bob: 1, legF: -1, legB: 1, armF: { dx: 2, dy: 8 } }) },
    {
      name: 'windup0',
      pose: ghoul({
        lean: -1,
        armF: { dx: -3, dy: -5 },
        armB: { dx: -2, dy: 4 },
        mouth: true,
        glare: true,
      }),
    },
    {
      name: 'windup1',
      pose: ghoul({
        lean: -2,
        bob: 1,
        armF: { dx: -4, dy: -9 },
        armB: { dx: -3, dy: 2 },
        mouth: true,
        glare: true,
      }),
    },
    {
      name: 'strike',
      pose: ghoul({
        lean: 3,
        legF: 3,
        legB: -2,
        armF: { dx: 8, dy: 5 },
        armB: { dx: 2, dy: 6 },
        mouth: true,
        glare: true,
      }),
    },
    {
      name: 'recover',
      pose: ghoul({ lean: 3, bob: -1, armF: { dx: 5, dy: 9 }, armB: { dx: 2, dy: 9 } }),
    },
    {
      name: 'hurt',
      pose: ghoul({
        lean: -3,
        bob: 0,
        armF: { dx: -2, dy: -3 },
        armB: { dx: -3, dy: -1 },
        mouth: true,
      }),
    },
    {
      name: 'dead0',
      pose: ghoul({ lean: -3, rotation: -0.8, armF: { dx: -3, dy: 3 }, mouth: true }),
    },
    { name: 'dead1', pose: ghoul({ lean: 0, rotation: -Math.PI / 2, armF: { dx: 0, dy: 8 } }) },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1'], fps: 2.5, loop: true },
    walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 7, loop: true },
    jump: { frames: ['idle0'], fps: 1, loop: false },
    windup: { frames: ['windup0', 'windup1'], fps: 6, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 7, loop: false },
  },
};

// --- Arqueiro Oco ------------------------------------------------------------------------

export interface ArcherPose {
  bob: number;
  lean: number;
  legF: number;
  legB: number;
  liftF: number;
  liftB: number;
  /** Corda do arco: 0 = solta, 1 = esticada até o peito. */
  draw: number;
  /** A flecha está encaixada? */
  nocked: boolean;
  /** Altura (px) do arco em relação ao peito: negativo = levantado. */
  bowDy: number;
  /** A corda vibra logo depois de soltar. */
  twang: boolean;
  /** Barra do manto balançando (-1 a 1). */
  sway: number;
  rotation: number;
}

const ARCHER_BASE: ArcherPose = {
  bob: 0,
  lean: 0,
  legF: 0,
  legB: 0,
  liftF: 0,
  liftB: 0,
  draw: 0,
  nocked: false,
  bowDy: 2,
  twang: false,
  sway: 0,
  rotation: 0,
};

const archer = (o: Partial<ArcherPose>): ArcherPose => ({ ...ARCHER_BASE, ...o });

export const ARQUEIRO_SHEET: EnemySheet<ArcherPose> = {
  id: 'arqueiro',
  pad: { x: 9, y: 4 },
  frames: [
    { name: 'idle0', pose: archer({ sway: -1 }) },
    { name: 'idle1', pose: archer({ bob: 1, sway: 1 }) },
    { name: 'walk0', pose: archer({ legF: 3, legB: -3, liftB: 1, sway: -1 }) },
    { name: 'walk1', pose: archer({ bob: 1, legF: 1, legB: -1, sway: 0 }) },
    { name: 'walk2', pose: archer({ legF: -3, legB: 3, liftF: 1, sway: 1 }) },
    { name: 'walk3', pose: archer({ bob: 1, legF: -1, legB: 1, sway: 0 }) },
    { name: 'windup0', pose: archer({ draw: 0.35, nocked: true, bowDy: 0, lean: -1 }) },
    { name: 'windup1', pose: archer({ draw: 0.7, nocked: true, bowDy: -1, lean: -1, bob: 1 }) },
    { name: 'windup2', pose: archer({ draw: 1, nocked: true, bowDy: -1, lean: -2 }) },
    { name: 'strike', pose: archer({ draw: 0, bowDy: -1, lean: -2, twang: true }) },
    { name: 'recover', pose: archer({ draw: 0, bowDy: 4, lean: 0, sway: 1 }) },
    { name: 'hurt', pose: archer({ lean: -3, bowDy: 5, sway: -1 }) },
    { name: 'dead0', pose: archer({ lean: -3, rotation: -0.8, bowDy: 6 }) },
    { name: 'dead1', pose: archer({ rotation: -Math.PI / 2, bowDy: 8 }) },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1'], fps: 2.5, loop: true },
    walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 6, loop: true },
    jump: { frames: ['idle0'], fps: 1, loop: false },
    windup: { frames: ['windup0', 'windup1', 'windup2'], fps: 4.6, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 7, loop: false },
  },
};

// --- Vulto -------------------------------------------------------------------------------

export interface WraithPose {
  bob: number;
  /** Deslocamento da ponta da cauda de fiapos (px) e comprimento extra da cauda. */
  tailSway: number;
  tailLen: number;
  /** Inclinação do capuz para a frente (+) ou para trás (-). */
  lean: number;
  /** Achatamento (+) ou alongamento (-) do corpo, em px de altura. */
  squash: number;
  /** Olhos: 'normal', 'bright' (acesos mais forte), 'closed'. */
  eyes: 'normal' | 'bright' | 'closed';
  /** De cabeça para baixo (mergulho): a cauda fica em cima, como rastro. */
  inverted: boolean;
  /** Opacidade do desenho todo (a morte se desfaz). */
  alpha: number;
  /** Quantos fiapos soltos ao redor (a morte vira poeira). */
  scatter: number;
}

const WRAITH_BASE: WraithPose = {
  bob: 0,
  tailSway: 0,
  tailLen: 4,
  lean: 0,
  squash: 0,
  eyes: 'normal',
  inverted: false,
  alpha: 1,
  scatter: 0,
};

const wraith = (o: Partial<WraithPose>): WraithPose => ({ ...WRAITH_BASE, ...o });

export const VULTO_SHEET: EnemySheet<WraithPose> = {
  id: 'vulto',
  pad: { x: 8, y: 6 },
  frames: [
    { name: 'float0', pose: wraith({ bob: 1, tailSway: -2 }) },
    { name: 'float1', pose: wraith({ bob: 0, tailSway: 0, tailLen: 5 }) },
    { name: 'float2', pose: wraith({ bob: -1, tailSway: 2 }) },
    { name: 'float3', pose: wraith({ bob: 0, tailSway: 0, tailLen: 3 }) },
    { name: 'windup0', pose: wraith({ squash: 2, eyes: 'bright', tailLen: 2, lean: -1 }) },
    { name: 'windup1', pose: wraith({ squash: 3, eyes: 'bright', tailLen: 1, lean: -2, bob: -1 }) },
    {
      name: 'dive',
      pose: wraith({ squash: -4, eyes: 'bright', tailLen: 5, lean: 2, inverted: true }),
    },
    { name: 'recover', pose: wraith({ squash: -1, tailLen: 6, lean: 1, tailSway: 2 }) },
    { name: 'hurt', pose: wraith({ squash: 3, eyes: 'closed', tailLen: 2, lean: -2 }) },
    {
      name: 'dead0',
      pose: wraith({ squash: 4, eyes: 'closed', tailLen: 2, alpha: 0.7, scatter: 3 }),
    },
    {
      name: 'dead1',
      pose: wraith({ squash: 7, eyes: 'closed', tailLen: 0, alpha: 0.35, scatter: 6 }),
    },
  ],
  animations: {
    idle: { frames: ['float0', 'float1', 'float2', 'float3'], fps: 5, loop: true },
    walk: { frames: ['float0', 'float1', 'float2', 'float3'], fps: 8, loop: true },
    jump: { frames: ['float0'], fps: 1, loop: false },
    windup: { frames: ['windup0', 'windup1'], fps: 8, loop: true },
    strike: { frames: ['dive'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 7, loop: false },
  },
};

// --- Cão de Ossos ------------------------------------------------------------------------

export interface HoundPose {
  bob: number;
  /** O corpo abaixa (agachado para o bote), em px. */
  crouch: number;
  /** Cabeça avança (+) ou recua (-). */
  head: number;
  /** Altura da cabeça em relação ao normal (negativo = mais alta). */
  headDy: number;
  /** Deslocamento dos pés (frente e trás de cada par) em relação ao ombro/quadril. */
  frontA: number;
  frontB: number;
  hindA: number;
  hindB: number;
  /** Quanto cada par de patas sobe do chão. */
  liftFront: number;
  liftHind: number;
  /** Mandíbula aberta (px). */
  jaw: number;
  /** Rabo: altura da ponta (px; negativo = levantado). */
  tail: number;
  /** Corpo todo no ar (px acima do chão): o bote. */
  air: number;
  /** Ossos espalhados (a morte): 0 = inteiro. */
  scatter: number;
}

const HOUND_BASE: HoundPose = {
  bob: 0,
  crouch: 0,
  head: 0,
  headDy: 0,
  frontA: 0,
  frontB: 0,
  hindA: 0,
  hindB: 0,
  liftFront: 0,
  liftHind: 0,
  jaw: 0,
  tail: 2,
  air: 0,
  scatter: 0,
};

const hound = (o: Partial<HoundPose>): HoundPose => ({ ...HOUND_BASE, ...o });

export const CAO_SHEET: EnemySheet<HoundPose> = {
  id: 'cao',
  pad: { x: 9, y: 4 },
  frames: [
    { name: 'idle0', pose: hound({ head: 0 }) },
    { name: 'idle1', pose: hound({ head: 1, headDy: 1, bob: -1 }) },
    {
      name: 'run0',
      pose: hound({
        bob: 0,
        frontA: 4,
        frontB: -1,
        hindA: -4,
        hindB: 1,
        liftFront: 1,
        liftHind: 1,
        tail: 0,
      }),
    },
    {
      name: 'run1',
      pose: hound({
        bob: 1,
        frontA: 1,
        frontB: -4,
        hindA: -1,
        hindB: 4,
        liftFront: 2,
        liftHind: 2,
        tail: -1,
      }),
    },
    {
      name: 'run2',
      pose: hound({
        bob: 0,
        frontA: -2,
        frontB: 3,
        hindA: 3,
        hindB: -3,
        liftFront: 1,
        liftHind: 1,
        tail: 0,
      }),
    },
    {
      name: 'run3',
      pose: hound({
        bob: 1,
        frontA: 3,
        frontB: -1,
        hindA: -3,
        hindB: 2,
        liftFront: 2,
        liftHind: 2,
        tail: -1,
      }),
    },
    {
      name: 'windup0',
      pose: hound({ crouch: 3, head: -1, headDy: 2, jaw: 2, frontA: 1, hindA: -1, tail: -2 }),
    },
    {
      name: 'windup1',
      pose: hound({
        crouch: 4,
        head: -2,
        headDy: 3,
        jaw: 3,
        frontA: 2,
        hindA: -2,
        tail: -3,
        bob: -1,
      }),
    },
    {
      name: 'strike',
      pose: hound({
        air: 2,
        head: 3,
        headDy: 0,
        jaw: 3,
        frontA: 6,
        frontB: 4,
        hindA: -6,
        hindB: -4,
        liftFront: 2,
        liftHind: 2,
        tail: -2,
      }),
    },
    {
      name: 'recover',
      pose: hound({ crouch: 2, head: 1, headDy: 1, frontA: 2, hindA: -2, tail: 3 }),
    },
    {
      name: 'hurt',
      pose: hound({ head: -2, headDy: -2, jaw: 3, bob: 0, frontA: -2, hindA: 2, tail: -1 }),
    },
    { name: 'dead0', pose: hound({ crouch: 5, head: -2, headDy: 5, jaw: 2, scatter: 1 }) },
    { name: 'dead1', pose: hound({ crouch: 7, scatter: 3 }) },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1'], fps: 2.5, loop: true },
    walk: { frames: ['run0', 'run1', 'run2', 'run3'], fps: 11, loop: true },
    jump: { frames: ['strike'], fps: 1, loop: false },
    windup: { frames: ['windup0', 'windup1'], fps: 8, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 7, loop: false },
  },
};

// --- Lobo Espectral ----------------------------------------------------------------------

/** O lobo usa as mesmas poses do cão (correr, agachar, saltar); só o desenho muda. */
export const LOBO_SHEET: EnemySheet<HoundPose> = { ...CAO_SHEET, id: 'lobo', pad: { x: 9, y: 5 } };

// --- Raiz Emboscadora --------------------------------------------------------------------

export interface RootPose {
  /** Quanto do corpo já emergiu: 0 = só o monte de raízes, 1 = erguida por inteiro. */
  rise: number;
  /** Balanço dos cipós (de -3 a 3). */
  sway: number;
  /** Cipós puxados para trás, preparando o golpe: 0 = soltos, 1 = armados. */
  cock: number;
  /** O cipó da frente se estica num chicote de tantos px para frente. */
  lash: number;
  /** Núcleo: 0 = apagado, 1 = aceso, 2 = a mil (golpe a caminho). */
  core: 0 | 1 | 2;
  /** Murchando (a morte): 0 = viva, 1 = caída, 2 = seca. */
  wither: 0 | 1 | 2;
}

const ROOT_BASE: RootPose = { rise: 1, sway: 0, cock: 0, lash: 0, core: 1, wither: 0 };
const root = (o: Partial<RootPose>): RootPose => ({ ...ROOT_BASE, ...o });

export const RAIZ_SHEET: EnemySheet<RootPose> = {
  id: 'raiz',
  // Folga larga dos lados: o chicote se estica até 40 px para a frente do corpo
  pad: { x: 41, y: 15 },
  frames: [
    { name: 'idle0', pose: root({ rise: 0, core: 0 }) },
    { name: 'idle1', pose: root({ rise: 0, core: 0, sway: 1 }) },
    { name: 'rise0', pose: root({ rise: 0.35, core: 0, sway: 2 }) },
    { name: 'rise1', pose: root({ rise: 0.7, core: 1, sway: -2 }) },
    { name: 'rise2', pose: root({ rise: 1, core: 1, sway: 2 }) },
    { name: 'awake0', pose: root({ sway: -1 }) },
    { name: 'awake1', pose: root({ sway: 1 }) },
    { name: 'awake2', pose: root({ sway: 2 }) },
    { name: 'windup0', pose: root({ cock: 0.55, core: 2, sway: -1 }) },
    { name: 'windup1', pose: root({ cock: 1, core: 2, sway: -3 }) },
    { name: 'strike', pose: root({ lash: 32, core: 2, sway: 2 }) },
    { name: 'recover', pose: root({ rise: 0.75, lash: 6, core: 1, sway: 2 }) },
    { name: 'hurt', pose: root({ sway: -3, core: 0 }) },
    { name: 'dead0', pose: root({ rise: 0.55, core: 0, wither: 1 }) },
    { name: 'dead1', pose: root({ rise: 0.15, core: 0, wither: 2 }) },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1'], fps: 1.5, loop: true },
    walk: { frames: ['awake0', 'awake1', 'awake2', 'awake1'], fps: 6, loop: true },
    jump: { frames: ['rise0', 'rise1', 'rise2'], fps: 8, loop: false },
    windup: { frames: ['windup0', 'windup1'], fps: 8, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 5, loop: false },
  },
};

// --- Guardião Partido (chefe) ------------------------------------------------------------

export interface GuardianPose {
  bob: number;
  lean: number;
  legF: number;
  legB: number;
  liftF: number;
  liftB: number;
  /** Mãos em relação ao ombro correspondente. */
  armF: { dx: number; dy: number };
  armB: { dx: number; dy: number };
  /** Brilho das rachaduras e da fenda do elmo: 0 = apagado, 1 = normal, 2 = aceso. */
  glow: 0 | 1 | 2;
  rotation: number;
}

const GUARDIAN_BASE: GuardianPose = {
  bob: 0,
  lean: 0,
  legF: 0,
  legB: 0,
  liftF: 0,
  liftB: 0,
  armF: { dx: 0, dy: 12 },
  armB: { dx: 0, dy: 12 },
  glow: 1,
  rotation: 0,
};

const guardian = (o: Partial<GuardianPose>): GuardianPose => ({ ...GUARDIAN_BASE, ...o });

export const GUARDIAO_SHEET: EnemySheet<GuardianPose> = {
  id: 'guardiao',
  pad: { x: 6, y: 3 },
  frames: [
    { name: 'idle0', pose: guardian({}) },
    { name: 'idle1', pose: guardian({ bob: 1, armF: { dx: 0, dy: 11 }, armB: { dx: 0, dy: 11 } }) },
    {
      name: 'walk0',
      pose: guardian({
        legF: 3,
        legB: -3,
        liftB: 2,
        armF: { dx: -2, dy: 12 },
        armB: { dx: -2, dy: 12 },
      }),
    },
    { name: 'walk1', pose: guardian({ bob: 1, legF: 1, legB: -1 }) },
    {
      name: 'walk2',
      pose: guardian({
        legF: -3,
        legB: 3,
        liftF: 2,
        armF: { dx: 2, dy: 12 },
        armB: { dx: 2, dy: 12 },
      }),
    },
    { name: 'walk3', pose: guardian({ bob: 1, legF: -1, legB: 1 }) },
    {
      name: 'windup0',
      pose: guardian({ armF: { dx: 1, dy: 3 }, armB: { dx: 0, dy: 4 }, glow: 2 }),
    },
    {
      name: 'windup1',
      pose: guardian({ bob: 1, armF: { dx: 1, dy: -6 }, armB: { dx: 0, dy: -5 }, glow: 2 }),
    },
    {
      name: 'windup2',
      pose: guardian({ bob: 2, armF: { dx: 1, dy: -13 }, armB: { dx: 0, dy: -12 }, glow: 2 }),
    },
    {
      name: 'jump',
      pose: guardian({
        bob: 2,
        lean: 1,
        legF: 2,
        legB: -2,
        liftF: 4,
        liftB: 3,
        armF: { dx: 1, dy: 4 },
        armB: { dx: 0, dy: 3 },
        glow: 2,
      }),
    },
    {
      name: 'strike',
      pose: guardian({
        lean: 2,
        bob: -2,
        legF: 3,
        legB: -3,
        armF: { dx: 1, dy: 14 },
        armB: { dx: 1, dy: 13 },
        glow: 2,
      }),
    },
    {
      name: 'recover',
      pose: guardian({ lean: 2, bob: -2, armF: { dx: 1, dy: 13 }, armB: { dx: 1, dy: 12 } }),
    },
    {
      name: 'hurt',
      pose: guardian({ armF: { dx: -1, dy: 6 }, armB: { dx: -3, dy: 7 }, glow: 0 }),
    },
    {
      name: 'dead0',
      pose: guardian({
        bob: -4,
        rotation: 0,
        glow: 0,
        armF: { dx: 0, dy: 13 },
        armB: { dx: 0, dy: 13 },
      }),
    },
    {
      name: 'dead1',
      pose: guardian({
        bob: -9,
        rotation: 0,
        glow: 0,
        armF: { dx: 1, dy: 9 },
        armB: { dx: 1, dy: 9 },
      }),
    },
  ],
  animations: {
    idle: { frames: ['idle0', 'idle1'], fps: 1.8, loop: true },
    walk: { frames: ['walk0', 'walk1', 'walk2', 'walk3'], fps: 4.5, loop: true },
    jump: { frames: ['jump'], fps: 1, loop: false },
    windup: { frames: ['windup0', 'windup1', 'windup2'], fps: 4.5, loop: false },
    strike: { frames: ['strike'], fps: 1, loop: false },
    recover: { frames: ['recover'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    dead: { frames: ['dead0', 'dead1'], fps: 3, loop: false },
  },
};
