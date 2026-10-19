import type { BiomeLook, StoneRamp } from '../data/biomeLook';
import { randomInt, type Rng } from '../utils/rng';
import { disc, ditherGradientV, line, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo do Pântano dos Afogados, em pixel art: distante (céu carregado, lua
 * pálida com reflexo na água, névoa em camadas, ilhotas e manguezais em silhueta, bandos de aves e
 * morcegos), médio (mangues tortos de raízes aéreas, musgo e cipós pendurados, palafitas em ruína
 * ligadas por passarelas, nenúfares, barcos virados, ossos e fogos-fátuos) e primeiro plano
 * (folhagem escura nas bordas, cipós grossos, taboas, capim alto, pingos e vaga-lumes). As cores
 * vêm de BiomeLook.
 */

/** Linha do horizonte do plano distante (onde a água começa). */
const FAR_HORIZON = 196;
/** Distância da superfície da água até a base do plano médio. */
const MID_WATER_DEPTH = 40;

/**
 * Opacidade de um brilho: perto do centro da tela ele enfraquece, para as luzes do fundo nunca
 * competirem com o jogador e as plataformas (que ficam no meio da vista).
 */
function edgeAlpha(x: number, w: number, base: number): number {
  const d = Math.abs(x - w / 2) / (w / 2);
  return base * (0.35 + 0.65 * Math.min(1, d * 1.6));
}

/** Lâmina de capim ou junco: uma linha curva que afina para o alto. */
function blade(
  ctx: Ctx,
  color: number,
  x: number,
  base: number,
  height: number,
  bend: number,
  thick = 1,
): void {
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const dx = Math.round(t * t * bend);
    rect(ctx, color, x + dx, base - y, t < 0.45 ? thick : 1, 1);
  }
}

/** Haste de junco: uma lâmina curva; com `tuft`, ganha a espiga (a "maçaneta") no alto. */
function reed(
  ctx: Ctx,
  x: number,
  base: number,
  height: number,
  color: number,
  tuft: number | null,
): void {
  const bend = Math.round(height / 12) * (x % 2 === 0 ? 1 : -1);
  blade(ctx, color, x, base, height, bend);
  if (tuft !== null) rect(ctx, tuft, x + bend - 1, base - height - 5, 3, 6);
}

/** Tronco torto de uma árvore afogada, só em silhueta. */
function snag(ctx: Ctx, x: number, base: number, height: number, color: number, rng: Rng): void {
  const width = Math.max(2, Math.round(height / 18));
  let cx = x;
  for (let y = 0; y < height; y++) {
    if (y % 9 === 0) cx += rng() < 0.5 ? -1 : 1;
    rect(ctx, color, cx, base - y, width, 1);
  }
  // Galhos nus que se inclinam para fora
  for (let i = 0; i < 3; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    let bx = cx;
    let by = base - Math.round(height * (0.45 + i * 0.18));
    for (let s = 0; s < 9 - i * 2; s++) {
      bx += side;
      if (s % 2 === 1) by -= 1;
      rect(ctx, color, bx, by, 1, 1);
    }
  }
}

/** Faixas de névoa alongadas e bem fracas, para a bruma parecer em camadas. */
function mistBand(
  ctx: Ctx,
  color: number,
  y: number,
  w: number,
  count: number,
  alpha: number,
  rng: Rng,
): void {
  for (let i = 0; i < count; i++) {
    const len = randomInt(rng, 50, 170);
    rect(
      ctx,
      color,
      randomInt(rng, -20, w - len + 20),
      y + randomInt(rng, 0, 7),
      len,
      randomInt(rng, 1, 3),
      alpha * (0.6 + rng() * 0.8),
    );
  }
}

/** Ilhota baixa de lama com juncos curtos, só em silhueta. */
function islet(
  ctx: Ctx,
  color: number,
  cx: number,
  base: number,
  half: number,
  rise: number,
  rng: Rng,
): void {
  for (let dx = -half; dx <= half; dx++) {
    const u = dx / half;
    const hgt = Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * rise);
    rect(ctx, color, cx + dx, base - hgt, 1, hgt);
  }
  for (let i = 0; i < Math.round(half / 5); i++) {
    const rx = cx + randomInt(rng, -Math.round(half * 0.8), Math.round(half * 0.8));
    blade(ctx, color, rx, base - 1, randomInt(rng, 6, 15), rng() < 0.5 ? -2 : 2);
  }
}

/** Mangue distante em silhueta: tronco torto, copa de moitas e raízes aéreas até a água. */
function farMangrove(
  ctx: Ctx,
  x: number,
  base: number,
  height: number,
  color: number,
  rng: Rng,
): void {
  const trunk = Math.max(2, Math.round(height / 22));
  const trunkHeight = Math.round(height * 0.7);
  let cx = x;
  for (let y = 0; y < trunkHeight; y++) {
    if (y % 8 === 0) cx += rng() < 0.5 ? -1 : 1;
    rect(ctx, color, cx, base - y, trunk, 1);
  }
  // Copa: um cacho de moitas irregulares, com tufos caindo por baixo
  const crownY = base - trunkHeight;
  const spread = Math.round(height * 0.38);
  const blobs = 4 + Math.round(height / 18);
  for (let i = 0; i < blobs; i++) {
    const r = randomInt(rng, Math.round(height * 0.06), Math.round(height * 0.13) + 1);
    const bx = cx + randomInt(rng, -spread, spread + 1);
    const by = crownY - randomInt(rng, 0, Math.round(height * 0.14) + 1) + Math.abs(bx - cx) / 8;
    disc(ctx, color, bx, by, r);
    if (rng() < 0.5) rect(ctx, color, bx, by + r, 1, randomInt(rng, 5, 14)); // raiz pendente
  }
  // Raízes aéreas: arcos que descem do tronco e mergulham na água
  const roots = 4 + (height > 60 ? 2 : 0);
  for (let i = 0; i < roots; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = 5 + Math.floor(i / 2) * 5 + randomInt(rng, 0, 4);
    const top = base - Math.round(height * 0.3) + i * 2;
    line(ctx, color, cx, top, cx + side * reach, base + 1);
    if (height > 50) line(ctx, color, cx + 1, top, cx + side * reach + 1, base + 1);
  }
}

