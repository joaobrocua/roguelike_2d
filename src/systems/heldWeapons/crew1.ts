import { PALETTE } from '../../data/palette';
import { line, mix, rect, type Ctx } from '../pixelCanvas';
import { darken, lighten, px, type HeldDrawer } from './kit';

/** Pinta uma sequência de pixels lado a lado na linha `y`, a partir de `x`, uma cor por pixel. */
function span(ctx: Ctx, y: number, x: number, colors: readonly number[]): void {
  colors.forEach((color, i) => px(ctx, color, x + i, y));
}

/**
 * Lâmina de duelo (9x26, ponta para cima, empunhadura em (4,21)), usada nas duas mãos: lâmina curta
 * de aço claro que se curva para a frente, com fio brilhante à esquerda, sulco, guarda pequena de
 * ferro escuro com um rubi, cabo de couro enrolado e pomo.
 */
export const drawLaminas: HeldDrawer = (ctx) => {
  // Aço claro: do fio brilhante à sombra
  const steelHi = PALETTE.playerAccent;
  const steelLight = PALETTE.bone;
  const steelBase = mix(PALETTE.bone, PALETTE.mist, 0.35);
  const steelShade = PALETTE.mist;
  const fuller = darken(PALETTE.mist, 0.3);
  // Ferro escuro da guarda e do pomo
  const metalHi = mix(PALETTE.stoneLight, PALETTE.mist, 0.55);
  const metalBase = PALETTE.stoneLight;
  const metalDeep = PALETTE.stone;
  // Rubi da guarda
  const ruby = PALETTE.blood;
  const rubyDeep = PALETTE.bloodDark;
  // Couro do cabo
  const leather = 0x6e4426;
  const leatherHi = lighten(leather, 0.25);
  const leatherShade = darken(leather, 0.45);

  // Lâmina (y1..17): a ponta entra em x6 e a base fica em x3, o que dá a curva suave
  px(ctx, steelHi, 6, 1);
  span(ctx, 2, 5, [steelHi, steelShade]);
  span(ctx, 3, 5, [steelHi, steelShade]);
  span(ctx, 4, 5, [steelLight, steelShade]);
  span(ctx, 5, 4, [steelHi, steelBase, steelShade]);
  // Trecho de cima (x4..6): sulco do meio
  for (let y = 6; y <= 9; y++) {
    span(ctx, y, 4, [steelHi, y === 8 ? steelBase : fuller, steelShade]);
  }
  // Degrau da curva
  span(ctx, 10, 3, [steelHi, steelBase, steelShade]);
  span(ctx, 11, 3, [steelLight, steelBase, steelShade]);
  // Trecho de baixo (x3..5): sulco do meio
  for (let y = 12; y <= 16; y++) {
    span(ctx, y, 3, [steelHi, y === 14 ? steelBase : fuller, steelShade]);
  }
  span(ctx, 17, 3, [steelLight, steelShade, steelShade]); // base da lâmina, junto à guarda

  // Guarda curta (y18) com as pontas caídas e o rubi no centro
  rect(ctx, metalBase, 1, 18, 7, 1);
  rect(ctx, metalHi, 1, 18, 3, 1);
  rect(ctx, metalDeep, 6, 18, 2, 1);
  px(ctx, ruby, 4, 18);
  px(ctx, rubyDeep, 5, 18);
  px(ctx, metalHi, 1, 19);
  px(ctx, metalDeep, 7, 19);

  // Cabo de couro enrolado (y19..22)
  rect(ctx, leather, 3, 19, 3, 4);
  rect(ctx, leatherHi, 3, 19, 1, 4);
  rect(ctx, leatherShade, 5, 19, 1, 4);
  // Enrolado: o miolo alterna entre sombra e luz a cada volta da tira
  px(ctx, leatherShade, 4, 19);
  px(ctx, leatherShade, 4, 21);
  px(ctx, lighten(leather, 0.12), 4, 20);
  px(ctx, lighten(leather, 0.12), 4, 22);
  px(ctx, leatherHi, 3, 20);
  px(ctx, leatherHi, 3, 22);

  // Pomo pequeno de ferro
  rect(ctx, metalBase, 3, 23, 3, 2);
  px(ctx, metalHi, 3, 23);
  px(ctx, metalHi, 4, 23);
  px(ctx, metalDeep, 5, 24);
  px(ctx, metalDeep, 4, 24);
};

/**
 * Espada de soldado do conjunto Espada e Escudo (11x30, ponta para cima, empunhadura em (5,24)):
 * lâmina larga e reta de aço azulado com fio claro à esquerda e um brasão entalhado, guarda reta de
 * ferro escuro, cabo de couro e pomo redondo de ferro.
 */
