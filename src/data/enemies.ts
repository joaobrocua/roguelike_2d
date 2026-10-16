/**
 * Inimigos dos andares 1 a 3. Cada um define corpo, vida, ataque e os parâmetros da sua IA.
 * Tempos em ms, velocidades em px/s, distâncias em px. O chefe entra na etapa 5.
 */
import type { AmbusherConfig } from '../logic/ai/ambusher';
import type { FlyerConfig } from '../logic/ai/flyer';
import type { GroundMeleeConfig } from '../logic/ai/groundMelee';
import type { HopperConfig } from '../logic/ai/hopper';
import type { GuardConfig } from '../logic/shield';
import type { RangedConfig } from '../logic/ai/ranged';
import type { StraferConfig } from '../logic/ai/strafer';
import type { AttackConfig, ProjectileData } from '../logic/attack';
import { PALETTE } from './palette';

/** Onde o golpe corpo a corpo acerta: na frente, no próprio corpo, ou em lugar nenhum. */
export type MeleeShape = 'front' | 'body' | 'around' | 'none';

export interface EnemyBody {
  id: string;
  width: number;
  height: number;
  maxHp: number;
  hitStunMs: number;
  /** Atrito do knockback (px/s perdidos por segundo). */
  knockbackFriction: number;
  /** Fração do knockback que ele sofre (chefes ficam firmes). Padrão: 1. */
  knockbackScale?: number;
  color: number;
  /** Voadores ignoram gravidade e plataformas. */
  flying: boolean;
  /** A rocha tapa a visão dele: sem linha reta de ar até o herói, ele não o enxerga. */
  sightBlocked?: boolean;
  meleeShape: MeleeShape;
  attack: AttackConfig;
}

/** Flecha do arqueiro. */
export type ArrowData = ProjectileData;

export const CARNICAL = {
  id: 'carnical',
  width: 14,
  height: 24,
  maxHp: 40,
  hitStunMs: 200,
  knockbackFriction: 600,
  color: PALETTE.blood,
  flying: false,
  meleeShape: 'front',
  attack: {
    windupMs: 380, // telegrafia: dá tempo de reagir e rolar
    activeMs: 120,
    recoveryMs: 420,
    damage: 12,
    knockbackX: 150,
    knockbackY: -90,
    hitbox: { width: 26, height: 24, offsetY: 0 },
  },
  ai: {
    patrolSpeed: 28,
    chaseSpeed: 58,
    sightRangeX: 130,
    sightRangeY: 48,
    loseSightRangeX: 190,
    attackRangeX: 26,
    attackRangeY: 30,
    attackCooldownMs: 450,
    turnPauseMs: 500,
    lungeSpeed: 0,
    waitDistanceX: 0,
  } satisfies GroundMeleeConfig,
} as const satisfies EnemyBody & { ai: GroundMeleeConfig };

export const ARQUEIRO_OCO = {
  id: 'arqueiro',
  width: 12,
  height: 22,
  maxHp: 28,
  hitStunMs: 220,
  knockbackFriction: 600,
  color: PALETTE.venom,
  flying: false,
  meleeShape: 'none',
  // Só a linha do tempo da mira: o golpe real é a flecha, que sai ao fim da preparação.
  attack: {
    windupMs: 650,
    activeMs: 80,
    recoveryMs: 450,
    damage: 0,
    knockbackX: 0,
    knockbackY: 0,
    hitbox: { width: 0, height: 0, offsetY: 0 },
  },
  ai: {
    sightRangeX: 240,
    sightRangeY: 70,
    shootRangeY: 14, // a flecha sai na horizontal: só vale atirar na altura do jogador
    minDistanceX: 90,
    maxDistanceX: 170,
    retreatSpeed: 55,
    approachSpeed: 45,
    shootCooldownMs: 900,
  } satisfies RangedConfig,
  arrow: {
    speed: 170,
    lifeMs: 2500,
    width: 10,
    height: 3,
    damage: 10,
    knockbackX: 120,
    knockbackY: -70,
    spawnOffsetY: -2,
  } satisfies ArrowData,
} as const satisfies EnemyBody & { ai: RangedConfig; arrow: ArrowData };

