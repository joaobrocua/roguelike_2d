import type { BiomeId } from '../data/mapRules';
import { BIOME_LOOK, type BiomeLook, type StoneRamp } from '../data/biomeLook';
import { createRng, randomInt, type Rng } from '../utils/rng';
import { farFloresta, midFloresta, nearFloresta } from './forestBackgrounds';
import { farCemiterio, midCemiterio, nearCemiterio } from './graveyardBackgrounds';
import { farMinas, midMinas, nearMinas } from './mineBackgrounds';
import { farVila, midVila, nearVila } from './villageBackgrounds';
import { farPantano, midPantano, nearPantano } from './swampBackgrounds';
import { disc, ditherGradientV, line, mix, rect, type Ctx } from './pixelCanvas';

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

// --- Catacumbas: peças próprias do ossuário ---------------------------------------------

/** Osso envelhecido; cada plano o mistura com a pedra para que só pontos fiquem claros. */
const BONE = 0xc9c7b0;
/** Barro das urnas. */
const CLAY = 0x6a5a46;

/** O vão em arco (mais `pad` de folga) deixa o retângulo livre? Serve para encaixar lóculos. */
function cryptFits(
  cx: number,
  spring: number,
  openW: number,
  ratio: number,
  rect4: readonly [number, number, number, number],
  pad: number,
): boolean {
  const [x, y, rw, rh] = rect4;
  const xl = cx - openW / 2;
  const xr = cx + openW / 2;
  const dy = spring - (y + rh);
  if (dy < 0) return x + rw + pad <= xl || x - pad >= xr;
  const span = archInterval(xl, xr, openW * ratio, -pad, dy);
  return !span || x + rw <= span[0] || x >= span[1];
}

/** Caveira de frente (7x6 px): crânio, órbitas, nariz e dentes. */
function cryptSkull(ctx: Ctx, x: number, y: number, bone: number, socket: number): void {
  rect(ctx, bone, x + 1, y, 5, 1);
  rect(ctx, bone, x, y + 1, 7, 3);
  rect(ctx, mix(bone, 0xffffff, 0.2), x + 1, y, 2, 1);
  rect(ctx, socket, x + 1, y + 2, 2, 2);
  rect(ctx, socket, x + 4, y + 2, 2, 2);
  rect(ctx, socket, x + 3, y + 3, 1, 1);
  rect(ctx, bone, x + 1, y + 4, 5, 1);
  rect(ctx, bone, x + 2, y + 5, 3, 1);
  rect(ctx, socket, x + 3, y + 5, 1, 1, 0.8);
}

/** Lóculo (nicho de parede, 12x10 ou maior) com uma caveira, ossos empilhados, uma urna ou vazio. */
function cryptNiche(
  ctx: Ctx,
  ramp: StoneRamp,
  rng: Rng,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const bone = mix(BONE, ramp.base, 0.6);
  const boneLit = mix(BONE, ramp.base, 0.45);
  const hole = mix(ramp.deep, 0x000000, 0.45);
  rect(ctx, ramp.deep, x - 1, y - 1, w + 2, h + 2, 0.9);
  rect(ctx, hole, x, y, w, h);
  rect(ctx, ramp.light, x - 1, y - 2, w + 2, 1, 0.55); // verga com luz no topo
  rect(ctx, ramp.light, x - 1, y + h + 1, w + 2, 1, 0.3); // peitoril
  const roll = rng();
  if (roll < 0.36) {
    cryptSkull(ctx, x + Math.floor((w - 7) / 2), y + h - 6, bone, hole);
  } else if (roll < 0.58) {
    // Ossos longos empilhados
    rect(ctx, bone, x + 1, y + h - 2, w - 2, 1);
    rect(ctx, boneLit, x + 2, y + h - 4, w - 4, 1);
    rect(ctx, bone, x + 1, y + h - 6, w - 3, 1);
    rect(ctx, boneLit, x + 1, y + h - 3, 1, 2);
    rect(ctx, boneLit, x + w - 2, y + h - 5, 1, 2);
  } else if (roll < 0.74) {
    // Urna de barro com gargalo e uma faixa de luz
    const clay = mix(CLAY, ramp.base, 0.55);
    rect(ctx, clay, x + 3, y + 4, w - 6, h - 5);
    rect(ctx, clay, x + 4, y + 2, w - 8, 2);
    rect(ctx, mix(clay, 0xffffff, 0.2), x + 3, y + 2, w - 6, 1);
    rect(ctx, mix(clay, 0xffffff, 0.18), x + 4, y + 4, 1, h - 6);
    rect(ctx, ramp.deep, x + w - 5, y + 4, 2, h - 5, 0.55);
  } else if (roll < 0.84) {
    // Só um monte de ossos miúdos
    for (let i = 0; i < 4; i++)
      rect(ctx, i % 2 === 0 ? bone : boneLit, x + 1 + i * 2, y + h - 2 - (i % 2), 3, 1);
  }
}

