import type Phaser from 'phaser';
import { BIOME_LOOK } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { SANCTUARY_LOOK } from '../data/sanctuaryRoom';
import { TILE_SIZE } from '../data/rooms';
import { FURNITURE, WINGS, type FurnitureKind } from '../data/wings';
import { createRng, randomInt, type Rng } from '../utils/rng';
import { canvasTexture, disc, line, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Mobília das alas, desenhada em pixel art de código: barris, mesas, estantes, bancos, caixões,
 * celas, tapeçarias... Cada peça pinta com a pedra e as cores do bioma (e a madeira, o ferro e o
 * pano combinam com ele). As peças de chão têm a base na última linha; as de teto, o topo na
 * primeira. Todas ganham um contorno escuro de 1 px.
 */

/** Chave da textura de uma peça. */
export function furnitureKey(biome: BiomeId, kind: FurnitureKind, variant: number): string {
  return `furn-${biome}-${kind}-${variant}`;
}

/** Tamanho (px) de uma peça. */
export function furnitureSize(kind: FurnitureKind): { width: number; height: number } {
  const spec = FURNITURE[kind];
  return { width: spec.widthTiles * TILE_SIZE, height: spec.heightTiles * TILE_SIZE };
}

/** Tudo o que o desenho de uma peça precisa: contexto, tamanho, cores do bioma e sorteio. */
interface Pen {
  ctx: Ctx;
  w: number;
  h: number;
  variant: number;
  rng: Rng;
  stone: { deep: number; dark: number; base: number; light: number; highlight: number };
  wood: { dark: number; base: number; light: number };
  iron: { dark: number; base: number; light: number };
  cloth: number;
  clothDark: number;
  trim: number;
  flame: readonly [number, number, number];
  bone: number;
  boneShade: number;
  moss: number;
  mossLight: number;
  glow: number;
  glowSoft: number;
}

const BOOK_COLORS = [0x7a2a35, 0x2f5f7a, 0x3d6b3a, 0x8a6a2a, 0x5a3a7a, 0x6e6e78] as const;

function makePen(ctx: Ctx, biome: BiomeId, kind: FurnitureKind, variant: number): Pen {
  const look = BIOME_LOOK[biome];
  const sanct = SANCTUARY_LOOK[biome];
  const { width, height } = furnitureSize(kind);
  const tint = (color: number): number => mix(color, look.ambient, 0.28);
  return {
    ctx,
    w: width,
    h: height,
    variant,
    rng: createRng(kind.length * 977 + variant * 131 + biome.length * 17),
    stone: look.stone,
    wood: { dark: tint(0x2e2016), base: tint(0x4f3822), light: tint(0x7a5834) },
    iron: { dark: tint(0x1b202b), base: tint(0x373f52), light: tint(0x5f6a85) },
    cloth: sanct.banner,
    clothDark: mix(sanct.banner, 0x000000, 0.4),
    trim: sanct.bannerTrim,
    flame: sanct.flame,
    bone: 0xc4c0aa,
    boneShade: 0x8d8a78,
    moss: look.moss,
    mossLight: look.mossLight,
    glow: look.glow,
    glowSoft: look.glowSoft,
  };
}

/** Uma chama pequena (2 x 3 px) com o miolo claro. */
function flame(p: Pen, x: number, y: number): void {
  rect(p.ctx, p.flame[0], x, y + 1, 2, 2);
  rect(p.ctx, p.flame[1], x, y, 2, 2);
  rect(p.ctx, p.flame[2], x, y + 1, 1, 1);
}

/** Uma vela: cera com a chama em cima. A base da cera fica em `base`. */
function candle(p: Pen, x: number, base: number, tall = 5): void {
  rect(p.ctx, p.bone, x, base - tall, 2, tall);
  rect(p.ctx, p.boneShade, x + 1, base - tall, 1, tall);
  flame(p, x, base - tall - 3);
}

/** Tábuas de madeira na vertical, com veios. */
function planks(p: Pen, x: number, y: number, w: number, h: number): void {
  rect(p.ctx, p.wood.base, x, y, w, h);
  for (let i = 0; i < w; i += 3) rect(p.ctx, p.wood.dark, x + i, y, 1, h);
  rect(p.ctx, p.wood.light, x, y, w, 1);
}

function drawBarrel(p: Pen): void {
  const { ctx, w, h } = p;
  const broken = p.variant === 1;
  for (let y = 1; y < h; y++) {
    const bulge = Math.round(Math.sin((y / h) * Math.PI) * 1.2);
    rect(ctx, p.wood.base, 2 - bulge, y, w - 4 + bulge * 2, 1);
  }
  for (let x = 3; x < w - 3; x += 3) rect(ctx, p.wood.dark, x, 2, 1, h - 3);
  rect(ctx, p.wood.light, 3, 2, 1, h - 3);
  for (const y of [4, h - 5]) {
    rect(ctx, p.iron.base, 1, y, w - 2, 2);
    rect(ctx, p.iron.light, 1, y, w - 2, 1);
  }
  rect(ctx, p.wood.dark, 3, 0, w - 6, 2); // tampa
  rect(ctx, p.wood.light, 4, 0, w - 8, 1);
  if (broken) {
    rect(ctx, p.iron.dark, w - 7, 5, 2, 8); // aduela solta
    rect(ctx, p.wood.dark, w - 6, 3, 3, 2);
  }
}

function drawCrates(p: Pen): void {
  const { ctx, h } = p;
  const box = (x: number, y: number, bw: number, bh: number): void => {
    planks(p, x, y, bw, bh);
    rect(ctx, p.wood.dark, x, y, bw, 1);
    rect(ctx, p.wood.dark, x, y + bh - 1, bw, 1);
    line(ctx, p.wood.dark, x + 1, y + 1, x + bw - 2, y + bh - 2);
    line(ctx, p.wood.dark, x + bw - 2, y + 1, x + 1, y + bh - 2);
  };
  if (p.variant === 0) {
    box(1, 2, 14, h - 2);
    box(16, 5, 14, h - 5);
  } else {
    box(1, 6, 16, h - 6);
    box(5, 0, 12, 7);
    box(18, 7, 12, h - 7);
  }
}

function drawCart(p: Pen): void {
  const { ctx } = p;
  rect(ctx, p.wood.dark, 2, 13, 42, 3); // plataforma
  planks(p, 4, 7, 38, 8);
  rect(ctx, p.wood.dark, 4, 7, 38, 1);
  for (const x of [4, 41]) rect(ctx, p.wood.dark, x, 3, 2, 12); // laterais
  rect(ctx, p.wood.base, 0, 17, 6, 2); // timão
  for (const cx of [14, 34]) {
    disc(ctx, p.wood.dark, cx, 24, 7);
    disc(ctx, p.wood.base, cx, 24, 5);
    disc(ctx, p.iron.base, cx, 24, 1);
    for (let a = 0; a < 4; a++) {
      const rad = (a * Math.PI) / 4;
      line(
        ctx,
        p.wood.dark,
        cx - Math.round(Math.cos(rad) * 6),
        24 - Math.round(Math.sin(rad) * 6),
        cx + Math.round(Math.cos(rad) * 6),
        24 + Math.round(Math.sin(rad) * 6),
      );
    }
  }
  // Carga: sacos
  disc(ctx, 0x9a8a62, 14, 8, 4);
  disc(ctx, 0x9a8a62, 22, 9, 3);
  rect(ctx, 0x6a5c3e, 12, 5, 4, 1);
}

function drawWeaponRack(p: Pen): void {
  const { ctx, w, h } = p;
  const empty = p.variant === 1;
  rect(ctx, p.wood.dark, 3, 4, 3, h - 4);
  rect(ctx, p.wood.dark, w - 6, 4, 3, h - 4);
  rect(ctx, p.wood.base, 2, 4, w - 4, 3);
  rect(ctx, p.wood.base, 2, h - 11, w - 4, 3);
  rect(ctx, p.wood.light, 2, 4, w - 4, 1);
  if (!empty) {
    for (const [x, tip] of [
      [9, 0],
      [13, 2],
      [17, 0],
    ] as const) {
      rect(ctx, p.wood.light, x, tip + 4, 1, h - tip - 4); // hastes de lanças
      rect(ctx, p.iron.light, x - 1, tip, 3, 4);
    }
    rect(ctx, p.iron.light, 21, 6, 2, h - 8); // espada
    rect(ctx, p.iron.base, 19, 10, 6, 2);
  } else {
    disc(ctx, p.iron.base, 11, 20, 5); // escudo caído
    disc(ctx, p.iron.light, 11, 20, 3);
    rect(ctx, p.trim, 10, 18, 2, 5);
    line(ctx, p.iron.light, 18, 28, 26, 22); // espada partida
  }
}

function drawDummy(p: Pen): void {
  const { ctx, w, h } = p;
  const broken = p.variant === 1;
  rect(ctx, p.wood.base, w / 2 - 1, 9, 2, h - 9);
  rect(ctx, p.wood.dark, 2, h - 3, w - 4, 3); // base
  rect(ctx, p.wood.base, 1, 12, w - 2, 2); // braços
  rect(ctx, 0x9a8a62, w / 2 - 3, 13, 6, 8); // tronco de palha
  rect(ctx, 0x6a5c3e, w / 2 - 3, 18, 6, 1);
  if (!broken) {
    disc(ctx, 0xb5a577, w / 2, 6, 4); // cabeça de saco
    rect(ctx, 0x4a3e26, w / 2 - 2, 5, 1, 1);
    rect(ctx, 0x4a3e26, w / 2 + 1, 5, 1, 1);
    rect(ctx, 0x6a5c3e, w / 2 - 3, 10, 6, 1);
  } else {
    rect(ctx, p.wood.dark, w / 2 - 1, 7, 2, 3); // pescoço sem cabeça
    for (const [x, y] of [
      [3, 15],
      [11, 18],
    ] as const) {
      rect(ctx, p.wood.light, x, y, 3, 1);
      rect(ctx, p.iron.light, x + 3, y, 1, 1);
    }
  }
}

function drawTable(p: Pen): void {
  const { ctx, w, h } = p;
  const lit = p.variant === 0;
  rect(ctx, p.wood.dark, 3, 12, w - 6, 4); // tampo
  rect(ctx, p.wood.light, 3, 12, w - 6, 1);
  rect(ctx, p.wood.base, 3, 13, w - 6, 2);
  for (const x of [5, w - 8]) rect(ctx, p.wood.dark, x, 16, 3, h - 16); // pernas
  rect(ctx, p.wood.dark, 6, h - 8, w - 12, 2); // travessa
  rect(ctx, p.cloth, 12, 12, w - 24, 3); // caminho de mesa
  rect(ctx, p.clothDark, 12, 14, w - 24, 1);
  rect(ctx, p.cloth, 14, 15, 5, 6);
  rect(ctx, p.cloth, w - 19, 15, 5, 4);
  if (lit) {
    candle(p, 10, 12);
    candle(p, w - 12, 12);
    disc(ctx, p.trim, 24, 10, 2); // cálice
    rect(ctx, p.trim, 23, 11, 2, 2);
  } else {
    rect(ctx, p.bone, 10, 9, 2, 3); // tocos de vela, tombados
    rect(ctx, p.bone, w - 15, 11, 4, 1);
    disc(ctx, p.iron.light, 24, 11, 2);
  }
}

function drawChair(p: Pen): void {
  const { ctx, w, h } = p;
  if (p.variant === 0) {
    rect(ctx, p.wood.dark, 3, 1, 2, h - 1); // encosto
    rect(ctx, p.wood.dark, w - 5, 8, 2, h - 8);
    rect(ctx, p.wood.base, 3, 8, w - 6, 2);
    rect(ctx, p.wood.light, 3, 8, w - 6, 1);
    rect(ctx, p.wood.base, 5, 2, 1, 5);
  } else {
    // tombada de lado
    rect(ctx, p.wood.base, 2, 9, 11, 3);
    rect(ctx, p.wood.dark, 2, 5, 3, 11);
    rect(ctx, p.wood.dark, 10, 12, 2, 4);
    rect(ctx, p.wood.light, 3, 9, 9, 1);
  }
}

function drawBookshelf(p: Pen): void {
  const { ctx, w, h } = p;
  rect(ctx, p.wood.dark, 1, 0, w - 2, h);
  rect(ctx, p.wood.base, 2, 1, w - 4, h - 2);
  const shelves = [1, 13, 25, 37] as const;
  for (const top of shelves) {
    rect(ctx, 0x120d09, 3, top + 1, w - 6, 10); // fundo
    let x = 4;
    while (x < w - 5) {
      const bw = randomInt(p.rng, 2, 4);
      const bh = randomInt(p.rng, 5, 10);
      if (p.rng() < 0.12 + p.variant * 0.06) {
        x += bw; // vão (livro faltando)
        continue;
      }
      const color = BOOK_COLORS[randomInt(p.rng, 0, BOOK_COLORS.length)] ?? p.cloth;
      rect(ctx, color, x, top + 11 - bh, bw, bh);
      rect(ctx, mix(color, 0xffffff, 0.22), x, top + 11 - bh, 1, bh);
      rect(ctx, p.trim, x, top + 11 - bh + 2, bw, 1, 0.7);
      x += bw;
    }
    rect(ctx, p.wood.light, 2, top + 11, w - 4, 2); // prateleira
  }
  rect(ctx, p.wood.dark, 0, h - 3, w, 3); // rodapé
  if (p.variant === 2) {
    line(ctx, 0xcfcfd8, w - 3, 3, w - 9, 9); // teia no canto
    line(ctx, 0xcfcfd8, w - 3, 3, w - 9, 3);
    line(ctx, 0xcfcfd8, w - 3, 3, w - 3, 9);
  }
}

function drawBooks(p: Pen): void {
  const { ctx } = p;
  rect(ctx, 0x5a2a30, 2, 11, 12, 4);
  rect(ctx, 0xc9b98a, 3, 12, 10, 2);
  rect(ctx, 0x2f5f7a, 3, 8, 10, 3);
  rect(ctx, 0xc9b98a, 4, 9, 8, 1);
  rect(ctx, 0x3d6b3a, 5, 5, 8, 3);
  if (p.variant === 1) {
    rect(ctx, 0xdcd2b0, 1, 13, 7, 2); // livro aberto
    line(ctx, 0x6a5c3e, 4, 13, 4, 14);
  }
}

function drawPew(p: Pen): void {
  const { ctx, w, h } = p;
  const broken = p.variant === 1;
  rect(ctx, p.wood.dark, 1, 2, w - 2, 6); // encosto
  rect(ctx, p.wood.base, 2, 3, w - 4, 4);
  rect(ctx, p.wood.light, 2, 3, w - 4, 1);
  rect(ctx, p.wood.dark, 1, 8, w - 2, 3); // assento
  rect(ctx, p.wood.base, 2, 8, w - 4, 1);
  for (const x of [2, w - 5]) rect(ctx, p.wood.dark, x, 11, 3, h - 11); // pés
  rect(ctx, p.wood.dark, 4, h - 2, w - 8, 2);
  if (broken) {
    rect(ctx, p.wood.dark, w - 14, 5, 4, 7); // quebrado
    line(ctx, p.wood.light, w - 11, 3, w - 8, 12);
  }
}

function drawAltar(p: Pen): void {
  const { ctx, w, h } = p;
  rect(ctx, p.stone.dark, 2, 12, w - 4, h - 12);
  rect(ctx, p.stone.base, 3, 13, w - 6, h - 14);
  rect(ctx, p.stone.light, 3, 13, 1, h - 14);
  rect(ctx, p.stone.deep, w - 5, 13, 1, h - 14);
  rect(ctx, p.stone.light, 1, 10, w - 2, 3); // tampo
  rect(ctx, p.stone.highlight, 1, 10, w - 2, 1);
  rect(ctx, p.cloth, 5, 10, w - 10, 3); // toalha
  rect(ctx, p.cloth, 8, 13, w - 16, 7);
  rect(ctx, p.clothDark, 8, 19, w - 16, 1);
  rect(ctx, p.trim, 8, 13, w - 16, 1);
  rect(ctx, p.trim, w / 2 - 1, 15, 2, 4); // símbolo
  rect(ctx, p.trim, w / 2 - 3, 16, 6, 1);
  candle(p, 5, 10, 6);
  candle(p, w - 7, 10, 6);
  rect(ctx, p.trim, w / 2 - 1, 6, 2, 4); // cálice
  rect(ctx, p.trim, w / 2 - 2, 5, 4, 1);
}

function drawCandelabra(p: Pen): void {
  const { ctx, w, h } = p;
  const cx = w / 2;
  rect(ctx, p.iron.base, cx - 5, h - 3, 10, 3); // base
  rect(ctx, p.iron.light, cx - 5, h - 3, 10, 1);
  rect(ctx, p.iron.base, cx - 1, 14, 2, h - 17); // haste
  rect(ctx, p.iron.light, cx - 1, 14, 1, h - 17);
  disc(ctx, p.iron.base, cx, 24, 2);
  // braços com três velas
  rect(ctx, p.iron.base, cx - 6, 12, 12, 2);
  rect(ctx, p.iron.base, cx - 6, 10, 1, 3);
  rect(ctx, p.iron.base, cx + 5, 10, 1, 3);
  candle(p, cx - 7, 10, 4);
  candle(p, cx + 5, 10, 4);
  candle(p, cx - 1, 12, 5);
}

function drawSkull(p: Pen, x: number, y: number): void {
  const { ctx } = p;
  rect(ctx, p.bone, x + 1, y, 4, 1);
  rect(ctx, p.bone, x, y + 1, 6, 3);
  rect(ctx, p.boneShade, x + 5, y + 1, 1, 3);
  rect(ctx, p.stone.deep, x + 1, y + 2, 1, 1);
  rect(ctx, p.stone.deep, x + 3, y + 2, 1, 1);
  rect(ctx, p.bone, x + 1, y + 4, 4, 1);
  rect(ctx, p.stone.deep, x + 2, y + 4, 1, 1);
}

function drawSkulls(p: Pen): void {
  const { ctx, w, h } = p;
  const rows = 3 - (p.variant === 0 ? 0 : 1);
  for (let r = 0; r < rows; r++) {
    const count = 4 - r;
    const start = Math.floor((w - count * 6) / 2);
    for (let i = 0; i < count; i++) drawSkull(p, start + i * 6, h - 5 - r * 4);
  }
  if (p.variant !== 1) line(ctx, p.bone, 2, h - 1, 12, h - 4); // ossos soltos
  rect(ctx, p.bone, w - 9, h - 2, 6, 1);
  rect(ctx, p.moss, 2, h - 1, 3, 1);
}

function drawCoffin(p: Pen): void {
  const { ctx, w, h } = p;
  const ajar = p.variant === 1;
  rect(ctx, p.stone.dark, 1, 12, w - 2, h - 12); // caixa
  rect(ctx, p.stone.base, 2, 13, w - 4, h - 14);
  rect(ctx, p.stone.light, 2, 13, w - 4, 1);
  rect(ctx, p.stone.deep, 3, h - 8, w - 6, 1);
  const lidY = ajar ? 6 : 8;
  const lidX = ajar ? 6 : 2;
  rect(ctx, p.stone.light, lidX, lidY, w - 8, 6); // tampa
  rect(ctx, p.stone.highlight, lidX, lidY, w - 8, 1);
  rect(ctx, p.stone.base, lidX + 1, lidY + 1, w - 10, 4);
  rect(ctx, p.stone.deep, lidX, lidY + 5, w - 8, 1);
  // relevo: cruz e um rosto
  rect(ctx, p.stone.dark, lidX + 9, lidY + 1, 1, 4);
  rect(ctx, p.stone.dark, lidX + 7, lidY + 2, 5, 1);
  if (ajar) {
    rect(ctx, 0x050709, 2, 8, 6, 5); // vão escuro
    rect(ctx, p.bone, 3, 9, 4, 1); // mão de osso
    rect(ctx, p.bone, 4, 10, 1, 2);
  }
  for (const x of [2, w - 5]) rect(ctx, p.stone.dark, x, h - 2, 3, 2); // pés
}

function drawCell(p: Pen): void {
  const { ctx, w, h } = p;
  const bent = p.variant === 1;
  rect(ctx, 0x07090d, 5, 6, w - 10, h - 6, 0.82); // dentro da cela
  // moldura de pedra
  rect(ctx, p.stone.dark, 1, 0, 5, h);
  rect(ctx, p.stone.dark, w - 6, 0, 5, h);
  rect(ctx, p.stone.base, 2, 0, 3, h);
  rect(ctx, p.stone.base, w - 5, 0, 3, h);
  rect(ctx, p.stone.light, 2, 0, 1, h);
  rect(ctx, p.stone.dark, 1, 0, w - 2, 6);
  rect(ctx, p.stone.base, 2, 1, w - 4, 4);
  rect(ctx, p.stone.highlight, 2, 1, w - 4, 1);
  // barras
  for (let x = 8; x < w - 6; x += 4) {
    const skew = bent && x > w / 2 ? Math.round((x - w / 2) / 4) : 0;
    rect(ctx, p.iron.base, x + skew, 6, 2, h - 6);
    rect(ctx, p.iron.light, x + skew, 6, 1, h - 6);
  }
  for (const y of [14, h - 10]) rect(ctx, p.iron.base, 6, y, w - 12, 2);
  if (!bent) {
    rect(ctx, p.iron.dark, w / 2 - 2, 22, 5, 5); // fechadura
    rect(ctx, p.trim, w / 2, 23, 1, 2, 0.8);
  } else {
    rect(ctx, p.bone, 12, h - 4, 5, 1); // ossos lá dentro
    rect(ctx, p.bone, 20, h - 3, 3, 1);
  }
  rect(ctx, p.stone.dark, 0, h - 2, w, 2);
}

function drawUrn(p: Pen): void {
  const { ctx, w, h } = p;
  const cx = w / 2;
  for (let y = 3; y < h; y++) {
    const t = (y - 3) / (h - 3);
    const half = Math.round(2 + Math.sin(t * Math.PI * 0.9) * 4);
    rect(ctx, p.stone.base, cx - half, y, half * 2, 1);
    rect(ctx, p.stone.light, cx - half, y, 1, 1);
    rect(ctx, p.stone.dark, cx + half - 1, y, 1, 1);
  }
  rect(ctx, p.stone.light, cx - 3, 1, 6, 2); // boca
  rect(ctx, p.stone.deep, cx - 2, 1, 4, 1);
  rect(ctx, p.trim, cx - 4, 8, 8, 1, 0.7); // friso
  if (p.variant === 1) line(ctx, p.stone.deep, cx - 1, 5, cx + 2, 13); // rachadura
}

function drawTapestry(p: Pen): void {
  const { ctx, w, h } = p;
  rect(ctx, p.wood.base, 0, 0, w, 3); // vara
  rect(ctx, p.wood.light, 0, 0, w, 1);
  disc(ctx, p.trim, 1, 1, 2);
  disc(ctx, p.trim, w - 2, 1, 2);
  const left = 3;
  const right = w - 3;
  for (let x = left; x < right; x++) {
    const tail = h - 2 - Math.round(Math.abs(x - w / 2) * 0.45);
    const tatter = p.variant === 2 ? Math.round(p.rng() * 5) : 0;
    rect(ctx, p.cloth, x, 3, 1, tail - 3 - tatter);
    if (x === left || x === right - 1) rect(ctx, p.clothDark, x, 3, 1, tail - 3 - tatter);
  }
  for (const x of [9, 17]) rect(ctx, p.clothDark, x, 4, 1, h - 14);
  rect(ctx, p.trim, left, 3, right - left, 1);
  const cx = Math.floor(w / 2);
  if (p.variant === 0) {
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      rect(
        ctx,
        p.trim,
        cx + Math.round(Math.cos(rad) * 5),
        14 + Math.round(Math.sin(rad) * 3),
        1,
        1,
      );
    }
    rect(ctx, p.bone, cx - 1, 17, 2, 14);
    rect(ctx, p.trim, cx - 4, 21, 8, 2);
  } else if (p.variant === 1) {
    for (let i = 0; i < 4; i++) {
      line(ctx, p.trim, cx - 6 + i * 3, 12 + i * 3, cx + i * 3, 18 + i * 3);
      line(ctx, p.trim, cx + 6 - i * 3, 12 + i * 3, cx - i * 3, 18 + i * 3);
    }
  } else {
    rect(ctx, p.trim, cx - 5, 12, 10, 1, 0.6);
    rect(ctx, p.cloth, cx - 3, h - 8, 1, 6);
    rect(ctx, p.cloth, cx + 3, h - 6, 1, 5);
  }
}

