import type { BiomeLook, StoneRamp } from '../data/biomeLook';
import { randomInt, type Rng } from '../utils/rng';
import { disc, ditherGradientV, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo do Cemitério dos Caídos, em pixel art: distante (noite fria, lua baixa e
 * o castelo em ruínas sobre uma colina), médio (lápides, cruzes, cercas de ferro, um mausoléu e as
 * lanças do campo de batalha com estandartes rasgados) e primeiro plano (grama seca nas bordas,
 * galhos mortos pendurados e almas que brilham). As cores vêm de BiomeLook.
 */

/** Torre ou muralha do castelo distante: silhueta com ameias quebradas e uma janela acesa. */
function castlePiece(
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
  // Ameias, algumas quebradas
  for (let i = 0; i < width; i += 4) {
    if (rng() < 0.7) rect(ctx, color, x + i, base - height - 3, 2, 3);
  }
  // Rachadura que abre o topo
  if (rng() < 0.6)
    rect(ctx, mix(look.skyLow, look.skyMid, 0.5), x + width / 2, base - height - 3, 2, 8);
  // Janela estreita com uma luz fraca lá dentro
  if (width >= 10 && rng() < 0.8) {
    const wx = x + Math.floor(width / 2) - 1;
    const wy = base - height + 8 + randomInt(rng, 0, Math.max(1, height - 24));
    rect(ctx, look.glow, wx, wy, 2, 4, 0.55);
    disc(ctx, look.glow, wx + 1, wy + 2, 7, 0.05);
  }
}

/** Um tronco morto: haste torta com galhos secos que se abrem. */
function deadTree(
  ctx: Ctx,
  x: number,
  base: number,
  height: number,
  color: number,
  rng: Rng,
): void {
  let cx = x;
  const width = Math.max(2, Math.round(height / 20));
  for (let y = 0; y < height; y++) {
    if (y % 8 === 0) cx += rng() < 0.5 ? -1 : 1;
    rect(ctx, color, cx, base - y, width, 1);
  }
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    let bx = cx;
    let by = base - Math.round(height * (0.4 + i * 0.15));
    for (let s = 0; s < 10 - i * 2; s++) {
      bx += side;
      if (s % 2 === 1) by -= 1;
      rect(ctx, color, bx, by, 1, 1);
      if (s > 3 && s % 3 === 0) rect(ctx, color, bx, by - 2, 1, 2);
    }
  }
}

export function farCemiterio(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  ditherGradientV(ctx, 0, 0, w, h, [look.skyTop, look.skyMid, look.skyLow, look.skyMid]);
  // Estrelas frias
  for (let i = 0; i < 90; i++) {
    const y = randomInt(rng, 0, 150);
    rect(ctx, mix(look.fog, 0xffffff, 0.5), randomInt(rng, 0, w), y, 1, 1, 0.25 + rng() * 0.5);
  }
  // A lua baixa e grande, com halo e crateras
  const moonX = Math.round(w * 0.74);
  const moonY = 96;
  disc(ctx, look.fog, moonX, moonY, 52, 0.05);
  disc(ctx, look.fog, moonX, moonY, 36, 0.09);
  disc(ctx, mix(look.fog, 0xffffff, 0.55), moonX, moonY, 22, 0.95);
  disc(ctx, mix(look.fog, look.skyMid, 0.5), moonX - 6, moonY - 4, 5, 0.5);
  disc(ctx, mix(look.fog, look.skyMid, 0.5), moonX + 8, moonY + 6, 3, 0.45);
  // Nuvens finas cruzando a lua
  for (let i = 0; i < 7; i++) {
    rect(
      ctx,
      mix(look.skyMid, look.skyLow, 0.5),
      randomInt(rng, 0, w - 140),
      60 + i * 16,
      randomInt(rng, 50, 150),
      2,
      0.4,
    );
  }
  // Colina distante e o castelo em ruínas no alto dela
  const hillBase = 190;
  const hillColor = mix(look.skyLow, look.back.deep, 0.78);
  const castle = mix(look.skyLow, look.back.deep, 0.86);
  const castleX = Math.round(w * 0.22);
  for (let x = 0; x < w; x++) {
    const bump = Math.max(0, 1 - Math.abs(x - castleX - 40) / 130);
    const hillY =
      hillBase - Math.round(10 * Math.sin(x / 50) + 5 * Math.sin(x / 19 + 1) + bump * 26);
    rect(ctx, hillColor, x, hillY, 1, h - hillY);
  }
  const keepBase = hillBase - 26;
  castlePiece(ctx, look, rng, castleX, keepBase, 20, 70, castle);
  castlePiece(ctx, look, rng, castleX + 22, keepBase, 34, 44, castle);
  castlePiece(ctx, look, rng, castleX + 58, keepBase, 14, 58, castle);
  castlePiece(ctx, look, rng, castleX + 74, keepBase, 24, 32, castle);
  // Árvores mortas em silhueta na colina e névoa baixa
  for (let i = 0; i < 9; i++) {
    deadTree(
      ctx,
      randomInt(rng, 0, w),
      hillBase + 4,
      randomInt(rng, 26, 56),
      mix(look.skyLow, look.back.deep, 0.9),
      rng,
    );
  }
  for (let i = 0; i < 26; i++)
    rect(ctx, look.fog, 0, hillBase - 34 + i * 3, w, 3, 0.012 * (i / 3 + 1));
}

