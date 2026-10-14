import type Phaser from 'phaser';
import { PALETTE } from '../data/palette';
import { fillPx, linePx, createSpriteSheet, type SheetFrame } from './pixelSheet';

/**
 * Objetos do cenário que o jogador toca: baú, fogueira de descanso, porta do próximo bioma e a
 * estátua do santuário.
 * Pixel art em código (com contorno automático). Todos têm base apoiada no chão do bloco.
 */

export const PROP_SHEET_KEY = 'props';
export const PROP_CELL = 32;

export const PROP_FRAME = {
  chestClosed: 'chest-closed',
  chestOpen: 'chest-open',
  fireOn0: 'fire-on-0',
  fireOn1: 'fire-on-1',
  fireOut: 'fire-out',
  door: 'door',
} as const;

/** A estátua do santuário é grande demais para o quadro dos outros objetos: tem textura própria. */
export const SHRINE_SHEET_KEY = 'shrine-altar';
export const SHRINE_ORB_KEY = 'shrine-orb';
export const SHRINE_FRAME = 'shrine';
export const SHRINE_CELL = { width: 32, height: 44 } as const;
/** Linha do quadro em que a base da estátua encosta no chão. */
export const SHRINE_BASE_ROW = 42;

type Ctx = CanvasRenderingContext2D;

/** Baú de pedra e ferro. A base fica na linha 30 do quadro. */
function drawChest(ctx: Ctx, open: boolean): void {
  const x = 8;
  const y = 18;
  fillPx(ctx, PALETTE.stoneDark, x, y + 4, 16, 9); // corpo
  fillPx(ctx, PALETTE.stone, x + 1, y + 5, 14, 7);
  fillPx(ctx, PALETTE.glow, x + 7, y + 6, 2, 3); // fechadura
  fillPx(ctx, PALETTE.stoneLight, x, y + 4, 16, 1);
  fillPx(ctx, PALETTE.deep, x + 3, y + 4, 1, 9); // cintas de ferro
  fillPx(ctx, PALETTE.deep, x + 12, y + 4, 1, 9);
  if (open) {
    fillPx(ctx, PALETTE.stoneDark, x, y - 2, 16, 3); // tampa aberta para trás
    fillPx(ctx, PALETTE.stone, x + 1, y - 1, 14, 1);
    fillPx(ctx, PALETTE.glow, x + 2, y + 5, 12, 2, 0.9); // brilho de dentro
    fillPx(ctx, PALETTE.playerAccent, x + 5, y + 5, 6, 1, 0.9);
  } else {
    fillPx(ctx, PALETTE.stone, x - 1, y, 18, 5); // tampa fechada
    fillPx(ctx, PALETTE.stoneLight, x - 1, y, 18, 1);
    fillPx(ctx, PALETTE.deep, x + 3, y, 1, 5);
    fillPx(ctx, PALETTE.deep, x + 12, y, 1, 5);
  }
}

/** Fogueira de descanso: pedras em roda, lenha e chama (2 quadros) ou só brasas. */
function drawFire(ctx: Ctx, frame: 0 | 1 | 'out'): void {
  const cx = 16;
  const base = 30;
  for (const dx of [-7, -4, 3, 6]) fillPx(ctx, PALETTE.stoneLight, cx + dx, base - 2, 3, 3);
  fillPx(ctx, PALETTE.stoneDark, cx - 5, base - 2, 10, 2);
  linePx(ctx, PALETTE.deep, cx - 5, base - 1, cx + 4, base - 4, 2); // lenha cruzada
  linePx(ctx, PALETTE.stone, cx + 4, base - 1, cx - 5, base - 4, 2);
  if (frame === 'out') {
    fillPx(ctx, PALETTE.ember, cx - 2, base - 4, 2, 1, 0.6);
    fillPx(ctx, PALETTE.bloodDark, cx + 1, base - 4, 2, 1);
    return;
  }
  const tall = frame === 0 ? 0 : 2;
  fillPx(ctx, PALETTE.ember, cx - 4, base - 12 + tall, 8, 9 - tall);
  fillPx(ctx, PALETTE.ember, cx - 2, base - 15 + tall, 4, 4);
  fillPx(ctx, PALETTE.glow, cx - 3, base - 10 + tall, 6, 7 - tall);
  fillPx(ctx, PALETTE.playerAccent, cx - 1, base - 8 + tall, 2, 5 - tall);
}

