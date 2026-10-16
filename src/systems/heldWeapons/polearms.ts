import { PALETTE } from '../../data/palette';
import { line, rect } from '../pixelCanvas';
import { darken, lighten, px, type HeldDrawer } from './kit';

/** Madeira acinzentada dos cabos: luz, base, sombra e veio escuro. */
const WOOD = 0x6a5238;
const WOOD_LIGHT = lighten(WOOD, 0.22);
const WOOD_SHADE = darken(WOOD, 0.3);
const WOOD_GRAIN = darken(WOOD, 0.55);

/** Couro das faixas e da empunhadura (mais quente que a madeira). */
const LEATHER = 0x9a6234;
const LEATHER_LIGHT = lighten(LEATHER, 0.25);
const LEATHER_SHADE = darken(LEATHER, 0.38);

/** Ferro das ponteiras e abraçadeiras. */
const IRON = PALETTE.mist;
const IRON_LIGHT = PALETTE.bone;
const IRON_SHADE = PALETTE.stoneLight;
const IRON_DARK = PALETTE.stone;

/** Osso marfim do arco. */
const BONE = 0xd8cfb4;
const BONE_LIGHT = lighten(BONE, 0.45);
const BONE_SHADE = darken(BONE, 0.3);
const BONE_DEEP = darken(BONE, 0.58);

/** Faixa de ferro em volta de um cabo (duas linhas: luz em cima, sombra embaixo). */
function ironBand(ctx: Parameters<HeldDrawer>[0], x: number, y: number, w: number): void {
  rect(ctx, IRON_LIGHT, x, y, w, 1);
  rect(ctx, IRON_SHADE, x, y + 1, w, 1);
}

/**
 * Foice: cabo longo com veios e duas faixas de couro, lâmina em crescente curvada para a
 * direita (fio claro por dentro, dorso escuro com entalhes), pano esfarrapado e ponteira de ferro.
 */
export const drawFoice: HeldDrawer = (ctx) => {
  // Cabo (x 5..7): luz à esquerda, sombra à direita, do colar da lâmina até a ponteira
  rect(ctx, WOOD, 5, 9, 3, 30);
  rect(ctx, WOOD_LIGHT, 5, 9, 1, 30);
  rect(ctx, WOOD_SHADE, 7, 9, 1, 30);
  // Veios da madeira: riscos escuros no meio e fiapos claros na borda
  for (const y of [13, 18, 22, 26, 38]) px(ctx, WOOD_GRAIN, 6, y);
  for (const y of [16, 20, 24]) rect(ctx, WOOD_GRAIN, 6, y, 1, 2);
  for (const y of [15, 21, 27, 37]) px(ctx, lighten(WOOD, 0.4), 5, y);
  px(ctx, WOOD_GRAIN, 7, 17);
  px(ctx, WOOD_GRAIN, 7, 25);

  // Duas faixas de couro (a mão fica entre elas, em y=32)
  for (const y of [29, 34]) {
    rect(ctx, LEATHER, 5, y, 3, 2);
    rect(ctx, LEATHER_LIGHT, 5, y, 3, 1);
    rect(ctx, LEATHER_SHADE, 5, y + 1, 3, 1);
  }

  // Lâmina: para cada coluna, de onde começa (dorso) até onde termina (fio de dentro)
  const spans: ReadonlyArray<readonly [number, number, number]> = [
    [5, 4, 8],
    [6, 3, 8],
    [7, 2, 8],
    [8, 2, 7],
    [9, 1, 6],
    [10, 1, 5],
    [11, 1, 5],
    [12, 1, 5],
    [13, 1, 5],
    [14, 2, 6],
    [15, 2, 6],
    [16, 3, 7],
    [17, 5, 8],
    [18, 8, 10],
  ];
  const bladeBase = PALETTE.mist;
  const bladeLight = lighten(bladeBase, 0.38);
  const bladeBack = PALETTE.stone;
  const bladeBackLight = PALETTE.stoneLight;
  for (const [x, top, bottom] of spans) {
    const n = bottom - top + 1;
    for (let i = 0; i < n; i++) {
      const y = top + i;
      // Dois dentes faltando no dorso (entalhes que recortam a silhueta)
      if ((x === 11 && y === 1) || (x === 15 && y === 2)) continue;
      let color: number = bladeBase;
      if (i === 0)
        color = bladeBack; // dorso escuro
      else if (i === 1 && n >= 4) color = bladeBackLight;
      else if (i === n - 1)
        color = x >= 8 ? IRON_LIGHT : bladeBackLight; // fio claro
      else if (i === n - 2 && x >= 8) color = bladeLight;
      px(ctx, color, x, y);
    }
  }
  // Entalhes no dorso: dentes que faltam e rachaduras escuras
  px(ctx, bladeBack, 9, 3);
  px(ctx, bladeBack, 13, 3);
  px(ctx, bladeBack, 7, 5);
  px(ctx, darken(bladeBack, 0.4), 16, 4);
  // Brilhos no fio e na ponta
  px(ctx, PALETTE.playerAccent, 11, 5);
  px(ctx, PALETTE.playerAccent, 15, 6);
  px(ctx, PALETTE.playerAccent, 18, 10);

  // Colar de ferro onde a lâmina encaixa no cabo
  rect(ctx, IRON_LIGHT, 4, 9, 5, 1);
  rect(ctx, IRON, 4, 10, 5, 1);
  rect(ctx, IRON_DARK, 5, 11, 3, 1);

  // Pano esfarrapado amarrado abaixo do colar: nó e três tiras com pontas rasgadas
  rect(ctx, PALETTE.blood, 4, 13, 5, 2);
  rect(ctx, lighten(PALETTE.blood, 0.25), 4, 13, 5, 1);
  rect(ctx, PALETTE.bloodDark, 4, 14, 5, 1);
  rect(ctx, PALETTE.blood, 3, 15, 2, 4);
  px(ctx, PALETTE.bloodDark, 3, 19);
  px(ctx, PALETTE.bloodDark, 2, 18);
  px(ctx, PALETTE.bloodDark, 4, 17);
  rect(ctx, PALETTE.blood, 8, 15, 2, 6);
  rect(ctx, PALETTE.bloodDark, 9, 18, 1, 4);
  px(ctx, PALETTE.bloodDark, 8, 21);
  px(ctx, PALETTE.blood, 10, 20);

  // Ponteira de ferro na base
  rect(ctx, IRON_LIGHT, 4, 36, 5, 1);
  rect(ctx, IRON, 5, 37, 3, 3);
  rect(ctx, IRON_LIGHT, 5, 37, 1, 3);
  rect(ctx, IRON_SHADE, 7, 37, 1, 3);
  px(ctx, IRON_DARK, 6, 40);
};