export const drawEscudoEspada: HeldDrawer = (ctx) => {
  // Aço azulado: do fio claro à sombra
  const steelHi = PALETTE.playerAccent;
  const steelLight = lighten(PALETTE.mist, 0.5);
  const steelBase = mix(PALETTE.mist, PALETTE.player, 0.12);
  const steelMid = darken(PALETTE.mist, 0.15);
  const steelShade = darken(PALETTE.mist, 0.4);
  const crest = darken(PALETTE.mist, 0.6);
  // Ferro escuro da guarda e do pomo
  const ironHi = mix(PALETTE.stoneLight, PALETTE.mist, 0.5);
  const ironLight = PALETTE.stoneLight;
  const ironBase = PALETTE.stone;
  const ironDeep = PALETTE.stoneDark;
  // Couro do cabo
  const leather = 0x6b4a2e;
  const leatherHi = lighten(leather, 0.25);
  const leatherShade = darken(leather, 0.45);

  // Ponta (y1..2) e corpo da lâmina (y3..17), 5 px de largura: fio claro à esquerda, sombra à direita
  px(ctx, steelLight, 5, 1);
  span(ctx, 2, 4, [steelHi, steelBase, steelShade]);
  for (let y = 3; y <= 17; y++) {
    span(ctx, y, 3, [steelHi, steelLight, steelBase, steelMid, steelShade]);
  }
  // Brilho do fio e arranhões do uso
  px(ctx, steelHi, 4, 5);
  px(ctx, steelHi, 4, 14);
  px(ctx, steelShade, 7, 13); // lasca no fio
  px(ctx, steelMid, 3, 15);
  px(ctx, steelShade, 6, 16);
  // Brasão entalhado: um escudinho escuro com o miolo claro
  rect(ctx, crest, 4, 8, 3, 1);
  rect(ctx, crest, 4, 9, 1, 2);
  rect(ctx, crest, 6, 9, 1, 2);
  px(ctx, steelLight, 5, 9);
  px(ctx, steelBase, 5, 10);
  px(ctx, crest, 5, 11);

  // Base da lâmina (y18) e guarda reta (y19..20)
  rect(ctx, steelShade, 4, 18, 3, 1);
  px(ctx, steelMid, 4, 18);
  rect(ctx, ironLight, 1, 19, 9, 1);
  rect(ctx, ironHi, 1, 19, 3, 1);
  rect(ctx, ironBase, 7, 19, 3, 1);
  rect(ctx, ironBase, 1, 20, 9, 1);
  rect(ctx, ironDeep, 6, 20, 4, 1);
  px(ctx, ironLight, 1, 20);
  px(ctx, ironHi, 5, 19); // rebite

  // Cabo de couro (y21..26) com faixas de enrolado
  rect(ctx, leather, 4, 21, 3, 6);
  rect(ctx, leatherHi, 4, 21, 1, 6);
  rect(ctx, leatherShade, 6, 21, 1, 6);
  // Enrolado: o miolo alterna entre sombra e luz a cada volta da tira
  for (const y of [21, 23, 25]) px(ctx, leatherShade, 5, y);
  for (const y of [22, 24, 26]) px(ctx, lighten(leather, 0.12), 5, y);
  px(ctx, leatherHi, 4, 22);
  px(ctx, leatherHi, 4, 24);
  px(ctx, leatherHi, 4, 26);

  // Pomo redondo de ferro (y27..28)
  rect(ctx, ironLight, 3, 27, 5, 1);
  rect(ctx, ironLight, 4, 28, 3, 1);
  px(ctx, ironHi, 3, 27);
  px(ctx, ironHi, 4, 27);
  px(ctx, ironBase, 7, 27);
  px(ctx, ironBase, 6, 28);
  px(ctx, ironDeep, 5, 28);
};

/** Faixa de cada linha do escudo (y1..y18): [x inicial, x final], larga em cima e em ponta embaixo. */
const SHIELD_ROWS: ReadonlyArray<readonly [number, number]> = [
  [2, 13],
  [1, 14],
  [1, 14],
  [1, 14],
  [1, 14],
  [1, 14],
  [1, 14],
  [1, 14],
  [1, 14],
  [2, 13],
  [2, 13],
  [3, 12],
  [3, 12],
  [4, 11],
  [4, 11],
  [5, 10],
  [6, 9],
  [7, 8],
];

/**
 * Escudo do conjunto Espada e Escudo (16x20, visto de frente, empunhadura no centro (8,10)):
 * brasão de tábuas verticais de madeira com aro de ferro rebitado, listra vermelha desbotada,
 * umbo de metal brilhante no meio e as marcas de batalha.
 */