export const VULTO = {
  id: 'vulto',
  width: 14,
  height: 16,
  maxHp: 24,
  hitStunMs: 180,
  knockbackFriction: 500,
  color: PALETTE.wraith,
  flying: true,
  meleeShape: 'body',
  attack: {
    windupMs: 500, // paira e treme, avisando o mergulho
    activeMs: 450, // duração do mergulho
    recoveryMs: 650, // sobe de volta
    damage: 14,
    knockbackX: 160,
    knockbackY: -120,
    hitbox: { width: 18, height: 18, offsetY: 0 },
  },
  ai: {
    sightRangeX: 200,
    sightRangeY: 150,
    hoverHeight: 55,
    hoverSpeed: 60,
    swayAmplitude: 20,
    swayPeriodMs: 1600,
    diveTriggerRangeX: 40,
    diveCooldownMs: 1400,
    diveSpeed: 210,
    riseSpeed: 80,
  } satisfies FlyerConfig,
} as const satisfies EnemyBody & { ai: FlyerConfig };

export const CAO_DE_OSSOS = {
  id: 'cao',
  width: 20,
  height: 14,
  maxHp: 22,
  hitStunMs: 160,
  knockbackFriction: 600,
  color: PALETTE.bone,
  flying: false,
  meleeShape: 'front',
  attack: {
    windupMs: 260,
    activeMs: 220, // bote: avança durante a fase ativa
    recoveryMs: 450,
    damage: 8,
    knockbackX: 120,
    knockbackY: -70,
    hitbox: { width: 18, height: 14, offsetY: 0 },
  },
  ai: {
    patrolSpeed: 40,
    chaseSpeed: 125,
    sightRangeX: 150,
    sightRangeY: 50,
    loseSightRangeX: 220,
    attackRangeX: 46,
    attackRangeY: 24,
    attackCooldownMs: 700,
    turnPauseMs: 300,
    lungeSpeed: 230,
    waitDistanceX: 90,
  } satisfies GroundMeleeConfig,
} as const satisfies EnemyBody & { ai: GroundMeleeConfig };

/** Lobo Espectral (Floresta Apodrecida): um cão mais rápido e mais forte, do mesmo bando. */
export const LOBO_ESPECTRAL = {
  id: 'lobo',
  width: 24,
  height: 16,
  maxHp: 30,
  hitStunMs: 160,
  knockbackFriction: 600,
  color: PALETTE.player,
  flying: false,
  meleeShape: 'front',
  attack: {
    windupMs: 240,
    activeMs: 240, // bote longo: avança durante a fase ativa
    recoveryMs: 480,
    damage: 11,
    knockbackX: 130,
    knockbackY: -80,
    hitbox: { width: 22, height: 15, offsetY: 0 },
  },
  ai: {
    patrolSpeed: 46,
    chaseSpeed: 140,
    sightRangeX: 170,
    sightRangeY: 54,
    loseSightRangeX: 240,
    attackRangeX: 52,
    attackRangeY: 26,
    attackCooldownMs: 650,
    turnPauseMs: 280,
    lungeSpeed: 250,
    waitDistanceX: 90,
  } satisfies GroundMeleeConfig,
} as const satisfies EnemyBody & { ai: GroundMeleeConfig };

/**
 * Raiz Emboscadora (Floresta Apodrecida): dorme como um monte de raízes (sem poder ser acertada),
 * acorda quando o herói chega perto, chicoteia de longe e afunda de volta quando ele se afasta.
 */
export const RAIZ_EMBOSCADORA = {
  id: 'raiz',
  width: 18,
  height: 22,
  maxHp: 36,
  hitStunMs: 200,
  knockbackFriction: 700,
  knockbackScale: 0.4, // enraizada: quase não sai do lugar
  color: PALETTE.venom,
  flying: false,
  meleeShape: 'front',
  attack: {
    windupMs: 520, // os cipós se erguem para trás: dá tempo de rolar
    activeMs: 160,
    recoveryMs: 560,
    damage: 14,
    knockbackX: 170,
    knockbackY: -110,
    hitbox: { width: 34, height: 18, offsetY: 2 },
  },
  ai: {
    wakeRangeX: 70,
    wakeRangeY: 44,
    attackRangeX: 48,
    attackRangeY: 34,
    sleepRangeX: 120,
    riseMs: 420,
    sinkMs: 320,
    sinkDelayMs: 1500,
    attackCooldownMs: 650,
  } satisfies AmbusherConfig,
} as const satisfies EnemyBody & { ai: AmbusherConfig };

/**
 * Sapo Peçonhento (Pântano dos Afogados): salta de um ponto a outro e cospe veneno em arco de
 * uma distância média, depois de inchar a papada (a telegrafia do tiro).
 */