/**
 * Lança: haste fina com veios e duas faixas de ferro, ponta de folha larga com nervura e fio
 * claro, laço de pano vermelho esfarrapado sob a ponta e ponteira de ferro.
 */
export const drawLanca: HeldDrawer = (ctx) => {
  // Haste (x 3..5)
  rect(ctx, WOOD, 3, 11, 3, 28);
  rect(ctx, WOOD_LIGHT, 3, 11, 1, 28);
  rect(ctx, WOOD_SHADE, 5, 11, 1, 28);
  for (const y of [16, 25, 30, 36]) px(ctx, WOOD_GRAIN, 4, y);
  for (const y of [18, 28, 33]) rect(ctx, WOOD_GRAIN, 4, y, 1, 2);
  for (const y of [14, 24, 31]) px(ctx, lighten(WOOD, 0.4), 3, y);

  // Duas faixas de ferro
  ironBand(ctx, 2, 24, 5);
  ironBand(ctx, 2, 34, 5);

  // Ponta em folha: [linha, esquerda, direita]
  const leaf: ReadonlyArray<readonly [number, number, number]> = [
    [1, 4, 4],
    [2, 3, 5],
    [3, 3, 5],
    [4, 2, 6],
    [5, 1, 7],
    [6, 1, 7],
    [7, 2, 6],
    [8, 2, 6],
    [9, 3, 5],
  ];
  const leafLight = lighten(PALETTE.mist, 0.4);
  const leafShade = darken(PALETTE.mist, 0.25);
  for (const [y, left, right] of leaf) {
    for (let x = left; x <= right; x++) {
      let color = x < 4 ? leafLight : leafShade;
      if (x === 4) color = PALETTE.mist; // nervura central
      if (x === left && left < 4) color = PALETTE.playerAccent; // fio claro da esquerda
      if (x === right && right > 4) color = IRON_LIGHT; // fio claro da direita
      px(ctx, color, x, y);
    }
  }
  px(ctx, PALETTE.playerAccent, 4, 1); // brilho na ponta
  px(ctx, IRON_SHADE, 4, 9); // fim da nervura

  // Soquete de ferro que prende a folha à haste
  rect(ctx, IRON_LIGHT, 3, 10, 3, 1);
  rect(ctx, IRON, 2, 11, 5, 1);
  rect(ctx, IRON_SHADE, 3, 12, 3, 1);

  // Laço de pano vermelho logo abaixo da ponta, com tiras rasgadas
  rect(ctx, PALETTE.blood, 2, 13, 5, 2);
  rect(ctx, lighten(PALETTE.blood, 0.25), 2, 13, 5, 1);
  rect(ctx, PALETTE.bloodDark, 2, 14, 5, 1);
  rect(ctx, PALETTE.blood, 1, 15, 2, 4);
  px(ctx, PALETTE.bloodDark, 1, 19);
  px(ctx, PALETTE.bloodDark, 2, 17);
  rect(ctx, PALETTE.blood, 6, 15, 2, 6);
  rect(ctx, PALETTE.bloodDark, 7, 18, 1, 4);
  px(ctx, PALETTE.bloodDark, 6, 21);

  // Ponteira de ferro na base
  rect(ctx, IRON_LIGHT, 2, 38, 5, 1);
  rect(ctx, IRON, 3, 39, 3, 3);
  rect(ctx, IRON_LIGHT, 3, 39, 1, 3);
  rect(ctx, IRON_SHADE, 5, 39, 1, 3);
  px(ctx, IRON_DARK, 4, 42);
};