/** Bando de aves (ou morcegos, que têm asas recortadas) voando longe, só em silhueta. */
function flock(
  ctx: Ctx,
  color: number,
  cx: number,
  cy: number,
  count: number,
  bats: boolean,
  rng: Rng,
): void {
  for (let i = 0; i < count; i++) {
    const dx = randomInt(rng, -34, 35);
    const bx = cx + dx;
    const by = cy + randomInt(rng, -9, 10) + Math.round(Math.abs(dx) * 0.12);
    if (bats) {
      for (const [ox, oy] of [
        [-3, -1],
        [-2, 0],
        [-1, -1],
        [0, 0],
        [1, -1],
        [2, 0],
        [3, -1],
      ] as const) {
        rect(ctx, color, bx + ox, by + oy, 1, 1);
      }
    } else if (i % 2 === 0) {
      // Asas para cima
      for (const [ox, oy] of [
        [-2, -2],
        [-1, -1],
        [0, 0],
        [1, -1],
        [2, -2],
      ] as const) {
        rect(ctx, color, bx + ox, by + oy, 1, 1);
      }
    } else {
      // Asas planas
      for (const [ox, oy] of [
        [-2, 0],
        [-1, 0],
        [0, 1],
        [1, 0],
        [2, 0],
      ] as const) {
        rect(ctx, color, bx + ox, by + oy, 1, 1);
      }
    }
  }
}

/** Reflexo da lua: tracinhos que alargam e esmaecem conforme se afastam do horizonte. */
function moonReflection(
  ctx: Ctx,
  look: BiomeLook,
  x: number,
  top: number,
  bottom: number,
  rng: Rng,
): void {
  const color = mix(look.glowSoft, 0xffffff, 0.4);
  for (let y = top + 2, i = 0; y < bottom; y += 3, i++) {
    const wd = Math.max(2, Math.round((4 + i * 1.2) * (0.4 + rng() * 0.9)));
    const alpha = Math.max(0.08, 0.5 - i * 0.016);
    rect(ctx, color, x - Math.round(wd / 2) + randomInt(rng, -2, 3), y, wd, 1, alpha);
  }
}

