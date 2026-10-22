/**
 * Os mini-chefes: um por área, numa sala própria antes do arco de saída (a saída só abre depois que
 * ele cai). Usam a mesma máquina de chefe do Guardião (src/logic/ai/boss.ts) com números e golpes
 * próprios: 'slam' é a pancada de perto, 'lunge' a investida e 'quake' a onda no chão da fase 2.
 * Tempos em ms, velocidades em px/s, distâncias em px.
 */
import type { BiomeId } from './mapRules';
import type { BossAttack, BossDef, RageSpec } from './boss';
import type { BossConfig } from '../logic/ai/boss';
import { PALETTE } from './palette';

export type MiniBossId =
  'ent' | 'saporei' | 'coveiro' | 'matriz' | 'carrasco' | 'gargula' | 'condessa';

/** Ent Apodrecido, da Floresta: lento, pesado e de golpes longos; na fase 2 as raízes brotam do chão. */
export const ENT_APODRECIDO = {
  id: 'ent',
  name: 'O Ent Apodrecido',
  width: 28,
  height: 44,
  maxHp: 150,
  hitStunMs: 90,
  knockbackFriction: 800,
  knockbackScale: 0.3,
  color: PALETTE.venom,
  rage: { color: 0xb9d83a, emberColor: 0xe8892d, embersPerSecond: 12 },
  flying: false,
  meleeShape: 'front',
  attack: {
    windupMs: 700,
    activeMs: 140,
    recoveryMs: 650,
    damage: 16,
    knockbackX: 200,
    knockbackY: -130,
    hitbox: { width: 50, height: 40, offsetY: 0 },
  },
  attacks: {
    // Pancada de galho: telegrafia longa
    slam: {
      shape: 'front',
      attack: {
        windupMs: 700,
        activeMs: 140,
        recoveryMs: 650,
        damage: 16,
        knockbackX: 200,
        knockbackY: -130,
        hitbox: { width: 50, height: 40, offsetY: 0 },
      },
    },
    // Investida do tronco
    lunge: {
      shape: 'front',
      attack: {
        windupMs: 520,
        activeMs: 340,
        recoveryMs: 560,
        damage: 13,
        knockbackX: 180,
        knockbackY: -100,
        hitbox: { width: 36, height: 32, offsetY: 4 },
      },
    },
    // Raízes que brotam no chão em volta (fase 2)
    quake: {
      shape: 'around',
      attack: {
        windupMs: 850,
        activeMs: 220,
        recoveryMs: 750,
        damage: 17,
        knockbackX: 130,
        knockbackY: -190,
        hitbox: { width: 130, height: 22, offsetY: 0 },
      },
    },
  },
  ai: {
    walkSpeed: 30,
    phase2SpeedMult: 1.4,
    phase2Threshold: 0.5,
    closeRangeX: 52,
    midRangeX: 120,
    attackCooldownMs: 900,
    phase2CooldownMult: 0.6,
    lungeSpeed: 170,
    quakeChance: 0.4,
    introMs: 1400,
    phaseChangeMs: 1000,
    hopVelocity: -340,
    hopSpeed: 60,
    climbVelocity: -420,
    climbSpeed: 80,
    climbMinDy: 52,
    climbRangeX: 120,
    leapVelocity: -280,
    leapSpeed: 150,
    leapMinDx: 160,
    leapCooldownMs: 3800,
    jumpCooldownMs: 700,
  },
} as const satisfies BossDef;

/** Rei dos Charcos, do Pântano: um sapo imenso que salta em cima do herói; na fase 2 a barrigada abala o chão. */
export const REI_DOS_CHARCOS = {
  id: 'saporei',
  name: 'O Rei dos Charcos',
  width: 32,
  height: 28,
  maxHp: 130,
  hitStunMs: 80,
  knockbackFriction: 800,
  knockbackScale: 0.3,
  color: PALETTE.venom,
  rage: { color: 0x9be84a, emberColor: 0xe8f06b, embersPerSecond: 12 },
  flying: false,
  meleeShape: 'front',
  attack: {
    windupMs: 520,
    activeMs: 130,
    recoveryMs: 520,
    damage: 14,
    knockbackX: 200,
    knockbackY: -140,
    hitbox: { width: 44, height: 30, offsetY: 0 },
  },
  attacks: {
    // Língua e patada de perto
    slam: {
      shape: 'front',
      attack: {
        windupMs: 520,
        activeMs: 130,
        recoveryMs: 520,
        damage: 14,
        knockbackX: 200,
        knockbackY: -140,
        hitbox: { width: 44, height: 30, offsetY: 0 },
      },
    },
    // Bote: avança durante o golpe
    lunge: {
      shape: 'front',
      attack: {
        windupMs: 400,
        activeMs: 380,
        recoveryMs: 500,
        damage: 13,
        knockbackX: 190,
        knockbackY: -100,
        hitbox: { width: 36, height: 28, offsetY: 2 },
      },
    },
    // Barrigada: onda no chão em volta (fase 2)
    quake: {
      shape: 'around',
      attack: {
        windupMs: 700,
        activeMs: 200,
        recoveryMs: 650,
        damage: 16,
        knockbackX: 150,
        knockbackY: -200,
        hitbox: { width: 150, height: 22, offsetY: 0 },
      },
    },
  },
  ai: {
    walkSpeed: 30,
    phase2SpeedMult: 1.5,
    phase2Threshold: 0.5,
    closeRangeX: 44,
    midRangeX: 150,
    attackCooldownMs: 700,
    phase2CooldownMult: 0.55,
    lungeSpeed: 210,
    quakeChance: 0.4,
    introMs: 1300,
    phaseChangeMs: 1000,
    hopVelocity: -340,
    hopSpeed: 80,
    climbVelocity: -430,
    climbSpeed: 90,
    climbMinDy: 52,
    climbRangeX: 130,
    // O sapo vive saltando: salta de mais perto e com mais frequência que os outros chefes
    leapVelocity: -330,
    leapSpeed: 200,
    leapMinDx: 90,
    leapCooldownMs: 1700,
    jumpCooldownMs: 600,
  },
} as const satisfies BossDef;

