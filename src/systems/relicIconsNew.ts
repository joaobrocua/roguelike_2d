import type Phaser from 'phaser';
import { PALETTE } from '../data/palette';

/**
 * Ícones 16x16 das relíquias novas (lâminas, escudo, chicote, cajado e besta), desenhados em
 * código com a paleta do jogo. Mesmo estilo de `relicIcons.ts`: armas na diagonal, cabo embaixo
 * à esquerda e ponta em cima à direita, sem contorno (o sombreado vem dos tons da paleta).
 */
type Graphics = Phaser.GameObjects.Graphics;

/** Tons de couro, madeira e ferrugem (versões quentes e escuras, fora da paleta fria). */
const LEATHER = 0x7a4f2c;
const LEATHER_DARK = 0x4a2f1a;
const WOOD = 0x8a5a30;
const WOOD_DARK = 0x5a3a1e;
const RUST = 0xa4552a;
const RUST_DARK = 0x6e3418;
const STEEL_BLUE = 0x4d6a9c;

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

/** Uma espada curta apontando para cima à direita; `flip` espelha na horizontal (cruzamento). */
function drawShortSword(g: Graphics, flip: boolean): void {
  const fx = (x: number): number => (flip ? 15 - x : x);
  const seg = (x0: number, y0: number, x1: number, y1: number, color: number): void =>
    line(g, fx(x0), y0, fx(x1), y1, color);
  seg(5, 11, 14, 2, PALETTE.bone); // lâmina
  seg(4, 11, 14, 1, PALETTE.playerAccent); // fio brilhante
  dot(g, fx(14), 2, PALETTE.mist); // ponta em sombra
  seg(2, 9, 6, 13, PALETTE.glow); // guarda dourada
  seg(3, 9, 6, 12, PALETTE.ember);
  seg(3, 12, 2, 13, LEATHER_DARK); // cabo
  seg(4, 12, 2, 14, WOOD_DARK);
  dot(g, fx(1), 14, PALETTE.glow); // pomo
  dot(g, fx(1), 15, PALETTE.ember);
}

/** Lâminas Gêmeas: duas espadas curtas cruzadas em X. */
function drawTwinBlades(g: Graphics): void {
  drawShortSword(g, false);
  drawShortSword(g, true);
}

/** Linhas do escudo redondo: [x inicial, x final] por linha, a partir de y = 5. */
const SHIELD_ROWS: readonly (readonly [number, number])[] = [
  [3, 7],
  [1, 9],
  [0, 10],
  [0, 10],
  [0, 10],
  [0, 10],
  [0, 10],
  [0, 10],
  [0, 10],
  [1, 9],
  [3, 7],
];
const SHIELD_TOP = 5;

/** Espada e Escudo: escudo redondo azulado com brasão e a ponta de uma espada por trás. */
function drawSwordShield(g: Graphics): void {
  // Espada atrás do escudo (só a ponta aparece)
  line(g, 7, 7, 14, 0, PALETTE.playerAccent);
  line(g, 8, 7, 15, 0, PALETTE.bone);
  line(g, 9, 7, 15, 1, PALETTE.mist);

  // Aro claro: o escudo inteiro em osso, depois o miolo por cima
  SHIELD_ROWS.forEach(([x0, x1], i) => {
    box(g, x0, SHIELD_TOP + i, x1 - x0 + 1, 1, PALETTE.bone);
  });
  SHIELD_ROWS.forEach(([x0, x1], i) => {
    if (i === 0 || i === SHIELD_ROWS.length - 1) return; // primeira e última linhas são só aro
    box(g, x0 + 1, SHIELD_TOP + i, x1 - x0 - 1, 1, STEEL_BLUE);
  });
  // Sombra embaixo e à direita, brilho em cima à esquerda
  box(g, 9, SHIELD_TOP + 3, 1, 5, PALETTE.stoneLight);
  box(g, 3, SHIELD_TOP + 9, 5, 1, PALETTE.stoneLight);
  line(g, 2, SHIELD_TOP + 2, 4, SHIELD_TOP + 1, PALETTE.player);
  dot(g, 2, SHIELD_TOP + 3, PALETTE.player);
  // Brasão: losango vermelho com centro dourado
  dot(g, 5, 8, PALETTE.blood);
  box(g, 4, 9, 3, 1, PALETTE.blood);
  box(g, 3, 10, 5, 1, PALETTE.blood);
  box(g, 4, 11, 3, 1, PALETTE.blood);
  dot(g, 5, 12, PALETTE.bloodDark);
  dot(g, 5, 10, PALETTE.glow);
}

