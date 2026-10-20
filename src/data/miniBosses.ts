/**
 * Os mini-chefes: um por área, numa sala própria antes do arco de saída (a saída só abre depois que
 * ele cai). Usam a mesma máquina de chefe do Guardião (src/logic/ai/boss.ts) com números e golpes
 * próprios: 'slam' é a pancada de perto, 'lunge' a investida e 'quake' a onda no chão da fase 2.
 * Tempos em ms, velocidades em px/s, distâncias em px.
 */
import type { BiomeId } from './mapRules';
import type { BossDef } from './boss';
import { PALETTE } from './palette';

export type MiniBossId = 'ent' | 'saporei';

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

export const MINI_BOSSES: Readonly<Record<MiniBossId, BossDef>> = {
  ent: ENT_APODRECIDO,
  saporei: REI_DOS_CHARCOS,
};

/** Qual mini-chefe guarda a saída de cada área (as áreas que não estão aqui ainda não têm um). */
export const BIOME_MINIBOSS: Readonly<Partial<Record<BiomeId, MiniBossId>>> = {
  floresta: 'ent',
  pantano: 'saporei',
};

/** O que um mini-chefe derrotado rende: almas (uma vez) e uma relíquia garantida, se houver nova. */
export const MINIBOSS_REWARD = { souls: 15 } as const;
