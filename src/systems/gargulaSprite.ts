import { PALETTE } from '../data/palette';
import type { GargulaPose } from '../data/gargulaSprites';
import { fillPx, linePx } from './pixelSheet';

/**
 * Desenho do mini-chefe "A Górgola Rachada": uma estátua viva de górgola de pedra azul-acinzentada,
 * agachada e corpulenta, com chifres curvos, presas, asas de morcego de pedra dobradas nas costas
 * (abrem no salto), garras grossas e rachaduras que brilham em brasa. Olha para a direita; o
 * contorno de 1 px é automático (pixelSheet). O quadro tem 66 x 66: o corpo de colisão (34 x 34)
 * fica no centro e o resto é folga para as asas abertas, o salto e o bote.
 */

type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

const OUTLINE = PALETTE.void;
/** Centro do quadro e linha do chão (base do corpo de colisão), em pixels do quadro. */
const CX = 33;
const GROUND = 50;
/** Centro do tronco parado: um pouco para trás, porque a cabeça e o focinho vão à frente. */
const BODY_X = CX - 6;

// Pedra azul-acinzentada, da sombra funda à luz
const ROCK_DEEP = PALETTE.stoneDark;
const ROCK_DARK = PALETTE.stone;
const ROCK = PALETTE.stoneLight;
const ROCK_LIGHT = PALETTE.mist;
const ROCK_HI = 0x8c9cbf;
// Musgo nas juntas e no alto das costas
const MOSS = 0x44603a;
const MOSS_LIGHT = 0x6a8a46;
// Olhos: do apagado ao em brasa
const EYE_DIM = 0xa83424;
const EYE = 0xd0481f;
const EYE_HOT = PALETTE.ember;
const CRACK_DIM = 0x7a3a26;
const EYE_CORE = PALETTE.glow;
// Garras e presas de pedra clara, e o fundo escuro da boca
const CLAW = PALETTE.bone;
const CLAW_SHADE = 0x8e96ac;
const MOUTH_IN = 0x1c0e14;

/** Elipse preenchida linha a linha. */
function blob(
  ctx: Ctx,
  color: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opts: { minY?: number; maxY?: number; alpha?: number } = {},
): void {
  const { minY = -Infinity, maxY = Infinity, alpha = 1 } = opts;
  for (let dy = -ry; dy <= ry; dy++) {
    const y = cy + dy;
    if (y < minY || y > maxY) continue;
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))));
    fillPx(ctx, color, cx - half, y, half * 2 + 1, 1, alpha);
  }
}

/** Polígono preenchido por linhas (as pontas das asas e a membrana). */
function polyPx(ctx: Ctx, color: number, pts: readonly Point[], alpha = 1): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const xs: number[] = [];
  for (let y = minY; y <= maxY; y++) {
    xs.length = 0;
    const sy = y + 0.5;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      if ((a.y <= sy && b.y > sy) || (b.y <= sy && a.y > sy)) {
        xs.push(a.x + ((sy - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.round(xs[i]!);
      const x1 = Math.round(xs[i + 1]!);
      fillPx(ctx, color, x0, y, Math.max(1, x1 - x0), 1, alpha);
    }
  }
}

/** Percurso de segmentos com a espessura caindo até a ponta (chifres, cauda). */
function taper(ctx: Ctx, color: number, pts: readonly Point[], thick: readonly number[]): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    linePx(ctx, color, a.x, a.y, b.x, b.y, thick[i] ?? 1);
  }
}

/** Brilho das rachaduras: a cor e a opacidade sobem com `glow`. */
function crack(ctx: Ctx, glow: number, pts: readonly Point[]): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    linePx(ctx, ROCK_DEEP, a.x, a.y, b.x, b.y, 1);
    if (glow >= 1) linePx(ctx, glow === 1 ? CRACK_DIM : EYE_HOT, a.x, a.y, b.x, b.y, 1);
  }
  if (glow < 2) return;
  // Miolo mais quente em alguns pontos da fenda
  for (let i = 1; i < pts.length; i += 2) {
    const a = pts[i]!;
    fillPx(ctx, EYE_CORE, a.x, a.y, 1, 1, glow >= 3 ? 1 : 0.7);
  }
}