export const SAPO_PECONHENTO = {
  id: 'sapo',
  width: 16,
  height: 12,
  maxHp: 22,
  hitStunMs: 200,
  knockbackFriction: 600,
  color: PALETTE.venom,
  flying: false,
  meleeShape: 'none',
  // Só a linha do tempo do cuspe: o golpe real é a gota, que sai ao fim da preparação.
  attack: {
    windupMs: 620,
    activeMs: 80,
    recoveryMs: 420,
    damage: 0,
    knockbackX: 0,
    knockbackY: 0,
    hitbox: { width: 0, height: 0, offsetY: 0 },
  },
  ai: {
    sightRangeX: 230,
    sightRangeY: 90,
    minDistanceX: 70,
    maxDistanceX: 130,
    hopSpeed: 95,
    hopVelocity: -190,
    restMs: 650,
    patrolHopMs: 1500,
    shootCooldownMs: 1100,
  } satisfies HopperConfig,
  spit: {
    speed: 160,
    speedY: -150,
    gravityY: 480,
    lifeMs: 2400,
    width: 6,
    height: 6,
    damage: 9,
    knockbackX: 100,
    knockbackY: -60,
    spawnOffsetY: -4,
    textureKey: 'spit', // a mesma chave de TEXTURE.spit (src/systems/textures.ts)
    tint: 0x8ac24a,
  } satisfies ArrowData,
} as const satisfies EnemyBody & { ai: HopperConfig; spit: ArrowData };

/** Fogo-Fátuo (Pântano dos Afogados): uma chama azulada que paira e mergulha; ilumina em volta. */
export const FOGO_FATUO = {
  id: 'fatuo',
  width: 12,
  height: 12,
  maxHp: 16,
  hitStunMs: 160,
  knockbackFriction: 500,
  color: PALETTE.player,
  flying: true,
  meleeShape: 'body',
  attack: {
    windupMs: 440, // treme e esquenta: avisa o mergulho
    activeMs: 380,
    recoveryMs: 600,
    damage: 10,
    knockbackX: 130,
    knockbackY: -100,
    hitbox: { width: 15, height: 15, offsetY: 0 },
  },
  ai: {
    sightRangeX: 210,
    sightRangeY: 160,
    hoverHeight: 50,
    hoverSpeed: 70,
    swayAmplitude: 28,
    swayPeriodMs: 1300,
    diveTriggerRangeX: 46,
    diveCooldownMs: 1200,
    diveSpeed: 230,
    riseSpeed: 90,
  } satisfies FlyerConfig,
  /** A luz que ele solta na escuridão da sala (px e força de 0 a 1). */
  light: { radius: 76, strength: 0.8 },
} as const satisfies EnemyBody & { ai: FlyerConfig; light: { radius: number; strength: number } };

/**
 * Soldado Caído (Cemitério dos Caídos): um soldado morto com escudo e lança. O escudo cobre a
 * frente e só baixa quando ele estoca (telegrafia longa); é preciso rolar ou pular para as costas
 * dele, ou esperar a estocada e punir a recuperação. Quase não sai do lugar quando é atingido.
 */
export const SOLDADO_CAIDO = {
  id: 'soldado',
  width: 14,
  height: 24,
  maxHp: 44,
  hitStunMs: 170,
  knockbackFriction: 700,
  knockbackScale: 0.5,
  color: PALETTE.stoneLight,
  flying: false,
  meleeShape: 'front',
  attack: {
    windupMs: 520, // abaixa o escudo e leva a lança para trás: dá tempo de rolar
    activeMs: 130,
    recoveryMs: 560, // a guarda continua baixa: é a hora de punir
    damage: 14,
    knockbackX: 170,
    knockbackY: -90,
    hitbox: { width: 20, height: 12, offsetY: -2 },
  },
  ai: {
    patrolSpeed: 24,
    chaseSpeed: 44,
    sightRangeX: 130,
    sightRangeY: 48,
    loseSightRangeX: 190,
    attackRangeX: 26,
    attackRangeY: 28,
    attackCooldownMs: 500,
    turnPauseMs: 500,
    lungeSpeed: 60, // um passo curto junto da estocada
    waitDistanceX: 0,
  } satisfies GroundMeleeConfig,
  guard: { turnLagMs: 450 } satisfies GuardConfig,
} as const satisfies EnemyBody & { ai: GroundMeleeConfig; guard: GuardConfig };

/**
 * Necromante (Cemitério dos Caídos): mantém distância e, depois de erguer o cajado (telegrafia),
 * solta três orbes em leque. Frágil: quem alcança ele ganha o duelo.
 */
