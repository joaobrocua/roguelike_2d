import { PALETTE } from '../data/palette';
import type { CarrascoPose } from '../data/carrascoSprites';
import { CARRASCO_SHEET } from '../data/carrascoSprites';
import { CARRASCO_EM_CHAMAS } from '../data/miniBosses';
import { fillPx, linePx } from './pixelSheet';

/**
 * O Carrasco em Chamas em pixel art: um gigante de capuz de pano negro com duas fendas de olho
 * em brasa, torso largo e chamuscado com avental de couro e tiras, braços enormes, calça rasgada,
 * botas pesadas, correntes na cintura e um machadão de lâmina larga que arde em brasa, com
 * chamas lambendo os ombros e a lâmina. As poses ficam em src/data/carrascoSprites.ts.
 * O quadro é o corpo de colisão (28 x 46) mais a folga de `pad`; o desenho fica no centro e os
 * pés na base do corpo de colisão.
 */
type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

const HOOD = 0x1a1c27;
const HOOD_DARK = 0x0d0e15;
const HOOD_LIGHT = 0x2f3347;
const FACE_VOID = 0x050509;

const SKIN = 0x96604a;
const SKIN_DARK = 0x5a352b;
const SKIN_LIGHT = 0xbb8465;
const SOOT = 0x241c1e;

const LEATHER = 0x45291a;
const LEATHER_DARK = 0x26160d;
const LEATHER_LIGHT = 0x66401f;
const SCORCH = 0x17110e;

const CLOTH = 0x2f2b38;
const CLOTH_DARK = 0x1a1822;
const CLOTH_LIGHT = 0x453f52;

const BOOT = 0x2a1d15;
const BOOT_LIGHT = 0x4a3524;

const IRON = 0x5c6274;
const IRON_DARK = 0x2c303d;
const IRON_LIGHT = 0x9aa3b9;

const WOOD = 0x6a4524;
const WOOD_DARK = 0x3d2711;
const WOOD_LIGHT = 0x8c6238;

const EMBER_RED = 0xb4401c;
const HOT_WHITE = 0xfff0c0;

/** Centro do quadro e linha dos pés (a base do corpo de colisão, menos 1 px para o contorno). */
const CX = CARRASCO_SHEET.pad.x + CARRASCO_EM_CHAMAS.width / 2;
const FEET = CARRASCO_SHEET.pad.y + CARRASCO_EM_CHAMAS.height - 1;

/** Cabo e lâmina do machado, medidos a partir da mão da frente ao longo do cabo. */
const AXE_BUTT = -6;
const AXE_END = 29;
const BLADE_START = 14;
const BLADE_WIDTH = [5, 8, 10, 12, 14, 15, 15, 15, 15, 15, 14, 13, 11, 8, 5] as const;

/** Alturas das línguas de fogo; cada quadro começa num ponto da tabela (a tremulação). */
const FLAME_HEIGHTS = [6, 8, 5, 7] as const;

/** Faíscas soltas em volta do tronco, relativas ao centro do ombro. */
const SPARKS = [
  [-17, -6],
  [-10, -15],
  [8, -14],
  [17, -5],
  [-4, -20],
  [13, -19],
  [-20, 3],
  [20, -13],
] as const;