interface WingShape {
  wrist: Point;
  tips: readonly Point[];
}

const P = (x: number, y: number): Point => ({ x, y });

/** Asa de perto, por nível (relativa ao ombro): dobrada, se soltando, erguida e aberta. */
const WING_NEAR: readonly WingShape[] = [
  { wrist: P(-3, -11), tips: [P(-12, -5), P(-11, 3), P(-5, 6)] },
  { wrist: P(-3, -11), tips: [P(-13, -7), P(-13, 0), P(-7, 5)] },
  { wrist: P(-3, -16), tips: [P(-18, -13), P(-19, -4), P(-12, 3)] },
  { wrist: P(0, -17), tips: [P(-22, -18), P(-26, -8), P(-19, 1)] },
];
/** Asa de longe aberta: aponta para a frente, para a silhueta mostrar as duas asas. */
const WING_FAR_OPEN: WingShape = {
  wrist: P(6, -17),
  tips: [P(22, -18), P(25, -8), P(18, 0)],
};

function drawWing(
  ctx: Ctx,
  shape: WingShape,
  s: Point,
  dx: number,
  dy: number,
  far: boolean,
): void {
  const sh: Point = { x: s.x + dx, y: s.y + dy };
  const wrist: Point = { x: sh.x + shape.wrist.x, y: sh.y + shape.wrist.y };
  const tips = shape.tips.map((t) => ({ x: sh.x + t.x, y: sh.y + t.y }));
  const membrane = far ? ROCK_DEEP : ROCK_DARK;
  const bone = far ? ROCK_DARK : ROCK;
  // Borda recortada: entre duas pontas a membrana volta um pouco para o pulso
  const edge: Point[] = [sh, wrist];
  tips.forEach((t, i) => {
    edge.push(t);
    const next = tips[i + 1];
    if (next) {
      edge.push({
        x: Math.round((t.x + next.x) / 2 + (wrist.x - (t.x + next.x) / 2) * 0.22),
        y: Math.round((t.y + next.y) / 2 + (wrist.y - (t.y + next.y) / 2) * 0.22),
      });
    }
  });
  edge.push({ x: sh.x - 7, y: sh.y + 9 });
  polyPx(ctx, membrane, edge);
  // Costelas e osso do braço da asa
  for (const t of tips) linePx(ctx, bone, wrist.x, wrist.y, t.x, t.y, 1);
  linePx(ctx, bone, sh.x, sh.y, wrist.x, wrist.y, far ? 2 : 3);
  if (!far) {
    linePx(ctx, ROCK_LIGHT, sh.x, sh.y - 1, wrist.x, wrist.y - 1, 1);
    fillPx(ctx, ROCK_LIGHT, wrist.x - 1, wrist.y - 1, 3, 3);
    // Furo rachado na membrana e musgo no alto do osso
    fillPx(ctx, ROCK_DEEP, Math.round((wrist.x + sh.x) / 2) - 4, wrist.y + 6, 2, 3);
    fillPx(ctx, MOSS, Math.round((wrist.x + sh.x) / 2), wrist.y + 1, 3, 1);
  }
  for (const t of tips) fillPx(ctx, far ? CLAW_SHADE : CLAW, t.x, t.y, 1, 1);
}

/** Olho em brasa: do apagado (1) ao vivo (3); fechado (0) é só uma fenda. */
function drawEye(ctx: Ctx, x: number, y: number, size: number, eyes: number, far: boolean): void {
  fillPx(ctx, ROCK_DEEP, x - 1, y - 1, size + 2, 3);
  if (eyes === 0) {
    fillPx(ctx, OUTLINE, x, y, size, 1);
    return;
  }
  const color = eyes === 1 ? EYE_DIM : eyes === 2 ? EYE : EYE_HOT;
  if (eyes >= 2 && !far) blob(ctx, EYE_HOT, x + 1, y, 4, 3, { alpha: eyes === 3 ? 0.3 : 0.16 });
  fillPx(ctx, color, x, y, size, 2);
  if (eyes === 3 && !far) fillPx(ctx, EYE_CORE, x + 1, y, 1, 1);
  else if (eyes === 2 && !far) fillPx(ctx, EYE_HOT, x + 1, y, 1, 1);
}

