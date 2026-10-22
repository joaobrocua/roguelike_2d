import { PALETTE } from '../data/palette';
import type { CoveiroPose } from '../data/coveiroSprites';
import { fillPx, linePx } from './pixelSheet';

/**
 * O Coveiro Insone em pixel art: um gigante curvado, de casaco de enterro em trapos, chapéu de aba
 * larga apodrecido e rosto pálido e liso com dois olhos acesos em branco-azulado. Segura com as
 * duas mãos enormes uma pá enferrujada (a lâmina é a arma), usa um cinto de ossos, leva um lampião
 * fraco na cintura e deixa cair terra e vermes. Olha para a direita; o contorno de 1 px é
 * automático. Quadro de 78 x 100 (o corpo de colisão tem 30 x 44); as poses ficam em
 * src/data/coveiroSprites.ts.
 */
type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

const WIDTH = 78; // largura do quadro (30 + 2 x 24 de folga)
const CX = 32; // um pouco à esquerda do centro do quadro: a pá sobra mais à frente
const FEET = 71; // base do corpo de colisão (44 + 28 de folga) menos 1 px para o contorno

// Casaco de enterro, calça e botas de lama
const COAT = 0x33343a;
const COAT_DARK = 0x1f2026;
const COAT_LIGHT = 0x4e4f58;
const PANTS = 0x26272d;
const BOOT = 0x32281b;
const BOOT_DARK = 0x1e170f;
const MUD = 0x5a4630;
const MUD_LIGHT = 0x7c6445;
// Pele pálida e mãos
const SKIN = 0xbcbfb6;
const SKIN_SHADE = 0x8d9089;
const SKIN_DARK = 0x585b57;
const HAND = 0x86877c;
const HAND_DARK = 0x4d4e47;
const HAND_LIGHT = 0xaeafa2;
const HAND_BACK = 0x6a6b61;
// Chapéu apodrecido
const HAT = 0x3b382f;
const HAT_LIGHT = 0x57524a;
const HAT_DARK = 0x23211c;
const HAT_BAND = 0x5e4d2e;
// Olhos de luz fria
const EYE = 0xbfe4ff;
const EYE_CORE = 0xffffff;
const EYE_HALO = 0x8cc8ff;
// Cinto de ossos e lampião
const BONE = PALETTE.bone;
const BONE_DARK = 0x8f8f8a;
const LEATHER = 0x3a2c1e;
const LAMP_FRAME = 0x2a2420;
const CHAIN = 0x6a6a70;
// Pá enferrujada
const WOOD = 0x6a5233;
const WOOD_DARK = 0x45341f;
const WOOD_LIGHT = 0x8f7248;
const RUST = 0x7d4a2a;
const RUST_DARK = 0x4e2c1a;
const RUST_LIGHT = 0xa8693a;
const STEEL = 0x9d9da0;
// Terra e vermes
const DIRT = 0x5f4a32;
const DIRT_DARK = 0x3f3022;
const DIRT_LIGHT = 0x7d6446;
const WORM = 0xb48f86;
const WORM_DARK = 0x7d5a55;

/** Da mão de trás até a ponta da pá, até onde a lâmina começa e quanto o cabo passa da mão. */
const SPADE_LEN = 32;
const SHAFT_LEN = 19;
const HANDLE_LEN = 7;
/** Meia-largura da lâmina a cada passo ao longo do eixo (da boca para a ponta). */
const BLADE_HALF = [2, 4, 4, 4, 4, 4, 4, 4, 3, 3, 2, 1, 1] as const;

/** Terra solta no casaco: deslocamento em x e em y a partir do topo do tronco. */
const CLODS: readonly (readonly [number, number])[] = [
  [-10, 3],
  [8, 9],
  [-4, 15],
  [12, 21],
  [-13, 27],
  [3, 31],
];

interface SpadeGeom {
  h1: Point;
  h2: Point;
  end: Point;
  shaftEnd: Point;
  tip: Point;
  dir: Point;
}

