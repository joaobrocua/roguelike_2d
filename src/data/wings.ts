/**
 * Alas e mobília: cada área é dividida em alas (o castelo tem salão, biblioteca, capela...), e cada
 * ala tem a sua mobília e o seu nome. As salas do mapa ficam em faixas de alas (da esquerda para a
 * direita), então atravessar a área é atravessar ambientes diferentes. Só dados: a lógica está em
 * logic/wings.ts e logic/furniture.ts, e o desenho em systems/furnitureArt.ts.
 */
import type { BiomeId } from './mapRules';

export type FurnitureKind =
  // Chão
  | 'barrel'
  | 'crates'
  | 'cart'
  | 'weaponRack'
  | 'dummy'
  | 'table'
  | 'chair'
  | 'bookshelf'
  | 'books'
  | 'pew'
  | 'altar'
  | 'candelabra'
  | 'skulls'
  | 'coffin'
  | 'cell'
  | 'urn'
  | 'log'
  | 'stump'
  | 'mushrooms'
  | 'signpost'
  | 'campfire'
  | 'boat'
  | 'reeds'
  | 'stakes'
  | 'tombstone'
  | 'grave'
  | 'weapons'
  | 'bannerPole'
  | 'minecart'
  | 'pickaxes'
  | 'rubble'
  | 'crystals'
  // Teto
  | 'tapestry'
  | 'chandelier'
  | 'cage'
  | 'roots'
  | 'lantern'
  | 'cocoon'
  | 'net'
  | 'stalactite';

export type FurniturePlacement = 'floor' | 'ceiling';

/** Luz que uma mobília solta (velas, candelabros): alcance em px e força de 0 a 1. */
export interface FurnitureLight {
  radius: number;
  strength: number;
  /** Altura (px) do ponto de luz medida do chão (peças de chão) ou do teto (peças de teto). */
  dy: number;
}

export interface FurnitureSpec {
  placement: FurniturePlacement;
  /** Tamanho em blocos de 16 px: largura e altura (ar que precisa estar livre acima do chão, ou abaixo do teto). */
  widthTiles: number;
  heightTiles: number;
  /** Quantos desenhos diferentes existem (a variante sorteada vai de 0 a variants - 1). */
  variants: number;
  light?: FurnitureLight;
}