export function drawCarrasco(ctx: Ctx, p: CarrascoPose): void {
  const cx = CX;
  const feet = FEET;
  const tx = cx + p.lean;
  const top = feet - 35 - p.bob;
  const hipY = top + 16;
  const shoulderF: Point = { x: tx + 11, y: top + 3 };
  const shoulderB: Point = { x: tx - 11, y: top + 3 };
  const hand = p.axe.hand;
  const handF: Point = { x: shoulderF.x + p.armF.dx, y: shoulderF.y + p.armF.dy };
  let handB: Point = { x: shoulderB.x + p.armB.dx, y: shoulderB.y + p.armB.dy };
  const grip: Point =
    hand === 'none' ? { x: cx + p.axe.x, y: feet + p.axe.y } : hand === 'back' ? handB : handF;
  if (hand === 'both') {
    // A mão de trás fica 9 px adiante no cabo; com o cabo para cima ela sobe, com ele para baixo
    // ela recua, de modo que o braço de trás nunca atravessa o peito na horizontal
    const rad = (p.axe.ang * Math.PI) / 180;
    const along = Math.sin(rad) < 0 ? 9 : -9;
    handB = {
      x: Math.round(grip.x + Math.cos(rad) * along),
      y: Math.round(grip.y + Math.sin(rad) * along),
    };
  }

  if (p.kneel === 2) {
    drawFallen(ctx, p, cx, feet, grip);
    return;
  }

  // O braço de trás fica atrás do corpo (escuro); se ele segura o cabo sozinho, o machado
  // também fica atrás, e com as duas mãos o punho dele é repintado por cima do cabo
  let bladeLow: Point | null = null;
  if (hand === 'back') bladeLow = drawAxe(ctx, grip, p.axe.ang, p.axe.flip, p.heat, p.fire);
  drawArm(ctx, shoulderB, handB, true, hand !== 'both');

  if (p.kneel === 1) drawKneelLegs(ctx, cx, feet, hipY);
  else {
    drawLeg(ctx, cx - 6, hipY, p.legB, p.liftB, feet, true);
    drawLeg(ctx, cx + 6, hipY, p.legF, p.liftF, feet, false);
  }

  drawTorso(ctx, tx, top, p.heat);
  drawBelt(ctx, tx, hipY, p.sway);
  drawApron(ctx, tx, top, hipY, p.sway);
  drawChains(ctx, tx, hipY, p.sway);

  drawHood(ctx, tx + Math.round(p.lean * 0.4) + p.droop, top - 9 + p.droop, p.heat);

  if (hand !== 'back') bladeLow = drawAxe(ctx, grip, p.axe.ang, p.axe.flip, p.heat, p.fire);

  // O punho de trás por cima do cabo e o braço da frente por cima de tudo
  if (hand === 'both') drawFist(ctx, handB, true);
  drawArm(ctx, shoulderF, handF, false, true);

  // Fogo nos ombros, brasas soltas e a pancada no chão
  if (p.heat > 0) {
    const boost = p.heat === 2 ? 2 : 0;
    const hf = (k: number): number =>
      (FLAME_HEIGHTS[(p.fire + k) % FLAME_HEIGHTS.length] ?? 6) - 1 + boost;
    flame(ctx, shoulderB.x - 3, top + 1, hf(1), 4, p.fire);
    flame(ctx, shoulderF.x + 3, top + 1, hf(2), 4, p.fire + 1);
    drawSparks(ctx, tx, top + 3, p.fire, p.heat === 2 ? 8 : 4);
  }
  if (p.impact > 0 && bladeLow) drawImpact(ctx, bladeLow, feet, p.impact, p.fire);
}

/** Um membro grosso: linha de pincel quadrado centrada nos dois pontos. */
function limb(ctx: Ctx, color: number, a: Point, b: Point, thick: number): void {
  const h = Math.floor(thick / 2);
  linePx(
    ctx,
    color,
    Math.round(a.x) - h,
    Math.round(a.y) - h,
    Math.round(b.x) - h,
    Math.round(b.y) - h,
    thick,
  );
}

/** Uma língua de fogo: base larga e clara, ponta fina e avermelhada. A base fica em (x, yBottom). */
function flame(ctx: Ctx, x: number, yBottom: number, h: number, w: number, fire: number): void {
  for (let i = 0; i < h; i++) {
    const t = i / h;
    const width = Math.max(1, Math.round(w * (1 - t * 0.85)));
    const drift = Math.round(Math.sin(fire * 1.7 + i * 0.9 + x) * (0.5 + t * 1.3));
    const x0 = x - Math.floor(width / 2) + drift;
    const y = yBottom - i;
    fillPx(ctx, t < 0.6 ? PALETTE.ember : PALETTE.blood, x0, y, width, 1, t > 0.85 ? 0.7 : 1);
    if (width >= 3 && t < 0.5) fillPx(ctx, PALETTE.glow, x0 + 1, y, width - 2, 1);
  }
}

/** Brasas e fagulhas que sobem em volta (posições fixas; `fire` as desloca de um quadro ao outro). */
function drawSparks(ctx: Ctx, x: number, y: number, fire: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const spark = SPARKS[i % SPARKS.length];
    if (!spark) continue;
    const dy = spark[1] - ((fire + i) % 3);
    fillPx(ctx, i % 2 === 0 ? PALETTE.glow : PALETTE.ember, x + spark[0], y + dy, 1, 1);
  }
}

