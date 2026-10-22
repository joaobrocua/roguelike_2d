/**
 * O Guardião Partido: armadura animada que guarda o fim da fortaleza. Duas fases: abaixo da
 * metade da vida ele fica mais rápido, ataca com menos pausa e ganha o golpe em área no chão.
 * Tempos em ms, velocidades em px/s, distâncias em px.
 */
import type { BossAttackKind, BossConfig } from '../logic/ai/boss';
import type { AttackConfig } from '../logic/attack';
import type { EnemyBody, MeleeShape } from './enemies';
import { PALETTE } from './palette';

export interface BossAttack {
  attack: AttackConfig;
  shape: MeleeShape;
}

/**
 * A aura da fase 2 (vida abaixo da metade): um brilho que pulsa atrás do chefe e brasas que sobem
 * dele, na cor de cada um. O tamanho do brilho é múltiplo do maior lado do corpo.
 */
export interface RageSpec {
  color: number;
  /** Brasas: cor e quantas nascem por segundo. */
  emberColor: number;
  embersPerSecond: number;
}

/** Valores comuns da aura (o que não muda de um chefe para outro). */
export const RAGE_AURA = {
  /** Tamanho do brilho em múltiplos do maior lado do corpo. */
  glowScale: 2.6,
  /** O brilho pulsa entre estas opacidades, uma volta a cada `pulseMs`. */
  alphaMin: 0.22,
  alphaMax: 0.5,
  pulseMs: 900,
  /** Brasas: vida (ms), velocidade para cima (px/s) e tamanho inicial. */
  emberLifeMs: 800,
  emberSpeedY: { min: -46, max: -22 },
  emberScale: 1.3,
} as const;

/** Um chefe (o Guardião ou um mini-chefe): corpo, nome, os três golpes e o comportamento. */
export interface BossDef extends EnemyBody {
  name: string;
  rage: RageSpec;
  attacks: Record<BossAttackKind, BossAttack>;
  ai: BossConfig;
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
  rage: { color: PALETTE.ember, emberColor: PALETTE.glow, embersPerSecond: 14 },
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
    // Pula o pilar que o barra (até 3 blocos), sobe até quem está nos balcões e salta de longe
    hopVelocity: -340,
    hopSpeed: 70,
    climbVelocity: -440,
    climbSpeed: 90,
    climbMinDy: 52,
    climbRangeX: 130,
    leapVelocity: -300,
    leapSpeed: 190,
    leapMinDx: 170,
    leapCooldownMs: 3200,
    jumpCooldownMs: 700,
  } satisfies BossConfig,
} as const satisfies BossDef;

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

/** Sal da semente do rng do Guardião e dos mini-chefes (somado à semente da run), para não repetirem sorteios. */
export const BOSS_SEED_SALT = { final: 0x9e3779b9, mini: 0x51ed270b } as const;

/** Depois que o chefe cai, espera este tempo (ms) antes de mostrar a tela de vitória. */
export const VICTORY_DELAY_MS = 2200;