/** Números de um golpe de mini-chefe: tempos, dano e caixa (o empurrão sai do dano). */
interface MoveSpec {
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  damage: number;
  width: number;
  height: number;
  offsetY?: number;
  /** Empurrão horizontal e vertical (px/s); sem valor, usa o padrão do tipo de golpe. */
  knockbackX?: number;
  knockbackY?: number;
}

function move(m: MoveSpec, kx: number, ky: number): BossAttack {
  return {
    shape: 'front',
    attack: {
      windupMs: m.windupMs,
      activeMs: m.activeMs,
      recoveryMs: m.recoveryMs,
      damage: m.damage,
      knockbackX: m.knockbackX ?? kx,
      knockbackY: m.knockbackY ?? ky,
      hitbox: { width: m.width, height: m.height, offsetY: m.offsetY ?? 0 },
    },
  };
}

/** Os três golpes de um mini-chefe: pancada, investida e a onda no chão (que acerta em volta). */
function moves(slam: MoveSpec, lunge: MoveSpec, quake: MoveSpec): BossDef['attacks'] {
  return {
    slam: move(slam, 210, -135),
    lunge: move(lunge, 190, -100),
    quake: { ...move(quake, 140, -195), shape: 'around' },
  };
}

/** O comportamento padrão de um mini-chefe: o que muda de um para outro entra em `over`. */
function ai(over: Partial<BossConfig>): BossConfig {
  return {
    walkSpeed: 32,
    phase2SpeedMult: 1.45,
    phase2Threshold: 0.5,
    closeRangeX: 52,
    midRangeX: 125,
    attackCooldownMs: 850,
    phase2CooldownMult: 0.58,
    lungeSpeed: 180,
    quakeChance: 0.4,
    introMs: 1400,
    phaseChangeMs: 1000,
    hopVelocity: -340,
    hopSpeed: 70,
    climbVelocity: -430,
    climbSpeed: 85,
    climbMinDy: 52,
    climbRangeX: 125,
    leapVelocity: -290,
    leapSpeed: 160,
    leapMinDx: 165,
    leapCooldownMs: 3600,
    jumpCooldownMs: 650,
    ...over,
  };
}

/** Corpo comum dos mini-chefes: quase não se abalam com os golpes (como o Guardião). */
function body(
  id: string,
  name: string,
  width: number,
  height: number,
  maxHp: number,
  color: number,
  rage: RageSpec,
  attacks: BossDef['attacks'],
  config: BossConfig,
): BossDef {
  return {
    id,
    name,
    width,
    height,
    maxHp,
    hitStunMs: 85,
    knockbackFriction: 800,
    knockbackScale: 0.3,
    color,
    rage,
    flying: false,
    meleeShape: 'front',
    attack: attacks.slam.attack,
    attacks,
    ai: config,
  };
}

/** Coveiro Insone, do Cemitério: gigante de pá enferrujada; a pá racha o chão em volta na fase 2. */
export const COVEIRO_INSONE: BossDef = body(
  'coveiro',
  'O Coveiro Insone',
  30,
  44,
  170,
  PALETTE.mist,
  { color: 0x9ec8ff, emberColor: 0xe8f6fa, embersPerSecond: 11 },
  moves(
    { windupMs: 650, activeMs: 140, recoveryMs: 600, damage: 17, width: 52, height: 40 },
    {
      windupMs: 480,
      activeMs: 340,
      recoveryMs: 520,
      damage: 14,
      width: 36,
      height: 32,
      offsetY: 4,
    },
    { windupMs: 820, activeMs: 220, recoveryMs: 720, damage: 18, width: 140, height: 22 },
  ),
  ai({ walkSpeed: 34, closeRangeX: 54, lungeSpeed: 180 }),
);

