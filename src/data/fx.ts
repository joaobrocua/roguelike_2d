/**
 * Efeitos de "sensação" do combate: hit stop, tremor de câmera, faíscas, números de dano
 * e arco do golpe. Tudo ajustável aqui, sem mexer no código. Tempos em ms.
 */
import { PALETTE } from './palette';

export interface HitFeedback {
  /** Congelamento do jogo ao acertar. */
  hitStopMs: number;
  shakeMs: number;
  /** Intensidade do tremor, em fração do tamanho da tela. */
  shakeIntensity: number;
  sparks: number;
}

export const HIT_FEEDBACK = {
  /** Jogador acerta um inimigo. */
  enemyHit: { hitStopMs: 55, shakeMs: 90, shakeIntensity: 0.003, sparks: 7 },
  /** Jogador acerta com o dano dobrado da esquiva perfeita. */
  empoweredHit: { hitStopMs: 100, shakeMs: 150, shakeIntensity: 0.006, sparks: 16 },
  /** Jogador leva um golpe. */
  playerHit: { hitStopMs: 90, shakeMs: 180, shakeIntensity: 0.008, sparks: 10 },
} as const satisfies Record<string, HitFeedback>;

/**
 * Peso do golpe: o feedback acima é para um golpe "médio"; golpes mais fracos usam menos e os
 * mais pesados usam mais (congelamento, tremor e faíscas). `damage*` é o dano que vale cada ponta.
 */
export const HIT_WEIGHT = { damageMin: 5, damageMax: 28, scaleMin: 0.55, scaleMax: 1.55 } as const;

export const SPARK_FX = {
  lifespanMs: 300,
  speedMin: 40,
  speedMax: 170,
  gravityY: 320,
  /** Leque de ângulos (graus): faíscas sobem em arco; 0° é a direita, -90° é para cima. */
  angleMin: -165,
  angleMax: -15,
  /** Cores de cada tipo de faísca. */
  enemy: [PALETTE.bone, PALETTE.ember, PALETTE.blood],
  empowered: [PALETTE.playerAccent, PALETTE.ember, PALETTE.soul],
  player: [PALETTE.blood, PALETTE.bloodDark, PALETTE.bone],
  dodge: [PALETTE.playerAccent, PALETTE.player],
  dodgeBurst: 14,
  blockBurst: 5,
} as const;

export const DAMAGE_NUMBER_FX = {
  poolSize: 16,
  lifeMs: 650,
  risePx: 20,
  /** Números de golpe dobrado crescem (escala inteira, para o pixel do texto não mudar de tamanho). */
  empoweredScale: 2,
  enemyColor: PALETTE.bone,
  empoweredColor: PALETTE.ember,
  playerColor: PALETTE.blood,
  healColor: PALETTE.soul,
} as const;

/** Arco do golpe (sprite esticado até a hitbox). */
export const SLASH_FX = {
  alpha: 0.95,
  /** Largura inicial do arco (fração da hitbox); ele "abre" até 1 durante o golpe. */
  startWidth: 0.6,
  enemyTint: PALETTE.blood,
} as const;

export const DODGE_RING = {
  durationMs: 320,
  radius: 10,
  endScale: 2.5,
} as const;

/** Barreira do Tomo: opacidade normal e no fim da duração (quando está para cair). */
export const BARRIER_FX = {
  alpha: 0.65,
  alphaFading: 0.3,
  fadeFraction: 0.25,
} as const;

/** Relíquia largada no chão. */
export const PICKUP_FX = {
  /** Quanto a arma caída gira (graus) para ficar deitada; o tomo (livro) fica reto. */
  lieAngleDeg: 58,
  /** Distância do centro da arma ao chão quando ela já está caída (px). */
  restOffsetY: 5,
  /** Folga (px) em volta da arma em que dá para pegá-la. */
  reach: 12,
  /** Queda até o chão, com quique. */
  dropMs: 520,
  /** Brilho no chão: tamanho (escala da mancha de luz), opacidade e período do pulso. */
  glow: { scaleX: 0.42, scaleY: 0.2, alpha: 0.5, pulseMs: 1400, offsetY: 3 },
  /** Aviso "[E] nome" que aparece perto da arma: alturas acima do centro dela. */
  prompt: { nameDy: -26, keyDy: -17 },
} as const;

/** Golpe de troca: anel de luz na cor da relíquia. */
export const SWAP_FX = {
  /** Flash do jogador na cor da nova relíquia. */
  flashMs: 90,
  ringMs: 280,
  ringStart: 8,
} as const;

/** Poeira levantada pelos pés (pouso e rolagem). */
export const DUST_FX = {
  landCount: 7,
  rollCount: 5,
  /** Velocidade de queda (px/s) a partir da qual o pouso levanta poeira. */
  landMinSpeed: 140,
  lifespanMs: 340,
  speedMin: 10,
  speedMax: 46,
  /** Leque de ângulos (graus) da nuvem e tamanho/opacidade inicial das partículas. */
  angleMin: -175,
  angleMax: -5,
  scaleStart: 1.6,
  alphaStart: 0.55,
} as const;

/** Sombra sob os pés dos personagens. */
export const ACTOR_SHADOW = {
  texture: { width: 20, height: 5 },
  /** Largura da sombra em relação à do corpo. */
  widthFactor: 1.5,
  /** Quanto abaixo do pé ela fica (px). */
  offsetY: 1,
} as const;

/**
 * Objetos do cenário (baú, fogueira, porta): medidas do desenho e a luz que cada um solta.
 * `radius` é o alcance da luz (px) que clareia a escuridão; `glowAlpha` é o brilho quente por cima.
 */
export const PROP_FX = {
  /** Linha do quadro em que a base do desenho encosta no chão. */
  baseY: 30,
  /** Folga (px) em volta do desenho para o jogador acionar o objeto. */
  reach: 6,
  fireFrameMs: 150,
  /** Atrás da sombra (0,1) e dos personagens (0,2): quem passa por um objeto fica na frente. */
  depth: 0.05,
  glowDepth: 0.9,
  fire: { radius: 78, strength: 0.9, glowAlpha: 0.32, color: 0xffc46b, pulseMs: 900 },
  door: { radius: 52, strength: 0.7, glowAlpha: 0.26, color: 0x6fe3b0, pulseMs: 1400 },
  chest: { radius: 34, strength: 0.5, glowAlpha: 0.16, color: 0xe8892d, pulseMs: 1100 },
} as const;
