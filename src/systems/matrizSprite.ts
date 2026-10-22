import { PALETTE } from '../data/palette';
import type { MatrizPose } from '../data/matrizSprites';
import { fillPx, linePx } from './pixelSheet';

/**
 * A Matriz de Cristal em pixel art: corpo largo e baixo de rocha escura rachada, fundido com
 * cristais azul-turquesa que saem das costas e dos ombros, dois braços grossos de cristal com
 * punhos facetados, um núcleo aceso no peito, a cabeça pequena afundada entre os ombros e pernas
 * curtas de pedra. Quadro de 62 x 62 (o corpo de colisão tem 34 x 38); as poses ficam em
 * src/data/matrizSprites.ts.
 */
type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };
/** Três tons de um cristal: faceta escura (lado da sombra), faceta média e aresta clara. */
type Tone = readonly [number, number, number];

const TEAL_DEEP = 0x0b3a47;
const TEAL_DARK = 0x136373;
const TEAL = 0x1f93a8;
const TEAL_LIGHT = 0x3cc3d4;
const DULL_DARK = 0x1c3138;
const DULL = 0x2b4b56;
const DULL_LIGHT = 0x40707c;

const TONES: readonly Tone[] = [
  [DULL_DARK, DULL, DULL_LIGHT],
  [TEAL_DARK, TEAL, TEAL_LIGHT],
  [TEAL, TEAL_LIGHT, PALETTE.player],
  [TEAL_LIGHT, PALETTE.player, PALETTE.playerAccent],
];
/** Cristais do lado de trás ficam mais escuros que os da frente. */
const BACK_TONE: Tone = [TEAL_DEEP, TEAL_DARK, TEAL];
const BACK_DULL: Tone = [PALETTE.void, DULL_DARK, DULL];

const tone = (glow: number, back = false): Tone => {
  if (back) return glow === 0 ? BACK_DULL : BACK_TONE;
  return TONES[glow] ?? BACK_DULL;
};

export function drawMatriz(ctx: Ctx, p: MatrizPose): void {
  const cx = 30;
  const feet = 49; // base do corpo de colisão (38 + 12 de folga) menos 1 px para o contorno
  if (p.crumble === 2) {
    drawPile(ctx, cx, feet);
    return;
  }
  const g = p.glow;
  const tx = cx + p.lean; // centro do tronco
  const top = feet - 30 - p.bob;
  const bottom = Math.min(top + 23, feet - 5);

  drawBackCrystals(ctx, tx, top, g, p.spike, p.crumble === 1 ? -3 : 0);

  drawLeg(ctx, cx - 12, p.legB, p.liftB, feet, g, true);
  drawLeg(ctx, cx + 2, p.legF, p.liftF, feet, g, false);

  const shoulderB: Point = { x: tx - 14, y: top + 5 };
  const shoulderF: Point = { x: tx + 14, y: top + 5 };
  const handB: Point = { x: shoulderB.x + p.armB.dx, y: shoulderB.y + p.armB.dy };
  const handF: Point = { x: shoulderF.x + p.armF.dx, y: shoulderF.y + p.armF.dy };
  drawArm(ctx, shoulderB, handB, -1, g, true);

  drawTorso(ctx, tx, top, bottom);
  drawCracks(ctx, tx, top, bottom - 2, g, p.cracks, p.crumble === 1);
  drawCore(ctx, tx + 1, top + Math.min(12, bottom - top - 7), p.core ?? g);
  const baseY = Math.min(top + 19, bottom - 1);
  crystal(ctx, tx - 10, baseY, 7, 4, -2, tone(g), g >= 2);
  crystal(ctx, tx + 10, baseY + 1, 6, 4, 2, tone(g), g >= 2);
  drawPauldron(ctx, tx - 12, top, -1, g, true);

  drawHead(ctx, tx + 2 + Math.round(p.droop * 0.5), top - 3 + p.droop, g);

  drawArm(ctx, shoulderF, handF, 1, g, false);
  drawPauldron(ctx, tx + 13, top, 1, g, false);

  if (p.crumble === 1) drawRubble(ctx, cx, feet);
  if (p.shards !== 0) drawShards(ctx, tx, feet, p.shards);
}

