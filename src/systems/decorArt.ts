import type Phaser from 'phaser';
import { DECOR_RULES, type DecorKind } from '../data/decor';
import { BIOME_LOOK, type BiomeLook } from '../data/biomeLook';
import { ALL_BIOMES, type BiomeId } from '../data/mapRules';
import { createRng, randomInt, type Rng } from '../utils/rng';
import { canvasTexture, disc, line, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Decoração do cenário em pixel art: tufos, pedregulho, ossos, trepadeiras, correntes, gotas
 * de pedra, teias e rachaduras. Cada bioma pinta com as suas cores. Os desenhos que "crescem" do
 * chão têm a base na última linha; os que pendem do teto têm o topo na primeira.
 */

export interface DecorSize {
  width: number;
  height: number;
}

const BONE = 0xc4c0aa;
const BONE_SHADE = 0x8d8a78;

/** Tamanho (px) de cada tipo de decoração. */
export const DECOR_SIZE: Readonly<Record<DecorKind, DecorSize>> = {
  tuft: { width: 12, height: 8 },
  rubble: { width: 12, height: 6 },
  bone: { width: 12, height: 6 },
  vine: { width: 7, height: 26 },
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

function drawTuft(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng, biome: BiomeId): void {
  const { height: h } = DECOR_SIZE.tuft;
  if (biome === 'catacumbas' && variant !== 0) {
    // Cogumelos que brilham
    for (const [x, ch] of [
      [3, 4],
      [7, 3],
      [9, 5],
    ] as const) {
      rect(ctx, look.moss, x, h - ch, 1, ch);
      rect(ctx, look.mossLight, x - 1, h - ch - 1, 3, 2);
      rect(ctx, look.glow, x, h - ch - 1, 1, 1, 0.9);
      disc(ctx, look.glow, x, h - ch - 1, 3, 0.08);
    }
    return;
  }
  // Lâminas de capim de alturas diferentes, com a ponta mais clara
  const blades = 6 + variant * 2;
  for (let i = 0; i < blades; i++) {
    const x = 1 + Math.round((i * 10) / blades) + randomInt(rng, 0, 1);
    const bh = randomInt(rng, 3, 7);
    const lean = rng() < 0.5 ? -1 : 1;
    rect(ctx, look.moss, x, h - bh, 1, bh);
    rect(ctx, look.mossLight, x + (bh > 4 ? lean : 0), h - bh - 1, 1, 1, 0.9);
  }
  if (variant === 2) {
    // Florzinha miúda
    rect(ctx, look.glowSoft, 6, h - 8, 2, 2, 0.95);
    rect(ctx, look.glow, 6, h - 8, 1, 1);
  }
}

function drawRubble(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const s = look.stone;
  const pieces = 2 + variant;
  for (let i = 0; i < pieces; i++) {
    const w = randomInt(rng, 3, 5);
    const h = randomInt(rng, 2, 4);
    const x = 1 + Math.round((i * 9) / pieces);
    const y = DECOR_SIZE.rubble.height - h;
    rect(ctx, s.base, x, y, w, h);
    rect(ctx, s.highlight, x, y, w, 1, 0.8);
    rect(ctx, s.deep, x + w - 1, y + 1, 1, h - 1, 0.7);
    rect(ctx, s.deep, x, y + h - 1, w, 1, 0.5);
  }
}

function drawBone(ctx: Ctx, variant: number): void {
  const { height: h } = DECOR_SIZE.bone;
  if (variant === 0) {
    // Caveira de lado
    rect(ctx, BONE, 3, h - 5, 5, 4);
    rect(ctx, BONE_SHADE, 3, h - 2, 5, 1);
    rect(ctx, BONE, 7, h - 3, 3, 2);
    rect(ctx, 0x0b0d14, 5, h - 4, 1, 1);
    rect(ctx, 0x0b0d14, 8, h - 2, 1, 1);
    rect(ctx, BONE_SHADE, 2, h - 1, 8, 1);
  } else if (variant === 1) {
    // Costelas em arco
    for (let i = 0; i < 4; i++) {
      rect(ctx, BONE, 2 + i * 2, h - 3 - (i % 2), 1, 3 + (i % 2));
      rect(ctx, BONE_SHADE, 3 + i * 2, h - 1, 1, 1);
    }
    rect(ctx, BONE_SHADE, 1, h - 1, 10, 1);
  } else {
    // Osso comprido com as pontas grossas
    rect(ctx, BONE, 2, h - 3, 8, 1);
    rect(ctx, BONE_SHADE, 2, h - 2, 8, 1);
    rect(ctx, BONE, 1, h - 4, 2, 2);
    rect(ctx, BONE, 9, h - 4, 2, 2);
    rect(ctx, BONE, 1, h - 2, 2, 1);
    rect(ctx, BONE, 9, h - 2, 2, 1);
  }
}

function drawVine(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng, biome: BiomeId): void {
  const length = 12 + variant * 6;
  let x = 3;
  for (let y = 0; y < length; y++) {
    if (rng() < 0.35) x = Math.min(5, Math.max(1, x + (rng() < 0.5 ? -1 : 1)));
    const color = biome === 'catacumbas' ? mix(look.moss, look.stone.deep, 0.35) : look.moss;
    rect(ctx, color, x, y, 1, 1);
    if (y % 4 === 3 && y > 2) {
      const dir = rng() < 0.5 ? -1 : 1;
      rect(ctx, look.mossLight, x + dir, y, 2, 1, 0.9);
      rect(ctx, color, x + dir * 2, y + 1, 1, 1);
    }
  }
}

function drawChain(ctx: Ctx, look: BiomeLook, variant: number): void {
  const { height: h } = DECOR_SIZE.chain;
  const length = variant === 0 ? 20 : 28;
  const s = look.stone;
  for (let y = 0; y < length; y += 3) {
    const wide = (y / 3) % 2 === 0;
    rect(ctx, s.light, wide ? 1 : 2, y, wide ? 3 : 1, 3);
    rect(ctx, s.highlight, wide ? 1 : 2, y, 1, 1, 0.9);
    rect(ctx, s.deep, wide ? 3 : 2, y + 2, 1, 1, 0.7);
  }
  // Argola ou grilhão na ponta
  if (variant === 1) {
    rect(ctx, s.light, 0, length, 5, 2);
    rect(ctx, s.deep, 1, length + 1, 3, 1);
    rect(ctx, s.base, 0, length + 2, 5, Math.max(0, h - length - 2) > 0 ? 1 : 0);
  } else {
    rect(ctx, s.highlight, 1, length, 3, 1);
    rect(ctx, s.light, 0, length + 1, 5, 2);
    rect(ctx, s.deep, 1, length + 2, 3, 1);
  }
}

function drawDrip(ctx: Ctx, look: BiomeLook, variant: number): void {
  const s = look.stone;
  // Estalactite pequena
  const lengths = variant === 0 ? [3, 6, 4] : [5, 9, 3];
  lengths.forEach((len, i) => {
    const x = 1 + i * 2;
    rect(ctx, s.base, x, 0, 2, len);
    rect(ctx, s.highlight, x, 0, 1, len - 1, 0.7);
    rect(ctx, s.deep, x + 1, 1, 1, len - 1, 0.6);
    rect(ctx, s.base, x, len, 1, 1);
  });
  // Gota prestes a cair
  const maxLen = Math.max(...lengths);
  rect(ctx, look.glowSoft, 3, maxLen + 1, 1, 2, 0.8);
  rect(ctx, 0xe8f6fa, 3, maxLen + 1, 1, 1, 0.9);
}

function drawCobweb(ctx: Ctx, variant: number): void {
  const w = DECOR_SIZE.cobweb.width;
  const reach = variant === 0 ? w - 2 : w - 5;
  const color = 0xc9ccd6;
  // Fios que saem do canto e fios em arco entre eles
  line(ctx, color, 0, 0, reach, 2, 0.55);
  line(ctx, color, 0, 0, reach - 2, reach - 3, 0.55);
  line(ctx, color, 0, 0, 2, reach, 0.55);
  for (const r of [4, 7, variant === 0 ? 10 : 8]) {
    line(ctx, color, r, 1, Math.round(r * 0.75), Math.round(r * 0.75), 0.4);
    line(ctx, color, Math.round(r * 0.75), Math.round(r * 0.75), 1, r, 0.4);
  }
}

function drawCrack(ctx: Ctx, look: BiomeLook, variant: number, rng: Rng): void {
  const color = look.stone.deep;
  let x = 5 + variant;
  for (let y = 0; y < 15; y++) {
    if (rng() < 0.45) x += rng() < 0.5 ? -1 : 1;
    x = Math.min(12, Math.max(1, x));
    rect(ctx, color, x, y, 1, 1, 0.75);
    if (y % 5 === 4) {
      const dir = rng() < 0.5 ? -1 : 1;
      rect(ctx, color, x + dir, y, 2, 1, 0.55);
    }
  }
}

function drawDecor(ctx: Ctx, biome: BiomeId, kind: DecorKind, variant: number): void {
  const look = BIOME_LOOK[biome];
  const rng = createRng(500 + variant * 13 + kind.length * 7 + biome.length);
  switch (kind) {
    case 'tuft':
      drawTuft(ctx, look, variant, rng, biome);
      break;
    case 'rubble':
      drawRubble(ctx, look, variant, rng);
      break;
    case 'bone':
      drawBone(ctx, variant);
      break;
    case 'vine':
      drawVine(ctx, look, variant, rng, biome);
      break;
    case 'chain':
      drawChain(ctx, look, variant);
      break;
    case 'drip':
      drawDrip(ctx, look, variant);
      break;
    case 'cobweb':
      drawCobweb(ctx, variant);
      break;
    case 'crack':
      drawCrack(ctx, look, variant, rng);
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
