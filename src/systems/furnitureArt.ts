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