export function farPantano(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, look.skyLow, look.skyMid]);

  // Lua pálida atrás das nuvens, com halos largos e crateras fracas
  const moonX = Math.round(w * 0.3);
  const moonY = 78;
  const moon = mix(mix(look.glow, 0xffffff, 0.6), look.skyLow, 0.3);
  disc(ctx, look.skyLow, moonX, moonY, 56, 0.2);
  disc(ctx, look.glowSoft, moonX, moonY, 40, 0.08);
  disc(ctx, look.glowSoft, moonX, moonY, 26, 0.14);
  disc(ctx, moon, moonX, moonY, 14, 0.95);
  disc(ctx, mix(moon, look.skyMid, 0.6), moonX + 5, moonY - 2, 11, 0.3); // sombra do disco
  for (const [ox, oy, r] of [
    [-5, -4, 3],
    [3, 5, 2],
    [-2, 6, 2],
  ] as const) {
    disc(ctx, mix(moon, look.skyMid, 0.5), moonX + ox, moonY + oy, r, 0.35);
  }
  // Faixas de nuvem alongadas; uma delas cruza a lua
  for (let i = 0; i < 9; i++) {
    rect(
      ctx,
      mix(look.skyMid, look.skyLow, 0.4),
      randomInt(rng, 0, w - 120),
      20 + i * 14,
      randomInt(rng, 60, 160),
      3,
      0.35,
    );
  }
  rect(ctx, mix(look.skyMid, look.skyLow, 0.3), moonX - 46, moonY + 9, 84, 3, 0.55);
  rect(ctx, mix(look.skyMid, look.skyLow, 0.3), moonX - 20, moonY + 13, 60, 2, 0.4);

  // Bandos de aves e morcegos: um cruza o halo da lua, onde a silhueta aparece melhor
  const flyer = mix(look.skyTop, 0x000000, 0.4);
  flock(ctx, flyer, moonX + 34, moonY - 22, 5, false, rng);
  flock(ctx, flyer, Math.round(w * 0.74), 58, 4, true, rng);
  flock(ctx, flyer, Math.round(w * 0.55), 112, 3, false, rng);

  // Fileira distante: ilhotas e mangues pequenos, mais claros por causa da bruma
  const farTone = mix(look.skyLow, 0x000000, 0.5);
  const midTone = mix(look.skyLow, 0x000000, 0.64);
  const nearTone = mix(look.skyLow, 0x000000, 0.76);
  for (let i = 0; i < 5; i++) {
    const cx = Math.round((i + 0.2 + rng() * 0.6) * (w / 5));
    islet(ctx, farTone, cx, FAR_HORIZON, randomInt(rng, 22, 46), randomInt(rng, 4, 8), rng);
  }
  for (let i = 0; i < 9; i++) {
    const x = Math.round((i + rng() * 0.8) * (w / 9));
    farMangrove(ctx, x, FAR_HORIZON, randomInt(rng, 26, 56), farTone, rng);
  }
  mistBand(ctx, look.fog, FAR_HORIZON - 30, w, 9, 0.06, rng);
  // Segunda fileira: mangues maiores e troncos secos
  for (let i = 0; i < 6; i++) {
    const x = Math.round((i + 0.1 + rng() * 0.8) * (w / 6));
    farMangrove(ctx, x, FAR_HORIZON + 1, randomInt(rng, 56, 104), midTone, rng);
  }
  for (let i = 0; i < 6; i++) {
    snag(ctx, randomInt(rng, 0, w), FAR_HORIZON, randomInt(rng, 46, 96), midTone, rng);
  }
  mistBand(ctx, look.fog, FAR_HORIZON - 16, w, 10, 0.07, rng);
  // Juncos na beira da água
  for (let x = 0; x < w; x += 5) {
    reed(
      ctx,
      x + randomInt(rng, 0, 3),
      FAR_HORIZON,
      randomInt(rng, 12, 30),
      nearTone,
      rng() < 0.2 ? 0x1f1812 : null,
    );
  }

  // Água escura que reflete o céu e a lua; as árvores deixam manchas escuras abaixo
  ditherGradientV(ctx, 0, FAR_HORIZON, w, h - FAR_HORIZON, [
    mix(look.skyLow, 0x000000, 0.55),
    mix(look.skyMid, 0x000000, 0.62),
    mix(look.skyTop, 0x000000, 0.2),
  ]);
  for (let i = 0; i < 20; i++) {
    rect(ctx, nearTone, randomInt(rng, 0, w), FAR_HORIZON, 3, randomInt(rng, 4, 14), 0.3);
  }
  for (let y = FAR_HORIZON + 2; y < h; y += 4) {
    for (let i = 0; i < 6; i++) {
      rect(
        ctx,
        mix(look.glowSoft, look.skyMid, 0.65),
        randomInt(rng, 0, w),
        y,
        randomInt(rng, 6, 22),
        1,
        0.3,
      );
    }
  }
  moonReflection(ctx, look, moonX, FAR_HORIZON, h, rng);
  // Névoa em camadas sobre a água
  for (let i = 0; i < 12; i++) {
    rect(ctx, look.fog, 0, FAR_HORIZON - 36 + i * 4, w, 4, 0.018 * (12 - i));
  }
  mistBand(ctx, look.fog, FAR_HORIZON + 2, w, 8, 0.05, rng);
  mistBand(ctx, look.fog, FAR_HORIZON + 14, w, 5, 0.035, rng);
  // Fogos-fátuos ao longe
  for (let i = 0; i < 16; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, 120, 190);
    disc(ctx, look.glow, x, y, 4, 0.07);
    rect(ctx, look.glow, x, y, 1, 1, 0.9);
  }
}

/** Cipó fino que pende, com folhinhas espaçadas. */
function vine(
  ctx: Ctx,
  color: number,
  leaf: number,
  x: number,
  y: number,
  length: number,
  rng: Rng,
): void {
  let cx = x;
  for (let j = 0; j < length; j++) {
    if (rng() < 0.2) cx += rng() < 0.5 ? -1 : 1;
    rect(ctx, color, cx, y + j, 1, 1);
    if (j % 7 === 3) rect(ctx, leaf, cx + (j % 2 === 0 ? 1 : -2), y + j, 2, 1);
  }
}

/** Musgo-barbudo: franja de fios que balançam, com as pontas mais claras. */
function hangingMoss(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  x: number,
  y: number,
  length: number,
  rng: Rng,
): void {
  const body = mix(look.moss, ramp.deep, 0.5);
  const tip = mix(look.mossLight, ramp.deep, 0.6);
  for (let strand = -1; strand <= 1; strand++) {
    const len = length - Math.abs(strand) * randomInt(rng, 3, 9);
    const phase = rng() * 6;
    for (let j = 0; j < len; j++) {
      const sx = x + strand + Math.round(Math.sin(j / 6 + phase) * 1.5);
      rect(ctx, j > len - 5 || j % 6 === 0 ? tip : body, sx, y + j, 1, 1, j > len - 4 ? 0.5 : 0.85);
    }
  }
}

/** Moita de folhas escuras na ponta de um galho. */
function leafClump(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  x: number,
  y: number,
  size: number,
  rng: Rng,
): void {
  const leaf = mix(ramp.dark, look.moss, 0.22);
  for (let i = 0; i < 2 + size; i++) {
    const spread = 4 + size * 3;
    disc(
      ctx,
      leaf,
      x + randomInt(rng, -spread, spread + 1),
      y + randomInt(rng, -3 - size, 4),
      randomInt(rng, 3, 6 + size * 2),
    );
  }
  rect(ctx, ramp.deep, x - 4, y + 3, 9, 1, 0.6);
}