export const NECROMANTE = {
  id: 'necromante',
  width: 12,
  height: 24,
  maxHp: 26,
  hitStunMs: 200,
  knockbackFriction: 600,
  color: PALETTE.wraith,
  flying: false,
  meleeShape: 'none',
  // Só a linha do tempo da conjuração: o golpe real são os orbes, que saem ao fim da preparação.
  attack: {
    windupMs: 760,
    activeMs: 80,
    recoveryMs: 500,
    damage: 0,
    knockbackX: 0,
    knockbackY: 0,
    hitbox: { width: 0, height: 0, offsetY: 0 },
  },
  ai: {
    sightRangeX: 250,
    sightRangeY: 80,
    shootRangeY: 48, // o leque cobre uma faixa de altura
    minDistanceX: 100,
    maxDistanceX: 180,
    retreatSpeed: 60,
    approachSpeed: 40,
    shootCooldownMs: 1300,
  } satisfies RangedConfig,
} as const satisfies EnemyBody & { ai: RangedConfig };

/** Os três orbes do leque do necromante: um reto e dois que sobem e descem devagar. */
export const NECROMANTE_ORBS: readonly ArrowData[] = [-28, 0, 28].map((speedY) => ({
  speed: 105,
  speedY,
  lifeMs: 2600,
  width: 7,
  height: 7,
  damage: 10,
  knockbackX: 110,
  knockbackY: -60,
  spawnOffsetY: -6,
  textureKey: 'orb', // a mesma chave de TEXTURE.orb (src/systems/textures.ts)
  tint: 0xb48cff,
}));

/**
 * Golem de Pedra (Minas Desabadas): um bloco de rocha que anda devagar e quase não se deixa
 * empurrar. Ergue os braços (telegrafia longa, as rachaduras acendem) e bate no chão, com uma
 * onda que pega tudo em volta dele: é preciso sair do alcance ou rolar.
 */
export const GOLEM_DE_PEDRA = {
  id: 'golem',
  width: 22,
  height: 26,
  maxHp: 70,
  hitStunMs: 110,
  knockbackFriction: 900,
  knockbackScale: 0.15,
  color: PALETTE.stoneLight,
  flying: false,
  meleeShape: 'around',
  attack: {
    windupMs: 700,
    activeMs: 140,
    recoveryMs: 700,
    damage: 18,
    knockbackX: 200,
    knockbackY: -120,
    hitbox: { width: 64, height: 20, offsetY: 0 },
  },
  ai: {
    patrolSpeed: 14,
    chaseSpeed: 30,
    sightRangeX: 120,
    sightRangeY: 40,
    loseSightRangeX: 170,
    attackRangeX: 30,
    attackRangeY: 28,
    attackCooldownMs: 700,
    turnPauseMs: 700,
    lungeSpeed: 0,
    waitDistanceX: 0,
  } satisfies GroundMeleeConfig,
} as const satisfies EnemyBody & { ai: GroundMeleeConfig };

/** Morcego de Cristal (Minas Desabadas): rápido e nervoso, mergulha de surpresa; os cristais brilham. */
export const MORCEGO_DE_CRISTAL = {
  id: 'morcego',
  width: 12,
  height: 10,
  maxHp: 14,
  hitStunMs: 140,
  knockbackFriction: 500,
  color: PALETTE.glow,
  flying: true,
  sightBlocked: true, // dentro da mina a rocha o esconde: ele não mergulha através da parede
  meleeShape: 'body',
  attack: {
    windupMs: 320, // dobra as asas e os cristais acendem: avisa o mergulho
    activeMs: 340,
    recoveryMs: 520,
    damage: 9,
    knockbackX: 120,
    knockbackY: -90,
    hitbox: { width: 14, height: 12, offsetY: 0 },
  },
  ai: {
    sightRangeX: 220,
    sightRangeY: 160,
    hoverHeight: 46,
    hoverSpeed: 95,
    swayAmplitude: 34,
    swayPeriodMs: 900,
    diveTriggerRangeX: 54,
    diveCooldownMs: 900,
    diveSpeed: 260,
    riseSpeed: 110,
  } satisfies FlyerConfig,
  /** A luz dos cristais nas costas dele (px e força de 0 a 1). */
  light: { radius: 52, strength: 0.55 },
} as const satisfies EnemyBody & { ai: FlyerConfig; light: { radius: number; strength: number } };

