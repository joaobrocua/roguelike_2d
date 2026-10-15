import type { BiomeId } from '../data/mapRules';
import { BIOME_LOOK, type BiomeLook, type StoneRamp } from '../data/biomeLook';
import { createRng, randomInt, type Rng } from '../utils/rng';
import { farFloresta, midFloresta, nearFloresta } from './forestBackgrounds';
import { disc, ditherGradientV, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo de cada bioma, em pixel art: distante (céu/profundidade), médio
 * (arcadas, colunas, janelas) e primeiro plano (pilares escuros e panos nas bordas). Cada plano
 * é uma textura de LARGURA x ALTURA que desliza um pouco (parallax) atrás do jogo.
 */

/** Mistura duas rampas de pedra (t = 0 devolve `a`, t = 1 devolve `b`). */
function mixRamp(a: StoneRamp, b: StoneRamp, t: number): StoneRamp {
  return {
    deep: mix(a.deep, b.deep, t),
    dark: mix(a.dark, b.dark, t),
    base: mix(a.base, b.base, t),
    light: mix(a.light, b.light, t),
    highlight: mix(a.highlight, b.highlight, t),
  };
}

// --- Peças reutilizáveis -----------------------------------------------------------------

/** Intervalo horizontal de um arco ogival na linha `dy` acima do começo do arco (ou null). */
function archInterval(
  xl: number,
  xr: number,
  radius: number,
  inset: number,
  dy: number,
): [number, number] | null {
  const r = radius - inset;
  const s2 = r * r - dy * dy;
  if (s2 < 0) return null;
  const s = Math.sqrt(s2);
  const left = xl + radius - s;
  const right = xr - radius + s;
  return left <= right ? [left, right] : null;
}

/** Altura (px) que um arco ogival de largura `width` e raio `radius` alcança. */
export function archHeight(width: number, radius: number): number {
  const s = radius - width / 2;
  return Math.sqrt(Math.max(0, radius * radius - s * s));
}

/** Anel de pedra de um arco ogival (a "moldura"): `thick` px de espessura. */
function archRing(
  ctx: Ctx,
  cx: number,
  springY: number,
  width: number,
  ratio: number,
  thick: number,
  color: number,
  edge: number,
): void {
  const xl = cx - width / 2;
  const xr = cx + width / 2;
  const radius = width * ratio;
  const top = Math.ceil(archHeight(width, radius));
  for (let dy = 0; dy <= top; dy++) {
    const outer = archInterval(xl, xr, radius, 0, dy);
    if (!outer) continue;
    const inner = archInterval(xl, xr, radius, thick, dy);
    const y = springY - dy;
    if (!inner) {
      rect(ctx, color, outer[0], y, outer[1] - outer[0], 1);
      continue;
    }
    rect(ctx, color, outer[0], y, inner[0] - outer[0], 1);
    rect(ctx, color, inner[1], y, outer[1] - inner[1], 1);
    rect(ctx, edge, outer[0], y, 1, 1); // fio de luz na borda de fora
  }
}

/** Preenche o vão de um arco ogival (descendo até `baseY`) com uma cor por linha. */
function archFill(
  ctx: Ctx,
  cx: number,
  springY: number,
  baseY: number,
  width: number,
  ratio: number,
  inset: number,
  colorAt: (t: number, dy: number) => number,
  alpha = 1,
): void {
  const xl = cx - width / 2;
  const xr = cx + width / 2;
  const radius = width * ratio;
  const top = Math.ceil(archHeight(width, radius));
  const total = top + (baseY - springY);
  for (let dy = top; dy >= 0; dy--) {
    const span = archInterval(xl, xr, radius, inset, dy);
    if (!span) continue;
    const t = (top - dy) / Math.max(1, total);
    rect(ctx, colorAt(t, dy), span[0] + 0, springY - dy, span[1] - span[0], 1, alpha);
  }
  for (let y = springY + 1; y <= baseY; y++) {
    const t = (top + (y - springY)) / Math.max(1, total);
    rect(ctx, colorAt(t, -(y - springY)), xl + inset, y, width - inset * 2, 1, alpha);
  }
}

/** Parede de tijolos: fiadas deslocadas, tom variado por tijolo, junta escura e luz no topo. */
function bricks(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  ramp: StoneRamp,
  rng: Rng,
  brickW = 14,
  brickH = 8,
): void {
  rect(ctx, ramp.base, x, y, w, h);
  let row = 0;
  for (let by = y; by < y + h; by += brickH, row++) {
    const bh = Math.min(brickH, y + h - by);
    const offset = row % 2 === 0 ? 0 : Math.floor(brickW / 2);
    for (let bx = x - offset; bx < x + w; bx += brickW) {
      const x0 = Math.max(bx, x);
      const x1 = Math.min(bx + brickW, x + w);
      if (x1 <= x0) continue;
      const roll = rng();
      const tone = roll < 0.22 ? ramp.dark : roll > 0.84 ? ramp.light : ramp.base;
      rect(ctx, tone, x0, by, x1 - x0, bh);
      rect(ctx, ramp.highlight, x0 + 1, by + 1, Math.max(0, x1 - x0 - 3), 1, 0.35); // luz no topo
      rect(ctx, ramp.deep, x0, by + bh - 1, x1 - x0, 1, 0.8); // junta horizontal
      if (bx >= x) rect(ctx, ramp.deep, bx, by, 1, bh, 0.8); // junta vertical
      if (rng() < 0.1) rect(ctx, ramp.deep, x0 + randomInt(rng, 1, 6), by + 2, 1, 3, 0.7); // trinca
    }
  }
}

/** Coluna de pedra: fuste sombreado, capitel e base, com fiadas e trincas. */
function column(
  ctx: Ctx,
  x: number,
  top: number,
  bottom: number,
  w: number,
  ramp: StoneRamp,
  rng: Rng,
): void {
  const h = bottom - top;
  bricks(ctx, x, top, w, h, ramp, rng, w, 9);
  rect(ctx, ramp.deep, x, top, Math.max(2, Math.round(w * 0.28)), h, 0.55); // lado na sombra
  rect(ctx, ramp.highlight, x + w - 2, top, 1, h, 0.5); // lado iluminado
  // Capitel e base
  rect(ctx, ramp.light, x - 3, top, w + 6, 4);
  rect(ctx, ramp.highlight, x - 3, top, w + 6, 1, 0.6);
  rect(ctx, ramp.deep, x - 3, top + 4, w + 6, 1);
  rect(ctx, ramp.base, x - 2, top + 5, w + 4, 3);
  rect(ctx, ramp.deep, x - 2, top + 7, w + 4, 1, 0.8);
  rect(ctx, ramp.light, x - 3, bottom - 5, w + 6, 5);
  rect(ctx, ramp.highlight, x - 3, bottom - 5, w + 6, 1, 0.5);
  rect(ctx, ramp.deep, x - 3, bottom - 1, w + 6, 1);
}

/** Corrente pendurada: elos que se alternam. */
function chain(ctx: Ctx, x: number, y: number, length: number, color: number, light: number): void {
  for (let i = 0; i < length; i += 3) {
    const wide = (i / 3) % 2 === 0;
    rect(ctx, color, x + (wide ? 0 : 1), y + i, wide ? 2 : 1, 3);
    rect(ctx, light, x + (wide ? 0 : 1), y + i, 1, 1, 0.8);
  }
}

/** Trepadeira pendurada com folhinhas. */
function ivy(ctx: Ctx, rng: Rng, x: number, y: number, length: number, look: BiomeLook): void {
  let cx = x;
  for (let i = 0; i < length; i++) {
    if (rng() < 0.3) cx += rng() < 0.5 ? -1 : 1;
    rect(ctx, look.moss, cx, y + i, 1, 1);
    if (i % 4 === 2) {
      rect(ctx, look.mossLight, cx + (rng() < 0.5 ? -2 : 1), y + i, 2, 1, 0.8);
      rect(ctx, look.moss, cx + (rng() < 0.5 ? -1 : 1), y + i + 1, 1, 1);
    }
  }
}

/** Feixe de luz diagonal (translúcido) que entra por uma janela. */
function lightShaft(
  ctx: Ctx,
  look: BiomeLook,
  x: number,
  top: number,
  bottom: number,
  width: number,
  slant: number,
): void {
  const total = bottom - top;
  for (let i = 0; i < total; i++) {
    const t = i / total;
    const left = x + slant * t;
    const fade = 1 - t * 0.85;
    rect(ctx, look.shaft, left, top + i, width * (0.6 + t * 0.7), 1, look.shaftAlpha * fade);
  }
}

// --- Plano distante ----------------------------------------------------------------------

function sky(ctx: Ctx, look: BiomeLook, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyTop, look.skyMid, look.skyLow]);
}

