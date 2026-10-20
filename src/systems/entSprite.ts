import { PALETTE } from '../data/palette';
import type { EntPose } from '../data/entSprites';
import { fillPx, linePx } from './pixelSheet';

/**
 * O Ent Apodrecido em pixel art: uma árvore morta ambulante, de casca escura com sulcos e musgo,
 * um buraco no peito que arde em âmbar e verde doente, copa seca com um galho-chifre quebrado,
 * braços de galho terminando em punhos de raiz e pernas largas de raiz.
 * Quadro de 52 x 68 (o corpo de colisão tem 28 x 44); as poses ficam em src/data/entSprites.ts.
 */
type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

const BARK = 0x3e3223;
const BARK_DARK = 0x241b12;
const BARK_LIGHT = 0x5d4a2e;
const BARK_PALE = 0x7a6c52;
const WOOD_FRESH = 0xb89a64;
const MOSS = 0x4f6b28;
const MOSS_LIGHT = 0x8fae44;
const VINE = 0x3d4a1f;
const LEAF = 0x8a6a2a;
const LEAF_DARK = 0x5e4519;

export function drawEnt(ctx: Ctx, p: EntPose): void {
  const cx = 25; // quadro de 52 px; um pouco à esquerda porque o braço da frente sobra mais
  const feet = 55; // base do corpo de colisão (44 + 12 de folga) menos 1 px para o contorno
  const b = p.bob;
  const l = p.lean;
  const tx = cx + l; // centro do tronco
  const top = feet - 36 - b;
  const bottom = Math.min(top + 25, feet - 2);

  // Pernas de raiz: base larga que se abre em dedos no chão
  const leg = (x: number, off: number, lift: number, shade: boolean): void => {
    const x0 = x + off;
    const legTop = feet - 15 - lift;
    const legBottom = feet - lift;
    fillPx(ctx, shade ? BARK_DARK : BARK, x0, legTop, 8, legBottom - legTop);
    if (!shade) fillPx(ctx, BARK_LIGHT, x0, legTop, 2, legBottom - legTop - 3);
    fillPx(ctx, BARK_DARK, x0 + 6, legTop, 2, legBottom - legTop);
    fillPx(ctx, shade ? BARK : BARK_LIGHT, x0 - 2, legBottom - 3, 12, 3);
    fillPx(ctx, BARK_DARK, x0 - 2, legBottom - 1, 12, 1);
    fillPx(ctx, BARK_DARK, x0 + 2, legBottom - 3, 1, 2);
    fillPx(ctx, BARK, x0 + 9, legBottom - 2, 3, 2); // dedo de raiz à frente
    fillPx(ctx, BARK_DARK, x0 + 9, legBottom - 1, 3, 1);
    fillPx(ctx, MOSS, x0 + 1, legTop + 4, 3, 1);
  };
  leg(cx - 11, p.legB, p.liftB, true);
  leg(cx + 3, p.legF, p.liftF, false);

  // Braço de trás
  const shoulderB: Point = { x: tx - 12, y: top + 3 };
  const shoulderF: Point = { x: tx + 12, y: top + 3 };
  const handB: Point = { x: shoulderB.x + p.armB.dx, y: shoulderB.y + p.armB.dy };
  const handF: Point = { x: shoulderF.x + p.armF.dx, y: shoulderF.y + p.armF.dy };
  drawArm(ctx, shoulderB, handB, -1, true);

  drawTrunk(ctx, tx, top, bottom);
  drawChest(ctx, tx, top, p.glow);
  drawGrowth(ctx, tx, top, bottom, feet, p);

  drawArm(ctx, shoulderF, handF, 1, false);

  drawHead(ctx, cx + Math.round(l * 0.7) + p.droop, top - 9 + p.droop, p.glow);

  if (p.debris !== 0) drawDebris(ctx, cx, feet, p.debris);
}

