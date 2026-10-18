import type Phaser from 'phaser';
import { DECOR_RULES, type DecorKind } from '../data/decor';
import { BIOME_LOOK, type BiomeLook } from '../data/biomeLook';
import { ALL_BIOMES, type BiomeId } from '../data/mapRules';
import { createRng, randomInt, type Rng } from '../utils/rng';
import { canvasTexture, disc, line, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Decoração do cenário em pixel art. Cada bioma tem a sua própria família de peças: samambaias e
 * troncos na floresta, taboas e estacas no pântano, cruzes e lápides no cemitério, cristais e
 * minério nas minas, cinzas e vigas queimadas na vila, ervas e alvenaria nas muralhas, velas,
 * livros e vitrais nos salões, cogumelos e crânios nas catacumbas.
 *
 * Os desenhos que "crescem" do chão têm a base na última linha; os que pendem do teto têm o topo
 * na primeira. Sem contorno: cada peça usa 3 ou 4 tons (luz, base, sombra e um destaque).
 */

export interface DecorSize {
  width: number;
  height: number;
}

const BONE = 0xc4c0aa;
const BONE_SHADE = 0x8d8a78;
const BONE_LIGHT = 0xe2dfcc;
const DARK = 0x0b0d14;

/** Minério e cristal das minas. */
const CRYSTAL = 0x4ae0d0;
const CRYSTAL_HOT = 0xc8fff8;
const CRYSTAL_DARK = 0x1a7a78;
const GOLD = 0xe0b040;
const GOLD_HOT = 0xfff0a0;
const GOLD_DARK = 0x8a5a14;

/** Madeira queimada, cinza, barro cozido e tijolo da vila. */
const CHAR = 0x2a1c16;
const CHAR_LIGHT = 0x5a4034;
const SOOT = 0x0a0605;
const ASH = 0x756d66;
const ASH_LIGHT = 0xa0968c;
const ASH_DARK = 0x433d38;
const TERRACOTTA = 0xa5603a;
const BRICK = 0x8a3a2a;

/** Papel, couro e cera dos salões. */
const PAPER = 0xd8ccaa;
const PAPER_SHADE = 0x9a8e6e;
const LEATHER = 0x6a2a35;
const WAX = 0xe8dcc0;
const WAX_SHADE = 0xa89878;
const BRASS = 0xb08a3a;
const SHARD_COLORS = [0xc0334a, 0x3a6ad0, 0xe8a030, 0x3a9a60, 0x8a4ac0] as const;

/** Água parada e lodo do pântano; casca de tronco da floresta. */
const WATER = 0x16262c;
const BARK = 0x5a4026;

/** Tamanho (px) de cada tipo de decoração. */
export const DECOR_SIZE: Readonly<Record<DecorKind, DecorSize>> = {
  tuft: { width: 14, height: 12 },
  rubble: { width: 14, height: 9 },
  bone: { width: 14, height: 8 },
  vine: { width: 9, height: 28 },
  chain: { width: 5, height: 30 },
  drip: { width: 6, height: 12 },
  cobweb: { width: 14, height: 14 },
  crack: { width: 14, height: 16 },
  banner: { width: 12, height: 40 },
};

/** Chave da textura de uma decoração. */
export function decorTextureKey(biome: BiomeId, kind: DecorKind, variant: number): string {
  return `decor-${biome}-${kind}-${variant}`;
}

// Linha do chão (última linha) de cada peça que se apoia nele.
const TUFT_BASE = DECOR_SIZE.tuft.height - 1;
const RUBBLE_BASE = DECOR_SIZE.rubble.height - 1;
const BONE_BASE = DECOR_SIZE.bone.height - 1;

/** Assinatura dos desenhos de peças de chão: um por bioma, escolhido pela variante. */
type FloorDrawer = (ctx: Ctx, look: BiomeLook, variant: number, rng: Rng) => void;

// ---------------------------------------------------------------------------------------------
// Ferramentas comuns
// ---------------------------------------------------------------------------------------------

interface Tones {
  hi: number;
  base: number;
  sh: number;
}

function tones(color: number): Tones {
  return { hi: mix(color, 0xffffff, 0.35), base: color, sh: mix(color, 0x000000, 0.45) };
}

/** Tons do musgo/folhagem do bioma. */
function leafTones(look: BiomeLook): Tones {
  return { hi: look.mossLight, base: look.moss, sh: mix(look.moss, 0x000000, 0.45) };
}

function px(ctx: Ctx, color: number, x: number, y: number, alpha = 1): void {
  rect(ctx, color, x, y, 1, 1, alpha);
}

/** Lâmina de capim: coluna de 1 px com a ponta mais clara, inclinada para `lean`. */
function blade(ctx: Ctx, t: Tones, x: number, base: number, h: number, lean: number): void {
  rect(ctx, t.base, x, base - h + 1, 1, h);
  px(ctx, t.hi, x + lean, base - h, 0.9);
  px(ctx, t.sh, x, base, 0.8);
}

/** Touceira: `count` lâminas de alturas diferentes entre as colunas x0 e x1. */
function grass(
  ctx: Ctx,
  rng: Rng,
  t: Tones,
  x0: number,
  x1: number,
  base: number,
  count: number,
  minH: number,
  maxH: number,
): void {
  for (let i = 0; i < count; i++) {
    const x = count > 1 ? x0 + Math.round(((x1 - x0) * i) / (count - 1)) : x0;
    blade(ctx, t, x, base, randomInt(rng, minH, maxH + 1), rng() < 0.5 ? -1 : 1);
  }
}

/** Folha de samambaia: linha com folíolos claros de dois em dois pixels. */
function frond(ctx: Ctx, t: Tones, x0: number, y0: number, x1: number, y1: number): void {
  line(ctx, t.base, x0, y0, x1, y1);
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 2; i < steps; i += 2) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    px(ctx, t.hi, x, y - 1, 0.9);
  }
  px(ctx, t.hi, x1, y1);
}

/** Flor num caule: pétalas 2x2 com o miolo no canto. */
function stalkFlower(
  ctx: Ctx,
  t: Tones,
  petal: number,
  center: number,
  x: number,
  base: number,
  h: number,
): void {
  rect(ctx, t.base, x, base - h + 2, 1, h - 1);
  rect(ctx, petal, x, base - h, 2, 2);
  px(ctx, center, x, base - h);
}

/** Cogumelo que brilha: halo suave, caule pálido e chapéu com pintas. */
function shroom(ctx: Ctx, look: BiomeLook, x: number, base: number, stemH: number, capR: number) {
  const capTop = base - stemH - 1;
  disc(ctx, look.glow, x, capTop + 1, 2, 0.07);
  rect(ctx, mix(look.glow, 0x9a9a8a, 0.55), x, capTop + 2, 1, stemH);
  rect(ctx, look.glowSoft, x - capR + 1, capTop, capR * 2 - 1, 1);
  rect(ctx, mix(look.glowSoft, 0x000000, 0.3), x - capR, capTop + 1, capR * 2 + 1, 1);
  px(ctx, look.glow, x, capTop, 0.95);
  if (capR >= 2) px(ctx, look.glow, x + capR - 1, capTop + 1, 0.8);
}

/** Pedra pequena: luz em cima, sombra à direita e embaixo. */
function chunk(
  ctx: Ctx,
  look: BiomeLook,
  x: number,
  base: number,
  w: number,
  h: number,
  alpha = 1,
): void {
  const s = look.stone;
  const y = base - h + 1;
  rect(ctx, s.base, x, y, w, h, alpha);
  rect(ctx, s.highlight, x, y, w, 1, 0.8 * alpha);
  rect(ctx, s.deep, x + w - 1, y + 1, 1, h - 1, 0.7 * alpha);
  rect(ctx, s.deep, x, base, w, 1, 0.5 * alpha);
}

/** Capa de musgo sobre uma peça. */
function mossCap(ctx: Ctx, look: BiomeLook, x: number, y: number, w: number): void {
  rect(ctx, look.moss, x, y, w, 1, 0.95);
  px(ctx, look.mossLight, x + 1, y - 1, 0.85);
}

/** Mancha irregular de pixels (musgo, fuligem, limo). */
function patch(
  ctx: Ctx,
  rng: Rng,
  color: number,
  cx: number,
  cy: number,
  r: number,
  alpha: number,
): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = dx * dx + dy * dy;
      if (d < r * r * 0.6 || (d <= r * r && rng() < 0.55)) px(ctx, color, cx + dx, cy + dy, alpha);
    }
  }
}

/** Crânio de frente, 5x5, com a base em `base`. */
function skull(ctx: Ctx, x: number, base: number): void {
  rect(ctx, BONE_LIGHT, x + 1, base - 4, 3, 1);
  rect(ctx, BONE, x, base - 3, 5, 2);
  rect(ctx, BONE, x + 1, base - 1, 3, 1);
  rect(ctx, BONE_SHADE, x + 1, base, 3, 1);
  px(ctx, DARK, x + 1, base - 2);
  px(ctx, DARK, x + 3, base - 2);
  px(ctx, BONE_SHADE, x + 2, base - 1);
}

/** Pilha de três crânios (cabe em 14x8). */
function skullPile(ctx: Ctx, base: number): void {
  skull(ctx, 1, base);
  skull(ctx, 8, base);
  skull(ctx, 4, base - 3);
}

/** Costelas em arco sobre a coluna. */
function ribs(ctx: Ctx, x0: number, base: number): void {
  rect(ctx, BONE_SHADE, x0, base, 11, 1);
  for (let i = 0; i < 5; i++) {
    const h = i % 2 === 0 ? 3 : 4;
    rect(ctx, BONE, x0 + 1 + i * 2, base - h, 1, h);
    px(ctx, BONE_LIGHT, x0 + 1 + i * 2, base - h);
  }
}

/** Osso comprido com as pontas grossas. */
function longBone(ctx: Ctx, x0: number, base: number, len = 12): void {
  rect(ctx, BONE, x0 + 2, base - 1, len - 4, 1);
  rect(ctx, BONE_SHADE, x0 + 2, base, len - 4, 1);
  for (const x of [x0, x0 + len - 2]) {
    rect(ctx, BONE, x, base - 2, 2, 2);
    rect(ctx, BONE_SHADE, x, base, 2, 1);
    px(ctx, BONE_LIGHT, x, base - 2);
  }
}