export function drawCoveiro(ctx: Ctx, p: CoveiroPose): void {
  if (p.kneel === 2) {
    drawCollapsed(ctx, p);
    return;
  }
  const feet = FEET;
  const l = p.lean;
  const hipY = feet - 15 - p.bob;
  const top = hipY - 16;
  const topX = CX + l + 3; // o tronco é curvado: o alto avança mais que o quadril
  const hipX = CX + Math.round(l / 2);
  const hemY = Math.min(feet - 2, hipY + 6);

  drawLegs(ctx, hipX, hipY, feet, p);
  const edge = drawCoat(ctx, topX, hipX, top, hipY, hemY, feet);
  drawBelt(ctx, edge, hipY);
  drawLantern(ctx, edge.left + 1 + p.sway, hipY, feet);
  const hx = CX + l + 9;
  const hy = top - 4 + p.droop;

  // Pá e braços: a mão de trás segura o cabo; a da frente, mais abaixo no cabo. A cabeça fica
  // por cima dos braços (erguidos, eles passam atrás do rosto) e as mãos por cima de tudo.
  const shoulderF: Point = { x: topX + 7, y: top + 3 };
  const shoulderB: Point = { x: topX + 2, y: top + 4 };
  const h1: Point = { x: shoulderF.x + p.grip.dx, y: shoulderF.y + p.grip.dy };
  const spade = spadeGeom(h1, p.angle);
  drawArm(ctx, shoulderB, spade.h1, true);
  drawSpade(ctx, spade);
  drawArm(ctx, shoulderF, spade.h2, false);
  drawHead(ctx, hx, hy, p.glow);
  drawFist(ctx, spade.h1, true);
  drawFist(ctx, spade.h2, false);

  drawFalling(ctx, topX, top, hx, hy, hemY, feet, p);
  if (p.burst !== 0) drawBurst(ctx, spade.tip, feet, p.burst);
}

function spadeGeom(h1: Point, angle: number): SpadeGeom {
  const r = (angle * Math.PI) / 180;
  const dir: Point = { x: Math.sin(r), y: Math.cos(r) };
  const at = (s: number): Point => ({
    x: Math.round(h1.x + dir.x * s),
    y: Math.round(h1.y + dir.y * s),
  });
  return { h1, h2: at(8), end: at(-HANDLE_LEN), shaftEnd: at(SHAFT_LEN), tip: at(SPADE_LEN), dir };
}

/** Cabo de madeira com alça em D e lâmina larga de ferro enferrujado, de ponta gasta e clara. */
function drawSpade(ctx: Ctx, s: SpadeGeom): void {
  linePx(ctx, WOOD_DARK, s.end.x, s.end.y, s.shaftEnd.x, s.shaftEnd.y, 2);
  linePx(ctx, WOOD_LIGHT, s.end.x, s.end.y, s.shaftEnd.x, s.shaftEnd.y, 1);
  // Alça: travessa curta no fim do cabo
  const px = s.dir.y; // perpendicular ao eixo
  const py = -s.dir.x;
  linePx(
    ctx,
    WOOD,
    Math.round(s.end.x - px * 3),
    Math.round(s.end.y - py * 3),
    Math.round(s.end.x + px * 3),
    Math.round(s.end.y + py * 3),
    2,
  );

  for (let t = 0; t <= BLADE_HALF.length - 0.5; t += 0.5) {
    const half = BLADE_HALF[Math.min(BLADE_HALF.length - 1, Math.floor(t))] ?? 2;
    const cx = s.h1.x + s.dir.x * (SHAFT_LEN + t);
    const cy = s.h1.y + s.dir.y * (SHAFT_LEN + t);
    for (let k = -half; k <= half; k += 0.5) {
      const x = Math.round(cx + px * k);
      const y = Math.round(cy + py * k);
      let color = RUST;
      if (t < 2 || Math.abs(k) > half - 1) color = RUST_DARK;
      else if (t > 8.5) color = STEEL;
      else if (k < -half / 2) color = RUST_LIGHT;
      else if (Math.abs(k) < 0.5 && t < 7)
        color = RUST_DARK; // nervura central
      else if ((x * 3 + y * 5) % 7 === 0) color = RUST_DARK; // ferrugem
      fillPx(ctx, color, x, y, 1, 1);
    }
  }
}