function stars(ctx: Ctx, rng: Rng, w: number, count: number, color: number, maxY: number): void {
  for (let i = 0; i < count; i++) {
    const big = rng() < 0.12;
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, 0, maxY);
    rect(ctx, color, x, y, 1, 1, 0.25 + rng() * 0.5);
    if (big) {
      rect(ctx, color, x - 1, y, 3, 1, 0.22);
      rect(ctx, color, x, y - 1, 1, 3, 0.22);
    }
  }
}

function moon(ctx: Ctx, look: BiomeLook, cx: number, cy: number, r: number): void {
  for (let i = 5; i >= 1; i--) disc(ctx, look.glowSoft, cx, cy, r + i * 6, 0.035 * (6 - i));
  disc(ctx, mix(look.glow, look.skyMid, 0.55), cx, cy, r);
  disc(ctx, mix(look.glow, look.skyMid, 0.2), cx - 2, cy - 2, r - 2);
  disc(ctx, look.glow, cx - 4, cy - 4, r - 7, 0.85);
  // Crateras
  for (const [dx, dy, cr] of [
    [5, 3, 4],
    [-6, 6, 3],
    [8, -5, 2],
    [-2, -8, 2],
  ] as const) {
    disc(ctx, mix(look.glow, look.skyMid, 0.5), cx + dx, cy + dy, cr, 0.55);
  }
}

