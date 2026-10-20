import { PALETTE } from '../data/palette';
import type { FrogKingPose } from '../data/frogKingSprites';
import { fillPx, linePx } from './pixelSheet';

/**
 * Desenho do mini-chefe "O Rei dos Charcos": um sapo imenso, gordo e coberto de lodo, de coroa
 * torta feita de ossos, ferro enferrujado e juncos. Olha para a direita; o contorno de 1 px é
 * automático (pixelSheet). O quadro tem 60 x 50: o corpo de colisão (32 x 28) fica no centro e o
 * resto é folga para o pulo esticado, a língua e a coroa.
 */

type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

const OUTLINE = PALETTE.void;
/** Centro do quadro e linha do chão (base do corpo de colisão), em pixels do quadro. */
const CX = 30;
const GROUND = 39;

// Pele verde-musgo, barriga amarelada e lodo
const SKIN = 0x3f5f2e;
const SKIN_DARK = 0x26391f;
const SKIN_LIGHT = 0x62883c;
const BELLY = 0xcfc87f;
const BELLY_SHADE = 0xa59c58;
const WART = 0x8a7a44;
const MOSS = 0x55702c;
const MUD = 0x4a3c24;
const SLIME = PALETTE.venom;
// Olhos de veneno, do apagado ao em brasa
const EYE = 0xe0d23a;
const EYE_HOT = 0xf8f45a;
const EYE_CORE = 0xffffd0;
const EYE_DIM = 0x8a8a3a;
// Boca e língua
const MOUTH_IN = 0x5a1a28;
const TONGUE = 0xc2475a;
// Coroa e enfeites do charco
const IRON = 0x7a4a2c;
const IRON_DARK = 0x4a2c1a;
const REED = 0x9a9a4a;
const REED_DARK = 0x5a4a26;
const LILY_PAD = 0x3f7a3a;
const LILY_PINK = 0xe6c8d8;

/** Elipse preenchida linha a linha; `shear` desloca o alto para a frente (tronco inclinado). */
function blob(
  ctx: Ctx,
  color: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opts: { shear?: number; minY?: number; maxY?: number; alpha?: number } = {},
): void {
  const { shear = 0, minY = -Infinity, maxY = Infinity, alpha = 1 } = opts;
  for (let dy = -ry; dy <= ry; dy++) {
    const y = cy + dy;
    if (y < minY || y > maxY) continue;
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));
    const off = ry > 0 ? Math.round((shear * -dy) / ry) : 0;
    fillPx(ctx, color, cx - half + off, y, half * 2 + 1, 1, alpha);
  }
}

/** Dedos longos de uma mão: saem de (x, y) abertos em leque. */
function fingers(ctx: Ctx, x: number, y: number, spread: 0 | 1 | 2): void {
  const tips: readonly Point[] =
    spread === 0
      ? [
          { x: x + 5, y },
          { x: x + 4, y: y + 1 },
          { x: x + 3, y: y - 1 },
        ]
      : spread === 1
        ? [
            { x: x + 5, y: y - 2 },
            { x: x + 5, y },
            { x: x + 4, y: y + 2 },
          ]
        : [
            { x: x + 6, y: y - 3 },
            { x: x + 7, y },
            { x: x + 5, y: y + 3 },
          ];
  for (const t of tips) {
    linePx(ctx, SKIN, x, y, t.x, t.y, 1);
    fillPx(ctx, BELLY_SHADE, t.x, t.y, 1, 1);
  }
}

/** Membro grosso: contorno escuro de `thick` px com o miolo mais claro (o corpo do sapo é roliço). */
function limb(ctx: Ctx, from: Point, to: Point, thick: number, color = SKIN): void {
  linePx(ctx, SKIN_DARK, from.x, from.y, to.x, to.y, thick);
  if (thick >= 3) {
    linePx(ctx, color, from.x + 1, from.y, to.x + 1, to.y, thick - 2);
  }
}