/**
 * Um cristal: prisma que afina até a ponta, com faceta clara à esquerda, aresta no meio e faceta
 * escura à direita. `lean` entorta a ponta para o lado; `sparkle` põe o brilho branco na ponta.
 */
function crystal(
  ctx: Ctx,
  x: number,
  baseY: number,
  h: number,
  w: number,
  lean: number,
  t: Tone,
  sparkle = false,
): void {
  const [dark, mid, light] = t;
  for (let i = 0; i < h; i++) {
    const k = h > 1 ? i / (h - 1) : 0;
    const rw = Math.max(1, Math.ceil(w * (1 - k)));
    const left = Math.floor(rw / 2);
    const x0 = x - left + Math.round(lean * k);
    const y = baseY - i;
    if (i === h - 1) {
      fillPx(ctx, sparkle ? PALETTE.playerAccent : light, x0, y, rw, 1);
    } else if (rw === 1) {
      fillPx(ctx, light, x0, y, 1, 1);
    } else if (rw === 2) {
      fillPx(ctx, mid, x0, y, 1, 1);
      fillPx(ctx, dark, x0 + 1, y, 1, 1);
    } else {
      fillPx(ctx, mid, x0, y, left, 1);
      fillPx(ctx, light, x0 + left, y, 1, 1);
      fillPx(ctx, dark, x0 + left + 1, y, rw - left - 1, 1);
    }
  }
}

/** Os grandes cristais que saem das costas e passam por trás da cabeça. */
function drawBackCrystals(
  ctx: Ctx,
  tx: number,
  top: number,
  glow: number,
  spike: number,
  tilt: number,
): void {
  const extra = [0, 1, 3][spike] ?? 0;
  const t = tone(glow, true);
  const front = tone(glow);
  const sparkle = glow >= 2;
  crystal(ctx, tx - 13, top + 8, 13 + extra, 7, -5 + tilt, t, sparkle);
  crystal(ctx, tx - 6, top + 4, 17 + extra, 8, -2 + tilt, front, sparkle);
  crystal(ctx, tx + 3, top + 3, 14 + extra, 7, 2 + tilt, t, sparkle);
  crystal(ctx, tx + 9, top + 4, 10 + extra, 6, 4 + tilt, front, sparkle);
}

/** Perna curta e pesada de pedra, com a laje do pé bem larga. */
function drawLeg(
  ctx: Ctx,
  x: number,
  off: number,
  lift: number,
  feet: number,
  glow: number,
  back: boolean,
): void {
  const x0 = x + off;
  const legTop = feet - 11 - lift;
  const legBottom = feet - lift;
  const h = legBottom - legTop;
  fillPx(ctx, back ? PALETTE.stoneDark : PALETTE.stone, x0, legTop, 10, h);
  if (!back) fillPx(ctx, PALETTE.stoneLight, x0, legTop, 2, h - 3);
  fillPx(ctx, PALETTE.deep, x0 + 8, legTop, 2, h);
  fillPx(ctx, back ? PALETTE.stone : PALETTE.stoneLight, x0 - 1, legBottom - 3, 12, 3);
  fillPx(ctx, PALETTE.deep, x0 - 1, legBottom - 1, 12, 1);
  fillPx(ctx, PALETTE.deep, x0 + 3, legBottom - 3, 1, 2);
  if (glow > 0) fillPx(ctx, back ? TEAL_DARK : TEAL, x0 + 5, legTop + 4, 1, 3);
}

