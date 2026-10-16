import type { BiomeLook, StoneRamp } from '../data/biomeLook';
import { randomInt, type Rng } from '../utils/rng';
import { disc, ditherGradientV, line, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo da Vila Queimada, em pixel art: distante (céu de fumaça avermelhado pelo
 * incêndio, colunas de fumaça, casas e uma igreja de torre quebrada em silhueta, com janelas em
 * brasa), médio (esqueletos de casas com as vigas à mostra, janelas vazias, chamas ainda vivas,
 * cercas e carroças) e primeiro plano (postes chamuscados, fumaça, cinzas e brasas no ar). As
 * cores vêm de BiomeLook.
 */

const FIRE = 0xff7a2a;
const FIRE_HOT = 0xffc04a;
const FIRE_DEEP = 0xb8381a;

/** Chama que sobe: três línguas de altura diferente sobre uma base de brasa. */
function flames(ctx: Ctx, rng: Rng, x: number, base: number, size: number): void {
  disc(ctx, FIRE, x, base - size / 2, size * 1.6, 0.08);
  for (let i = -1; i <= 1; i++) {
    const h = Math.round(size * (0.6 + rng() * 0.6));
    const fx = x + i * 3;
    rect(ctx, FIRE_DEEP, fx - 1, base - h, 4, h, 0.9);
    rect(ctx, FIRE, fx, base - h - 1, 2, h, 0.95);
    rect(ctx, FIRE_HOT, fx, base - Math.round(h * 0.6), 1, Math.round(h * 0.5));
  }
}

/** Casa em silhueta: paredes, telhado de duas águas, chaminé e uma janela acesa pelo fogo. */
function houseSilhouette(
  ctx: Ctx,
  look: BiomeLook,
  rng: Rng,
  x: number,
  base: number,
  width: number,
  height: number,
  color: number,
): void {
  rect(ctx, color, x, base - height, width, height);
  const roof = Math.round(width / 2);
  for (let r = 0; r < roof; r++) {
    // Telhado de duas águas, com falhas onde as telhas queimaram
    if (rng() < 0.9) rect(ctx, color, x - 2 + r, base - height - r * 0.7 - 1, width + 4 - r * 2, 2);
  }
  rect(ctx, color, x + width - 8, base - height - roof * 0.7 - 6, 4, 8); // chaminé
  const wx = x + Math.floor(width / 2) - 2;
  rect(ctx, look.glow, wx, base - height + 6, 4, 5, 0.8);
  disc(ctx, look.glow, wx + 2, base - height + 8, 10, 0.07);
}

export function farVila(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, look.skyLow, look.skyMid]);
  const horizon = 205;
  // O clarão do incêndio no horizonte e a lua escondida pela fumaça
  disc(ctx, look.skyLow, Math.round(w * 0.5), horizon, 120, 0.2);
  disc(ctx, FIRE, Math.round(w * 0.5), horizon, 60, 0.08);
  disc(ctx, mix(look.fog, look.skyLow, 0.4), Math.round(w * 0.78), 70, 18, 0.35);
  // Colunas de fumaça que sobem das casas e se espalham no alto
  for (let i = 0; i < 6; i++) {
    const x = randomInt(rng, 0, w);
    for (let y = horizon; y > 10; y -= 3) {
      const t = (horizon - y) / horizon;
      const drift = Math.round(Math.sin(y / 18 + i) * (4 + t * 10) + t * 30);
      rect(
        ctx,
        mix(look.fog, look.skyMid, 0.5),
        x + drift,
        y,
        4 + Math.round(t * 18),
        3,
        0.1 + 0.06 * (1 - t),
      );
    }
  }
  // Casas e uma igreja de torre quebrada, em silhueta
  const color = mix(look.skyLow, look.back.deep, 0.84);
  const churchX = Math.round(w * 0.3);
  rect(ctx, color, churchX, horizon - 70, 14, 70);
  for (let i = 0; i < 14; i += 3) rect(ctx, color, churchX + i, horizon - 74, 2, 4);
  rect(ctx, color, churchX - 22, horizon - 34, 22, 34);
  rect(ctx, color, churchX + 14, horizon - 40, 30, 40);
  rect(ctx, look.glow, churchX + 5, horizon - 56, 3, 7, 0.7);
  let x = -10;
  while (x < w) {
    const hw = randomInt(rng, 22, 40);
    if (Math.abs(x - churchX) > 50) {
      houseSilhouette(ctx, look, rng, x, horizon + 4, hw, randomInt(rng, 22, 36), color);
      if (rng() < 0.35) flames(ctx, rng, x + hw / 2, horizon - 28, randomInt(rng, 8, 14));
    }
    x += hw + randomInt(rng, 4, 26);
  }
  // Chão chamuscado e névoa de fumaça
  rect(ctx, mix(look.skyLow, look.back.deep, 0.9), 0, horizon + 4, w, h - horizon);
  for (let i = 0; i < 24; i++)
    rect(ctx, look.fog, 0, horizon - 40 + i * 3, w, 3, 0.014 * (i / 3 + 1));
  // Brasas voando
  for (let i = 0; i < 40; i++) {
    rect(ctx, FIRE_HOT, randomInt(rng, 0, w), randomInt(rng, 40, 200), 1, 1, 0.3 + rng() * 0.5);
  }
}

