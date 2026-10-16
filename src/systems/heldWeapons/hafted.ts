import { PALETTE } from '../../data/palette';
import { line, mix, rect, type Ctx } from '../pixelCanvas';
import { darken, lighten, px, type HeldDrawer } from './kit';

/**
 * Armas de cabo (martelo, machado e mangual). A ponta fica para cima, a frente é a direita da
 * textura e não há contorno: o jogo põe 1 px escuro nos vizinhos transparentes.
 */

// Madeira escura do cabo (luz à esquerda, sombra à direita)
const WOOD = 0x5a4230;
const WOOD_HI = mix(WOOD, 0xc89458, 0.4);
const WOOD_SH = darken(WOOD, 0.35);
const WOOD_DK = darken(WOOD, 0.55);

// Couro enrolado na empunhadura
const LEATHER = 0x633b19;
const LEATHER_HI = mix(LEATHER, 0xd08a4a, 0.4);
const LEATHER_DK = darken(LEATHER, 0.42);

// Ferro escuro (faixas, pomos, correntes)
const IRON = PALETTE.stoneLight;
const IRON_HI = PALETTE.mist;
const IRON_SH = PALETTE.stone;
const IRON_DK = PALETTE.stoneDark;
const SHINE = PALETTE.bone;

// Pedra/aço claro (cabeça do martelo e lâmina do machado)
const STEEL = PALETTE.mist;
const STEEL_LT = lighten(STEEL, 0.35);
const STEEL_SH = darken(STEEL, 0.3);
const STEEL_DK = darken(STEEL, 0.55);

/** Cabo de madeira de 3 px, com veios e uma fresta clara. */
function woodHandle(ctx: Ctx, x: number, y: number, h: number): void {
  rect(ctx, WOOD, x, y, 3, h);
  rect(ctx, WOOD_HI, x, y, 1, h);
  rect(ctx, WOOD_SH, x + 2, y, 1, h);
  for (let vy = y + 2; vy < y + h - 1; vy += 4) {
    px(ctx, WOOD_DK, x + 1, vy);
    px(ctx, WOOD_DK, x + 1, vy + 1);
    px(ctx, WOOD_HI, x + 2, vy + 2 < y + h ? vy + 2 : vy);
  }
}

/** Faixa de ferro: luz em cima, sombra embaixo e o tom base no meio (faixa de 1 px: só um brilho). */
function ironBand(ctx: Ctx, x: number, y: number, w: number, h = 2): void {
  rect(ctx, IRON, x, y, w, h);
  if (h > 1) {
    rect(ctx, IRON_HI, x, y, w, 1);
    rect(ctx, IRON_DK, x, y + h - 1, w, 1);
  } else {
    px(ctx, IRON_DK, x + w - 1, y);
  }
  px(ctx, SHINE, x, y);
}

/** Tira de couro enrolada em diagonal sobre o cabo. */
function leatherWrap(ctx: Ctx, x: number, y: number, h: number): void {
  rect(ctx, LEATHER, x, y, 3, h);
  rect(ctx, LEATHER_HI, x, y, 1, h);
  for (let ly = y; ly + 2 < y + h; ly += 3) {
    line(ctx, LEATHER_DK, x, ly + 2, x + 2, ly);
  }
  rect(ctx, LEATHER_DK, x + 2, y + h - 1, 1, 1);
}

/**
 * Martelo (14x34): cabeça de pedra rachada presa por uma faixa de ferro com dois rebites, cabo
 * escuro com duas faixas, couro perto da base e pomo de ferro.
 */