/** Perna de calça rasgada e bota pesada; `lift` ergue o pé do chão. */
function drawLeg(
  ctx: Ctx,
  hipX: number,
  hipY: number,
  off: number,
  lift: number,
  feet: number,
  back: boolean,
): void {
  const foot: Point = { x: hipX + off, y: feet - 8 - lift };
  const cloth = back ? CLOTH_DARK : CLOTH;
  limb(ctx, cloth, { x: hipX, y: hipY + 1 }, foot, 9);
  limb(
    ctx,
    back ? CLOTH_DARK : CLOTH_LIGHT,
    { x: hipX - 3, y: hipY + 1 },
    { x: foot.x - 3, y: foot.y },
    2,
  );
  limb(ctx, CLOTH_DARK, { x: hipX + 3, y: hipY + 1 }, { x: foot.x + 3, y: foot.y }, 2);
  // Rasgo na coxa deixa ver a pele, e a barra desfiada cai sobre a bota
  if (!back) {
    fillPx(ctx, SKIN_DARK, foot.x - 3, hipY + 8, 3, 2);
    fillPx(ctx, SOOT, foot.x - 2, hipY + 10, 2, 1);
  }
  for (let i = 0; i < 5; i++)
    fillPx(ctx, CLOTH_DARK, foot.x - 4 + i * 2, foot.y + 4, 1, 1 + (i % 2));
  drawBoot(ctx, foot.x, feet - 7 - lift, back);
}

function drawBoot(ctx: Ctx, x: number, y: number, back: boolean): void {
  fillPx(ctx, back ? LEATHER_DARK : BOOT, x - 5, y, 11, 6);
  fillPx(ctx, BOOT_LIGHT, x - 5, y, 8, 1); // cano
  fillPx(ctx, back ? BOOT : BOOT_LIGHT, x + 5, y + 3, 3, 3); // bico
  fillPx(ctx, LEATHER_DARK, x - 5, y + 5, 13, 1); // sola
  fillPx(ctx, IRON_DARK, x - 1, y + 2, 4, 1); // fivela
  fillPx(ctx, IRON_LIGHT, x, y + 2, 1, 1);
}

/** Ajoelhado: a perna de trás deitada no chão, a da frente dobrada com o pé plantado. */
function drawKneelLegs(ctx: Ctx, cx: number, feet: number, hipY: number): void {
  limb(ctx, CLOTH_DARK, { x: cx - 3, y: hipY + 1 }, { x: cx - 7, y: feet - 6 }, 9);
  limb(ctx, CLOTH_DARK, { x: cx - 7, y: feet - 6 }, { x: cx - 13, y: feet - 5 }, 6);
  fillPx(ctx, LEATHER_DARK, cx - 21, feet - 8, 8, 7);
  fillPx(ctx, BOOT, cx - 21, feet - 8, 3, 7);
  limb(ctx, CLOTH, { x: cx + 2, y: hipY + 1 }, { x: cx + 11, y: hipY + 2 }, 9);
  limb(ctx, CLOTH, { x: cx + 11, y: hipY + 2 }, { x: cx + 11, y: feet - 8 }, 8);
  fillPx(ctx, CLOTH_LIGHT, cx + 7, hipY - 2, 7, 1);
  drawBoot(ctx, cx + 12, feet - 7, false);
}

