import { PALETTE } from '../data/palette';
import type { CondessaArms, CondessaPose } from '../data/condessaSprites';
import { fillPx, linePx } from './pixelSheet';

/**
 * Desenho do mini-chefe "A Condessa Pálida": uma dama espectral, alta e magra, de pele branco-
 * acinzentada, cabelos negros que flutuam, olhos acesos, presas, colar de joias e um vestido de
 * gala roxo-escuro e preto em farrapos. Olha para a direita; o contorno de 1 px é automático
 * (pixelSheet). O quadro tem 52 x 58: o corpo de colisão (24 x 42) fica no centro e o resto é
 * folga para as mangas abertas, as garras, a barra arrastada e o cabelo erguido.
 */

type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

const OUTLINE = PALETTE.void;
/** Centro do quadro e linha do chão (base do corpo de colisão), em pixels do quadro. */
const CX = 26;
const GROUND = 50;

// Pele pálida, de cadáver cinzento
const SKIN = 0xbdb9c9;
const SKIN_LIGHT = 0xdedbe6;
const SKIN_SHADE = 0x8d89a0;
const SKIN_DARK = 0x5e5a74;
// Cabelo negro com brilho arroxeado
const HAIR = 0x14101c;
const HAIR_MID = 0x241d33;
const HAIR_SHEEN = 0x3b2f55;
// Tecido do vestido: roxo-escuro e preto
const CLOTH = 0x3a2358;
const CLOTH_DARK = 0x24143a;
const CLOTH_LIGHT = 0x58387f;
const CLOTH_BLACK = PALETTE.deep;
// Olhos de violeta-vermelho, do aceso ao em brasa
const EYE = 0xd02a9a;
const EYE_HOT = 0xff5fb0;
const EYE_CORE = 0xffd6ee;
// Boca, presas e garras
const MOUTH_IN = 0x3a0a1c;
const LIP = PALETTE.bloodDark;
const FANG = PALETTE.bone;
const CLAW = PALETTE.bone;
const CLAW_SHADE = 0x8a8fa6;
// Joias do colar
const JEWEL_RED = PALETTE.blood;
const JEWEL_VIOLET = PALETTE.wraith;
const JEWEL_GOLD = 0xe0b04a;
// Poeira da morte
const DUST = 0x7c7a92;
const DUST_LIGHT = 0xa4a2b8;

/** Posição (relativa ao ombro) do cotovelo e do pulso de cada braço, mais o leque das garras. */
interface ArmShape {
  near: readonly [number, number, number, number];
  far: readonly [number, number, number, number];
  spread: number;
  drop: number;
}

const ARMS: Readonly<Record<CondessaArms, ArmShape>> = {
  rest: { near: [3, 7, 5, 14], far: [-2, 7, -3, 14], spread: 0, drop: 3 },
  present: { near: [4, 6, 8, 9], far: [-3, 7, -4, 13], spread: 1, drop: 3 },
  float: { near: [6, 2, 11, -2], far: [-5, 3, -9, 0], spread: 1, drop: 4 },
  rise: { near: [6, 2, 9, -6], far: [-5, 2, -8, -5], spread: 1, drop: 5 },
  open: { near: [7, 0, 11, -9], far: [-7, 0, -11, -9], spread: 2, drop: 5 },
  wide: { near: [8, -2, 12, -12], far: [-8, -2, -13, -12], spread: 2, drop: 6 },
  sweep: { near: [8, 1, 13, 3], far: [-5, 3, -9, 9], spread: 1, drop: 3 },
  flail: { near: [7, 3, 11, 9], far: [-7, -1, -11, -7], spread: 2, drop: 5 },
};

/** Dentes dos farrapos da barra: quantas das 4 últimas linhas existem em cada coluna. */
const TEETH = [4, 2, 3, 1, 4, 3, 1, 2] as const;
/** Rasgos escuros no tecido (posição relativa ao centro da cintura, linha a partir dela e altura). */
const RIPS = [
  [3, 9, 3],
  [-4, 13, 2],
  [6, 16, 3],
] as const;