export const drawEscudo: HeldDrawer = (ctx) => {
  // Madeira em três tons, mais as frestas entre as tábuas
  const wood = 0x8a5a34;
  const woodLight = lighten(wood, 0.22);
  const woodShade = darken(wood, 0.3);
  const woodDeep = darken(wood, 0.58);
  // Ferro do aro
  const rimHi = mix(PALETTE.stoneLight, PALETTE.mist, 0.65);
  const rimLeft = mix(PALETTE.stoneLight, PALETTE.mist, 0.3);
  const rimRight = darken(PALETTE.stoneLight, 0.3);
  const rimBottom = PALETTE.stoneDark;
  const rivetHi = lighten(PALETTE.mist, 0.55);
  const rivetShade = PALETTE.mist;
  // Listra de tinta vermelha desbotada
  const paint = mix(PALETTE.blood, wood, 0.45);
  const paintHi = lighten(paint, 0.18);
  const paintShade = darken(paint, 0.3);
  // Umbo de metal brilhante
  const bossHi = PALETTE.playerAccent;
  const bossLight = lighten(PALETTE.mist, 0.5);
  const bossBase = mix(PALETTE.mist, PALETTE.bone, 0.3);
  const bossShade = PALETTE.mist;
  const bossDeep = PALETTE.stoneLight;

  // Cor da madeira por coluna: tábuas de x2..4, x6..9 e x11..13, com frestas em x5 e x10
  const woodAt = (x: number): number => {
    if (x === 5 || x === 10) return woodDeep;
    if (x === 2 || x === 6 || x === 11) return woodLight;
    if (x === 4 || x === 9 || x === 13) return woodShade;
    return wood;
  };

  SHIELD_ROWS.forEach(([x0, x1], i) => {
    const y = i + 1;
    if (y === 1) {
      rect(ctx, rimHi, x0, y, x1 - x0 + 1, 1);
      return;
    }
    if (y === SHIELD_ROWS.length) {
      rect(ctx, rimBottom, x0, y, x1 - x0 + 1, 1);
      return;
    }
    // Aro: mais claro à esquerda, escuro à direita; as tábuas ocupam o miolo
    px(ctx, y < 10 ? rimHi : rimLeft, x0, y);
    px(ctx, y < 10 ? rimRight : rimBottom, x1, y);
    for (let x = x0 + 1; x < x1; x++) px(ctx, woodAt(x), x, y);
  });

  // Veios da madeira
  px(ctx, woodShade, 3, 6);
  px(ctx, woodShade, 8, 15);
  px(ctx, woodLight, 12, 9);
  px(ctx, woodLight, 7, 4);
  px(ctx, woodShade, 12, 13);
  px(ctx, woodDeep, 3, 12);
  px(ctx, woodDeep, 9, 14);

  // Listra vermelha vertical, comida pelo tempo (alguns pixels voltam a ser madeira)
  for (let y = 2; y <= 17; y++) {
    if (y >= 7 && y <= 12) continue; // o umbo cobre o meio
    span(ctx, y, 7, [paintHi, paintShade]);
  }
  px(ctx, wood, 8, 4);
  px(ctx, woodShade, 7, 5);
  px(ctx, woodLight, 7, 14);
  px(ctx, wood, 8, 15);

  // Sombra do umbo sobre as tábuas
  rect(ctx, woodDeep, 6, 13, 4, 1, 0.5);
  rect(ctx, woodDeep, 11, 8, 1, 4, 0.4);

  // Umbo (bossa) redondo no centro, onde a mão segura
  rect(ctx, bossBase, 6, 7, 4, 1);
  rect(ctx, bossBase, 5, 8, 6, 4);
  rect(ctx, bossBase, 6, 12, 4, 1);
  rect(ctx, bossLight, 5, 8, 1, 4);
  rect(ctx, bossLight, 6, 7, 2, 1);
  rect(ctx, bossShade, 10, 8, 1, 4);
  rect(ctx, bossShade, 9, 7, 1, 1);
  rect(ctx, bossDeep, 7, 12, 3, 1);
  px(ctx, bossShade, 6, 12);
  px(ctx, bossHi, 6, 8);
  px(ctx, bossHi, 7, 9);
  px(ctx, bossHi, 8, 9);
  px(ctx, bossLight, 7, 10);
  px(ctx, bossShade, 8, 10);
  px(ctx, bossShade, 9, 11);

  // Rebites do aro
  for (const y of [3, 6, 9]) {
    px(ctx, rivetHi, 1, y);
    px(ctx, rivetShade, 14, y);
  }
  px(ctx, rivetHi, 3, 12);
  px(ctx, rivetShade, 12, 12);
  px(ctx, rivetHi, 4, 1);
  px(ctx, rivetShade, 11, 1);

  // Marcas de batalha: racha no alto à direita, arranhões à esquerda e uma mossa no aro
  line(ctx, woodDeep, 11, 3, 12, 5);
  line(ctx, woodDeep, 12, 5, 11, 8);
  px(ctx, woodShade, 13, 4);
  line(ctx, woodLight, 3, 9, 4, 12);
  line(ctx, woodLight, 4, 13, 5, 14);
  px(ctx, rimBottom, 14, 5);
  px(ctx, rimBottom, 14, 7);
  px(ctx, woodShade, 13, 6);
};
