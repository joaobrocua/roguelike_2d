/**
 * Valores de combate: vida do jogador, esquiva perfeita e pools de projéteis.
 * Tempos em ms. Os golpes do jogador vêm das relíquias (src/data/relics.ts).
 */
export const PLAYER_COMBAT = {
  maxHp: 100,
  /** Cura de um baú quando não há relíquia nova para dar (fração da vida máxima). */
  chestHealFraction: 0.3,
  /** Invulnerabilidade após levar dano. */
  hurtInvulnerableMs: 700,
  /** Tempo sem controle após levar dano. */
  hitStunMs: 220,
  /** Atrito do knockback (px/s perdidos por segundo). */
  knockbackFriction: 600,
} as const;

/** Esquiva perfeita: rolar no último instante antes do golpe inimigo acertar. */
export const PERFECT_DODGE = {
  /** A rolagem precisa ter começado há no máximo isso (ms) quando o golpe acerta. */
  windowMs: 150,
  /** Multiplicador de dano do próximo ataque do jogador. */
  damageMultiplier: 2,
  slowMoMs: 450,
  /** Velocidade do tempo durante a câmera lenta (1 = normal). */
  slowMoScale: 0.3,
} as const;

/** Tempo (ms, real) entre a morte e a tela de "Você caiu". */
export const DEATH_SCREEN_DELAY_MS = 800;

/** Tamanho dos pools de projéteis (criados uma vez, reaproveitados). */
export const PROJECTILE_POOL = { arrows: 12, bolts: 8 } as const;