/** Tronco largo: ombros altos, cintura mais estreita, estratos de rocha e lascas claras. */
function drawTorso(ctx: Ctx, cx: number, top: number, bottom: number): void {
  for (let y = top; y < bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top - 1);
    const half = Math.round(10 + 5 * Math.min(1, t / 0.2)) - Math.round(Math.max(0, t - 0.55) * 9);
    const x0 = cx - half;
    fillPx(ctx, PALETTE.stone, x0, y, half * 2, 1);
    fillPx(ctx, PALETTE.stoneLight, x0, y, 2, 1);
    fillPx(ctx, PALETTE.stoneDark, x0 + half * 2 - 3, y, 3, 1);
    if ((y * 7 + 3) % 9 === 0) fillPx(ctx, PALETTE.stoneDark, cx - 9 + (y % 4), y, 6, 1);
    for (const gx of [-7, -3, 4, 8]) {
      if ((y * 5 + gx * 3 + 200) % 13 < 2) fillPx(ctx, PALETTE.stoneLight, cx + gx, y, 1, 1);
    }
  }
  fillPx(ctx, PALETTE.stoneLight, cx - 9, top, 10, 1);
  fillPx(ctx, PALETTE.deep, cx - 8, bottom - 1, 16, 1);
}

/** Rachaduras da rocha, com luz de cristal escorrendo por dentro quando está aceso. */
function drawCracks(
  ctx: Ctx,
  tx: number,
  top: number,
  maxY: number,
  glow: number,
  level: 1 | 2,
  broken: boolean,
): void {
  const lines: readonly (readonly (readonly [number, number])[])[] = [
    [
      [-6, 1],
      [-8, 6],
      [-5, 10],
      [-7, 15],
      [-5, 20],
    ],
    [
      [7, 8],
      [9, 12],
      [6, 17],
      [8, 21],
    ],
    [
      [1, 19],
      [-1, 22],
    ],
    [
      [11, 3],
      [8, 7],
    ],
    [
      [-12, 12],
      [-9, 15],
    ],
  ];
  const lit = glow === 0 ? 0 : glow === 1 ? TEAL_DARK : glow === 2 ? TEAL_LIGHT : PALETTE.player;
  const count = level === 2 ? lines.length : 2;
  for (let i = 0; i < count; i++) {
    const line = lines[i];
    if (!line) continue;
    for (let s = 1; s < line.length; s++) {
      const a = line[s - 1];
      const b = line[s];
      if (!a || !b) continue;
      const ay = Math.min(top + a[1], maxY);
      const by = Math.min(top + b[1], maxY);
      linePx(ctx, PALETTE.void, tx + a[0], ay, tx + b[0], by, broken ? 2 : 1);
      if (lit !== 0) linePx(ctx, lit, tx + a[0] + 1, ay, tx + b[0] + 1, by, 1);
    }
  }
}

/** O núcleo do peito: um losango de cristal cujo brilho sobe com `glow`. */
function drawCore(ctx: Ctx, cx: number, cy: number, glow: number): void {
  const diamond = (r: number, color: number, alpha = 1): void => {
    for (let dy = -r; dy <= r; dy++) {
      const half = r - Math.abs(dy);
      fillPx(ctx, color, cx - half, cy + dy, half * 2 + 1, 1, alpha);
    }
  };
  if (glow === 2) diamond(7, PALETTE.player, 0.18);
  if (glow === 3) diamond(8, PALETTE.player, 0.32);
  diamond(6, PALETTE.deep);
  if (glow === 0) {
    diamond(5, TEAL_DEEP);
    diamond(3, DULL_DARK);
    return;
  }
  const outer = [0, TEAL, TEAL_LIGHT, PALETTE.player][glow] ?? TEAL;
  const inner = [0, TEAL_LIGHT, PALETTE.player, PALETTE.playerAccent][glow] ?? TEAL_LIGHT;
  diamond(5, outer);
  diamond(3, inner);
  diamond(glow === 3 ? 2 : 1, glow === 1 ? PALETTE.player : PALETTE.playerAccent);
  // Faceta que corta o losango na diagonal (dá o ar de cristal lapidado)
  linePx(ctx, glow === 1 ? TEAL_DARK : TEAL, cx - 4, cy + 1, cx - 1, cy + 4, 1);
  if (glow === 3) {
    fillPx(ctx, PALETTE.playerAccent, cx + 7, cy, 2, 1);
    fillPx(ctx, PALETTE.playerAccent, cx - 8, cy, 2, 1);
    fillPx(ctx, PALETTE.playerAccent, cx, cy + 7, 1, 2);
  }
}