/** Chifre curvo: sobe da nuca em arco e volta para trás; a ponta pode estar quebrada. */
function drawHorn(ctx: Ctx, base: Point, far: boolean, broken: boolean): void {
  const pts: Point[] = [
    base,
    P(base.x - 2, base.y - 3),
    P(base.x - 4, base.y - 7),
    P(base.x - 8, base.y - 9),
  ];
  if (!broken) pts.push(P(base.x - 12, base.y - 7));
  const widths = broken ? [4, 3, 3] : [4, 3, 2, 1];
  // Sombra funda de 1 px em volta (o pincel é quadrado e ancorado no canto)
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    linePx(ctx, ROCK_DEEP, a.x - 1, a.y - 1, b.x - 1, b.y - 1, (widths[i] ?? 1) + 2);
  }
  taper(ctx, far ? ROCK : ROCK_LIGHT, pts, widths);
  if (far) return;
  // Luz no lado de cima da curva, anéis de desgaste e a quina da ponta quebrada
  taper(
    ctx,
    ROCK_HI,
    [P(base.x - 1, base.y - 3), P(base.x - 3, base.y - 7), P(base.x - 7, base.y - 9)],
    [1, 1],
  );
  taper(
    ctx,
    ROCK,
    [P(base.x + 1, base.y - 1), P(base.x - 1, base.y - 3), P(base.x - 2, base.y - 6)],
    [1, 1],
  );
  fillPx(ctx, ROCK_DEEP, base.x - 3, base.y - 4, 3, 1);
  if (broken) fillPx(ctx, ROCK_DEEP, base.x - 10, base.y - 9, 1, 3);
}

/** Cabeça de fera: crânio, focinho com presas, mandíbula que desce, olhos e chifres. */
function drawHead(ctx: Ctx, p: GargulaPose, hx: number, hy: number): void {
  const m = p.mouth;
  const jawY = hy + 5 + m;

  // Chifre de longe, atrás da cabeça
  drawHorn(ctx, P(hx + 3, hy - 6), true, false);

  // Pescoço grosso e escuro, ligando ao tronco
  blob(ctx, ROCK_DEEP, hx - 6, hy + 4, 7, 7);
  blob(ctx, ROCK_DARK, hx - 6, hy + 4, 6, 6);

  // Mandíbula de baixo (desce quando a boca abre), com a boca escura por dentro
  if (m > 0) fillPx(ctx, MOUTH_IN, hx + 2, hy + 3, 12, m + 3);
  fillPx(ctx, ROCK_DEEP, hx + 1, jawY, 13, 4);
  fillPx(ctx, ROCK, hx + 2, jawY, 11, 2);
  fillPx(ctx, ROCK_LIGHT, hx + 3, jawY, 7, 1);

  // Crânio largo e focinho de fera, mais claros que o tronco (a cabeça chama o olhar), com a
  // sombra funda em volta para separar do corpo
  blob(ctx, ROCK_DEEP, hx, hy - 1, 9, 7);
  blob(ctx, ROCK_LIGHT, hx, hy - 2, 8, 6);
  blob(ctx, ROCK, hx - 1, hy + 1, 7, 3, { minY: hy + 1 });
  fillPx(ctx, ROCK_HI, hx - 3, hy - 7, 4, 1);
  fillPx(ctx, ROCK_DEEP, hx + 4, hy - 2, 11, 8);
  fillPx(ctx, ROCK_LIGHT, hx + 5, hy - 1, 9, 5);
  fillPx(ctx, ROCK_HI, hx + 6, hy - 1, 6, 1);
  fillPx(ctx, ROCK, hx + 5, hy + 2, 9, 2);
  fillPx(ctx, OUTLINE, hx + 12, hy, 2, 1); // narinas
  // Presas: as de cima para baixo e as de baixo para cima, de focinho torto
  fillPx(ctx, CLAW, hx + 12, hy + 4, 1, 2 + (m > 0 ? 1 : 0));
  fillPx(ctx, CLAW, hx + 8, hy + 4, 1, 1 + (m > 0 ? 1 : 0));
  fillPx(ctx, CLAW, hx + 13, jawY - 3, 1, 3);
  fillPx(ctx, CLAW, hx + 10, jawY - 2, 1, 2);

  // Sobrancelha pesada de sombra e olhos fundos de brasa
  fillPx(ctx, ROCK, hx - 1, hy - 4, 12, 1);
  fillPx(ctx, ROCK_DARK, hx + 1, hy - 3, 11, 1);
  drawEye(ctx, hx + 8, hy - 2, 2, p.eyes, true);
  drawEye(ctx, hx + 3, hy - 2, 3, p.eyes, false);

  // Rachadura que desce da testa e musgo atrás do crânio
  crack(ctx, p.glow, [P(hx - 3, hy - 7), P(hx - 2, hy - 4), P(hx - 4, hy - 1), P(hx - 3, hy + 2)]);
  fillPx(ctx, MOSS, hx - 7, hy - 4, 3, 1);
  fillPx(ctx, MOSS_LIGHT, hx - 6, hy - 4, 1, 1);

  // Chifre de perto, a ponta quebrada
  drawHorn(ctx, P(hx - 1, hy - 6), false, true);
}