/** Galho torto que sobe, cai na ponta e carrega musgo, cipós e uma moita de folhas. */
function branch(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  bark: number,
  x: number,
  y: number,
  dir: number,
  length: number,
  size: number,
  rng: Rng,
): void {
  let bx = x;
  let by = y;
  for (let s = 0; s < length; s++) {
    bx += dir;
    if (s % 3 === 0) by += s < length * 0.6 ? -1 : 1;
    rect(ctx, bark, bx, by, 1, s < length / 2 ? 2 : 1);
    if (s % 7 === 4 && rng() < 0.6) {
      hangingMoss(ctx, look, ramp, bx, by + 1, randomInt(rng, 10, 36), rng);
    } else if (s % 9 === 5 && rng() < 0.5) {
      vine(
        ctx,
        mix(look.moss, ramp.deep, 0.55),
        mix(look.mossLight, ramp.deep, 0.6),
        bx,
        by + 1,
        randomInt(rng, 14, 44),
        rng,
      );
    }
  }
  if (rng() < 0.85) leafClump(ctx, look, ramp, bx, by, size, rng);
}

/**
 * Mangue torto: raízes aéreas arqueadas que mergulham na água, tronco que afina e se inclina,
 * galhos com musgo e cipós.
 */
function mangrove(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  bark: number,
  shade: number,
  x: number,
  water: number,
  height: number,
  rng: Rng,
): void {
  const rootTop = water - Math.round(height * 0.3);
  const rootCount = randomInt(rng, 4, 7);
  for (let i = 0; i < rootCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = 5 + Math.floor(i / 2) * 6 + randomInt(rng, 0, 4);
    const startY = rootTop + randomInt(rng, 0, 10);
    const midX = x + side * Math.round(reach * 0.85);
    const midY = startY + Math.round((water - startY) * 0.4);
    const endX = x + side * reach;
    line(ctx, shade, x + 1, startY, midX + 1, midY);
    line(ctx, shade, midX + 1, midY, endX + 1, water + 3);
    line(ctx, bark, x, startY, midX, midY);
    line(ctx, bark, midX, midY, endX, water + 3);
  }
  // Tronco que afina e se inclina; guarda onde ficam os galhos
  const lean = rng() < 0.5 ? -1 : 1;
  const anchors: { x: number; y: number }[] = [];
  const marks = [0.5, 0.7, 0.88];
  let cx = x;
  for (let s = 0; s < height; s++) {
    if (s % 7 === 0) cx += rng() < 0.62 ? lean : -lean;
    const t = s / height;
    const width = Math.max(2, Math.round((1 - t * 0.65) * (3 + height / 28)));
    const left = cx - Math.floor(width / 2);
    rect(ctx, bark, left, water - s, width, 1);
    rect(ctx, shade, left + width - 1, water - s, 1, 1);
    rect(ctx, ramp.light, left, water - s, 1, 1, 0.4);
    for (const mark of marks) {
      if (s === Math.round(height * mark)) anchors.push({ x: cx, y: water - s });
    }
  }
  anchors.push({ x: cx, y: water - height });
  anchors.forEach((a, i) => {
    const dir = (i + (lean > 0 ? 0 : 1)) % 2 === 0 ? 1 : -1;
    const top = i === anchors.length - 1;
    branch(ctx, look, ramp, bark, a.x, a.y, dir, randomInt(rng, 16, 32), top ? 2 : 0, rng);
    if (top) leafClump(ctx, look, ramp, a.x, a.y, 2, rng); // copa do alto
  });
}

/** Pequeno anel de ondulação na água: dois traços e um traço menor logo abaixo. */
function ripple(ctx: Ctx, color: number, cx: number, y: number, half: number, alpha: number): void {
  const gap = Math.max(1, Math.round(half * 0.25));
  rect(ctx, color, cx - half, y, half - gap, 1, alpha);
  rect(ctx, color, cx + gap, y, half - gap, 1, alpha);
  rect(ctx, color, cx - Math.round(half * 0.5), y + 1, Math.round(half), 1, alpha * 0.7);
}

/** Nenúfar visto de lado: duas fileiras achatadas, com um entalhe. */
function lilyPad(ctx: Ctx, pad: number, rim: number, x: number, y: number): void {
  rect(ctx, pad, x, y, 5, 1);
  rect(ctx, rim, x + 1, y - 1, 3, 1, 0.7);
  rect(ctx, 0x000000, x + 3, y, 1, 1, 0.5);
}

/** Costelas e crânio de algo que não saiu do pântano, caídos na lama. */
function bones(ctx: Ctx, color: number, x: number, y: number): void {
  rect(ctx, color, x, y - 1, 9, 1); // coluna
  for (const rx of [1, 3, 5]) {
    rect(ctx, color, x + rx, y - 4, 1, 3);
    rect(ctx, color, x + rx + 1, y - 4, 1, 1);
  }
  rect(ctx, color, x + 11, y - 3, 4, 3); // crânio
  rect(ctx, 0x000000, x + 12, y - 2, 1, 1, 0.8);
  rect(ctx, 0x000000, x + 14, y - 2, 1, 1, 0.8);
}

