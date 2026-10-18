import { PALETTE } from '../../data/palette';
import { line, rect, type Ctx } from '../pixelCanvas';
import { darken, lighten, px, type HeldDrawer } from './kit';

/**
 * Armas da tripulação, parte 2 (chicote, cajado e besta). A ponta fica para cima, a frente é a
 * direita da textura e não há contorno: o jogo põe 1 px escuro nos vizinhos transparentes.
 */

// Madeira do cabo do chicote e do cajado (luz à esquerda, sombra à direita)
const WOOD = 0x5a4230;
const WOOD_HI = lighten(WOOD, 0.3);
const WOOD_SH = darken(WOOD, 0.33);
const WOOD_DK = darken(WOOD, 0.58);

// Couro do chicote
const LEATHER = 0x8a5a2e;
const LEATHER_HI = lighten(LEATHER, 0.3);
const LEATHER_SH = darken(LEATHER, 0.35);
const LEATHER_DK = darken(LEATHER, 0.58);

// Ferro (elos, abraçadeiras, garra e ponteira)
const IRON = PALETTE.mist;
const IRON_HI = PALETTE.bone;
const IRON_SH = PALETTE.stoneLight;
const IRON_DK = PALETTE.stone;
const IRON_DEEP = PALETTE.stoneDark;

/** Pontos (um por passo) do caminho que liga os pontos de passagem, sem repetir o ponto de junção. */
function tracePath(waypoints: ReadonlyArray<readonly [number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i + 1 < waypoints.length; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (!a || !b) continue;
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let s = 0; s < steps; s++) {
      const x = Math.round(a[0] + ((b[0] - a[0]) * s) / steps);
      const y = Math.round(a[1] + ((b[1] - a[1]) * s) / steps);
      const last = out[out.length - 1];
      if (!last || last[0] !== x || last[1] !== y) out.push([x, y]);
    }
  }
  const end = waypoints[waypoints.length - 1];
  if (end) out.push([end[0], end[1]]);
  return out;
}

/** Elos que se alternam entre claro e escuro, cada um com dois passos do caminho. */
const LINK_STEPS = 12;

/**
 * Chicote de correntes: cabo curto de madeira com couro enrolado, abraçadeira com rebite, uma
 * corrente de elos que sobe e vira uma tira de couro trançado em S até a ponta de ferro com gancho.
 */
export const drawChicote: HeldDrawer = (ctx) => {
  // Cabo (x 3..5, y 31..38): madeira com veios, couro enrolado onde a mão pega
  rect(ctx, WOOD, 3, 31, 3, 8);
  rect(ctx, WOOD_HI, 3, 31, 1, 8);
  rect(ctx, WOOD_SH, 5, 31, 1, 8);
  px(ctx, WOOD_DK, 4, 32);
  px(ctx, WOOD_DK, 4, 33);
  px(ctx, WOOD_HI, 4, 31);
  // Couro enrolado em diagonal (a mão fica em (4,36))
  rect(ctx, LEATHER, 3, 34, 3, 4);
  rect(ctx, LEATHER_HI, 3, 34, 1, 4);
  rect(ctx, LEATHER_SH, 5, 34, 1, 4);
  px(ctx, LEATHER_DK, 4, 34);
  px(ctx, LEATHER_DK, 5, 35);
  px(ctx, LEATHER_DK, 3, 36);
  px(ctx, LEATHER_DK, 4, 37);
  px(ctx, LEATHER_HI, 4, 35);
  px(ctx, LEATHER_HI, 4, 36);
  // Pomo de ferro na base do cabo
  rect(ctx, IRON_HI, 3, 38, 1, 1);
  rect(ctx, IRON, 4, 38, 1, 1);
  rect(ctx, IRON_SH, 5, 38, 1, 1);

  // Abraçadeira de ferro na junção, com rebite
  rect(ctx, IRON_HI, 2, 29, 5, 1);
  rect(ctx, IRON, 2, 30, 5, 1);
  rect(ctx, IRON_DK, 3, 31, 3, 1);
  px(ctx, IRON_DEEP, 6, 30);
  px(ctx, IRON_HI, 4, 30);
  px(ctx, IRON_DEEP, 2, 29);

  // Caminho da tira: sobe do cabo e faz o S até o canto de cima à direita
  const path = tracePath([
    [4, 28],
    [4, 24],
    [6, 20],
    [10, 17],
    [14, 15],
    [16, 12],
    [15, 9],
    [12, 7],
    [9, 5],
    [10, 3],
    [13, 2],
    [16, 3],
    [18, 5],
    [18, 7],
  ]);
  path.forEach(([x, y], i) => {
    const next = path[i + 1] ?? path[i - 1] ?? [x, y];
    // Trechos mais verticais ganham dois pixels lado a lado, os mais deitados um sobre o outro
    const steep = Math.abs(next[1] - y) >= Math.abs(next[0] - x);
    const bx = steep ? x + 1 : x;
    const by = steep ? y : y + 1;
    if (i < LINK_STEPS) {
      // Elos: pares claros e escuros se alternando, com a face de dentro mais escura
      const light = Math.floor(i / 2) % 2 === 0;
      px(ctx, light ? IRON_HI : IRON_SH, x, y);
      px(ctx, light ? IRON : IRON_DK, bx, by);
    } else {
      // Couro trançado: listras diagonais escuras a cada quarto passo
      const stripe = i % 4 === 0;
      px(ctx, stripe ? LEATHER_SH : LEATHER_HI, x, y);
      px(ctx, stripe ? LEATHER_DK : LEATHER_SH, bx, by);
      if (i % 4 === 2) px(ctx, LEATHER, x, y);
    }
  });
  // Frestas entre os elos (pontos escuros no meio da corrente)
  for (const i of [2, 5, 8, 11]) {
    const p = path[i];
    if (p) px(ctx, IRON_DEEP, p[0], p[1]);
  }

  // Ponta: pesinho de ferro com um gancho curvo
  rect(ctx, IRON_HI, 17, 8, 2, 1);
  rect(ctx, IRON, 17, 9, 3, 2);
  rect(ctx, IRON_SH, 18, 11, 2, 1);
  px(ctx, IRON_HI, 17, 9);
  px(ctx, IRON_DK, 19, 10);
  px(ctx, IRON_DK, 19, 12);
  px(ctx, IRON_SH, 20, 12);
  px(ctx, IRON_HI, 20, 13);
  px(ctx, IRON_DK, 19, 13);
  px(ctx, PALETTE.playerAccent, 17, 8);
};

