import type { BiomeLook, StoneRamp } from '../data/biomeLook';
import { randomInt, type Rng } from '../utils/rng';
import { disc, ditherGradientV, line, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo das Minas Desabadas, em pixel art: distante (a escuridão da rocha, galerias
 * escoradas que somem na névoa de poeira e brilhos de cristal), médio (escoras de madeira, trilhos,
 * lampiões âmbar e cristais nas paredes) e primeiro plano (rocha irregular nas bordas, estalactites e
 * poeira no ar). As cores vêm de BiomeLook.
 */

const CRYSTAL = 0x4ae0d0;
const CRYSTAL_SOFT = 0x1a7a78;

/** Escora: dois postes e uma viga por cima, com mãos-francesas, em silhueta. */
function timberFrame(
  ctx: Ctx,
  x: number,
  base: number,
  width: number,
  height: number,
  color: number,
  light: number,
): void {
  const post = Math.max(2, Math.round(width / 12));
  rect(ctx, color, x, base - height, post, height);
  rect(ctx, color, x + width - post, base - height, post, height);
  rect(ctx, color, x - post, base - height - post, width + post * 2, post);
  rect(ctx, light, x - post, base - height - post, width + post * 2, 1);
  // Mãos-francesas nos cantos de cima
  const brace = Math.round(width / 5);
  line(ctx, color, x + post, base - height + brace, x + post + brace, base - height);
  line(
    ctx,
    color,
    x + width - post,
    base - height + brace,
    x + width - post - brace,
    base - height,
  );
}

export function farMinas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, look.skyLow, look.skyMid]);
  const far = mix(look.skyLow, look.back.deep, 0.65);
  const nearer = mix(look.skyLow, look.back.deep, 0.82);
  // Galerias que se afastam, cada vez mais apagadas na poeira
  for (const [count, color, height, width, base] of [
    [6, far, 70, 46, 214],
    [5, nearer, 100, 62, 238],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const x = Math.round((i + rng() * 0.5) * (w / count));
      timberFrame(ctx, x, base, width, height, color, mix(color, look.glow, 0.15));
    }
    for (let i = 0; i < 10; i++) rect(ctx, look.fog, 0, base - 40 + i * 4, w, 4, 0.02 * (10 - i));
  }
  // Luzes distantes de lampiões e brilhos de cristal na rocha
  for (let i = 0; i < 12; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, 120, 210);
    disc(ctx, look.glow, x, y, 6, 0.05);
    rect(ctx, look.glow, x, y, 1, 1, 0.7);
  }
  for (let i = 0; i < 40; i++) {
    rect(ctx, CRYSTAL_SOFT, randomInt(rng, 0, w), randomInt(rng, 10, 200), 1, 1, 0.45);
  }
}

/** Cacho de cristais saindo da rocha: hastes inclinadas de pontas claras, com um brilho em volta. */
function crystalCluster(ctx: Ctx, rng: Rng, x: number, base: number, size: number): void {
  disc(ctx, CRYSTAL, x, base - size / 2, size, 0.07);
  for (let i = 0; i < 4; i++) {
    const lean = randomInt(rng, -3, 3);
    const height = Math.round(size * (0.5 + rng() * 0.6));
    for (let y = 0; y < height; y++) {
      const dx = Math.round((lean * y) / height);
      const w = Math.max(1, 3 - Math.floor((y / height) * 3));
      rect(ctx, y > height - 3 ? 0xc8fff8 : CRYSTAL, x + i * 2 - 3 + dx, base - y, w, 1, 0.9);
      rect(ctx, CRYSTAL_SOFT, x + i * 2 - 3 + dx + w - 1, base - y, 1, 1, 0.8);
    }
  }
}

/** Trilho em perspectiva simples: dormentes e duas linhas de ferro. */
function rails(ctx: Ctx, ramp: StoneRamp, y: number, w: number): void {
  rect(ctx, ramp.light, 0, y, w, 1);
  rect(ctx, ramp.dark, 0, y + 1, w, 1);
  rect(ctx, ramp.light, 0, y + 6, w, 1);
  for (let x = 4; x < w; x += 12) rect(ctx, ramp.dark, x, y - 1, 5, 9);
}