/** Rachadura: um fio de 1 px que desce serpenteando, com um galho aqui e ali. */
function cryptCrack(
  ctx: Ctx,
  rng: Rng,
  x: number,
  y: number,
  length: number,
  color: number,
  alpha: number,
): void {
  let cx = x;
  for (let i = 0; i < length; i++) {
    if (rng() < 0.4) cx += rng() < 0.5 ? -1 : 1;
    rect(ctx, color, cx, y + i, 1, 1, alpha);
    if (rng() < 0.07) rect(ctx, color, cx + (rng() < 0.5 ? -2 : 1), y + i, 2, 1, alpha);
  }
}

/** Mancha de umidade: faixa de limo que escorre da pedra e esmaece, com uma gota na ponta. */
function cryptStain(
  ctx: Ctx,
  look: BiomeLook,
  rng: Rng,
  x: number,
  y: number,
  length: number,
): void {
  const width = randomInt(rng, 2, 5);
  for (let i = 0; i < length; i++) {
    const fade = 1 - i / length;
    rect(ctx, look.moss, x, y + i, i > length * 0.6 ? width - 1 : width, 1, 0.04 + 0.16 * fade);
  }
  rect(ctx, look.mossLight, x + 1, y + length, 1, 1, 0.3);
}

/** Teia de aranha num canto: raios e fios entre eles. `dir` é 1 se o canto abre para a direita. */
function cryptWeb(
  ctx: Ctx,
  color: number,
  x: number,
  y: number,
  size: number,
  dir: 1 | -1,
  alpha: number,
): void {
  const rays = 5;
  const at = (radius: number, i: number): [number, number] => {
    const angle = (i / (rays - 1)) * (Math.PI / 2);
    return [x + dir * Math.cos(angle) * radius, y + Math.sin(angle) * radius];
  };
  for (let i = 0; i < rays; i++) {
    const [ex, ey] = at(size, i);
    line(ctx, color, x, y, ex, ey, alpha);
  }
  for (const k of [0.38, 0.68, 0.96]) {
    for (let i = 0; i < rays - 1; i++) {
      const [ax, ay] = at(size * k, i);
      const [bx, by] = at(size * k, i + 1);
      line(ctx, color, ax, ay, bx, by, alpha * 0.8);
    }
  }
}