/** Tronco largo, chamuscado, com ombros de músculo e brasas nas rachaduras da pele. */
function drawTorso(ctx: Ctx, tx: number, top: number, heat: 0 | 1 | 2): void {
  for (let i = 0; i < 17; i++) {
    const half = i === 0 ? 9 : i === 1 ? 12 : i < 6 ? 14 : 14 - Math.round(((i - 5) * 5) / 11);
    const x0 = tx - half;
    fillPx(ctx, SKIN, x0, top + i, half * 2, 1);
    fillPx(ctx, SKIN_DARK, x0 + half * 2 - 3, top + i, 3, 1);
    if (i > 0 && i < 10) fillPx(ctx, SKIN_LIGHT, x0, top + i, 2, 1);
    if (i > 9) fillPx(ctx, SKIN_DARK, x0, top + i, 2, 1);
  }
  // Costelas e oblíquos nos lados do avental, e fuligem em manchas
  for (const y of [8, 11, 14]) {
    fillPx(ctx, SKIN_DARK, tx - 9, top + y, 3, 1);
    fillPx(ctx, SKIN_DARK, tx + 8, top + y, 3, 1);
  }
  fillPx(ctx, SOOT, tx - 11, top + 5, 3, 2);
  fillPx(ctx, SOOT, tx + 9, top + 7, 3, 3);
  fillPx(ctx, SOOT, tx - 7, top + 12, 2, 2);
  // Ombros: dois bolas de músculo
  for (const [sx, dark] of [
    [tx - 11, true],
    [tx + 11, false],
  ] as const) {
    const widths = [5, 7, 9, 9, 9, 9, 7, 5];
    widths.forEach((w, row) => {
      const x = sx - Math.floor(w / 2);
      fillPx(ctx, dark ? SKIN_DARK : SKIN, x, top - 1 + row, w, 1);
      if (!dark && row < 3) fillPx(ctx, SKIN_LIGHT, x, top - 1 + row, Math.min(3, w), 1);
      if (row > 4) fillPx(ctx, SKIN_DARK, x + w - 2, top - 1 + row, 2, 1);
    });
    fillPx(ctx, SOOT, sx + 1, top + 3, 3, 1);
  }
  // Brasas nas rachaduras da pele queimada
  if (heat > 0) {
    const color = heat === 2 ? PALETTE.glow : PALETTE.ember;
    fillPx(ctx, color, tx - 9, top + 9, 1, 2);
    fillPx(ctx, PALETTE.ember, tx + 10, top + 12, 2, 1);
    fillPx(ctx, color, tx - 12, top + 14, 1, 1);
    fillPx(ctx, PALETTE.ember, tx + 14, top + 4, 1, 2);
  }
}

/** Cinto de couro com fivela de ferro. */
function drawBelt(ctx: Ctx, tx: number, hipY: number, sway: number): void {
  fillPx(ctx, LEATHER_DARK, tx - 10, hipY - 3, 21, 3);
  fillPx(ctx, LEATHER, tx - 10, hipY - 3, 21, 1);
  fillPx(ctx, IRON_DARK, tx + 2 + sway, hipY - 4, 6, 5);
  fillPx(ctx, IRON_LIGHT, tx + 3 + sway, hipY - 3, 4, 1);
  fillPx(ctx, IRON, tx + 3 + sway, hipY - 1, 4, 1);
}

/** Avental de couro chamuscado, preso por tiras que sobem aos ombros; barra rasgada. */
function drawApron(ctx: Ctx, tx: number, top: number, hipY: number, sway: number): void {
  const ax = tx + 2;
  const hem = hipY + 4;
  // Tiras de couro até os ombros, com rebites
  linePx(ctx, LEATHER_DARK, ax - 5, top + 5, tx - 7, top, 2);
  linePx(ctx, LEATHER_DARK, ax + 5, top + 5, tx + 8, top, 2);
  fillPx(ctx, IRON_LIGHT, tx - 7, top + 1, 1, 1);
  fillPx(ctx, IRON_LIGHT, tx + 8, top + 1, 1, 1);
  for (let y = top + 5; y < hem; y++) {
    const t = (y - top - 5) / (hem - top - 5);
    const half = 6 - Math.round(t * 1);
    fillPx(ctx, LEATHER, ax - half, y, half * 2, 1);
    fillPx(ctx, LEATHER_LIGHT, ax - half, y, 2, 1);
    fillPx(ctx, LEATHER_DARK, ax + half - 3, y, 3, 1);
  }
  // Barra desfiada e queimada, manchas de fuligem e rebites
  for (let i = 0; i < 6; i++) {
    const down = (i * 5) % 4;
    fillPx(
      ctx,
      i % 2 === 0 ? LEATHER : SCORCH,
      ax - 6 + i * 2 + (i % 3 === 0 ? sway : 0),
      hem,
      2,
      down,
    );
  }
  fillPx(ctx, SCORCH, ax - 6, top + 7, 4, 2);
  fillPx(ctx, SCORCH, ax + 2, top + 12, 3, 3);
  fillPx(ctx, SCORCH, ax - 3, hem - 4, 5, 2);
  fillPx(ctx, LEATHER_DARK, ax - 1, top + 6, 1, hem - top - 8); // costura do meio
  for (const dy of [7, 13]) {
    fillPx(ctx, IRON_LIGHT, ax - 5, top + dy, 1, 1);
    fillPx(ctx, IRON_LIGHT, ax + 4, top + dy, 1, 1);
  }
  fillPx(ctx, PALETTE.ember, ax + 3, top + 8, 1, 1);
}

