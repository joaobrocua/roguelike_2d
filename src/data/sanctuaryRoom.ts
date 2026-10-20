/**
 * A sala do santuário: uma câmara só para o anjo caído colossal e o altar dele, entre um bioma e o seguinte e
 * no despertar depois de morrer. O desenho é um só; o bioma entra com a pedra, o fundo, a
 * escuridão e as cores (SANCTUARY_LOOK). Legenda: ver data/rooms.ts, mais:
 *   'S' o altar (a coluna marca a BORDA ESQUERDA do tile: o centro dele é o eixo da sala)
 *   'X' e 'Y' as passagens que levam adiante (o da direita e o da esquerda; o 'Y' só existe quando
 *   a etapa oferece duas áreas) e 'P' o ponto de nascimento do herói
 * Tudo em tiles de 16 px; a sala tem 1 célula (30 x 17), sem aberturas nas paredes.
 */
import type { BiomeId } from './mapRules';

export const SANCTUARY_LAYOUT: readonly string[] = [
  '##############################',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#...T....................T...#',
  '#............................#',
  '#.......T............T.......#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#..............S.............#',
  '#............####............#',
  '#..........########..........#',
  '#..Y...P.############.....X..#',
  '##############################',
  '##############################',
];

/** Cores do santuário em cada bioma (a pedra e o fundo já vêm de BIOME_LOOK). */
export interface SanctuaryLook {
  /** Chama dos braseiros e das velas: da borda ao miolo. */
  flame: readonly [number, number, number];
  /** Pano dos estandartes e o acabamento dele. */
  banner: number;
  bannerTrim: number;
  /** Cor do círculo de runas no chão. */
  rune: number;
}

export const SANCTUARY_LOOK: Readonly<Record<BiomeId, SanctuaryLook>> = {
  // Pátio ao entardecer: fogo âmbar, pano índigo, luz pálida da lua
  muralhas: {
    flame: [0xe8892d, 0xffc46b, 0xfff0c0],
    banner: 0x2c3a78,
    bannerTrim: 0xffc46b,
    rune: 0xaebcf0,
  },
  // Capela: fogo violeta, pano vinho, vitral aceso
  saloes: {
    flame: [0x7a45d6, 0xd9a0ff, 0xf6e6ff],
    banner: 0x7a1f3a,
    bannerTrim: 0xffb35a,
    rune: 0xd9a0ff,
  },
  // Catacumbas: fogo-fátuo verde, pano de musgo, luz de alma
  catacumbas: {
    flame: [0x2f9a7a, 0x6fe3b0, 0xd0fff0],
    banner: 0x224a3a,
    bannerTrim: 0x6fe3b0,
    rune: 0x7fffd0,
  },
  // Floresta: fogo-fátuo amarelado, pano de musgo escuro, luz de vaga-lume
  floresta: {
    flame: [0x8a9a2e, 0xd9e46a, 0xf8ffd0],
    banner: 0x3e3a14,
    bannerTrim: 0xd9e46a,
    rune: 0xd9e46a,
  },
  // Pântano: fogo-fátuo azulado, pano cinza-esverdeado e a luz fria dos fogos-fátuos
  pantano: {
    flame: [0x2a8a9a, 0x7fe8ff, 0xe0ffff],
    banner: 0x2a3a40,
    bannerTrim: 0x7fe8ff,
    rune: 0x7fe8ff,
  },
  // Cemitério: chama azul-pálida de vela de defunto, pano roxo-escuro e runas lilases
  cemiterio: {
    flame: [0x6a7acc, 0xb4c4ff, 0xf0f4ff],
    banner: 0x3a2448,
    bannerTrim: 0xb4c4ff,
    rune: 0xc8b8ff,
  },
  // Minas: chama de lampião âmbar, pano de lona marrom e runas cor de brasa
  minas: {
    flame: [0xc86a1a, 0xffb04a, 0xfff0c0],
    banner: 0x4a3018,
    bannerTrim: 0xffb04a,
    rune: 0xffc870,
  },
  // Vila: chama de incêndio, pano chamuscado e runas cor de brasa
  vila: {
    flame: [0xc23a14, 0xff7a2a, 0xffe0a0],
    banner: 0x4a1812,
    bannerTrim: 0xff7a2a,
    rune: 0xffa060,
  },
};