/** Eixo da saia na linha `y`: ela se afasta da cintura para trás e ondula com a fase. */
function skirtCenter(p: CondessaPose, ux: number, wy: number, base: number, y: number): number {
  const t = (y - wy) / (base - wy - 1);
  return ux + Math.round(-p.trail * t * t + Math.sin(p.phase + t * 2.6) * p.wave * t);
}

/** Saia longa, alargando até a barra rasgada em dentes. */
function drawSkirt(ctx: Ctx, p: CondessaPose, ux: number, base: number): void {
  const wy = base - 22;
  let hemLeft = ux;
  for (let y = wy; y < base; y++) {
    const t = (y - wy) / (base - wy - 1);
    const half = Math.round(2.5 + p.flare * Math.pow(t, 0.75));
    const cx = skirtCenter(p, ux, wy, base, y);
    const left = cx - half;
    const right = cx + half;
    hemLeft = left;
    for (let x = left; x <= right; x++) {
      if (y >= base - 4) {
        const keep = TEETH[(x + 64 + p.sway) % TEETH.length] ?? 4;
        if (y - (base - 4) >= keep) continue;
      }
      const u = (x - left) / (right - left);
      let color = CLOTH;
      if (u < 0.34) color = CLOTH_BLACK;
      else if ((x - left) % 5 === 3 && t > 0.25) color = CLOTH_DARK;
      else if (u > 0.6 && u < 0.7 && t > 0.3) color = CLOTH_LIGHT;
      fillPx(ctx, color, x, y, 1, 1);
    }
    // Debrum de renda violeta na ponta da frente
    if (t > 0.5 && y % 2 === 0) fillPx(ctx, CLOTH_LIGHT, right, y, 1, 1);
  }
  for (const [dx, dy, h] of RIPS) {
    fillPx(ctx, OUTLINE, ux + dx, wy + dy, 1, h);
  }
  // Trapo da barra arrastando no chão, para trás
  if (p.drag > 0) {
    fillPx(ctx, CLOTH_BLACK, hemLeft - p.drag, base - 1, p.drag + 2, 1);
    fillPx(ctx, CLOTH_DARK, hemLeft - Math.max(1, p.drag - 1), base - 2, p.drag, 1);
  }
}

/** Corpete justo: roxo, com costura preta e cinto de joia. O alto acompanha a inclinação (`lean`). */
function drawBodice(ctx: Ctx, p: CondessaPose, ux: number, base: number): void {
  const sy = base - 30;
  const wy = base - 22;
  for (let y = sy; y < wy; y++) {
    const k = (y - sy) / (wy - sy - 1);
    const off = Math.round(p.lean * (1 - k));
    const half = k < 0.25 ? 3 : 2;
    const left = ux + off - half;
    fillPx(ctx, CLOTH, left, y, half * 2 + 2, 1);
    fillPx(ctx, CLOTH_DARK, left, y, 1, 1);
    if (k > 0.2) fillPx(ctx, CLOTH_BLACK, ux + off + 1, y, 1, 1);
  }
  fillPx(ctx, CLOTH_BLACK, ux - 3, wy - 1, 7, 1);
  fillPx(ctx, JEWEL_VIOLET, ux + 1, wy - 1, 1, 1);
}

/** Cabelo longo: três mechas que partem da nuca; `flow` as ergue do caído até o ar. */
function drawHair(ctx: Ctx, p: CondessaPose, hx: number, hy: number): void {
  const rad = (p.flow * Math.PI) / 180;
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const strands = [
    { dx: 0, dy: 1, len: 22, w: 4, color: HAIR },
    { dx: 1, dy: 4, len: 18, w: 3, color: HAIR_MID },
    { dx: -1, dy: 0, len: 25, w: 3, color: HAIR },
  ] as const;
  // Quando o cabelo estica para trás ou para cima, a mecha encurta para caber no quadro (sem
  // truncar a ponta): a folga cobre a ondulação e a largura da mecha
  const margin = p.wave * 1.4 + 3;
  strands.forEach((st, index) => {
    let len: number = st.len;
    if (s > 0.01) len = Math.min(len, (hx - 4 + st.dx - margin - 1) / s);
    if (c < -0.01) len = Math.min(len, (hy + st.dy - margin - 1) / -c);
    len = Math.max(4, Math.floor(len));
    for (let i = 0; i < len; i++) {
      const k = i / len;
      const wob = Math.sin(p.phase + i * 0.42 + st.dx * 2) * p.wave * k * 1.4;
      const x = Math.round(hx - 4 + st.dx - s * i + c * wob);
      const y = Math.round(hy + st.dy + c * i + s * wob);
      const w = k < 0.45 ? st.w : k < 0.8 ? st.w - 1 : Math.max(1, st.w - 2);
      fillPx(ctx, st.color, x - Math.floor(w / 2), y, w, 2);
      if (index === 0 && i % 6 === 2) fillPx(ctx, HAIR_SHEEN, x, y, 1, 1);
    }
  });
}