/**
 * Aldeão em Chamas (Vila Queimada): um morador em pânico, tomado pelo fogo, que corre direto para
 * o herói e se agarra a ele num bote longo. Frágil, mas rápido; a chama que carrega ilumina em volta.
 */
export const ALDEAO_EM_CHAMAS = {
  id: 'aldeao',
  width: 14,
  height: 24,
  maxHp: 20,
  hitStunMs: 140,
  knockbackFriction: 600,
  color: PALETTE.ember,
  flying: false,
  meleeShape: 'front',
  attack: {
    windupMs: 240, // levanta os braços e grita: o aviso é curto, mas ele vem de longe
    activeMs: 260, // o bote: avança durante a fase ativa
    recoveryMs: 520,
    damage: 10,
    knockbackX: 150,
    knockbackY: -90,
    hitbox: { width: 18, height: 20, offsetY: 0 },
  },
  ai: {
    patrolSpeed: 34,
    chaseSpeed: 92,
    sightRangeX: 150,
    sightRangeY: 50,
    loseSightRangeX: 220,
    attackRangeX: 40,
    attackRangeY: 26,
    attackCooldownMs: 600,
    turnPauseMs: 250,
    lungeSpeed: 200,
    waitDistanceX: 0,
  } satisfies GroundMeleeConfig,
  /** A luz da chama que ele carrega (px e força de 0 a 1). */
  light: { radius: 70, strength: 0.8 },
} as const satisfies EnemyBody & {
  ai: GroundMeleeConfig;
  light: { radius: number; strength: number };
};

/**
 * Corvo Carniceiro (Vila Queimada): espera de lado, no alto, e cruza a sala em rasante na altura
 * do herói, atravessando por ele e seguindo adiante. Quem ouve o grito de aviso sai do caminho.
 */
export const CORVO_CARNICEIRO = {
  id: 'corvo',
  width: 16,
  height: 10,
  maxHp: 16,
  hitStunMs: 150,
  knockbackFriction: 500,
  color: PALETTE.stoneDark,
  flying: true,
  sightBlocked: true, // a casa em ruínas o esconde: ele não ataca através da parede
  meleeShape: 'body',
  attack: {
    windupMs: 400, // abre as asas e grasna parado: avisa o rasante
    activeMs: 520, // a passagem
    recoveryMs: 600,
    damage: 11,
    knockbackX: 140,
    knockbackY: -90,
    hitbox: { width: 18, height: 12, offsetY: 0 },
  },
  ai: {
    sightRangeX: 260,
    sightRangeY: 160,
    perchHeight: 34,
    perchOffsetX: 100,
    hoverSpeed: 90,
    minPassDx: 50,
    alignToleranceX: 14,
    alignToleranceY: 12,
    passSpeed: 230,
    passSteerSpeed: 70,
    riseSpeed: 90,
    cooldownMs: 900,
    swayAmplitude: 14,
    swayPeriodMs: 1100,
  } satisfies StraferConfig,
} as const satisfies EnemyBody & { ai: StraferConfig };

/** Bando de cães: quantos atacam ao mesmo tempo e o intervalo mínimo entre os botes. */
export const DOG_PACK = { maxConcurrent: 2, gapMs: 450 } as const;

/** Caractere de sala → tipo de inimigo (ver `src/data/rooms.ts`). */
export const ENEMY_MARKERS = {
  C: 'carnical',
  A: 'arqueiro',
  V: 'vulto',
  D: 'cao',
  L: 'lobo',
  R: 'raiz',
  O: 'sapo',
  W: 'fatuo',
  Q: 'soldado',
  N: 'necromante',
  U: 'golem',
  M: 'morcego',
  K: 'aldeao',
  J: 'corvo',
} as const;

export type EnemyType = (typeof ENEMY_MARKERS)[keyof typeof ENEMY_MARKERS];

export const ENEMY_BODIES: readonly EnemyBody[] = [
  CARNICAL,
  ARQUEIRO_OCO,
  VULTO,
  CAO_DE_OSSOS,
  LOBO_ESPECTRAL,
  RAIZ_EMBOSCADORA,
  SAPO_PECONHENTO,
  FOGO_FATUO,
  SOLDADO_CAIDO,
  NECROMANTE,
  GOLEM_DE_PEDRA,
  MORCEGO_DE_CRISTAL,
  ALDEAO_EM_CHAMAS,
  CORVO_CARNICEIRO,
];

/** Só a sala de teste faz os inimigos renascerem; nas salas reais eles ficam mortos. */
export const TEST_ROOM_RESPAWN_MS = 6000;