/** Pata traseira: coxa grossa de agachada e pé de garras (de longe, só uma sombra). */
function drawHindLeg(ctx: Ctx, p: GargulaPose, hip: Point, base: number, far: boolean): void {
  const dark = far ? ROCK_DEEP : ROCK_DARK;
  const mid = far ? ROCK_DARK : ROCK;
  const claw = far ? CLAW_SHADE : CLAW;
  const h: Point = { x: hip.x + (far ? 5 : 0), y: hip.y };
  let foot: Point;
  let knee: Point;
  if (p.legs === 2) {
    knee = P(h.x - 4, Math.min(h.y + 5, base - 8));
    foot = P(h.x - 12, Math.min(h.y + 10, base - 5));
  } else if (p.legs === 1) {
    knee = P(h.x + 2, Math.min(h.y + 6, base - 8));
    foot = P(h.x - 1, Math.min(h.y + 11, base - 5));
  } else {
    knee = P(h.x - 3, h.y + 4);
    foot = P(h.x + 1, base - 5);
  }
  linePx(ctx, ROCK_DEEP, knee.x - 1, knee.y - 1, foot.x - 1, foot.y - 1, far ? 4 : 6);
  linePx(ctx, dark, knee.x, knee.y, foot.x, foot.y, far ? 3 : 4);
  if (!far) linePx(ctx, mid, knee.x + 1, knee.y, foot.x + 1, foot.y, 2);
  blob(ctx, ROCK_DEEP, h.x, h.y, 8, 8);
  blob(ctx, dark, h.x, h.y, 7, 7);
  blob(ctx, mid, h.x, h.y - 1, 6, 6);
  if (!far) {
    blob(ctx, ROCK_LIGHT, h.x - 1, h.y - 5, 3, 0);
    fillPx(ctx, ROCK_LIGHT, h.x - 3, h.y - 3, 2, 1);
    fillPx(ctx, ROCK_DEEP, h.x + 1, h.y + 1, 2, 3); // junta rachada
    fillPx(ctx, MOSS, h.x - 4, h.y - 5, 3, 1);
  }
  // Pé: dedos grossos com garras para a frente (esticado: garras para trás)
  if (p.legs === 2) {
    fillPx(ctx, dark, foot.x - 3, foot.y - 1, 6, 3);
    for (const dy of [-1, 1]) fillPx(ctx, claw, foot.x - 5, foot.y + dy, 2, 1);
  } else if (p.legs === 1) {
    fillPx(ctx, dark, foot.x - 3, foot.y - 1, 7, 3);
    for (const dy of [-1, 1]) fillPx(ctx, claw, foot.x + 4, foot.y + dy, 2, 1);
  } else {
    fillPx(ctx, dark, foot.x - 4, base - 3, 12, 3);
    fillPx(ctx, mid, foot.x - 3, base - 3, 9, 1);
    for (const dx of [5, 7, 9]) fillPx(ctx, claw, foot.x + dx, base - 1, 2, 1);
    fillPx(ctx, claw, foot.x + 8, base - 3, 1, 1);
  }
}