/** Cabeça de perfil: crânio, mandíbula que desce com a boca aberta, presas, olhos acesos e franja. */
function drawHead(ctx: Ctx, hx: number, hy: number, eyes: number, mouth: number): void {
  const m = mouth;
  const upper = [
    [-2, 2],
    [-3, 3],
    [-3, 4],
    [-3, 4],
    [-3, 4],
    [-3, 5],
    [-3, 4],
  ] as const;
  const jaw = [
    [-3, 4],
    [-2, 3],
    [-1, 2],
  ] as const;
  upper.forEach(([a, b], dy) => fillPx(ctx, SKIN, hx + a, hy + dy, b - a + 1, 1));
  jaw.forEach(([a, b], i) =>
    fillPx(ctx, i === 2 ? SKIN_SHADE : SKIN, hx + a, hy + 7 + i + m, b - a + 1, 1),
  );
  // Luz e sombra: testa, nariz, face encovada
  fillPx(ctx, SKIN_LIGHT, hx + 4, hy + 2, 1, 1);
  fillPx(ctx, SKIN_LIGHT, hx + 5, hy + 5, 1, 1);
  fillPx(ctx, SKIN_SHADE, hx, hy + 5, 2, 1);
  fillPx(ctx, SKIN_SHADE, hx - 1, hy + 6, 2, 1);

  // Boca: lábio roxo-escuro; fechada mostra duas presas, aberta mostra a goela com presas
  fillPx(ctx, LIP, hx + 1, hy + 6, 4, 1);
  if (m === 0) {
    fillPx(ctx, FANG, hx + 2, hy + 7, 1, 1);
    fillPx(ctx, FANG, hx + 4, hy + 7, 1, 1);
  } else {
    fillPx(ctx, SKIN_SHADE, hx - 3, hy + 7, 3, m);
    fillPx(ctx, MOUTH_IN, hx, hy + 7, 5, m);
    fillPx(ctx, FANG, hx + 2, hy + 7, 1, Math.min(2, m));
    fillPx(ctx, FANG, hx + 4, hy + 7, 1, Math.min(2, m));
    fillPx(ctx, FANG, hx + 3, hy + 6 + m, 1, 1);
    if (m >= 3) fillPx(ctx, FANG, hx + 1, hy + 6 + m, 1, 1);
  }

  // Olhos de violeta-vermelho
  if (eyes === 0) {
    fillPx(ctx, SKIN_DARK, hx + 2, hy + 4, 2, 1);
  } else {
    fillPx(ctx, SKIN_DARK, hx + 1, hy + 3, 4, 1);
    if (eyes === 1) {
      fillPx(ctx, EYE, hx + 2, hy + 4, 2, 1);
    } else if (eyes === 2) {
      fillPx(ctx, EYE_HOT, hx + 1, hy + 4, 3, 1);
      fillPx(ctx, EYE_CORE, hx + 3, hy + 4, 1, 1);
      fillPx(ctx, EYE, hx + 1, hy + 5, 4, 1, 0.5);
    } else {
      fillPx(ctx, EYE_HOT, hx + 1, hy + 4, 4, 2);
      fillPx(ctx, EYE_CORE, hx + 2, hy + 4, 2, 1);
      fillPx(ctx, EYE, hx + 1, hy + 3, 4, 1, 0.6);
    }
  }

  // Cabelo sobre o crânio, nuca e franja varrida de lado
  fillPx(ctx, HAIR, hx - 2, hy, 5, 1);
  fillPx(ctx, HAIR, hx - 3, hy + 1, 7, 1);
  fillPx(ctx, HAIR, hx - 3, hy + 2, 7, 1);
  for (let dy = 3; dy <= 5; dy++) fillPx(ctx, HAIR, hx - 3, hy + dy, 2, 1);
  fillPx(ctx, HAIR, hx - 3, hy + 6, 1, 1);
  fillPx(ctx, HAIR_SHEEN, hx - 1, hy, 2, 1);
  fillPx(ctx, HAIR_SHEEN, hx, hy + 1, 2, 1);
}