// Madeira escura do cajado
const STAFF = 0x3e2d22;
const STAFF_HI = lighten(STAFF, 0.35);
const STAFF_SH = darken(STAFF, 0.35);
const STAFF_DK = darken(STAFF, 0.6);

// Pano vermelho amarrado na mão
const CLOTH = PALETTE.blood;
const CLOTH_HI = lighten(PALETTE.blood, 0.28);
const CLOTH_SH = PALETTE.bloodDark;

// Orbe de brasa: miolo, anel, sombra
const ORB_CORE = 0xfff0a0;
const ORB_MID = 0xffb347;
const ORB_RING = PALETTE.ember;
const ORB_SHADE = 0xb0391f;
const ORB_DEEP = PALETTE.bloodDark;

/** Faixa de pano vermelho atada em volta do cajado (x 3..7), com luz em cima e sombra embaixo. */
function clothBand(ctx: Ctx, y: number): void {
  rect(ctx, CLOTH, 3, y, 5, 2);
  rect(ctx, CLOTH_HI, 3, y, 4, 1);
  rect(ctx, CLOTH_SH, 4, y + 1, 4, 1);
  px(ctx, CLOTH_SH, 7, y);
}

/**
 * Cajado de brasas: haste de madeira escura com veios e nós, duas faixas de pano vermelho na mão,
 * ponteira de ferro e, no topo, uma garra de metal escuro prendendo um orbe de brasa com faíscas.
 */