/** Lápide de pedra: arredondada, ogival ou cruz, só em silhueta com um brilho no canto de cima. */
function tombstone(
  ctx: Ctx,
  ramp: StoneRamp,
  x: number,
  base: number,
  kind: number,
  rng: Rng,
): void {
  const w = 8 + (kind % 3) * 2;
  const h = 14 + randomInt(rng, 0, 12);
  if (kind % 4 === 3) {
    // Cruz de pedra
    rect(ctx, ramp.base, x + Math.floor(w / 2) - 1, base - h - 4, 3, h + 4);
    rect(ctx, ramp.base, x + 1, base - h + 1, w - 2, 3);
    rect(ctx, ramp.light, x + Math.floor(w / 2) - 1, base - h - 4, 1, h + 4);
    return;
  }
  rect(ctx, ramp.base, x, base - h, w, h);
  // Topo arredondado ou em ponta
  if (kind % 2 === 0) {
    rect(ctx, ramp.base, x + 1, base - h - 1, w - 2, 1);
    rect(ctx, ramp.base, x + 2, base - h - 2, w - 4, 1);
  } else {
    rect(ctx, ramp.base, x + 2, base - h - 1, w - 4, 1);
    rect(ctx, ramp.base, x + Math.floor(w / 2) - 1, base - h - 3, 2, 2);
  }
  rect(ctx, ramp.light, x, base - h, 1, h);
  rect(ctx, ramp.dark, x + w - 2, base - h, 2, h);
  // Inscrição gasta
  rect(ctx, ramp.dark, x + 2, base - h + 4, w - 4, 1);
  rect(ctx, ramp.dark, x + 3, base - h + 7, w - 6, 1);
}

/** Trecho de cerca de ferro: barras com pontas de lança e dois travessões. */
function ironFence(
  ctx: Ctx,
  ramp: StoneRamp,
  x: number,
  base: number,
  length: number,
  rng: Rng,
): void {
  const height = 26;
  rect(ctx, ramp.dark, x, base - height + 6, length, 1);
  rect(ctx, ramp.dark, x, base - 8, length, 1);
  for (let i = 0; i < length; i += 4) {
    if (rng() < 0.12) continue; // uma barra faltando
    const lean = rng() < 0.1 ? 1 : 0;
    rect(ctx, ramp.dark, x + i + lean, base - height, 1, height);
    rect(ctx, ramp.base, x + i + lean, base - height - 2, 1, 2); // ponta
    rect(ctx, ramp.base, x + i + lean - 1, base - height, 3, 1);
  }
}

/** Mausoléu: frontão triangular, colunas e uma porta escura. */
function mausoleum(ctx: Ctx, look: BiomeLook, ramp: StoneRamp, x: number, base: number): void {
  const w = 56;
  const h = 40;
  rect(ctx, ramp.base, x, base - h, w, h);
  rect(ctx, ramp.light, x, base - h, w, 2);
  // Frontão
  for (let r = 0; r < 14; r++) rect(ctx, ramp.base, x + r + 2, base - h - 14 + r, w - 4 - r * 2, 1);
  rect(ctx, ramp.light, x + 2, base - h - 1, w - 4, 1);
  // Colunas
  for (const cx of [x + 4, x + 14, x + w - 18, x + w - 8]) {
    rect(ctx, ramp.light, cx, base - h + 2, 4, h - 2);
    rect(ctx, ramp.dark, cx + 3, base - h + 2, 1, h - 2);
  }
  // Porta escura com uma luz de vela
  rect(ctx, ramp.deep, x + 22, base - 26, 12, 26);
  rect(ctx, ramp.deep, x + 24, base - 29, 8, 3);
  rect(ctx, look.glowSoft, x + 27, base - 12, 2, 3, 0.7);
  disc(ctx, look.glow, x + 28, base - 11, 14, 0.06);
  // Degraus
  rect(ctx, ramp.dark, x - 3, base - 3, w + 6, 3);
}