/** Cruz de madeira torta: a parte de cima desvia `tilt` pixels da de baixo. */
function cross(ctx: Ctx, t: Tones, x: number, base: number, h: number, tilt: number): void {
  const split = base - Math.floor(h / 2);
  const top = base - h + 1;
  rect(ctx, t.sh, x - 2, base, 6, 1, 0.6);
  rect(ctx, t.base, x, split, 2, base - split + 1);
  rect(ctx, t.sh, x + 1, split, 1, base - split + 1, 0.8);
  rect(ctx, t.base, x + tilt, top, 2, split - top);
  const arm = top + 2;
  rect(ctx, t.base, x + tilt - 2, arm, 2, 1);
  rect(ctx, t.base, x + tilt + 2, arm - 1, 2, 1);
  px(ctx, t.hi, x + tilt, top);
  px(ctx, t.hi, x + tilt - 2, arm);
}

/** Cristal alongado (w de 2 ou 3 px): face clara à esquerda, sombra à direita. */
function crystal(ctx: Ctx, x: number, base: number, h: number, w: number): void {
  const top = base - h + 1;
  disc(ctx, CRYSTAL, x + 1, base - 2, 2, 0.07);
  rect(ctx, CRYSTAL, x, top + 1, w, h - 1);
  rect(ctx, CRYSTAL, x + 1, top, Math.max(1, w - 2), 1);
  rect(ctx, CRYSTAL_HOT, x, top + 1, 1, Math.max(1, h - 2), 0.8);
  rect(ctx, CRYSTAL_DARK, x + w - 1, top + 1, 1, h - 1);
  px(ctx, CRYSTAL_HOT, x + 1, top);
}

/** Pepita de ouro com brilho no alto. */
function nugget(ctx: Ctx, x: number, base: number, w: number, h: number): void {
  const y = base - h + 1;
  rect(ctx, GOLD, x, y, w, h);
  rect(ctx, GOLD_HOT, x, y, w, 1, 0.9);
  rect(ctx, GOLD_DARK, x + w - 1, y + 1, 1, h - 1);
  rect(ctx, GOLD_DARK, x, base, w, 1, 0.7);
  px(ctx, 0xffffff, x + 1, y, 0.8);
}

/** Estilhaço de vitral triangular apontando para cima (cor viva com um brilho no canto). */
function shard(ctx: Ctx, color: number, x: number, base: number, w: number, h: number): void {
  for (let i = 0; i < h; i++) {
    const width = Math.max(1, Math.round(w * (1 - i / h)));
    rect(ctx, color, x, base - i, width, 1, 0.95);
  }
  px(ctx, mix(color, 0xffffff, 0.55), x, base - h + 1);
  rect(ctx, mix(color, 0x000000, 0.4), x, base, w, 1, 0.7);
}

// ---------------------------------------------------------------------------------------------
// Tufos (chão): 14x12
// ---------------------------------------------------------------------------------------------

function tuftMuralhas(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const t = leafTones(look);
  const b = TUFT_BASE;
  const white = look.glow;
  if (variant === 0) {
    // Ervas daninhas de folha larga
    grass(ctx, rng, t, 2, 11, b, 7, 4, 8);
  } else if (variant === 1) {
    grass(ctx, rng, t, 1, 12, b, 6, 3, 6);
    stalkFlower(ctx, t, white, 0xe8d060, 4, b, 9);
    stalkFlower(ctx, t, white, 0xe8d060, 9, b, 7);
  } else if (variant === 2) {
    // Dente-de-leão
    grass(ctx, rng, t, 2, 11, b, 5, 2, 4);
    rect(ctx, t.base, 6, b - 8, 1, 9);
    line(ctx, t.base, 6, b, 3, b - 3);
    line(ctx, t.base, 6, b, 9, b - 3);
    disc(ctx, white, 6, b - 9, 1, 0.95);
    px(ctx, 0xe8d060, 6, b - 9);
  } else {
    // Trevo rasteiro com florezinhas
    rect(ctx, t.sh, 1, b - 1, 12, 2, 0.9);
    for (let x = 1; x < 13; x += 2) px(ctx, t.hi, x, b - 1, 0.9);
    stalkFlower(ctx, t, white, 0xe8d060, 3, b, 6);
    stalkFlower(ctx, t, white, 0xe8d060, 7, b, 7);
    stalkFlower(ctx, t, white, 0xe8d060, 11, b, 5);
  }
}

/** Vela caída, com um fiapo de chama e um halo quente. */
function candle(ctx: Ctx, look: BiomeLook, x: number, base: number, len: number): void {
  disc(ctx, look.glow, x + len, base - 2, 2, 0.1);
  rect(ctx, WAX_SHADE, x - 1, base, 2, 1, 0.8);
  rect(ctx, WAX, x, base - 1, len, 2);
  rect(ctx, 0xf6eede, x, base - 1, len, 1, 0.9);
  rect(ctx, WAX_SHADE, x, base, len, 1);
  px(ctx, 0x2a1a14, x + len, base - 1);
  px(ctx, look.glow, x + len, base - 2);
  px(ctx, 0xfff0b0, x + len, base - 3, 0.9);
}

/** Livro de pé ou deitado: capa, miolo de páginas à direita e luz no alto. */
function book(ctx: Ctx, color: number, x: number, base: number, w: number, h: number): void {
  rect(ctx, color, x, base - h + 1, w, h);
  rect(ctx, mix(color, 0xffffff, 0.3), x, base - h + 1, w, 1, 0.9);
  rect(ctx, PAPER, x + w - 1, base - h + 2, 1, h - 2);
  rect(ctx, mix(color, 0x000000, 0.4), x, base, w, 1, 0.8);
}

function tuftSaloes(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = TUFT_BASE;
  if (variant === 0) {
    // Vela caída ao lado de um castiçal de latão
    candle(ctx, look, 2, b, 7);
    rect(ctx, BRASS, 10, b, 3, 1);
    rect(ctx, mix(BRASS, 0xffffff, 0.4), 10, b - 1, 1, 1);
    rect(ctx, BRASS, 11, b - 2, 1, 2);
    px(ctx, mix(BRASS, 0x000000, 0.4), 12, b);
  } else if (variant === 1) {
    // Livros: dois deitados e um encostado
    book(ctx, LEATHER, 1, b, 8, 3);
    book(ctx, 0x2f5f7a, 2, b - 3, 6, 2);
    book(ctx, 0x3d6b3a, 10, b, 3, 6);
    px(ctx, BRASS, 11, b - 4);
  } else if (variant === 2) {
    // Páginas soltas, com linhas de texto
    for (const [x, y, w] of [
      [1, b - 1, 6],
      [5, b, 7],
      [3, b - 3, 5],
    ] as const) {
      rect(ctx, PAPER, x, y, w, 1);
      for (let i = 1; i < w - 1; i += 2) px(ctx, 0x4a3a2a, x + i, y, 0.7);
    }
    rect(ctx, PAPER, 9, b - 2, 4, 2);
    px(ctx, PAPER_SHADE, 10, b - 2);
    px(ctx, PAPER_SHADE, 12, b - 1);
  } else {
    // Toco de vela em pé, com cera escorrida
    disc(ctx, look.glow, 6, b - 5, 3, 0.1);
    rect(ctx, WAX_SHADE, 3, b, 8, 1, 0.85);
    rect(ctx, WAX, 5, b - 3, 3, 3);
    rect(ctx, 0xf6eede, 5, b - 3, 1, 3, 0.9);
    rect(ctx, WAX_SHADE, 7, b - 2, 1, 2);
    px(ctx, 0x2a1a14, 6, b - 4);
    px(ctx, look.glow, 6, b - 5);
    px(ctx, 0xfff0b0, 6, b - 6, 0.9);
    px(ctx, WAX, 4, b - 1);
  }
}

/** Esteira de líquen escuro que cobre o chão nas catacumbas. */
function lichenMat(ctx: Ctx, look: BiomeLook, rng: Rng): void {
  const b = TUFT_BASE;
  rect(ctx, mix(look.moss, look.stone.deep, 0.4), 1, b, 12, 1, 0.9);
  for (let x = 1; x < 13; x++) if (rng() < 0.55) px(ctx, look.moss, x, b - 1, 0.85);
}

function tuftCatacumbas(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const b = TUFT_BASE;
  lichenMat(ctx, look, rng);
  if (variant === 0) {
    shroom(ctx, look, 3, b, 3, 1);
    shroom(ctx, look, 7, b, 5, 2);
    shroom(ctx, look, 11, b, 2, 1);
  } else if (variant === 1) {
    shroom(ctx, look, 4, b, 7, 1);
    shroom(ctx, look, 8, b, 5, 1);
    shroom(ctx, look, 11, b, 3, 1);
  } else if (variant === 2) {
    shroom(ctx, look, 6, b, 4, 3);
    shroom(ctx, look, 2, b, 2, 1);
    shroom(ctx, look, 11, b, 2, 1);
  } else {
    // Líquen alto e um cogumelo
    for (const [x, h] of [
      [2, 3],
      [4, 2],
      [11, 3],
      [12, 2],
    ] as const) {
      rect(ctx, look.moss, x, b - h, 1, h);
      px(ctx, look.mossLight, x, b - h, 0.9);
    }
    shroom(ctx, look, 8, b, 4, 2);
  }
}

function tuftFloresta(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const t = leafTones(look);
  const b = TUFT_BASE;
  if (variant === 0) {
    // Samambaia grande
    frond(ctx, t, 6, b, 6, 3);
    frond(ctx, t, 6, b, 1, 6);
    frond(ctx, t, 6, b, 11, 6);
    frond(ctx, t, 7, b, 9, 5);
    rect(ctx, t.sh, 5, b, 3, 1);
  } else if (variant === 1) {
    // Duas samambaias pequenas e capim
    frond(ctx, t, 4, b, 4, 6);
    frond(ctx, t, 4, b, 1, 8);
    frond(ctx, t, 4, b, 7, 8);
    frond(ctx, t, 10, b, 10, 7);
    frond(ctx, t, 10, b, 8, 9);
    frond(ctx, t, 10, b, 13, 9);
    grass(ctx, rng, t, 6, 7, b, 2, 2, 3);
  } else if (variant === 2) {
    // Cogumelos que brilham
    shroom(ctx, look, 3, b, 3, 1);
    shroom(ctx, look, 7, b, 5, 2);
    shroom(ctx, look, 11, b, 2, 1);
    rect(ctx, t.base, 1, b, 12, 1, 0.8);
  } else {
    grass(ctx, rng, t, 1, 12, b, 9, 3, 7);
    stalkFlower(ctx, t, look.glowSoft, look.glow, 4, b, 9);
    stalkFlower(ctx, t, look.glowSoft, look.glow, 9, b, 7);
  }
}