/** Faixa de nuvem em dithering: manchas alongadas de névoa distante. */
function clouds(ctx: Ctx, rng: Rng, look: BiomeLook, w: number, minY: number, maxY: number): void {
  for (let i = 0; i < 9; i++) {
    const cx = randomInt(rng, 0, w);
    const cy = randomInt(rng, minY, maxY);
    const len = randomInt(rng, 40, 110);
    for (let row = -2; row <= 2; row++) {
      const half = Math.round(len * (1 - Math.abs(row) / 3)) / 2;
      for (let x = cx - half; x < cx + half; x += 1) {
        const edge = 1 - Math.abs(x - cx) / half;
        if (edge * 0.9 > ((Math.round(x) + row * 2) & 3) / 4 + 0.05) {
          rect(ctx, look.skyLow, x, cy + row, 1, 1, 0.5);
          if (row < 0) rect(ctx, look.fog, x, cy + row, 1, 1, 0.12);
        }
      }
    }
  }
}

/** Torre ou muralha distante com ameias, janelas acesas e bandeira. */
function farTower(
  ctx: Ctx,
  rng: Rng,
  look: BiomeLook,
  x: number,
  bottom: number,
  w: number,
  th: number,
): void {
  const body = mix(look.back.deep, look.skyLow, 0.12);
  const side = mix(look.back.dark, look.skyLow, 0.2);
  const top = bottom - th;
  const broken = rng() < 0.4;
  rect(ctx, body, x, top, w, th);
  rect(ctx, side, x + w - 4, top, 4, th); // lado iluminado pela lua
  if (broken) {
    // Topo quebrado em degraus
    rect(ctx, mix(look.skyLow, body, 0.5), x, top - 5, Math.floor(w * 0.45), 5, 0);
    ctx.clearRect(x + Math.floor(w * 0.5), top, Math.ceil(w * 0.5), 6);
    rect(ctx, body, x + Math.floor(w * 0.5), top + 6, Math.ceil(w * 0.5), 1);
  } else {
    for (let cx = x; cx < x + w - 2; cx += 7) rect(ctx, body, cx, top - 4, 4, 4); // ameias
    rect(ctx, side, x + w - 4, top - 4, 3, 4);
    if (rng() < 0.35) {
      // Bandeira rasgada
      rect(ctx, look.back.base, x + Math.floor(w / 2), top - 14, 1, 10);
      rect(ctx, look.back.base, x + Math.floor(w / 2) + 1, top - 14, 6, 3);
    }
  }
  // Janelas acesas
  const windows = randomInt(rng, 0, 3);
  for (let i = 0; i < windows; i++) {
    const wx = x + randomInt(rng, 4, Math.max(5, w - 7));
    const wy = top + randomInt(rng, 14, Math.max(15, th - 30));
    rect(ctx, look.glow, wx, wy, 2, 4, 0.55);
    rect(ctx, look.glow, wx, wy - 1, 2, 1, 0.3);
    rect(ctx, look.glow, wx - 2, wy - 2, 6, 8, 0.06);
  }
  // Contrafortes
  rect(ctx, body, x - 3, bottom - 20, 3, 20);
  rect(ctx, body, x + w, bottom - 14, 3, 14);
}