/** Mão enorme, pálida, de dedos longos fechados no cabo. */
function drawFist(ctx: Ctx, at: Point, back: boolean): void {
  const x = at.x - 4;
  const y = at.y - 3;
  const skin = back ? HAND_BACK : HAND;
  fillPx(ctx, skin, x + 1, y, 6, 1); // cantos cortados: punho redondo
  fillPx(ctx, skin, x, y + 1, 8, 5);
  fillPx(ctx, skin, x + 1, y + 6, 7, 1);
  fillPx(ctx, HAND_LIGHT, x + 1, y, 6, 1);
  fillPx(ctx, HAND_DARK, x + 7, y + 1, 1, 6);
  fillPx(ctx, HAND_DARK, x + 1, y + 6, 7, 1);
  for (const fx of [x + 2, x + 4]) fillPx(ctx, HAND_DARK, fx, y + 2, 1, 4); // dedos fechados
  fillPx(ctx, HAND_LIGHT, x + 1, y + 1, 1, 2); // junta do polegar
  fillPx(ctx, HAND_LIGHT, x + 3, y + 1, 1, 1);
  fillPx(ctx, HAND_LIGHT, x + 5, y + 1, 1, 1);
}

/** Braço de manga larga com punho esfarrapado; o de trás fica mais escuro. */
function drawArm(ctx: Ctx, shoulder: Point, hand: Point, back: boolean): void {
  const elbow: Point = {
    x: Math.round((shoulder.x + hand.x) / 2) - 2,
    y: Math.round((shoulder.y + hand.y) / 2) + 3,
  };
  const sleeve = back ? COAT_DARK : COAT;
  linePx(ctx, sleeve, shoulder.x - 2, shoulder.y - 1, elbow.x - 2, elbow.y - 1, 5);
  linePx(ctx, sleeve, elbow.x - 2, elbow.y - 1, hand.x - 2, hand.y - 2, 5);
  if (!back) {
    linePx(ctx, COAT_LIGHT, shoulder.x - 2, shoulder.y - 1, elbow.x - 2, elbow.y - 1, 1);
    linePx(ctx, COAT_LIGHT, elbow.x - 2, elbow.y - 1, hand.x - 2, hand.y - 2, 1);
  }
  fillPx(ctx, COAT_DARK, hand.x - 4, hand.y - 5, 6, 1); // punho
  fillPx(ctx, COAT_DARK, hand.x - 4, hand.y - 4, 1, 2); // trapo do punho
}

/** Pernas de calça escura e botas pesadas cobertas de lama; arrasta o pé de trás. */
function drawLegs(ctx: Ctx, hipX: number, hipY: number, feet: number, p: CoveiroPose): void {
  if (p.kneel === 1) {
    // Ajoelhado: a canela de trás deitada no chão e a bota da frente apoiada
    fillPx(ctx, PANTS, hipX - 14, feet - 4, 14, 3);
    fillPx(ctx, BOOT_DARK, hipX - 20, feet - 5, 7, 5);
    fillPx(ctx, MUD, hipX - 20, feet - 2, 7, 2);
    fillPx(ctx, PANTS, hipX + 2, feet - 8, 6, 4);
    fillPx(ctx, BOOT, hipX + 1, feet - 4, 11, 4);
    fillPx(ctx, MUD, hipX + 1, feet - 2, 11, 2);
    fillPx(ctx, MUD_LIGHT, hipX + 4, feet - 2, 2, 1);
    return;
  }
  const leg = (x: number, off: number, lift: number, shade: boolean): void => {
    const x0 = x + off;
    const bottom = feet - lift;
    const legTop = hipY + 4;
    fillPx(ctx, shade ? COAT_DARK : PANTS, x0, legTop, 6, bottom - legTop - 3);
    const boot = shade ? BOOT_DARK : BOOT;
    fillPx(ctx, boot, x0 - 1, bottom - 6, 8, 3); // cano
    fillPx(ctx, boot, x0 - 1, bottom - 3, 11, 3); // pé com bico
    fillPx(ctx, MUD, x0 - 1, bottom - 2, 11, 2);
    fillPx(ctx, MUD_LIGHT, x0 + 2, bottom - 2, 2, 1);
    fillPx(ctx, MUD, x0 - 1, bottom - 5, 3, 2); // lama espirrada no cano
  };
  leg(hipX - 9, p.legB, p.liftB, true);
  leg(hipX, p.legF, p.liftF, false);
}