/** Taboa: haste fina com a espiga marrom no alto. */
function cattail(ctx: Ctx, t: Tones, x: number, base: number, h: number): void {
  rect(ctx, t.base, x, base - h + 3, 1, h - 2);
  px(ctx, t.hi, x, base - h - 1);
  rect(ctx, 0x5a3a24, x, base - h, 2, 3);
  rect(ctx, 0x8a5a38, x, base - h, 1, 3, 0.9);
  px(ctx, t.sh, x, base, 0.8);
}

/** Vitória-régia: disco achatado com um corte e um brilho, boiando na água. */
function lilyPad(ctx: Ctx, look: BiomeLook, x: number, y: number, w: number): void {
  const pad = mix(look.moss, 0x1e3a2a, 0.2);
  rect(ctx, pad, x + 1, y, w - 2, 1);
  rect(ctx, pad, x, y + 1, w, 1);
  px(ctx, look.mossLight, x + 1, y, 0.9);
  px(ctx, WATER, x + Math.floor(w / 2), y + 1);
}

function puddle(ctx: Ctx, x: number, base: number, w: number): void {
  rect(ctx, WATER, x, base - 1, w, 2, 0.85);
  px(ctx, 0x6a8a96, x + 2, base, 0.7);
  px(ctx, 0x6a8a96, x + w - 4, base - 1, 0.55);
}

function tuftPantano(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const t = leafTones(look);
  const b = TUFT_BASE;
  if (variant === 0) {
    // Taboas
    cattail(ctx, t, 3, b, 8);
    cattail(ctx, t, 7, b, 10);
    cattail(ctx, t, 11, b, 7);
    grass(ctx, rng, t, 1, 12, b, 4, 2, 4);
  } else if (variant === 1) {
    // Juncos: hastes finas e compridas, inclinadas
    const leans = [-1, 1, -1, 1, 1, -1, 1] as const;
    leans.forEach((lean, i) => blade(ctx, t, 2 + Math.round(i * 1.5), b, 6 + ((i * 3) % 5), lean));
    px(ctx, 0xc8b070, 5, b - 10, 0.8);
    px(ctx, 0xc8b070, 10, b - 9, 0.8);
  } else if (variant === 2) {
    // Vitórias-régias numa poça, com uma flor
    puddle(ctx, 1, b, 12);
    lilyPad(ctx, look, 2, b - 2, 5);
    lilyPad(ctx, look, 8, b - 2, 4);
    px(ctx, 0xf0d8e0, 4, b - 3);
    px(ctx, 0xf0d8e0, 5, b - 3);
    px(ctx, 0xe8c050, 4, b - 4);
  } else {
    puddle(ctx, 1, b, 7);
    lilyPad(ctx, look, 2, b - 2, 4);
    cattail(ctx, t, 10, b, 9);
    blade(ctx, t, 12, b, 6, 1);
    blade(ctx, t, 9, b, 5, -1);
  }
}

/** Capim seco do cemitério: palha amarelada com a ponta mais clara. */
function dryTones(look: BiomeLook): Tones {
  const base = mix(look.moss, 0x9a8a50, 0.55);
  return { hi: mix(base, 0xd8c890, 0.45), base, sh: mix(base, 0x000000, 0.5) };
}

/** Flor murcha: cabeça caída para o lado. */
function wiltedFlower(ctx: Ctx, look: BiomeLook, t: Tones, x: number, base: number, h: number) {
  rect(ctx, t.base, x, base - h + 1, 1, h);
  const petal = mix(look.glowSoft, look.stone.base, 0.35);
  px(ctx, petal, x + 1, base - h);
  px(ctx, petal, x + 1, base - h + 1);
  px(ctx, mix(petal, 0xffffff, 0.3), x, base - h, 0.9);
}

function tuftCemiterio(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const dry = dryTones(look);
  const b = TUFT_BASE;
  const wood = tones(mix(look.stone.light, 0x5a4026, 0.55));
  if (variant === 0) {
    grass(ctx, rng, dry, 1, 12, b, 8, 3, 7);
    wiltedFlower(ctx, look, dry, 4, b, 9);
    wiltedFlower(ctx, look, dry, 9, b, 8);
  } else if (variant === 1) {
    grass(ctx, rng, dry, 1, 12, b, 11, 4, 8);
  } else if (variant === 2) {
    // Cruzinha torta no meio do capim
    cross(ctx, wood, 6, b, 9, 1);
    grass(ctx, rng, dry, 1, 3, b, 2, 2, 4);
    grass(ctx, rng, dry, 10, 12, b, 2, 2, 4);
  } else {
    cross(ctx, wood, 8, b, 7, -1);
    grass(ctx, rng, dry, 1, 5, b, 4, 3, 6);
    wiltedFlower(ctx, look, dry, 11, b, 6);
  }
}

function tuftMinas(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = TUFT_BASE;
  if (variant === 0) {
    // Cristais pequenos
    crystal(ctx, 2, b, 5, 2);
    crystal(ctx, 6, b, 8, 3);
    crystal(ctx, 10, b, 4, 2);
  } else if (variant === 1) {
    // Um cristal grande cercado de pedrinhas
    chunk(ctx, look, 2, b, 3, 2);
    chunk(ctx, look, 10, b, 3, 3);
    crystal(ctx, 5, b, 10, 3);
    crystal(ctx, 9, b - 1, 5, 2);
  } else if (variant === 2) {
    // Pepitas de ouro
    chunk(ctx, look, 1, b, 4, 2);
    nugget(ctx, 3, b, 4, 3);
    nugget(ctx, 8, b, 3, 2);
    nugget(ctx, 10, b - 2, 3, 3);
  } else {
    chunk(ctx, look, 1, b, 5, 3);
    crystal(ctx, 3, b - 2, 6, 2);
    nugget(ctx, 8, b, 4, 3);
    crystal(ctx, 10, b, 4, 2);
  }
}

function tuftVila(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = TUFT_BASE;
  if (variant === 0) {
    // Tábuas queimadas: uma no chão e outra apoiada
    rect(ctx, CHAR, 1, b - 1, 9, 2);
    rect(ctx, CHAR, 10, b, 2, 1);
    rect(ctx, CHAR_LIGHT, 1, b - 1, 9, 1, 0.8);
    px(ctx, SOOT, 4, b, 0.8);
    for (let i = 0; i < 6; i++) {
      rect(ctx, CHAR, 3 + i, b - 2 - i, 2, 1);
      px(ctx, CHAR_LIGHT, 3 + i, b - 2 - i, 0.8);
    }
    px(ctx, look.glow, 8, b - 7);
    px(ctx, look.glowSoft, 9, b - 7, 0.9);
    px(ctx, look.glow, 11, b, 0.9);
  } else if (variant === 1) {
    // Viga em pé, rachada no alto, com brasa; uma tábua caída ao lado
    rect(ctx, CHAR, 4, b - 8, 3, 9);
    px(ctx, CHAR, 4, b - 9);
    px(ctx, CHAR, 6, b - 10);
    rect(ctx, CHAR_LIGHT, 4, b - 8, 1, 8, 0.7);
    rect(ctx, SOOT, 6, b - 8, 1, 9, 0.6);
    px(ctx, look.glow, 5, b - 8);
    px(ctx, look.glowSoft, 6, b - 9, 0.9);
    px(ctx, SOOT, 5, b - 4);
    rect(ctx, CHAR, 8, b - 1, 5, 2);
    rect(ctx, CHAR_LIGHT, 8, b - 1, 5, 1, 0.8);
  } else if (variant === 2) {
    // Cacos de cerâmica
    for (const [x, w, h] of [
      [1, 4, 2],
      [6, 3, 3],
      [10, 3, 1],
    ] as const) {
      rect(ctx, TERRACOTTA, x, b - h + 1, w, h);
      rect(ctx, mix(TERRACOTTA, 0xffffff, 0.3), x, b - h + 1, w, 1);
      rect(ctx, mix(TERRACOTTA, 0x000000, 0.45), x, b, w, 1, 0.8);
    }
    rect(ctx, TERRACOTTA, 3, b - 4, 5, 1);
    px(ctx, TERRACOTTA, 3, b - 3);
    px(ctx, TERRACOTTA, 7, b - 3);
    px(ctx, mix(TERRACOTTA, 0xffffff, 0.3), 4, b - 4);
  } else {
    // Monte de cinza com brasas
    disc(ctx, look.glowSoft, 6, b - 3, 3, 0.1);
    rect(ctx, ASH, 1, b, 12, 1);
    rect(ctx, ASH, 2, b - 1, 10, 1);
    rect(ctx, ASH, 4, b - 2, 6, 1);
    rect(ctx, ASH, 5, b - 3, 4, 1);
    rect(ctx, ASH_LIGHT, 5, b - 3, 3, 1, 0.9);
    rect(ctx, ASH_LIGHT, 4, b - 2, 2, 1, 0.8);
    rect(ctx, ASH_DARK, 1, b, 12, 1, 0.6);
    px(ctx, look.glow, 5, b - 2);
    px(ctx, look.glowSoft, 8, b - 1);
    px(ctx, look.glow, 3, b, 0.9);
    px(ctx, ASH_DARK, 9, b - 2);
  }
}

const TUFT_DRAWERS: Readonly<Record<BiomeId, FloorDrawer>> = {
  muralhas: tuftMuralhas,
  saloes: tuftSaloes,
  catacumbas: tuftCatacumbas,
  floresta: tuftFloresta,
  pantano: tuftPantano,
  cemiterio: tuftCemiterio,
  minas: tuftMinas,
  vila: tuftVila,
};