/** Correntes na cintura: uma pendurada atrás com um grilhão e um laço na frente. */
function drawChains(ctx: Ctx, tx: number, hipY: number, sway: number): void {
  const x = tx - 8;
  for (let i = 0; i < 9; i++) {
    const dx = Math.round((sway * i) / 4) + (i % 2) * 2;
    fillPx(ctx, i % 2 === 0 ? IRON_LIGHT : IRON, x + dx, hipY + i, i % 2 === 0 ? 2 : 1, 1);
    fillPx(ctx, IRON_DARK, x + dx + (i % 2 === 0 ? 2 : 1), hipY + i, 1, 1);
  }
  const endX = x + Math.round((sway * 9) / 4) + 1;
  fillPx(ctx, IRON, endX - 1, hipY + 9, 4, 4); // grilhão
  fillPx(ctx, IRON_DARK, endX, hipY + 10, 2, 2);
  fillPx(ctx, IRON_LIGHT, endX - 1, hipY + 9, 4, 1);
  const loop = [
    [4, 0],
    [5, 1],
    [6, 2],
    [7, 2],
    [8, 1],
    [9, 0],
  ] as const;
  for (const [dx, dy] of loop)
    fillPx(ctx, (dx + dy) % 2 === 0 ? IRON_LIGHT : IRON, tx + dx, hipY + dy, 1, 1);
}

/** Capuz de pano negro: bico caído, rosto vazio e duas fendas de olho em brasa. */
function drawHood(ctx: Ctx, hx: number, hy: number, heat: 0 | 1 | 2): void {
  // Pano do capuz: ponta caída para trás, boca larga e golas pendendo nos ombros
  fillPx(ctx, HOOD, hx - 3, hy, 5, 1);
  fillPx(ctx, HOOD, hx - 5, hy + 1, 8, 1);
  fillPx(ctx, HOOD, hx - 6, hy + 2, 11, 1);
  fillPx(ctx, HOOD, hx - 7, hy + 3, 14, 7);
  fillPx(ctx, HOOD, hx - 9, hy + 9, 18, 2);
  fillPx(ctx, HOOD_LIGHT, hx - 5, hy + 1, 4, 1);
  fillPx(ctx, HOOD_LIGHT, hx - 7, hy + 3, 1, 6);
  fillPx(ctx, HOOD_LIGHT, hx - 9, hy + 9, 3, 1);
  fillPx(ctx, HOOD_DARK, hx - 4, hy + 4, 1, 5);
  fillPx(ctx, HOOD_DARK, hx - 2, hy + 6, 1, 3);
  fillPx(ctx, HOOD_DARK, hx + 4, hy + 9, 5, 2);
  fillPx(ctx, HOOD_DARK, hx + 5, hy + 4, 2, 5);
  // Rosto: um vazio fundo sob a borda do capuz
  fillPx(ctx, HOOD_LIGHT, hx - 1, hy + 3, 7, 1);
  fillPx(ctx, FACE_VOID, hx - 1, hy + 4, 7, 5);
  if (heat === 2) fillPx(ctx, PALETTE.ember, hx - 3, hy + 3, 12, 7, 0.22);
  // Olhos: fendas acesas
  if (heat === 0) {
    fillPx(ctx, PALETTE.bloodDark, hx, hy + 6, 2, 1);
    fillPx(ctx, PALETTE.bloodDark, hx + 3, hy + 6, 2, 1);
    return;
  }
  const h = heat === 2 ? 2 : 1;
  for (const ex of [hx, hx + 3]) {
    fillPx(ctx, PALETTE.ember, ex, hy + 5, 2, h + 1);
    fillPx(ctx, heat === 2 ? HOT_WHITE : PALETTE.glow, ex + 1, hy + 5, 1, h);
  }
}