/** Tronco largo em cima, afunilando na cintura, com sulcos de casca que falham de vez em quando. */
function drawTrunk(ctx: Ctx, cx: number, top: number, bottom: number): void {
  for (let y = top; y < bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top - 1);
    const half = Math.round(11 - Math.max(0, t - 0.55) * 5);
    const x0 = cx - half;
    fillPx(ctx, BARK, x0, y, half * 2, 1);
    fillPx(ctx, BARK_LIGHT, x0, y, 2, 1);
    fillPx(ctx, BARK_DARK, x0 + half * 2 - 3, y, 3, 1);
    for (const gx of [-7, -3, 2, 6]) {
      if ((y * 5 + gx * 3 + 200) % 11 < 6) fillPx(ctx, BARK_DARK, cx + gx, y, 1, 1);
    }
  }
  fillPx(ctx, BARK_LIGHT, cx - 10, top, 8, 1);
  // Cotos de galhos que quebraram dos lados
  fillPx(ctx, BARK, cx - 13, top + 11, 3, 3);
  fillPx(ctx, WOOD_FRESH, cx - 13, top + 11, 1, 3);
  fillPx(ctx, BARK, cx + 10, top + 14, 3, 3);
  fillPx(ctx, WOOD_FRESH, cx + 12, top + 14, 1, 3);
}

/** O buraco do peito: borda podre e, dentro, brasa âmbar com verde doente no alto. */
function drawChest(ctx: Ctx, cx: number, top: number, glow: 0 | 1 | 2): void {
  const hx = cx + 1;
  const hy = top + 7;
  const widths = [5, 7, 9, 9, 9, 9, 9, 7, 5];
  if (glow === 2) fillPx(ctx, PALETTE.venom, hx - 7, hy - 1, 15, 11, 0.22);
  widths.forEach((w, row) => {
    const x = hx - Math.floor(w / 2);
    fillPx(ctx, BARK_DARK, x - 1, hy + row, w + 2, 1);
  });
  fillPx(ctx, BARK_DARK, hx - 2, hy - 1, 5, 1);
  fillPx(ctx, BARK_DARK, hx - 2, hy + 9, 5, 1);
  widths.forEach((w, row) => {
    const x = hx - Math.floor(w / 2);
    const color = glow === 0 ? PALETTE.void : row < 2 ? PALETTE.venom : PALETTE.ember;
    fillPx(ctx, color, x, hy + row, w, 1);
  });
  if (glow === 0) {
    fillPx(ctx, PALETTE.bloodDark, hx - 1, hy + 5, 2, 1);
    return;
  }
  fillPx(ctx, PALETTE.glow, hx - 2, hy + 3, 5, 4);
  fillPx(ctx, PALETTE.ember, hx - 3, hy + 6, 7, 1);
  if (glow === 2) {
    fillPx(ctx, PALETTE.playerAccent, hx - 1, hy + 4, 3, 2, 0.6);
    fillPx(ctx, PALETTE.glow, hx - 4, hy + 2, 1, 1);
    fillPx(ctx, PALETTE.glow, hx + 4, hy + 7, 1, 1);
  }
  // Farpas da borda caindo para dentro do buraco
  fillPx(ctx, BARK_PALE, hx - 3, hy, 1, 2);
  fillPx(ctx, BARK_PALE, hx + 2, hy + 8, 1, 2);
  // Brasas soltas na casca
  fillPx(ctx, PALETTE.ember, cx - 7, top + 16, 1, 1);
  fillPx(ctx, PALETTE.ember, cx + 8, top + 20, 1, 1);
  fillPx(ctx, PALETTE.glow, cx - 5, top + 21, 1, 1, glow === 2 ? 1 : 0.6);
}

