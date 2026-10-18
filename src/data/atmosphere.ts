import type { BiomeId } from './mapRules';

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

  vignette: { alpha: 0.6 },
} as const;

/** Tamanho dos desenhos das tochas e variações de pedra. */
export const TILE_VARIANTS = 4;

/** Escuridão de cada bioma (opacidade da camada escura): do entardecer ao fundo da masmorra. */
export const BIOME_DARKNESS = {
  muralhas: 0.36,
  saloes: 0.46,
  catacumbas: 0.6,
  floresta: 0.5,
  pantano: 0.52,
  cemiterio: 0.5,
  minas: 0.57,
  vila: 0.5,
} as const;

/**
 * Um emissor de partículas do clima de uma área (vaga-lumes, brasas, poeira, gotas, almas...).
 * As posições são na tela (as partículas não rolam com a câmera).
 */
export interface AmbientEmitter {
  /** 'spark' é um ponto de 2 px; 'glow' é uma bolha de luz macia (bem pequena, em escala). */
  texture: 'spark' | 'glow';
  /** De onde nasce: 'top' (cai do alto), 'floor' (sobe do chão) ou 'air' (em qualquer ponto da vista). */
  zone: 'top' | 'floor' | 'air';
  frequencyMs: number;
  lifespanMs: number;
  speedX: { min: number; max: number };
  speedY: { min: number; max: number };
  /** Opacidade máxima. */
  alpha: number;
  /** 'out' nasce na opacidade máxima e some; 'inout' aparece, brilha no meio da vida e some. */
  fade: 'out' | 'inout';
  scale: { min: number; max: number };
  tint: readonly number[];
  /** Soma a luz (brasas, vaga-lumes, almas) em vez de pintar por cima. */
  additive: boolean;
  /** Passa na frente dos personagens (senão fica atrás do cenário). */
  front: boolean;
}