/** Barco virado de quilha para cima, meio afundado e inclinado, com uma tábua faltando. */
function overturnedBoat(
  ctx: Ctx,
  ramp: StoneRamp,
  x: number,
  water: number,
  length: number,
  tilt: number,
  rng: Rng,
): void {
  const half = Math.round(length / 2);
  for (let dx = -half; dx <= half; dx++) {
    const u = dx / half;
    const hgt = Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * length * 0.22);
    const top = water - hgt + Math.round(dx * tilt);
    rect(ctx, ramp.base, x + dx, top, 1, hgt + 1);
    rect(ctx, ramp.light, x + dx, top, 1, 1, 0.45); // quilha
    if (dx % 5 === 0) rect(ctx, ramp.deep, x + dx, top + 1, 1, hgt);
  }
  const gx = x + randomInt(rng, -half + 4, half - 6);
  rect(ctx, ramp.deep, gx, water - 3, 3, 3); // tábua que falta
  line(ctx, ramp.dark, x + half, water - 2, x + half + 8, water - 9); // remo caído
}

/** Palafita em ruína: cabana de tábuas sobre estacas tortas, com buracos no telhado e na parede. */
function stiltHut(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  x: number,
  deck: number,
  water: number,
  width: number,
  lit: boolean,
  layerWidth: number,
  rng: Rng,
): void {
  const height = randomInt(rng, 22, 30);
  // Estacas inclinadas, com travessas que nem sempre sobreviveram
  const step = Math.floor((width - 6) / 3);
  for (let s = 0; s < 4; s++) {
    const px = x + 2 + s * step;
    const lean = randomInt(rng, -1, 2);
    line(ctx, ramp.dark, px, deck, px + lean, water + 5);
    line(ctx, ramp.dark, px + 1, deck, px + 1 + lean, water + 5);
    rect(ctx, ramp.deep, px - 1, water, 4, 1, 0.7); // linha d'água na estaca
    if (s < 3 && rng() < 0.6) line(ctx, ramp.dark, px, deck + 6, px + step, water - 3);
  }
  // Escada de corda que ainda pende
  const ladderX = x + width + 1;
  rect(ctx, mix(ramp.light, ramp.base, 0.5), ladderX, deck, 1, water - deck - 2, 0.7);
  rect(ctx, mix(ramp.light, ramp.base, 0.5), ladderX + 3, deck, 1, water - deck - 6, 0.7);
  for (let y = deck + 3; y < water - 6; y += 4) {
    rect(ctx, mix(ramp.light, ramp.base, 0.5), ladderX, y, 4, 1, 0.7);
  }
  // Paredes de tábuas: algumas quebradas no alto, outras caídas
  for (let c = 0; c < width; c += 4) {
    if (rng() < 0.1) continue;
    const top = deck - height + (rng() < 0.25 ? randomInt(rng, 2, 7) : 0);
    rect(ctx, ramp.base, x + c, top, 3, deck - 2 - top);
    rect(ctx, ramp.dark, x + c + 3, top, 1, deck - 2 - top);
  }
  rect(ctx, ramp.dark, x, deck - 12, width, 1);
  // Deque de tábuas com falhas
  rect(ctx, ramp.deep, x - 4, deck + 1, width + 8, 1);
  for (let px = x - 4; px < x + width + 4; px += 5) {
    if (rng() < 0.1) continue;
    rect(ctx, ramp.dark, px, deck - 2, 4, 3);
    rect(ctx, ramp.light, px, deck - 2, 4, 1, 0.5);
  }
  // Telhado de palha de duas águas, ralo e com um buraco
  const roofW = width + 6;
  const apex = deck - height - 9;
  const holeAt = randomInt(rng, 6, roofW - 12);
  const thatch = mix(ramp.light, look.moss, 0.25);
  for (let c = 0; c < roofW; c++) {
    const u = Math.abs(c - roofW / 2) / (roofW / 2);
    const top = apex + Math.round(u * 9) + (rng() < 0.18 ? randomInt(rng, 1, 4) : 0);
    if (c >= holeAt && c < holeAt + 6) {
      rect(ctx, ramp.dark, x - 3 + c, top, 1, 2); // só as ripas
      continue;
    }
    rect(ctx, thatch, x - 3 + c, top, 1, apex + 11 - top);
    rect(ctx, ramp.deep, x - 3 + c, top, 1, 1);
    if ((c + top) % 5 === 0) rect(ctx, ramp.deep, x - 3 + c, top + 3, 1, 1, 0.6);
  }
  // Janela: acesa por dentro ou só um vazio escuro
  const wx = x + 6 + randomInt(rng, 0, Math.max(1, width - 20));
  const wy = deck - height + 6;
  rect(ctx, ramp.deep, wx, wy, 7, 8);
  if (lit) {
    const a = edgeAlpha(wx + 3, layerWidth, 1);
    rect(ctx, look.glowSoft, wx + 1, wy + 1, 5, 6, 0.8 * a);
    rect(ctx, look.glow, wx + 2, wy + 2, 3, 3, 0.9 * a);
    disc(ctx, look.glow, wx + 3, wy + 4, 14, 0.06 * a);
    // Reflexo trêmulo da luz na água
    for (let i = 0; i < 5; i++) {
      rect(
        ctx,
        look.glow,
        wx + 2 + randomInt(rng, -1, 2),
        water + 3 + i * 3,
        3 - (i > 2 ? 1 : 0),
        1,
        0.3 * a,
      );
    }
  }
}