export const FURNITURE: Readonly<Record<FurnitureKind, FurnitureSpec>> = {
  barrel: { placement: 'floor', widthTiles: 1, heightTiles: 1, variants: 2 },
  crates: { placement: 'floor', widthTiles: 2, heightTiles: 1, variants: 2 },
  cart: { placement: 'floor', widthTiles: 3, heightTiles: 2, variants: 1 },
  weaponRack: { placement: 'floor', widthTiles: 2, heightTiles: 2, variants: 2 },
  dummy: { placement: 'floor', widthTiles: 1, heightTiles: 2, variants: 2 },
  table: {
    placement: 'floor',
    widthTiles: 3,
    heightTiles: 2,
    variants: 2,
    light: { radius: 54, strength: 0.6, dy: 22 },
  },
  chair: { placement: 'floor', widthTiles: 1, heightTiles: 1, variants: 2 },
  bookshelf: { placement: 'floor', widthTiles: 2, heightTiles: 3, variants: 3 },
  books: { placement: 'floor', widthTiles: 1, heightTiles: 1, variants: 2 },
  pew: { placement: 'floor', widthTiles: 3, heightTiles: 1, variants: 2 },
  altar: {
    placement: 'floor',
    widthTiles: 2,
    heightTiles: 2,
    variants: 1,
    light: { radius: 64, strength: 0.7, dy: 26 },
  },
  candelabra: {
    placement: 'floor',
    widthTiles: 1,
    heightTiles: 3,
    variants: 1,
    light: { radius: 70, strength: 0.8, dy: 40 },
  },
  skulls: { placement: 'floor', widthTiles: 2, heightTiles: 1, variants: 3 },
  coffin: { placement: 'floor', widthTiles: 3, heightTiles: 2, variants: 2 },
  cell: { placement: 'floor', widthTiles: 3, heightTiles: 3, variants: 2 },
  urn: { placement: 'floor', widthTiles: 1, heightTiles: 1, variants: 2 },
  log: { placement: 'floor', widthTiles: 3, heightTiles: 1, variants: 2 },
  stump: { placement: 'floor', widthTiles: 1, heightTiles: 1, variants: 2 },
  mushrooms: {
    placement: 'floor',
    widthTiles: 1,
    heightTiles: 1,
    variants: 3,
    light: { radius: 38, strength: 0.5, dy: 7 },
  },
  signpost: { placement: 'floor', widthTiles: 1, heightTiles: 2, variants: 2 },
  campfire: {
    placement: 'floor',
    widthTiles: 2,
    heightTiles: 1,
    variants: 1,
    light: { radius: 72, strength: 0.75, dy: 9 },
  },
  tapestry: { placement: 'ceiling', widthTiles: 2, heightTiles: 3, variants: 3 },
  roots: { placement: 'ceiling', widthTiles: 2, heightTiles: 3, variants: 3 },
  lantern: {
    placement: 'ceiling',
    widthTiles: 1,
    heightTiles: 2,
    variants: 1,
    light: { radius: 66, strength: 0.75, dy: 22 },
  },
  cocoon: { placement: 'ceiling', widthTiles: 1, heightTiles: 2, variants: 2 },
  boat: { placement: 'floor', widthTiles: 3, heightTiles: 1, variants: 2 },
  reeds: { placement: 'floor', widthTiles: 1, heightTiles: 2, variants: 3 },
  stakes: { placement: 'floor', widthTiles: 1, heightTiles: 1, variants: 2 },
  tombstone: { placement: 'floor', widthTiles: 1, heightTiles: 2, variants: 4 },
  grave: { placement: 'floor', widthTiles: 3, heightTiles: 1, variants: 2 },
  weapons: { placement: 'floor', widthTiles: 2, heightTiles: 2, variants: 3 },
  bannerPole: { placement: 'floor', widthTiles: 1, heightTiles: 3, variants: 2 },
  minecart: { placement: 'floor', widthTiles: 3, heightTiles: 2, variants: 3 },
  pickaxes: { placement: 'floor', widthTiles: 1, heightTiles: 2, variants: 2 },
  rubble: { placement: 'floor', widthTiles: 2, heightTiles: 1, variants: 3 },
  crystals: {
    placement: 'floor',
    widthTiles: 1,
    heightTiles: 2,
    variants: 3,
    light: { radius: 56, strength: 0.65, dy: 14 },
  },
  stalactite: { placement: 'ceiling', widthTiles: 1, heightTiles: 2, variants: 3 },
  net: { placement: 'ceiling', widthTiles: 2, heightTiles: 2, variants: 2 },
  chandelier: {
    placement: 'ceiling',
    widthTiles: 2,
    heightTiles: 2,
    variants: 1,
    light: { radius: 84, strength: 0.85, dy: 28 },
  },
  cage: { placement: 'ceiling', widthTiles: 1, heightTiles: 2, variants: 2 },
};

export type WingId =
  | 'patio'
  | 'estabulo'
  | 'salao'
  | 'biblioteca'
  | 'capela'
  | 'ossuario'
  | 'masmorra'
  | 'cripta'
  | 'bosque'
  | 'raizes'
  | 'charco'
  | 'palafitas'
  | 'jazigos'
  | 'campo'
  | 'galeria'
  | 'gruta';

export interface WingDef {
  id: WingId;
  /** Nome que aparece ao entrar na ala (cabe em 21 letras da fonte de pixels). */
  name: string;
  /** Mobília da ala e o peso de cada peça no sorteio. */
  furniture: readonly { kind: FurnitureKind; weight: number }[];
  /** Quantas peças cada sala da ala recebe (mínimo e máximo, sorteado por sala). */
  count: { min: number; max: number };
}