// ---------------------------------------------------------------------------------------------
// Entulho (chão): 14x9
// ---------------------------------------------------------------------------------------------

/** Tijolo quebrado: pedra com a linha de argamassa. */
function brick(ctx: Ctx, look: BiomeLook, x: number, base: number, w: number, h: number): void {
  chunk(ctx, look, x, base, w, h);
  px(ctx, look.stone.deep, x + Math.floor(w / 2), base - h + 2, 0.6);
  if (h >= 3) rect(ctx, look.stone.deep, x + 1, base - 1, w - 2, 1, 0.35);
}

function rubbleMuralhas(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const r = RUBBLE_BASE;
  const t = leafTones(look);
  if (variant === 0) {
    brick(ctx, look, 1, r, 5, 3);
    brick(ctx, look, 6, r, 5, 3);
    brick(ctx, look, 3, r - 3, 5, 3);
    chunk(ctx, look, 11, r, 2, 1);
  } else if (variant === 1) {
    brick(ctx, look, 1, r, 4, 2);
    brick(ctx, look, 6, r, 6, 4);
    chunk(ctx, look, 12, r, 1, 1);
    mossCap(ctx, look, 6, r - 4, 4);
  } else if (variant === 2) {
    // Bloco grande rachado, com uma erva nascendo
    brick(ctx, look, 2, r, 9, 5);
    rect(ctx, look.stone.deep, 6, r - 4, 1, 3, 0.8);
    grass(ctx, rng, t, 4, 8, r - 5, 3, 2, 3);
  } else {
    chunk(ctx, look, 1, r, 3, 2);
    chunk(ctx, look, 5, r, 4, 3);
    chunk(ctx, look, 10, r, 3, 2);
    stalkFlower(ctx, t, look.glow, 0xe8d060, 9, r - 1, 5);
  }
}

function rubbleSaloes(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const r = RUBBLE_BASE;
  if (variant === 0) {
    // Vitral partido: cacos vermelhos e azuis
    shard(ctx, SHARD_COLORS[0], 1, r, 4, 5);
    shard(ctx, SHARD_COLORS[1], 6, r, 5, 4);
    shard(ctx, SHARD_COLORS[0], 11, r, 2, 2);
    chunk(ctx, look, 4, r, 2, 1);
  } else if (variant === 1) {
    shard(ctx, SHARD_COLORS[2], 2, r, 4, 4);
    shard(ctx, SHARD_COLORS[3], 7, r, 5, 5);
    chunk(ctx, look, 11, r, 2, 2);
  } else if (variant === 2) {
    // Muitos cacos miúdos
    for (let i = 0; i < 6; i++) {
      const color = SHARD_COLORS[randomInt(rng, 0, SHARD_COLORS.length)] ?? SHARD_COLORS[0];
      shard(ctx, color, 1 + i * 2, r, randomInt(rng, 2, 4), randomInt(rng, 2, 4));
    }
  } else {
    chunk(ctx, look, 1, r, 5, 3);
    chunk(ctx, look, 8, r, 4, 2);
    shard(ctx, SHARD_COLORS[4], 5, r, 4, 6);
  }
}

function rubbleCatacumbas(ctx: Ctx, look: BiomeLook, variant: number): void {
  const r = RUBBLE_BASE;
  if (variant === 0) {
    chunk(ctx, look, 1, r, 5, 3);
    chunk(ctx, look, 7, r, 5, 4);
    mossCap(ctx, look, 1, r - 3, 4);
    mossCap(ctx, look, 7, r - 4, 4);
  } else if (variant === 1) {
    chunk(ctx, look, 1, r, 6, 3);
    chunk(ctx, look, 3, r - 3, 3, 2);
    mossCap(ctx, look, 1, r - 3, 2);
    shroom(ctx, look, 10, r, 3, 1);
  } else if (variant === 2) {
    // Crânio apoiado numa laje musgosa
    skull(ctx, 4, r - 3);
    chunk(ctx, look, 1, r, 12, 3);
    mossCap(ctx, look, 1, r - 3, 3);
  } else {
    chunk(ctx, look, 1, r, 4, 3);
    longBone(ctx, 3, r, 10);
    chunk(ctx, look, 10, r, 3, 2);
  }
}

/** Tronco caído: casca com sulcos, topo cortado claro e musgo em cima. */
function log(ctx: Ctx, look: BiomeLook, x: number, base: number, len: number, thick: number) {
  const t = tones(mix(BARK, look.stone.light, 0.2));
  const top = base - thick + 1;
  rect(ctx, t.base, x, top, len, thick);
  rect(ctx, t.hi, x, top, len, 1, 0.8);
  rect(ctx, t.sh, x, base, len, 1);
  rect(ctx, 0xa07a4a, x + len - 1, top, 1, thick);
  px(ctx, 0xc89c64, x + len - 1, top + 1);
  for (let i = 3; i < len - 2; i += 3) px(ctx, t.sh, x + i, top + 1, 0.9);
  mossCap(ctx, look, x + 1, top - 1, Math.min(5, len - 3));
}

function rubbleFloresta(ctx: Ctx, look: BiomeLook, variant: number): void {
  const r = RUBBLE_BASE;
  const t = leafTones(look);
  if (variant === 0) {
    log(ctx, look, 1, r, 12, 4);
  } else if (variant === 1) {
    // Tronco curto com cogumelos-de-prateleira que brilham
    log(ctx, look, 1, r, 8, 3);
    rect(ctx, look.glowSoft, 9, r - 2, 3, 1);
    rect(ctx, mix(look.glowSoft, 0x000000, 0.35), 10, r - 1, 3, 1);
    px(ctx, look.glow, 9, r - 2);
    log(ctx, look, 9, r, 4, 2);
  } else if (variant === 2) {
    chunk(ctx, look, 1, r, 6, 4);
    chunk(ctx, look, 8, r, 4, 3);
    mossCap(ctx, look, 1, r - 4, 5);
    mossCap(ctx, look, 8, r - 3, 4);
  } else {
    // Pedras e uma muda de árvore
    chunk(ctx, look, 1, r, 5, 3);
    chunk(ctx, look, 9, r, 4, 2);
    mossCap(ctx, look, 1, r - 3, 4);
    rect(ctx, t.base, 7, r - 4, 1, 5);
    rect(ctx, t.hi, 5, r - 5, 2, 2, 0.9);
    rect(ctx, t.hi, 8, r - 4, 2, 2, 0.9);
    px(ctx, t.sh, 7, r);
  }
}

/** Estaca de madeira: ponta afiada e a base cravada no lodo. */
function stake(ctx: Ctx, look: BiomeLook, x: number, base: number, h: number, lean: number) {
  const t = tones(mix(0x6a6256, look.stone.light, 0.25));
  const top = base - h + 1;
  const mid = base - Math.floor(h / 2);
  rect(ctx, t.sh, x - 1, base, 4, 1, 0.9);
  rect(ctx, t.base, x, mid, 2, base - mid + 1);
  rect(ctx, t.base, x + lean, top + 1, 2, mid - top);
  px(ctx, t.base, x + lean + (lean >= 0 ? 0 : 1), top);
  rect(ctx, t.hi, x + lean, top + 1, 1, mid - top, 0.85);
  rect(ctx, t.sh, x + 1 + lean, top + 2, 1, mid - top - 1, 0.7);
}

/** Montinho de lodo molhado com um brilho e bolhas. */
function mud(ctx: Ctx, look: BiomeLook, x: number, base: number, w: number, h: number): void {
  const color = mix(look.stone.base, 0x2a2018, 0.35);
  for (let i = 0; i < h; i++) {
    const inset = Math.floor((i * w) / (2 * h));
    rect(ctx, color, x + inset, base - i, w - 2 * inset, 1);
  }
  rect(ctx, mix(color, 0x000000, 0.4), x, base, w, 1, 0.8);
  px(ctx, mix(color, 0xc0d0c8, 0.5), x + 2, base - h + 2, 0.85);
  px(ctx, look.mossLight, x + w - 3, base - 1, 0.7);
  px(ctx, look.mossLight, x + 3, base - 1, 0.5);
}

function rubblePantano(ctx: Ctx, look: BiomeLook, variant: number): void {
  const r = RUBBLE_BASE;
  if (variant === 0) {
    stake(ctx, look, 2, r, 7, 0);
    stake(ctx, look, 7, r, 5, 1);
    stake(ctx, look, 11, r, 6, -1);
  } else if (variant === 1) {
    stake(ctx, look, 4, r, 8, 0);
    stake(ctx, look, 9, r, 3, 0);
    mud(ctx, look, 1, r, 4, 2);
  } else if (variant === 2) {
    mud(ctx, look, 1, r, 12, 4);
  } else {
    mud(ctx, look, 1, r, 8, 3);
    chunk(ctx, look, 9, r, 4, 3);
    mossCap(ctx, look, 9, r - 3, 3);
  }
}

/** Pedaço de lápide: topo arredondado ou quebrado, com uma cruzinha gravada. */
function tombstone(
  ctx: Ctx,
  look: BiomeLook,
  x: number,
  base: number,
  w: number,
  h: number,
  broken: boolean,
): void {
  const s = look.stone;
  const top = base - h + 1;
  rect(ctx, s.base, x, top, w, h);
  rect(ctx, s.light, x, top + 1, w - 1, h - 1);
  if (broken) {
    // Topo em dentes: tira alguns pixels da fileira de cima
    rect(ctx, s.highlight, x + 1, top, 1, 1, 0.9);
    rect(ctx, s.highlight, x + w - 2, top + 1, 1, 1, 0.9);
    px(ctx, s.deep, x + Math.floor(w / 2), top + 1, 0.7);
  } else {
    rect(ctx, s.highlight, x + 1, top, w - 2, 1, 0.9);
  }
  rect(ctx, s.deep, x + w - 1, top + 1, 1, h - 1, 0.7);
  rect(ctx, s.deep, x, base, w, 1, 0.6);
  const cx = x + Math.floor(w / 2);
  if (h >= 5) {
    rect(ctx, s.deep, cx, top + 2, 1, 3, 0.7);
    rect(ctx, s.deep, cx - 1, top + 3, 3, 1, 0.7);
  }
  mossCap(ctx, look, x, base - 1, Math.max(2, w - 2));
}

