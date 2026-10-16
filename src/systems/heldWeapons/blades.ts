import { PALETTE } from '../../data/palette';
import { mix, rect } from '../pixelCanvas';
import { darken, lighten, px, type HeldDrawer } from './kit';

/**
 * Espada (11x32, ponta para cima, empunhadura em (5,25)): lâmina clara com fio à esquerda e
 * sombra à direita, sulco central, guarda dourada, cabo de couro enrolado e pomo redondo.
 */
export const drawLamina: HeldDrawer = (ctx) => {
  // Aço: do fio brilhante à sombra
  const steelHi = PALETTE.playerAccent;
  const steelLight = PALETTE.bone;
  const steelBase = mix(PALETTE.bone, PALETTE.mist, 0.4);
  const steelShade = PALETTE.mist;
  const fuller = darken(steelShade, 0.2);
  // Ouro da guarda e do pomo
  const goldHi = lighten(PALETTE.glow, 0.5);
  const gold = PALETTE.glow;
  const goldMid = mix(PALETTE.glow, PALETTE.ember, 0.5);
  const goldShade = darken(PALETTE.ember, 0.3);
  // Couro do cabo
  const leather = 0x7a4e2c;
  const leatherHi = lighten(leather, 0.25);
  const leatherShade = darken(leather, 0.4);

  // Lâmina (y3..19): fio claro à esquerda, corpo e sombra à direita
  rect(ctx, steelHi, 3, 3, 1, 17);
  rect(ctx, steelLight, 4, 3, 1, 17);
  rect(ctx, steelBase, 5, 3, 1, 17);
  rect(ctx, steelBase, 6, 3, 1, 17);
  rect(ctx, steelShade, 7, 3, 1, 17);
  // Ponta chanfrada
  px(ctx, steelHi, 5, 1);
  rect(ctx, steelLight, 4, 2, 1, 1);
  px(ctx, steelHi, 5, 2);
  rect(ctx, steelShade, 6, 2, 1, 1);
  px(ctx, steelBase, 3, 3);
  px(ctx, steelBase, 7, 3);
  // Sulco central (fuller) com um brilho no lado iluminado
  rect(ctx, fuller, 5, 5, 1, 13);
  px(ctx, steelHi, 4, 6);
  px(ctx, steelHi, 4, 11);
  px(ctx, steelShade, 6, 17);
  // Base da lâmina, junto à guarda
  rect(ctx, steelShade, 3, 19, 5, 1);
  px(ctx, steelBase, 3, 19);

  // Guarda larga (9 px) com as pontas caídas e um rebite
  rect(ctx, goldHi, 2, 20, 7, 1);
  rect(ctx, gold, 1, 21, 9, 1);
  px(ctx, goldHi, 1, 21);
  px(ctx, goldMid, 1, 22);
  px(ctx, goldShade, 2, 22);
  px(ctx, goldMid, 9, 22);
  px(ctx, goldShade, 8, 22);
  rect(ctx, goldMid, 4, 22, 3, 1);
  rect(ctx, goldShade, 6, 21, 3, 1);
  px(ctx, goldShade, 9, 21);
  px(ctx, goldHi, 5, 21); // rebite

  // Cabo de couro (y23..27) com sombreamento vertical e três faixas de enrolado
  rect(ctx, leather, 4, 23, 3, 5);
  rect(ctx, leatherHi, 4, 23, 1, 5);
  rect(ctx, leatherShade, 6, 23, 1, 5);
  rect(ctx, leatherShade, 4, 23, 3, 1);
  rect(ctx, leatherShade, 4, 25, 3, 1);
  rect(ctx, leatherShade, 4, 27, 3, 1);
  px(ctx, leatherHi, 4, 24);
  px(ctx, leatherHi, 4, 26);
  px(ctx, lighten(leather, 0.1), 5, 24);
  px(ctx, lighten(leather, 0.1), 5, 26);

  // Pomo dourado redondo
  rect(ctx, gold, 4, 28, 3, 1);
  rect(ctx, gold, 3, 29, 5, 1);
  rect(ctx, goldMid, 4, 30, 3, 1);
  px(ctx, goldHi, 4, 28);
  px(ctx, goldHi, 3, 29);
  px(ctx, goldShade, 7, 29);
  px(ctx, goldShade, 6, 30);
};

/**
 * Adaga (9x18, ponta para cima, empunhadura em (4,14)): lâmina escura azul-acinzentada com fio
 * claro e brilho roxo no gume, guarda curta, cabo enrolado e pomo com gema roxa.
 */
export const drawAdaga: HeldDrawer = (ctx) => {
  // Aço escuro azulado
  const steelEdge = lighten(PALETTE.mist, 0.5);
  const steelBase = mix(PALETTE.stoneLight, PALETTE.mist, 0.45);
  const steelShade = PALETTE.stone;
  const steelDeep = PALETTE.stoneDark;
  // Brilho frio do gume e gema
  const glowHi = lighten(PALETTE.wraith, 0.5);
  const glow = PALETTE.wraith;
  const glowDeep = darken(PALETTE.wraith, 0.45);
  // Metal da guarda e do pomo
  const metalLight = PALETTE.mist;
  const metalBase = PALETTE.stoneLight;
  // Couro do cabo
  const leather = 0x5a3a24;
  const leatherHi = lighten(leather, 0.25);
  const leatherShade = darken(leather, 0.4);

  // Lâmina (y1..9): fio claro à esquerda, corpo no meio, sombra e brilho roxo no gume da direita
  rect(ctx, steelEdge, 3, 2, 1, 8);
  rect(ctx, steelBase, 4, 2, 1, 8);
  rect(ctx, steelShade, 5, 2, 1, 8);
  px(ctx, steelEdge, 4, 1); // ponta chanfrada
  px(ctx, steelBase, 3, 2);
  px(ctx, steelShade, 5, 2);
  px(ctx, glowHi, 5, 3);
  px(ctx, glow, 5, 5);
  px(ctx, glow, 5, 7);
  px(ctx, glowDeep, 5, 4);
  px(ctx, glowDeep, 5, 6);
  px(ctx, glowDeep, 5, 8);
  px(ctx, steelDeep, 4, 9); // base da lâmina

  // Guarda pequena de metal (y10) com a sombra por baixo
  rect(ctx, metalBase, 1, 10, 7, 1);
  rect(ctx, metalLight, 1, 10, 3, 1);
  px(ctx, steelDeep, 7, 10);
  rect(ctx, steelDeep, 3, 11, 3, 1);

  // Cabo de couro enrolado (y12..14)
  rect(ctx, leather, 3, 12, 3, 3);
  rect(ctx, leatherHi, 3, 12, 1, 3);
  rect(ctx, leatherShade, 5, 12, 1, 3);
  rect(ctx, leatherShade, 3, 12, 3, 1);
  rect(ctx, leatherShade, 3, 14, 3, 1);
  px(ctx, leatherHi, 3, 13);

  // Pomo de metal com a gema roxa
  rect(ctx, metalBase, 3, 15, 3, 2);
  px(ctx, metalLight, 3, 15);
  px(ctx, steelDeep, 5, 16);
  px(ctx, glowHi, 4, 15);
  px(ctx, glow, 4, 16);
};
