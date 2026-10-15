import type { BiomeLook, StoneRamp } from '../data/biomeLook';
import { randomInt, type Rng } from '../utils/rng';
import { disc, ditherGradientV, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo do Pântano dos Afogados, em pixel art: distante (céu cinzento e carregado,
 * uma água escura que reflete a luz e silhuetas de juncos e troncos tortos), médio (palafitas e
 * árvores tortas, musgo pendurado, lanternas azuladas e fogos-fátuos) e primeiro plano (juncos
 * escuros nas bordas, musgo caindo e bolhas). As cores vêm de BiomeLook.
 */

/** Haste de junco: uma linha fina e curva, com a espiga (a "maçaneta") marrom no alto. */
function reed(
  ctx: Ctx,
  x: number,
  base: number,
  height: number,
  color: number,
  tuft: number,
): void {
  const bend = Math.round(height / 12) * (x % 2 === 0 ? 1 : -1);
  for (let y = 0; y < height; y++) {
    const dx = Math.round((y / height) ** 2 * bend);
    rect(ctx, color, x + dx, base - y, 1, 1);
  }
  rect(ctx, tuft, x + bend - 1, base - height - 5, 3, 6);
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

export function farPantano(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, look.skyLow, look.skyMid]);
  // Um sol apagado atrás das nuvens, sem borda definida
  disc(ctx, look.skyLow, Math.round(w * 0.3), 82, 40, 0.28);
  disc(ctx, mix(look.skyLow, 0xffffff, 0.3), Math.round(w * 0.3), 82, 20, 0.5);
  // Faixas de nuvem alongadas
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
  // Horizonte de juncos e troncos secos sobre a água
  const horizon = 196;
  for (let i = 0; i < 12; i++) {
    snag(
      ctx,
      randomInt(rng, 0, w),
      horizon,
      randomInt(rng, 46, 100),
      mix(look.skyLow, 0x000000, 0.7),
      rng,
    );
  }
  for (let x = 0; x < w; x += 5) {
    reed(
      ctx,
      x + randomInt(rng, 0, 3),
      horizon,
      randomInt(rng, 12, 30),
      mix(look.skyLow, 0x000000, 0.78),
      0x2a1f18,
    );
  }
  // Água escura com reflexos (traços claros que se repetem e somem)
  rect(ctx, mix(look.skyMid, 0x000000, 0.55), 0, horizon, w, h - horizon);
  for (let y = horizon + 2; y < h; y += 4) {
    for (let i = 0; i < 6; i++) {
      rect(
        ctx,
        mix(look.glowSoft, look.skyMid, 0.65),
        randomInt(rng, 0, w),
        y,
        randomInt(rng, 6, 22),
        1,
        0.35,
      );
    }
  }
  for (let i = 0; i < 12; i++) rect(ctx, look.fog, 0, horizon - 36 + i * 4, w, 4, 0.02 * (12 - i));
  // Fogos-fátuos ao longe
  for (let i = 0; i < 16; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, 120, 190);
    disc(ctx, look.glow, x, y, 4, 0.07);
    rect(ctx, look.glow, x, y, 1, 1, 0.9);
  }
}

