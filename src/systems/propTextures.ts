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
export const SHRINE_SHEET_KEY = 'shrine-statue';
export const SHRINE_FRAME = 'shrine';
export const SHRINE_CELL = { width: 48, height: 64 } as const;
/** Linha do quadro em que a base da estátua encosta no chão. */
export const SHRINE_BASE_ROW = 62;

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
 * Estátua do santuário: um anjo de pedra caído, de cabeça baixa, mãos sobre a espada cravada, uma
 * asa inteira e a outra partida, a auréola quebrada ainda brilhando. Base na linha 62 do quadro.
 */
function drawShrine(ctx: Ctx): void {
  const base = SHRINE_BASE_ROW;
  const cx = 24;
  // Degrau largo e pedestal com um símbolo gravado
  fillPx(ctx, PALETTE.stoneDark, 5, base - 4, 38, 5);
  fillPx(ctx, PALETTE.stone, 6, base - 3, 36, 3);
  fillPx(ctx, PALETTE.stoneLight, 5, base - 4, 38, 1);
  fillPx(ctx, PALETTE.deep, 11, base - 1, 1, 2);
  fillPx(ctx, PALETTE.deep, 31, base - 2, 1, 3);
  fillPx(ctx, PALETTE.stoneDark, 11, base - 10, 26, 6);
  fillPx(ctx, PALETTE.stone, 12, base - 9, 24, 5);
  fillPx(ctx, PALETTE.stoneLight, 11, base - 10, 26, 1);
  fillPx(ctx, PALETTE.glow, cx - 1, base - 8, 2, 3, 0.9); // símbolo gravado
  fillPx(ctx, PALETTE.glow, cx - 3, base - 7, 6, 1, 0.6);
  const floorTop = base - 10; // topo do pedestal: onde o manto termina

  // Asas caídas atrás dos ombros: penas em colunas que crescem para fora. A da direita está partida
  for (let i = 0; i < 16; i++) {
    const top = 18 + Math.round(i * 0.7);
    const reach = Math.min(floorTop + 1, 32 + Math.round(i * 1.5));
    const bottom = reach - (i % 2) * 3; // pontas das penas em dentes
    const color = i % 3 === 1 ? PALETTE.stoneLight : PALETTE.mist;
    for (const [x, broken] of [
      [cx - 7 - i, false],
      [cx + 6 + i, true],
    ] as const) {
      if (broken && i > 11) continue; // asa partida
      const end = broken ? bottom - (i > 8 ? 6 : 0) : bottom;
      if (end <= top) continue;
      fillPx(ctx, color, x, top, 1, end - top);
      fillPx(ctx, PALETTE.bone, x, top, 1, 1); // borda de ataque clara
      fillPx(ctx, PALETTE.stone, x, end - 3, 1, 3); // ponta na sombra
      for (let y = top + 3 + (i % 3); y < end - 3; y += 5)
        fillPx(ctx, PALETTE.stoneDark, x, y, 1, 1);
    }
  }

  // Manto: ombros, tronco, barra aberta, dobras
  fillPx(ctx, PALETTE.stone, cx - 5, 20, 10, 4); // ombros
  fillPx(ctx, PALETTE.stone, cx - 4, 24, 8, 22);
  fillPx(ctx, PALETTE.stone, cx - 7, 42, 14, floorTop - 42);
  fillPx(ctx, PALETTE.stoneLight, cx - 5, 20, 1, 4);
  fillPx(ctx, PALETTE.stoneLight, cx - 4, 24, 1, 22);
  fillPx(ctx, PALETTE.stoneLight, cx - 7, 42, 1, floorTop - 42);
  fillPx(ctx, PALETTE.stoneDark, cx + 3, 24, 1, 22);
  fillPx(ctx, PALETTE.stoneDark, cx + 6, 42, 1, floorTop - 42);
  fillPx(ctx, PALETTE.stoneDark, cx - 7, floorTop - 1, 14, 1); // barra
  for (const dx of [-3, 2]) fillPx(ctx, PALETTE.stoneDark, cx + dx, 36, 1, floorTop - 38); // dobras
  fillPx(ctx, PALETTE.stoneDark, cx - 1, 40, 1, floorTop - 42);

  // Cabeça baixa com capuz
  fillPx(ctx, PALETTE.stoneLight, cx - 4, 10, 8, 10);
  fillPx(ctx, PALETTE.stone, cx + 2, 11, 2, 9);
  fillPx(ctx, PALETTE.deep, cx - 3, 14, 6, 4); // rosto na sombra
  fillPx(ctx, PALETTE.mist, cx - 2, 17, 4, 1); // queixo
  fillPx(ctx, PALETTE.stoneDark, cx - 3, 19, 6, 1);

  // Espada cravada à frente, com as mãos no punho e a guarda em cruz
  fillPx(ctx, PALETTE.bone, cx - 1, 33, 2, floorTop - 33);
  fillPx(ctx, PALETTE.mist, cx, 34, 1, floorTop - 36);
  fillPx(ctx, PALETTE.stoneLight, cx - 5, 31, 10, 2);
  fillPx(ctx, PALETTE.bone, cx - 5, 31, 10, 1);
  fillPx(ctx, PALETTE.mist, cx - 3, 26, 6, 4); // mãos
  fillPx(ctx, PALETTE.bone, cx - 3, 26, 6, 1);

  // Auréola partida (um arco com um vão) e fagulhas soltas
  for (let deg = 0; deg < 360; deg += 5) {
    if (deg > 300 && deg < 350) continue;
    const x = cx + Math.round(Math.cos((deg * Math.PI) / 180) * 9);
    const y = 6 + Math.round(Math.sin((deg * Math.PI) / 180) * 3);
    fillPx(ctx, PALETTE.glow, x, y, 1, 1);
  }
  fillPx(ctx, PALETTE.glow, cx + 8, 12, 1, 2, 0.8); // fragmento caindo
  fillPx(ctx, PALETTE.playerAccent, cx - 11, 14, 1, 1, 0.8);
  fillPx(ctx, PALETTE.playerAccent, cx + 12, 22, 1, 1, 0.7);
  fillPx(ctx, PALETTE.glow, cx - 14, 30, 1, 1, 0.7);
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
}
