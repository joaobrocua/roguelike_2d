import type Phaser from 'phaser';
import { toCssColor } from '../utils/color';

/** Um quadro de uma spritesheet desenhada em código (o `draw` recebe a origem no canto do quadro). */
export interface SheetFrame {
  name: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/** Retângulo de pixels (cor da paleta, com opacidade opcional) no canvas 2D. */
export function fillPx(
  ctx: CanvasRenderingContext2D,
  color: number,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = toCssColor(color);
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

/** Linha de pixels com pincel quadrado de `thick` px (algoritmo de Bresenham). */
export function linePx(
  ctx: CanvasRenderingContext2D,
  color: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thick = 1,
): void {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    fillPx(ctx, color, x, y, thick, thick);
    if (x === x1 && y === y1) return;
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

/**
 * Cria uma textura de quadros lado a lado a partir de funções de desenho e põe um contorno
 * de 1 px em volta de cada figura (o que dá o acabamento "pixel art"). Cada figura precisa
 * deixar 1 px de margem no quadro para o contorno caber.
 */
export function createSpriteSheet(
  scene: Phaser.Scene,
  key: string,
  cell: number,
  frames: readonly SheetFrame[],
  outlineColor: number,
  cellHeight: number = cell,
): void {
  if (scene.textures.exists(key)) return;
  const width = cell * frames.length;
  const texture = scene.textures.createCanvas(key, width, cellHeight);
  if (!texture) return;
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;

  frames.forEach((frame, index) => {
    ctx.save();
    ctx.translate(index * cell, 0);
    ctx.beginPath();
    ctx.rect(0, 0, cell, cellHeight);
    ctx.clip();
    frame.draw(ctx);
    ctx.restore();
  });

  applyOutline(ctx, width, cellHeight, cell, outlineColor);
  frames.forEach((frame, index) => texture.add(frame.name, 0, index * cell, 0, cell, cellHeight));
  texture.refresh();
}

/** Pinta de `color` todo pixel transparente que encosta (4 vizinhos) numa figura do mesmo quadro. */
function applyOutline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number,
  color: number,
): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const opaque = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return (data[(y * width + x) * 4 + 3] ?? 0) > 0;
  };
  const marks: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (opaque(x, y)) continue;
      const col = x % cell;
      const touches =
        (col > 0 && opaque(x - 1, y)) ||
        (col < cell - 1 && opaque(x + 1, y)) ||
        opaque(x, y - 1) ||
        opaque(x, y + 1);
      if (touches) marks.push((y * width + x) * 4);
    }
  }
  for (const i of marks) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