/** Ombreira de rocha com um cristal brotando para o alto e para fora. */
function drawPauldron(
  ctx: Ctx,
  px: number,
  top: number,
  side: 1 | -1,
  glow: number,
  back: boolean,
): void {
  const y = top - 1;
  fillPx(ctx, back ? PALETTE.stoneDark : PALETTE.stone, px - 4, y, 9, 7);
  fillPx(ctx, back ? PALETTE.stoneDark : PALETTE.stone, px - 3, y - 1, 7, 1);
  if (!back) {
    fillPx(ctx, PALETTE.stoneLight, px - 3, y - 1, 4, 1);
    fillPx(ctx, PALETTE.stoneLight, px - 4, y, 2, 4);
  }
  fillPx(ctx, PALETTE.deep, px + 2, y, 3, 7);
  fillPx(ctx, PALETTE.deep, px - 4, y + 6, 9, 1);
  crystal(ctx, px + side, y, 9, 5, side * 2, tone(glow, back), glow >= 2 && !back);
}

/** Cabeça pequena e afundada entre os ombros, com duas fendas de olho. */
function drawHead(ctx: Ctx, hx: number, hy: number, glow: number): void {
  fillPx(ctx, PALETTE.stone, hx - 5, hy, 10, 1);
  fillPx(ctx, PALETTE.stone, hx - 6, hy + 1, 12, 7);
  fillPx(ctx, PALETTE.stoneLight, hx - 5, hy, 6, 1);
  fillPx(ctx, PALETTE.stoneLight, hx - 6, hy + 1, 2, 6);
  fillPx(ctx, PALETTE.stoneDark, hx + 3, hy + 1, 3, 7);
  fillPx(ctx, PALETTE.deep, hx - 5, hy + 8, 10, 1);
  linePx(ctx, PALETTE.void, hx + 1, hy, hx + 2, hy + 2, 1); // racha na testa
  crystal(ctx, hx + 3, hy, 4, 3, 1, tone(glow), glow >= 2);

  // Órbitas fundas, com a fenda de cada olho torta para dentro (cara fechada)
  fillPx(ctx, PALETTE.void, hx - 4, hy + 3, 5, 3);
  fillPx(ctx, PALETTE.void, hx + 1, hy + 3, 5, 3);
  if (glow >= 2) fillPx(ctx, PALETTE.player, hx - 4, hy + 2, 10, 5, glow === 3 ? 0.4 : 0.22);
  const eye = glow === 0 ? TEAL_DEEP : glow === 1 ? PALETTE.player : PALETTE.playerAccent;
  fillPx(ctx, eye, hx - 3, hy + 4, 3, 1);
  fillPx(ctx, eye, hx - 3, hy + 3, 1, 1);
  fillPx(ctx, eye, hx + 2, hy + 4, 3, 1);
  fillPx(ctx, eye, hx + 4, hy + 3, 1, 1);
  if (glow === 3) {
    fillPx(ctx, PALETTE.player, hx - 2, hy + 5, 2, 1);
    fillPx(ctx, PALETTE.player, hx + 3, hy + 5, 2, 1);
  }
  fillPx(ctx, PALETTE.deep, hx - 2, hy + 7, 5, 1); // boca: só uma fenda no queixo
}

