import type Phaser from 'phaser';
import { ATMOSPHERE } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { BIOME_ORDER, type BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { createRng, randomInt } from '../utils/rng';
import { drawBackgroundLayer, type BackgroundLayer } from './biomeBackgrounds';
import { createDecorTextures } from './decorArt';
import { canvasTexture, rect, type Ctx } from './pixelCanvas';
import { createTileTextures } from './tileArt';

/**
 * Pixel art do cenário, desenhada em código e transformada em texturas: fundos de cada bioma
 * (src/systems/biomeBackgrounds.ts), blocos (tileArt.ts), decoração (decorArt.ts) e as peças
 * comuns daqui (névoa, mancha de luz, vinheta, tochas). Para trocar por arte final, basta
 * carregar imagens com as mesmas chaves.
 */

export const ENV_TEXTURE = {
  fog: 'fog',
  glow: 'glow',
  vignette: 'vignette',
  torchA: 'torch-a',
  torchB: 'torch-b',
  torchC: 'torch-c',
} as const;

export { tileTextureKey } from './tileArt';

/** Chave da textura de um plano do fundo de um bioma. */
export function backgroundKey(biome: BiomeId, layer: BackgroundLayer): string {
  return `bg-${layer}-${biome}`;
}

const FOG_WIDTH = 256;
const FOG_HEIGHT = 64;
const GLOW_SIZE = 128;
const TORCH_WIDTH = 8;
const TORCH_HEIGHT = 16;

export function createEnvironmentTextures(scene: Phaser.Scene): void {
  const width = ATMOSPHERE.layerWidth;
  const height = GAME_SIZE.height;
  for (const biome of BIOME_ORDER) {
    for (const layer of ['far', 'mid', 'near'] as const) {
      canvasTexture(scene, backgroundKey(biome, layer), width, height, (ctx) =>
        drawBackgroundLayer(ctx, biome, layer, width, height),
      );
    }
  }
  canvasTexture(scene, ENV_TEXTURE.fog, FOG_WIDTH, FOG_HEIGHT, drawFog);
  canvasTexture(scene, ENV_TEXTURE.glow, GLOW_SIZE, GLOW_SIZE, drawGlow);
  canvasTexture(scene, ENV_TEXTURE.vignette, GAME_SIZE.width, height, drawVignette);
  canvasTexture(scene, ENV_TEXTURE.torchA, TORCH_WIDTH, TORCH_HEIGHT, (ctx) => drawTorch(ctx, 0));
  canvasTexture(scene, ENV_TEXTURE.torchB, TORCH_WIDTH, TORCH_HEIGHT, (ctx) => drawTorch(ctx, 1));
  canvasTexture(scene, ENV_TEXTURE.torchC, TORCH_WIDTH, TORCH_HEIGHT, (ctx) => drawTorch(ctx, 2));
  createTileTextures(scene);
  createDecorTextures(scene);
}

/** Faixa de névoa que se repete na horizontal: manchas macias que "dão a volta" nas pontas. Branca (o bioma pinta). */
function drawFog(ctx: Ctx): void {
  const rng = createRng(5);
  for (let i = 0; i < 18; i++) {
    const cx = randomInt(rng, 0, FOG_WIDTH);
    const cy = randomInt(rng, 22, FOG_HEIGHT - 8);
    const rx = randomInt(rng, 28, 60);
    const ry = randomInt(rng, 6, 13);
    for (const offset of [-FOG_WIDTH, 0, FOG_WIDTH]) {
      ctx.save();
      ctx.translate(cx + offset, cy);
      ctx.scale(rx, ry);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gradient.addColorStop(0, 'rgba(255,255,255,0.20)');
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.08)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Mancha de luz: branca, opaca no centro e transparente na borda, com queda suave (vira cor com tint). */
function drawGlow(ctx: Ctx): void {
  const half = GLOW_SIZE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.78)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.34)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.09)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
}

/** Escurece as bordas da tela de forma suave (elíptica), mais forte nos cantos. */
function drawVignette(ctx: Ctx): void {
  const w = GAME_SIZE.width;
  const h = GAME_SIZE.height;
  const image = ctx.createImageData(w, h);
  const { alpha } = ATMOSPHERE.vignette;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5) / w - 0.5;
      const ny = (y + 0.5) / h - 0.5;
      const d = Math.sqrt(nx * nx * 1.15 + ny * ny * 1.6) / 0.62;
      const t = Math.min(1, Math.max(0, (d - 0.55) / 0.55));
      const a = t * t * (3 - 2 * t) * alpha;
      const i = (y * w + x) * 4;
      image.data[i] = 5;
      image.data[i + 1] = 6;
      image.data[i + 2] = 12;
      image.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Tocha de parede: suporte de ferro, copa e uma chama (três quadros que se alternam). */
function drawTorch(ctx: Ctx, frame: 0 | 1 | 2): void {
  const iron = 0x3d475f;
  const ironDark = 0x1c2339;
  rect(ctx, ironDark, 3, 9, 2, 7); // haste
  rect(ctx, iron, 3, 9, 1, 7);
  rect(ctx, iron, 1, 7, 6, 3); // copa
  rect(ctx, 0x6f7fa6, 1, 7, 6, 1);
  rect(ctx, ironDark, 1, 9, 6, 1);
  rect(ctx, ironDark, 2, 10, 4, 1);
  const flames: readonly [number, number, number, number][][] = [
    [
      [2, 1, 4, 6],
      [3, 0, 2, 3],
    ],
    [
      [2, 2, 4, 5],
      [4, 1, 1, 2],
    ],
    [
      [2, 2, 4, 5],
      [2, 1, 1, 2],
      [5, 0, 1, 3],
    ],
  ];
  for (const [x, y, w, h] of flames[frame] ?? []) rect(ctx, PALETTE.ember, x, y, w, h);
  rect(ctx, PALETTE.glow, 3, frame === 1 ? 3 : 2, 2, frame === 1 ? 4 : 5);
  rect(ctx, PALETTE.bone, 3, frame === 1 ? 5 : 4, 2, 2);
}