/** As alas de cada área, na ordem em que aparecem da esquerda para a direita (a ordem muda por semente). */
export const WINGS: Readonly<Record<BiomeId, readonly WingDef[]>> = {
  muralhas: [
    {
      id: 'patio',
      name: 'PÁTIO DE ARMAS',
      furniture: [
        { kind: 'barrel', weight: 3 },
        { kind: 'crates', weight: 3 },
        { kind: 'dummy', weight: 3 },
        { kind: 'weaponRack', weight: 3 },
        { kind: 'cart', weight: 1 },
        { kind: 'urn', weight: 1 },
      ],
      count: { min: 2, max: 4 },
    },
    {
      id: 'estabulo',
      name: 'CELEIROS E ESTÁBULOS',
      furniture: [
        { kind: 'cart', weight: 3 },
        { kind: 'barrel', weight: 4 },
        { kind: 'crates', weight: 4 },
        { kind: 'urn', weight: 1 },
      ],
      count: { min: 2, max: 4 },
    },
  ],
  saloes: [
    {
      id: 'salao',
      name: 'SALÃO DO TRONO',
      furniture: [
        { kind: 'table', weight: 3 },
        { kind: 'chair', weight: 3 },
        { kind: 'candelabra', weight: 2 },
        { kind: 'chandelier', weight: 2 },
        { kind: 'tapestry', weight: 3 },
      ],
      count: { min: 3, max: 5 },
    },
    {
      id: 'biblioteca',
      name: 'BIBLIOTECA',
      furniture: [
        { kind: 'bookshelf', weight: 5 },
        { kind: 'books', weight: 3 },
        { kind: 'candelabra', weight: 2 },
        { kind: 'table', weight: 1 },
        { kind: 'chandelier', weight: 1 },
      ],
      count: { min: 3, max: 5 },
    },
    {
      id: 'capela',
      name: 'CAPELA',
      furniture: [
        { kind: 'pew', weight: 4 },
        { kind: 'altar', weight: 2 },
        { kind: 'candelabra', weight: 3 },
        { kind: 'tapestry', weight: 2 },
        { kind: 'urn', weight: 1 },
      ],
      count: { min: 3, max: 5 },
    },
  ],
  catacumbas: [
    {
      id: 'ossuario',
      name: 'OSSUÁRIO',
      furniture: [
        { kind: 'skulls', weight: 5 },
        { kind: 'coffin', weight: 2 },
        { kind: 'urn', weight: 2 },
        { kind: 'candelabra', weight: 1 },
      ],
      count: { min: 2, max: 4 },
    },
    {
      id: 'masmorra',
      name: 'MASMORRA',
      furniture: [
        { kind: 'cell', weight: 4 },
        { kind: 'cage', weight: 3 },
        { kind: 'skulls', weight: 1 },
        { kind: 'barrel', weight: 1 },
      ],
      count: { min: 2, max: 4 },
    },
    {
      id: 'cripta',
      name: 'CRIPTA REAL',
      furniture: [
        { kind: 'coffin', weight: 4 },
        { kind: 'altar', weight: 1 },
        { kind: 'candelabra', weight: 3 },
        { kind: 'urn', weight: 2 },
        { kind: 'tapestry', weight: 1 },
      ],
      count: { min: 2, max: 4 },
    },
  ],
  floresta: [
    {
      id: 'bosque',
      name: 'BOSQUE MORTO',
      furniture: [
        { kind: 'log', weight: 4 },
        { kind: 'stump', weight: 3 },
        { kind: 'mushrooms', weight: 3 },
        { kind: 'signpost', weight: 1 },
        { kind: 'campfire', weight: 1 },
        { kind: 'lantern', weight: 2 },
      ],
      count: { min: 3, max: 5 },
    },
    {
      id: 'raizes',
      name: 'TÚNEL DE RAÍZES',
      furniture: [
        { kind: 'roots', weight: 5 },
        { kind: 'mushrooms', weight: 3 },
        { kind: 'cocoon', weight: 2 },
        { kind: 'lantern', weight: 2 },
        { kind: 'stump', weight: 1 },
      ],
      count: { min: 3, max: 5 },
    },
  ],
  pantano: [
    {
      id: 'charco',
      name: 'CHARCO DOS AFOGADOS',
      furniture: [
        { kind: 'reeds', weight: 5 },
        { kind: 'stakes', weight: 2 },
        { kind: 'boat', weight: 2 },
        { kind: 'mushrooms', weight: 2 },
        { kind: 'skulls', weight: 1 },
      ],
      count: { min: 3, max: 5 },
    },
    {
      id: 'palafitas',
      name: 'VILA DE PALAFITAS',
      furniture: [
        { kind: 'barrel', weight: 3 },
        { kind: 'crates', weight: 3 },
        { kind: 'net', weight: 3 },
        { kind: 'lantern', weight: 2 },
        { kind: 'boat', weight: 1 },
        { kind: 'cage', weight: 1 },
      ],
      count: { min: 3, max: 5 },
    },
  ],
  cemiterio: [
    {
      id: 'jazigos',
      name: 'JAZIGOS ESQUECIDOS',
      furniture: [
        { kind: 'tombstone', weight: 6 },
        { kind: 'grave', weight: 3 },
        { kind: 'urn', weight: 2 },
        { kind: 'skulls', weight: 2 },
        { kind: 'lantern', weight: 2 },
        { kind: 'roots', weight: 1 },
      ],
      count: { min: 3, max: 5 },
    },
    {
      id: 'campo',
      name: 'CAMPO DE BATALHA',
      furniture: [
        { kind: 'weapons', weight: 5 },
        { kind: 'bannerPole', weight: 3 },
        { kind: 'cart', weight: 2 },
        { kind: 'campfire', weight: 2 },
        { kind: 'skulls', weight: 2 },
        { kind: 'crates', weight: 1 },
        { kind: 'cage', weight: 1 },
      ],
      count: { min: 3, max: 5 },
    },
  ],
  minas: [
    {
      id: 'galeria',
      name: 'GALERIA DE EXTRAÇÃO',
      furniture: [
        { kind: 'minecart', weight: 4 },
        { kind: 'pickaxes', weight: 3 },
        { kind: 'rubble', weight: 3 },
        { kind: 'crates', weight: 2 },
        { kind: 'barrel', weight: 2 },
        { kind: 'lantern', weight: 3 },
      ],
      count: { min: 3, max: 5 },
    },
    {
      id: 'gruta',
      name: 'GRUTA DE CRISTAIS',
      furniture: [
        { kind: 'crystals', weight: 5 },
        { kind: 'rubble', weight: 3 },
        { kind: 'mushrooms', weight: 2 },
        { kind: 'skulls', weight: 1 },
        { kind: 'stalactite', weight: 4 },
        { kind: 'roots', weight: 1 },
      ],
      count: { min: 3, max: 5 },
    },
  ],
};

/** Distância mínima (em blocos) entre duas peças de mobília na mesma sala. */
export const FURNITURE_GAP_TILES = 1;

/** Quantas posições o sorteio testa por peça antes de desistir dela (a sala pode estar cheia). */
export const FURNITURE_ATTEMPTS = 24;

/** O brilho das peças com chama: ordem de desenho, tamanho e força em relação ao das tochas, e o pulso. */
export const FURNITURE_GLOW = {
  /** Atrás dos personagens (0,2) e na frente dos blocos (0). */
  depth: 0.02,
  scale: 0.8,
  alpha: 1.1,
  /** O brilho pulsa até esta fração do valor inicial. */
  swing: 0.6,
  pulseMs: 1400,
} as const;
