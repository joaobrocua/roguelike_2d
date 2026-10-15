/**
 * Atmosfera do cenário: camadas de fundo (parallax), névoa, tochas, iluminação e partículas.
 * Tudo ajustável aqui. Tempos em ms, distâncias em px.
 */

/** Marcadores de sala que são só decoração (não viram inimigos). */
export const DECOR_MARKERS = { T: 'torch' } as const;

/** Ordem de desenho (depth): fundo < cenário < personagens < escuridão < efeitos < HUD. */
export const DEPTH = {
  bgFar: -30,
  bgMid: -20,
  bgNear: -10,
  fogBack: -6,
  torch: -4,
  shadow: 0.1,
  actor: 0.2,
  projectile: 0.3,
  /** Números de dano flutuantes (entre os efeitos e a HUD). */
  numbers: 10,
  fogFront: 3,
  darkness: 8,
  warmGlow: 8.5,
  vignette: 12,
  hud: 20,
} as const;

export const ATMOSPHERE = {
  /** Largura das camadas de fundo (maior que a tela para sobrar margem no parallax). */
  layerWidth: 560,
  /** Quanto cada camada desliza (fração do deslocamento do jogador em relação ao centro). */
  parallax: { far: 0.02, mid: 0.05, near: 0.1 },

  /** Escuridão ambiente; a luz "apaga" a escuridão em volta das tochas e do jogador. */
  darkness: { color: 0x04060c, alpha: 0.46 },
  playerLight: { radius: 96, strength: 1 },
  /** Luz fraca em volta de cada inimigo, para ler a telegrafia mesmo nos cantos escuros. */
  enemyLight: { radius: 44, strength: 0.55 },
  torch: {
    radius: 86,
    strength: 0.95,
    /** Brilho quente somado (aditivo) por cima da cena. */
    glowAlpha: 0.2,
    /** Oscilação da luz: amplitude (fração do raio) e velocidades (rad/s) das duas ondas. */
    flickerAmplitude: 0.07,
    flickerSpeedA: 7.3,
    flickerSpeedB: 11.9,
    frameMs: 130,
    emberMinMs: 260,
    emberMaxMs: 640,
  },

  /** Névoa: faixas que correm devagar (px/s), uma atrás e outra na frente dos personagens. */
  fog: {
    back: { y: 150, height: 64, speed: 5, alpha: 0.5 },
    front: { y: 214, height: 64, speed: -9, alpha: 0.32 },
  },

  /** Cinzas caindo devagar. */
  ash: { frequencyMs: 380, lifespanMs: 11000, speedMin: 6, speedMax: 18, alpha: 0.35 },

  vignette: { alpha: 0.6 },
} as const;

/** Tamanho dos desenhos das tochas e variações de pedra. */
export const TILE_VARIANTS = 3;

/** Escuridão de cada bioma (opacidade da camada escura): do entardecer ao fundo da masmorra. */
export const BIOME_DARKNESS = {
  muralhas: 0.36,
  saloes: 0.46,
  catacumbas: 0.6,
  floresta: 0.5,
  pantano: 0.52,
} as const;