export const drawMartelo: HeldDrawer = (ctx) => {
  // Cabo
  woodHandle(ctx, 6, 10, 22);
  ironBand(ctx, 5, 10, 5, 2); // colar sob a cabeça
  ironBand(ctx, 5, 15, 5, 2);
  ironBand(ctx, 5, 21, 5, 2);
  leatherWrap(ctx, 6, 25, 6);
  // Pomo de ferro
  rect(ctx, IRON, 5, 31, 5, 1);
  rect(ctx, IRON_SH, 6, 32, 3, 1);
  rect(ctx, IRON_HI, 5, 31, 2, 1);
  px(ctx, SHINE, 5, 31);
  px(ctx, IRON_DK, 9, 31);

  // Cabeça de pedra: luz em cima e à esquerda, sombra embaixo e à direita
  rect(ctx, STEEL, 1, 1, 12, 9);
  rect(ctx, STEEL_SH, 11, 3, 1, 5);
  rect(ctx, STEEL_SH, 2, 8, 10, 1);
  rect(ctx, STEEL_DK, 1, 9, 12, 1);
  rect(ctx, STEEL_DK, 12, 2, 1, 7);
  rect(ctx, STEEL_LT, 1, 2, 1, 7);
  rect(ctx, STEEL_LT, 2, 2, 10, 1);
  rect(ctx, SHINE, 1, 1, 11, 1);
  px(ctx, STEEL_DK, 12, 1);
  // Rachaduras (uma de cada lado da faixa)
  line(ctx, STEEL_DK, 3, 3, 3, 5);
  line(ctx, STEEL_DK, 3, 5, 2, 7);
  px(ctx, STEEL_LT, 4, 4);
  line(ctx, STEEL_DK, 10, 3, 10, 5);
  line(ctx, STEEL_DK, 10, 5, 11, 7);
  px(ctx, STEEL_LT, 9, 4);
  // Faixa de ferro no meio da cabeça, com rebites
  rect(ctx, IRON, 5, 1, 5, 9);
  rect(ctx, IRON_HI, 5, 1, 1, 9);
  rect(ctx, IRON_SH, 9, 2, 1, 8);
  rect(ctx, IRON_HI, 5, 1, 5, 1);
  rect(ctx, IRON_DK, 5, 9, 5, 1);
  px(ctx, SHINE, 7, 3);
  px(ctx, IRON_DK, 8, 4);
  px(ctx, SHINE, 7, 7);
  px(ctx, IRON_DK, 8, 8);
};

/**
 * Machado (15x34): cabo com veios e couro, lâmina larga de um gume curvada para a direita, com
 * fio claro, entalhes e rebites, contra-ponta pequena atrás e ponteira de ferro.
 */
export const drawMachado: HeldDrawer = (ctx) => {
  // Cabo
  woodHandle(ctx, 4, 3, 28);
  leatherWrap(ctx, 4, 15, 3);
  leatherWrap(ctx, 4, 22, 8);
  ironBand(ctx, 4, 29, 3, 2);
  // Ponteira de ferro
  rect(ctx, IRON, 4, 31, 3, 1);
  rect(ctx, IRON_HI, 4, 31, 1, 1);
  rect(ctx, IRON_SH, 5, 32, 1, 1);
  px(ctx, IRON_DK, 6, 31);

  // Pontinha de ferro acima do soquete
  px(ctx, IRON_HI, 5, 1);
  px(ctx, IRON, 5, 2);
  // Contra-ponta (atrás do cabo, do lado esquerdo)
  rect(ctx, STEEL, 3, 5, 1, 1);
  rect(ctx, STEEL, 2, 6, 2, 1);
  rect(ctx, STEEL, 1, 7, 3, 2);
  rect(ctx, STEEL, 2, 9, 2, 1);
  rect(ctx, STEEL, 3, 10, 1, 1);
  rect(ctx, STEEL_LT, 3, 5, 1, 1);
  rect(ctx, STEEL_LT, 2, 6, 2, 1);
  px(ctx, SHINE, 1, 7);
  rect(ctx, STEEL_SH, 2, 9, 2, 1);
  px(ctx, STEEL_DK, 3, 10);
  px(ctx, STEEL_SH, 2, 8);

  // Lâmina: cada linha é [y, xInicial, xFinal]; a borda direita é o gume
  const blade: ReadonlyArray<readonly [number, number, number]> = [
    [2, 9, 11],
    [3, 7, 12],
    [4, 6, 13],
    [5, 6, 13],
    [6, 6, 13],
    [7, 6, 13],
    [8, 6, 13],
    [9, 6, 13],
    [10, 6, 13],
    [11, 6, 12],
    [12, 7, 11],
    [13, 8, 10],
  ];
  for (const [y, x0, x1] of blade) rect(ctx, STEEL, x0, y, x1 - x0 + 1, 1);
  // Soquete de ferro que abraça o cabo
  rect(ctx, IRON, 4, 4, 3, 9);
  rect(ctx, IRON_HI, 4, 4, 1, 9);
  rect(ctx, IRON_SH, 6, 5, 1, 7);
  rect(ctx, IRON_HI, 4, 4, 3, 1);
  rect(ctx, IRON_DK, 4, 12, 3, 1);
  // Luz na borda de cima, sombra na de baixo
  rect(ctx, STEEL_LT, 7, 3, 5, 1);
  rect(ctx, SHINE, 9, 2, 3, 1);
  rect(ctx, STEEL_LT, 7, 4, 6, 1);
  rect(ctx, STEEL_SH, 7, 11, 5, 1);
  rect(ctx, STEEL_SH, 7, 12, 5, 1);
  rect(ctx, STEEL_DK, 8, 13, 3, 1);
  // Gume claro, acompanhando a curva
  px(ctx, SHINE, 11, 2);
  px(ctx, SHINE, 12, 3);
  rect(ctx, PALETTE.playerAccent, 13, 4, 1, 7);
  px(ctx, SHINE, 12, 11);
  px(ctx, SHINE, 11, 12);
  px(ctx, SHINE, 10, 13);
  // Biselado logo atrás do gume e sulco no meio da lâmina
  rect(ctx, STEEL_LT, 12, 5, 1, 5);
  rect(ctx, STEEL_SH, 9, 5, 1, 5);
  rect(ctx, STEEL_SH, 7, 5, 1, 6);
  // Entalhes no fio (pixels vazios) e rebites
  rect(ctx, STEEL_DK, 12, 6, 1, 1);
  px(ctx, STEEL_DK, 12, 9);
  px(ctx, SHINE, 8, 5);
  px(ctx, IRON_DK, 8, 6);
  px(ctx, SHINE, 8, 10);
  px(ctx, IRON_DK, 8, 11);
};

