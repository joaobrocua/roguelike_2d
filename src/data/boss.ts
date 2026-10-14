/**
 * O Guardião Partido: armadura animada que guarda o fim da fortaleza. Duas fases: abaixo da
 * metade da vida ele fica mais rápido, ataca com menos pausa e ganha o golpe em área no chão.
 * Tempos em ms, velocidades em px/s, distâncias em px.
 */
import type { BossAttackKind, BossConfig } from '../logic/ai/boss';
import type { AttackConfig } from '../logic/attack';
import type { MeleeShape } from './enemies';
import { PALETTE } from './palette';

export interface BossAttack {
  attack: AttackConfig;
  shape: MeleeShape;
}

export const GUARDIAO = {
  id: 'guardiao',
  name: 'O Guardião Partido',
  width: 26,
  height: 40,
  maxHp: 260,
  /** O chefe quase não se abala com os golpes. */
  hitStunMs: 70,
  knockbackFriction: 900,
  /** Fração do knockback que ele sofre. */
  knockbackScale: 0.18,
  color: PALETTE.stone,
  flying: false,
  meleeShape: 'front',
  /** Golpe padrão (usado só enquanto nenhum dos três está em andamento). */
  attack: {
    windupMs: 650,
    activeMs: 140,
    recoveryMs: 600,
    damage: 18,
    knockbackX: 220,
    knockbackY: -140,
    hitbox: { width: 46, height: 38, offsetY: 0 },
  },
  attacks: {
    // Pancada de cima: alcance curto, telegrafia longa
    slam: {
      shape: 'front',
      attack: {
        windupMs: 650,
        activeMs: 140,
        recoveryMs: 600,
        damage: 18,
        knockbackX: 220,
        knockbackY: -140,
        hitbox: { width: 46, height: 38, offsetY: 0 },
      },
    },
    // Investida: avança durante o golpe
    lunge: {
      shape: 'front',
      attack: {
        windupMs: 480,
        activeMs: 360,
        recoveryMs: 520,
        damage: 15,
        knockbackX: 200,
        knockbackY: -100,
        hitbox: { width: 34, height: 30, offsetY: 4 },
      },
    },
    // Onda no chão (fase 2): pule por cima dela ou role por dentro
    quake: {
      shape: 'around',
      attack: {
        windupMs: 800,
        activeMs: 200,
        recoveryMs: 700,
        damage: 20,
        knockbackX: 140,
        knockbackY: -200,
        hitbox: { width: 140, height: 22, offsetY: 0 },
      },
    },
  } satisfies Record<BossAttackKind, BossAttack>,
  ai: {
    walkSpeed: 38,
    phase2SpeedMult: 1.45,
    phase2Threshold: 0.5,
    closeRangeX: 48,
    midRangeX: 130,
    attackCooldownMs: 800,
    phase2CooldownMult: 0.55,
    lungeSpeed: 190,
    quakeChance: 0.35,
    introMs: 1500,
    phaseChangeMs: 1100,
  } satisfies BossConfig,
} as const;

/** Barra de vida do chefe, no pé da tela, dentro de um painel com o nome. */
export const BOSS_BAR = {
  width: 168,
  height: 6,
  border: 2,
  /** Folga do painel em volta da barra e do nome. */
  padding: 6,
  /** Altura do painel e distância dele até o pé da tela. */
  plateHeight: 27,
  bottomMargin: 5,
  /** Linha do nome e da barra dentro do painel. */
  nameY: 5,
  barY: 15,
  /** Quanto do rastro claro some por segundo (fração da barra). */
  ghostDelayRate: 0.3,
  /** O traço que marca onde começa a fase 2 (fração da vida). */
  phaseMark: 0.5,
  introMs: 600,
  introSlidePx: 10,
} as const;

/** Depois que o chefe cai, espera este tempo (ms) antes de mostrar a tela de vitória. */
export const VICTORY_DELAY_MS = 2200;
