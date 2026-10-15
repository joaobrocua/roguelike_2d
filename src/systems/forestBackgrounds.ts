import type { BiomeLook, StoneRamp } from '../data/biomeLook';
import { randomInt, type Rng } from '../utils/rng';
import { disc, ditherGradientV, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo da Floresta Apodrecida, em pixel art: distante (céu doente, sol
 * fraco e silhuetas de árvores mortas), médio (troncos grossos com raízes, musgo e buracos que
 * brilham) e primeiro plano (troncos escuros nas bordas, raízes e folhas penduradas). A rampa
 * de pedra do bioma (terra e casca) pinta as cascas; o musgo e os vaga-lumes vêm de BiomeLook.
 */

/** Copa de uma árvore morta: tronco fino e galhos que se ramificam, só em silhueta. */
function deadTree(
  ctx: Ctx,
  x: number,
  base: number,
  height: number,
  color: number,
  rng: Rng,
): void {
  const trunk = Math.max(2, Math.round(height / 22));
  rect(ctx, color, x, base - height, trunk, height);
  // Galhos: sobem em diagonais curtas dos dois lados, cada vez menores
  for (let i = 0; i < 5; i++) {
    const y = base - height + 4 + i * Math.round(height / 7);
    const side = i % 2 === 0 ? -1 : 1;
    const len = Math.max(5, Math.round(height / 4) - i * 2);
    let bx = x + (side > 0 ? trunk : 0);
    let by = y;
    for (let s = 0; s < len; s++) {
      bx += side;
      if (s % 2 === 0) by -= 1;
      rect(ctx, color, bx, by, 1, 1);
      if (s > 3 && s % 4 === 0 && rng() < 0.6) rect(ctx, color, bx, by - 2, 1, 2); // ramo fino
    }
  }
}

export function farFloresta(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, look.skyLow, look.skyMid]);
  // Sol doente por trás da névoa: um disco pálido com halos
  const sunX = Math.round(w * 0.64);
  const sunY = 96;
  disc(ctx, look.glowSoft, sunX, sunY, 46, 0.08);
  disc(ctx, look.glowSoft, sunX, sunY, 32, 0.12);
  disc(ctx, mix(look.glow, look.skyLow, 0.35), sunX, sunY, 17, 0.9);
  disc(ctx, mix(look.glow, 0xffffff, 0.25), sunX - 3, sunY - 3, 12, 0.55);
  // Fileiras de árvores mortas em silhueta: mais claras e baixas ao longe
  for (const [count, tone, hMin, hMax, baseY] of [
    [11, 0.55, 90, 130, 214],
    [9, 0.3, 120, 180, 238],
  ] as const) {
    const color = mix(look.skyLow, 0x000000, tone);
    for (let i = 0; i < count; i++) {
      const x = Math.round((i + rng() * 0.7) * (w / count));
      deadTree(ctx, x, baseY, randomInt(rng, hMin, hMax), color, rng);
    }
    for (let i = 0; i < 9; i++) rect(ctx, look.fog, 0, baseY - 24 + i * 3, w, 3, 0.02 * (9 - i));
  }
  // Vaga-lumes
  for (let i = 0; i < 26; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, 60, 230);
    rect(ctx, look.glow, x, y, 1, 1, 0.7);
    if (i % 4 === 0) disc(ctx, look.glow, x, y, 3, 0.06);
  }
}

/** Tronco largo com a base alargada em raízes, casca com sulcos, musgo e um buraco que brilha. */
function trunk(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  x: number,
  width: number,
  rng: Rng,
  h: number,
): void {
  const ground = h - 8;
  for (let y = 0; y < ground; y++) {
    const sway = Math.round(Math.sin(y / 38 + x) * 1.5);
    const flare = y > ground - 28 ? Math.round(((y - (ground - 28)) / 28) ** 2 * 12) : 0;
    rect(ctx, ramp.base, x + sway - flare, y, width + flare * 2, 1);
    rect(ctx, ramp.light, x + sway - flare, y, 2, 1, 0.8);
    rect(ctx, ramp.deep, x + sway + width + flare - 4, y, 4 + flare, 1, 0.8);
  }
  for (let i = 0; i < 9; i++) {
    const gx = x + 3 + Math.floor(rng() * (width - 6));
    const len = randomInt(rng, 20, 60);
    rect(ctx, ramp.dark, gx, randomInt(rng, 0, ground - len), 1, len); // sulcos da casca
  }
  for (let i = 0; i < 6; i++) {
    const my = randomInt(rng, 20, ground - 10);
    const mx = x + (rng() < 0.5 ? 0 : width - 5);
    rect(ctx, mix(look.moss, ramp.deep, 0.45), mx, my, randomInt(rng, 3, 5), randomInt(rng, 5, 14));
  }
  // Raízes que se espalham no chão
  for (const side of [-1, 1] as const) {
    let rx = side < 0 ? x - 8 : x + width + 8;
    let ry = ground - 6;
    for (let s = 0; s < 18; s++) {
      rx += side;
      if (s % 3 === 0) ry += 1;
      rect(ctx, ramp.dark, rx, ry, 1, 3 + Math.floor(s / 6));
    }
  }
  if (rng() < 0.7) {
    const hy = randomInt(rng, 70, 150);
    rect(ctx, ramp.deep, x + 4, hy, width - 9, 12); // buraco no tronco
    rect(ctx, look.glowSoft, x + 6, hy + 3, width - 13, 6, 0.55);
    rect(ctx, look.glow, x + 7, hy + 5, 2, 2, 0.9);
    rect(ctx, look.glow, x + width - 11, hy + 6, 2, 2, 0.8);
  }
}

