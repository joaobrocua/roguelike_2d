import type Phaser from 'phaser';
import { TILE_VARIANTS } from '../data/atmosphere';
import { BIOME_LOOK, type BiomeLook } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { ALL_BIOMES } from '../data/mapRules';
import { TILE_SIZE } from '../data/rooms';
import { TILE_EDGE, type TileLook } from '../logic/tileVariant';
import { createRng, randomInt, type Rng } from '../utils/rng';
import { canvasTexture, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Blocos de pedra de cada bioma em pixel art: tijolos com junta, tons variados, realce de luz
 * nas quinas expostas, sombra nas bases e musgo/limo na superfície onde se pisa. Cada bloco muda
 * conforme os lados que estão ao ar livre (`edges`), então as quinas e os tetos ficam
 * acabados em vez de repetir o mesmo quadrado.
 */

/** Chave da textura de um bloco, a partir da aparência escolhida pela lógica pura. */
export function tileTextureKey(biome: BiomeId, look: TileLook): string {
  return `tile-${biome}-${look.kind}-${look.variant}-${look.edges}`;
}

const HALF = TILE_SIZE / 2;

/**
 * Corpo do bloco de terra da floresta: manchas de terra de dois tons, pedrinhas e raízes
 * serpenteando em vez de tijolos e argamassa.
 */
function drawEarthBody(ctx: Ctx, look: BiomeLook, kind: 'top' | 'fill', rng: Rng): void {
  const s = look.stone;
  const base = kind === 'top' ? s.base : mix(s.base, s.dark, 0.5);
  rect(ctx, base, 0, 0, TILE_SIZE, TILE_SIZE);
  // Torrões: manchas mais claras e mais escuras espalhadas
  for (let i = 0; i < 9; i++) {
    const x = randomInt(rng, 0, 12);
    const y = randomInt(rng, 0, 12);
    const w = randomInt(rng, 3, 6);
    const h = randomInt(rng, 2, 4);
    rect(ctx, rng() < 0.5 ? mix(base, s.light, 0.35) : mix(base, s.dark, 0.55), x, y, w, h, 0.8);
  }
  // Pedrinhas com luz em cima
  for (let i = 0; i < 3; i++) {
    const x = randomInt(rng, 1, 13);
    const y = randomInt(rng, 3, 13);
    rect(ctx, mix(s.light, s.highlight, 0.4), x, y, 2, 1);
    rect(ctx, s.deep, x, y + 1, 2, 1, 0.6);
  }
  // Raízes: uma veia escura com luz do lado, cruzando o bloco
  let ry = randomInt(rng, 4, 11);
  for (let x = 0; x < TILE_SIZE; x++) {
    if (rng() < 0.28) ry = Math.min(14, Math.max(2, ry + (rng() < 0.5 ? -1 : 1)));
    rect(ctx, s.deep, x, ry, 1, 2, 0.85);
    rect(ctx, mix(s.light, base, 0.4), x, ry - 1, 1, 1, 0.55);
  }
}

function drawTile(
  ctx: Ctx,
  look: BiomeLook,
  kind: 'top' | 'fill',
  edges: number,
  seed: number,
  earth = false,
): void {
  const rng = createRng(seed);
  const s = look.stone;
  const base = kind === 'top' ? s.base : mix(s.base, s.dark, 0.5);
  const mortar = kind === 'top' ? s.deep : mix(s.deep, 0x000000, 0.25);
  if (earth) drawEarthBody(ctx, look, kind, rng);
  else drawBrickBody(ctx, look, rng, base, mortar);
  drawTileFinish(ctx, look, kind, edges, rng, earth);
}

/** Corpo de pedra: duas fiadas de tijolos deslocadas, juntas, lascas e trincas. */
function drawBrickBody(ctx: Ctx, look: BiomeLook, rng: Rng, base: number, mortar: number): void {
  const s = look.stone;
  rect(ctx, base, 0, 0, TILE_SIZE, TILE_SIZE);

  // Duas fiadas de tijolos deslocadas, cada tijolo com o seu tom
  const bricks: [number, number, number, number][] = [
    [0, 0, HALF - 1, HALF],
    [HALF - 1, 0, HALF + 1, HALF],
    [0, HALF, 4, HALF],
    [4, HALF, 8, HALF],
    [12, HALF, 4, HALF],
  ];
  for (const [x, y, w, h] of bricks) {
    const roll = rng();
    const tone =
      roll < 0.28 ? mix(base, s.dark, 0.6) : roll > 0.78 ? mix(base, s.light, 0.45) : base;
    rect(ctx, tone, x, y, w, h);
    rect(ctx, s.highlight, x + 1, y + 1, Math.max(1, w - 3), 1, 0.22); // luz na face de cima
    rect(ctx, s.deep, x + 1, y + h - 2, Math.max(1, w - 2), 1, 0.28); // sombra embaixo
  }
  // Juntas (argamassa escura)
  rect(ctx, mortar, 0, HALF - 1, TILE_SIZE, 1);
  rect(ctx, mortar, 0, TILE_SIZE - 1, TILE_SIZE, 1);
  rect(ctx, mortar, HALF - 1, 0, 1, HALF - 1);
  rect(ctx, mortar, 3, HALF, 1, HALF - 1);
  rect(ctx, mortar, 11, HALF, 1, HALF - 1);

  // Lascas, trincas e manchas
  for (let i = 0; i < 4; i++) {
    rect(ctx, s.deep, randomInt(rng, 1, 14), randomInt(rng, 1, 14), 1, 1, 0.45);
    rect(ctx, s.light, randomInt(rng, 1, 14), randomInt(rng, 1, 14), 1, 1, 0.3);
  }
  if (rng() < 0.55) {
    const cx = randomInt(rng, 2, 12);
    const cy = randomInt(rng, 1, 4);
    rect(ctx, mortar, cx, cy, 1, 3, 0.85);
    rect(ctx, mortar, cx + 1, cy + 3, 1, 2, 0.85);
    rect(ctx, mortar, cx, cy + 5, 1, 2, 0.7);
  }
}

/** Acabamento comum: superfície onde se pisa, sombras internas e lados ao ar livre. */
function drawTileFinish(
  ctx: Ctx,
  look: BiomeLook,
  kind: 'top' | 'fill',
  edges: number,
  rng: Rng,
  earth: boolean,
): void {
  const s = look.stone;
  if (kind === 'top' && earth) {
    // Terra com um tapete de musgo em cima, que escorre em franjas irregulares
    rect(ctx, look.moss, 0, 0, TILE_SIZE, 3);
    rect(ctx, look.mossLight, 0, 0, TILE_SIZE, 1, 0.9);
    for (let x = 0; x < TILE_SIZE; x++) {
      rect(ctx, rng() < 0.5 ? look.moss : s.deep, x, 3, 1, randomInt(rng, 0, 3), 0.9);
    }
    for (let i = 0; i < 2; i++) rect(ctx, look.mossLight, randomInt(rng, 0, 13), 1, 2, 1, 0.8);
  } else if (kind === 'top') {
    // Superfície onde se pisa: pedra clara no alto e musgo escorrendo
    rect(ctx, s.highlight, 0, 0, TILE_SIZE, 1);
    rect(ctx, s.light, 0, 1, TILE_SIZE, 2);
    rect(ctx, s.deep, 0, 3, TILE_SIZE, 1, 0.45);
    const patches = randomInt(rng, 1, 3);
    for (let i = 0; i < patches; i++) {
      const mx = randomInt(rng, 0, 11);
      const mw = randomInt(rng, 3, 6);
      rect(ctx, look.moss, mx, 0, mw, 2);
      rect(ctx, look.mossLight, mx + 1, 0, Math.max(1, mw - 2), 1, 0.9);
      rect(ctx, look.moss, mx + randomInt(rng, 0, mw - 1), 2, 1, randomInt(rng, 1, 3), 0.85);
    }
  } else {
    // Bloco interno: mais escuro quanto mais fundo, com um pontilhado de sombra
    for (let i = 0; i < 14; i++) {
      rect(ctx, s.deep, randomInt(rng, 0, 15), randomInt(rng, 0, 15), 1, 1, 0.25);
    }
  }

  // Lados ao ar livre: luz na quina da esquerda, sombra na da direita e embaixo
  if (edges & TILE_EDGE.left) {
    rect(ctx, s.highlight, 0, kind === 'top' ? 1 : 0, 1, TILE_SIZE, 0.75);
    rect(ctx, s.light, 1, 2, 1, TILE_SIZE - 3, 0.4);
  }
  if (edges & TILE_EDGE.right) {
    rect(ctx, s.deep, TILE_SIZE - 1, 0, 1, TILE_SIZE, 0.9);
    rect(ctx, s.deep, TILE_SIZE - 2, 1, 1, TILE_SIZE - 1, 0.4);
  }
  if (edges & TILE_EDGE.bottom) {
    rect(ctx, s.deep, 0, TILE_SIZE - 1, TILE_SIZE, 1);
    rect(ctx, s.deep, 0, TILE_SIZE - 3, TILE_SIZE, 2, 0.45);
    rect(ctx, look.moss, randomInt(rng, 1, 12), TILE_SIZE - 2, 2, 1, 0.55);
  } else {
    rect(ctx, s.deep, 0, TILE_SIZE - 1, TILE_SIZE, 1, 0.4);
  }
}

/** Cria todos os blocos de todos os biomas (uma textura por tipo, variação e combinação de lados). */
export function createTileTextures(scene: Phaser.Scene): void {
  for (const biome of ALL_BIOMES) {
    const look = BIOME_LOOK[biome];
    for (let variant = 0; variant < TILE_VARIANTS; variant++) {
      for (const kind of ['top', 'fill'] as const) {
        for (let edges = 0; edges < 8; edges++) {
          const key = tileTextureKey(biome, { kind, variant, edges });
          canvasTexture(scene, key, TILE_SIZE, TILE_SIZE, (ctx) =>
            drawTile(
              ctx,
              look,
              kind,
              edges,
              100 + variant * 7 + edges * 31,
              biome === 'floresta' || biome === 'pantano',
            ),
          );
        }
      }
    }
  }
}