/** Braço da frente: ombro musculoso, cotovelo e mão de garras (apoiado, erguido ou esticado). */
function drawArm(ctx: Ctx, p: GargulaPose, shoulder: Point, base: number, far: boolean): void {
  const dark = far ? ROCK_DEEP : ROCK_DARK;
  const mid = far ? ROCK_DARK : ROCK;
  const claw = far ? CLAW_SHADE : CLAW;
  const s: Point = { x: shoulder.x + (far ? -4 : 0), y: shoulder.y };
  let elbow: Point;
  let fist: Point;
  if (p.arms === 2) {
    elbow = P(s.x + 6, s.y + 1);
    fist = P(s.x + 13, s.y + 3);
  } else if (p.arms === 1) {
    elbow = P(s.x + 3, s.y + 6);
    fist = P(s.x + 10, Math.min(s.y + 8, base - 8));
  } else {
    elbow = P(s.x + 2, s.y + 6);
    fist = P(s.x + 7, Math.min(s.y + 9, base - 4));
  }
  // O pincel quadrado e a sombra funda não passam do chão
  elbow.y = Math.min(elbow.y, base - 8);
  fist.y = Math.min(fist.y, base - 5);
  // Sombra funda em volta, para o braço não sumir contra o tronco
  linePx(ctx, ROCK_DEEP, s.x - 1, s.y - 1, elbow.x - 1, elbow.y - 1, far ? 6 : 8);
  linePx(ctx, ROCK_DEEP, elbow.x - 1, elbow.y - 1, fist.x - 1, fist.y - 1, far ? 5 : 6);
  linePx(ctx, dark, s.x, s.y, elbow.x, elbow.y, far ? 5 : 6);
  linePx(ctx, dark, elbow.x, elbow.y, fist.x, fist.y, far ? 4 : 5);
  if (!far) {
    linePx(ctx, mid, s.x, s.y - 1, elbow.x, elbow.y - 1, 3);
    linePx(ctx, mid, elbow.x, elbow.y, fist.x, fist.y, 2);
    fillPx(ctx, ROCK_LIGHT, s.x - 1, s.y - 2, 3, 1);
    fillPx(ctx, ROCK_DEEP, elbow.x, elbow.y + 2, 2, 2);
  }
  // Punho e garras grossas
  blob(ctx, ROCK_DEEP, fist.x, fist.y, 4, 4);
  blob(ctx, dark, fist.x, fist.y, 3, 3);
  if (!far) blob(ctx, mid, fist.x, fist.y - 1, 2, 2);
  if (p.arms === 2) {
    for (const dy of [-3, 0, 3]) {
      const tipY = fist.y + dy + (dy > 0 ? 2 : dy < 0 ? -2 : 0);
      linePx(ctx, claw, fist.x + 2, fist.y + dy, fist.x + 7, tipY, 1);
    }
  } else if (p.arms === 1) {
    for (const dx of [-2, 1, 4])
      linePx(ctx, claw, fist.x + dx, fist.y - 3, fist.x + dx + 1, fist.y - 7, 1);
  } else {
    for (const dy of [-1, 1, 3]) {
      fillPx(ctx, claw, fist.x + 3, Math.min(fist.y + dy, base - 1), 3, 1);
    }
  }
}