export const drawCajado: HeldDrawer = (ctx) => {
  // Haste (x 4..6, y 12..35): luz à esquerda, sombra à direita
  rect(ctx, STAFF, 4, 12, 3, 24);
  rect(ctx, STAFF_HI, 4, 12, 1, 24);
  rect(ctx, STAFF_SH, 6, 12, 1, 24);
  // Veios
  for (const y of [14, 19, 24, 34]) px(ctx, STAFF_DK, 5, y);
  for (const y of [16, 21]) rect(ctx, STAFF_DK, 5, y, 1, 2);
  for (const y of [15, 22, 33]) px(ctx, lighten(STAFF, 0.5), 4, y);
  px(ctx, STAFF_DK, 6, 18);
  px(ctx, STAFF_DK, 6, 36);
  // Nós: calombos que alargam a haste
  for (const y of [17, 23]) {
    px(ctx, STAFF_HI, 3, y);
    px(ctx, STAFF, 3, y + 1);
    px(ctx, STAFF_SH, 7, y);
    px(ctx, STAFF_DK, 7, y + 1);
    px(ctx, STAFF_DK, 5, y);
  }

  // Duas faixas de pano vermelho (a mão pega entre elas, em y=29), com a ponta solta
  clothBand(ctx, 26);
  clothBand(ctx, 32);
  rect(ctx, CLOTH, 7, 27, 2, 3);
  px(ctx, CLOTH_SH, 8, 29);
  px(ctx, CLOTH_SH, 8, 30);
  px(ctx, CLOTH_HI, 7, 27);

  // Ponteira de ferro
  rect(ctx, IRON_HI, 4, 36, 3, 1);
  rect(ctx, IRON, 4, 37, 3, 1);
  rect(ctx, IRON_HI, 4, 37, 1, 1);
  rect(ctx, IRON_SH, 6, 37, 1, 1);
  px(ctx, IRON_DK, 5, 38);

  // Garra de metal escuro: soquete na haste e três dedos curvos em volta do orbe
  rect(ctx, IRON_SH, 3, 10, 5, 1);
  rect(ctx, IRON_DK, 3, 11, 5, 1);
  px(ctx, IRON, 3, 10);
  px(ctx, IRON_DEEP, 4, 12);
  px(ctx, IRON_DEEP, 6, 12);

  // Orbe de brasa (centro em (5,6)): sombra vermelha, anel laranja, miolo amarelo
  rect(ctx, ORB_DEEP, 3, 9, 5, 1);
  rect(ctx, ORB_DEEP, 2, 5, 1, 4);
  rect(ctx, ORB_SHADE, 2, 4, 7, 5);
  rect(ctx, ORB_SHADE, 3, 3, 5, 1);
  rect(ctx, ORB_SHADE, 3, 9, 5, 1);
  rect(ctx, ORB_RING, 3, 4, 5, 4);
  rect(ctx, ORB_RING, 4, 3, 3, 1);
  rect(ctx, ORB_MID, 4, 4, 3, 3);
  rect(ctx, ORB_CORE, 4, 5, 2, 2);
  px(ctx, ORB_CORE, 5, 4);
  px(ctx, PALETTE.playerAccent, 4, 4);
  px(ctx, ORB_DEEP, 8, 8);
  px(ctx, ORB_DEEP, 7, 9);
  px(ctx, ORB_SHADE, 7, 8);

  // Dedos da garra: sobem pelos lados e se curvam sobre o orbe
  line(ctx, IRON_DK, 2, 10, 2, 7);
  line(ctx, IRON_DK, 8, 10, 8, 7);
  px(ctx, IRON_SH, 2, 7);
  px(ctx, IRON_SH, 3, 6);
  px(ctx, IRON_DEEP, 8, 7);
  px(ctx, IRON_DK, 7, 6);
  px(ctx, IRON_SH, 5, 9);
  px(ctx, IRON_DK, 4, 9);
  px(ctx, IRON_DK, 6, 9);

  // Chama curta no alto do orbe
  px(ctx, ORB_RING, 4, 2);
  px(ctx, ORB_CORE, 5, 2);
  px(ctx, ORB_RING, 6, 2);
  px(ctx, ORB_MID, 5, 1);
  // Faíscas soltas
  px(ctx, ORB_MID, 1, 2);
  px(ctx, ORB_CORE, 8, 1);
  px(ctx, ORB_RING, 9, 4);
  px(ctx, ORB_MID, 1, 6);
  px(ctx, ORB_RING, 9, 7);
};

// Ferro enferrujado do arco da besta
const RUST = 0x9a5a2c;
const RUST_HI = lighten(RUST, 0.32);
const RUST_SH = darken(RUST, 0.32);
const RUST_DK = darken(RUST, 0.58);

// Madeira da coronha e do trilho
const BOLT_WOOD = 0x6a4a30;
const BOLT_WOOD_HI = lighten(BOLT_WOOD, 0.3);
const BOLT_WOOD_SH = darken(BOLT_WOOD, 0.33);
const BOLT_WOOD_DK = darken(BOLT_WOOD, 0.58);

/** Corda clara e fina. */
const STRING = lighten(PALETTE.bone, 0.4);

/**
 * Besta enferrujada, vista com o focinho para cima (o jogo a gira para a frente): arco de ferro
 * curvado para cima no topo, corda esticada até o virote, estribo na ponta, trilho com sulco,
 * coronha de madeira com placa de metal, gatilho e guarda.
 */