/** Casaco comprido: ombros curvados (corcunda atrás), mangas largas e barra em tiras rasgadas. */
function drawCoat(
  ctx: Ctx,
  topX: number,
  hipX: number,
  top: number,
  hipY: number,
  hemY: number,
  feet: number,
): { left: number; right: number } {
  const bodyBottom = hemY - 2;
  let left = topX;
  let right = topX;
  // Corcunda
  fillPx(ctx, COAT, topX - 12, top - 4, 7, 4);
  fillPx(ctx, COAT_LIGHT, topX - 11, top - 4, 4, 1);
  fillPx(ctx, COAT, topX - 15, top - 1, 4, 5);
  fillPx(ctx, COAT, topX - 5, top - 2, 3, 2);
  for (let y = top; y < bodyBottom; y++) {
    const t = (y - top) / Math.max(1, bodyBottom - top - 1);
    const c = topX + (hipX - topX) * t;
    const half = Math.round(9 + t * 3);
    left = Math.round(c) - half - Math.round((1 - t) * 3);
    right = Math.round(c) + half;
    fillPx(ctx, COAT, left, y, right - left, 1);
    fillPx(ctx, COAT_LIGHT, left, y, 2, 1);
    fillPx(ctx, COAT_DARK, right - 3, y, 3, 1);
    if ((y * 5 + 3) % 7 < 2) fillPx(ctx, COAT_DARK, left + 5 + ((y * 3) % 5), y, 1, 1); // dobras
    if (y % 5 === 0) fillPx(ctx, BONE_DARK, right - 6, y, 1, 1); // botões
  }
  // Remendos de terra e um rasgão
  fillPx(ctx, DIRT_DARK, topX - 7, top + 7, 4, 3);
  fillPx(ctx, DIRT, topX - 7, top + 7, 3, 2);
  fillPx(ctx, DIRT_DARK, topX + 1, top + 11, 3, 2);
  fillPx(ctx, COAT_DARK, topX - 2, top + 5, 1, 4);

  // Barra em tiras de tamanhos diferentes
  const hemLeft = left;
  const strips = Math.ceil((right - left) / 3);
  for (let i = 0; i < strips; i++) {
    const x = hemLeft + i * 3;
    const len = Math.min(2 + ((i * 7 + 3) % 4), feet - 1 - bodyBottom);
    const w = Math.min(3, right - x);
    fillPx(ctx, i % 2 === 0 ? COAT : COAT_DARK, x, bodyBottom, w, len);
    if (i % 3 === 0) fillPx(ctx, COAT_LIGHT, x, bodyBottom, 1, 1);
  }
  void hipY;
  return { left, right };
}

/** Cinto de couro com segmentos de osso e ossinhos pendurados. */
function drawBelt(ctx: Ctx, edge: { left: number; right: number }, hipY: number): void {
  const y = hipY - 1;
  fillPx(ctx, LEATHER, edge.left, y, edge.right - edge.left, 2);
  for (let x = edge.left + 1; x < edge.right - 2; x += 4) {
    fillPx(ctx, BONE, x, y, 3, 2);
    fillPx(ctx, BONE_DARK, x + 2, y + 1, 1, 1);
  }
  for (const [dx, len] of [
    [3, 3],
    [9, 4],
    [edge.right - edge.left - 5, 3],
  ] as const) {
    fillPx(ctx, BONE, edge.left + dx, y + 2, 1, len);
    fillPx(ctx, BONE_DARK, edge.left + dx - 1, y + 2 + len, 3, 1);
  }
}

/** Lampião de ferro pendurado por uma corrente, com a chama fraca âmbar. */
function drawLantern(ctx: Ctx, lx: number, hipY: number, feet: number): void {
  const ly = Math.min(hipY + 4, feet - 7);
  fillPx(ctx, PALETTE.ember, lx - 2, ly + 2, 9, 8, 0.16);
  if (ly - (hipY + 1) > 0) fillPx(ctx, CHAIN, lx + 2, hipY + 1, 1, ly - (hipY + 1));
  fillPx(ctx, LAMP_FRAME, lx + 1, ly, 3, 1);
  fillPx(ctx, LAMP_FRAME, lx, ly + 1, 5, 1);
  fillPx(ctx, LAMP_FRAME, lx, ly + 2, 1, 4);
  fillPx(ctx, LAMP_FRAME, lx + 4, ly + 2, 1, 4);
  fillPx(ctx, PALETTE.ember, lx + 1, ly + 2, 3, 4);
  fillPx(ctx, PALETTE.glow, lx + 2, ly + 3, 1, 2);
  fillPx(ctx, LAMP_FRAME, lx, ly + 6, 5, 1);
}