function farMuralhas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  sky(ctx, look, w, h);
  stars(ctx, rng, w, 90, look.glow, 120);
  moon(ctx, look, 392, 64, 22);
  clouds(ctx, rng, look, w, 40, 150);
  // Colinas distantes
  const hillBase = h - 70;
  for (let x = 0; x < w; x++) {
    const hillY = hillBase - Math.round(10 * Math.sin(x / 44) + 6 * Math.sin(x / 17 + 1));
    rect(ctx, mix(look.skyLow, look.back.deep, 0.78), x, hillY, 1, h - hillY);
  }
  // Fortaleza em ruínas
  let x = -12;
  while (x < w) {
    const tw = randomInt(rng, 24, 48);
    const th = randomInt(rng, 60, 140);
    farTower(ctx, rng, look, x, h, tw, th);
    x += tw + randomInt(rng, 4, 30);
  }
  // Névoa do horizonte
  for (let i = 0; i < 28; i++) {
    rect(ctx, look.fog, 0, h - 90 + i * 3, w, 3, 0.012 * (i / 3));
  }
}

/** Janela ogival distante com vitral aceso (usada nos salões). */
function farWindow(
  ctx: Ctx,
  look: BiomeLook,
  cx: number,
  springY: number,
  bottomY: number,
  width: number,
  hueA: number,
  hueB: number,
): void {
  archFill(ctx, cx, springY, bottomY, width, 1, 0, (t) => mix(hueA, hueB, t), 0.55);
  // Travessas do vitral
  rect(
    ctx,
    look.back.deep,
    cx - 0.5,
    springY - Math.round(archHeight(width, width)) + 2,
    1,
    bottomY - springY + Math.round(archHeight(width, width)) - 2,
    0.7,
  );
  for (let y = springY - 6; y < bottomY; y += 9)
    rect(ctx, look.back.deep, cx - width / 2, y, width, 1, 0.6);
  archRing(ctx, cx, springY, width + 4, 1, 2, look.back.light, look.back.highlight);
  // Halo
  archFill(ctx, cx, springY, bottomY, width + 10, 1, 0, () => hueA, 0.05);
}