function drawChandelier(p: Pen): void {
  const { ctx, w } = p;
  const cx = w / 2;
  rect(ctx, p.iron.base, cx - 1, 0, 2, 10); // corrente
  for (let y = 1; y < 10; y += 3) rect(ctx, p.iron.light, cx - 1, y, 1, 1);
  rect(ctx, p.iron.base, 2, 14, w - 4, 2); // aro
  rect(ctx, p.iron.light, 2, 14, w - 4, 1);
  rect(ctx, p.iron.base, cx - 1, 10, 2, 5);
  for (const x of [4, 10, 15, 21, 27]) {
    rect(ctx, p.iron.base, x, 12, 1, 3);
    candle(p, x - 1, 12, 3);
  }
  rect(ctx, p.iron.base, 5, 16, 1, 4);
  rect(ctx, p.iron.base, w - 6, 16, 1, 4);
  disc(ctx, p.iron.light, cx, 19, 2);
}

function drawCage(p: Pen): void {
  const { ctx, w, h } = p;
  const cx = w / 2;
  rect(ctx, p.iron.base, cx - 1, 0, 2, 8); // corrente
  for (let y = 1; y < 8; y += 3) rect(ctx, p.iron.light, cx - 1, y, 1, 1);
  rect(ctx, p.iron.base, 2, 8, w - 4, 2); // topo
  rect(ctx, p.iron.base, 2, h - 4, w - 4, 3); // fundo
  for (let x = 3; x < w - 3; x += 3) {
    rect(ctx, p.iron.base, x, 10, 1, h - 14);
    rect(ctx, p.iron.light, x, 10, 1, 3);
  }
  rect(ctx, p.iron.base, 2, 17, w - 4, 1);
  if (p.variant === 1) {
    rect(ctx, 0x050709, 4, 12, w - 8, h - 17, 0.6);
    drawSkull(p, cx - 3, h - 11);
  }
}