function rubbleCemiterio(ctx: Ctx, look: BiomeLook, variant: number): void {
  const r = RUBBLE_BASE;
  if (variant === 0) {
    tombstone(ctx, look, 4, r, 6, 8, true);
    chunk(ctx, look, 1, r, 3, 2);
    chunk(ctx, look, 11, r, 2, 1);
  } else if (variant === 1) {
    // Laje inclinada
    for (let i = 0; i < 4; i++) {
      rect(ctx, look.stone.light, 2 + i, r - 1 - i, 8, 1);
      px(ctx, look.stone.highlight, 2 + i, r - 1 - i, 0.9);
    }
    rect(ctx, look.stone.deep, 2, r, 10, 1, 0.6);
    mossCap(ctx, look, 3, r - 1, 3);
  } else if (variant === 2) {
    tombstone(ctx, look, 1, r, 5, 5, true);
    tombstone(ctx, look, 8, r, 5, 3, true);
  } else {
    tombstone(ctx, look, 3, r, 6, 6, true);
    chunk(ctx, look, 10, r, 3, 2);
    chunk(ctx, look, 1, r, 2, 1);
  }
}

/** Pedra com veios de minério que brilham (cian ou ouro). */
function oreRock(
  ctx: Ctx,
  look: BiomeLook,
  x: number,
  base: number,
  w: number,
  h: number,
  gold: boolean,
): void {
  const main = gold ? GOLD : CRYSTAL;
  const hot = gold ? GOLD_HOT : CRYSTAL_HOT;
  disc(ctx, main, x + Math.floor(w / 2), base - 2, 2, 0.08);
  chunk(ctx, look, x, base, w, h);
  px(ctx, main, x + 1, base - 1);
  px(ctx, hot, x + 1, base - h + 2, 0.95);
  if (w >= 5) {
    px(ctx, main, x + w - 2, base - 1);
    px(ctx, main, x + 3, base - h + 2);
    px(ctx, hot, x + w - 3, base - 2, 0.9);
  }
}

function rubbleMinas(ctx: Ctx, look: BiomeLook, variant: number): void {
  const r = RUBBLE_BASE;
  if (variant === 0) {
    oreRock(ctx, look, 1, r, 6, 4, false);
    oreRock(ctx, look, 8, r, 4, 3, false);
  } else if (variant === 1) {
    oreRock(ctx, look, 2, r, 5, 3, true);
    oreRock(ctx, look, 8, r, 5, 4, true);
  } else if (variant === 2) {
    oreRock(ctx, look, 2, r, 8, 6, false);
    oreRock(ctx, look, 10, r, 3, 2, true);
  } else {
    oreRock(ctx, look, 1, r, 5, 4, true);
    oreRock(ctx, look, 7, r, 6, 3, false);
    chunk(ctx, look, 6, r, 1, 1);
  }
}

function rubbleVila(ctx: Ctx, look: BiomeLook, variant: number): void {
  const r = RUBBLE_BASE;
  if (variant === 0) {
    // Alvenaria queimada, escurecida de fuligem
    brick(ctx, look, 1, r, 5, 3);
    brick(ctx, look, 7, r, 5, 4);
    rect(ctx, SOOT, 1, r - 2, 5, 2, 0.45);
    rect(ctx, SOOT, 7, r - 3, 5, 3, 0.45);
    px(ctx, look.glow, 6, r, 0.9);
  } else if (variant === 1) {
    // Tábuas carbonizadas cruzadas
    line(ctx, CHAR, 1, r, 10, r - 3);
    line(ctx, CHAR, 1, r - 1, 10, r - 4);
    line(ctx, CHAR, 2, r - 4, 11, r);
    line(ctx, CHAR_LIGHT, 2, r - 5, 11, r - 1, 0.8);
    px(ctx, look.glow, 10, r - 4);
    px(ctx, look.glowSoft, 3, r - 3, 0.8);
  } else if (variant === 2) {
    // Tijolos vermelhos partidos
    for (const [x, y, w] of [
      [1, r, 4],
      [6, r, 5],
      [3, r - 2, 4],
    ] as const) {
      rect(ctx, BRICK, x, y - 1, w, 2);
      rect(ctx, mix(BRICK, 0xffffff, 0.25), x, y - 1, w, 1, 0.9);
      rect(ctx, mix(BRICK, 0x000000, 0.45), x, y, w, 1, 0.8);
      px(ctx, 0x4a2a22, x + 2, y - 1, 0.8);
    }
    rect(ctx, ASH, 10, r, 3, 1);
  } else {
    // Telhas de barro empilhadas e cinza
    rect(ctx, ASH, 1, r, 12, 1);
    for (const [x, y] of [
      [2, r - 1],
      [7, r - 1],
      [4, r - 3],
    ] as const) {
      rect(ctx, TERRACOTTA, x, y, 5, 1);
      px(ctx, TERRACOTTA, x, y + 1);
      px(ctx, TERRACOTTA, x + 4, y + 1);
      px(ctx, mix(TERRACOTTA, 0xffffff, 0.3), x + 1, y);
      rect(ctx, mix(TERRACOTTA, 0x000000, 0.45), x + 1, y + 1, 3, 1, 0.7);
    }
    px(ctx, look.glow, 6, r - 2, 0.9);
  }
}

const RUBBLE_DRAWERS: Readonly<Record<BiomeId, FloorDrawer>> = {
  muralhas: rubbleMuralhas,
  saloes: rubbleSaloes,
  catacumbas: rubbleCatacumbas,
  floresta: rubbleFloresta,
  pantano: rubblePantano,
  cemiterio: rubbleCemiterio,
  minas: rubbleMinas,
  vila: rubbleVila,
};

// ---------------------------------------------------------------------------------------------
// Ossos e restos (chão): 14x8
// ---------------------------------------------------------------------------------------------

function mossSpots(ctx: Ctx, look: BiomeLook, spots: readonly (readonly [number, number])[]) {
  for (const [x, y] of spots) px(ctx, look.moss, x, y, 0.9);
}

/** Esqueleto de peixe: cabeça, espinha, costelas e cauda. */
function fishBones(ctx: Ctx, base: number): void {
  rect(ctx, BONE_SHADE, 4, base - 1, 7, 1);
  for (const x of [5, 7, 9]) {
    px(ctx, BONE, x, base - 2);
    px(ctx, BONE, x, base);
  }
  rect(ctx, BONE, 1, base - 2, 3, 3);
  px(ctx, DARK, 2, base - 1);
  px(ctx, BONE_LIGHT, 1, base - 2);
  rect(ctx, BONE, 11, base - 2, 1, 3);
  rect(ctx, BONE_SHADE, 12, base - 3, 1, 4);
}

/** Peixe inteiro, de lado, prateado. */
function fish(ctx: Ctx, base: number): void {
  const body = 0x7a8a8a;
  rect(ctx, body, 3, base - 3, 7, 1);
  rect(ctx, body, 2, base - 2, 9, 2);
  rect(ctx, 0x4a5a5c, 3, base, 7, 1);
  rect(ctx, 0xa8b8b8, 4, base - 3, 5, 1, 0.9);
  rect(ctx, 0xc8d4d4, 4, base - 1, 5, 1, 0.5);
  px(ctx, DARK, 3, base - 2);
  rect(ctx, body, 11, base - 3, 1, 4);
  rect(ctx, 0x4a5a5c, 12, base - 3, 1, 4);
}

function boneFloresta(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = BONE_BASE;
  if (variant === 0) {
    skull(ctx, 4, b);
    mossSpots(ctx, look, [
      [5, b - 4],
      [7, b - 4],
      [4, b - 3],
    ]);
  } else if (variant === 1) {
    ribs(ctx, 1, b);
    mossSpots(ctx, look, [
      [3, b],
      [8, b],
    ]);
  } else if (variant === 2) {
    longBone(ctx, 1, b);
    mossSpots(ctx, look, [
      [5, b - 1],
      [8, b - 1],
    ]);
  } else {
    // Chifres de veado enterrados
    rect(ctx, BONE, 5, b - 1, 4, 2);
    rect(ctx, BONE_SHADE, 5, b, 4, 1);
    line(ctx, BONE, 6, b - 1, 3, b - 5);
    line(ctx, BONE, 8, b - 1, 11, b - 5);
    px(ctx, BONE, 4, b - 3);
    px(ctx, BONE, 10, b - 3);
    px(ctx, BONE_LIGHT, 3, b - 6);
    px(ctx, BONE_LIGHT, 11, b - 6);
    mossSpots(ctx, look, [
      [5, b - 1],
      [8, b],
    ]);
  }
}

function bonePantano(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = BONE_BASE;
  if (variant === 0) {
    fishBones(ctx, b);
  } else if (variant === 1) {
    fish(ctx, b);
  } else if (variant === 2) {
    // Osso meio enterrado na lama
    longBone(ctx, 1, b - 1);
    mud(ctx, look, 0, b, 5, 2);
    mud(ctx, look, 8, b, 6, 2);
  } else {
    // Crânio afundado: a lama cobre a base dele
    skull(ctx, 4, b - 1);
    mud(ctx, look, 1, b, 12, 3);
  }
}

function boneCemiterio(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = BONE_BASE;
  if (variant === 0) {
    skull(ctx, 4, b);
    mossSpots(ctx, look, [[7, b - 4]]);
  } else if (variant === 1) {
    ribs(ctx, 1, b);
  } else if (variant === 2) {
    longBone(ctx, 1, b);
    skull(ctx, 8, b);
  } else {
    skullPile(ctx, b);
    longBone(ctx, 1, b, 6);
  }
}