/** Lança fincada no chão com um estandarte rasgado preso perto da ponta. */
function plantedBanner(
  ctx: Ctx,
  ramp: StoneRamp,
  cloth: number,
  x: number,
  base: number,
  height: number,
  rng: Rng,
): void {
  rect(ctx, ramp.light, x, base - height, 1, height);
  rect(ctx, ramp.highlight, x - 1, base - height - 3, 3, 3); // ponta
  const flagH = 14 + randomInt(rng, 0, 6);
  for (let i = 0; i < 14; i++) {
    const hang = Math.round(Math.sin(i / 2.5) * 1.5);
    rect(
      ctx,
      cloth,
      x + 1 + i,
      base - height + 2 + hang,
      1,
      flagH - (i > 8 ? (i - 8) * 2 : 0) - (i % 3 === 0 ? 2 : 0),
    );
  }
}

export function midCemiterio(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  const ground = h - 50;
  const cloth = mix(0x5a2a46, look.back.deep, 0.45);
  // Terra do fundo
  rect(ctx, mix(ramp.deep, ramp.dark, 0.5), 0, ground, w, h - ground);
  // Mausoléu e árvores mortas entre as fileiras
  mausoleum(ctx, look, ramp, Math.round(w * 0.12), ground + 2);
  for (let i = 0; i < 5; i++) {
    deadTree(ctx, randomInt(rng, 0, w), ground + 2, randomInt(rng, 70, 130), ramp.dark, rng);
  }
  // Cercas de ferro com trechos quebrados
  let fx = -10;
  while (fx < w) {
    const length = randomInt(rng, 40, 90);
    if (rng() < 0.7) ironFence(ctx, ramp, fx, ground + 2, length, rng);
    fx += length + randomInt(rng, 20, 90);
  }
  // Estandartes rasgados e lanças do campo de batalha
  for (let i = 0; i < 6; i++) {
    plantedBanner(
      ctx,
      ramp,
      cloth,
      randomInt(rng, 8, w - 20),
      ground + 4,
      randomInt(rng, 44, 70),
      rng,
    );
  }
  // Lápides e cruzes em fileiras
  for (let x = randomInt(rng, 0, 20); x < w; x += randomInt(rng, 14, 30)) {
    tombstone(ctx, ramp, x, ground + 3 + randomInt(rng, 0, 4), randomInt(rng, 0, 4), rng);
  }
  // Fogos fracos de almas entre as lápides
  for (let i = 0; i < 10; i++) {
    const x = randomInt(rng, 6, w - 6);
    const y = randomInt(rng, ground - 40, ground - 4);
    disc(ctx, look.glow, x, y, 6, 0.07);
    rect(ctx, look.glow, x, y, 1, 2, 0.8);
  }
  for (let i = 0; i < 22; i++) rect(ctx, look.fog, 0, h - 90 + i * 3, w, 3, 0.012 * (i / 2));
}

export function nearCemiterio(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.5);
  // Capim seco e crescido nos dois cantos de baixo
  for (const [from, to] of [
    [-6, 80],
    [w - 86, w + 6],
  ] as const) {
    for (let x = from; x < to; x += 3) {
      const len = randomInt(rng, 16, 52);
      for (let y = 0; y < len; y++) {
        const bend = Math.round((y / len) ** 2 * (x % 2 === 0 ? 3 : -3));
        rect(ctx, y > len - 4 ? mix(look.moss, dark, 0.4) : dark, x + bend, h - 2 - y, 1, 1);
      }
    }
  }
  // Uma lápide grande e escura encostada na borda direita
  const gx = w - 44;
  rect(ctx, dark, gx, h - 78, 30, 78);
  rect(ctx, dark, gx + 2, h - 82, 26, 4);
  rect(ctx, dark, gx + 6, h - 85, 18, 3);
  rect(ctx, mix(dark, look.back.light, 0.3), gx, h - 78, 2, 78, 0.8);
  // Galhos mortos descendo do alto
  for (const x of [34, 70, w - 120, w - 60]) {
    let cx = x;
    const len = randomInt(rng, 24, 70);
    for (let i = 0; i < len; i++) {
      if (rng() < 0.3) cx += rng() < 0.5 ? -1 : 1;
      rect(ctx, dark, cx, i, 2, 1);
      if (i % 11 === 6) rect(ctx, dark, cx + 2, i, 5, 1);
    }
  }
  // Almas (luzes lilases) flutuando perto do chão
  for (let i = 0; i < 12; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, h - 110, h - 20);
    disc(ctx, look.glow, x, y, 5, 0.06);
    rect(ctx, mix(look.glow, 0xffffff, 0.4), x, y, 1, 1, 0.8);
  }
}