function drawLog(p: Pen): void {
  const { ctx, w, h } = p;
  const hollow = p.variant === 0;
  for (let y = 3; y < h; y++) {
    const edge = y < 5 || y > h - 3 ? 3 : 0;
    rect(ctx, p.wood.base, 4 + edge, y, w - 6 - edge, 1);
  }
  for (let x = 8; x < w - 4; x += 5) rect(ctx, p.wood.dark, x, 4, 1, h - 6); // sulcos
  rect(ctx, p.wood.light, 6, 3, w - 10, 1);
  // ponta cortada, com anéis
  disc(ctx, p.wood.light, 6, 9, 5);
  disc(ctx, p.wood.base, 6, 9, 3);
  disc(ctx, hollow ? p.wood.dark : p.wood.light, 6, 9, 1);
  rect(ctx, p.mossLight, 16, 2, 14, 2); // musgo por cima
  rect(ctx, p.moss, 20, 3, 18, 1);
  if (!hollow) {
    rect(ctx, p.bone, w - 12, 0, 1, 3); // cogumelinhos
    rect(ctx, p.glow, w - 14, 0, 5, 2);
  } else {
    rect(ctx, p.wood.dark, w - 7, 5, 4, 9); // galho quebrado
  }
}

function drawStump(p: Pen): void {
  const { ctx, w, h } = p;
  for (let y = 4; y < h; y++) {
    const flare = y > h - 4 ? y - (h - 4) : 0;
    rect(ctx, p.wood.base, 3 - flare, y, w - 6 + flare * 2, 1);
  }
  for (let x = 5; x < w - 3; x += 3) rect(ctx, p.wood.dark, x, 6, 1, h - 7);
  rect(ctx, p.wood.light, 3, 3, w - 6, 3); // topo cortado
  rect(ctx, p.wood.base, 5, 3, w - 10, 1);
  rect(ctx, p.wood.dark, 7, 4, 2, 1);
  rect(ctx, p.mossLight, 3, 3, 4, 2);
  if (p.variant === 1) {
    rect(ctx, p.glow, 9, 2, 3, 2); // cogumelo nascendo no toco
    rect(ctx, p.bone, 10, 4, 1, 2);
  }
}