/** Musgo, cipós e folhas secas pendurados no tronco. */
function drawGrowth(
  ctx: Ctx,
  cx: number,
  top: number,
  bottom: number,
  feet: number,
  p: EntPose,
): void {
  fillPx(ctx, MOSS, cx - 11, top, 7, 2);
  fillPx(ctx, MOSS_LIGHT, cx - 10, top, 3, 1);
  fillPx(ctx, MOSS, cx - 10, top + 2, 2, 3);
  fillPx(ctx, MOSS, cx + 5, top + 20, 5, 2);
  fillPx(ctx, MOSS_LIGHT, cx + 6, top + 20, 2, 1);
  fillPx(ctx, MOSS, cx - 8, top + 15, 3, 2);

  const strands: readonly (readonly [number, number])[] = [
    [-9, 6],
    [-4, 9],
    [5, 7],
    [9, 5],
  ];
  for (const [dx, len] of strands) {
    const y0 = bottom - 4;
    const n = Math.min(len, feet - 1 - y0);
    for (let i = 0; i < n; i++) {
      fillPx(ctx, i % 3 === 2 ? MOSS : VINE, cx + dx + (i >= n / 2 ? p.sway : 0), y0 + i, 1, 1);
    }
    if (n === len) fillPx(ctx, LEAF, cx + dx + p.sway, y0 + n, 2, 1);
  }
  // Folhas secas presas nos ombros
  fillPx(ctx, LEAF, cx - 12, top - 1, 2, 1);
  fillPx(ctx, LEAF_DARK, cx + 9, top - 1, 2, 1);
  fillPx(ctx, LEAF, cx + 11 + p.sway, top + 1, 1, 2);
}

/** Cabeça de copa seca: dois olhos acesos, boca de rachadura e um galho-chifre quebrado. */
function drawHead(ctx: Ctx, hx: number, hy: number, glow: 0 | 1 | 2): void {
  // Galho-chifre de trás, que parte e termina em ponta clara de madeira nova
  linePx(ctx, BARK_DARK, hx - 6, hy + 1, hx - 9, hy - 3, 3);
  linePx(ctx, BARK, hx - 5, hy + 1, hx - 8, hy - 3, 2);
  linePx(ctx, BARK_DARK, hx - 9, hy - 3, hx - 8, hy - 6, 2);
  fillPx(ctx, WOOD_FRESH, hx - 9, hy - 7, 1, 2);
  fillPx(ctx, WOOD_FRESH, hx - 7, hy - 6, 1, 1);
  fillPx(ctx, MOSS, hx - 8, hy - 1, 2, 1);

  // Galhos secos da copa
  linePx(ctx, BARK_DARK, hx - 3, hy, hx - 4, hy - 4, 1);
  linePx(ctx, BARK_DARK, hx + 1, hy, hx + 2, hy - 5, 1);
  linePx(ctx, BARK_DARK, hx + 4, hy, hx + 7, hy - 3, 1);
  fillPx(ctx, LEAF, hx - 5, hy - 5, 2, 1);
  fillPx(ctx, LEAF_DARK, hx + 2, hy - 6, 2, 1);
  fillPx(ctx, LEAF, hx + 7, hy - 4, 2, 1);
  fillPx(ctx, BARK, hx + 5, hy - 2, 3, 3); // toco do outro chifre
  fillPx(ctx, WOOD_FRESH, hx + 5, hy - 2, 2, 1);

  // Crânio de madeira
  fillPx(ctx, BARK, hx - 6, hy, 12, 1);
  fillPx(ctx, BARK, hx - 7, hy + 1, 14, 9);
  fillPx(ctx, BARK_LIGHT, hx - 7, hy + 1, 2, 8);
  fillPx(ctx, BARK_LIGHT, hx - 6, hy, 6, 1);
  fillPx(ctx, BARK_DARK, hx + 4, hy + 1, 3, 9);
  fillPx(ctx, BARK_DARK, hx - 7, hy + 9, 14, 1);
  fillPx(ctx, MOSS, hx - 5, hy + 1, 4, 1);
  fillPx(ctx, MOSS_LIGHT, hx - 4, hy + 1, 1, 1);

  // Olhos: órbitas fundas, acesas em âmbar com verde
  for (const ex of [hx - 4, hx + 1]) {
    fillPx(ctx, PALETTE.void, ex, hy + 3, 4, 3);
    if (glow === 0) continue;
    fillPx(ctx, PALETTE.venom, ex + 1, hy + 3, 3, 1);
    fillPx(ctx, glow === 2 ? PALETTE.glow : PALETTE.ember, ex + 1, hy + 4, 3, 2);
    fillPx(ctx, PALETTE.glow, ex + 2, hy + 4, 1, 1);
    if (glow === 2) fillPx(ctx, PALETTE.venom, ex - 1, hy + 2, 6, 5, 0.25);
  }
  // Boca: rachadura com farpas
  fillPx(ctx, PALETTE.void, hx - 2, hy + 7, 6, 1);
  fillPx(ctx, BARK_PALE, hx - 1, hy + 7, 1, 1);
  fillPx(ctx, BARK_PALE, hx + 1, hy + 7, 1, 1);
  fillPx(ctx, BARK_DARK, hx - 3, hy + 8, 1, 1);
}

