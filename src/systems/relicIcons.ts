import Phaser from 'phaser';
import { relicIconKey, type RelicId } from '../data/relics';
import { PALETTE } from '../data/palette';

/**
 * Ícones 16x16 das relíquias, desenhados em código com a paleta do jogo (uma textura por
 * relíquia). Aparecem na HUD e na tela de escolha; a arte final pode substituí-los
 * carregando imagens com as mesmas chaves.
 */
export const ICON_SIZE = 16;

/** Tons de roxo do tomo (versões escuras do roxo da paleta). */
const TOME_COVER = 0x3d2a66;
const TOME_SHADE = 0x241a40;

type Graphics = Phaser.GameObjects.Graphics;

function dot(g: Graphics, x: number, y: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillRect(x, y, 1, 1);
}

function box(g: Graphics, x: number, y: number, w: number, h: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
}

/** Linha de 1 px (algoritmo de Bresenham). */
function line(g: Graphics, x0: number, y0: number, x1: number, y1: number, color: number): void {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    dot(g, x, y, color);
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

/** Espada: lâmina diagonal clara, guarda dourada e cabo escuro. */
function drawBlade(g: Graphics): void {
  line(g, 6, 9, 14, 1, PALETTE.bone);
  line(g, 7, 9, 15, 2, PALETTE.mist);
  dot(g, 15, 1, PALETTE.playerAccent);
  line(g, 3, 8, 8, 13, PALETTE.glow);
  line(g, 4, 8, 8, 12, PALETTE.ember);
  line(g, 4, 11, 1, 14, PALETTE.stoneLight);
  line(g, 5, 11, 2, 14, PALETTE.stone);
  box(g, 0, 14, 2, 2, PALETTE.glow);
}

/** Martelo: cabeça de pedra pesada e cabo de madeira escura. */
function drawHammer(g: Graphics): void {
  line(g, 2, 15, 10, 7, PALETTE.stoneLight);
  line(g, 3, 15, 11, 7, PALETTE.stone);
  box(g, 7, 1, 8, 6, PALETTE.bone);
  box(g, 7, 5, 8, 2, PALETTE.mist);
  box(g, 7, 1, 8, 1, PALETTE.playerAccent);
  box(g, 7, 1, 1, 6, PALETTE.mist);
  dot(g, 10, 3, PALETTE.stoneLight);
  dot(g, 12, 3, PALETTE.stoneLight);
  line(g, 3, 13, 5, 11, PALETTE.ember); // faixa de metal no cabo
}

/** Foice: cabo longo e lâmina curva em crescente. */
function drawScythe(g: Graphics): void {
  line(g, 2, 15, 11, 5, PALETTE.stoneLight);
  line(g, 3, 15, 12, 5, PALETTE.stone);
  for (const [x, y] of [
    [11, 4],
    [12, 3],
    [13, 2],
    [14, 2],
    [15, 3],
    [15, 4],
    [14, 6],
  ] as const) {
    dot(g, x, y, PALETTE.bone);
  }
  for (const [x, y] of [
    [12, 4],
    [13, 3],
    [14, 3],
    [14, 4],
    [14, 5],
  ] as const) {
    dot(g, x, y, PALETTE.mist);
  }
  dot(g, 15, 5, PALETTE.playerAccent);
}

/** Tomo: livro de capa roxa com runa brilhante e páginas claras. */
function drawTome(g: Graphics): void {
  box(g, 2, 2, 11, 13, TOME_COVER);
  box(g, 2, 2, 11, 1, PALETTE.wraith);
  box(g, 2, 14, 11, 1, TOME_SHADE);
  box(g, 2, 2, 1, 13, PALETTE.wraith);
  box(g, 13, 3, 2, 11, PALETTE.bone);
  for (let y = 4; y < 14; y += 2) box(g, 13, y, 2, 1, PALETTE.mist);
  // Runa: losango com ponto
  dot(g, 7, 5, PALETTE.glow);
  box(g, 6, 6, 3, 1, PALETTE.glow);
  box(g, 5, 7, 5, 2, PALETTE.glow);
  box(g, 6, 9, 3, 1, PALETTE.glow);
  dot(g, 7, 10, PALETTE.glow);
  dot(g, 7, 7, PALETTE.playerAccent);
  box(g, 11, 7, 2, 3, PALETTE.glow); // fecho
}

/** Adaga: lâmina curta e larga, cabo roxo e pomo verde (bem menor que a espada). */
function drawDagger(g: Graphics): void {
  line(g, 8, 8, 13, 3, PALETTE.bone);
  line(g, 7, 8, 12, 3, PALETTE.mist);
  line(g, 9, 8, 14, 3, PALETTE.mist);
  line(g, 9, 7, 13, 3, PALETTE.playerAccent);
  dot(g, 14, 2, PALETTE.playerAccent);
  line(g, 5, 8, 8, 11, PALETTE.stoneLight); // guarda
  line(g, 6, 8, 9, 11, PALETTE.stone);
  line(g, 6, 10, 3, 13, PALETTE.wraith); // cabo
  line(g, 7, 10, 4, 13, PALETTE.wraith);
  box(g, 1, 13, 2, 2, PALETTE.soul);
}

/** Lança: haste longa e ponta em losango, com uma fita vermelha. */
function drawSpear(g: Graphics): void {
  line(g, 1, 15, 11, 5, PALETTE.stoneLight);
  line(g, 2, 15, 12, 5, PALETTE.stone);
  line(g, 12, 4, 15, 0, PALETTE.bone);
  line(g, 11, 4, 14, 0, PALETTE.mist);
  line(g, 13, 5, 15, 1, PALETTE.mist);
  box(g, 11, 4, 3, 2, PALETTE.bone);
  dot(g, 15, 0, PALETTE.playerAccent);
  line(g, 7, 9, 5, 12, PALETTE.blood); // fita
  dot(g, 6, 12, PALETTE.bloodDark);
}

/** Machado: cabo comprido e lâmina larga em meia-lua, com fio claro. */
function drawAxe(g: Graphics): void {
  line(g, 2, 15, 10, 5, PALETTE.stoneLight);
  line(g, 3, 15, 11, 5, PALETTE.stone);
  box(g, 8, 0, 5, 1, PALETTE.mist);
  box(g, 7, 1, 8, 1, PALETTE.mist);
  box(g, 6, 2, 10, 4, PALETTE.mist);
  box(g, 7, 6, 8, 1, PALETTE.mist);
  box(g, 8, 7, 5, 1, PALETTE.stoneLight);
  box(g, 6, 2, 10, 1, PALETTE.bone);
  box(g, 15, 1, 1, 6, PALETTE.playerAccent); // fio
  dot(g, 14, 0, PALETTE.bone);
  box(g, 6, 3, 2, 3, PALETTE.stoneLight);
  dot(g, 9, 4, PALETTE.stoneLight);
  dot(g, 11, 4, PALETTE.stoneLight);
}

/** Arco de osso: curva clara com a corda esticada e uma flecha armada. */
function drawBow(g: Graphics): void {
  for (const [x, y] of [
    [10, 0],
    [8, 1],
    [6, 2],
    [5, 3],
    [4, 5],
    [3, 7],
    [3, 8],
    [4, 10],
    [5, 12],
    [6, 13],
    [8, 14],
    [10, 15],
  ] as const) {
    dot(g, x, y, PALETTE.bone);
    dot(g, x + 1, y, PALETTE.mist);
  }
  line(g, 10, 1, 10, 14, PALETTE.stoneLight); // corda
  line(g, 10, 7, 15, 7, PALETTE.mist); // flecha
  line(g, 10, 8, 15, 8, PALETTE.stoneLight);
  dot(g, 15, 7, PALETTE.playerAccent);
  dot(g, 14, 6, PALETTE.bone);
  dot(g, 14, 9, PALETTE.bone);
}

/** Mangual: cabo curto, corrente e bola de pedra com espinhos. */
function drawFlail(g: Graphics): void {
  line(g, 1, 15, 6, 10, PALETTE.stoneLight);
  line(g, 2, 15, 7, 10, PALETTE.stone);
  for (const [x, y, color] of [
    [7, 9, PALETTE.mist],
    [8, 8, PALETTE.stoneLight],
    [9, 7, PALETTE.mist],
    [10, 6, PALETTE.stoneLight],
  ] as const) {
    dot(g, x, y, color);
  }
  box(g, 11, 1, 4, 5, PALETTE.stoneLight);
  box(g, 11, 1, 4, 1, PALETTE.mist);
  box(g, 11, 1, 1, 5, PALETTE.mist);
  box(g, 14, 2, 1, 4, PALETTE.stone);
  for (const [x, y] of [
    [10, 2],
    [10, 4],
    [15, 2],
    [15, 4],
    [12, 0],
    [13, 6],
    [12, 6],
  ] as const) {
    dot(g, x, y, PALETTE.bone);
  }
}

const DRAWERS: Readonly<Record<RelicId, (g: Graphics) => void>> = {
  lamina: drawBlade,
  martelo: drawHammer,
  foice: drawScythe,
  tomo: drawTome,
  adaga: drawDagger,
  lanca: drawSpear,
  machado: drawAxe,
  arco: drawBow,
  mangual: drawFlail,
};

export function createRelicIcons(scene: Phaser.Scene): void {
  for (const id of Object.keys(DRAWERS) as RelicId[]) {
    const key = relicIconKey(id);
    if (scene.textures.exists(key)) continue;
    const g = scene.add.graphics();
    DRAWERS[id](g);
    g.generateTexture(key, ICON_SIZE, ICON_SIZE);
    g.destroy();
  }
}