function drawMushrooms(p: Pen): void {
  const { ctx, w, h } = p;
  const caps =
    p.variant === 0
      ? ([
          [4, 5, 6],
          [11, 7, 5],
          [8, 3, 4],
        ] as const)
      : p.variant === 1
        ? ([
            [7, 6, 7],
            [12, 9, 4],
          ] as const)
        : ([
            [3, 8, 4],
            [8, 4, 6],
            [13, 8, 4],
          ] as const);
  for (const [cx, stem, cap] of caps) {
    rect(ctx, p.bone, cx, h - stem, 2, stem);
    for (let r = 0; r < Math.ceil(cap / 2); r++) {
      const half = Math.min(cap / 2, r + 2);
      rect(ctx, p.glowSoft, cx + 1 - half, h - stem - r, Math.round(half * 2), 1);
    }
    rect(ctx, p.glow, cx - 1, h - stem - 1, 1, 1);
    rect(ctx, p.glow, cx + 2, h - stem - 2, 1, 1, 0.9);
  }
  rect(ctx, p.moss, 1, h - 1, w - 2, 1);
}

function drawSignpost(p: Pen): void {
  const { ctx, w, h } = p;
  rect(ctx, p.wood.dark, w / 2 - 1, 3, 3, h - 3); // poste
  rect(ctx, p.wood.base, w / 2, 3, 1, h - 3);
  rect(ctx, p.wood.dark, 2, h - 2, w - 4, 2);
  if (p.variant === 0) {
    rect(ctx, p.wood.base, 1, 5, w - 3, 5); // placa em seta
    rect(ctx, p.wood.light, 1, 5, w - 3, 1);
    rect(ctx, p.wood.base, w - 3, 6, 2, 3);
    rect(ctx, p.wood.dark, 3, 7, w - 8, 1);
  } else {
    rect(ctx, p.wood.base, 3, 12, w - 5, 4); // placa caída, pendurada por um prego
    rect(ctx, p.wood.dark, 3, 15, w - 5, 1);
    rect(ctx, p.iron.light, w / 2, 11, 1, 2);
  }
  rect(ctx, p.mossLight, w / 2 - 1, 5, 3, 1);
}