/** O clima de cada área: o que flutua, cai ou sobe, e o que isso diz sobre o lugar. */
export const BIOME_AMBIENCE: Readonly<Record<BiomeId, readonly AmbientEmitter[]>> = {
  // Pátio ao vento: poeira e folhas secas levadas para o lado
  muralhas: [
    {
      texture: 'spark',
      zone: 'air',
      frequencyMs: 420,
      lifespanMs: 6500,
      speedX: { min: 16, max: 36 },
      speedY: { min: -4, max: 8 },
      alpha: 0.3,
      fade: 'inout',
      scale: { min: 1, max: 1.4 },
      tint: [0xc4c0aa, 0x8d8a78],
      additive: false,
      front: true,
    },
  ],
  // Salão: poeira boiando na luz dos vitrais
  saloes: [
    {
      texture: 'glow',
      zone: 'air',
      frequencyMs: 380,
      lifespanMs: 7000,
      speedX: { min: -4, max: 4 },
      speedY: { min: -5, max: 3 },
      alpha: 0.32,
      fade: 'inout',
      scale: { min: 0.02, max: 0.05 },
      tint: [0xd9a0ff, 0xf6e6ff],
      additive: true,
      front: true,
    },
  ],
  // Catacumbas: esporos esverdeados que descem sem pressa
  catacumbas: [
    {
      texture: 'glow',
      zone: 'top',
      frequencyMs: 520,
      lifespanMs: 9000,
      speedX: { min: -3, max: 3 },
      speedY: { min: 6, max: 14 },
      alpha: 0.3,
      fade: 'inout',
      scale: { min: 0.02, max: 0.045 },
      tint: [0x6fe3b0, 0x2f9a7a],
      additive: true,
      front: true,
    },
  ],
  // Floresta: vaga-lumes que piscam e folhas que caem
  floresta: [
    {
      texture: 'glow',
      zone: 'air',
      frequencyMs: 520,
      lifespanMs: 5200,
      speedX: { min: -9, max: 9 },
      speedY: { min: -8, max: 5 },
      alpha: 0.85,
      fade: 'inout',
      scale: { min: 0.03, max: 0.06 },
      tint: [0xd9e46a, 0xf8ffd0],
      additive: true,
      front: true,
    },
    {
      texture: 'spark',
      zone: 'top',
      frequencyMs: 800,
      lifespanMs: 10000,
      speedX: { min: -10, max: 12 },
      speedY: { min: 14, max: 26 },
      alpha: 0.75,
      fade: 'out',
      scale: { min: 1.2, max: 1.8 },
      tint: [0x8a9a2e, 0x6a5a2a, 0xa3c04a],
      additive: false,
      front: true,
    },
  ],
  // Pântano: bolhas subindo da água e mosquitos azulados
  pantano: [
    {
      texture: 'spark',
      zone: 'floor',
      frequencyMs: 560,
      lifespanMs: 3600,
      speedX: { min: -3, max: 3 },
      speedY: { min: -14, max: -6 },
      alpha: 0.55,
      fade: 'out',
      scale: { min: 1, max: 1.6 },
      tint: [0xcfe8f0, 0x8fa4ad],
      additive: false,
      front: true,
    },
    {
      texture: 'glow',
      zone: 'air',
      frequencyMs: 640,
      lifespanMs: 5000,
      speedX: { min: -8, max: 8 },
      speedY: { min: -6, max: 6 },
      alpha: 0.7,
      fade: 'inout',
      scale: { min: 0.025, max: 0.05 },
      tint: [0x7fe8ff, 0xe0ffff],
      additive: true,
      front: true,
    },
  ],
  // Cemitério: almas lilases que sobem devagar entre as lápides
  cemiterio: [
    {
      texture: 'glow',
      zone: 'floor',
      frequencyMs: 760,
      lifespanMs: 7500,
      speedX: { min: -5, max: 5 },
      speedY: { min: -14, max: -6 },
      alpha: 0.6,
      fade: 'inout',
      scale: { min: 0.04, max: 0.075 },
      tint: [0xb48cff, 0xf0e0ff],
      additive: true,
      front: true,
    },
  ],
  // Minas: poeira, brilhos de cristal e uma gota que cai de vez em quando
  minas: [
    {
      texture: 'spark',
      zone: 'air',
      frequencyMs: 300,
      lifespanMs: 7000,
      speedX: { min: -3, max: 3 },
      speedY: { min: -3, max: 4 },
      alpha: 0.3,
      fade: 'inout',
      scale: { min: 1, max: 1.3 },
      tint: [0xc8a64a, 0x8a7860],
      additive: false,
      front: true,
    },
    {
      texture: 'glow',
      zone: 'air',
      frequencyMs: 700,
      lifespanMs: 1800,
      speedX: { min: 0, max: 0 },
      speedY: { min: 0, max: 0 },
      alpha: 0.75,
      fade: 'inout',
      scale: { min: 0.02, max: 0.04 },
      tint: [0x4ae0d0, 0xc8fff8],
      additive: true,
      front: false,
    },
    {
      texture: 'spark',
      zone: 'top',
      frequencyMs: 1500,
      lifespanMs: 1500,
      speedX: { min: 0, max: 0 },
      speedY: { min: 70, max: 100 },
      alpha: 0.7,
      fade: 'out',
      scale: { min: 1, max: 1 },
      tint: [0x9ad0ff],
      additive: false,
      front: true,
    },
  ],
  // Vila queimada: brasas subindo das casas e cinzas caindo
  vila: [
    {
      texture: 'glow',
      zone: 'floor',
      frequencyMs: 170,
      lifespanMs: 3600,
      speedX: { min: 4, max: 22 },
      speedY: { min: -34, max: -12 },
      alpha: 0.9,
      fade: 'out',
      scale: { min: 0.02, max: 0.045 },
      tint: [0xff7a2a, 0xffc04a],
      additive: true,
      front: true,
    },
    {
      texture: 'spark',
      zone: 'top',
      frequencyMs: 260,
      lifespanMs: 9000,
      speedX: { min: 6, max: 18 },
      speedY: { min: 10, max: 22 },
      alpha: 0.45,
      fade: 'out',
      scale: { min: 1, max: 1.5 },
      tint: [0x9a8a80, 0x6a5a58],
      additive: false,
      front: true,
    },
  ],
};