/** Chicote de Correntes: cabo de couro e corrente em S, elos claros e escuros, ponta de metal. */
function drawChainWhip(g: Graphics): void {
  // Cabo de couro
  line(g, 1, 15, 4, 12, LEATHER);
  line(g, 2, 15, 5, 12, LEATHER_DARK);
  dot(g, 3, 13, PALETTE.glow); // anel de metal
  dot(g, 1, 14, WOOD);
  // Corrente: sobe para a direita, volta para a esquerda e sobe de novo (S)
  const links: readonly (readonly [number, number])[] = [
    [5, 11],
    [6, 11],
    [7, 10],
    [8, 9],
    [8, 8],
    [7, 7],
    [6, 6],
    [6, 5],
    [7, 4],
    [8, 3],
    [9, 3],
    [10, 2],
  ];
  links.forEach(([x, y], i) => {
    const light = i % 2 === 0;
    dot(g, x, y, light ? PALETTE.bone : PALETTE.mist);
    dot(g, x + 1, y, light ? PALETTE.mist : PALETTE.stoneLight);
  });
  // Ponta de metal em seta, com farpas
  line(g, 11, 3, 14, 0, PALETTE.bone);
  line(g, 12, 3, 15, 0, PALETTE.mist);
  line(g, 12, 2, 13, 1, PALETTE.playerAccent);
  dot(g, 11, 2, PALETTE.bone);
  dot(g, 13, 4, PALETTE.stoneLight);
  dot(g, 14, 0, PALETTE.playerAccent);
}

/** Cajado de Brasas: haste de madeira, garra de metal e orbe laranja brilhante com faíscas. */
function drawEmberStaff(g: Graphics): void {
  // Haste de madeira
  line(g, 2, 15, 10, 7, WOOD);
  line(g, 3, 15, 11, 7, WOOD_DARK);
  box(g, 5, 12, 2, 1, PALETTE.ember); // faixas de brasa na haste
  box(g, 8, 9, 2, 1, PALETTE.ember);
  // Garra de metal
  box(g, 10, 6, 5, 1, PALETTE.mist);
  box(g, 11, 7, 1, 1, PALETTE.stoneLight);
  box(g, 9, 2, 1, 4, PALETTE.mist);
  box(g, 15, 2, 1, 4, PALETTE.mist);
  dot(g, 9, 1, PALETTE.bone);
  dot(g, 15, 1, PALETTE.bone);
  dot(g, 9, 5, PALETTE.stoneLight);
  dot(g, 15, 5, PALETTE.stoneLight);
  // Orbe de brasa
  box(g, 11, 1, 3, 1, PALETTE.ember);
  box(g, 10, 2, 5, 4, PALETTE.ember);
  box(g, 11, 2, 3, 3, PALETTE.glow);
  box(g, 11, 5, 3, 1, PALETTE.blood);
  dot(g, 10, 5, PALETTE.blood);
  dot(g, 14, 5, PALETTE.blood);
  dot(g, 12, 3, PALETTE.playerAccent);
  dot(g, 11, 2, PALETTE.playerAccent);
  // Faíscas
  dot(g, 12, 0, PALETTE.glow);
  dot(g, 7, 2, PALETTE.glow);
  dot(g, 6, 5, PALETTE.ember);
  dot(g, 14, 0, PALETTE.ember);
  dot(g, 8, 0, PALETTE.ember, 0.7);
  dot(g, 15, 7, PALETTE.ember, 0.7);
}

/** Besta Enferrujada: coronha de madeira, arco de ferro enferrujado e virote armado. */
function drawRustyCrossbow(g: Graphics): void {
  // Coronha e caixa de madeira
  box(g, 0, 8, 4, 5, WOOD);
  box(g, 0, 8, 4, 1, PALETTE.glow);
  box(g, 0, 12, 4, 1, WOOD_DARK);
  box(g, 3, 9, 9, 2, WOOD);
  box(g, 3, 10, 9, 1, WOOD_DARK);
  box(g, 6, 11, 1, 2, PALETTE.stoneLight); // gatilho
  dot(g, 7, 13, PALETTE.stoneLight);
  // Arco de ferro enferrujado, com as pontas voltadas para a frente
  for (const [x, y] of [
    [11, 5],
    [11, 6],
    [11, 7],
    [11, 8],
    [11, 9],
    [11, 10],
    [11, 11],
    [12, 4],
    [12, 12],
    [13, 3],
    [13, 13],
    [14, 2],
    [14, 14],
  ] as const) {
    dot(g, x, y, RUST);
    dot(g, x + 1, y, RUST_DARK);
  }
  for (const [x, y] of [
    [11, 6],
    [11, 9],
    [13, 3],
    [13, 13],
    [11, 11],
  ] as const) {
    dot(g, x, y, PALETTE.ember);
  }
  box(g, 11, 8, 2, 2, PALETTE.stoneLight); // braçadeira de ferro
  // Corda esticada
  line(g, 14, 2, 7, 8, PALETTE.mist);
  line(g, 14, 14, 7, 8, PALETTE.stoneLight);
  // Virote encaixado
  line(g, 6, 8, 14, 8, PALETTE.bone);
  box(g, 14, 7, 2, 3, PALETTE.bone);
  dot(g, 15, 8, PALETTE.playerAccent);
  dot(g, 6, 7, PALETTE.blood);
  dot(g, 5, 7, PALETTE.blood);
  dot(g, 5, 8, PALETTE.bloodDark);
}

export const NEW_RELIC_ICONS: Readonly<
  Record<'laminas' | 'escudo' | 'chicote' | 'cajado' | 'besta', (g: Graphics) => void>
> = {
  laminas: drawTwinBlades,
  escudo: drawSwordShield,
  chicote: drawChainWhip,
  cajado: drawEmberStaff,
  besta: drawRustyCrossbow,
};

export type NewRelicId = keyof typeof NEW_RELIC_ICONS;