function farSaloes(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, look.skyLow, look.skyMid]);
  // Fileira de janelas distantes, com vitrais de duas cores
  const hues: readonly [number, number][] = [
    [look.glow, look.glowSoft],
    [0x9a6bff, look.glowSoft],
    [look.glowSoft, 0x40336f],
  ];
  for (let x = 30; x < w; x += 92) {
    const pair = hues[Math.floor(x / 92) % hues.length] ?? hues[0];
    if (!pair) continue;
    farWindow(ctx, look, x, 96, 176, 26, pair[0], pair[1]);
  }
  // Colunas distantes entre as janelas
  for (let x = -4; x < w; x += 92) {
    rect(ctx, look.back.dark, x, 40, 10, h - 40);
    rect(ctx, look.back.light, x + 8, 40, 2, h - 40, 0.7);
    rect(ctx, look.back.base, x - 3, 40, 16, 5);
  }
  // Chão distante em névoa
  for (let i = 0; i < 24; i++) rect(ctx, look.fog, 0, h - 72 + i * 3, w, 3, 0.012 * (i / 2));
  stars(ctx, rng, w, 14, look.glow, 40);
}

function farCatacumbas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, look.skyLow]);
  // Corredores de arcos que se repetem para o fundo, cada fileira menor e mais clara
  for (let depth = 0; depth < 3; depth++) {
    const scale = 1 - depth * 0.28;
    const archW = Math.round(54 * scale);
    const springY = Math.round(150 - depth * 20);
    const color = mix(look.back.dark, look.skyLow, 0.2 + depth * 0.18);
    for (let x = ((depth * 23) % 80) - 20; x < w + 40; x += archW + 18) {
      archRing(
        ctx,
        x,
        springY,
        archW,
        1.05,
        Math.max(3, Math.round(6 * scale)),
        color,
        mix(color, look.back.highlight, 0.4),
      );
      rect(ctx, color, x - archW / 2 - 10, springY, 10, h - springY);
      rect(ctx, color, x + archW / 2, springY, 10, h - springY);
    }
  }
  // Luzes de alma ao longe
  for (let i = 0; i < 9; i++) {
    const x = randomInt(rng, 10, w - 10);
    const y = randomInt(rng, 120, 190);
    disc(ctx, look.glow, x, y, 10, 0.03);
    disc(ctx, look.glow, x, y, 5, 0.06);
    rect(ctx, look.glow, x, y, 1, 1, 0.8);
  }
  for (let i = 0; i < 22; i++) rect(ctx, look.fog, 0, h - 80 + i * 3, w, 3, 0.013 * (i / 2));
}

// --- Plano médio -------------------------------------------------------------------------

const SPAN = 120;
const PILLAR_W = 18;
const SPRING = 100;

function midMuralhas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  for (let x0 = -30; x0 < w; x0 += SPAN) {
    // Arco ogival entre dois pilares (o céu do fundo aparece pelo vão)
    const cx = x0 + PILLAR_W + (SPAN - PILLAR_W) / 2;
    const open = SPAN - PILLAR_W - 4;
    const ratio = 1.1;
    const crumbled = rng() < 0.22;
    if (!crumbled) archRing(ctx, cx, SPRING, open + 12, ratio, 7, ramp.base, ramp.highlight);
    else archRing(ctx, cx, SPRING, open + 12, ratio, 7, ramp.dark, ramp.light);
    // Alvenaria acima do arco, quebrada
    const peak = SPRING - Math.round(archHeight(open + 12, (open + 12) * ratio));
    if (!crumbled) {
      bricks(ctx, cx - 38, peak - 20, 76, 18, ramp, rng, 12, 6);
      rect(ctx, ramp.deep, cx - 38, peak - 3, 76, 1);
    }
    // Janela estreita com luar entrando
    const wx = cx;
    archFill(
      ctx,
      wx,
      SPRING + 38,
      SPRING + 78,
      12,
      1,
      0,
      (t) => mix(look.glow, look.glowSoft, t),
      0.5,
    );
    archRing(ctx, wx, SPRING + 38, 16, 1, 2, ramp.light, ramp.highlight);
    lightShaft(ctx, look, wx - 6, SPRING + 40, h, 20, 34);
    // Trepadeira no arco
    if (rng() < 0.7)
      ivy(ctx, rng, cx + randomInt(rng, -28, 28), peak + 4, randomInt(rng, 14, 36), look);
    if (rng() < 0.5)
      chain(
        ctx,
        cx + randomInt(rng, -10, 10),
        peak + 6,
        randomInt(rng, 24, 56),
        ramp.light,
        ramp.highlight,
      );
  }
  for (let x0 = -30; x0 <= w; x0 += SPAN) {
    column(ctx, x0, SPRING - 26, h, PILLAR_W, ramp, rng);
    if (rng() < 0.6)
      ivy(
        ctx,
        rng,
        x0 + randomInt(rng, 2, PILLAR_W - 2),
        SPRING - 14,
        randomInt(rng, 28, 72),
        look,
      );
  }
  // Neblina baixa no pé das colunas
  for (let i = 0; i < 20; i++) rect(ctx, look.fog, 0, h - 60 + i * 3, w, 3, 0.012 * (i / 2));
}