/** Lascas de pedra voando (dano, pouso pesado). */
function drawChips(ctx: Ctx, bx: number, cy: number, chips: number): void {
  if (chips <= 0) return;
  const spots: readonly (readonly [number, number, number, number, number])[] = [
    [-15, -12, 3, 2, ROCK_LIGHT],
    [-19, -3, 2, 2, ROCK],
    [12, -16, 2, 2, ROCK_LIGHT],
    [16, -6, 3, 2, ROCK],
    [-9, -19, 2, 1, ROCK_HI],
    [20, -11, 1, 1, ROCK_HI],
  ];
  const count = chips >= 2 ? spots.length : 3;
  for (let i = 0; i < count; i++) {
    const [dx, dy, w, h, color] = spots[i]!;
    fillPx(ctx, color, bx + dx, cy + dy, w, h);
  }
}

/** Górgola de pé, agachada ou no ar (todas as poses vivas). */
function drawStanding(ctx: Ctx, p: GargulaPose): void {
  const base = GROUND - p.air;
  const bx = BODY_X + p.lunge;
  const ry = p.crouch >= 4 ? 7 : 8;
  const rx = 10 + (p.crouch >= 3 ? 1 : 0);
  const cy = Math.min(base - 14 + p.crouch - p.bob, base - ry - 2);
  const hx = bx + 11 + p.lean;
  const hy = cy - 6 + Math.round(p.lean / 2);
  const shoulder: Point = { x: bx - (p.wings === 3 ? 2 : 5), y: cy - ry + 4 };

  // Asas atrás do tronco: a de longe aparece ao lado da de perto (aberta, aponta para a frente)
  if (p.wings === 3) drawWing(ctx, WING_FAR_OPEN, shoulder, 6, 0, true);
  else drawWing(ctx, WING_NEAR[p.wings]!, shoulder, 4, -2, true);
  drawWing(ctx, WING_NEAR[p.wings]!, shoulder, 0, 0, false);

  // Cauda curta e grossa, com a ponta lascada (o pincel quadrado nunca passa do chão)
  const tailPts = [
    P(bx - 8, Math.min(cy + 3, base - 7)),
    P(bx - 13, Math.min(cy + 6, base - 7)),
    P(bx - 15, Math.min(cy + 3, base - 7)),
  ];
  taper(ctx, ROCK_DEEP, tailPts, [7, 5]);
  taper(ctx, ROCK_DARK, tailPts, [5, 3]);
  fillPx(ctx, ROCK_LIGHT, bx - 13, Math.min(cy + 4, base - 8), 2, 1);

  // Membros de longe (sombra), antes do tronco
  drawHindLeg(ctx, p, P(bx - 6, Math.min(cy + 3, base - 10)), base, true);
  drawArm(ctx, p, P(bx + 5, cy + 1), base, true);

  // Tronco: dorso largo de pedra com a corcunda dos ombros, barriga mais escura
  blob(ctx, ROCK_DARK, bx, cy, rx, ry);
  blob(ctx, ROCK, bx, cy - 1, rx - 1, ry - 1);
  blob(ctx, ROCK, bx + 3, cy - ry + 1, 6, 3);
  blob(ctx, ROCK_LIGHT, bx, cy - ry + 2, rx - 4, 1);
  blob(ctx, ROCK_DARK, bx + 2, cy + ry - 2, rx - 4, 3, { minY: cy + 2 });
  fillPx(ctx, ROCK_HI, bx - 4, cy - ry + 1, 4, 1);
  // Placas e juntas da pedra
  fillPx(ctx, ROCK_DEEP, bx - 6, cy - 3, 5, 1);
  fillPx(ctx, ROCK_DEEP, bx + 1, cy + 2, 6, 1);
  fillPx(ctx, ROCK_DEEP, bx - 3, cy + 5, 4, 1);
  // Rachadura grande atravessando o peito, e outra menor no dorso
  crack(ctx, p.glow, [
    P(bx + 2, cy - ry + 2),
    P(bx, cy - 3),
    P(bx + 3, cy),
    P(bx + 1, cy + 3),
    P(bx + 4, cy + ry - 2),
  ]);
  crack(ctx, p.glow, [P(bx - 8, cy - 5), P(bx - 6, cy - 2), P(bx - 9, cy + 1)]);
  // Musgo no dorso e lascas faltando na borda
  fillPx(ctx, MOSS, bx - 8, cy - ry + 2, 6, 2);
  fillPx(ctx, MOSS_LIGHT, bx - 7, cy - ry + 2, 2, 1);
  fillPx(ctx, MOSS, bx - 2, cy + 3, 3, 1);
  fillPx(ctx, ROCK_DEEP, bx + 8, cy + 3, 2, 2);
  fillPx(ctx, ROCK_DEEP, bx - 10, cy - 1, 2, 2);

  // Pata traseira de perto, por cima do tronco
  drawHindLeg(ctx, p, P(bx - 6, Math.min(cy + 3, base - 10)), base, false);

  // Cabeça por cima do tronco e, à frente de tudo, o braço de perto
  drawHead(ctx, p, hx, hy);
  drawArm(ctx, p, P(bx + 5, cy + 1), base, false);

  drawChips(ctx, bx, cy, p.chips);
}