function drawCampfire(p: Pen): void {
  const { ctx, h } = p;
  for (const x of [3, 8, 14, 19, 24]) {
    disc(ctx, p.stone.light, x + 2, h - 3, 3);
    rect(ctx, p.stone.dark, x, h - 2, 5, 2);
  }
  rect(ctx, p.wood.dark, 8, h - 5, 16, 3); // lenha
  rect(ctx, p.wood.base, 10, h - 6, 12, 2);
  rect(ctx, p.wood.light, 10, h - 6, 12, 1);
  rect(ctx, p.flame[0], 11, h - 5, 10, 2);
  flame(p, 13, h - 11);
  flame(p, 17, h - 10);
  rect(ctx, p.flame[2], 15, h - 7, 2, 1);
}

function drawRoots(p: Pen): void {
  const { ctx, w, h } = p;
  const strands = p.variant === 2 ? 4 : 6;
  for (let i = 0; i < strands; i++) {
    let x = 3 + Math.round(((w - 8) * i) / (strands - 1));
    const len = randomInt(p.rng, h - 22, h - 4);
    const thick = 3 - (i % 2);
    for (let y = 0; y < len; y++) {
      if (y % 6 === 0 && p.rng() < 0.5) x += p.rng() < 0.5 ? -1 : 1;
      const t = Math.max(1, thick - Math.floor((y / len) * thick));
      rect(ctx, p.wood.base, x, y, t, 1);
      rect(ctx, p.wood.dark, x + t - 1, y, 1, 1);
      if (y % 11 === 5) rect(ctx, p.mossLight, x - 1, y, 2, 2);
    }
  }
  rect(ctx, p.wood.dark, 0, 0, w, 4); // massa de raízes no teto
  rect(ctx, p.wood.base, 2, 0, w - 4, 3);
  if (p.variant === 1) disc(ctx, p.glow, w / 2, h - 6, 2); // algo brilha preso nas raízes
}

function drawLantern(p: Pen): void {
  const { ctx, w } = p;
  const cx = w / 2;
  rect(ctx, p.moss, cx, 0, 1, 12); // cipó que a segura
  rect(ctx, p.mossLight, cx, 3, 1, 1);
  rect(ctx, p.iron.base, cx - 3, 12, 7, 2);
  rect(ctx, p.iron.base, cx - 3, 24, 7, 2);
  rect(ctx, p.iron.light, cx - 3, 12, 7, 1);
  for (const x of [cx - 3, cx + 3]) rect(ctx, p.iron.base, x, 14, 1, 10);
  rect(ctx, p.glowSoft, cx - 2, 14, 5, 10, 0.55);
  rect(ctx, p.glow, cx - 1, 16, 3, 6, 0.9);
  rect(ctx, p.flame[2], cx, 18, 1, 2);
}

function drawCocoon(p: Pen): void {
  const { ctx, w, h } = p;
  const cx = w / 2;
  rect(ctx, 0xcfcfd8, cx, 0, 1, 8); // fio de seda
  for (let y = 8; y < h - 4; y++) {
    const t = (y - 8) / (h - 12);
    const half = Math.round(2 + Math.sin(t * Math.PI) * 4);
    rect(ctx, 0xb8b8c4, cx - half, y, half * 2, 1);
    rect(ctx, 0xe4e4ec, cx - half, y, 1, 1);
  }
  for (let y = 10; y < h - 6; y += 3) rect(ctx, 0x8d8d9c, cx - 4, y, 8, 1, 0.7);
  if (p.variant === 1) {
    rect(ctx, p.bone, cx - 2, h - 9, 4, 3); // algo preso dentro
    rect(ctx, p.stone.deep, cx - 1, h - 8, 1, 1);
  }
  rect(ctx, 0xcfcfd8, cx - 1, h - 5, 2, 4); // pontas soltas
}

function drawBoat(p: Pen): void {
  const { ctx, w, h } = p;
  const sunk = p.variant === 1;
  // Casco: uma meia-lua de tábuas, com a proa para cima
  for (let x = 2; x < w - 2; x++) {
    const t = (x - 2) / (w - 4);
    const depth = Math.round(4 + Math.sin(t * Math.PI) * 6);
    const lift = Math.round((1 - Math.sin(t * Math.PI)) * 5);
    rect(ctx, p.wood.base, x, h - depth - lift, 1, depth);
    rect(ctx, p.wood.light, x, h - depth - lift, 1, 1);
    if (x % 5 === 0) rect(ctx, p.wood.dark, x, h - depth - lift, 1, depth);
  }
  rect(ctx, p.wood.dark, 3, h - 2, w - 6, 2); // quilha
  if (sunk) {
    rect(ctx, p.wood.dark, w / 2 - 3, h - 12, 2, 8); // costela quebrada
    rect(ctx, p.moss, 6, h - 6, 10, 2);
  } else {
    rect(ctx, p.wood.dark, w / 2 - 1, h - 14, 2, 6); // remo
    rect(ctx, p.wood.light, w / 2 - 6, h - 14, 6, 1);
    rect(ctx, 0x9a8a62, w / 2 + 2, h - 9, 8, 4); // rede e cordas na popa
  }
  rect(ctx, p.mossLight, 8, h - 8, 4, 1);
}

function drawReeds(p: Pen): void {
  const { ctx, w, h } = p;
  const stalks = p.variant === 0 ? 5 : p.variant === 1 ? 4 : 6;
  for (let i = 0; i < stalks; i++) {
    const x = 2 + Math.round(((w - 5) * i) / Math.max(1, stalks - 1));
    const height = randomInt(p.rng, h - 12, h - 3);
    const bend = i % 2 === 0 ? 1 : -1;
    for (let y = 0; y < height; y++) {
      const dx = Math.round((y / height) ** 2 * bend * 2);
      rect(ctx, y % 6 === 0 ? p.mossLight : p.moss, x + dx, h - 1 - y, 1, 1);
    }
    // Espiga marrom (taboa) no alto
    const tx = x + bend * 2;
    rect(ctx, 0x5a3a22, tx - 1, h - height - 4, 2, 5);
    rect(ctx, 0x8a5e38, tx - 1, h - height - 4, 1, 4);
  }
}