/** Braço da frente: ombro, cotovelo e mão (de longe só uma sombra escura). */
function drawArm(ctx: Ctx, p: FrogKingPose, shoulder: Point, ground: number, far: boolean): void {
  const dx = far ? -3 : 0;
  const hand: Point =
    p.reach === 0
      ? { x: shoulder.x + 8 + dx, y: ground - 3 }
      : p.reach === 1
        ? { x: shoulder.x + 8 + dx, y: shoulder.y + 3 }
        : { x: shoulder.x + 10 + dx, y: shoulder.y - 1 };
  const elbow: Point =
    p.reach === 0
      ? {
          x: shoulder.x + 1 + dx,
          y: Math.min(Math.round((shoulder.y + hand.y) / 2) + 2, ground - 5),
        }
      : p.reach === 1
        ? { x: shoulder.x + 2 + dx, y: shoulder.y + 6 }
        : { x: shoulder.x + 6 + dx, y: shoulder.y + 2 };
  if (far) {
    limb(ctx, { x: shoulder.x + dx, y: shoulder.y }, elbow, 3, SKIN_DARK);
    limb(ctx, elbow, hand, 3, SKIN_DARK);
    return;
  }
  limb(ctx, shoulder, elbow, 4);
  limb(ctx, elbow, hand, 3);
  fillPx(ctx, SKIN_DARK, hand.x - 1, hand.y - 1, 5, 4);
  fillPx(ctx, SKIN, hand.x, hand.y - 1, 3, 2);
  fillPx(ctx, MUD, hand.x, hand.y + 1, 3, 1, 0.8);
  fingers(ctx, hand.x + 2, hand.y, p.reach === 0 ? 0 : p.reach === 1 ? 1 : 2);
}

/** Pata traseira grossa: dobrada (coxa gorda e pé no chão) ou esticada para trás no salto. */
function drawHindLeg(
  ctx: Ctx,
  p: FrogKingPose,
  wantedHip: Point,
  bx: number,
  ground: number,
  rx: number,
): void {
  const t = p.legs / 6;
  const fat = Math.round(t * 2);
  // O pernil não passa da linha do chão quando o corpo está agachado
  const hip: Point = { x: wantedHip.x, y: Math.min(wantedHip.y, ground - 2 - (6 - fat)) };
  const lerp = (a: number, b: number): number => Math.round(a + (b - a) * t);
  const knee: Point = {
    x: lerp(bx + 2, bx - rx + 1),
    y: lerp(ground - 6, hip.y + 4),
  };
  const foot: Point = {
    x: lerp(bx - 10, bx - Math.min(rx + 6, 20)),
    y: Math.min(ground - 2, lerp(ground - 2, ground - 1 + p.air)),
  };

  // Canela até o calcanhar e coxa grossa até o joelho
  limb(ctx, knee, { x: foot.x, y: foot.y - 1 }, 3);
  limb(ctx, hip, knee, 6 - fat);
  // Pernil redondo, com sombra embaixo e luz em cima, para a coxa não sumir no corpo
  blob(ctx, SKIN_DARK, hip.x + 1, hip.y + 1, 7 - fat, 6 - fat);
  blob(ctx, SKIN, hip.x + 1, hip.y, 6 - fat, 5 - fat);
  blob(ctx, SKIN_LIGHT, hip.x + 1, hip.y - 2, 4 - fat, 1);
  fillPx(ctx, WART, hip.x - 2, hip.y + 1, 2, 2);
  fillPx(ctx, SKIN_LIGHT, hip.x - 2, hip.y + 1, 1, 1);
  fillPx(ctx, SKIN_LIGHT, knee.x - 1, knee.y - 1, 2, 1);

  if (t < 0.5) {
    // Pé comprido e espalmado no chão, dedos para a frente
    fillPx(ctx, SKIN_DARK, foot.x, ground - 2, 11, 2);
    fillPx(ctx, SKIN, foot.x + 1, ground - 2, 6, 1);
    for (const dx of [4, 7, 10]) fillPx(ctx, BELLY_SHADE, foot.x + dx, ground - 1, 1, 1);
    fillPx(ctx, MUD, foot.x + 3, ground - 2, 3, 1, 0.8);
  } else {
    // Esticado: dedos abertos em leque, com a pele entre eles
    for (const dy of [-3, -1, 1]) {
      linePx(ctx, SKIN_DARK, foot.x, foot.y, foot.x - 4, foot.y + dy, 1);
      fillPx(ctx, BELLY_SHADE, foot.x - 4, foot.y + dy, 1, 1);
    }
    fillPx(ctx, SKIN, foot.x - 3, foot.y - 1, 3, 2, 0.8);
  }
}