/** Palafita: cabana de tábuas sobre estacas, com a janela acesa e uma escada de corda. */
function stiltHut(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  x: number,
  deck: number,
  rng: Rng,
): void {
  const width = randomInt(rng, 34, 52);
  const height = randomInt(rng, 22, 30);
  for (let s = 0; s < 4; s++)
    rect(ctx, ramp.dark, x + 3 + s * Math.floor((width - 8) / 3), deck, 3, 70); // estacas
  rect(ctx, ramp.dark, x - 4, deck - 2, width + 8, 4); // deque
  rect(ctx, ramp.light, x - 4, deck - 2, width + 8, 1);
  rect(ctx, ramp.base, x, deck - height, width, height - 2); // parede
  for (let t = 0; t < width; t += 4) rect(ctx, ramp.dark, x + t, deck - height, 1, height - 2);
  // Telhado de palha, de duas águas
  for (let r = 0; r < 9; r++) {
    rect(
      ctx,
      mix(ramp.light, look.moss, 0.25),
      x - 3 + r,
      deck - height - 9 + r,
      width + 6 - r * 2,
      1,
    );
    rect(ctx, ramp.deep, x - 3 + r, deck - height - 9 + r, 1, 1);
  }
  const wx = x + 6 + randomInt(rng, 0, Math.max(1, width - 20));
  rect(ctx, ramp.deep, wx, deck - height + 6, 7, 8); // janela
  rect(ctx, look.glowSoft, wx + 1, deck - height + 7, 5, 6, 0.8);
  rect(ctx, look.glow, wx + 2, deck - height + 8, 3, 3, 0.9);
  disc(ctx, look.glow, wx + 3, deck - height + 10, 14, 0.06);
}

export function midPantano(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  const deck = h - 70;
  // Água rasa por baixo das palafitas
  rect(ctx, mix(look.skyMid, 0x000000, 0.65), 0, h - 36, w, 36);
  for (let x0 = -10; x0 < w; x0 += 150) {
    if (rng() < 0.75) stiltHut(ctx, look, ramp, x0 + randomInt(rng, 0, 50), deck, rng);
  }
  // Árvores tortas e afogadas entre as cabanas
  for (let i = 0; i < 6; i++) {
    snag(ctx, randomInt(rng, 0, w), h - 28, randomInt(rng, 110, 180), ramp.base, rng);
  }
  // Musgo pendurado
  for (let i = 0; i < 22; i++) {
    const x = randomInt(rng, 0, w);
    const len = randomInt(rng, 24, 70);
    for (let j = 0; j < len; j++) {
      rect(
        ctx,
        j % 6 === 0 ? look.mossLight : look.moss,
        x + Math.round(Math.sin(j / 7 + i) * 2),
        j,
        1,
        1,
        0.7,
      );
    }
  }
  // Lanternas azuladas penduradas das palafitas
  for (let i = 0; i < 7; i++) {
    const x = randomInt(rng, 10, w - 10);
    const y = randomInt(rng, 60, 140);
    rect(ctx, ramp.light, x, y - 14, 1, 14);
    rect(ctx, ramp.light, x - 2, y, 5, 1);
    rect(ctx, look.glow, x - 1, y + 1, 3, 4, 0.9);
    disc(ctx, look.glow, x, y + 3, 16, 0.07);
  }
  for (let i = 0; i < 20; i++) rect(ctx, look.fog, 0, h - 80 + i * 3, w, 3, 0.014 * (i / 2));
}

export function nearPantano(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.45);
  // Moitas de junco e taboas escuras nos dois cantos
  for (const [from, to] of [
    [-6, 70],
    [w - 76, w + 6],
  ] as const) {
    for (let x = from; x < to; x += 3) {
      reed(ctx, x + randomInt(rng, 0, 2), h - 4, randomInt(rng, 70, 150), dark, 0x1a1008);
    }
  }
  // Musgo e raízes que descem do alto
  for (let x = 0; x < w; x += 7) {
    if (rng() < 0.5) {
      const len = randomInt(rng, 8, 34);
      for (let j = 0; j < len; j++) {
        rect(
          ctx,
          mix(look.moss, 0x000000, 0.7),
          x + Math.round(Math.sin(j / 5 + x) * 1.5),
          j,
          2,
          1,
          0.9,
        );
      }
    }
  }
  // Bolhas subindo perto do chão
  for (let i = 0; i < 18; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, h - 90, h - 14);
    rect(ctx, mix(look.glowSoft, 0xffffff, 0.3), x, y, 2, 2, 0.35);
    rect(ctx, 0xffffff, x, y, 1, 1, 0.55);
  }
}