function drawStakes(p: Pen): void {
  const { ctx, w, h } = p;
  const skull = p.variant === 1;
  for (const [x, top] of [
    [3, 3],
    [8, 6],
    [12, 4],
  ] as const) {
    rect(ctx, p.wood.dark, x, top, 2, h - top);
    rect(ctx, p.wood.light, x, top, 1, h - top);
    rect(ctx, p.wood.dark, x, top - 1, 1, 1);
  }
  rect(ctx, p.stone.dark, 1, h - 2, w - 2, 2); // base de lama
  rect(ctx, p.moss, 2, h - 2, 5, 1);
  if (skull) {
    rect(ctx, p.bone, 6, 0, 5, 4); // crânio espetado
    rect(ctx, p.stone.deep, 7, 1, 1, 1);
    rect(ctx, p.stone.deep, 9, 1, 1, 1);
    rect(ctx, p.boneShade, 7, 3, 3, 1);
  }
}

function drawNet(p: Pen): void {
  const { ctx, w, h } = p;
  const torn = p.variant === 1;
  rect(ctx, p.wood.base, 0, 0, w, 3); // vara
  rect(ctx, p.wood.light, 0, 0, w, 1);
  // Malha em losangos pendurada, mais larga no alto e fechada embaixo
  for (let y = 3; y < h - 2; y += 3) {
    const t = (y - 3) / (h - 5);
    const half = Math.round(w / 2 - 2 - t * (w / 2 - 6));
    for (let x = w / 2 - half; x < w / 2 + half; x += 3) {
      const o = (Math.floor(y / 3) % 2) * 1;
      rect(ctx, 0x9a8a62, x + o, y, 1, 3);
      rect(ctx, 0x6a5c3e, x + o + 1, y + 1, 2, 1);
    }
  }
  for (const x of [5, w - 7, w / 2]) {
    rect(ctx, 0xb5a577, x, 4, 3, 3); // boias de cortiça
    rect(ctx, 0x6a5c3e, x, 6, 3, 1);
  }
  if (torn) {
    rect(ctx, p.stone.deep, w / 2 - 3, 12, 5, 5, 0.9);
  } else {
    rect(ctx, p.bone, w / 2 - 1, h - 6, 3, 3); // um peixe seco preso
  }
}

function drawTombstone(p: Pen): void {
  const { ctx, w, h } = p;
  const v = p.variant;
  const cx = w / 2;
  // Montinho de terra ao pé da lápide
  rect(ctx, p.stone.dark, 1, h - 3, w - 2, 3);
  rect(ctx, p.stone.base, 3, h - 4, w - 6, 1);
  if (v === 2) {
    // Cruz de pedra
    const top = 3;
    rect(ctx, p.stone.base, cx - 1, top, 3, h - top - 3);
    rect(ctx, p.stone.base, cx - 5, top + 5, 11, 3);
    rect(ctx, p.stone.light, cx - 1, top, 1, h - top - 3);
    rect(ctx, p.stone.light, cx - 5, top + 5, 11, 1);
    rect(ctx, p.stone.dark, cx + 1, top + 1, 1, h - top - 4);
    rect(ctx, p.moss, cx - 1, h - 12, 3, 2);
    return;
  }
  const slabH = v === 3 ? 15 : v === 1 ? 21 : 19;
  const top = h - 3 - slabH;
  const sw = 10;
  const sx = cx - sw / 2;
  rect(ctx, p.stone.base, sx, top + 2, sw, slabH - 2);
  if (v === 1) {
    // Ponta ogival
    for (let r = 0; r < 4; r++) rect(ctx, p.stone.base, cx - 1 - r, top - 2 + r, 2 + r * 2, 1);
  } else if (v === 3) {
    // Quebrada em dentes, com um pedaço caído no chão
    for (let x = 0; x < sw; x++)
      rect(ctx, p.stone.base, sx + x, top + 2 - (x % 3 === 1 ? 2 : 0), 1, 2);
    rect(ctx, p.stone.base, 1, h - 6, 5, 3);
    rect(ctx, p.stone.dark, 1, h - 4, 5, 1);
  } else {
    rect(ctx, p.stone.base, sx + 1, top + 1, sw - 2, 1);
    rect(ctx, p.stone.base, sx + 2, top, sw - 4, 1);
  }
  rect(ctx, p.stone.light, sx, top + 2, 1, slabH - 2);
  rect(ctx, p.stone.dark, sx + sw - 2, top + 2, 2, slabH - 2);
  // Inscrição gasta, musgo e uma rachadura
  rect(ctx, p.stone.dark, sx + 2, top + 6, sw - 4, 1);
  rect(ctx, p.stone.dark, sx + 3, top + 9, sw - 6, 1);
  rect(ctx, p.stone.dark, sx + 2, top + 12, sw - 5, 1);
  rect(ctx, p.moss, sx, h - 8, 4, 2);
  rect(ctx, p.mossLight, sx + 1, h - 8, 2, 1);
  rect(ctx, p.stone.deep, sx + 6, top + 4, 1, 4);
}

function drawGrave(p: Pen): void {
  const { ctx, w, h } = p;
  if (p.variant === 0) {
    // Cova aberta: o buraco escuro entre dois montes de terra, uma pá fincada e um osso
    rect(ctx, p.stone.dark, 0, h - 4, w, 4);
    for (const [x0, x1] of [
      [0, 13],
      [w - 14, w],
    ] as const) {
      for (let x = x0; x < x1; x++) {
        const t = (x - x0) / (x1 - x0);
        const rise = Math.round(Math.sin(t * Math.PI) * 5);
        rect(ctx, p.stone.base, x, h - 4 - rise, 1, rise);
      }
    }
    rect(ctx, p.stone.deep, 12, h - 5, w - 26, 5);
    rect(ctx, p.stone.light, 12, h - 5, w - 26, 1);
    rect(ctx, p.wood.base, w - 10, h - 15, 2, 11); // cabo da pá
    rect(ctx, p.wood.light, w - 10, h - 15, 1, 11);
    rect(ctx, p.iron.light, w - 12, h - 6, 5, 4); // lâmina
    rect(ctx, p.iron.base, w - 12, h - 3, 5, 1);
    rect(ctx, p.bone, 16, h - 6, 5, 1);
    rect(ctx, p.boneShade, 18, h - 5, 3, 1);
  } else {
    // Cova recém-fechada: monte de terra, cruz de madeira torta e uma fita de pano
    rect(ctx, p.stone.dark, 0, h - 3, w, 3);
    for (let x = 4; x < w - 4; x++) {
      const t = (x - 4) / (w - 8);
      const rise = Math.round(Math.sin(t * Math.PI) * 6);
      rect(ctx, p.stone.base, x, h - 3 - rise, 1, rise);
      if (x % 4 === 0) rect(ctx, p.stone.light, x, h - 3 - rise, 1, 1);
    }
    const cx = w / 2 + 3;
    rect(ctx, p.wood.base, cx, 2, 2, h - 6);
    rect(ctx, p.wood.base, cx - 4, 5, 10, 2);
    rect(ctx, p.wood.light, cx, 2, 1, h - 6);
    rect(ctx, p.cloth, cx - 4, 7, 2, 5);
    rect(ctx, p.clothDark, cx - 4, 11, 2, 1);
    rect(ctx, p.mossLight, 6, h - 5, 3, 1);
  }
}