/** Olho saltado; `eyes` vai de fechado (0) a em brasa (3). */
function drawEye(ctx: Ctx, x: number, y: number, r: number, eyes: number, far: boolean): void {
  blob(ctx, SKIN_DARK, x, y, r, r);
  if (eyes === 0) {
    blob(ctx, SKIN, x, y - 1, r - 1, r - 1);
    fillPx(ctx, OUTLINE, x - r + 1, y + 1, r * 2 - 1, 1);
    fillPx(ctx, OUTLINE, x - r + 2, y + 2, r * 2 - 3, 1);
    return;
  }
  const color = far ? EYE_DIM : eyes >= 2 ? EYE_HOT : EYE;
  if (eyes >= 2 && !far) blob(ctx, EYE_HOT, x, y, r + 2, r + 2, { alpha: eyes === 3 ? 0.32 : 0.2 });
  blob(ctx, color, x + 1, y, r - 1, r - 1);
  // Pupila de fenda, que nos olhos em brasa fica cercada de laranja
  fillPx(ctx, OUTLINE, x + 1, y - r + 2, 2, r * 2 - 3);
  if (eyes === 3 && !far) {
    fillPx(ctx, PALETTE.ember, x - 1, y - 1, 2, 3, 0.9);
    fillPx(ctx, PALETTE.ember, x + 3, y - 1, 1, 3, 0.9);
  }
  if (!far) fillPx(ctx, EYE_CORE, x - 1, y - 2, 1, 1);
  // Pálpebra pesada (ameaçadora); a sobrancelha fica de um jeito só, caída para o nariz
  if (eyes === 1) fillPx(ctx, SKIN_DARK, x - r + 2, y - r + 1, r * 2 - 2, 1);
  else linePx(ctx, SKIN_DARK, x - r + 1, y - r + 1, x + r - 1, y - r + 2, 1);
}

/** Papo da garganta: incha e brilha de veneno. */
function drawSac(ctx: Ctx, p: FrogKingPose, hx: number, hy: number, ground: number): void {
  const rx = 3 + p.sac * 2;
  const ry = 1 + Math.round(p.sac * 1.7);
  const cy = Math.min(hy + 5 + p.mouth + ry, ground - 2 - ry);
  const cx = hx + 4 + p.sac;
  // O papo incha para a frente, por trás do focinho (só a parte que passa dele aparece)
  blob(ctx, SKIN_DARK, cx, cy, rx + 1, ry + 1);
  blob(ctx, BELLY, cx, cy, rx, ry);
  if (p.sac >= 2) {
    for (let dy = -ry + 1; dy <= ry; dy += 2) {
      blob(ctx, BELLY_SHADE, cx, cy + dy, Math.max(1, rx - 1), 0, { alpha: 0.7 });
    }
    const glow = p.sac >= 3 ? 0.85 : 0.45;
    blob(ctx, SLIME, cx + 1, cy, rx - 2, ry - 2, { alpha: glow });
  }
  if (p.sac >= 3) blob(ctx, EYE_CORE, cx + 2, cy, 2, 1, { alpha: 0.8 });
}

/** A coroa torta: faixa de ferro enferrujado, pontas de osso e juncos. (x, y) é a ponta de trás da faixa. */
function drawCrown(ctx: Ctx, x: number, y: number): void {
  // Juncos atrás da coroa, com as espigas marrons no alto
  linePx(ctx, REED, x + 1, y, x - 3, y - 8, 1);
  fillPx(ctx, REED_DARK, x - 4, y - 11, 2, 3);
  linePx(ctx, REED, x + 3, y - 1, x + 2, y - 12, 1);
  fillPx(ctx, REED_DARK, x + 1, y - 15, 2, 3);
  // Faixa torta de ferro enferrujado, mais alta atrás que na frente
  linePx(ctx, IRON_DARK, x, y + 1, x + 10, y - 2, 3);
  linePx(ctx, IRON, x, y + 1, x + 10, y - 2, 1);
  // Pontas tortas de osso e de ferro, de alturas desiguais (triângulos de base larga)
  for (const [dx, h, iron] of [
    [1, 6, false],
    [4, 5, true],
    [7, 8, false],
    [10, 6, true],
  ] as const) {
    const base = y + 2 - Math.round((dx * 3) / 10);
    const body = iron ? IRON : PALETTE.bone;
    const shade = iron ? IRON_DARK : PALETTE.mist;
    fillPx(ctx, body, x + dx, base - h, 1, h);
    fillPx(ctx, shade, x + dx - 1, base - 2, 1, 2);
    fillPx(ctx, body, x + dx + 1, base - 2, 1, 2);
  }
}