function boneMinas(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = BONE_BASE;
  if (variant === 0) {
    // Caveira de mineiro, com capacete e lamparina
    skull(ctx, 4, b);
    rect(ctx, 0x8a7a52, 4, b - 6, 5, 2);
    rect(ctx, 0xb8a674, 4, b - 6, 5, 1);
    disc(ctx, look.glow, 6, b - 6, 1, 0.14);
    px(ctx, look.glow, 6, b - 6);
  } else if (variant === 1) {
    ribs(ctx, 1, b);
  } else if (variant === 2) {
    // Picareta quebrada
    line(ctx, 0x6a4a2a, 2, b, 8, b - 5);
    rect(ctx, 0x7a7e86, 5, b - 6, 7, 1);
    px(ctx, 0x7a7e86, 5, b - 5);
    px(ctx, 0x7a7e86, 11, b - 5);
    px(ctx, 0xc0c6d0, 8, b - 6);
    rect(ctx, 0x4a4e56, 6, b - 5, 5, 1, 0.5);
  } else {
    // Carvão e uma pepita
    const coal = tones(0x2a2622);
    for (const [x, w, h] of [
      [1, 4, 3],
      [5, 3, 2],
    ] as const) {
      rect(ctx, coal.base, x, b - h + 1, w, h);
      rect(ctx, coal.hi, x, b - h + 1, w, 1, 0.8);
      rect(ctx, coal.sh, x + w - 1, b - h + 2, 1, h - 1);
    }
    nugget(ctx, 9, b, 4, 3);
    nugget(ctx, 7, b, 2, 1);
  }
}

function boneVila(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = BONE_BASE;
  if (variant === 0) {
    skull(ctx, 4, b);
    rect(ctx, ASH, 3, b, 7, 1, 0.7);
    px(ctx, ASH_LIGHT, 6, b - 4, 0.8);
  } else if (variant === 1) {
    ribs(ctx, 1, b);
    rect(ctx, ASH, 1, b, 11, 1, 0.5);
  } else if (variant === 2) {
    longBone(ctx, 1, b);
    rect(ctx, SOOT, 3, b - 1, 4, 1, 0.45);
  } else {
    // Ossos enegrecidos entre brasas
    disc(ctx, look.glowSoft, 6, b - 2, 2, 0.1);
    longBone(ctx, 1, b, 9);
    rect(ctx, SOOT, 2, b - 1, 7, 1, 0.5);
    rect(ctx, ASH, 8, b, 5, 1);
    px(ctx, look.glow, 5, b - 2, 0.9);
    px(ctx, look.glowSoft, 10, b - 1, 0.9);
  }
}

function boneMuralhas(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = BONE_BASE;
  if (variant === 0) {
    skull(ctx, 4, b);
  } else if (variant === 1) {
    ribs(ctx, 1, b);
  } else if (variant === 2) {
    longBone(ctx, 1, b);
    mossSpots(ctx, look, [[6, b - 1]]);
  } else {
    // Espada quebrada: lâmina, guarda e cabo
    rect(ctx, 0x9aa4b8, 1, b - 1, 7, 1);
    rect(ctx, 0xd0d8e8, 1, b - 2, 6, 1, 0.9);
    rect(ctx, 0x6a7488, 1, b, 7, 1);
    rect(ctx, 0x8a6a2a, 8, b - 3, 1, 4);
    rect(ctx, 0x5a3a2a, 9, b - 2, 3, 2);
    px(ctx, 0x8a6a2a, 12, b - 2);
    px(ctx, mix(0x8a6a2a, 0xffffff, 0.4), 8, b - 3);
  }
}

function boneSaloes(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = BONE_BASE;
  if (variant === 0) {
    skull(ctx, 4, b);
  } else if (variant === 1) {
    // Livro aberto no chão
    disc(ctx, look.glow, 7, b - 2, 2, 0.08);
    rect(ctx, LEATHER, 1, b, 12, 1);
    rect(ctx, PAPER, 2, b - 3, 5, 3);
    rect(ctx, PAPER, 7, b - 3, 5, 3);
    rect(ctx, PAPER_SHADE, 6, b - 3, 1, 3);
    rect(ctx, PAPER_SHADE, 3, b - 2, 3, 1, 0.5);
    rect(ctx, PAPER_SHADE, 8, b - 2, 3, 1, 0.5);
    px(ctx, mix(PAPER, 0xffffff, 0.4), 2, b - 3);
    px(ctx, BRASS, 12, b - 1);
  } else if (variant === 2) {
    longBone(ctx, 1, b);
    rect(ctx, PAPER, 9, b - 1, 4, 1);
  } else {
    // Pergaminho enrolado e uma folha solta
    rect(ctx, PAPER, 2, b - 2, 9, 2);
    rect(ctx, PAPER_SHADE, 2, b, 9, 1, 0.8);
    rect(ctx, mix(PAPER, 0xffffff, 0.4), 3, b - 2, 6, 1, 0.8);
    px(ctx, PAPER_SHADE, 2, b - 1);
    px(ctx, PAPER_SHADE, 10, b - 1);
    px(ctx, LEATHER, 5, b - 1);
    px(ctx, LEATHER, 6, b - 1);
  }
}

function boneCatacumbas(ctx: Ctx, look: BiomeLook, variant: number): void {
  const b = BONE_BASE;
  if (variant === 0) {
    skull(ctx, 4, b);
    mossSpots(ctx, look, [[4, b - 3]]);
  } else if (variant === 1) {
    ribs(ctx, 1, b);
  } else if (variant === 2) {
    skullPile(ctx, b);
  } else {
    // Dois ossos cruzados
    line(ctx, BONE, 2, b, 11, b - 3);
    line(ctx, BONE_SHADE, 2, b - 1, 11, b - 4);
    line(ctx, BONE, 2, b - 3, 11, b);
    line(ctx, BONE_SHADE, 2, b - 4, 11, b - 1);
    for (const [x, y] of [
      [1, b],
      [12, b - 3],
      [1, b - 3],
      [12, b],
    ] as const) {
      px(ctx, BONE_LIGHT, x, y);
    }
  }
}

const BONE_DRAWERS: Readonly<Record<BiomeId, FloorDrawer>> = {
  muralhas: boneMuralhas,
  saloes: boneSaloes,
  catacumbas: boneCatacumbas,
  floresta: boneFloresta,
  pantano: bonePantano,
  cemiterio: boneCemiterio,
  minas: boneMinas,
  vila: boneVila,
};

// ---------------------------------------------------------------------------------------------
// Trepadeiras e raízes (pendem do teto): 9x28
// ---------------------------------------------------------------------------------------------

type VineStyle = 'ivy' | 'broad' | 'dry' | 'beard' | 'root' | 'burnt';

const VINE_STYLE: Readonly<Record<BiomeId, VineStyle>> = {
  muralhas: 'ivy',
  saloes: 'ivy',
  catacumbas: 'root',
  floresta: 'broad',
  pantano: 'beard',
  cemiterio: 'dry',
  minas: 'root',
  vila: 'burnt',
};

/** Comprimento de cada variante da trepadeira. */
const VINE_LENGTHS = [10, 15, 20, 25] as const;

/** Folha de 2x2 ou 3x2 presa ao caule, para o lado `dir`. */
function vineLeaf(ctx: Ctx, t: Tones, x: number, y: number, dir: number, width: number): void {
  const lx = dir > 0 ? x + 1 : x - width;
  rect(ctx, t.base, lx, y, width, 2);
  px(ctx, t.hi, dir > 0 ? lx + width - 1 : lx, y, 0.95);
  px(ctx, t.sh, dir > 0 ? lx : lx + width - 1, y + 1, 0.9);
}

function drawVine(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng, biome: BiomeId): void {
  const length = VINE_LENGTHS[variant] ?? VINE_LENGTHS[0];
  const style = VINE_STYLE[biome];
  const leaf = leafTones(look);

  if (style === 'beard') {
    // Musgo-barba: mechas que pendem do teto, mais curtas nas pontas e ondulando
    const strand = mix(look.moss, look.fog, 0.35);
    rect(ctx, mix(look.moss, look.stone.deep, 0.4), 1, 0, 7, 1);
    for (let i = 0; i < 4; i++) {
      const sx = 1 + i * 2;
      const len = Math.max(4, length - (i % 2) * 4 - (i === 3 ? 2 : 0));
      for (let y = 1; y < len; y++) {
        const x = Math.max(0, sx + Math.round(Math.sin(y * 0.55 + i * 1.7)));
        px(ctx, strand, x, y, y > len - 4 ? 0.6 : 0.95);
        if (y % 5 === 2) px(ctx, look.mossLight, x, y, 0.55);
      }
    }
    return;
  }

  const lo = style === 'broad' ? 3 : 2;
  const hi = style === 'broad' ? 5 : 6;
  const stem =
    style === 'dry'
      ? mix(look.moss, 0x6a5a40, 0.65)
      : style === 'burnt'
        ? CHAR
        : style === 'root'
          ? mix(biome === 'catacumbas' ? look.moss : look.stone.light, 0x5a3e24, 0.45)
          : biome === 'catacumbas'
            ? mix(look.moss, look.stone.deep, 0.35)
            : look.moss;
  let x = 4;
  for (let y = 0; y < length; y++) {
    const move = style === 'root' ? 0.5 : 0.35;
    if (rng() < move) x = Math.min(hi, Math.max(lo, x + (rng() < 0.5 ? -1 : 1)));
    if (style === 'burnt' && y > 4 && rng() < 0.12) continue;
    const faded = style === 'root' && y > length - 4 ? 0.6 : 1;
    px(ctx, stem, x, y, faded);
    if (style === 'burnt') px(ctx, CHAR_LIGHT, x - 1, y, 0.5);

    if (style === 'ivy' && y % 3 === 2 && y > 1) {
      vineLeaf(ctx, leaf, x, y, (y / 3) % 2 < 1 ? 1 : -1, 2);
      if (biome === 'saloes' && y % 6 === 5) {
        px(ctx, look.glowSoft, x + 1, y - 1);
        px(ctx, mix(look.glowSoft, 0xffffff, 0.4), x + 1, y - 2, 0.9);
      }
    } else if (style === 'broad' && y % 3 === 2 && y > 1) {
      vineLeaf(ctx, leaf, x, y, (y / 3) % 2 < 1 ? 1 : -1, 3);
      if (y % 6 === 5) {
        px(ctx, look.glow, x - 1, y - 1);
        px(ctx, look.glowSoft, x - 2, y - 1, 0.9);
      }
    } else if (style === 'dry' && y % 5 === 3) {
      const dir = rng() < 0.5 ? -1 : 1;
      px(ctx, stem, x + dir, y);
      px(ctx, 0xa09068, x + dir * 2, y, 0.9);
      px(ctx, mix(0xa09068, 0x000000, 0.4), x + dir * 2, y + 1, 0.8);
    } else if (style === 'root' && y % 5 === 2) {
      const dir = rng() < 0.5 ? -1 : 1;
      px(ctx, stem, x + dir, y + 1, 0.8);
      px(ctx, mix(stem, 0xffffff, 0.35), x + dir * 2, y + 2, 0.7);
      if (biome === 'catacumbas') px(ctx, look.glowSoft, x, y + 2, 0.85);
    } else if (style === 'burnt' && y % 6 === 4) {
      px(ctx, ASH, x + 1, y, 0.9);
      px(ctx, ASH_DARK, x + 2, y + 1, 0.8);
    }
  }
  if (style === 'burnt') {
    // Brasa na ponta queimada
    px(ctx, look.glow, x, length - 1, 0.9);
    px(ctx, look.glowSoft, x, length, 0.7);
  }
}