/** Colar de joias no pescoço, com um pingente. (hx, sy) é a ponta de trás do colar. */
function drawNecklace(ctx: Ctx, hx: number, sy: number): void {
  const gems = [
    JEWEL_RED,
    JEWEL_VIOLET,
    JEWEL_GOLD,
    JEWEL_RED,
    JEWEL_GOLD,
    JEWEL_VIOLET,
    JEWEL_RED,
  ];
  gems.forEach((color, i) => fillPx(ctx, color, hx - 3 + i, sy, 1, 1));
  fillPx(ctx, JEWEL_RED, hx + 1, sy + 1, 1, 2);
  fillPx(ctx, FANG, hx + 1, sy + 1, 1, 1);
}

/** Garras compridas saindo do pulso `w`, na direção do antebraço (`e` -> `w`). */
function drawClaws(ctx: Ctx, e: Point, w: Point, spread: number, far: boolean): void {
  const dx = w.x - e.x;
  const dy = w.y - e.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const claw = far ? CLAW_SHADE : CLAW;
  fillPx(ctx, far ? SKIN_SHADE : SKIN, w.x - 1, w.y - 1, 2, 2);
  for (const k of [-1, 0, 1]) {
    const sx = Math.round(w.x + px * k);
    const sy = Math.round(w.y + py * k);
    const ex = Math.round(w.x + ux * 5 + px * k * (2 + spread));
    const ey = Math.round(w.y + uy * 5 + py * k * (2 + spread));
    linePx(ctx, claw, sx, sy, ex, ey, 1);
    fillPx(ctx, far ? SKIN_DARK : CLAW_SHADE, ex, ey, 1, 1);
  }
}

/** Manga longa: braço fino até o cotovelo e antebraço numa manga aberta que pende em ponta. */
function drawSleeve(ctx: Ctx, s: Point, e: Point, w: Point, drop: number, far: boolean): void {
  const main = far ? CLOTH_DARK : CLOTH;
  const edge = far ? CLOTH_BLACK : CLOTH_DARK;
  linePx(ctx, edge, s.x, s.y, e.x, e.y, 3);
  linePx(ctx, main, s.x, s.y, e.x, e.y, 2);
  // Manga aberta: leque entre o antebraço e a ponta que pende
  const tip: Point = { x: Math.round((e.x + w.x) / 2) - 1, y: Math.max(e.y, w.y) + drop };
  const steps = Math.max(Math.abs(w.x - e.x), Math.abs(w.y - e.y), 1);
  for (let i = 0; i <= steps; i++) {
    const qx = Math.round(e.x + ((w.x - e.x) * i) / steps);
    const qy = Math.round(e.y + ((w.y - e.y) * i) / steps);
    linePx(ctx, main, qx, qy, tip.x, tip.y, 1);
  }
  linePx(ctx, edge, e.x, e.y, tip.x, tip.y, 1);
  linePx(ctx, edge, w.x, w.y, tip.x, tip.y, 1);
  if (!far) {
    fillPx(ctx, JEWEL_VIOLET, w.x - 1, w.y, 2, 1);
    fillPx(ctx, CLOTH_LIGHT, tip.x, tip.y - 1, 1, 1);
  }
}

function drawArm(ctx: Ctx, shoulder: Point, shape: ArmShape, far: boolean): void {
  const [ex, ey, wx, wy] = far ? shape.far : shape.near;
  const s: Point = far ? { x: shoulder.x - 3, y: shoulder.y } : shoulder;
  const e: Point = { x: shoulder.x + ex, y: shoulder.y + ey };
  const w: Point = { x: shoulder.x + wx, y: shoulder.y + wy };
  drawSleeve(ctx, s, e, w, shape.drop, far);
  drawClaws(ctx, e, w, shape.spread, far);
}