function midSaloes(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  // Parede de fundo de tijolos escuros com janelas altas de vitral
  bricks(ctx, 0, 0, w, h, ramp, rng, 16, 9);
  rect(ctx, ramp.deep, 0, 0, w, h, 0.5); // a parede recua; as colunas ficam à frente dela
  const columnRamp = mixRamp(look.back, look.stone, 0.7);
  for (let x0 = -30; x0 < w; x0 += SPAN) {
    const cx = x0 + PILLAR_W + (SPAN - PILLAR_W) / 2;
    const gw = 34;
    const springY = 86;
    const baseY = 190;
    archFill(
      ctx,
      cx,
      springY,
      baseY,
      gw,
      1.1,
      0,
      (t) => {
        const band = Math.floor(t * 9) % 2 === 0 ? 0 : 0.18;
        return mix(mix(look.glowSoft, 0x9a6bff, t), look.glow, (1 - t) * 0.65 + band);
      },
      0.85,
    );
    // Chumbo do vitral: travessas e losangos
    const arcTop = Math.round(archHeight(gw, gw * 1.1));
    rect(ctx, ramp.deep, cx, springY - arcTop + 4, 1, baseY - springY + arcTop - 4, 0.85);
    for (let y = springY - arcTop + 14; y < baseY; y += 12)
      rect(ctx, ramp.deep, cx - gw / 2, y, gw, 1, 0.8);
    for (let y = springY - arcTop + 14; y < baseY; y += 24) {
      disc(ctx, look.glow, cx, y + 6, 2, 0.5);
    }
    archRing(ctx, cx, springY, gw + 8, 1.1, 4, ramp.light, ramp.highlight);
    // Feixe de luz do vitral descendo até o chão
    lightShaft(ctx, look, cx - 14, springY + 10, h, 30, 52);
    // Peitoril
    rect(ctx, ramp.light, cx - gw / 2 - 5, baseY, gw + 10, 4);
    rect(ctx, ramp.highlight, cx - gw / 2 - 5, baseY, gw + 10, 1, 0.5);
    // Estandarte entre as janelas
    const bx = cx + SPAN / 2 - 6;
    rect(ctx, look.glowSoft, bx, 30, 12, 62, 0.7);
    rect(ctx, mix(look.glowSoft, 0, 0.4), bx + 9, 30, 3, 62, 0.8);
    rect(ctx, look.glow, bx + 4, 46, 4, 12, 0.7);
    for (let i = 0; i < 12; i += 4)
      rect(ctx, look.glowSoft, bx + i, 92, 4, randomInt(rng, 3, 10), 0.65);
    rect(ctx, ramp.light, bx - 1, 28, 14, 2);
  }
  for (let x0 = -30; x0 <= w; x0 += SPAN) column(ctx, x0, 20, h, PILLAR_W, columnRamp, rng);
  for (let i = 0; i < 18; i++) rect(ctx, look.fog, 0, h - 54 + i * 3, w, 3, 0.012 * (i / 2));
}