/** Esqueleto de casa: duas paredes quebradas, janelas vazias e as vigas do telhado que sobraram. */
function burntHouse(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  rng: Rng,
  x: number,
  base: number,
  width: number,
): void {
  const height = randomInt(rng, 46, 66);
  const wall = (wx: number, ww: number, wh: number): void => {
    rect(ctx, ramp.base, wx, base - wh, ww, wh);
    rect(ctx, ramp.light, wx, base - wh, ww, 1);
    rect(ctx, ramp.dark, wx + ww - 2, base - wh, 2, wh);
    // Topo irregular onde a parede desabou
    for (let i = 0; i < ww; i += 2)
      rect(ctx, ramp.deep, wx + i, base - wh - (i % 4 === 0 ? 2 : 0), 2, 2);
  };
  wall(x, 10, height);
  wall(x + width - 10, 10, Math.round(height * 0.7));
  rect(ctx, ramp.dark, x + 10, base - 8, width - 20, 8); // restos do piso
  // Janelas vazias com o brilho do fogo atrás
  for (const wy of [height - 22, height - 40]) {
    if (wy > 6) {
      rect(ctx, ramp.deep, x + 3, base - wy, 4, 8);
      rect(ctx, look.glow, x + 4, base - wy + 2, 2, 5, 0.6);
    }
  }
  // Vigas do telhado: um triângulo de madeira queimada que sobrou no alto
  const wood = mix(ramp.dark, 0x3a2418, 0.5);
  const apex = base - height - 22;
  line(ctx, wood, x, base - height, x + Math.round(width / 2), apex);
  line(
    ctx,
    wood,
    x + Math.round(width / 2),
    apex,
    x + width - 4,
    base - Math.round(height * 0.7) - 4,
  );
  rect(ctx, wood, x + 4, base - height, Math.round(width / 2), 2);
  for (let i = 0; i < 4; i++)
    rect(
      ctx,
      FIRE_DEEP,
      x + randomInt(rng, 2, width - 6),
      base - height + randomInt(rng, -6, 4),
      1,
      2,
      0.8,
    );
  if (rng() < 0.5) flames(ctx, rng, x + Math.round(width / 2), base - 8, randomInt(rng, 8, 14));
}

export function midVila(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  const ground = h - 50;
  rect(ctx, mix(ramp.deep, ramp.dark, 0.5), 0, ground + 2, w, h - ground);
  // Casas queimadas ao longo da rua
  for (let x = -10; x < w; x += randomInt(rng, 110, 160)) {
    burntHouse(ctx, look, ramp, rng, x, ground + 4, randomInt(rng, 70, 100));
  }
  // Cerca de estacas quebradas e uma carroça tombada
  for (let x = 0; x < w; x += 7) {
    if (rng() < 0.45) rect(ctx, ramp.dark, x, ground - randomInt(rng, 4, 16), 2, 18);
  }
  for (let i = 0; i < 2; i++) {
    const x = randomInt(rng, 20, w - 60);
    rect(ctx, ramp.light, x, ground - 10, 28, 4);
    disc(ctx, ramp.light, x + 4, ground - 2, 5);
    disc(ctx, ramp.light, x + 24, ground - 2, 5);
    rect(ctx, ramp.dark, x + 28, ground - 14, 14, 2);
  }
  // Brasas pelo chão e fumaça rasteira
  for (let i = 0; i < 24; i++) {
    const x = randomInt(rng, 0, w);
    rect(ctx, FIRE, x, ground + randomInt(rng, 0, 10), 2, 1, 0.8);
    disc(ctx, FIRE, x, ground + 2, 6, 0.06);
  }
  for (let i = 0; i < 22; i++) rect(ctx, look.fog, 0, h - 90 + i * 3, w, 3, 0.014 * (i / 2));
}

export function nearVila(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.5);
  // Postes chamuscados nas duas bordas, tortos, com um pedaço de viga atravessada
  for (const [x, hh] of [
    [14, h - 20],
    [w - 30, h - 40],
  ] as const) {
    rect(ctx, dark, x, h - hh, 8, hh);
    rect(ctx, mix(dark, look.back.light, 0.25), x, h - hh, 1, hh, 0.8);
    rect(ctx, dark, x - 18, h - hh + 14, 44, 5);
    for (let i = 0; i < 5; i++)
      rect(
        ctx,
        FIRE_DEEP,
        x + randomInt(rng, 0, 7),
        h - hh + randomInt(rng, 0, hh - 10),
        1,
        2,
        0.7,
      );
  }
  // Mato queimado nos cantos de baixo
  for (let x = 0; x < w; x += 4) {
    if (x < 70 || x > w - 70) {
      const len = randomInt(rng, 6, 22);
      for (let y = 0; y < len; y++)
        rect(ctx, dark, x + Math.round(Math.sin(y / 4 + x) * 2), h - 2 - y, 1, 1);
    }
  }
  // Fumaça passando e cinzas no ar
  for (let i = 0; i < 6; i++) {
    const y = randomInt(rng, 20, h - 60);
    rect(ctx, look.fog, randomInt(rng, 0, w - 120), y, randomInt(rng, 60, 160), 5, 0.06);
  }
  for (let i = 0; i < 36; i++) {
    rect(ctx, look.mossLight, randomInt(rng, 0, w), randomInt(rng, 10, h - 10), 1, 1, 0.3);
  }
  for (let i = 0; i < 14; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, h - 120, h - 20);
    rect(ctx, FIRE_HOT, x, y, 1, 1, 0.9);
    disc(ctx, FIRE, x, y, 4, 0.07);
  }
}
