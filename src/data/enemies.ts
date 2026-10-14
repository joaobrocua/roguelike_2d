/**
 * Inimigos dos andares 1 a 3. Cada um define corpo, vida, ataque e os parâmetros da sua IA.
 * Tempos em ms, velocidades em px/s, distâncias em px. O chefe entra na etapa 5.
 */
import type { FlyerConfig } from '../logic/ai/flyer';
import type { GroundMeleeConfig } from '../logic/ai/groundMelee';
import type { RangedConfig } from '../logic/ai/ranged';
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

/** Bando de cães: quantos atacam ao mesmo tempo e o intervalo mínimo entre os botes. */
export const DOG_PACK = { maxConcurrent: 2, gapMs: 450 } as const;

/** Caractere de sala → tipo de inimigo (ver `src/data/rooms.ts`). */
export const ENEMY_MARKERS = {
  C: 'carnical',
  A: 'arqueiro',
  V: 'vulto',
  D: 'cao',
} as const;

export type EnemyType = (typeof ENEMY_MARKERS)[keyof typeof ENEMY_MARKERS];

export const ENEMY_BODIES: readonly EnemyBody[] = [CARNICAL, ARQUEIRO_OCO, VULTO, CAO_DE_OSSOS];

/** Só a sala de teste faz os inimigos renascerem; nas salas reais eles ficam mortos. */
export const TEST_ROOM_RESPAWN_MS = 6000;