/** Cabeça de chapéu largo e rosto liso, sem feições, só os dois olhos acesos sob a aba. */
function drawHead(ctx: Ctx, hx: number, hy: number, glow: 0 | 1 | 2): void {
  // Rosto
  fillPx(ctx, SKIN, hx - 4, hy, 9, 8);
  fillPx(ctx, SKIN, hx - 3, hy + 8, 7, 1);
  fillPx(ctx, SKIN_SHADE, hx + 3, hy + 2, 2, 6);
  fillPx(ctx, SKIN_SHADE, hx - 3, hy + 7, 6, 1);
  fillPx(ctx, SKIN_DARK, hx - 4, hy, 9, 1);
  fillPx(ctx, SKIN_SHADE, hx - 4, hy + 1, 9, 1);
  fillPx(ctx, HAND_LIGHT, hx - 3, hy + 4, 2, 2);
  // Olhos
  if (glow === 2) fillPx(ctx, EYE_HALO, hx - 5, hy + 1, 11, 5, 0.3);
  for (const ex of [hx - 3, hx + 1]) {
    fillPx(ctx, SKIN_DARK, ex, hy + 2, 3, 2);
    if (glow === 0) continue;
    fillPx(ctx, EYE, ex, hy + 2, glow === 2 ? 3 : 2, 2);
    fillPx(ctx, EYE_CORE, ex + (glow === 2 ? 1 : 0), hy + 2, 1, 1);
  }
  // Copa do chapéu, com buraco e topo rasgado
  fillPx(ctx, HAT, hx - 5, hy - 6, 11, 4);
  fillPx(ctx, HAT, hx - 4, hy - 7, 3, 1);
  fillPx(ctx, HAT, hx + 1, hy - 7, 4, 1);
  fillPx(ctx, HAT_LIGHT, hx - 5, hy - 6, 3, 3);
  fillPx(ctx, HAT_DARK, hx + 2, hy - 5, 2, 1);
  fillPx(ctx, HAT_BAND, hx - 5, hy - 3, 11, 1);
  // Aba larga, caída e roída nas pontas
  fillPx(ctx, HAT, hx - 10, hy - 2, 21, 2);
  fillPx(ctx, HAT_LIGHT, hx - 10, hy - 2, 7, 1);
  fillPx(ctx, HAT_DARK, hx - 3, hy - 1, 14, 1);
  fillPx(ctx, HAT, hx - 10, hy, 3, 1);
  fillPx(ctx, HAT, hx + 7, hy, 4, 1);
  fillPx(ctx, HAT_DARK, hx + 9, hy - 2, 1, 1);
}

/** Terra caindo do casaco, vermes pendurados na barra e na aba. */
function drawFalling(
  ctx: Ctx,
  topX: number,
  top: number,
  hx: number,
  hy: number,
  hemY: number,
  feet: number,
  p: CoveiroPose,
): void {
  for (let i = 0; i < CLODS.length; i++) {
    const clod = CLODS[i];
    if (!clod) continue;
    const y = top + ((clod[1] + p.fall * 3) % 36);
    if (y >= feet - 2) continue;
    fillPx(ctx, i % 2 === 0 ? DIRT : DIRT_LIGHT, topX + clod[0], y, 2, 2);
  }
  const worm = (x: number, y: number, len: number): void => {
    if (y + len >= feet - 1) return;
    fillPx(ctx, WORM, x, y, 1, len);
    fillPx(ctx, WORM_DARK, x + ((p.fall + len) % 2), y + len - 1, 1, 1);
  };
  worm(hx - 8 + p.sway, hy + 1, 4);
  worm(topX - 5 + p.sway, hemY + 2, 3);
  worm(topX + 9, hemY + 1, 3);
}

/** Terra lançada para cima no ponto onde a lâmina bate no chão. */
function drawBurst(ctx: Ctx, tip: Point, feet: number, amount: 1 | 2): void {
  const x0 = Math.min(tip.x, WIDTH - 15); // a terra não pode vazar do quadro
  const ground = feet - 1;
  fillPx(ctx, DIRT_DARK, x0 - 6, ground - 1, 14, 2);
  fillPx(ctx, DIRT, x0 - 5, ground - 2, 11, 1);
  const bits: readonly (readonly [number, number, number])[] = [
    [-7, 5, 2],
    [6, 6, 2],
    [-3, 8, 1],
    [3, 10, 2],
    [-10, 3, 1],
    [10, 4, 1],
  ];
  const count = amount === 2 ? bits.length : 3;
  for (let i = 0; i < count; i++) {
    const bit = bits[i];
    if (!bit) continue;
    fillPx(
      ctx,
      i % 2 === 0 ? DIRT_LIGHT : DIRT,
      x0 + bit[0],
      ground - bit[1] - 1,
      bit[2] + 1,
      bit[2],
    );
  }
}