function drawWeapons(p: Pen): void {
  const { ctx, w, h } = p;
  const v = p.variant;
  // Chão revolvido
  rect(ctx, p.stone.dark, 1, h - 3, w - 2, 3);
  rect(ctx, p.stone.base, 4, h - 4, w - 10, 1);
  const sword = (x: number, lean: number, len: number): void => {
    for (let y = 0; y < len; y++) {
      const dx = Math.round((y / len) * lean);
      rect(ctx, y % 5 === 0 ? p.iron.base : p.iron.light, x + dx, h - 3 - y, 1, 1);
      rect(ctx, p.iron.base, x + dx + 1, h - 3 - y, 1, 1);
    }
    const gx = x + lean;
    rect(ctx, p.wood.base, gx - 2, h - 3 - len - 1, 6, 2); // guarda
    rect(ctx, p.wood.light, gx - 2, h - 3 - len - 1, 6, 1);
    rect(ctx, p.wood.dark, gx, h - 3 - len - 4, 2, 3); // punho
  };
  const spear = (x: number, lean: number, len: number, broken: boolean): void => {
    for (let y = 0; y < len; y++) {
      const dx = Math.round((y / len) * lean);
      rect(ctx, y % 4 === 0 ? p.wood.dark : p.wood.light, x + dx, h - 3 - y, 1, 1);
    }
    if (!broken) {
      rect(ctx, p.iron.light, x + lean - 1, h - 3 - len - 3, 3, 4);
      rect(ctx, p.iron.base, x + lean, h - 3 - len - 3, 1, 4);
    }
  };
  if (v === 0) {
    sword(6, -2, 20);
    sword(14, 1, 24);
    sword(22, 3, 18);
  } else if (v === 1) {
    spear(7, -1, 26, false);
    spear(15, 2, 22, true);
    spear(23, 4, 24, false);
  } else {
    // Escudo caído de lado, uma espada e um elmo
    disc(ctx, p.iron.base, 10, h - 9, 6);
    disc(ctx, p.iron.light, 10, h - 9, 4);
    rect(ctx, p.trim, 9, h - 12, 2, 6);
    rect(ctx, p.cloth, 8, h - 10, 4, 2);
    sword(22, 2, 22);
    rect(ctx, p.iron.base, 14, h - 8, 7, 5); // elmo
    rect(ctx, p.iron.light, 14, h - 8, 7, 1);
    rect(ctx, p.stone.deep, 17, h - 6, 3, 1);
  }
  rect(ctx, p.moss, 3, h - 4, 4, 1);
}

function drawBannerPole(p: Pen): void {
  const { ctx, w, h } = p;
  const broken = p.variant === 1;
  if (!broken) {
    rect(ctx, p.wood.base, w / 2 - 1, 2, 2, h - 2);
    rect(ctx, p.wood.light, w / 2 - 1, 2, 1, h - 2);
    rect(ctx, p.iron.light, w / 2 - 2, 0, 4, 3); // ponta de ferro
    rect(ctx, p.wood.base, 2, 5, w - 4, 2); // travessa
    // Pano comprido, rasgado embaixo
    for (let x = 3; x < w - 3; x++) {
      const tear = x % 3 === 0 ? 5 : x % 3 === 1 ? 0 : 2;
      rect(ctx, x < w / 2 ? p.cloth : p.clothDark, x, 7, 1, 24 - tear);
    }
    rect(ctx, p.trim, 3, 12, w - 6, 1);
    rect(ctx, p.clothDark, w / 2 - 1, 14, 3, 3);
    rect(ctx, p.stone.dark, 1, h - 3, w - 2, 3);
  } else {
    // Mastro quebrado, torto, com o pano caído no chão
    for (let y = 0; y < h - 14; y++) {
      const dx = Math.round((y / (h - 14)) * 4);
      rect(ctx, p.wood.base, 5 + dx, h - 3 - y, 2, 1);
    }
    rect(ctx, p.wood.light, 5, h - 3 - 5, 1, 4);
    rect(ctx, p.cloth, 2, h - 6, 12, 3);
    rect(ctx, p.clothDark, 2, h - 4, 12, 1);
    rect(ctx, p.trim, 4, h - 5, 6, 1);
    rect(ctx, p.stone.dark, 1, h - 3, w - 2, 3);
  }
}

const CRYSTAL = 0x4ae0d0;
const CRYSTAL_HOT = 0xc8fff8;
const CRYSTAL_DARK = 0x1a7a78;

function drawMinecart(p: Pen): void {
  const { ctx, w, h } = p;
  const v = p.variant;
  // Trilho com dormentes
  rect(ctx, p.iron.base, 0, h - 3, w, 1);
  rect(ctx, p.iron.light, 0, h - 3, w, 1);
  for (let x = 2; x < w; x += 8) rect(ctx, p.wood.dark, x, h - 2, 4, 2);
  if (v === 2) {
    // Tombado de lado, com o minério esparramado
    rect(ctx, p.iron.base, 8, h - 12, 26, 9);
    rect(ctx, p.iron.light, 8, h - 12, 26, 1);
    rect(ctx, p.iron.dark, 8, h - 4, 26, 1);
    for (let x = 12; x < 32; x += 7) rect(ctx, p.iron.dark, x, h - 11, 1, 7);
    rect(ctx, p.stone.base, 35, h - 5, 4, 3);
    rect(ctx, p.stone.light, 39, h - 4, 3, 2);
    rect(ctx, CRYSTAL, 42, h - 5, 2, 2);
    disc(ctx, p.iron.base, 14, h - 2, 2);
    return;
  }
  // Caçamba de ferro com aro, rebites e duas rodas
  rect(ctx, p.iron.base, 5, h - 17, w - 10, 12);
  rect(ctx, p.iron.light, 4, h - 18, w - 8, 2);
  rect(ctx, p.iron.dark, 5, h - 7, w - 10, 2);
  for (let x = 9; x < w - 8; x += 8) rect(ctx, p.iron.dark, x, h - 15, 1, 8);
  for (const x of [8, w - 11]) rect(ctx, p.iron.light, x, h - 16, 1, 1);
  for (const x of [12, w - 14]) {
    disc(ctx, p.iron.dark, x, h - 4, 3);
    rect(ctx, p.iron.light, x, h - 5, 1, 1);
  }
  rect(ctx, p.wood.dark, w / 2 - 2, h - 5, 4, 2); // engate
  if (v === 0) {
    // Carregado de pedras e cristais
    for (let x = 6; x < w - 8; x += 5) {
      const top = h - 22 + ((x * 7) % 4);
      rect(ctx, p.stone.base, x, top, 6, 6);
      rect(ctx, p.stone.light, x, top, 6, 1);
    }
    rect(ctx, CRYSTAL, 18, h - 25, 2, 4);
    rect(ctx, CRYSTAL_HOT, 18, h - 25, 1, 2);
    rect(ctx, CRYSTAL, 28, h - 24, 2, 3);
  } else {
    rect(ctx, p.stone.dark, 7, h - 7, w - 14, 1); // poeira no fundo
    rect(ctx, p.bone, 20, h - 9, 4, 2); // um osso esquecido
  }
}