/** Um braço enorme: ombro grosso, cotovelo para fora, braçadeira de ferro e punho enfaixado. */
function drawArm(ctx: Ctx, s: Point, h: Point, back: boolean, withFist: boolean): void {
  const raised = h.y < s.y + 2;
  const e: Point = {
    x: Math.round((s.x + h.x) / 2) + (raised ? (back ? -3 : 2) : 1),
    y: Math.round((s.y + h.y) / 2) + (raised ? 5 : 1),
  };
  limb(ctx, back ? SKIN_DARK : SKIN, s, e, 7);
  limb(ctx, back ? SKIN_DARK : SKIN, e, h, 6);
  if (!back) {
    limb(ctx, SKIN_LIGHT, { x: s.x - 2, y: s.y - 2 }, { x: e.x - 2, y: e.y - 2 }, 2);
    limb(ctx, SKIN_DARK, { x: s.x + 2, y: s.y + 2 }, { x: e.x + 2, y: e.y + 2 }, 2);
    limb(ctx, SKIN_DARK, { x: e.x + 2, y: e.y + 2 }, { x: h.x + 2, y: h.y + 2 }, 2);
  }
  const b: Point = {
    x: Math.round(e.x + (h.x - e.x) * 0.55),
    y: Math.round(e.y + (h.y - e.y) * 0.55),
  };
  fillPx(ctx, IRON_DARK, b.x - 3, b.y - 2, 6, 4);
  fillPx(ctx, back ? IRON : IRON_LIGHT, b.x - 3, b.y - 2, 6, 1);
  fillPx(ctx, IRON, b.x - 3, b.y + 1, 6, 1);
  if (withFist) drawFist(ctx, h, back);
}

/** Punho enfaixado de couro. */
function drawFist(ctx: Ctx, h: Point, back: boolean): void {
  fillPx(ctx, back ? LEATHER_DARK : LEATHER, h.x - 3, h.y - 3, 6, 6);
  fillPx(ctx, back ? SKIN_DARK : SKIN_LIGHT, h.x - 3, h.y - 3, 6, 1);
  fillPx(ctx, LEATHER_DARK, h.x - 3, h.y + 1, 6, 2);
  fillPx(ctx, back ? LEATHER : LEATHER_LIGHT, h.x - 2, h.y - 1, 4, 1);
}

/**
 * O machadão: cabo de madeira com argola de ferro, lâmina larga em meia-lua que esquenta da
 * ferragem escura até a ponta incandescente, e uma ponta traseira. O cabo gira em `ang` graus em
 * torno da empunhadura. Devolve o ponto mais baixo da lâmina (onde ela acerta o chão).
 */