/** Desabado: um monte de casaco com a pá cravada no chão como lápide e o chapéu pendurado nela. */
function drawCollapsed(ctx: Ctx, p: CoveiroPose): void {
  const feet = FEET;
  const base = CX - 3;

  // Pá cravada à frente, com o chapéu no cabo
  const spade = spadeGeom({ x: base + 24, y: feet - 33 }, p.angle);
  drawSpade(ctx, spade);
  const hat = spade.end;
  fillPx(ctx, HAT, hat.x - 3, hat.y - 4, 8, 3);
  fillPx(ctx, HAT_LIGHT, hat.x - 3, hat.y - 4, 3, 1);
  fillPx(ctx, HAT_BAND, hat.x - 3, hat.y - 2, 8, 1);
  fillPx(ctx, HAT, hat.x - 8, hat.y - 1, 18, 2);
  fillPx(ctx, HAT_DARK, hat.x - 2, hat.y, 11, 1);

  // Botas esticadas atrás e o lampião caído, quase apagado
  fillPx(ctx, BOOT_DARK, base - 23, feet - 5, 8, 5);
  fillPx(ctx, MUD, base - 23, feet - 2, 8, 2);
  fillPx(ctx, PANTS, base - 16, feet - 4, 7, 3);
  fillPx(ctx, PALETTE.ember, base - 11, feet - 12, 9, 7, 0.14);
  fillPx(ctx, LAMP_FRAME, base - 10, feet - 10, 7, 5);
  fillPx(ctx, PALETTE.ember, base - 9, feet - 9, 5, 3, 0.75);
  fillPx(ctx, LAMP_FRAME, base - 10, feet - 6, 7, 1);

  // Monte do casaco: sobe do chão até a corcunda
  for (let i = 0; i < 17; i++) {
    const y = feet - 17 + i;
    const half = Math.min(15, 4 + Math.round(i * 0.9));
    const x0 = base - half + 2;
    fillPx(ctx, COAT, x0, y, half * 2, 1);
    fillPx(ctx, COAT_LIGHT, x0, y, 2, 1);
    fillPx(ctx, COAT_DARK, x0 + half * 2 - 3, y, 3, 1);
    if ((y * 3) % 5 < 2) fillPx(ctx, COAT_DARK, x0 + 4 + ((y * 7) % 9), y, 1, 1);
  }
  fillPx(ctx, LEATHER, base - 9, feet - 7, 15, 2);
  for (let x = base - 8; x < base + 5; x += 4) fillPx(ctx, BONE, x, feet - 7, 3, 2);
  fillPx(ctx, BONE, base - 3, feet - 5, 1, 3); // ossinhos pendurados
  fillPx(ctx, BONE, base + 3, feet - 5, 1, 2);
  fillPx(ctx, DIRT, base - 6, feet - 12, 4, 2);
  fillPx(ctx, DIRT_DARK, base + 4, feet - 10, 3, 2);

  // Cabeça pelada tombada para a frente, de olhos apagados, e as mãos caídas no chão
  const hx = base + 13;
  fillPx(ctx, SKIN, hx - 3, feet - 10, 8, 8);
  fillPx(ctx, SKIN_SHADE, hx + 3, feet - 9, 2, 7);
  fillPx(ctx, SKIN_DARK, hx - 3, feet - 3, 8, 1);
  fillPx(ctx, HAND_LIGHT, hx - 2, feet - 9, 2, 2);
  fillPx(ctx, SKIN_DARK, hx, feet - 7, 3, 2);
  fillPx(ctx, HAND, base + 12, feet - 5, 9, 4);
  fillPx(ctx, HAND_DARK, base + 12, feet - 2, 9, 1);
  fillPx(ctx, HAND_DARK, base + 15, feet - 5, 1, 3);
  fillPx(ctx, HAND_DARK, base + 17, feet - 5, 1, 3);

  // Terra no pé da pá e vermes saindo do monte
  if (p.burst !== 0) drawBurst(ctx, spade.tip, feet, 1);
  fillPx(ctx, WORM, base - 9, feet - 20, 1, 3);
  fillPx(ctx, WORM, base + 6, feet - 15, 1, 3);
  fillPx(ctx, WORM_DARK, base + 7, feet - 13, 1, 1);
}