/** Braço de galho grosso, dobrado para fora, com um punho de raiz na ponta. */
function drawArm(ctx: Ctx, shoulder: Point, hand: Point, side: 1 | -1, back: boolean): void {
  const mid: Point = {
    x: Math.round((shoulder.x + hand.x) / 2 + side * 2),
    y: Math.round((shoulder.y + hand.y) / 2),
  };
  const wood = back ? BARK_DARK : BARK;
  linePx(ctx, wood, shoulder.x - 2, shoulder.y, mid.x - 2, mid.y, 5);
  linePx(ctx, wood, mid.x - 2, mid.y, hand.x - 2, hand.y, 4);
  if (!back) {
    linePx(ctx, BARK_LIGHT, shoulder.x - 2, shoulder.y, mid.x - 2, mid.y, 2);
    linePx(ctx, BARK_DARK, shoulder.x + 1, shoulder.y + 1, mid.x + 1, mid.y + 1, 1);
  }
  fillPx(ctx, BARK_DARK, mid.x + side * 3, mid.y - 1, 2, 1); // galhinho que sobrou
  fillPx(ctx, MOSS, shoulder.x - 2, shoulder.y - 1, 4, 2);

  // Punho de raiz: nós de casca, com dedos de raiz para baixo (ou para cima, se o braço está erguido)
  const x = hand.x - 3;
  fillPx(ctx, wood, x, hand.y, 7, 6);
  fillPx(ctx, back ? BARK : BARK_LIGHT, x, hand.y, 7, 1);
  fillPx(ctx, BARK_DARK, x + 5, hand.y + 1, 2, 5);
  fillPx(ctx, BARK_DARK, x, hand.y + 5, 7, 1);
  const raised = hand.y < shoulder.y;
  for (let i = 0; i < 4; i++) {
    const len = 2 + (i % 2);
    const fx = x + i * 2 - (i === 3 ? 1 : 0);
    if (raised) fillPx(ctx, BARK_DARK, fx, hand.y - len, 1, len);
    else fillPx(ctx, BARK_DARK, fx, hand.y + 6, 1, len);
  }
  if (!raised) fillPx(ctx, MOSS, x + 1, hand.y + 1, 2, 1);
}

/** Lascas de casca e farpas de madeira no chão (pancada e desmoronamento). */
function drawDebris(ctx: Ctx, cx: number, feet: number, amount: 1 | 2): void {
  const chips: readonly (readonly [number, number, number])[] = [
    [-12, 1, 2],
    [-8, 2, 1],
    [6, 1, 2],
    [10, 3, 1],
    [-4, 1, 1],
    [2, 2, 1],
    [-15, 2, 1],
    [13, 1, 1],
  ];
  const count = amount === 2 ? chips.length : 4;
  for (let i = 0; i < count; i++) {
    const chip = chips[i];
    if (!chip) continue;
    const [x, w, h] = chip;
    fillPx(ctx, i % 3 === 0 ? BARK_LIGHT : BARK, cx + x, feet - h, w + 1, h);
  }
  if (amount === 2) {
    fillPx(ctx, WOOD_FRESH, cx - 9, feet - 3, 2, 1);
    fillPx(ctx, LEAF, cx + 8, feet - 3, 2, 1);
    fillPx(ctx, LEAF_DARK, cx - 3, feet - 2, 2, 1);
  }
}