export function midFloresta(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  const span = 112;
  for (let x0 = -20; x0 <= w; x0 += span) {
    const width = randomInt(rng, 22, 34);
    trunk(ctx, look, ramp, x0 + randomInt(rng, 0, 40), width, rng, h);
  }
  // Galhos grossos que cruzam o fundo e trepadeiras
  for (let i = 0; i < 4; i++) {
    const y = randomInt(rng, 24, 70);
    const x = randomInt(rng, 0, w - 120);
    const len = randomInt(rng, 70, 150);
    for (let s = 0; s < len; s++) {
      rect(
        ctx,
        ramp.dark,
        x + s,
        y + Math.round(Math.sin(s / 24 + i) * 4),
        1,
        3 + (s < 20 ? 2 : 0),
      );
    }
  }
  for (let i = 0; i < 16; i++) {
    const x = randomInt(rng, 0, w);
    const len = randomInt(rng, 24, 80);
    for (let j = 0; j < len; j++) {
      rect(
        ctx,
        j % 5 === 0 ? look.mossLight : look.moss,
        x + Math.round(Math.sin(j / 6 + i) * 2),
        j,
        1,
        1,
        0.8,
      );
    }
  }
  for (let i = 0; i < 18; i++) rect(ctx, look.fog, 0, h - 70 + i * 3, w, 3, 0.014 * (i / 2));
}

export function nearFloresta(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark: StoneRamp = {
    deep: 0x030201,
    dark: 0x080603,
    base: mix(look.back.deep, 0x000000, 0.35),
    light: mix(look.back.dark, 0x000000, 0.25),
    highlight: mix(look.back.base, 0x000000, 0.15),
  };
  // Troncos escuros nas duas bordas, com a base alargada
  for (const [px, pw] of [
    [-14, 50],
    [w - 40, 54],
  ] as const) {
    for (let y = 0; y < h; y++) {
      const flare = y > h - 36 ? Math.round(((y - (h - 36)) / 36) ** 2 * 14) : 0;
      rect(ctx, dark.base, px - flare, y, pw + flare * 2, 1);
      if (y % 7 === 0) rect(ctx, dark.light, px - flare + 6 + (y % 3) * 9, y, 1, 5, 0.6);
    }
    rect(ctx, dark.deep, px + pw - 6, 0, 6, h, 0.6);
  }
  // Folhagem caída do alto, raízes e cipós pendurados
  for (let x = 0; x < w; x += 6) {
    if (rng() < 0.55) {
      const len = randomInt(rng, 6, 18);
      rect(ctx, dark.deep, x, 0, 6, len);
      rect(ctx, mix(look.moss, 0x000000, 0.65), x + 1, len - 3, 3, 3);
    }
  }
  for (const x of [68, 96, w - 78, w - 116]) {
    let cx = x;
    const len = randomInt(rng, 30, 90);
    for (let i = 0; i < len; i++) {
      if (rng() < 0.3) cx += rng() < 0.5 ? -1 : 1;
      rect(ctx, dark.dark, cx, i, 2 + (i < 14 ? 1 : 0), 1);
      if (i % 9 === 4) rect(ctx, mix(look.moss, 0x000000, 0.55), cx + 2, i, 2, 2);
    }
  }
  // Cogumelos que brilham perto do chão
  for (const x of [30, 52, w - 52, w - 30]) {
    rect(ctx, dark.light, x, h - 12, 2, 6);
    disc(ctx, look.glowSoft, x + 1, h - 13, 4, 0.55);
    disc(ctx, look.glow, x + 1, h - 13, 2, 0.8);
    disc(ctx, look.glow, x + 1, h - 13, 9, 0.06);
  }
}