/** Dama em pé (todas as poses vivas). */
function drawStanding(ctx: Ctx, p: CondessaPose): void {
  const base = GROUND - p.bob;
  const ux = CX + p.lunge;
  const hx = ux + p.lean;
  const hy = base - 41 - (p.mouth >= 2 ? 1 : 0);
  const sy = base - 30;
  const shoulder: Point = { x: hx + 1, y: sy + 2 };
  const arms = ARMS[p.arms];

  drawArm(ctx, shoulder, arms, true);
  drawHair(ctx, p, hx, hy);
  drawSkirt(ctx, p, ux, base);
  drawBodice(ctx, p, ux, base);
  // Pescoço fino, por baixo da cabeça
  fillPx(ctx, SKIN_SHADE, hx - 1, hy + 8, 3, sy - hy - 8);
  drawHead(ctx, hx, hy, p.eyes, p.mouth);
  drawNecklace(ctx, hx, sy);
  drawArm(ctx, shoulder, arms, false);
}

/** Monte de tecido amarrotado no chão: cúpula de pregas roxas e pretas, com trapos pelos lados. */
function drawMound(ctx: Ctx, cx: number, h: number, w: number): void {
  for (let dy = 0; dy < h; dy++) {
    const y = GROUND - 1 - dy;
    const half = Math.max(1, Math.round((w / 2) * (1 - Math.pow(dy / h, 2.4))) + (dy < 2 ? 2 : 0));
    for (let x = cx - half; x <= cx + half; x++) {
      const u = (x - (cx - half)) / (half * 2);
      let color = CLOTH;
      if (u < 0.3) color = CLOTH_BLACK;
      else if ((x + dy) % 4 === 0) color = CLOTH_DARK;
      else if (dy > h * 0.55 && u > 0.5 && u < 0.7) color = CLOTH_LIGHT;
      fillPx(ctx, color, x, y, 1, 1);
    }
  }
  const edge = Math.round(w / 2) + 2;
  fillPx(ctx, CLOTH_BLACK, cx - edge - 4, GROUND - 1, 7, 1);
  fillPx(ctx, CLOTH_DARK, cx - edge - 1, GROUND - 2, 4, 1);
  fillPx(ctx, CLOTH_DARK, cx + edge - 3, GROUND - 1, 7, 1);
  fillPx(ctx, CLOTH_BLACK, cx + edge - 2, GROUND - 2, 3, 1);
}

/** Nuvem de poeira: bolotas claras e escuras que sobem do monte. */
function drawDust(ctx: Ctx, puffs: readonly (readonly [number, number, number, boolean])[]): void {
  for (const [x, y, size, light] of puffs) {
    const color = light ? DUST_LIGHT : DUST;
    // Bolota irregular: um cruzamento de retângulos, com um brilho no canto
    const half = Math.floor(size / 2);
    fillPx(ctx, color, x, y + (size > 2 ? 1 : 0), size, size - (size > 2 ? 2 : 0));
    if (size > 2) fillPx(ctx, color, x + (size > 3 ? 1 : 0), y, size - (size > 3 ? 2 : 0), size);
    fillPx(ctx, DUST_LIGHT, x + half, y + (size > 2 ? 1 : 0), 1, 1);
  }
}