/** Porta em arco para a próxima parte da fortaleza: pedra escura e uma fresta de luz fria. */
function drawDoor(ctx: Ctx): void {
  const x = 6;
  const base = 30;
  fillPx(ctx, PALETTE.stone, x, base - 26, 20, 26); // moldura
  fillPx(ctx, PALETTE.stoneLight, x, base - 26, 20, 1);
  fillPx(ctx, PALETTE.stoneLight, x, base - 26, 1, 26);
  fillPx(ctx, PALETTE.void, x + 4, base - 22, 12, 22); // vão
  fillPx(ctx, PALETTE.void, x + 6, base - 24, 8, 2);
  fillPx(ctx, PALETTE.deep, x + 4, base - 22, 12, 6);
  fillPx(ctx, PALETTE.player, x + 9, base - 20, 2, 20, 0.55); // luz fria saindo
  fillPx(ctx, PALETTE.playerAccent, x + 9.5, base - 20, 1, 20, 0.7);
  fillPx(ctx, PALETTE.stoneLight, x + 2, base - 2, 16, 2); // soleira
  fillPx(ctx, PALETTE.glow, x + 9, base - 28, 2, 2); // pingente acima do arco
}

/**
 * Altar do santuário, aos pés do anjo colossal: um bloco de pedra com um símbolo gravado e uma
 * bacia rasa no alto, onde o orbe de almas flutua. Base na linha 42 do quadro.
 */
function drawShrine(ctx: Ctx): void {
  const base = SHRINE_BASE_ROW;
  // Laje de baixo e corpo do altar
  fillPx(ctx, PALETTE.stoneDark, 3, base - 7, 26, 8);
  fillPx(ctx, PALETTE.stone, 4, base - 6, 24, 6);
  fillPx(ctx, PALETTE.stoneLight, 3, base - 7, 26, 1);
  fillPx(ctx, PALETTE.stoneDark, 6, base - 19, 20, 12);
  fillPx(ctx, PALETTE.stone, 7, base - 18, 18, 11);
  fillPx(ctx, PALETTE.stoneLight, 7, base - 18, 1, 11);
  fillPx(ctx, PALETTE.deep, 24, base - 18, 1, 11);
  // Tampo com a bacia
  fillPx(ctx, PALETTE.stoneLight, 4, base - 22, 24, 3);
  fillPx(ctx, PALETTE.bone, 4, base - 22, 24, 1);
  fillPx(ctx, PALETTE.deep, 9, base - 21, 14, 1);
  fillPx(ctx, PALETTE.soul, 10, base - 21, 12, 1, 0.55);
  // Símbolo gravado: auréola sobre uma espada
  fillPx(ctx, PALETTE.glow, 14, base - 16, 4, 1);
  fillPx(ctx, PALETTE.glow, 15, base - 14, 2, 8, 0.9);
  fillPx(ctx, PALETTE.glow, 13, base - 11, 6, 1, 0.9);
}

/** O orbe de almas que flutua sobre o altar: um núcleo claro num disco verde-alma. */
function drawOrb(ctx: Ctx): void {
  const cx = 6;
  const cy = 6;
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 5.2) continue;
      const color = d < 1.8 ? PALETTE.playerAccent : d < 3.4 ? PALETTE.soul : PALETTE.venom;
      fillPx(ctx, color, cx + dx, cy + dy, 1, 1, d > 4.4 ? 0.7 : 1);
    }
  }
}

export function createPropSheet(scene: Phaser.Scene): void {
  const frames: SheetFrame[] = [
    { name: PROP_FRAME.chestClosed, draw: (ctx) => drawChest(ctx, false) },
    { name: PROP_FRAME.chestOpen, draw: (ctx) => drawChest(ctx, true) },
    { name: PROP_FRAME.fireOn0, draw: (ctx) => drawFire(ctx, 0) },
    { name: PROP_FRAME.fireOn1, draw: (ctx) => drawFire(ctx, 1) },
    { name: PROP_FRAME.fireOut, draw: (ctx) => drawFire(ctx, 'out') },
    { name: PROP_FRAME.door, draw: drawDoor },
  ];
  createSpriteSheet(scene, PROP_SHEET_KEY, PROP_CELL, frames, PALETTE.void);
  createSpriteSheet(
    scene,
    SHRINE_SHEET_KEY,
    SHRINE_CELL.width,
    [{ name: SHRINE_FRAME, draw: drawShrine }],
    PALETTE.void,
    SHRINE_CELL.height,
  );
  createSpriteSheet(
    scene,
    SHRINE_ORB_KEY,
    12,
    [{ name: SHRINE_FRAME, draw: drawOrb }],
    PALETTE.void,
  );
}