// ---------------------------------------------------------------------------------------------
// Correntes (pendem do teto): 5x30
// ---------------------------------------------------------------------------------------------

type ChainEnd = 'ring' | 'hook' | 'shackle' | 'broken';

const CHAIN_STYLE: Readonly<Record<BiomeId, { end: ChainEnd; metal: number }>> = {
  muralhas: { end: 'ring', metal: 0x7d89a3 },
  saloes: { end: 'ring', metal: 0xa88a48 },
  catacumbas: { end: 'ring', metal: 0x5d7468 },
  floresta: { end: 'hook', metal: 0x80583a },
  pantano: { end: 'shackle', metal: 0x6a5c44 },
  cemiterio: { end: 'shackle', metal: 0x6e6e82 },
  minas: { end: 'hook', metal: 0x7a7e86 },
  vila: { end: 'broken', metal: 0x4c4642 },
};

/** Comprimento (elos) de cada variante da corrente, antes da ponta. */
const CHAIN_LENGTHS = [12, 18, 24] as const;

function drawChain(ctx: Ctx, biome: BiomeId, variant: number): void {
  const length = CHAIN_LENGTHS[variant] ?? CHAIN_LENGTHS[0];
  const { end, metal } = CHAIN_STYLE[biome];
  const t = tones(metal);
  // O último elo da corrente quebrada fica aberto: a corrente para um elo antes
  const links = end === 'broken' ? length - 3 : length;
  for (let y = 0; y < links; y += 3) {
    const wide = (y / 3) % 2 === 0;
    rect(ctx, t.base, wide ? 1 : 2, y, wide ? 3 : 1, 3);
    rect(ctx, t.hi, wide ? 1 : 2, y, 1, 1, 0.9);
    rect(ctx, t.sh, wide ? 3 : 2, y + 2, 1, 1, 0.7);
  }
  if (end === 'ring') {
    // Argola vazada
    rect(ctx, t.base, 0, length, 5, 1);
    rect(ctx, t.hi, 0, length, 2, 1, 0.9);
    rect(ctx, t.base, 0, length + 1, 1, 1);
    rect(ctx, t.sh, 4, length + 1, 1, 1);
    rect(ctx, t.sh, 0, length + 2, 5, 1);
  } else if (end === 'hook') {
    // Gancho de ferro
    rect(ctx, t.base, 2, length, 1, 4);
    px(ctx, t.hi, 2, length);
    px(ctx, t.base, 2, length + 4);
    px(ctx, t.base, 3, length + 4);
    px(ctx, t.base, 4, length + 3);
    px(ctx, t.sh, 4, length + 2);
  } else if (end === 'shackle') {
    // Grilhão
    rect(ctx, t.base, 0, length, 5, 1);
    rect(ctx, t.hi, 0, length, 2, 1, 0.9);
    rect(ctx, t.base, 0, length + 1, 1, 2);
    rect(ctx, t.sh, 4, length + 1, 1, 2);
    rect(ctx, t.sh, 0, length + 3, 5, 1);
  } else {
    // Quebrada: o último elo aberto e uma ponta torta
    rect(ctx, t.base, 1, links, 3, 1);
    px(ctx, t.base, 1, links + 1);
    px(ctx, t.sh, 1, links + 2, 0.8);
    px(ctx, t.hi, 1, links, 0.9);
    px(ctx, t.base, 3, links + 1, 0.8);
  }
}

// ---------------------------------------------------------------------------------------------
// Gotas e estalactites (pendem do teto): 6x12
// ---------------------------------------------------------------------------------------------

/** Cor do líquido que pinga em cada bioma: [núcleo, brilho]. */
const DRIP_COLORS: Readonly<Record<BiomeId, readonly [number, number]>> = {
  muralhas: [0x9fc4de, 0xe8f6fa],
  saloes: [0xb8a0d8, 0xf0e4ff],
  catacumbas: [0x3aa886, 0xb8ffe0],
  floresta: [0xc89a32, 0xfff0a0],
  pantano: [0x5a5a2a, 0xa0b06a],
  cemiterio: [0x6a4aa8, 0xd0baff],
  minas: [0x6aaae0, 0xe0f4ff],
  vila: [0x2c2622, 0x7a6a62],
};

const DRIP_LENGTHS = [
  [3, 6, 4],
  [5, 9, 3],
  [4, 7, 8],
] as const;

function drawDrip(ctx: Ctx, look: BiomeLook, biome: BiomeId, variant: number): void {
  const s = look.stone;
  const lengths = DRIP_LENGTHS[variant] ?? DRIP_LENGTHS[0];
  const slimy = biome === 'pantano' || biome === 'floresta';
  lengths.forEach((len, i) => {
    const x = i * 2;
    if (slimy) {
      // Fios de lodo/seiva escorrendo, mais escuros nas pontas
      const color = mix(s.base, look.moss, 0.45);
      rect(ctx, color, x, 0, 2, len);
      rect(ctx, look.mossLight, x, 0, 1, len - 1, 0.55);
      rect(ctx, s.deep, x + 1, 1, 1, len - 1, 0.5);
      rect(ctx, color, x, len, 1, 1);
    } else {
      // Estalactite pequena
      rect(ctx, s.base, x, 0, 2, len);
      rect(ctx, s.highlight, x, 0, 1, len - 1, 0.7);
      rect(ctx, s.deep, x + 1, 1, 1, len - 1, 0.6);
      rect(ctx, s.base, x, len, 1, 1);
    }
  });
  // Gota prestes a cair
  const maxLen = Math.max(...lengths);
  const dropX = lengths.findIndex((len) => len === maxLen) * 2;
  const [core, shine] = DRIP_COLORS[biome];
  rect(ctx, core, dropX, maxLen + 1, 1, 2, 0.85);
  px(ctx, shine, dropX, maxLen + 1, 0.95);
}

// ---------------------------------------------------------------------------------------------
// Teias (cantos): 14x14
// ---------------------------------------------------------------------------------------------

function drawCobweb(ctx: Ctx, look: BiomeLook, biome: BiomeId, variant: number): void {
  const w = DECOR_SIZE.cobweb.width;
  const reach = variant === 0 ? w - 2 : w - 5;
  const dense = biome === 'catacumbas' || biome === 'cemiterio';
  const thin = biome === 'saloes';
  const burnt = biome === 'vila';
  const color = burnt
    ? 0x6a5a58
    : biome === 'pantano'
      ? mix(0xc9ccd6, look.fog, 0.35)
      : biome === 'minas'
        ? mix(0xc9ccd6, look.fog, 0.3)
        : 0xc9ccd6;
  const spoke = dense ? 0.68 : thin ? 0.4 : 0.55;
  const arc = dense ? 0.52 : thin ? 0.3 : 0.4;
  // Fios que saem do canto e fios em arco entre eles
  line(ctx, color, 0, 0, reach, 2, spoke);
  line(ctx, color, 0, 0, reach - 2, reach - 3, spoke);
  line(ctx, color, 0, 0, 2, reach, spoke);
  if (dense) line(ctx, color, 0, 0, Math.round(reach * 0.75), Math.round(reach * 0.75), spoke);
  const rings = dense ? [3, 5, 7, 9] : thin ? [5, 8] : [4, 7, variant === 0 ? 10 : 8];
  rings.forEach((r, i) => {
    // Na vila a teia queimou: pula alguns arcos
    if (burnt && i % 2 === 1) return;
    if (r > reach) return;
    line(ctx, color, r, 1, Math.round(r * 0.75), Math.round(r * 0.75), arc);
    line(ctx, color, Math.round(r * 0.75), Math.round(r * 0.75), 1, r, arc);
  });
  if (burnt) {
    px(ctx, look.glow, reach, 2, 0.9);
    px(ctx, look.glowSoft, 2, reach, 0.8);
  }
}

// ---------------------------------------------------------------------------------------------
// Rachaduras e crescimentos nas paredes: 14x16
// ---------------------------------------------------------------------------------------------

const CRACK_HEIGHT = DECOR_SIZE.crack.height;

/** Traça uma rachadura de cima a baixo e devolve a coluna de cada linha. */
function crackPath(
  ctx: Ctx,
  rng: Rng,
  color: number,
  startX: number,
  alpha: number,
  branches: boolean,
): number[] {
  const xs: number[] = [];
  let x = startX;
  for (let y = 0; y < CRACK_HEIGHT - 1; y++) {
    if (rng() < 0.45) x += rng() < 0.5 ? -1 : 1;
    x = Math.min(11, Math.max(2, x));
    xs.push(x);
    px(ctx, color, x, y, alpha);
    if (branches && y % 5 === 4) {
      const dir = rng() < 0.5 ? -1 : 1;
      rect(ctx, color, x + dir, y, 2, 1, alpha * 0.75);
    }
  }
  return xs;
}