/** Passarela de tábuas entre duas palafitas: estacas, corda frouxa e tábuas que faltam. */
function boardwalk(
  ctx: Ctx,
  ramp: StoneRamp,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  water: number,
  rng: Rng,
): void {
  const span = x1 - x0;
  if (span < 8) return;
  const deckAt = (x: number): number => Math.round(y0 + ((y1 - y0) * (x - x0)) / span);
  for (let x = x0; x < x1; x++) rect(ctx, ramp.deep, x, deckAt(x) + 1, 1, 1); // viga sob as tábuas
  for (let x = x0; x < x1; x += 5) {
    if (rng() < 0.14) continue; // tábua que falta
    const y = deckAt(x);
    rect(ctx, ramp.dark, x, y - 1, 4, 2);
    rect(ctx, ramp.light, x, y - 1, 4, 1, 0.4);
  }
  let prevX = -1;
  let prevY = 0;
  for (let x = x0 + 10; x < x1 - 4; x += 28) {
    const y = deckAt(x);
    const lean = randomInt(rng, -1, 2);
    line(ctx, ramp.dark, x, y + 1, x + lean, water + 4);
    line(ctx, ramp.dark, x + 1, y + 1, x + 1 + lean, water + 4);
    rect(ctx, ramp.deep, x - 1, y + 1, 4, 1);
    rect(ctx, ramp.dark, x, y - 9, 1, 8); // poste do corrimão
    // Corda frouxa entre dois postes; alguns vãos já arrebentaram
    if (prevX >= 0 && rng() < 0.7) {
      for (let rx = prevX; rx <= x; rx++) {
        const t = (rx - prevX) / (x - prevX);
        const ry = Math.round(prevY + (y - prevY) * t - 8 + Math.sin(t * Math.PI) * 3);
        rect(ctx, ramp.dark, rx, ry, 1, 1, 0.85);
      }
    }
    prevX = x;
    prevY = y;
  }
}

/** Lanterna fraca num poste: braço, caixa escura e uma chama azulada que quase não ilumina. */
function lantern(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  x: number,
  deck: number,
  layerWidth: number,
): void {
  const top = deck - 22;
  rect(ctx, ramp.dark, x, top, 1, 22);
  rect(ctx, ramp.dark, x, top, 5, 1);
  rect(ctx, ramp.dark, x + 4, top + 1, 1, 2);
  rect(ctx, ramp.light, x + 3, top + 3, 3, 1, 0.8);
  rect(ctx, ramp.deep, x + 3, top + 4, 3, 4);
  const a = edgeAlpha(x, layerWidth, 1);
  rect(ctx, look.glow, x + 4, top + 5, 1, 2, 0.9 * a);
  disc(ctx, look.glow, x + 4, top + 5, 12, 0.07 * a);
  disc(ctx, look.glow, x + 4, top + 5, 5, 0.08 * a);
}