/** Matriz de Cristal, das Minas: bloco vivo de cristal; rola contra o herói e faz brotar cristais. */
export const MATRIZ_DE_CRISTAL: BossDef = body(
  'matriz',
  'A Matriz de Cristal',
  34,
  38,
  180,
  PALETTE.player,
  { color: 0x7fe8ff, emberColor: 0xe8f6fa, embersPerSecond: 16 },
  moves(
    { windupMs: 700, activeMs: 130, recoveryMs: 650, damage: 17, width: 50, height: 38 },
    {
      windupMs: 560,
      activeMs: 360,
      recoveryMs: 560,
      damage: 14,
      width: 38,
      height: 30,
      offsetY: 4,
    },
    { windupMs: 750, activeMs: 220, recoveryMs: 700, damage: 19, width: 150, height: 22 },
  ),
  ai({ walkSpeed: 26, closeRangeX: 50, quakeChance: 0.5, lungeSpeed: 200 }),
);

/** Carrasco em Chamas, da Vila: gigante encapuzado de machado em brasa; golpes rápidos e secos. */
export const CARRASCO_EM_CHAMAS: BossDef = body(
  'carrasco',
  'O Carrasco em Chamas',
  28,
  46,
  190,
  PALETTE.ember,
  { color: 0xff6a1a, emberColor: 0xffc46b, embersPerSecond: 20 },
  moves(
    { windupMs: 600, activeMs: 130, recoveryMs: 560, damage: 18, width: 54, height: 42 },
    {
      windupMs: 460,
      activeMs: 330,
      recoveryMs: 500,
      damage: 15,
      width: 36,
      height: 32,
      offsetY: 4,
    },
    { windupMs: 800, activeMs: 200, recoveryMs: 700, damage: 19, width: 130, height: 22 },
  ),
  ai({
    walkSpeed: 36,
    phase2SpeedMult: 1.5,
    closeRangeX: 56,
    midRangeX: 130,
    attackCooldownMs: 800,
  }),
);

/** Górgola Rachada, das Muralhas: estátua alada que salta de muralha em muralha em cima do herói. */
export const GORGOLA_RACHADA: BossDef = body(
  'gargula',
  'A Górgola Rachada',
  34,
  34,
  200,
  PALETTE.stoneLight,
  { color: 0xff4a3a, emberColor: 0xe8892d, embersPerSecond: 12 },
  moves(
    { windupMs: 520, activeMs: 120, recoveryMs: 520, damage: 17, width: 44, height: 34 },
    {
      windupMs: 420,
      activeMs: 380,
      recoveryMs: 480,
      damage: 15,
      width: 38,
      height: 30,
      offsetY: 2,
    },
    { windupMs: 720, activeMs: 200, recoveryMs: 650, damage: 19, width: 150, height: 22 },
  ),
  ai({
    phase2SpeedMult: 1.5,
    closeRangeX: 46,
    midRangeX: 150,
    attackCooldownMs: 750,
    lungeSpeed: 210,
    leapVelocity: -340,
    leapSpeed: 210,
    leapMinDx: 100,
    leapCooldownMs: 1600,
    jumpCooldownMs: 600,
  }),
);

/** Condessa Pálida, dos Salões: dama de vestido rasgado, rápida; o grito na fase 2 abala o salão. */
export const CONDESSA_PALIDA: BossDef = body(
  'condessa',
  'A Condessa Pálida',
  24,
  42,
  220,
  PALETTE.wraith,
  { color: 0xb36bff, emberColor: 0xe0b8ff, embersPerSecond: 14 },
  moves(
    { windupMs: 480, activeMs: 120, recoveryMs: 500, damage: 18, width: 46, height: 38 },
    {
      windupMs: 380,
      activeMs: 360,
      recoveryMs: 460,
      damage: 16,
      width: 36,
      height: 30,
      offsetY: 4,
    },
    { windupMs: 700, activeMs: 200, recoveryMs: 650, damage: 20, width: 150, height: 22 },
  ),
  ai({
    walkSpeed: 44,
    phase2SpeedMult: 1.6,
    closeRangeX: 50,
    midRangeX: 140,
    attackCooldownMs: 650,
    lungeSpeed: 230,
    quakeChance: 0.45,
    leapVelocity: -320,
    leapSpeed: 200,
    leapMinDx: 130,
    leapCooldownMs: 2400,
  }),
);

export const MINI_BOSSES: Readonly<Record<MiniBossId, BossDef>> = {
  ent: ENT_APODRECIDO,
  saporei: REI_DOS_CHARCOS,
  coveiro: COVEIRO_INSONE,
  matriz: MATRIZ_DE_CRISTAL,
  carrasco: CARRASCO_EM_CHAMAS,
  gargula: GORGOLA_RACHADA,
  condessa: CONDESSA_PALIDA,
};

/** Qual mini-chefe guarda a saída de cada área (a última área tem o Guardião e não entra aqui). */
export const BIOME_MINIBOSS: Readonly<Partial<Record<BiomeId, MiniBossId>>> = {
  floresta: 'ent',
  pantano: 'saporei',
  cemiterio: 'coveiro',
  minas: 'matriz',
  vila: 'carrasco',
  muralhas: 'gargula',
  saloes: 'condessa',
};

/** O momento em que um mini-chefe cai: câmera lenta e tremor curtos. */
export const MINIBOSS_FX = { slowMoMs: 650, shakeMs: 320, shakeIntensity: 0.01 } as const;