/** Raiz grossa que desce pela parede e se ramifica. */
function rootPath(ctx: Ctx, look: BiomeLook, rng: Rng, startX: number): void {
  const t = tones(mix(BARK, look.stone.light, 0.25));
  let x = startX;
  for (let y = 0; y < CRACK_HEIGHT - 1; y++) {
    if (rng() < 0.4) x += rng() < 0.5 ? -1 : 1;
    x = Math.min(11, Math.max(2, x));
    const thick = y < 9 ? 2 : 1;
    rect(ctx, t.base, x, y, thick, 1, 0.95);
    px(ctx, t.hi, x, y, 0.8);
    if (thick === 2) px(ctx, t.sh, x + 1, y, 0.9);
    if (y % 5 === 4) {
      const dir = rng() < 0.5 ? -1 : 1;
      line(ctx, t.base, x, y, x + dir * 3, Math.min(CRACK_HEIGHT - 1, y + 3), 0.85);
    }
  }
}

/** Veio de minério (ouro ou cian) que corta a pedra, com brilhos. */
function oreVein(ctx: Ctx, rng: Rng, startX: number, gold: boolean, alpha: number): void {
  const main = gold ? GOLD : CRYSTAL;
  const hot = gold ? GOLD_HOT : CRYSTAL_HOT;
  const dark = gold ? GOLD_DARK : CRYSTAL_DARK;
  let x = startX;
  for (let y = 0; y < CRACK_HEIGHT - 1; y++) {
    if (rng() < 0.5) x += rng() < 0.5 ? -1 : 1;
    x = Math.min(11, Math.max(2, x));
    px(ctx, dark, x + 1, y, alpha * 0.8);
    px(ctx, main, x, y, alpha);
    if (y % 4 === 1) rect(ctx, main, x - 1, y, 3, 1, alpha * 0.85);
    if (y % 5 === 2) px(ctx, hot, x, y, 0.95);
  }
}

/** Mancha de fuligem em forma de chama que sobe pela parede. */
function sootStreak(ctx: Ctx, rng: Rng, cx: number, height: number): void {
  for (let i = 0; i < height; i++) {
    const y = CRACK_HEIGHT - 1 - i;
    const half = Math.min(3, Math.max(0, Math.round((1 - i / height) * 3 + rng() * 1.4 - 0.4)));
    rect(ctx, SOOT, cx - half, y, half * 2 + 1, 1, 0.38);
    if (half >= 1) rect(ctx, SOOT, cx - Math.floor(half / 2), y, half + 1, 1, 0.3);
  }
}

/** Prateleira de cogumelo preso à parede. */
function shelf(ctx: Ctx, look: BiomeLook, x: number, y: number, w: number): void {
  rect(ctx, look.glowSoft, x, y, w, 1);
  rect(ctx, mix(look.glowSoft, 0x000000, 0.4), x + 1, y + 1, w - 2, 1);
  px(ctx, look.glow, x + 1, y, 0.95);
}

/** Crescimento (musgo, líquen, cristais, fuligem...) que se agarra à parede, sem rachadura. */
function drawGrowth(ctx: Ctx, look: BiomeLook, biome: BiomeId, rng: Rng): void {
  switch (biome) {
    case 'muralhas': {
      // Musgo no pé da parede com ervinhas
      patch(ctx, rng, look.moss, 6, 11, 4, 0.85);
      patch(ctx, rng, look.mossLight, 5, 10, 2, 0.9);
      for (const [x, h] of [
        [3, 3],
        [8, 4],
        [10, 2],
      ] as const) {
        rect(ctx, look.moss, x, 12 - h, 1, h, 0.95);
        px(ctx, look.mossLight, x, 12 - h);
      }
      break;
    }
    case 'saloes':
      // Mofo roxo com botões de rosa
      patch(ctx, rng, mix(look.moss, look.stone.deep, 0.3), 7, 8, 5, 0.8);
      patch(ctx, rng, look.moss, 6, 8, 2, 0.9);
      px(ctx, look.glowSoft, 4, 7);
      px(ctx, look.glowSoft, 9, 10);
      px(ctx, mix(look.glowSoft, 0xffffff, 0.45), 7, 6, 0.9);
      break;
    case 'catacumbas':
      // Líquen que brilha e um cogumelinho
      patch(ctx, rng, mix(look.moss, look.stone.deep, 0.3), 7, 9, 5, 0.8);
      patch(ctx, rng, look.moss, 6, 9, 3, 0.9);
      for (const [x, y] of [
        [4, 7],
        [8, 8],
        [6, 11],
        [10, 10],
        [5, 5],
      ] as const) {
        px(ctx, look.glow, x, y, 0.75);
      }
      shroom(ctx, look, 8, 12, 2, 1);
      break;
    case 'floresta':
      // Cogumelos-de-prateleira subindo pelo tronco, com um nó de raiz
      shelf(ctx, look, 4, 4, 6);
      shelf(ctx, look, 6, 8, 5);
      shelf(ctx, look, 3, 12, 4);
      px(ctx, BARK, 2, 6, 0.9);
      px(ctx, BARK, 2, 7, 0.9);
      px(ctx, BARK, 3, 7, 0.9);
      break;
    case 'pantano': {
      // Limo escorrido, com fios pingando
      patch(ctx, rng, look.moss, 7, 3, 3, 0.75);
      for (const [x, len] of [
        [5, 9],
        [7, 12],
        [9, 6],
      ] as const) {
        rect(ctx, look.moss, x, 3, 1, len, 0.7);
        px(ctx, look.mossLight, x, 3 + len, 0.85);
      }
      break;
    }
    case 'cemiterio':
      // Musgo ressecado com hera seca
      patch(ctx, rng, look.moss, 6, 10, 4, 0.8);
      patch(ctx, rng, look.mossLight, 5, 9, 2, 0.7);
      line(ctx, mix(look.moss, 0x6a5a40, 0.65), 8, 1, 6, 5, 0.9);
      line(ctx, mix(look.moss, 0x6a5a40, 0.65), 6, 5, 8, 9, 0.9);
      px(ctx, 0xa09068, 5, 4, 0.9);
      px(ctx, 0xa09068, 9, 7, 0.9);
      break;
    case 'minas':
      // Cristais saindo da rocha
      rect(ctx, look.stone.deep, 3, 12, 9, 2, 0.9);
      crystal(ctx, 4, 12, 6, 3);
      crystal(ctx, 7, 12, 9, 3);
      crystal(ctx, 10, 12, 5, 2);
      break;
    case 'vila':
      // Mancha grande de fuligem com brasas
      patch(ctx, rng, SOOT, 7, 8, 5, 0.42);
      patch(ctx, rng, SOOT, 7, 7, 3, 0.5);
      px(ctx, look.glow, 6, 10, 0.9);
      px(ctx, look.glowSoft, 9, 8, 0.85);
      px(ctx, look.glow, 5, 6, 0.7);
      break;
  }
}

function drawCrack(ctx: Ctx, look: BiomeLook, biome: BiomeId, variant: number, rng: Rng): void {
  if (variant === 3) {
    drawGrowth(ctx, look, biome, rng);
    return;
  }
  const deep = look.stone.deep;
  const start = 5 + variant * 2;
  switch (biome) {
    case 'floresta':
      if (variant === 2) {
        // Veio de seiva que brilha
        const xs = crackPath(ctx, rng, deep, start, 0.7, false);
        xs.forEach((x, y) => {
          px(ctx, look.glowSoft, x, y, 0.85);
          if (y % 4 === 1) px(ctx, look.glow, x, y, 0.95);
        });
      } else {
        rootPath(ctx, look, rng, start);
      }
      return;
    case 'minas':
      oreVein(ctx, rng, start, variant !== 1, 0.95);
      if (variant === 2) oreVein(ctx, rng, 9, false, 0.8);
      return;
    case 'vila':
      sootStreak(ctx, rng, 5 + variant * 2, 12 - variant * 2);
      if (variant === 1) crackPath(ctx, rng, deep, start, 0.6, false);
      return;
    default:
      break;
  }
  const xs = crackPath(ctx, rng, deep, start, 0.75, true);
  xs.forEach((x, y) => {
    if (y % 4 !== 3) return;
    if (biome === 'muralhas' || biome === 'cemiterio') {
      px(ctx, look.mossLight, x + 1, y, 0.8);
      px(ctx, look.moss, x + 1, y + 1, 0.8);
    } else if (biome === 'catacumbas') {
      px(ctx, look.glow, x + 1, y, 0.7);
    } else if (biome === 'pantano') {
      rect(ctx, look.moss, x, y + 1, 1, 3, 0.7);
    }
  });
}

// ---------------------------------------------------------------------------------------------

/** Semente do desenho: igual para o mesmo bioma, tipo e variante, em qualquer execução. */
function artSeed(biome: BiomeId, kind: DecorKind, variant: number): number {
  let hash = 500 + variant * 13;
  for (const ch of `${biome}/${kind}`) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0;
  return hash;
}

/** Desenha uma peça de decoração (exportada para o teste conferir as margens). */
export function drawDecor(ctx: Ctx, biome: BiomeId, kind: DecorKind, variant: number): void {
  const look = BIOME_LOOK[biome];
  const rng = createRng(artSeed(biome, kind, variant));
  switch (kind) {
    case 'tuft':
      TUFT_DRAWERS[biome](ctx, look, variant, rng);
      break;
    case 'rubble':
      RUBBLE_DRAWERS[biome](ctx, look, variant, rng);
      break;
    case 'bone':
      BONE_DRAWERS[biome](ctx, look, variant, rng);
      break;
    case 'vine':
      drawVine(ctx, look, variant, rng, biome);
      break;
    case 'chain':
      drawChain(ctx, biome, variant);
      break;
    case 'drip':
      drawDrip(ctx, look, biome, variant);
      break;
    case 'cobweb':
      drawCobweb(ctx, look, biome, variant);
      break;
    case 'crack':
      drawCrack(ctx, look, biome, variant, rng);
      break;
    case 'banner':
      break;
  }
}

/** Cria as texturas de decoração de todos os biomas. */
export function createDecorTextures(scene: Phaser.Scene): void {
  for (const biome of ALL_BIOMES) {
    for (const kind of Object.keys(DECOR_RULES) as DecorKind[]) {
      if (kind === 'banner') continue;
      const { width, height } = DECOR_SIZE[kind];
      for (let variant = 0; variant < DECOR_RULES[kind].variants; variant++) {
        canvasTexture(scene, decorTextureKey(biome, kind, variant), width, height, (ctx) =>
          drawDecor(ctx, biome, kind, variant),
        );
      }
    }
  }
}