/** Sapo de pé (todas as poses vivas). */
function drawStanding(ctx: Ctx, p: FrogKingPose): void {
  const gy = GROUND - p.air - p.bob;
  const ry = Math.max(5, 9 - p.crouch);
  const rx = 13 + Math.floor(p.crouch / 2) + p.long;
  const bx = CX - 4 + p.lunge + Math.floor(p.long / 2);
  const cy = gy - 1 - ry;
  const lean = p.lean;
  const shear = Math.max(0, lean);

  const hx = bx + 8 + lean + Math.floor(p.long / 2);
  // A boca aberta levanta a cabeça: a mandíbula não afunda no chão
  const hy = Math.min(cy - ry + 4, gy - 8 - p.mouth);
  const mouthY = hy + 2;
  const m = p.mouth;
  const shoulder: Point = { x: bx + 5 + Math.floor(shear / 2), y: Math.min(cy + 3, gy - 9) };

  // Braço de longe (sombra), antes do corpo
  drawArm(ctx, p, shoulder, gy, true);

  // Corpo gordo: dorso musgo escuro, barriga clara amarelada
  blob(ctx, SKIN_DARK, bx, cy, rx, ry, { shear });
  blob(ctx, SKIN, bx, cy - 1, rx - 1, ry - 1, { shear });
  blob(ctx, SKIN_LIGHT, bx + 2, cy - ry + 3, Math.max(2, rx - 7), 1, { shear });
  blob(ctx, BELLY, bx + 3, cy + ry - 2, rx - 5, 4, { minY: cy + 1, maxY: cy + ry - 1 });
  blob(ctx, BELLY_SHADE, bx + 3, cy + ry - 1, rx - 6, 0, { alpha: 0.8 });
  // Verrugas, manchas de musgo e lodo
  for (const [wx, wy] of [
    [-9, -3],
    [-4, -5],
    [2, -5],
    [-11, 1],
    [-6, 0],
    [6, -2],
  ] as const) {
    if (cy + wy < cy - ry + 2) continue;
    fillPx(ctx, WART, bx + wx, cy + wy, 2, 2);
    fillPx(ctx, SKIN_LIGHT, bx + wx, cy + wy, 1, 1);
  }
  fillPx(ctx, MOSS, bx - 7, cy - ry + 2, 5, 2, 0.9);
  fillPx(ctx, MOSS, bx + 1, cy - 1, 3, 1, 0.9);
  fillPx(ctx, MUD, bx - 10, cy + 3, 4, 2, 0.85);
  fillPx(ctx, MUD, bx - 2, cy + ry - 3, 3, 1, 0.8);
  // Folha de vitória-régia e flor sobre o dorso
  if (ry >= 6) {
    const lx = bx - 5 + Math.floor(shear / 2);
    const ly = cy - ry + 1;
    fillPx(ctx, LILY_PAD, lx, ly, 5, 1);
    fillPx(ctx, SKIN_LIGHT, lx + 1, ly, 2, 1);
    fillPx(ctx, LILY_PINK, lx + 1, ly - 2, 3, 1);
    fillPx(ctx, LILY_PINK, lx + 2, ly - 3, 1, 1);
    fillPx(ctx, EYE, lx + 2, ly - 2, 1, 1);
  }

  // Pata traseira de perto (por cima do corpo)
  drawHindLeg(ctx, p, { x: bx - 7, y: cy + 3 }, bx, gy, rx);
  if (p.reach === 2) drawArm(ctx, p, shoulder, gy, false);

  drawSac(ctx, p, hx, hy, gy);

  // Cabeça larga: crânio (acima da boca) e mandíbula (abaixo, desce quando abre)
  blob(ctx, SKIN_DARK, hx, hy, 9, 5, { maxY: mouthY });
  blob(ctx, SKIN, hx, hy - 1, 8, 4, { maxY: mouthY });
  blob(ctx, SKIN_LIGHT, hx + 1, hy - 2, 5, 1);
  fillPx(ctx, OUTLINE, hx + 7, hy - 1, 1, 1); // narina
  fillPx(ctx, SKIN_DARK, hx - 6, hy - 3, 3, 1);
  blob(ctx, SKIN_DARK, hx + 1, hy + 4 + m, 8, 3, { minY: mouthY + 1 + m });
  blob(ctx, SKIN, hx + 1, hy + 4 + m, 7, 2, { minY: mouthY + 1 + m });
  blob(ctx, BELLY_SHADE, hx + 1, hy + 6 + m, 5, 0, { alpha: 0.7 });

  // Boca larga: um risco torto, ou aberta com dentes tortos
  fillPx(ctx, OUTLINE, hx - 8, mouthY - 1, 1, 1);
  fillPx(ctx, OUTLINE, hx - 7, mouthY, 1, 1);
  if (m <= 0) {
    fillPx(ctx, OUTLINE, hx - 6, mouthY + 1, 16, 1);
    for (const [tx, th] of [
      [8, 1],
      [5, 1],
      [2, 1],
    ] as const) {
      fillPx(ctx, PALETTE.bone, hx + tx, mouthY + 1, 1, th);
    }
  } else {
    fillPx(ctx, MOUTH_IN, hx - 6, mouthY + 1, 16, m);
    fillPx(ctx, OUTLINE, hx - 6, mouthY + 1, 16, 1);
    fillPx(ctx, OUTLINE, hx - 6, mouthY + 1, 3, m);
    for (const [tx, th] of [
      [8, 2],
      [5, 1],
      [2, 2],
      [-1, 1],
    ] as const) {
      fillPx(ctx, PALETTE.bone, hx + tx, mouthY + 1, 1, Math.min(th, m));
    }
    for (const [tx, th] of [
      [7, 2],
      [3, 1],
    ] as const) {
      const h = Math.min(th, m);
      fillPx(ctx, PALETTE.bone, hx + tx, mouthY + 1 + m - h, 1, h);
    }
    if (p.tongue > 0) {
      const len = p.tongue;
      fillPx(ctx, TONGUE, hx + 1, mouthY + m - 1, 8 + len, 2);
      fillPx(ctx, PALETTE.bloodDark, hx + 1, mouthY + m, 8 + len, 1, 0.6);
      fillPx(ctx, TONGUE, hx + 8 + len, mouthY + m - 2, 1, 2); // ponta enrolada
    }
  }
  // Presas tortas da mandíbula por cima do lábio
  if (m <= 0) {
    fillPx(ctx, PALETTE.bone, hx + 7, mouthY - 1, 1, 2);
    fillPx(ctx, PALETTE.bone, hx + 4, mouthY - 1, 1, 1);
    fillPx(ctx, PALETTE.bone, hx + 3, mouthY, 1, 1);
  }

  // Olhos enormes e salientes: o de longe espia por trás do de perto
  const ex = hx + 3;
  const ey = hy - 6;
  drawEye(ctx, ex - 5, ey - 1, 3, p.eyes, true);
  drawEye(ctx, ex, ey, 4, p.eyes, false);

  // Coroa torta no alto da nuca, com cipós de lodo e lírios pendurados atrás da cabeça
  drawCrown(ctx, hx - 13, hy - 3);
  fillPx(ctx, MOSS, hx - 12, hy - 1, 1, 6, 0.9);
  fillPx(ctx, LILY_PINK, hx - 13, hy + 4, 3, 2);
  fillPx(ctx, EYE, hx - 12, hy + 5, 1, 1);
  fillPx(ctx, MOSS, hx - 9, hy, 1, 3, 0.9);

  // Braço de perto, por cima de tudo (esticado no bote, ele passa por trás da cabeça)
  if (p.reach < 2) drawArm(ctx, p, shoulder, gy, false);
}