export function midPantano(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  const water = h - MID_WATER_DEPTH;
  const deck = h - 70;
  const rippleColor = mix(look.glowSoft, 0xffffff, 0.2);

  // Água rasa, mais escura em baixo, com a linha da superfície quebrada em trechos
  for (let y = water; y < h; y += 2) {
    const t = (y - water) / (h - water);
    rect(
      ctx,
      mix(mix(look.skyMid, 0x000000, 0.5), mix(look.skyMid, 0x000000, 0.8), t),
      0,
      y,
      w,
      2,
      0.82,
    );
  }
  for (let x = 0; x < w; x += randomInt(rng, 14, 40)) {
    rect(ctx, mix(look.glowSoft, ramp.deep, 0.7), x, water, randomInt(rng, 8, 26), 1, 0.45);
  }

  // Mangues do fundo: mais escuros, atrás das cabanas
  for (const f of [0.16, 0.5, 0.78]) {
    const x = Math.round(w * f) + randomInt(rng, -25, 26);
    mangrove(ctx, look, ramp, ramp.dark, ramp.deep, x, water, randomInt(rng, 120, 170), rng);
  }

  // Três palafitas em ruína ligadas por passarelas; a do meio está apagada e desabada
  const huts = [
    { x: 20 + randomInt(rng, 0, 12), width: randomInt(rng, 40, 50), lit: true },
    { x: 226 + randomInt(rng, 0, 14), width: randomInt(rng, 38, 46), lit: false },
    { x: 414 + randomInt(rng, 0, 12), width: randomInt(rng, 40, 50), lit: true },
  ];
  const decks = huts.map(() => deck + randomInt(rng, -4, 5));
  huts.forEach((hut, i) => {
    stiltHut(ctx, look, ramp, hut.x, decks[i] ?? deck, water, hut.width, hut.lit, w, rng);
  });
  const [h0, h1, h2] = huts;
  const [d0, d1, d2] = [decks[0] ?? deck, decks[1] ?? deck, decks[2] ?? deck];
  if (h0 && h1) boardwalk(ctx, ramp, h0.x + h0.width + 4, d0, h1.x - 4, d1, water, rng);
  if (h1 && h2) boardwalk(ctx, ramp, h1.x + h1.width + 4, d1, h2.x - 4, d2, water, rng);
  if (h2) boardwalk(ctx, ramp, h2.x + h2.width + 4, d2, w - 30, d2 + 5, water, rng);
  if (h0) lantern(ctx, look, ramp, h0.x + h0.width + 16, d0, w);
  if (h2) lantern(ctx, look, ramp, h2.x - 22, d2, w);

  // Mangues da frente: raízes aéreas e galhos cobertos de musgo e cipós
  for (const f of [0.34, 0.66, 0.94]) {
    const x = Math.round(w * f) + randomInt(rng, -15, 16);
    mangrove(ctx, look, ramp, ramp.base, ramp.dark, x, water, randomInt(rng, 100, 150), rng);
  }
  // Cipós longos que descem do alto da vista
  for (let i = 0; i < 9; i++) {
    vine(
      ctx,
      mix(look.moss, ramp.deep, 0.55),
      mix(look.mossLight, ramp.deep, 0.6),
      randomInt(rng, 0, w),
      0,
      randomInt(rng, 30, 90),
      rng,
    );
  }

  // Bancos de lama com ossos e barcos virados
  for (const [bx, boat] of [
    [132, true],
    [346, false],
  ] as const) {
    for (let dx = -14; dx <= 14; dx++) {
      const hgt = Math.round(Math.sqrt(Math.max(0, 1 - (dx / 14) ** 2)) * 4);
      rect(ctx, ramp.dark, bx + dx, water - hgt, 1, hgt + 1);
    }
    bones(ctx, mix(0x9aa39a, ramp.deep, 0.62), bx - 8, water - 3);
    if (boat) overturnedBoat(ctx, ramp, bx + 40, water, 34, 0.12, rng);
  }
  overturnedBoat(ctx, ramp, w - 44, water + 1, 30, -0.1, rng);

  // Juncos de alturas variadas na beira da água, duas camadas de tom
  for (let i = 0; i < 11; i++) {
    const cx = randomInt(rng, 0, w);
    for (let j = 0; j < randomInt(rng, 3, 8); j++) {
      reed(
        ctx,
        cx + randomInt(rng, -9, 10),
        water + 1,
        randomInt(rng, 14, 48),
        i % 2 === 0 ? ramp.dark : ramp.base,
        rng() < 0.35 ? 0x1a1008 : null,
      );
    }
  }

  // Nenúfares, folhas flutuando e ondulações
  const pad = mix(look.moss, ramp.deep, 0.45);
  const rim = mix(look.mossLight, ramp.deep, 0.55);
  for (let i = 0; i < 8; i++) {
    const cx = randomInt(rng, 6, w - 6);
    for (let j = 0; j < randomInt(rng, 3, 7); j++) {
      lilyPad(ctx, pad, rim, cx + randomInt(rng, -16, 17), water + randomInt(rng, 2, 13));
    }
    if (rng() < 0.35)
      rect(ctx, mix(look.glowSoft, 0xffffff, 0.3), cx, water + 1, 1, 1, edgeAlpha(cx, w, 0.7));
  }
  for (let i = 0; i < 10; i++) {
    rect(
      ctx,
      mix(0x5a4a30, ramp.deep, 0.4),
      randomInt(rng, 0, w),
      water + randomInt(rng, 2, 16),
      3,
      1,
      0.8,
    );
  }
  for (let i = 0; i < 14; i++) {
    ripple(
      ctx,
      rippleColor,
      randomInt(rng, 6, w - 6),
      water + randomInt(rng, 3, 30),
      randomInt(rng, 3, 9),
      0.2,
    );
  }

  // Bruma rasteira (leve, para o meio não ficar mais claro que as plataformas)
  for (let i = 0; i < 14; i++) rect(ctx, look.fog, 0, water - 40 + i * 3, w, 3, 0.006 * i);
  // Fogos-fátuos: mais fracos perto do centro
  for (let i = 0; i < 7; i++) {
    const x = randomInt(rng, 10, w - 10);
    const y = randomInt(rng, 110, 215);
    disc(ctx, look.glow, x, y, 5, edgeAlpha(x, w, 0.08));
    rect(ctx, look.glow, x, y, 1, 1, edgeAlpha(x, w, 0.9));
  }
}

/** Folha larga e escura que arqueia: lâmina cheia, mais grossa no meio, com a nervura clara. */
function broadLeaf(
  ctx: Ctx,
  color: number,
  rib: number,
  ox: number,
  oy: number,
  dir: number,
  angle: number,
  length: number,
  widest: number,
): void {
  for (let s = 0; s < length; s++) {
    const px = Math.round(ox + dir * Math.cos(angle) * s);
    const py = Math.round(oy + Math.sin(angle) * s + (s * s) / (length * 2.2));
    const thick = Math.max(2, Math.round(Math.sin(Math.PI * (s / length) ** 0.8) * widest));
    rect(ctx, color, px, py - Math.round(thick * 0.35), 2, thick);
    if (s % 5 === 0 && s > 4) rect(ctx, color, px + dir * 2, py + Math.round(thick * 0.65), 1, 3); // ponta serrilhada
    rect(ctx, rib, px, py, 1, 1, 0.55);
  }
}

/** Cipó grosso que desce do alto, afinando; devolve onde termina para os pingos. */
function thickVine(
  ctx: Ctx,
  color: number,
  leaf: number,
  x: number,
  length: number,
  rng: Rng,
): { x: number; y: number } {
  let cx = x;
  for (let j = 0; j < length; j++) {
    if (j % 6 === 0 && rng() < 0.5) cx += rng() < 0.5 ? -1 : 1;
    const width = j < length * 0.5 ? 4 : j < length * 0.8 ? 3 : 2;
    rect(ctx, color, cx, j, width, 1);
    rect(ctx, leaf, cx, j, 1, 1, 0.35);
    if (j % 11 === 6) rect(ctx, leaf, cx + (j % 2 === 0 ? width : -3), j, 3, 2, 0.8);
  }
  return { x: cx, y: length };
}