function midCatacumbas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  for (let x0 = -30; x0 < w; x0 += SPAN) {
    const cx = x0 + PILLAR_W + (SPAN - PILLAR_W) / 2;
    const open = SPAN - PILLAR_W - 8;
    // Tímpano de tijolos com nichos de caveira
    bricks(ctx, x0 + PILLAR_W, 0, SPAN - PILLAR_W, 74, ramp, rng, 13, 8);
    rect(ctx, ramp.deep, x0 + PILLAR_W, 0, SPAN - PILLAR_W, 74, 0.2);
    for (let nx = x0 + PILLAR_W + 8; nx < x0 + SPAN - 12; nx += 18) {
      for (const ny of [10, 30, 50]) {
        rect(ctx, ramp.deep, nx, ny, 9, 10);
        rect(ctx, ramp.dark, nx + 1, ny + 1, 7, 8);
        // Caveira no nicho
        rect(ctx, look.moss, nx + 2, ny + 3, 5, 4, 0.9);
        rect(ctx, mix(look.glow, look.skyLow, 0.55), nx + 3, ny + 2, 3, 3, 0.85);
        rect(ctx, ramp.deep, nx + 3, ny + 4, 1, 1);
        rect(ctx, ramp.deep, nx + 5, ny + 4, 1, 1);
      }
    }
    archRing(ctx, cx, 130, open, 1.0, 9, ramp.base, ramp.highlight);
    // Vão entre o tímpano e o arco: escuro
    rect(ctx, ramp.dark, x0 + PILLAR_W, 74, SPAN - PILLAR_W, 0, 0);
    // Raízes pendendo do teto
    for (let i = 0; i < 3; i++) {
      const rx = cx + randomInt(rng, -30, 30);
      for (let j = 0; j < randomInt(rng, 16, 44); j++) {
        rect(
          ctx,
          mix(look.moss, ramp.deep, 0.5),
          rx + Math.round(Math.sin(j / 5 + i) * 1.5),
          74 + j,
          1,
          1,
        );
      }
    }
    // Lanterna de alma pendurada
    if (rng() < 0.7) {
      const lx = cx + randomInt(rng, -16, 16);
      chain(ctx, lx, 74, 28, ramp.light, ramp.highlight);
      disc(ctx, look.glow, lx + 1, 106, 12, 0.07);
      disc(ctx, look.glow, lx + 1, 106, 6, 0.12);
      rect(ctx, ramp.light, lx - 2, 100, 6, 2);
      rect(ctx, look.glow, lx - 1, 102, 4, 5, 0.8);
      rect(ctx, look.glowSoft, lx - 1, 104, 4, 3, 0.9);
      rect(ctx, ramp.light, lx - 2, 107, 6, 1);
    }
  }
  for (let x0 = -30; x0 <= w; x0 += SPAN) {
    column(ctx, x0, 60, h, PILLAR_W, ramp, rng);
  }
  for (let i = 0; i < 20; i++) rect(ctx, look.fog, 0, h - 60 + i * 3, w, 3, 0.012 * (i / 2));
}

// --- Primeiro plano ----------------------------------------------------------------------

function nearPillars(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark: StoneRamp = {
    deep: 0x040508,
    dark: 0x07090f,
    base: mix(look.back.deep, 0x000000, 0.45),
    light: mix(look.back.dark, 0x000000, 0.3),
    highlight: mix(look.back.base, 0x000000, 0.2),
  };
  for (const px of [-6, w - 38]) {
    const pw = 44;
    bricks(ctx, px, 0, pw, h, dark, rng, 22, 10);
    rect(ctx, dark.deep, px, 0, 8, h, 0.7);
    rect(ctx, dark.highlight, px + pw - 2, 0, 2, h, 0.7);
    // Moldura e capitel
    rect(ctx, dark.light, px - 3, 0, pw + 6, 6);
    rect(ctx, dark.highlight, px - 3, 6, pw + 6, 1, 0.5);
    rect(ctx, dark.light, px - 3, h - 8, pw + 6, 8);
  }
}

