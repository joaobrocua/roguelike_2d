import { PALETTE } from '../data/palette';
import type { GuardianPose } from '../data/enemySprites';
import { fillPx, linePx } from './pixelSheet';

/**
 * O Guardião Partido em pixel art: armadura pesada rachada, uma ombreira inteira e a outra
 * quebrada, elmo sem um chifre com a fenda acesa e rachaduras de brasa pelo peito.
 * Quadro de 32 x 46 (o corpo de colisão tem 26 x 40); as poses ficam em src/data/enemySprites.ts.
 */
type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

const GLOW_CRACK: Record<0 | 1 | 2, number> = {
  0: PALETTE.bloodDark,
  1: PALETTE.ember,
  2: PALETTE.glow,
};

/** Braço pesado: manga larga de aço com punho de osso na ponta. */
function drawArm(ctx: Ctx, shoulder: Point, hand: Point, sleeve: number, shine: number): void {
  linePx(ctx, sleeve, shoulder.x - 2, shoulder.y, hand.x - 2, hand.y, 5);
  linePx(ctx, shine, shoulder.x - 1, shoulder.y, hand.x - 1, hand.y, 2);
  fillPx(ctx, PALETTE.bone, hand.x - 2, hand.y, 5, 4);
  fillPx(ctx, PALETTE.mist, hand.x - 2, hand.y + 3, 5, 1);
}

export function drawGuardian(ctx: Ctx, p: GuardianPose): void {
  const cx = 19; // quadro de 38 px de largura (a folga de cada lado protege o contorno)
  const feet = 42;
  ctx.save();
  if (p.rotation !== 0) {
    ctx.translate(cx, feet);
    ctx.rotate(p.rotation);
    ctx.translate(-cx, -feet);
  }
  const b = p.bob;
  const l = Math.max(0, Math.round(p.lean * 0.5)); // só se inclina para a frente: o quadro não tem folga atrás
  const crack = GLOW_CRACK[p.glow];

  // Pernas e botas
  const leg = (x: number, off: number, lift: number): void => {
    const top = feet - 14 - lift;
    fillPx(ctx, PALETTE.stoneDark, x + off, top, 6, 11);
    fillPx(ctx, PALETTE.stone, x + off + 1, top, 4, 11);
    fillPx(ctx, PALETTE.deep, x + off - 1, feet - 3 - lift, 8, 3);
  };
  leg(cx - 8, p.legB, p.liftB);
  leg(cx + 2, p.legF, p.liftF);

  // Braço de trás, com correntes soltas penduradas
  const shoulderB: Point = { x: cx - 12 + l, y: 21 - b };
  const shoulderF: Point = { x: cx + 11 + l, y: 21 - b };
  const handB: Point = { x: shoulderB.x + p.armB.dx, y: shoulderB.y + p.armB.dy };
  const handF: Point = { x: shoulderF.x + p.armF.dx, y: shoulderF.y + p.armF.dy };
  for (let i = 0; i < 4; i++) {
    const y = handB.y + 4 + i * 3;
    if (y < feet - 3) fillPx(ctx, PALETTE.stone, handB.x - 1 + (i % 2), y, 1, 2);
  }
  drawArm(ctx, shoulderB, handB, PALETTE.stoneDark, PALETTE.stone);

  // Tronco largo com cinto e rachaduras de brasa
  const t = 16 - b;
  fillPx(ctx, PALETTE.stoneLight, cx - 10 + l, t, 20, 14);
  fillPx(ctx, PALETTE.mist, cx - 9 + l, t + 1, 18, 5);
  fillPx(ctx, PALETTE.stone, cx - 10 + l, t + 8, 20, 6);
  fillPx(ctx, PALETTE.deep, cx - 10 + l, t + 12, 20, 2);
  fillPx(ctx, PALETTE.glow, cx - 1 + l, t + 12, 2, 2);
  linePx(ctx, crack, cx - 4 + l, t + 2, cx - 1 + l, t + 8, 1);
  linePx(ctx, crack, cx - 1 + l, t + 8, cx + 3 + l, t + 5, 1);
  linePx(ctx, crack, cx + 3 + l, t + 5, cx + 6 + l, t + 10, 1);

  // Ombreira inteira (frente) e quebrada (trás)
  fillPx(ctx, PALETTE.mist, cx + 7 + l, t - 3, 9, 8);
  fillPx(ctx, PALETTE.bone, cx + 7 + l, t - 3, 9, 1);
  fillPx(ctx, PALETTE.stone, cx + 7 + l, t + 3, 9, 2);
  fillPx(ctx, PALETTE.stone, cx - 16 + l, t - 1, 7, 6);
  fillPx(ctx, PALETTE.deep, cx - 16 + l, t - 1, 3, 2);
  fillPx(ctx, PALETTE.deep, cx - 12 + l, t + 3, 3, 2);

  drawArm(ctx, shoulderF, handF, PALETTE.stoneDark, PALETTE.mist);

  // Elmo: largo, com a fenda acesa e um chifre quebrado
  const h = 4 - b;
  const hx = cx + Math.round(l * 0.7);
  fillPx(ctx, PALETTE.mist, hx - 7, h, 14, 13);
  fillPx(ctx, PALETTE.bone, hx - 6, h, 12, 2);
  fillPx(ctx, PALETTE.stone, hx - 7, h + 9, 14, 4);
  fillPx(ctx, PALETTE.stone, hx + 5, h + 2, 2, 8);
  fillPx(ctx, PALETTE.mist, hx - 9, h - 1, 3, 6); // chifre inteiro
  fillPx(ctx, PALETTE.bone, hx - 9, h - 1, 2, 2);
  fillPx(ctx, PALETTE.stone, hx + 7, h + 1, 2, 2); // toco do chifre quebrado
  fillPx(ctx, PALETTE.void, hx - 5, h + 5, 11, 3); // fenda
  if (p.glow > 0) {
    fillPx(ctx, PALETTE.ember, hx - 3, h + 6, 3, 1);
    fillPx(ctx, PALETTE.ember, hx + 2, h + 6, 3, 1);
    fillPx(ctx, PALETTE.glow, hx - 2, h + 6, 1, 1);
    fillPx(ctx, PALETTE.glow, hx + 3, h + 6, 1, 1);
    if (p.glow === 2) {
      fillPx(ctx, PALETTE.ember, hx - 4, h + 5, 9, 1, 0.5);
      fillPx(ctx, PALETTE.glow, hx - 4, h + 7, 9, 1, 0.35);
    }
  } else {
    fillPx(ctx, PALETTE.bloodDark, hx - 3, h + 6, 3, 1);
    fillPx(ctx, PALETTE.bloodDark, hx + 2, h + 6, 3, 1);
  }
  fillPx(ctx, PALETTE.deep, hx - 3, h + 9, 1, 3); // grade do elmo
  fillPx(ctx, PALETTE.deep, hx, h + 9, 1, 3);
  fillPx(ctx, PALETTE.deep, hx + 3, h + 9, 1, 3);
  ctx.restore();
}