/** Desabando: o vestido vira um monte, o tronco cai de bruços sobre ele e o cabelo escorre. */
function drawCollapsing(ctx: Ctx, p: CondessaPose): void {
  const cx = CX - 1;
  const top = GROUND - 17;
  drawMound(ctx, cx, 17, 24);
  // Cabelo caído por cima do monte, do lado de trás
  drawHair(ctx, { ...p, flow: 12, wave: 1, phase: 0.8 }, cx + 5, GROUND - 30);
  // Tronco curvado para a frente sobre o monte
  for (let i = 0; i < 6; i++) {
    const x = cx - 2 + Math.round(i * 0.6);
    fillPx(ctx, CLOTH, x, top - 6 + i, 6, 1);
    fillPx(ctx, CLOTH_BLACK, x + 4, top - 6 + i, 1, 1);
  }
  fillPx(ctx, SKIN_SHADE, cx + 4, GROUND - 24, 3, 3);
  drawHead(ctx, cx + 6, GROUND - 33, 0, 1);
  drawNecklace(ctx, cx + 6, GROUND - 23);
  // Braço mole caído pela frente do monte
  const shoulder: Point = { x: cx + 3, y: top - 3 };
  const e: Point = { x: shoulder.x + 6, y: shoulder.y + 6 };
  const w: Point = { x: shoulder.x + 8, y: GROUND - 6 };
  drawSleeve(ctx, shoulder, e, w, 3, false);
  drawClaws(ctx, e, w, 1, false);
  drawDust(ctx, [
    [cx - 15, GROUND - 5, 3, false],
    [cx + 14, GROUND - 6, 2, true],
    [cx - 11, GROUND - 9, 2, true],
  ]);
}

/** No chão: só um monte baixo e amarrotado, a cabeça de lado, o cabelo espalhado e a poeira subindo. */
function drawFallen(ctx: Ctx): void {
  const cx = CX;
  drawMound(ctx, cx, 9, 30);
  // Cabelo espalhado pelo chão, para trás da cabeça
  const hx = cx + 7;
  const hy = GROUND - 14;
  for (const [dy, len, color] of [
    [3, 22, HAIR],
    [5, 18, HAIR_MID],
    [7, 25, HAIR],
  ] as const) {
    for (let i = 0; i < len; i++) {
      const wob = Math.round(Math.sin(i * 0.5 + dy) * 1.2);
      fillPx(ctx, color, hx - 4 - i, hy + dy - 1 + wob, 1, 2);
    }
  }
  fillPx(ctx, HAIR_SHEEN, hx - 8, hy + 3, 2, 1);
  fillPx(ctx, HAIR_SHEEN, hx - 15, hy + 4, 2, 1);
  // Cabeça tombada de lado sobre o monte, olhos fechados e as presas aparecendo
  const rows = [
    [-2, 3],
    [-3, 4],
    [-3, 5],
    [-3, 5],
    [-2, 4],
    [-1, 2],
  ] as const;
  rows.forEach(([a, b], dy) => fillPx(ctx, SKIN, hx + a, hy + dy, b - a + 1, 1));
  fillPx(ctx, HAIR, hx - 3, hy, 5, 2);
  fillPx(ctx, HAIR_SHEEN, hx - 1, hy, 2, 1);
  fillPx(ctx, SKIN_DARK, hx + 2, hy + 2, 2, 1);
  fillPx(ctx, LIP, hx + 1, hy + 4, 4, 1);
  fillPx(ctx, FANG, hx + 2, hy + 5, 1, 1);
  fillPx(ctx, SKIN_SHADE, hx - 3, hy + 3, 2, 1);
  // Colar espalhado sobre o tecido
  fillPx(ctx, JEWEL_RED, cx - 4, GROUND - 9, 1, 1);
  fillPx(ctx, JEWEL_GOLD, cx - 2, GROUND - 9, 1, 1);
  fillPx(ctx, JEWEL_VIOLET, cx, GROUND - 8, 1, 1);
  fillPx(ctx, JEWEL_RED, cx + 1, GROUND - 9, 1, 2);
  // A mão de garras estirada para fora do monte
  const e: Point = { x: cx + 10, y: GROUND - 5 };
  const w: Point = { x: cx + 15, y: GROUND - 3 };
  drawSleeve(ctx, { x: cx + 6, y: GROUND - 6 }, e, w, 2, false);
  drawClaws(ctx, e, w, 1, false);
  drawDust(ctx, [
    [cx - 10, GROUND - 13, 3, false],
    [cx - 3, GROUND - 17, 4, true],
    [cx + 5, GROUND - 22, 3, false],
    [cx + 12, GROUND - 17, 2, true],
    [cx - 14, GROUND - 19, 2, true],
    [cx + 1, GROUND - 26, 2, false],
  ]);
}

export function drawCondessa(ctx: Ctx, p: CondessaPose): void {
  if (p.dead === 1) drawCollapsing(ctx, p);
  else if (p.dead === 2) drawFallen(ctx);
  else drawStanding(ctx, p);
}