/**
 * Mangual (12x36): cabo curto com faixas de ferro e pomo, corrente de elos claros e escuros em
 * zigue-zague e bola de ferro com seis espinhos.
 */
export const drawMangual: HeldDrawer = (ctx) => {
  // Cabo
  woodHandle(ctx, 4, 26, 7);
  ironBand(ctx, 3, 24, 5, 2); // cabeçote onde a corrente prende
  ironBand(ctx, 3, 27, 5, 1);
  ironBand(ctx, 3, 31, 5, 1);
  // Pomo
  rect(ctx, IRON, 3, 33, 5, 1);
  rect(ctx, IRON_HI, 3, 33, 2, 1);
  rect(ctx, IRON_SH, 4, 34, 3, 1);
  px(ctx, SHINE, 3, 33);
  px(ctx, IRON_DK, 7, 33);

  // Corrente: elos de 2 px de altura que alternam claro e escuro e balançam 1 px de lado a lado
  const chainLight = IRON_HI;
  const chainDark = darken(IRON, 0.25);
  for (let k = 0; k < 7; k++) {
    const x = k % 2 === 0 ? 6 : 5;
    const y = 10 + k * 2;
    px(ctx, k % 2 === 0 ? chainLight : chainDark, x, y);
    px(ctx, k % 2 === 0 ? IRON : IRON_DK, x, y + 1);
  }

  // Bola de ferro: luz em cima à esquerda, sombra embaixo à direita
  const rows: ReadonlyArray<readonly [number, number, number]> = [
    [3, 5, 3],
    [4, 4, 5],
    [5, 3, 7],
    [6, 3, 7],
    [7, 3, 7],
    [8, 4, 5],
    [9, 5, 3],
  ];
  for (const [y, x, w] of rows) rect(ctx, IRON, x, y, w, 1);
  rect(ctx, IRON_HI, 5, 3, 2, 1);
  rect(ctx, IRON_HI, 4, 4, 2, 1);
  rect(ctx, IRON_HI, 3, 5, 2, 2);
  px(ctx, SHINE, 5, 4);
  px(ctx, SHINE, 4, 5);
  px(ctx, IRON_SH, 6, 6); // calombo central
  rect(ctx, IRON_SH, 8, 7, 2, 1);
  rect(ctx, IRON_SH, 7, 8, 2, 1);
  rect(ctx, IRON_DK, 7, 9, 1, 1);
  rect(ctx, IRON_DK, 9, 6, 1, 2);
  rect(ctx, IRON_DK, 8, 8, 1, 1);
  px(ctx, IRON_SH, 9, 5);
  // Seis espinhos: um em cada lado e dois em cada diagonal (ponta clara se voltada para a luz)
  px(ctx, IRON_HI, 2, 6);
  px(ctx, IRON_SH, 10, 6);
  px(ctx, IRON_HI, 3, 3);
  px(ctx, SHINE, 2, 2);
  px(ctx, IRON_HI, 9, 3);
  px(ctx, IRON_HI, 10, 2);
  px(ctx, IRON_SH, 3, 9);
  px(ctx, IRON_HI, 2, 10);
  px(ctx, IRON_DK, 9, 9);
  px(ctx, IRON_SH, 10, 10);
};