/** Onde cada peça de cenário fica (px de mundo; o chão da sala está em y = 240). */
export const SANCTUARY_DECOR = {
  floorY: 240,
  /** Colunas do fundo (centro x). */
  pillars: [104, 376],
  pillar: { width: 24, top: 16 },
  /**
   * O anjo caído colossal esculpido na parede do fundo: asas abertas até as colunas, cabeça baixa
   * sob a auréola partida, mãos sobre uma espada enorme. Os degraus escondem os pés. `haloY` é a
   * altura (no desenho) do centro da auréola.
   */
  colossus: { x: 240, top: 24, width: 256, height: 216, haloY: 46, haloRx: 34, haloRy: 30 },
  /** Brilho atrás da cabeça do colosso e a luz que ele solta na escuridão da sala. */
  halo: { radius: 150, alpha: 0.34, light: { radius: 170, strength: 0.8, y: 96 } },
  /** Feixe de luz do teto sobre o colosso (aditivo). */
  shaft: { topY: 16, bottomY: 200, topWidth: 36, bottomWidth: 150, alpha: 0.2 },
  /** Estandartes pendurados do teto: centro x e o comprimento. */
  banners: [176, 304],
  banner: { width: 20, height: 64, top: 16, swayDeg: 1.6, swayMs: 3200 },
  /** Braseiros altos dos dois lados da escada (centro x, no chão). */
  braziers: [128, 352],
  brazier: {
    light: { radius: 112, strength: 0.95 },
    frameMs: 120,
    glowAlpha: 0.3,
    /** Altura (px) do centro do desenho e do brilho acima do chão. */
    centerDy: 24,
    glowDy: 38,
  },
  /** Velas nos degraus (x, y do chão do degrau). */
  candles: [
    [152, 224],
    [162, 224],
    [318, 224],
    [328, 224],
    [190, 208],
    [290, 208],
  ],
  candle: {
    light: { radius: 34, strength: 0.6 },
    frameMs: 190,
    glowAlpha: 0.22,
    /** Altura (px) do centro do desenho e do brilho acima do degrau. */
    centerDy: 6,
    glowDy: 9,
  },
  /** Defasagem entre as chamas (rad) e o quanto o brilho encolhe em relação ao alcance da luz. */
  flame: { braziersPhase: 1.7, candlesPhase: 0.9, glowShrink: 0.8, startClockMs: 100 },
  /** Respiração do feixe de luz e do círculo de runas (fração mínima e velocidade do feixe em rad/s). */
  pulse: { shaftBase: 0.85, shaftSwing: 0.15, shaftSpeed: 0.9, runesBase: 0.55, runesSwing: 0.45 },
  /** Círculo de runas no chão, em volta da escada. */
  runes: { x: 240, y: 238, width: 232, height: 14, alpha: 0.4, pulseMs: 2600 },
  /** Poeira suspensa que sobe pelo feixe. */
  motes: {
    frequencyMs: 260,
    lifespanMs: 5200,
    width: 70,
    alpha: 0.5,
    speedY: { min: -7, max: -2 },
    speedX: 3,
    /** Faixa em que nascem: começa `zoneTop` px acima do pé do feixe e tem `zoneHeight` de altura. */
    zoneTop: 16,
    zoneHeight: 56,
  },
  /**
   * A passagem que leva adiante: um arco de pedra aberto para a região seguinte, com a paisagem
   * dela do outro lado e uma placa com o nome do lugar. `x` vem do marcador 'X' (ou 'Y') do
   * desenho; o chão é o da sala.
   */
  gate: {
    width: 72,
    height: 116,
    /** Vão do arco (px dentro do quadro): largura, topo e fundo (acima da soleira). */
    opening: { width: 40, top: 16, bottom: 112 },
    /** Região em que o herói entra na passagem: meia largura e altura (px) a partir do chão. */
    trigger: { halfWidth: 14, height: 84 },
    /** A luz de fora que entra pelo arco, e o quanto ela oscila. */
    light: { radius: 135, strength: 1 },
    glowAlpha: 0.2,
    glowPulseMs: 3200,
    /** Arco selado (o mini-chefe da área ainda vive): véu escuro sobre a paisagem. */
    seal: { color: 0x0b0d14, alpha: 0.88 },
    /** Altura (px) do centro da placa acima do topo do arco. */
    labelDy: 12,
    /** A placa de madeira: folga lateral, altura, correntes e cores. */
    sign: {
      padX: 5,
      height: 14,
      chain: 6,
      wood: 0x5a4128,
      woodLight: 0x7d5a37,
      woodDark: 0x2e2016,
    },
    /** Poeira e vaga-lumes da região que entram pelo arco. */
    dust: {
      frequencyMs: 240,
      lifespanMs: 2600,
      speedY: { min: -10, max: -3 },
      speedX: 5,
      alpha: 0.7,
    },
  },
  depth: {
    pillar: -5.4,
    colossus: -5.2,
    shaft: -3,
    runes: -3.4,
    banner: -4.6,
    floorDecor: 0.04,
    view: -3.2,
    gate: -3.1,
  },
} as const;