/** Braço grosso de cristal, dobrado para fora, com um cristal no cotovelo e o punho na ponta. */
function drawArm(
  ctx: Ctx,
  shoulder: Point,
  hand: Point,
  side: 1 | -1,
  glow: number,
  back: boolean,
): void {
  const t = tone(glow, back);
  const fist: Point = { x: hand.x, y: hand.y + 4 };
  const mid: Point = {
    x: Math.round((shoulder.x + fist.x) / 2 + side * 2),
    y: Math.round((shoulder.y + fist.y) / 2),
  };
  for (const [a, b] of [
    [shoulder, mid],
    [mid, fist],
  ] as const) {
    // Fio escuro em volta, para o braço não se misturar aos cristais das costas
    linePx(ctx, PALETTE.void, a.x - 4, a.y - 4, b.x - 4, b.y - 4, 8);
    linePx(ctx, t[0], a.x - 3, a.y - 3, b.x - 3, b.y - 3, 6);
    linePx(ctx, t[1], a.x - 2, a.y - 2, b.x - 2, b.y - 2, 4);
    if (!back) linePx(ctx, t[2], a.x - 3, a.y - 3, b.x - 3, b.y - 3, 2);
  }
  crystal(ctx, mid.x + side * 2, mid.y + 1, 6, 4, side * 3, t, glow >= 2 && !back);
  drawFist(ctx, hand.x, hand.y, t, back);
}

/** Punho facetado: bloco de cristal com os cantos cortados e cristais nos nós dos dedos. */
function drawFist(ctx: Ctx, hx: number, hy: number, t: Tone, back: boolean): void {
  const [dark, mid, light] = t;
  const x = hx - 5;
  fillPx(ctx, PALETTE.void, x - 1, hy, 12, 9);
  fillPx(ctx, mid, x + 1, hy, 8, 1);
  fillPx(ctx, mid, x, hy + 1, 10, 7);
  fillPx(ctx, mid, x + 1, hy + 8, 8, 1);
  fillPx(ctx, light, x + 1, hy, 5, 1);
  fillPx(ctx, light, x, hy + 1, 2, 5);
  fillPx(ctx, dark, x + 7, hy + 1, 3, 7);
  fillPx(ctx, dark, x + 1, hy + 7, 8, 2);
  // Facetas dos nós dos dedos
  linePx(ctx, dark, x + 3, hy + 6, x + 5, hy + 2, 1);
  linePx(ctx, light, x + 4, hy + 6, x + 6, hy + 2, 1);
  fillPx(ctx, PALETTE.void, x + 2, hy + 8, 6, 1);
  crystal(ctx, hx - 2, hy, 4, 3, -1, t, !back);
  crystal(ctx, hx + 2, hy, 5, 3, 1, t, !back);
}

/** Pedras caídas em volta dos pés (o corpo afunda no desmoronamento). */
function drawRubble(ctx: Ctx, cx: number, feet: number): void {
  const lumps: readonly (readonly [number, number, number])[] = [
    [-19, 7, 3],
    [-13, 8, 5],
    [-5, 9, 6],
    [4, 8, 5],
    [11, 8, 4],
    [16, 6, 2],
  ];
  for (const [x, w, h] of lumps) {
    fillPx(ctx, PALETTE.stone, cx + x, feet - h, w, h);
    fillPx(ctx, PALETTE.stoneLight, cx + x, feet - h, w - 2, 1);
    fillPx(ctx, PALETTE.deep, cx + x + w - 2, feet - h + 1, 2, h - 1);
    fillPx(ctx, PALETTE.deep, cx + x, feet - 1, w, 1);
  }
}