/** Bloco de escombro: sombra, face e quina clara em cima. */
function rubble(ctx: Ctx, x: number, y: number, w: number, h: number, tone: number): void {
  fillPx(ctx, ROCK_DEEP, x, y, w, h);
  fillPx(ctx, tone, x, y, w - 1, h - 1);
  fillPx(ctx, ROCK_LIGHT, x, y, Math.max(1, w - 2), 1, 0.9);
}

/** Desabando: a pedra rachou de cima a baixo, pedaços se soltam e a cabeça cai. */
function drawCollapsing(ctx: Ctx, p: GargulaPose): void {
  const base = GROUND;
  const bx = BODY_X;
  // Corpo meio desfeito: agachado, olhos apagados, rachaduras em brasa
  drawStanding(ctx, { ...p, dead: 0, crouch: 6, lean: -1, wings: 0, arms: 0, legs: 0, bob: 0 });
  // Fendas grandes e lacunas de onde saíram pedaços
  crack(ctx, 3, [
    P(bx - 10, base - 22),
    P(bx - 4, base - 15),
    P(bx - 7, base - 9),
    P(bx, base - 4),
  ]);
  crack(ctx, 3, [P(bx + 9, base - 21), P(bx + 5, base - 14), P(bx + 9, base - 8)]);
  fillPx(ctx, ROCK_DEEP, bx + 2, base - 20, 5, 4);
  fillPx(ctx, ROCK_DEEP, bx - 11, base - 13, 4, 3);
  // Brasa escapando das fendas
  blob(ctx, EYE_HOT, bx - 4, base - 14, 4, 3, { alpha: 0.15 });
  // Pedaços caindo, soltos do tronco e da cabeça
  rubble(ctx, bx + 16, base - 22, 5, 4, ROCK);
  rubble(ctx, bx + 20, base - 12, 4, 3, ROCK_DARK);
  rubble(ctx, bx - 20, base - 20, 5, 4, ROCK);
  rubble(ctx, bx - 22, base - 8, 4, 3, ROCK_DARK);
  rubble(ctx, bx + 9, base - 6, 4, 3, ROCK);
  // Poeira de pedra
  fillPx(ctx, ROCK_LIGHT, bx - 14, base - 4, 6, 2, 0.45);
  fillPx(ctx, ROCK_LIGHT, bx + 12, base - 3, 7, 2, 0.45);
}