/** Tocha de parede de chama verde: halo, copa de ferro e a chama em três tons. */
function cryptTorch(ctx: Ctx, look: BiomeLook, ramp: StoneRamp, x: number, y: number): void {
  disc(ctx, look.glow, x, y - 6, 30, 0.04);
  disc(ctx, look.glow, x, y - 6, 18, 0.07);
  disc(ctx, look.glow, x, y - 5, 9, 0.11);
  rect(ctx, ramp.deep, x - 1, y + 3, 3, 10); // haste
  rect(ctx, ramp.light, x - 4, y, 9, 3); // copa
  rect(ctx, ramp.highlight, x - 4, y, 9, 1, 0.6);
  rect(ctx, ramp.deep, x - 3, y + 3, 7, 1);
  rect(ctx, look.glowSoft, x - 2, y - 5, 5, 5, 0.9);
  rect(ctx, look.glowSoft, x - 1, y - 8, 3, 3, 0.9);
  rect(ctx, look.glow, x - 1, y - 4, 3, 4);
  rect(ctx, mix(look.glow, 0xffffff, 0.5), x, y - 3, 1, 3);
}

/** Pilha de ossos junto ao chão: monte escuro, ossos soltos e duas ou três caveiras. */
function cryptBonePile(
  ctx: Ctx,
  ramp: StoneRamp,
  rng: Rng,
  x: number,
  base: number,
  width: number,
  height: number,
): void {
  const bone = mix(BONE, ramp.base, 0.5);
  const boneLit = mix(BONE, ramp.base, 0.36);
  const boneDark = mix(BONE, ramp.deep, 0.78);
  const halfAt = (row: number): number =>
    Math.round((width / 2) * Math.sqrt(Math.max(0, 1 - row / height)));
  for (let row = 0; row < height; row++) {
    const half = halfAt(row);
    rect(ctx, ramp.deep, x - half, base - 1 - row, half * 2 + 1, 1, 0.9);
  }
  const pieces = Math.round((width * height) / 9);
  for (let i = 0; i < pieces; i++) {
    const row = randomInt(rng, 0, height);
    const half = halfAt(row);
    const px = x + randomInt(rng, -half, half + 1);
    const py = base - 1 - row;
    const tone = rng() < 0.3 ? boneLit : rng() < 0.5 ? bone : boneDark;
    if (rng() < 0.6) rect(ctx, tone, px, py, randomInt(rng, 3, 6), 1);
    else rect(ctx, tone, px, py - 2, 1, randomInt(rng, 3, 5));
  }
  for (let i = 0; i < 3; i++) {
    const row = randomInt(rng, 0, Math.max(1, height - 6));
    const half = halfAt(row);
    cryptSkull(
      ctx,
      x + randomInt(rng, -half, Math.max(-half, half - 7) + 1),
      base - 6 - row,
      i === 0 ? boneLit : bone,
      ramp.deep,
    );
  }
  rect(ctx, ramp.deep, x - Math.round(width / 2) - 2, base - 1, width + 4, 1, 0.7);
}

/**
 * Um nível da galeria distante: parede inteira do teto ao chão, com vãos em arco centrados em
 * `centerX` e repetidos a cada `pitch`. Os níveis mais próximos são desenhados por último e
 * cobrem os de trás, deixando o fundo à mostra só pelos vãos (um túnel de arcos).
 */
function cryptGallery(
  ctx: Ctx,
  color: number,
  rim: number,
  w: number,
  h: number,
  centerX: number,
  pitch: number,
  openW: number,
  spring: number,
  ratio: number,
): void {
  const radius = openW * ratio;
  const top = Math.ceil(archHeight(openW, radius));
  const first = -Math.ceil(centerX / pitch) - 1;
  const last = Math.ceil((w - centerX) / pitch) + 1;
  rect(ctx, color, 0, 0, w, spring - top); // acima das cumeeiras a parede é inteira
  const pier = (pitch - openW) / 2;
  for (let k = first; k <= last; k++) {
    const cx = centerX + k * pitch;
    const cellL = cx - pitch / 2;
    const cellR = cx + pitch / 2;
    for (let dy = top; dy >= 0; dy--) {
      const span = archInterval(cx - openW / 2, cx + openW / 2, radius, 0, dy);
      const y = spring - dy;
      if (!span) {
        rect(ctx, color, cellL, y, pitch, 1);
        continue;
      }
      rect(ctx, color, cellL, y, span[0] - cellL, 1);
      rect(ctx, color, span[1], y, cellR - span[1], 1);
    }
    rect(ctx, color, cellL, spring + 1, pier, h - spring - 1);
    rect(ctx, color, cx + openW / 2, spring + 1, pier, h - spring - 1);
    archRing(ctx, cx, spring, openW, ratio, 2, rim, mix(rim, 0xffffff, 0.12));
  }
}