/** Cacos que voam: estilhaços da pancada no chão ou lascas que saltam do corpo ferido. */
function drawShards(ctx: Ctx, tx: number, feet: number, kind: 1 | 2 | 3): void {
  if (kind === 1) {
    crystal(ctx, tx + 21, feet - 1, 6, 3, 1, tone(1));
    crystal(ctx, tx + 25, feet - 1, 4, 3, 1, tone(1));
    fillPx(ctx, PALETTE.stoneLight, tx + 17, feet - 1, 2, 1);
    fillPx(ctx, PALETTE.stone, tx - 22, feet - 1, 3, 1);
    fillPx(ctx, TEAL, tx - 18, feet - 1, 1, 1);
    return;
  }
  if (kind === 2) {
    crystal(ctx, tx + 21, feet - 1, 9, 4, 1, tone(3), true);
    crystal(ctx, tx + 25, feet - 1, 5, 3, 2, tone(2));
    crystal(ctx, tx - 22, feet - 1, 5, 3, -1, tone(2));
    // Estilhaços no ar
    const bits: readonly (readonly [number, number, number, number, number])[] = [
      [17, 13, 2, 2, PALETTE.playerAccent],
      [26, 16, 2, 2, PALETTE.player],
      [22, 22, 1, 2, PALETTE.playerAccent],
      [15, 19, 1, 1, PALETTE.player],
      [27, 10, 1, 2, TEAL_LIGHT],
      [-19, 10, 2, 2, PALETTE.player],
      [-17, 15, 1, 1, PALETTE.stoneLight],
    ];
    for (const [x, y, w, h, c] of bits) fillPx(ctx, c, tx + x, feet - y, w, h);
    fillPx(ctx, PALETTE.stoneLight, tx + 12, feet - 1, 3, 1);
    return;
  }
  const chips: readonly (readonly [number, number, number, number, number])[] = [
    [16, 34, 2, 2, PALETTE.playerAccent],
    [-19, 29, 2, 1, PALETTE.player],
    [19, 24, 1, 2, TEAL_LIGHT],
    [-20, 20, 2, 2, TEAL],
    [-3, 38, 2, 2, PALETTE.stoneLight],
    [22, 15, 2, 1, PALETTE.stoneLight],
    [-22, 12, 1, 2, PALETTE.player],
    [8, 40, 1, 1, PALETTE.playerAccent],
  ];
  for (const [x, y, w, h, c] of chips) fillPx(ctx, c, tx + x, feet - y, w, h);
}

/** A pilha de cacos em que a Matriz se desfaz: rocha amontoada, cristais partidos e os punhos. */
function drawPile(ctx: Ctx, cx: number, feet: number): void {
  drawFist(ctx, cx - 18, feet - 9, tone(0, true), true);
  drawFist(ctx, cx + 17, feet - 8, tone(0), false);
  for (let x = -20; x <= 20; x++) {
    const bump = (x * 5 + 3) % 4 === 0 ? 1 : 0;
    const dip = (x * 3) % 5 === 0 ? 1 : 0;
    const h = Math.max(1, Math.round(11 * (1 - (Math.abs(x) / 21) ** 1.5)) + bump - dip);
    for (let r = 0; r < h; r++) {
      let color: number = PALETTE.stone;
      if (r === 0) color = PALETTE.stoneLight;
      else if (r >= h - 2) color = PALETTE.stoneDark;
      else if ((x * 7 + r * 3 + 40) % 11 === 0) color = PALETTE.stoneLight;
      fillPx(ctx, color, cx + x, feet - h + r, 1, 1);
    }
  }
  fillPx(ctx, PALETTE.deep, cx - 20, feet - 1, 41, 1);
  // Cristais partidos espetados na pilha, sem brilho
  crystal(ctx, cx - 9, feet - 6, 8, 5, -2, tone(0));
  crystal(ctx, cx + 3, feet - 8, 11, 6, 1, tone(0));
  crystal(ctx, cx + 11, feet - 4, 6, 4, 3, tone(0));
  crystal(ctx, cx - 15, feet - 2, 5, 3, -1, tone(0));
  // O último resto do núcleo
  fillPx(ctx, TEAL_DARK, cx - 2, feet - 5, 5, 2);
  fillPx(ctx, TEAL, cx - 1, feet - 5, 3, 1);
  fillPx(ctx, PALETTE.player, cx, feet - 5, 1, 1);
}