/** Pilha de escombros: sobraram pedras, a cabeça de lado, uma garra, um chifre e brasas apagando. */
function drawRubblePile(ctx: Ctx): void {
  const gy = GROUND;
  // Pedras da base ao topo
  rubble(ctx, CX - 18, gy - 4, 9, 4, ROCK_DARK);
  rubble(ctx, CX - 10, gy - 6, 9, 6, ROCK);
  rubble(ctx, CX - 1, gy - 5, 10, 5, ROCK_DARK);
  rubble(ctx, CX + 9, gy - 4, 9, 4, ROCK);
  rubble(ctx, CX - 14, gy - 10, 7, 4, ROCK);
  rubble(ctx, CX - 6, gy - 12, 8, 6, ROCK_DARK);
  rubble(ctx, CX + 3, gy - 10, 8, 5, ROCK);
  rubble(ctx, CX - 3, gy - 16, 6, 4, ROCK);
  // Pedras soltas em volta
  rubble(ctx, CX - 22, gy - 2, 4, 2, ROCK);
  rubble(ctx, CX + 19, gy - 2, 4, 2, ROCK_DARK);
  // Brasa ainda acesa entre as pedras
  fillPx(ctx, EYE_DIM, CX - 2, gy - 1, 3, 1, 0.9);
  fillPx(ctx, EYE_HOT, CX + 5, gy - 5, 2, 1, 0.7);
  fillPx(ctx, EYE_HOT, CX - 9, gy - 7, 1, 1, 0.7);
  // Cabeça caída de lado sobre o monte, olhos apagados, boca entreaberta
  const hx = CX + 4;
  const hy = gy - 18;
  blob(ctx, ROCK_DARK, hx, hy, 7, 5);
  blob(ctx, ROCK, hx, hy - 1, 6, 4);
  fillPx(ctx, ROCK_LIGHT, hx - 3, hy - 4, 4, 1);
  fillPx(ctx, ROCK_DARK, hx + 3, hy - 1, 6, 5);
  fillPx(ctx, ROCK, hx + 3, hy - 1, 5, 3);
  fillPx(ctx, MOUTH_IN, hx + 4, hy + 2, 5, 1);
  fillPx(ctx, CLAW, hx + 8, hy + 2, 1, 2);
  fillPx(ctx, CLAW, hx + 5, hy + 3, 1, 1);
  fillPx(ctx, ROCK_DEEP, hx + 1, hy - 2, 3, 2);
  fillPx(ctx, OUTLINE, hx + 1, hy - 1, 2, 1);
  fillPx(ctx, OUTLINE, hx + 9, hy, 1, 1);
  crack(ctx, 1, [P(hx - 1, hy - 4), P(hx, hy - 1), P(hx - 2, hy + 2)]);
  fillPx(ctx, MOSS, hx - 5, hy - 3, 3, 1);
  // Chifre inteiro caído no chão e outro quebrado em pé
  taper(ctx, ROCK_DARK, [P(CX - 16, gy - 5), P(CX - 20, gy - 9), P(CX - 21, gy - 13)], [4, 3]);
  taper(ctx, ROCK, [P(CX - 16, gy - 6), P(CX - 20, gy - 10)], [2]);
  fillPx(ctx, ROCK_DARK, CX + 12, gy - 11, 3, 6);
  fillPx(ctx, ROCK, CX + 12, gy - 11, 2, 5);
  // Garra que sobrou, e um resto de asa com a costela de fora
  for (const dx of [0, 2, 4]) fillPx(ctx, CLAW, CX + 14 + dx, gy - 8 - (dx === 2 ? 1 : 0), 1, 3);
  polyPx(ctx, ROCK_DARK, [
    P(CX - 12, gy - 11),
    P(CX - 10, gy - 20),
    P(CX - 6, gy - 17),
    P(CX - 7, gy - 11),
  ]);
  linePx(ctx, ROCK, CX - 11, gy - 11, CX - 10, gy - 20, 1);
  fillPx(ctx, MOSS, CX - 12, gy - 8, 3, 1);
  fillPx(ctx, MOSS_LIGHT, CX + 5, gy - 5, 2, 1);
  fillPx(ctx, ROCK_LIGHT, CX - 3, gy - 20, 1, 1, 0.5);
}

export function drawGargula(ctx: Ctx, p: GargulaPose): void {
  if (p.dead === 2) drawRubblePile(ctx);
  else if (p.dead === 1) drawCollapsing(ctx, p);
  else drawStanding(ctx, p);
}