function drawAxe(
  ctx: Ctx,
  grip: Point,
  ang: number,
  flip: boolean,
  heat: 0 | 1 | 2,
  fire: number,
): Point {
  const rad = (ang * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const side = flip ? -1 : 1;
  const pixels = new Map<string, { x: number; y: number; color: number }>();
  const blade: Point[] = [];
  const put = (u: number, v: number, color: number, isBlade = false): void => {
    const x = Math.round(grip.x + u * c - v * side * s);
    const y = Math.round(grip.y + u * s + v * side * c);
    pixels.set(`${x},${y}`, { x, y, color });
    if (isBlade) blade.push({ x, y });
  };
  const span = (
    u0: number,
    u1: number,
    v0: number,
    v1: number,
    color: (u: number, v: number) => number,
    isBlade = false,
  ): void => {
    for (let u = u0; u <= u1; u += 0.5) {
      for (let v = v0; v <= v1; v += 0.5) put(u, v, color(u, v), isBlade);
    }
  };

  // Cabo, com a argola de ferro sob a lâmina e a tampa na ponta de baixo
  span(AXE_BUTT, AXE_END - 2, -1, 1, (_u, v) =>
    v < -0.5 ? WOOD_LIGHT : v > 0.5 ? WOOD_DARK : WOOD,
  );
  span(AXE_BUTT, AXE_BUTT + 1, -1.5, 1.5, () => IRON);
  span(BLADE_START - 2, BLADE_START - 1, -1.5, 1.5, (_u, v) => (v < 0 ? IRON_LIGHT : IRON_DARK));

  // Ponta traseira da lâmina (o contrapeso)
  span(BLADE_START + 5, BLADE_START + 9, -3, -1.5, (u) =>
    u > BLADE_START + 8 ? IRON_LIGHT : IRON_DARK,
  );

  // Lâmina larga: a ponta de fora brilha em brasa e o fio é quase branco
  BLADE_WIDTH.forEach((w, k) => {
    const u0 = BLADE_START + k;
    span(u0, u0 + 0.5, 1.5, w, (_u, v) => bladeColor(v / w, v >= w - 1, heat), true);
  });
  span(BLADE_START, AXE_END, 0.5, 1.5, () => IRON_DARK);

  let low: Point = { x: grip.x, y: grip.y };
  for (const q of blade) if (q.y > low.y || (q.y === low.y && q.x > low.x)) low = q;
  for (const px of pixels.values()) fillPx(ctx, px.color, px.x, px.y, 1, 1);

  // Chamas lambendo a lâmina: três línguas nascem do alto dela
  if (heat > 0 && blade.length > 0) {
    const topAt = new Map<number, number>();
    for (const q of blade) topAt.set(q.x, Math.min(topAt.get(q.x) ?? q.y, q.y));
    const xs = [...topAt.keys()].sort((a, b) => a - b);
    [0.2, 0.5, 0.82].forEach((frac, i) => {
      const x = xs[Math.floor((xs.length - 1) * frac)];
      if (x === undefined) return;
      const h =
        (FLAME_HEIGHTS[(fire + i * 2) % FLAME_HEIGHTS.length] ?? 6) - 1 + (heat === 2 ? 1 : 0);
      flame(ctx, x, (topAt.get(x) ?? grip.y) - 1, h, 3, fire + i);
    });
  }
  return low;
}

/** Cor de um ponto da lâmina; `f` vai de 0 (junto do cabo) a 1 (o fio). */
function bladeColor(f: number, edge: boolean, heat: 0 | 1 | 2): number {
  if (heat === 0) return edge ? PALETTE.bloodDark : f < 0.5 ? IRON_DARK : IRON;
  if (heat === 1) {
    if (edge) return PALETTE.glow;
    return f < 0.35 ? IRON : f < 0.55 ? PALETTE.bloodDark : f < 0.75 ? EMBER_RED : PALETTE.ember;
  }
  if (edge) return HOT_WHITE;
  return f < 0.35 ? IRON : f < 0.5 ? EMBER_RED : f < 0.72 ? PALETTE.ember : PALETTE.glow;
}

/** Faíscas, lascas de pedra e rachaduras onde a lâmina bate (ou as brasas que ficam depois). */
function drawImpact(ctx: Ctx, at: Point, feet: number, kind: number, fire: number): void {
  const ground = feet - 1;
  if (kind === 1) {
    fillPx(ctx, PALETTE.glow, at.x - 5, ground, 11, 1, 0.85);
    fillPx(ctx, PALETTE.ember, at.x - 7, ground, 2, 1);
    fillPx(ctx, PALETTE.ember, at.x + 6, ground, 2, 1);
    const bits = [
      [-6, -5],
      [-3, -9],
      [2, -12],
      [6, -8],
      [8, -3],
      [-9, -2],
      [4, -5],
      [0, -6],
    ] as const;
    bits.forEach(([dx, dy], i) => {
      fillPx(
        ctx,
        i % 2 === 0 ? PALETTE.glow : PALETTE.ember,
        at.x + dx,
        ground + dy - (fire % 2),
        i % 3 === 0 ? 2 : 1,
        1,
      );
    });
    for (const [dx, dy] of [
      [-4, -3],
      [5, -6],
      [9, -1],
    ] as const) {
      fillPx(ctx, PALETTE.stoneLight, at.x + dx, ground + dy, 2, 2);
    }
    linePx(ctx, SCORCH, at.x + 5, ground, at.x + 9, ground, 1);
    return;
  }
  // Depois da pancada: rachadura no chão e brasas sobrando
  linePx(ctx, SCORCH, at.x + 2, ground, at.x + 8, ground, 1);
  for (const [dx, dy] of [
    [-3, -4],
    [1, -8],
    [5, -3],
    [-6, -1],
  ] as const) {
    fillPx(
      ctx,
      (dx + dy) % 2 === 0 ? PALETTE.ember : PALETTE.glow,
      at.x + dx,
      ground + dy - (fire % 2),
      1,
      1,
    );
  }
}

/**
 * Caído de bruços, de lado: botas de sola para cima à esquerda, as costas chamuscadas com as
 * tiras do avental, o capuz no chão, um braço esticado à frente e o machado largado adiante.
 */
function drawFallen(ctx: Ctx, p: CarrascoPose, cx: number, feet: number, grip: Point): void {
  // Machado deitado à frente, com a lâmina para cima (por trás do corpo)
  drawAxe(ctx, grip, p.axe.ang, p.axe.flip, p.heat, p.fire);

  // Pernas esticadas para trás e botas de sola para cima
  fillPx(ctx, CLOTH_DARK, cx - 28, feet - 8, 15, 7);
  fillPx(ctx, CLOTH, cx - 28, feet - 12, 15, 5);
  fillPx(ctx, CLOTH_LIGHT, cx - 26, feet - 12, 12, 1);
  fillPx(ctx, CLOTH_DARK, cx - 22, feet - 6, 2, 1);
  fillPx(ctx, LEATHER_DARK, cx - 36, feet - 11, 8, 10);
  fillPx(ctx, BOOT, cx - 36, feet - 11, 3, 10);
  fillPx(ctx, IRON_DARK, cx - 33, feet - 7, 4, 1);
  fillPx(ctx, LEATHER_DARK, cx - 31, feet - 3, 3, 2); // salto
  // Quadril com o cinto de lado e a corrente solta no chão
  fillPx(ctx, CLOTH, cx - 14, feet - 12, 5, 11);
  fillPx(ctx, LEATHER_DARK, cx - 12, feet - 13, 3, 13);
  fillPx(ctx, IRON_LIGHT, cx - 11, feet - 9, 1, 3);
  for (let i = 0; i < 7; i++) {
    fillPx(ctx, i % 2 === 0 ? IRON_LIGHT : IRON, cx - 22 + i * 2, feet - 1 - (i % 2), 1, 1);
  }
  // Costas: pele queimada, ombro erguido, tiras de couro em X e brasas morrendo
  for (let x = cx - 9; x <= cx + 8; x++) {
    const yTop = feet - 13 - Math.floor((x - (cx - 9)) * 0.2);
    fillPx(ctx, SKIN, x, yTop, 1, feet - 1 - yTop);
    fillPx(ctx, SKIN_LIGHT, x, yTop, 1, 1);
    fillPx(ctx, SKIN_DARK, x, feet - 4, 1, 3);
  }
  fillPx(ctx, SKIN_LIGHT, cx + 1, feet - 17, 7, 3);
  fillPx(ctx, SKIN, cx + 1, feet - 14, 7, 2);
  linePx(ctx, LEATHER_DARK, cx - 8, feet - 12, cx + 3, feet - 4, 1);
  linePx(ctx, LEATHER_DARK, cx - 8, feet - 5, cx + 3, feet - 13, 1);
  fillPx(ctx, SOOT, cx - 5, feet - 9, 4, 3);
  fillPx(ctx, SOOT, cx + 3, feet - 11, 3, 2);
  fillPx(ctx, PALETTE.ember, cx - 2, feet - 6, 1, 1);
  fillPx(ctx, PALETTE.bloodDark, cx + 5, feet - 9, 2, 1);

  // Braço esticado à frente, com a braçadeira e o punho aberto no chão
  limb(ctx, SKIN, { x: cx + 4, y: feet - 9 }, { x: cx + 14, y: feet - 4 }, 6);
  limb(ctx, SKIN, { x: cx + 14, y: feet - 4 }, { x: cx + 24, y: feet - 4 }, 5);
  limb(ctx, SKIN_DARK, { x: cx + 14, y: feet - 2 }, { x: cx + 24, y: feet - 2 }, 2);
  fillPx(ctx, IRON_DARK, cx + 17, feet - 7, 3, 5);
  fillPx(ctx, IRON, cx + 17, feet - 7, 3, 1);
  fillPx(ctx, LEATHER, cx + 24, feet - 7, 5, 6);
  fillPx(ctx, LEATHER_DARK, cx + 24, feet - 2, 5, 1);
  fillPx(ctx, SKIN_DARK, cx + 28, feet - 5, 1, 3);

  // Capuz tombado de lado no chão, com os olhos apagados
  const hx = cx + 10;
  const rows = [8, 12, 14, 14, 14, 14, 13, 11, 9];
  rows.forEach((w, i) => {
    const y = feet - 10 + i;
    fillPx(ctx, HOOD, hx - 3, y, w, 1);
    fillPx(ctx, HOOD_LIGHT, hx - 3, y, 1, 1);
  });
  fillPx(ctx, HOOD_LIGHT, hx, feet - 10, 6, 1);
  fillPx(ctx, HOOD_DARK, hx + 2, feet - 6, 1, 5);
  fillPx(ctx, HOOD_DARK, hx - 2, feet - 4, 1, 3);
  fillPx(ctx, FACE_VOID, hx + 6, feet - 8, 5, 5);
  fillPx(ctx, PALETTE.bloodDark, hx + 7, feet - 6, 3, 1);

  if (p.impact > 0) drawImpact(ctx, { x: cx + 10, y: feet - 3 }, feet, 2, p.fire);
}