function nearMuralhas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  nearPillars(ctx, look, rng, w, h);
  for (const bx of [40, w - 56]) {
    const len = randomInt(rng, 60, 90);
    rect(ctx, look.glowSoft, bx, 0, 14, 4, 0);
    rect(ctx, 0x4a1420, bx, 0, 14, len);
    rect(ctx, 0x6e1d2b, bx + 1, 0, 12, len - 2);
    rect(ctx, 0xc0334a, bx + 5, 14, 4, 12, 0.7);
    rect(ctx, 0x8a2236, bx, 0, 3, len, 0.6);
    for (let i = 0; i < 14; i += 4) rect(ctx, 0x6e1d2b, bx + i, len, 4, randomInt(rng, 3, 10));
  }
  for (const x of [58, w - 74, 120, w - 130]) ivy(ctx, rng, x, 0, randomInt(rng, 20, 60), look);
}

function nearSaloes(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  nearPillars(ctx, look, rng, w, h);
  // Cortinas pesadas de veludo roxo caindo dos cantos
  for (const [bx, dir] of [
    [38, 1],
    [w - 38, -1],
  ] as const) {
    for (let i = 0; i < 26; i++) {
      const x = bx + dir * i;
      const len = 70 + Math.round(Math.sin(i * 0.9) * 12) + (i % 3) * 4;
      rect(ctx, mix(0x2c1148, 0x14081f, i / 26), x, 0, 1, len, 0.95);
      if (i % 5 === 1) rect(ctx, 0x5a2d8a, x, 4, 1, len - 8, 0.55);
    }
    rect(ctx, look.glow, bx - (dir > 0 ? 0 : 26), 0, 26, 3, 0.7); // varão dourado
  }
}

function nearCatacumbas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  nearPillars(ctx, look, rng, w, h);
  // Raízes grossas e ossos pendurados
  for (const x of [46, 70, w - 54, w - 88]) {
    let cx = x;
    const len = randomInt(rng, 40, 100);
    for (let i = 0; i < len; i++) {
      if (rng() < 0.25) cx += rng() < 0.5 ? -1 : 1;
      rect(ctx, 0x111a14, cx, i, 2 + (i < 20 ? 1 : 0), 1);
    }
  }
  for (const x of [52, w - 62]) {
    chain(ctx, x, 0, 36, 0x2a3a31, 0x4a5e52);
    rect(ctx, 0x6a6a58, x - 2, 36, 6, 2);
    rect(ctx, 0x8a8a74, x - 1, 38, 4, 6, 0.9);
  }
}

// --- Entradas ----------------------------------------------------------------------------

type LayerDraw = (ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number) => void;

const FAR: Record<BiomeId, LayerDraw> = {
  muralhas: farMuralhas,
  saloes: farSaloes,
  catacumbas: farCatacumbas,
  floresta: farFloresta,
};
const MID: Record<BiomeId, LayerDraw> = {
  muralhas: midMuralhas,
  saloes: midSaloes,
  catacumbas: midCatacumbas,
  floresta: midFloresta,
};
const NEAR: Record<BiomeId, LayerDraw> = {
  muralhas: nearMuralhas,
  saloes: nearSaloes,
  catacumbas: nearCatacumbas,
  floresta: nearFloresta,
};

export type BackgroundLayer = 'far' | 'mid' | 'near';

/** Desenha um plano do fundo de um bioma (o canvas já chega do tamanho certo e transparente). */
export function drawBackgroundLayer(
  ctx: Ctx,
  biome: BiomeId,
  layer: BackgroundLayer,
  w: number,
  h: number,
): void {
  const look = BIOME_LOOK[biome];
  const seed = { far: 11, mid: 23, near: 37 }[layer];
  const rng = createRng(seed);
  const table = { far: FAR, mid: MID, near: NEAR }[layer];
  table[biome](ctx, look, rng, w, h);
}