/** Taboa: haste reta e alta com a espiga marrom e uma pontinha no alto. */
function cattail(
  ctx: Ctx,
  color: number,
  head: number,
  x: number,
  base: number,
  height: number,
): void {
  const bend = x % 2 === 0 ? 3 : -3;
  blade(ctx, color, x, base, height, bend, 2);
  const hx = x + bend;
  rect(ctx, head, hx - 1, base - height - 8, 4, 11);
  rect(ctx, color, hx, base - height - 12, 2, 4);
  rect(ctx, mix(head, 0x6a4a30, 0.35), hx - 1, base - height - 8, 1, 11, 0.7);
}

export function nearPantano(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.45);
  const leaf = mix(look.moss, 0x000000, 0.8);
  const rib = mix(look.moss, 0x000000, 0.5);
  const zone = 110;

  // Folhagem grande nos cantos de cima: folhas largas que arqueiam para o meio e para baixo
  for (const side of [1, -1] as const) {
    const ox = side > 0 ? -8 : w + 8;
    for (let i = 0; i < 7; i++) {
      broadLeaf(
        ctx,
        i % 2 === 0 ? dark : leaf,
        rib,
        ox + side * randomInt(rng, 0, 30),
        randomInt(rng, -8, 14),
        side,
        0.05 + i * 0.17 + rng() * 0.1,
        randomInt(rng, 56, 110),
        randomInt(rng, 9, 16),
      );
    }
  }

  // Cipós grossos descendo, com pingos que caem das pontas
  const drip = mix(look.glowSoft, 0xffffff, 0.4);
  for (const side of [1, -1] as const) {
    for (let i = 0; i < 4; i++) {
      const vx = side > 0 ? randomInt(rng, 4, zone) : w - randomInt(rng, 8, zone + 4);
      const tip = thickVine(ctx, dark, rib, vx, randomInt(rng, 50, 150), rng);
      if (i % 2 === 0) {
        rect(ctx, drip, tip.x + 1, tip.y + 5, 1, 2, 0.4);
        rect(ctx, drip, tip.x + 1, tip.y + 14, 1, 2, 0.28);
      }
    }
    for (let i = 0; i < 6; i++) {
      const vx = side > 0 ? randomInt(rng, 0, zone) : w - randomInt(rng, 0, zone);
      let cx = vx;
      const len = randomInt(rng, 18, 70);
      for (let j = 0; j < len; j++) {
        if (rng() < 0.25) cx += rng() < 0.5 ? -1 : 1;
        rect(ctx, leaf, cx, j, 1, 1, 0.95);
      }
    }
  }

  // Capim alto e taboas nos cantos de baixo; mais altos rente à borda e baixando para dentro
  for (const side of [1, -1] as const) {
    for (let i = 0; i < 9; i++) {
      const dist = randomInt(rng, 0, zone);
      const x = side > 0 ? dist - 6 : w - dist + 6;
      const scale = 0.45 + 0.55 * (1 - dist / zone);
      const height = Math.round(randomInt(rng, 48, 142) * scale);
      cattail(ctx, i % 3 === 0 ? leaf : dark, 0x1a1008, x, h - 2, height);
    }
    for (let dist = 0; dist < zone; dist += 3) {
      const x = side > 0 ? dist - 6 : w - dist + 6;
      const scale = 0.4 + 0.6 * (1 - dist / zone);
      blade(
        ctx,
        rng() < 0.3 ? leaf : dark,
        x + randomInt(rng, 0, 2),
        h - 2,
        Math.round(randomInt(rng, 26, 96) * scale),
        randomInt(rng, -9, 10),
        2,
      );
    }
    // Massa de folhas rente ao chão
    for (let i = 0; i < 8; i++) {
      const cx = side > 0 ? randomInt(rng, -8, 70) : w - randomInt(rng, -8, 70);
      disc(ctx, dark, cx, h + 2, randomInt(rng, 8, 16));
    }
  }

  // Vaga-lumes e esporos fracos nas bordas, longe do meio
  for (let i = 0; i < 14; i++) {
    const x = rng() < 0.5 ? randomInt(rng, 0, 150) : w - randomInt(rng, 0, 150);
    const y = randomInt(rng, 30, 232);
    const color = i % 3 === 0 ? look.mossLight : look.glow;
    disc(ctx, color, x, y, 3, 0.08);
    rect(ctx, color, x, y, 1, 1, 0.85);
  }
  for (let i = 0; i < 10; i++) {
    const x = rng() < 0.5 ? randomInt(rng, 0, 190) : w - randomInt(rng, 0, 190);
    rect(ctx, mix(look.mossLight, 0xffffff, 0.3), x, randomInt(rng, 20, 240), 1, 1, 0.3);
  }
  // Bolhas subindo perto do chão
  for (let i = 0; i < 12; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, h - 90, h - 14);
    rect(ctx, mix(look.glowSoft, 0xffffff, 0.3), x, y, 2, 2, 0.3);
    rect(ctx, 0xffffff, x, y, 1, 1, 0.5);
  }
}