/** Posição x da borda esquerda do arco em cada linha (y de 1 a 28): barriga à esquerda. */
const BOW_LIMB_X: readonly number[] = [
  9, 8, 7, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9,
];

/** Borda esquerda do braço do arco na linha y (de 1 a 28). */
function limbX(y: number): number {
  return BOW_LIMB_X[y - 1] ?? 0;
}

/**
 * Arco de osso: curva vertical com a barriga para a esquerda e as pontas para a direita, entalhes
 * e nós, empunhadura de couro no meio, corda clara esticada e pontas de metal com fios de couro.
 */
export const drawArco: HeldDrawer = (ctx) => {
  // Braços do arco: dois pixels de largura, luz na face de fora e sombra na de dentro
  BOW_LIMB_X.forEach((x, i) => {
    const y = i + 1;
    px(ctx, i % 3 === 1 ? BONE_LIGHT : BONE, x, y);
    px(ctx, BONE_SHADE, x + 1, y);
  });
  // Entalhes: riscos escuros atravessando o osso
  for (const y of [6, 10, 20, 23]) {
    px(ctx, BONE_DEEP, limbX(y), y);
    px(ctx, BONE_DEEP, limbX(y) + 1, y);
  }
  // Nós do osso: calombos na face de fora
  for (const y of [8, 21]) {
    px(ctx, BONE_SHADE, limbX(y) - 1, y);
    px(ctx, BONE_LIGHT, limbX(y) - 1, y - 1);
  }
  px(ctx, BONE_DEEP, 3, 4);
  px(ctx, BONE_DEEP, 3, 25);

  // Empunhadura de couro enrolado (cobre a mão em (3,15))
  rect(ctx, LEATHER, 1, 12, 4, 7);
  rect(ctx, LEATHER_LIGHT, 1, 12, 1, 7);
  rect(ctx, LEATHER_SHADE, 4, 12, 1, 7);
  for (const y of [13, 15, 17]) rect(ctx, LEATHER_SHADE, 1, y, 4, 1);
  for (const y of [14, 16]) px(ctx, LEATHER_LIGHT, 2, y);
  rect(ctx, LEATHER_SHADE, 1, 18, 4, 1);

  // Pontas de metal e fios de couro amarrando a corda
  for (const y of [1, 28]) {
    px(ctx, IRON, 9, y);
    px(ctx, IRON_LIGHT, 10, y);
  }
  for (const y of [3, 26]) {
    rect(ctx, LEATHER, limbX(y), y, 2, 1);
    px(ctx, LEATHER_SHADE, limbX(y) + 1, y);
  }
  px(ctx, LEATHER, 9, 4);
  px(ctx, LEATHER_SHADE, 9, 5);
  px(ctx, LEATHER, 9, 25);
  px(ctx, LEATHER_SHADE, 9, 24);

  // Corda fina e clara entre as pontas, com o ponto de encaixe da flecha
  line(ctx, lighten(PALETTE.bone, 0.45), 10, 2, 10, 27);
  px(ctx, LEATHER, 10, 14);
  px(ctx, LEATHER, 10, 16);
};