function farCatacumbas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const haze = mix(look.skyLow, look.glowSoft, 0.28);
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, haze, look.skyLow]);
  // Ao fundo, no eixo da tela, um corredor distante de onde sai uma luz verde-doente
  const vx = Math.round(w / 2);
  disc(ctx, look.glowSoft, vx, 190, 64, 0.05);
  disc(ctx, look.glowSoft, vx, 190, 40, 0.07);
  disc(ctx, look.glow, vx, 188, 22, 0.08);
  archFill(
    ctx,
    vx,
    178,
    210,
    16,
    1,
    0,
    (t) => mix(mix(look.glow, look.glowSoft, 0.4), look.skyLow, t * 0.55),
    0.85,
  );
  rect(ctx, look.skyTop, vx - 1, 180, 2, 30, 0.45); // os arcos mais fundos, em fenda
  // Níveis da galeria, do mais fundo (claro, na névoa) ao mais próximo (silhueta escura)
  const ratio = 1.05;
  const levels = [
    { pitch: 58, openW: 28, spring: 176, floorY: 214, shade: 0.3, veil: 0.07 },
    { pitch: 78, openW: 42, spring: 166, floorY: 225, shade: 0.58, veil: 0.05 },
    { pitch: 104, openW: 62, spring: 154, floorY: 237, shade: 0.82, veil: 0 },
  ] as const;
  levels.forEach((level, index) => {
    const color = mix(look.skyLow, look.back.deep, level.shade);
    const floor = mix(color, haze, 0.32);
    rect(ctx, floor, 0, level.floorY, w, h - level.floorY);
    rect(ctx, mix(floor, look.glowSoft, 0.25), 0, level.floorY, w, 1, 0.6);
    if (index === 0) {
      // O reflexo da luz do corredor no chão molhado
      for (let y = level.floorY + 1; y < h - 8; y += 2) {
        const t = (y - level.floorY) / 24;
        rect(ctx, look.glow, vx - 4 - t * 6, y, 8 + t * 12, 1, 0.16 * Math.max(0, 1 - t));
      }
    }
    cryptGallery(
      ctx,
      color,
      mix(color, look.glowSoft, 0.12 + index * 0.02),
      w,
      h,
      vx,
      level.pitch,
      level.openW,
      level.spring,
      ratio,
    );
    if (index > 0) {
      // Lóculos de ossos nos pilares e na parede alta, cada vez mais escuros e maiores
      const hole = mix(color, look.back.deep, 0.55);
      const bone = mix(BONE, color, 0.84);
      const stepX = index === 1 ? 11 : 13;
      const stepY = index === 1 ? 12 : 14;
      const first = -Math.ceil(vx / level.pitch) - 1;
      const last = Math.ceil((w - vx) / level.pitch) + 1;
      for (let k = first; k <= last; k++) {
        const cx = vx + k * level.pitch;
        for (let y = index === 1 ? 138 : 104; y + stepY - 4 <= level.floorY - 4; y += stepY) {
          for (
            let x = cx - level.pitch / 2 + 4;
            x + stepX - 3 <= cx + level.pitch / 2 - 3;
            x += stepX
          ) {
            const box: [number, number, number, number] = [x, y, stepX - 4, stepY - 4];
            if (!cryptFits(cx, level.spring, level.openW, ratio, box, 3)) continue;
            rect(ctx, hole, x, y, stepX - 4, stepY - 4);
            const roll = rng();
            if (roll < 0.5) {
              rect(ctx, bone, x + 1, y + 1, stepX - 6, 2);
              rect(ctx, hole, x + 2, y + 2, 1, 1);
              rect(ctx, hole, x + stepX - 7, y + 2, 1, 1);
            } else if (roll < 0.72) {
              rect(ctx, bone, x + 1, y + stepY - 7, stepX - 6, 1);
            }
          }
        }
      }
    }
    if (level.veil > 0) rect(ctx, look.fog, 0, 0, w, h, level.veil);
  });
  // Luzes de alma ao longe
  for (let i = 0; i < 6; i++) {
    const x = randomInt(rng, 14, w - 14);
    const y = randomInt(rng, 120, 200);
    disc(ctx, look.glow, x, y, 10, 0.04);
    disc(ctx, look.glow, x, y, 5, 0.08);
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
  // Pedra da cripta: entre a do fundo e a do chão, mas as áreas grandes ficam abaixo das plataformas
  const ramp = mixRamp(look.back, look.stone, 0.45);
  const spring = 150;
  const ratio = 0.62;
  const open = SPAN - PILLAR_W - 6;
  const dadoTop = 204;
  const apex = spring - Math.round(archHeight(open, open * ratio));
  const centers: number[] = [];
  for (let x0 = -30; x0 < w; x0 += SPAN) centers.push(x0 + PILLAR_W + (SPAN - PILLAR_W) / 2);

  // 1) Parede alta: tijolos, teto afundado em sombra e fileiras de lóculos fora dos vãos
  bricks(ctx, -30, 0, w + 60, spring + 4, ramp, rng, 13, 8);
  for (let i = 0; i < 14; i++) rect(ctx, ramp.deep, 0, i * 8, w, 8, 0.6 - i * 0.035);
  for (const cx of centers) {
    for (const ny of [8, 22, 36, 50, 64, 78, 98, 112, 126]) {
      for (let i = 0; i < 6; i++) {
        const nx = cx - open / 2 - 2 + i * 16;
        if (!cryptFits(cx, spring, open, ratio, [nx, ny, 12, 10], 5)) continue;
        if (rng() < 0.22) continue; // alguns trechos ficam só de tijolo, para não virar papel de parede
        cryptNiche(ctx, ramp, rng, nx, ny, 12, 10);
      }
    }
  }

  // 2) Os vãos em arco: abertos (o fundo aparece), com anel de pedra, juntas e pedra-chave
  for (const cx of centers) {
    const xl = cx - open / 2;
    const radius = open * ratio;
    const top = Math.ceil(archHeight(open, radius));
    for (let dy = 0; dy <= top; dy++) {
      const span = archInterval(xl, xl + open, radius, 0, dy);
      if (span) ctx.clearRect(Math.round(span[0]), spring - dy, Math.round(span[1] - span[0]), 1);
    }
    ctx.clearRect(Math.round(xl), spring + 1, open, h - spring);
    archRing(ctx, cx, spring, open, ratio, 7, ramp.light, ramp.highlight);
    for (let dy = 6; dy < top * 0.78; dy += 8) {
      const outer = archInterval(xl, xl + open, radius, 0, dy);
      const inner = archInterval(xl, xl + open, radius, 7, dy);
      if (!outer || !inner) continue;
      rect(ctx, ramp.deep, outer[0], spring - dy, inner[0] - outer[0], 1, 0.7);
      rect(ctx, ramp.deep, inner[1], spring - dy, outer[1] - inner[1], 1, 0.7);
    }
    rect(ctx, ramp.highlight, cx - 3, apex, 6, 8, 0.4); // pedra-chave
    rect(ctx, ramp.deep, cx - 3, apex, 1, 8, 0.8);
    rect(ctx, ramp.deep, cx + 2, apex, 1, 8, 0.8);
    // Teias nos cantos onde o arco encontra os pilares
    if (rng() < 0.75) cryptWeb(ctx, look.fog, cx - open / 2 + 1, spring + 6, 20, 1, 0.3);
    if (rng() < 0.6) cryptWeb(ctx, look.fog, cx + open / 2 - 1, spring + 6, 16, -1, 0.26);
  }

  // 3) Ossuário baixo: muro de lóculos de ponta a ponta, com cornija
  bricks(ctx, -30, dadoTop, w + 60, h - dadoTop, ramp, rng, 13, 8);
  rect(ctx, ramp.deep, 0, dadoTop, w, h - dadoTop, 0.18);
  rect(ctx, ramp.light, 0, dadoTop - 3, w, 3);
  rect(ctx, ramp.highlight, 0, dadoTop - 3, w, 1, 0.45);
  rect(ctx, ramp.deep, 0, dadoTop, w, 1, 0.9);
  for (const cx of centers) {
    for (const ny of [dadoTop + 7, dadoTop + 21]) {
      for (let i = 0; i < 6; i++)
        cryptNiche(ctx, ramp, rng, cx - open / 2 - 2 + i * 16, ny, 12, 10);
    }
  }

  // 4) Pilares grossos, com manchas de umidade, rachaduras e tochas de chama verde
  let pillarIndex = 0;
  for (let x0 = -30; x0 <= w; x0 += SPAN, pillarIndex++) {
    column(ctx, x0, spring - 12, h, PILLAR_W, ramp, rng);
    cryptStain(
      ctx,
      look,
      rng,
      x0 + randomInt(rng, 2, PILLAR_W - 4),
      spring - 4,
      randomInt(rng, 26, 70),
    );
    cryptCrack(
      ctx,
      rng,
      x0 + randomInt(rng, 3, PILLAR_W - 3),
      spring + 20,
      randomInt(rng, 14, 36),
      ramp.deep,
      0.8,
    );
    if (pillarIndex % 2 === 1) cryptTorch(ctx, look, ramp, x0 + PILLAR_W / 2, 172);
  }

  // 5) Correntes, lanternas de alma e manchas de umidade sob os arcos
  for (const cx of centers) {
    const central = Math.abs(cx - w / 2) < 30;
    if (rng() < 0.75) {
      const hx = cx + randomInt(rng, -26, 27);
      const len = randomInt(rng, 22, 54);
      chain(ctx, hx, apex + 8, len, ramp.light, ramp.highlight);
      const ey = apex + 8 + len;
      if (!central && rng() < 0.5) {
        disc(ctx, look.glow, hx + 1, ey + 4, 13, 0.07);
        disc(ctx, look.glow, hx + 1, ey + 4, 6, 0.12);
        rect(ctx, ramp.light, hx - 2, ey, 6, 2);
        rect(ctx, look.glow, hx - 1, ey + 2, 4, 5, 0.8);
        rect(ctx, look.glowSoft, hx - 1, ey + 4, 4, 3, 0.9);
        rect(ctx, ramp.light, hx - 2, ey + 7, 6, 1);
      } else {
        cryptSkull(ctx, hx - 3, ey, mix(BONE, ramp.base, 0.5), ramp.deep); // caveira acorrentada
      }
    }
    if (rng() < 0.6)
      cryptStain(ctx, look, rng, cx + randomInt(rng, -40, 41), apex + 4, randomInt(rng, 10, 26));
  }

  // 6) Pilhas de ossos ao pé do muro e dos pilares
  for (const cx of centers) {
    cryptBonePile(
      ctx,
      ramp,
      rng,
      cx + randomInt(rng, -34, 35),
      238,
      randomInt(rng, 26, 44),
      randomInt(rng, 9, 15),
    );
    if (rng() < 0.6)
      cryptBonePile(
        ctx,
        ramp,
        rng,
        cx - open / 2 - 12,
        238,
        randomInt(rng, 18, 28),
        randomInt(rng, 7, 11),
      );
  }
  for (let i = 0; i < 20; i++) rect(ctx, look.fog, 0, h - 60 + i * 3, w, 3, 0.013 * (i / 2));
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

/** Pilar escuro do primeiro plano, com caveiras em relevo, limo e rachaduras. `inner` é o lado que olha a sala. */
function cryptNearPillar(
  ctx: Ctx,
  look: BiomeLook,
  rng: Rng,
  x: number,
  width: number,
  h: number,
  inner: 'left' | 'right',
): void {
  const dark: StoneRamp = {
    deep: 0x030605,
    dark: 0x050a08,
    base: mix(look.back.deep, 0x000000, 0.35),
    light: mix(look.back.dark, 0x000000, 0.1),
    highlight: mix(look.back.base, look.back.light, 0.3),
  };
  bricks(ctx, x, 0, width, h, dark, rng, width, 12);
  const edgeX = inner === 'right' ? x + width - 3 : x;
  rect(ctx, dark.deep, inner === 'right' ? x : x + width - 12, 0, 12, h, 0.7); // lado de fora, na sombra
  rect(ctx, dark.highlight, edgeX, 0, 3, h, 0.55); // aresta que pega a luz da sala
  rect(ctx, dark.light, edgeX, 0, 1, h, 0.7);
  // Cornija no alto e plinto embaixo
  rect(ctx, dark.light, x - 3, 0, width + 6, 8);
  rect(ctx, dark.highlight, x - 3, 8, width + 6, 1, 0.45);
  rect(ctx, dark.light, x - 3, h - 26, width + 6, 26);
  rect(ctx, dark.highlight, x - 3, h - 26, width + 6, 1, 0.4);
  // Caveiras em relevo, numa moldura afundada
  const skull = mix(dark.highlight, BONE, 0.14);
  for (const sy of [132, 186]) {
    const sx = x + Math.round((width - 14) / 2);
    rect(ctx, dark.deep, sx, sy, 14, 16, 0.9);
    rect(ctx, dark.highlight, sx, sy - 1, 14, 1, 0.5);
    cryptSkull(ctx, sx + 3, sy + 3, skull, dark.deep);
    rect(ctx, mix(dark.highlight, BONE, 0.08), sx + 3, sy + 10, 7, 1, 0.8);
  }
  cryptStain(ctx, look, rng, x + randomInt(rng, 4, width - 8), 10, randomInt(rng, 60, 130));
  cryptCrack(
    ctx,
    rng,
    x + randomInt(rng, 4, width - 4),
    40,
    randomInt(rng, 50, 90),
    dark.deep,
    0.9,
  );
}

/** Raiz que desce do teto, afinando e serpenteando, com radículas. */
function cryptRoot(ctx: Ctx, look: BiomeLook, rng: Rng, x: number, length: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.4);
  const lit = mix(look.moss, look.back.base, 0.6);
  const phase = rng() * 6;
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const thick = t < 0.3 ? 3 : t < 0.65 ? 2 : 1;
    const rx = x + Math.round(Math.sin(i / 9 + phase) * 2.5);
    rect(ctx, dark, rx, i, thick, 1, 0.96);
    if (thick > 1) rect(ctx, lit, rx, i, 1, 1, 0.35);
    if (i > 8 && i % 11 === 0 && rng() < 0.7) {
      const side = rng() < 0.5 ? -1 : 1;
      for (let j = 1; j <= randomInt(rng, 3, 7); j++)
        rect(ctx, dark, rx + side * j, i + j, 1, 1, 0.9);
    }
  }
}

