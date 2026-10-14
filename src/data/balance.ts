/**
 * Valores de balanceamento do jogo. Tudo que afeta a "sensação" fica aqui,
 * para ajustar sem mexer na lógica. Tempos em milissegundos, velocidades em px/s.
 */

/** Resolução lógica do jogo (a tela é ampliada com escala inteira). */
export const GAME_SIZE = { width: 480, height: 270 } as const;

export const PLAYER = {
  width: 12,
  height: 22,
  moveSpeed: 110,
  jumpVelocity: -300,
  /** Gravidade aplicada ao mundo (Arcade Physics). */
  gravityY: 800,
  maxFallSpeed: 420,
  /** Teto da velocidade horizontal (cobre rolagem, investida e knockback). */
  maxSpeedX: 260,
} as const;

/** Tolerâncias que deixam o pulo "justo" para o jogador. */
export const JUMP_FORGIVENESS = {
  /** Tempo após sair da plataforma em que ainda é possível pular. */
  coyoteTimeMs: 100,
  /** Tempo em que um pulo apertado antes de pousar fica guardado. */
  jumpBufferMs: 110,
} as const;

/** Efeito visual de invulnerabilidade: o jogador pisca entre dois níveis de opacidade. */
export const INVULNERABLE_FX = {
  flickerMs: 40,
  alphaLow: 0.35,
  alphaHigh: 0.8,
} as const;

export const ROLL = {
  durationMs: 300,
  speed: 190,
  /** Invulnerabilidade a partir do início da rolagem. */
  invulnerableMs: 200,
  /** Espera após o fim da rolagem para rolar de novo. */
  cooldownMs: 250,
} as const;