export const drawBesta: HeldDrawer = (ctx) => {
  // Coronha e trilho (x 6..8): madeira com veios, mais larga na empunhadura
  rect(ctx, BOLT_WOOD, 6, 6, 3, 15);
  rect(ctx, BOLT_WOOD_HI, 6, 6, 1, 15);
  rect(ctx, BOLT_WOOD_SH, 8, 6, 1, 15);
  rect(ctx, BOLT_WOOD, 5, 14, 5, 6);
  rect(ctx, BOLT_WOOD_HI, 5, 14, 1, 6);
  rect(ctx, BOLT_WOOD_SH, 9, 14, 1, 6);
  px(ctx, BOLT_WOOD_DK, 7, 18);
  px(ctx, BOLT_WOOD_DK, 7, 19);
  px(ctx, BOLT_WOOD_DK, 6, 16);
  px(ctx, BOLT_WOOD_DK, 8, 15);
  px(ctx, BOLT_WOOD_HI, 6, 17);
  px(ctx, BOLT_WOOD_HI, 8, 19);
  // Sulco do trilho, onde corre o virote
  rect(ctx, BOLT_WOOD_DK, 7, 6, 1, 8);

  // Placa de metal na base da coronha
  rect(ctx, IRON_HI, 5, 20, 5, 1);
  rect(ctx, IRON, 5, 21, 5, 1);
  rect(ctx, IRON_DK, 6, 22, 3, 1);
  px(ctx, IRON_DEEP, 9, 21);
  px(ctx, IRON_HI, 5, 21);

  // Gatilho e guarda de metal perto da empunhadura
  rect(ctx, IRON_SH, 9, 16, 2, 1);
  rect(ctx, IRON_DK, 10, 17, 1, 2);
  rect(ctx, IRON_SH, 8, 19, 3, 1);
  px(ctx, IRON_HI, 9, 16);
  px(ctx, IRON_HI, 7, 16);
  px(ctx, IRON_DK, 7, 17);

  // Corda esticada de ponta a ponta do arco, puxada até o encaixe do virote
  line(ctx, STRING, 2, 5, 6, 10);
  line(ctx, STRING, 12, 5, 8, 10);
  px(ctx, STRING, 7, 10);

  // Arco de ferro enferrujado: cubo no meio e dois braços que se curvam para cima
  rect(ctx, RUST, 5, 5, 5, 3);
  rect(ctx, RUST_HI, 5, 5, 5, 1);
  rect(ctx, RUST_SH, 5, 7, 5, 1);
  rect(ctx, RUST_DK, 6, 8, 3, 1);
  // Braço esquerdo (luz) e direito (sombra): cada coluna é [x, topo, base]
  const limbs: ReadonlyArray<readonly [number, number, number]> = [
    [4, 5, 6],
    [3, 4, 5],
    [2, 3, 4],
    [10, 5, 6],
    [11, 4, 5],
    [12, 3, 4],
  ];
  for (const [x, top, bottom] of limbs) {
    const left = x < 7;
    px(ctx, left ? RUST_HI : RUST, x, top);
    px(ctx, left ? RUST : RUST_SH, x, bottom);
  }
  // Ferrugem: manchas escuras e pontos laranja vivos
  px(ctx, RUST_DK, 3, 5);
  px(ctx, RUST_DK, 11, 4);
  px(ctx, RUST_SH, 2, 4);
  px(ctx, ORB_RING, 4, 5);
  px(ctx, ORB_RING, 11, 5);
  px(ctx, ORB_RING, 7, 6);
  px(ctx, RUST_DK, 12, 4);
  // Amarras de couro entre o cubo e os braços
  px(ctx, LEATHER_DK, 5, 6);
  px(ctx, LEATHER_DK, 9, 6);

  // Estribo: aro de ferro na ponta de cima (o virote passa pelo meio)
  rect(ctx, IRON_HI, 5, 2, 5, 1);
  rect(ctx, IRON, 5, 3, 1, 2);
  rect(ctx, IRON_SH, 9, 3, 1, 2);
  px(ctx, IRON_DK, 9, 4);
  px(ctx, IRON_DK, 5, 4);

  // Virote encaixado no trilho: ponta de metal, haste e penas
  px(ctx, PALETTE.playerAccent, 7, 1);
  px(ctx, IRON_HI, 7, 2);
  rect(ctx, IRON, 7, 3, 1, 7);
  px(ctx, IRON_HI, 7, 3);
  px(ctx, IRON_HI, 7, 5);
  px(ctx, IRON_SH, 7, 8);
  // Penas do virote
  px(ctx, PALETTE.bone, 6, 9);
  px(ctx, PALETTE.blood, 8, 9);
  px(ctx, PALETTE.bone, 6, 10);
  px(ctx, PALETTE.bloodDark, 8, 10);
  px(ctx, IRON_DK, 7, 10);
};
