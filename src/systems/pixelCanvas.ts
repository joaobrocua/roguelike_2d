import type Phaser from 'phaser';
import { toCssColor } from '../utils/color';

/**
 * Ferramentas para desenhar pixel art de cenário num canvas 2D: retângulos, discos e linhas sem
 * serrilhado suave, gradientes com "dithering" (o padrão quadriculado dos jogos de 16 bits) e
 * texturas criadas direto no Phaser. Tudo em pixels inteiros.
 */
export type Ctx = CanvasRenderingContext2D;

/** Matriz de Bayer 4x4 (valores de 0 a 15) usada no dithering ordenado. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** Limiar de Bayer (0..1) na posição (x, y). */
export function bayer(x: number, y: number): number {
  const row = BAYER[y & 3];
  return ((row?.[x & 3] ?? 0) + 0.5) / 16;
}

/** Ruído repetível de 0 a 1 para um par de inteiros (sem Math.random: a arte sempre sai igual). */
export function noise2(x: number, y: number): number {
  let h = Math.imul(Math.floor(x) + 1, 374761393) ^ Math.imul(Math.floor(y) + 7, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Retângulo de pixels (com opacidade opcional). */
export function rect(
  ctx: Ctx,
  color: number,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
): void {
  if (w <= 0 || h <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = toCssColor(color);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
}

/** Disco de pixels, linha a linha (borda dura, sem suavização). */
export function disc(ctx: Ctx, color: number, cx: number, cy: number, r: number, alpha = 1): void {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    rect(ctx, color, cx - half, cy + dy, half * 2 + 1, 1, alpha);
  }
}

/** Linha de 1 px (Bresenham). */
export function line(
  ctx: Ctx,
  color: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  alpha = 1,
): void {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    rect(ctx, color, x, y, 1, 1, alpha);
    if (x === tx && y === ty) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function channel(color: number, shift: number): number {
  return (color >> shift) & 0xff;
}

/** Mistura duas cores (t de 0 a 1). */
export function mix(a: number, b: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  const r = Math.round(channel(a, 16) * (1 - k) + channel(b, 16) * k);
  const g = Math.round(channel(a, 8) * (1 - k) + channel(b, 8) * k);
  const bl = Math.round(channel(a, 0) * (1 - k) + channel(b, 0) * k);
  return (r << 16) | (g << 8) | bl;
}

/**
 * Gradiente vertical entre várias cores, com dithering ordenado: nas faixas de transição os dois
 * tons se alternam em xadrez, como na pixel art clássica.
 */
export function ditherGradientV(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: readonly number[],
): void {
  if (colors.length < 2 || w <= 0 || h <= 0) return;
  const image = ctx.getImageData(x, y, w, h);
  const data = image.data;
  const segments = colors.length - 1;
  for (let row = 0; row < h; row++) {
    const t = h > 1 ? (row / (h - 1)) * segments : 0;
    const index = Math.min(segments - 1, Math.floor(t));
    const local = t - index;
    const from = colors[index] ?? 0;
    const to = colors[index + 1] ?? from;
    for (let col = 0; col < w; col++) {
      const color = local > bayer(col + x, row + y) ? to : from;
      const i = (row * w + col) * 4;
      data[i] = channel(color, 16);
      data[i + 1] = channel(color, 8);
      data[i + 2] = channel(color, 0);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, x, y);
}

/** Torna opaco ou transparente cada pixel (tira o serrilhado macio de formas desenhadas). */
export function hardenAlpha(ctx: Ctx, w: number, h: number, threshold = 110): void {
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;
  for (let i = 3; i < data.length; i += 4) {
    data[i] = (data[i] ?? 0) >= threshold ? 255 : 0;
  }
  ctx.putImageData(image, 0, 0);
}

/** Cria uma textura de canvas no Phaser (se ainda não existir) e a desenha com `draw`. */
export function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: Ctx) => void,
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  texture.refresh();
}