function drawPickaxes(p: Pen): void {
  const { ctx, h } = p;
  const v = p.variant;
  // Poste de escora
  rect(ctx, p.wood.base, 6, 3, 4, h - 3);
  rect(ctx, p.wood.light, 6, 3, 1, h - 3);
  rect(ctx, p.wood.dark, 5, h - 3, 6, 3);
  // Picaretas penduradas num prego
  const pick = (x: number, y: number, flip: number): void => {
    rect(ctx, p.wood.base, x, y, 1, 14);
    rect(ctx, p.wood.light, x, y, 1, 6);
    rect(ctx, p.iron.light, x - 4 * flip, y - 1, 9, 2);
    rect(ctx, p.iron.base, x - 4 * flip, y + 1, 9, 1);
    rect(ctx, p.iron.light, x - 5 * flip, y, 1, 2);
    rect(ctx, p.iron.light, x + 5 * flip, y, 1, 2);
  };
  if (v === 0) {
    pick(12, 6, 1);
    pick(3, 9, -1);
  } else {
    pick(12, 5, 1);
    // Elmo de mineiro com o lampião apagado, pendurado do poste
    rect(ctx, p.iron.base, 1, 13, 5, 3);
    rect(ctx, p.iron.light, 1, 13, 5, 1);
    rect(ctx, p.iron.dark, 5, 12, 2, 2);
    rect(ctx, 0xc86a1a, 6, 12, 1, 1);
  }
}

function drawRubble(p: Pen): void {
  const { ctx, w, h } = p;
  const v = p.variant;
  const stone = (x: number, y: number, sw: number, sh: number): void => {
    rect(ctx, p.stone.base, x, y, sw, sh);
    rect(ctx, p.stone.light, x, y, sw, 1);
    rect(ctx, p.stone.light, x, y, 1, sh);
    rect(ctx, p.stone.deep, x, y + sh - 1, sw, 1);
    rect(ctx, p.stone.dark, x + sw - 1, y, 1, sh);
  };
  stone(2, h - 5, 9, 5);
  stone(10, h - 8, 10, 8);
  stone(19, h - 5, 8, 5);
  stone(6, h - 10, 6, 5);
  stone(14, h - 13, 5, 5);
  rect(ctx, p.stone.dark, 0, h - 1, w, 1);
  rect(ctx, p.stone.light, 25, h - 3, 3, 1);
  if (v === 1) {
    rect(ctx, CRYSTAL, 21, h - 9, 2, 4);
    rect(ctx, CRYSTAL_HOT, 21, h - 9, 1, 2);
    rect(ctx, CRYSTAL_DARK, 23, h - 8, 1, 3);
  } else if (v === 2) {
    // Uma escora quebrada no meio das pedras
    rect(ctx, p.wood.base, 4, h - 12, 3, 9);
    rect(ctx, p.wood.light, 4, h - 12, 1, 9);
    rect(ctx, p.wood.dark, 3, h - 13, 5, 1);
    rect(ctx, p.wood.base, 16, h - 6, 12, 2);
  } else {
    rect(ctx, p.bone, 26, h - 3, 3, 1); // um osso entre as pedras
  }
}

function drawCrystals(p: Pen): void {
  const { ctx, w, h } = p;
  const v = p.variant;
  rect(ctx, p.stone.dark, 1, h - 3, w - 2, 3);
  rect(ctx, p.stone.base, 3, h - 4, w - 6, 1);
  const shard = (x: number, height: number, lean: number): void => {
    for (let y = 0; y < height; y++) {
      const t = y / height;
      const half = Math.max(1, Math.round(2 - t * 2));
      const cx = x + Math.round(lean * t);
      rect(ctx, CRYSTAL, cx - half, h - 4 - y, half * 2 + 1, 1);
      rect(ctx, CRYSTAL_HOT, cx - half, h - 4 - y, 1, 1);
      rect(ctx, CRYSTAL_DARK, cx + half, h - 4 - y, 1, 1);
    }
    rect(ctx, CRYSTAL_HOT, x + lean, h - 4 - height, 1, 1);
  };
  if (v === 0) {
    shard(8, 24, 1);
    shard(4, 15, -3);
    shard(12, 12, 3);
  } else if (v === 1) {
    shard(7, 18, -2);
    shard(11, 22, 2);
  } else {
    shard(5, 12, -1);
    shard(8, 17, 0);
    shard(11, 10, 2);
    shard(13, 6, 3);
  }
}

function drawStalactite(p: Pen): void {
  const { ctx, w } = p;
  const v = p.variant;
  // Base grudada no teto
  rect(ctx, p.stone.dark, 0, 0, w, 2);
  const spike = (x: number, len: number): void => {
    for (let y = 0; y < len; y++) {
      const half = Math.max(0, Math.round(3 - (y / len) * 3));
      rect(ctx, p.stone.base, x - half, y, half * 2 + 1, 1);
      rect(ctx, p.stone.light, x - half, y, 1, 1);
      rect(ctx, p.stone.deep, x + half, y, 1, 1);
    }
  };
  if (v === 0) {
    spike(8, 26);
    spike(3, 12);
  } else if (v === 1) {
    spike(6, 20);
    spike(11, 14);
  } else {
    spike(8, 18);
    rect(ctx, CRYSTAL, 12, 2, 2, 7); // cristais brotando do teto
    rect(ctx, CRYSTAL_HOT, 12, 2, 1, 4);
    rect(ctx, CRYSTAL_DARK, 14, 3, 1, 5);
  }
}

const DRAWERS: Readonly<Record<FurnitureKind, (p: Pen) => void>> = {
  barrel: drawBarrel,
  crates: drawCrates,
  cart: drawCart,
  weaponRack: drawWeaponRack,
  dummy: drawDummy,
  table: drawTable,
  chair: drawChair,
  bookshelf: drawBookshelf,
  books: drawBooks,
  pew: drawPew,
  altar: drawAltar,
  candelabra: drawCandelabra,
  skulls: drawSkulls,
  coffin: drawCoffin,
  cell: drawCell,
  urn: drawUrn,
  log: drawLog,
  stump: drawStump,
  mushrooms: drawMushrooms,
  signpost: drawSignpost,
  campfire: drawCampfire,
  roots: drawRoots,
  lantern: drawLantern,
  cocoon: drawCocoon,
  boat: drawBoat,
  reeds: drawReeds,
  stakes: drawStakes,
  tombstone: drawTombstone,
  grave: drawGrave,
  weapons: drawWeapons,
  bannerPole: drawBannerPole,
  minecart: drawMinecart,
  pickaxes: drawPickaxes,
  rubble: drawRubble,
  crystals: drawCrystals,
  stalactite: drawStalactite,
  net: drawNet,
  tapestry: drawTapestry,
  chandelier: drawChandelier,
  cage: drawCage,
};

/** Contorno de 1 px nos pixels transparentes que encostam na peça. */
function outline(ctx: Ctx, width: number, height: number, color: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const opaque = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && (data[(y * width + x) * 4 + 3] ?? 0) > 40;
  const marks: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        marks.push((y * width + x) * 4);
      }
    }
  }
  for (const i of marks) {
    data[i] = (color >> 16) & 0xff;
    data[i + 1] = (color >> 8) & 0xff;
    data[i + 2] = color & 0xff;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

/** Cria (uma vez) as texturas de toda a mobília das alas de um bioma. */
export function ensureFurnitureTextures(scene: Phaser.Scene, biome: BiomeId): void {
  const kinds = new Set<FurnitureKind>();
  for (const wing of WINGS[biome]) for (const entry of wing.furniture) kinds.add(entry.kind);
  for (const kind of kinds) {
    const { width, height } = furnitureSize(kind);
    for (let variant = 0; variant < FURNITURE[kind].variants; variant++) {
      canvasTexture(scene, furnitureKey(biome, kind, variant), width, height, (ctx) => {
        DRAWERS[kind](makePen(ctx, biome, kind, variant));
        outline(ctx, width, height, PALETTE.void);
      });
    }
  }
}