function nearCatacumbas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  // Pilares largos nas bordas (a vista começa uns 40 px dentro da textura)
  cryptNearPillar(ctx, look, rng, 34, 40, h, 'right');
  cryptNearPillar(ctx, look, rng, w - 74, 40, h, 'left');
  // Teto de pedra rústico: estalactites escuras em toda a largura
  const rock = 0x040806;
  const tips: [number, number][] = [];
  for (let x = 4; x < w; x += randomInt(rng, 8, 22)) {
    const width = randomInt(rng, 6, 15);
    const length = rng() < 0.2 ? randomInt(rng, 18, 30) : randomInt(rng, 5, 17);
    for (let r = 0; r < length; r++) {
      const half = Math.round((width / 2) * (1 - r / length));
      rect(ctx, rock, x - half, r, half * 2 + 1, 1, 0.96);
    }
    rect(
      ctx,
      mix(look.back.base, rock, 0.4),
      x - Math.round(width / 2),
      0,
      1,
      Math.round(length * 0.5),
      0.5,
    );
    if (length > 12) tips.push([x, length]);
  }
  // Raízes pendendo, algumas longas o bastante para aparecer abaixo do teto das salas
  for (let i = 0; i < 9; i++) {
    cryptRoot(
      ctx,
      look,
      rng,
      randomInt(rng, 84, w - 84),
      i % 3 === 0 ? randomInt(rng, 110, 160) : randomInt(rng, 40, 100),
    );
  }
  // Teias nos cantos, junto aos pilares, e uma solta no meio
  const web = mix(look.fog, look.back.light, 0.35);
  cryptWeb(ctx, web, 74, 0, 34, 1, 0.3);
  cryptWeb(ctx, web, w - 74, 0, 34, -1, 0.3);
  cryptWeb(ctx, web, randomInt(rng, 190, 260), 0, 24, rng() < 0.5 ? 1 : -1, 0.22);
  // Correntes com caveiras penduradas
  for (const x of [108, w - 124]) {
    chain(ctx, x, 0, 96, 0x2a3a31, 0x4a5e52);
    cryptSkull(ctx, x - 3, 96, 0x6a6a58, 0x050a08);
  }
  // Gotas: pontos d'água que escorrem das pontas das estalactites, com marca de respingo no chão
  const dropColor = mix(look.fog, look.glow, 0.3);
  let count = 0;
  for (const [tx, length] of tips) {
    if (count >= 7 || tx < 90 || tx > w - 90) continue;
    count++;
    const dropY = length + randomInt(rng, 6, 150);
    rect(ctx, dropColor, tx, length + 1, 1, 2, 0.5);
    rect(ctx, dropColor, tx, dropY, 1, 3, 0.75);
    rect(ctx, dropColor, tx, dropY - 7, 1, 5, 0.2);
    rect(ctx, dropColor, tx - 2, 236, 5, 1, 0.22);
    rect(ctx, dropColor, tx - 1, 235, 3, 1, 0.3);
  }
  // Poeira fina boiando
  for (let i = 0; i < 70; i++) {
    rect(
      ctx,
      look.fog,
      randomInt(rng, 0, w),
      randomInt(rng, 20, 240),
      rng() < 0.2 ? 2 : 1,
      1,
      0.1 + rng() * 0.15,
    );
  }
}

// --- Entradas ----------------------------------------------------------------------------

type LayerDraw = (ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number) => void;

const FAR: Record<BiomeId, LayerDraw> = {
  muralhas: farMuralhas,
  saloes: farSaloes,
  catacumbas: farCatacumbas,
  floresta: farFloresta,
  pantano: farPantano,
  cemiterio: farCemiterio,
  minas: farMinas,
  vila: farVila,
};
const MID: Record<BiomeId, LayerDraw> = {
  muralhas: midMuralhas,
  saloes: midSaloes,
  catacumbas: midCatacumbas,
  floresta: midFloresta,
  pantano: midPantano,
  cemiterio: midCemiterio,
  minas: midMinas,
  vila: midVila,
};
const NEAR: Record<BiomeId, LayerDraw> = {
  muralhas: nearMuralhas,
  saloes: nearSaloes,
  catacumbas: nearCatacumbas,
  floresta: nearFloresta,
  pantano: nearPantano,
  cemiterio: nearCemiterio,
  minas: nearMinas,
  vila: nearVila,
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