export function midMinas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  const floor = h - 40;
  // Parede de rocha ao fundo, com veios e rachaduras
  for (let i = 0; i < 90; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, 0, floor);
    rect(ctx, rng() < 0.5 ? ramp.dark : ramp.light, x, y, randomInt(rng, 3, 14), 1, 0.35);
  }
  for (let i = 0; i < 14; i++) {
    let x = randomInt(rng, 0, w);
    let y = randomInt(rng, 0, floor - 40);
    for (let s = 0; s < randomInt(rng, 16, 50); s++) {
      if (rng() < 0.4) x += rng() < 0.5 ? -1 : 1;
      y += 1;
      rect(ctx, ramp.deep, x, y, 1, 1, 0.8);
    }
  }
  // Trilhos no chão
  rails(ctx, ramp, floor + 8, w);
  // Escoras de madeira de tempos em tempos
  const wood = mix(ramp.base, 0x3a2a1a, 0.55);
  const woodLight = mix(wood, look.glow, 0.2);
  for (let x0 = -10; x0 < w; x0 += 138) {
    timberFrame(ctx, x0 + randomInt(rng, 0, 40), floor + 6, 90, 130, wood, woodLight);
  }
  // Cristais nas paredes
  for (let i = 0; i < 6; i++) {
    crystalCluster(
      ctx,
      rng,
      randomInt(rng, 10, w - 10),
      randomInt(rng, 100, floor + 4),
      randomInt(rng, 10, 20),
    );
  }
  // Lampiões pendurados nas vigas
  for (let i = 0; i < 6; i++) {
    const x = randomInt(rng, 12, w - 12);
    const y = randomInt(rng, 40, 100);
    rect(ctx, ramp.light, x, 0, 1, y);
    rect(ctx, ramp.light, x - 2, y, 5, 1);
    rect(ctx, look.glow, x - 1, y + 1, 3, 4, 0.95);
    disc(ctx, look.glow, x, y + 3, 24, 0.08);
  }
  for (let i = 0; i < 20; i++) rect(ctx, look.fog, 0, h - 90 + i * 3, w, 3, 0.012 * (i / 2));
}

export function nearMinas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.5);
  // Rocha irregular nas duas bordas, mais larga embaixo
  for (const side of [-1, 1] as const) {
    let width = randomInt(rng, 26, 40);
    for (let y = 0; y < h; y++) {
      width = Math.max(14, Math.min(60, width + randomInt(rng, -2, 2)));
      const grow = Math.round((y / h) ** 2 * 22);
      const x = side < 0 ? -4 : w - width - grow + 4;
      rect(ctx, dark, x, y, width + grow, 1);
      if (y % 6 === 0)
        rect(ctx, look.back.dark, x + (side < 0 ? width + grow - 3 : 0), y, 3, 1, 0.7);
    }
  }
  // Estalactites no alto
  for (let x = 0; x < w; x += 9) {
    if (rng() < 0.6) {
      const len = randomInt(rng, 8, 40);
      for (let j = 0; j < len; j++) {
        const half = Math.max(0, Math.round(3 - (j / len) * 3));
        rect(ctx, dark, x - half, j, half * 2 + 1, 1);
      }
    }
  }
  // Poeira e brilhos soltos no ar
  for (let i = 0; i < 30; i++) {
    rect(ctx, look.fog, randomInt(rng, 0, w), randomInt(rng, 20, h - 10), 1, 1, 0.25);
  }
  for (let i = 0; i < 6; i++) {
    const x = randomInt(rng, 20, w - 20);
    const y = randomInt(rng, h - 120, h - 30);
    rect(ctx, CRYSTAL, x, y, 1, 1, 0.7);
    disc(ctx, CRYSTAL, x, y, 4, 0.06);
  }
}