/** Morto: de barriga para cima, as patas para o alto, olho em X e a língua de fora. */
function drawFallen(ctx: Ctx, p: FrogKingPose): void {
  const deflated = p.dead === 2;
  const gy = GROUND;
  const ry = deflated ? 4 : 6;
  const rx = deflated ? 14 : 12;
  const bx = CX - 4;
  const cy = gy - 1 - ry;
  const up = deflated ? 3 : 8;

  // Patas no ar (viradas para cima), antes do corpo
  const limb = (from: Point, mid: Point, tip: Point): void => {
    linePx(ctx, SKIN_DARK, from.x, from.y, mid.x, mid.y, 4);
    linePx(ctx, SKIN, from.x + 1, from.y, mid.x + 1, mid.y, 2);
    linePx(ctx, SKIN_DARK, mid.x, mid.y, tip.x, tip.y, 3);
    fillPx(ctx, BELLY_SHADE, tip.x, tip.y, 2, 2);
  };
  limb(
    { x: bx - 7, y: cy - 1 },
    { x: bx - 13, y: cy - ry - up },
    { x: bx - (deflated ? 18 : 10), y: cy - ry - up - (deflated ? -2 : 4) },
  );
  limb(
    { x: bx + 7, y: cy - 1 },
    { x: bx + 12, y: cy - ry - up + 1 },
    { x: bx + (deflated ? 17 : 9), y: cy - ry - up - (deflated ? -3 : 3) },
  );
  fingers(ctx, bx + (deflated ? 17 : 9), cy - ry - up - (deflated ? -3 : 3), 1);

  // Corpo: a barriga clara para cima, inchada ou murcha
  blob(ctx, SKIN_DARK, bx, cy, rx, ry);
  blob(ctx, BELLY, bx, cy - 1, rx - 1, ry - 1, { maxY: cy + ry - 2 });
  for (const dy of deflated ? [-1, 1] : [-3, -1, 1]) {
    fillPx(ctx, BELLY_SHADE, bx - rx + 4, cy + dy, rx * 2 - 7, 1, 0.7);
  }
  fillPx(ctx, WART, bx - 5, cy - 1, 2, 1);
  fillPx(ctx, WART, bx + 4, cy, 2, 1);
  fillPx(ctx, MUD, bx - 9, cy + ry - 1, 5, 1, 0.8);
  fillPx(ctx, LILY_PAD, bx - 2, cy - ry + 1, 5, 1);
  fillPx(ctx, LILY_PINK, bx - 1, cy - ry - 1, 3, 1);

  // Cabeça tombada para trás, com a boca aberta e a língua de fora
  const hx = bx + rx + 2;
  const hy = gy - 6;
  blob(ctx, SKIN_DARK, hx, hy + 1, 8, 4);
  blob(ctx, SKIN, hx, hy, 7, 3, { minY: hy - 1 });
  blob(ctx, BELLY, hx - 1, hy - 2, 6, 1);
  fillPx(ctx, MOUTH_IN, hx + 1, hy - 1, 8, 2);
  fillPx(ctx, PALETTE.bone, hx + 3, hy - 1, 1, 1);
  fillPx(ctx, PALETTE.bone, hx + 6, hy, 1, 1);
  fillPx(ctx, TONGUE, hx + 2, hy, 6 + p.tongue, 2);
  fillPx(ctx, PALETTE.bloodDark, hx + 2, hy + 1, 6 + p.tongue, 1, 0.6);
  // O olho saltado, apagado e riscado com um X
  blob(ctx, SKIN_DARK, hx - 3, hy - 4, 3, 2);
  blob(ctx, EYE_DIM, hx - 3, hy - 4, 2, 1);
  for (const [dx, dy] of [
    [-5, -5],
    [-3, -5],
    [-4, -4],
    [-5, -3],
    [-3, -3],
  ] as const) {
    fillPx(ctx, OUTLINE, hx + dx, hy + dy, 1, 1);
  }

  // A coroa caída ao lado, de lado no chão
  const kx = 3;
  const ky = gy - 3;
  fillPx(ctx, IRON_DARK, kx, ky, 9, 2);
  fillPx(ctx, IRON, kx, ky, 9, 1);
  for (const [dx, h] of [
    [0, 3],
    [3, 2],
    [6, 4],
    [8, 2],
  ] as const) {
    fillPx(ctx, PALETTE.bone, kx + dx, ky - h, 1, h);
  }
  linePx(ctx, REED, kx + 2, ky - 1, kx + 9, ky - 5, 1);
  fillPx(ctx, REED_DARK, kx + 9, ky - 7, 2, 3);
}

export function drawFrogKing(ctx: Ctx, p: FrogKingPose): void {
  if (p.dead > 0) drawFallen(ctx, p);
  else drawStanding(ctx, p);
}
