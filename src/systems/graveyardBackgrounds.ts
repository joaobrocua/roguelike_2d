import type { BiomeLook, StoneRamp } from '../data/biomeLook';
import { randomInt, type Rng } from '../utils/rng';
import { disc, ditherGradientV, line, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo do Cemitério dos Caídos, em pixel art: distante (noite fria, lua baixa,
 * corvos, colinas em camadas com cruzes e estandartes, a fumaça de um acampamento e o castelo em
 * ruínas), médio (fileiras de lápides, mausoléu de porta entreaberta, anjo sem cabeça, carroça
 * quebrada, forca, covas abertas e as armas do campo de batalha) e primeiro plano (lápides
 * enormes, mato seco, cardos, galhos e névoa baixa nas bordas, com poucas almas). As cores vêm de
 * BiomeLook; no plano médio só se usa a rampa `back`, para o centro nunca ficar mais claro que as
 * plataformas.
 */

/** Brasa do acampamento distante: poucos pixels, sempre com opacidade baixa. */
const CAMPFIRE = 0xd98a3c;

// --- Plano distante ----------------------------------------------------------------------

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

/** Altura (y) do topo de uma camada de colinas na coluna x; `bump` ergue o morro do castelo. */
function ridgeY(x: number, base: number, phase: number, bumpX = 0, bumpHeight = 0): number {
  const bump = bumpHeight > 0 ? Math.max(0, 1 - Math.abs(x - bumpX) / 130) : 0;
  return (
    base -
    Math.round(10 * Math.sin(x / 50 + phase) + 5 * Math.sin(x / 19 + 1 + phase) + bump * bumpHeight)
  );
}

/** Preenche uma camada de colinas do horizonte até a base da textura. */
function hills(
  ctx: Ctx,
  color: number,
  w: number,
  h: number,
  base: number,
  phase: number,
  bumpX = 0,
  bumpHeight = 0,
): void {
  for (let x = 0; x < w; x++) {
    const y = ridgeY(x, base, phase, bumpX, bumpHeight);
    rect(ctx, color, x, y, 1, h - y);
  }
}

/** Cruz pequena no horizonte, às vezes caída para o lado. */
function ridgeCross(
  ctx: Ctx,
  color: number,
  x: number,
  ground: number,
  size: number,
  tilt: number,
) {
  const shear = (up: number): number => Math.round((tilt * up) / size);
  for (let up = 0; up < size; up++) rect(ctx, color, x + shear(up), ground - up, 1, 1);
  rect(ctx, color, x + shear(size - 3) - 2, ground - size + 3, 5, 1);
}

/** Mastro com um trapo de estandarte rasgado, preso numa colina distante. */
function ridgeBanner(ctx: Ctx, color: number, x: number, ground: number, height: number) {
  rect(ctx, color, x, ground - height, 1, height);
  for (let i = 0; i < 7; i++) {
    const hang = i % 2 === 0 ? 0 : 1;
    rect(ctx, color, x + 1 + i, ground - height + Math.round(i / 3), 1, 7 - i - hang);
  }
}

/** Corvo em voo: corpo de 1 px e asas em três posições (para cima, planando, para baixo). */
function crow(ctx: Ctx, color: number, x: number, y: number, flap: number): void {
  rect(ctx, color, x, y, 1, 1);
  if (flap === 0) {
    rect(ctx, color, x - 1, y - 1, 1, 1);
    rect(ctx, color, x - 2, y - 2, 1, 1);
    rect(ctx, color, x + 1, y - 1, 1, 1);
    rect(ctx, color, x + 2, y - 2, 1, 1);
  } else if (flap === 1) {
    rect(ctx, color, x - 2, y, 2, 1);
    rect(ctx, color, x + 1, y, 2, 1);
    rect(ctx, color, x - 3, y + 1, 1, 1);
    rect(ctx, color, x + 3, y + 1, 1, 1);
  } else {
    rect(ctx, color, x - 1, y, 1, 1);
    rect(ctx, color, x - 2, y + 1, 1, 1);
    rect(ctx, color, x + 1, y, 1, 1);
    rect(ctx, color, x + 2, y + 1, 1, 1);
  }
}

/** Coluna de fumaça fina: balança com o vento, alarga e some à medida que sobe. */
function smokeColumn(
  ctx: Ctx,
  color: number,
  x: number,
  base: number,
  height: number,
  phase: number,
): void {
  for (let i = 0; i < height; i++) {
    const t = i / height;
    const sway = Math.round(Math.sin(i / 9 + phase) * (2 + t * 7));
    const width = 2 + Math.floor(t * 4);
    rect(
      ctx,
      color,
      x + sway - Math.floor(width / 2),
      base - i,
      width,
      1,
      0.06 + 0.24 * (1 - t) ** 1.2,
    );
  }
}

/** Acampamento ao longe: duas barracas e uma fogueirinha; a fumaça sai de cima dele. */
function farCamp(ctx: Ctx, look: BiomeLook, color: number, x: number, ground: number): void {
  for (const [dx, size] of [
    [-17, 11],
    [11, 14],
  ] as const) {
    for (let r = 0; r < size; r++)
      rect(ctx, color, x + dx - Math.floor((size - r) / 2), ground - r, size - r + 1, 1);
  }
  rect(ctx, CAMPFIRE, x - 1, ground - 1, 2, 1, 0.85);
  rect(ctx, mix(CAMPFIRE, 0xffffff, 0.35), x, ground - 2, 1, 1, 0.7);
  disc(ctx, CAMPFIRE, x, ground - 1, 6, 0.05);
  smokeColumn(ctx, mix(look.fog, look.skyMid, 0.25), x, ground - 3, 78, 0.8);
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
  // Nuvens finas: três riscam a lua de propósito, as outras cruzam o céu
  const cloud = mix(look.skyMid, look.skyLow, 0.55);
  for (const [dx, dy, len] of [
    [-48, -12, 84],
    [-30, 3, 96],
    [-56, 15, 70],
  ] as const) {
    rect(ctx, cloud, moonX + dx, moonY + dy, len, 2, 0.62);
    rect(ctx, cloud, moonX + dx + 10, moonY + dy + 2, len - 28, 1, 0.4);
  }
  for (let i = 0; i < 7; i++) {
    const len = randomInt(rng, 50, 150);
    const y = 40 + i * 16;
    rect(ctx, cloud, randomInt(rng, 0, w - 140), y, len, 2, 0.4);
    rect(ctx, cloud, randomInt(rng, 0, w - 140), y + 2, Math.round(len / 2), 1, 0.25);
  }
  // Colinas em camadas, da mais distante (quase céu) à mais próxima (quase preta)
  const castleX = Math.round(w * 0.22);
  const bumpX = castleX + 40;
  const hillBase = 190;
  const hill1 = mix(look.skyLow, look.back.deep, 0.42);
  const hill2 = mix(look.skyLow, look.back.deep, 0.6);
  const hill3 = mix(look.skyLow, look.back.deep, 0.78);
  const hill4 = mix(look.skyLow, look.back.deep, 0.93);
  hills(ctx, hill1, w, h, 160, 4.1);
  hills(ctx, hill2, w, h, 172, 1.7);
  // Acampamento na segunda camada, longe do castelo
  const campX = Math.round(w * 0.5);
  farCamp(ctx, look, mix(hill2, look.back.deep, 0.55), campX, ridgeY(campX, 172, 1.7) + 1);
  // Estandartes e cruzes que sobraram nas cristas distantes
  const flag = mix(hill1, 0x5a2a46, 0.25);
  for (const bx of [w * 0.07, w * 0.38, w * 0.66, w * 0.93]) {
    const x = Math.round(bx);
    ridgeBanner(ctx, flag, x, ridgeY(x, 160, 4.1) + 1, randomInt(rng, 14, 22));
  }
  hills(ctx, hill3, w, h, hillBase, 0, bumpX, 26);
  // Castelo em ruínas no alto do morro maior
  const castle = mix(look.skyLow, look.back.deep, 0.86);
  const keepBase = hillBase - 26;
  castlePiece(ctx, look, rng, castleX, keepBase, 20, 70, castle);
  castlePiece(ctx, look, rng, castleX + 22, keepBase, 34, 44, castle);
  castlePiece(ctx, look, rng, castleX + 58, keepBase, 14, 58, castle);
  castlePiece(ctx, look, rng, castleX + 74, keepBase, 24, 32, castle);
  // Árvores mortas em silhueta na colina e névoa baixa
  const treeColor = mix(look.skyLow, look.back.deep, 0.9);
  for (let i = 0; i < 8; i++) {
    const x = randomInt(rng, 0, w);
    deadTree(ctx, x, ridgeY(x, hillBase, 0, bumpX, 26) + 3, randomInt(rng, 26, 56), treeColor, rng);
  }
  for (const [cx, tilt] of [
    [0.3, 0],
    [0.55, 2],
    [0.62, -1],
    [0.8, 3],
  ] as const) {
    const x = Math.round(w * cx);
    ridgeCross(ctx, hill3, x, ridgeY(x, hillBase, 0, bumpX, 26) + 1, randomInt(rng, 6, 10), tilt);
  }
  for (const bx of [w * 0.47, w * 0.88]) {
    const x = Math.round(bx);
    ridgeBanner(ctx, hill3, x, ridgeY(x, hillBase, 0, bumpX, 26) + 1, randomInt(rng, 18, 26));
  }
  // Colina da frente, a mais escura, com cruzes tortas
  hills(ctx, hill4, w, h, 206, 3.1);
  for (let i = 0; i < 6; i++) {
    const x = randomInt(rng, 6, w - 6);
    ridgeCross(
      ctx,
      hill4,
      x,
      ridgeY(x, 206, 3.1) + 1,
      randomInt(rng, 7, 12),
      randomInt(rng, -3, 4),
    );
  }
  // Bando de corvos voando para a lua
  const crowColor = mix(look.skyTop, look.back.deep, 0.85);
  for (let i = 0; i < 22; i++) {
    const x = Math.round(moonX - 100 + (rng() + rng() - 1) * 70);
    const y = Math.round(84 + (rng() + rng() - 1) * 20 + (x - moonX) * 0.14);
    crow(ctx, crowColor, x, y, randomInt(rng, 0, 3));
  }
  // Alguns já cruzam o disco da lua e outros voam sozinhos pelo céu
  for (let i = 0; i < 4; i++) {
    crow(ctx, crowColor, moonX - 22 + i * 12 + randomInt(rng, -3, 4), moonY - 14 + i * 7, i % 3);
  }
  for (let i = 0; i < 4; i++) {
    crow(ctx, crowColor, randomInt(rng, 10, w - 10), randomInt(rng, 24, 130), randomInt(rng, 0, 3));
  }
  for (let i = 0; i < 26; i++)
    rect(ctx, look.fog, 0, hillBase - 34 + i * 3, w, 3, 0.012 * (i / 3 + 1));
}

// --- Plano médio -------------------------------------------------------------------------

/** Rampa de pedra empurrada para o escuro (fileira de trás, que deve parecer mais longe). */
function dimRamp(ramp: StoneRamp, t: number): StoneRamp {
  return {
    deep: ramp.deep,
    dark: mix(ramp.dark, ramp.deep, t),
    base: mix(ramp.base, ramp.deep, t),
    light: mix(ramp.light, ramp.deep, t),
    highlight: mix(ramp.highlight, ramp.deep, t),
  };
}

interface StoneOptions {
  /** Deslocamento, em px, do topo em relação à base (positivo inclina para a direita). */
  lean?: number;
  /** Lápide partida: topo irregular e um caco no chão. */
  broken?: boolean;
  /** Quantos px a mais baixa que o normal (fileira de trás). */
  shrink?: number;
}

/** Lápide de pedra: arredondada, ogival ou cruz, só em silhueta com um brilho no canto de cima. */
function tombstone(
  ctx: Ctx,
  ramp: StoneRamp,
  x: number,
  base: number,
  kind: number,
  rng: Rng,
  options: StoneOptions = {},
): void {
  const { lean = 0, broken = false, shrink = 0 } = options;
  const w = 8 + (kind % 3) * 2;
  const full = 14 + randomInt(rng, 0, 12) - shrink;
  const h = broken ? Math.round(full * 0.6) : full;
  // Faixa de linhas acima da base, com a inclinação aplicada linha a linha
  const put = (color: number, rx: number, up: number, rw: number, rows: number): void => {
    for (let r = 0; r < rows; r++) {
      rect(ctx, color, x + rx + Math.round((lean * (up + r)) / full), base - up - r - 1, rw, 1);
    }
  };
  if (kind % 4 === 3) {
    // Cruz de pedra (a quebrada perde o braço da direita)
    const stem = Math.floor(w / 2) - 1;
    put(ramp.base, stem, 0, 3, h + 4);
    put(ramp.base, broken ? 1 : 1, h - 2, broken ? stem : w - 2, 3);
    put(ramp.light, stem, 0, 1, h + 4);
  } else {
    put(ramp.base, 0, 0, w, h);
    if (broken) {
      // Topo em dente, descendo para um lado
      for (let c = 0; c < w; c++) {
        const extra = Math.max(0, Math.round((w - 1 - c) * 0.45) - randomInt(rng, 0, 2));
        put(ramp.base, c, h, 1, extra);
      }
      rect(ctx, ramp.base, x + w + 1, base - 2, 4, 2);
      rect(ctx, ramp.dark, x + w + 4, base - 1, 3, 1);
    } else if (kind % 2 === 0) {
      // Topo arredondado
      put(ramp.base, 1, h, w - 2, 1);
      put(ramp.base, 2, h + 1, w - 4, 1);
    } else {
      // Topo em ponta
      put(ramp.base, 2, h, w - 4, 1);
      put(ramp.base, Math.floor(w / 2) - 1, h + 1, 2, 2);
    }
    put(ramp.light, 0, 0, 1, h);
    put(ramp.dark, w - 2, 0, 2, h);
    // Inscrição gasta
    if (h > 9) put(ramp.dark, 2, h - 5, w - 4, 1);
    if (h > 12) put(ramp.dark, 3, h - 8, w - 6, 1);
  }
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
  // Dois mourões de pedra nas pontas
  for (const px of [x - 1, x + length - 2]) {
    rect(ctx, ramp.base, px, base - height - 4, 4, height + 4);
    rect(ctx, ramp.light, px, base - height - 4, 1, height + 4);
  }
}

/** Mausoléu: frontão com cruz, colunas e uma porta entreaberta com luz fraca lá dentro. */
function mausoleum(ctx: Ctx, look: BiomeLook, ramp: StoneRamp, x: number, base: number): void {
  const w = 56;
  const h = 40;
  rect(ctx, ramp.base, x, base - h, w, h);
  rect(ctx, ramp.light, x, base - h, w, 2);
  // Frontão e a cruz no alto
  for (let r = 0; r < 14; r++) {
    const inset = (13 - r) * 2;
    rect(ctx, ramp.base, x + 2 + inset, base - h - 14 + r, w - 4 - inset * 2, 1);
  }
  rect(ctx, ramp.light, x + 2, base - h - 1, w - 4, 1);
  rect(ctx, ramp.base, x + w / 2 - 1, base - h - 23, 2, 9);
  rect(ctx, ramp.base, x + w / 2 - 3, base - h - 20, 6, 2);
  // Colunas
  for (const cx of [x + 4, x + 14, x + w - 18, x + w - 8]) {
    rect(ctx, ramp.light, cx, base - h + 2, 4, h - 2);
    rect(ctx, ramp.dark, cx + 3, base - h + 2, 1, h - 2);
  }
  // Porta escura, a folha da direita encostada e a fresta acesa por uma vela
  rect(ctx, ramp.deep, x + 22, base - 26, 12, 26);
  rect(ctx, ramp.deep, x + 24, base - 29, 8, 3);
  rect(ctx, look.glowSoft, x + 24, base - 22, 2, 20, 0.5);
  rect(ctx, look.glowSoft, x + 24, base - 5, 6, 2, 0.14);
  rect(ctx, ramp.dark, x + 28, base - 26, 6, 26);
  rect(ctx, ramp.light, x + 28, base - 26, 1, 26);
  rect(ctx, ramp.deep, x + 31, base - 20, 1, 8);
  disc(ctx, look.glow, x + 25, base - 14, 14, 0.05);
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

/** Elmo de soldado pendurado no punho ou na ponta de uma arma (`top` é a linha de cima). */
function helmet(ctx: Ctx, ramp: StoneRamp, cx: number, top: number): void {
  for (const [row, half] of [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 3],
    [4, 3],
  ] as const) {
    rect(ctx, ramp.base, cx - half, top + row, half * 2 + 1, 1);
  }
  rect(ctx, ramp.light, cx - 2, top + 1, 1, 2);
  rect(ctx, ramp.deep, cx - 2, top + 3, 5, 1); // fenda da viseira
}

/** Espada fincada pela ponta, com o elmo de quem a empunhava pendurado no punho. */
function plantedSword(
  ctx: Ctx,
  ramp: StoneRamp,
  x: number,
  base: number,
  length: number,
  lean: number,
  withHelmet: boolean,
): void {
  const steel = mix(ramp.light, ramp.highlight, 0.4);
  const tipX = x + lean;
  const guardY = base - length;
  line(ctx, steel, x, base, tipX, guardY);
  rect(ctx, steel, tipX - 3, guardY, 7, 1); // guarda
  rect(ctx, ramp.dark, tipX, guardY - 5, 1, 4); // empunhadura
  rect(ctx, ramp.light, tipX - 1, guardY - 7, 3, 2); // pomo
  if (withHelmet) helmet(ctx, ramp, tipX, guardY - 12);
}

/** Lança fincada, inclinada, às vezes com o elmo enfiado no cabo. */
function plantedSpear(
  ctx: Ctx,
  ramp: StoneRamp,
  x: number,
  base: number,
  length: number,
  lean: number,
  withHelmet: boolean,
): void {
  const steel = mix(ramp.light, ramp.highlight, 0.4);
  const tipX = x + lean;
  const topY = base - length;
  line(ctx, ramp.light, x, base, tipX, topY);
  rect(ctx, steel, tipX, topY - 5, 1, 5); // ponta de folha
  rect(ctx, steel, tipX - 1, topY - 3, 3, 1);
  rect(ctx, ramp.dark, tipX - 1, topY, 3, 1); // amarração
  if (withHelmet) helmet(ctx, ramp, tipX, topY + 3);
}

/** Corvo pousado, de lado, com o bico para a direita (`y` é a linha dos pés). */
function perchedCrow(ctx: Ctx, color: number, x: number, y: number): void {
  rect(ctx, color, x - 2, y - 4, 4, 3);
  rect(ctx, color, x + 1, y - 6, 2, 2);
  rect(ctx, color, x + 3, y - 5, 1, 1);
  rect(ctx, color, x - 4, y - 3, 2, 1); // cauda
  rect(ctx, color, x - 1, y - 1, 1, 1);
}

/** Estátua de anjo sem cabeça sobre um pedestal; a cabeça rolou para o chão. */
function beheadedAngel(ctx: Ctx, ramp: StoneRamp, x: number, base: number): void {
  const cx = x + 10;
  // Pedestal
  rect(ctx, ramp.dark, x, base - 8, 20, 8);
  rect(ctx, ramp.base, x + 1, base - 13, 18, 5);
  rect(ctx, ramp.light, x + 1, base - 13, 18, 1);
  // Asas: uma inteira, a outra partida ao meio
  const wing = mix(ramp.dark, ramp.base, 0.6);
  line(ctx, wing, cx - 3, base - 30, cx - 14, base - 50);
  line(ctx, wing, cx - 4, base - 28, cx - 15, base - 46);
  line(ctx, wing, cx - 5, base - 26, cx - 14, base - 40);
  line(ctx, wing, cx - 6, base - 24, cx - 13, base - 34);
  line(ctx, wing, cx + 3, base - 30, cx + 8, base - 40);
  line(ctx, wing, cx + 4, base - 28, cx + 9, base - 37);
  // Túnica que se alarga para baixo
  for (let r = 0; r < 22; r++) {
    const half = 3 + Math.floor((22 - r) / 6);
    rect(ctx, ramp.base, cx - half, base - 14 - r, half * 2 + 1, 1);
    rect(ctx, ramp.light, cx - half, base - 14 - r, 1, 1);
    rect(ctx, ramp.dark, cx + half - 1, base - 14 - r, 2, 1);
  }
  // Mãos juntas no peito e o toco do pescoço
  rect(ctx, ramp.dark, cx - 1, base - 28, 3, 4);
  rect(ctx, ramp.dark, cx - 1, base - 38, 3, 2);
  perchedCrow(ctx, ramp.deep, cx, base - 38);
  // A cabeça caída ao lado, de lado, e um caco do pedestal
  disc(ctx, ramp.base, x + 26, base - 2, 2);
  rect(ctx, ramp.light, x + 25, base - 4, 1, 1);
  rect(ctx, ramp.dark, x + 30, base - 1, 3, 1);
}

/** Carroça quebrada: caçamba torta, uma roda de pé, a outra caída e o timão no chão. */
function brokenCart(ctx: Ctx, ramp: StoneRamp, earth: number, x: number, base: number): void {
  const wheel = (cx: number, cy: number): void => {
    disc(ctx, ramp.base, cx, cy, 7);
    disc(ctx, earth, cx, cy, 5);
    line(ctx, ramp.base, cx - 5, cy, cx + 5, cy);
    line(ctx, ramp.base, cx, cy - 5, cx, cy + 5);
    line(ctx, ramp.base, cx - 4, cy - 4, cx + 4, cy + 4);
    rect(ctx, ramp.light, cx - 1, cy - 1, 3, 3);
  };
  // Caçamba inclinada, com tábuas faltando na lateral
  for (let r = 0; r < 12; r++) {
    rect(ctx, ramp.base, x + 4 + Math.floor(r / 3), base - 16 - r + 8, 32, 1);
  }
  for (let i = 0; i < 32; i += 4) rect(ctx, ramp.deep, x + 4 + i, base - 20, 1, 12);
  rect(ctx, ramp.deep, x + 14, base - 14, 6, 5); // buraco onde faltam tábuas
  rect(ctx, ramp.light, x + 4, base - 26, 34, 1);
  wheel(x + 12, base - 6);
  // Roda caída, quase deitada
  rect(ctx, ramp.base, x + 34, base - 3, 14, 3);
  rect(ctx, ramp.light, x + 36, base - 4, 10, 1);
  // Timão quebrado apontando para o céu
  line(ctx, ramp.base, x + 38, base - 20, x + 58, base - 4);
  rect(ctx, ramp.base, x + 58, base - 3, 6, 2);
}

/** Árvore morta com uma corda de forca pendurada num galho que sai para a esquerda. */
function hangingTree(ctx: Ctx, ramp: StoneRamp, x: number, base: number, rng: Rng): void {
  const height = 112;
  deadTree(ctx, x, base, height, ramp.dark, rng);
  const limbY = base - 82;
  line(ctx, ramp.dark, x + 1, limbY + 2, x - 28, limbY - 2);
  line(ctx, ramp.dark, x + 1, limbY + 3, x - 28, limbY);
  rect(ctx, ramp.dark, x - 20, limbY - 5, 1, 4);
  // Corda e nó corrediço
  const rope = mix(ramp.base, ramp.light, 0.35);
  rect(ctx, rope, x - 14, limbY, 1, 22);
  rect(ctx, rope, x - 15, limbY + 22, 3, 1);
  rect(ctx, rope, x - 16, limbY + 23, 1, 4);
  rect(ctx, rope, x - 12, limbY + 23, 1, 4);
  rect(ctx, rope, x - 15, limbY + 27, 3, 1);
  perchedCrow(ctx, ramp.deep, x - 24, limbY - 1);
  // Banco derrubado embaixo
  rect(ctx, ramp.dark, x - 24, base - 4, 12, 2);
  rect(ctx, ramp.dark, x - 23, base - 2, 1, 2);
  rect(ctx, ramp.dark, x - 14, base - 2, 1, 2);
}

/** Cova aberta: o buraco escuro, o monte de terra ao lado e uma pá cravada nele. */
function openGrave(ctx: Ctx, ramp: StoneRamp, earth: number, x: number, base: number): void {
  const soil = mix(earth, ramp.base, 0.35);
  rect(ctx, ramp.deep, x, base, 18, 4);
  rect(ctx, ramp.dark, x, base, 18, 1);
  mound(ctx, soil, ramp.dark, x - 14, base + 4, 14, 6);
  line(ctx, ramp.light, x - 7, base - 3, x - 4, base + 3);
  rect(ctx, ramp.light, x - 8, base - 5, 3, 1);
  rect(ctx, ramp.base, x - 4, base + 3, 3, 3);
}

/** Montinho de terra revolvida (meia elipse com a sombra do lado direito). */
function mound(
  ctx: Ctx,
  color: number,
  shade: number,
  x: number,
  base: number,
  width: number,
  height: number,
): void {
  for (let dy = 0; dy < height; dy++) {
    const half = Math.round((width / 2) * Math.sqrt(1 - (dy / height) ** 2));
    rect(ctx, color, x + width / 2 - half, base - dy - 1, half * 2, 1);
    rect(ctx, shade, x + width / 2 + half - 2, base - dy - 1, 2, 1);
  }
}

/** Tufo de mato seco: fiapos curvos, alguns com uma flor murcha de cabeça baixa. */
function dryTuft(
  ctx: Ctx,
  look: BiomeLook,
  ramp: StoneRamp,
  rng: Rng,
  x: number,
  base: number,
): void {
  const grass = mix(look.moss, ramp.deep, 0.62);
  for (let i = 0; i < 4; i++) {
    const height = randomInt(rng, 3, 8);
    const dir = i % 2 === 0 ? -1 : 1;
    for (let y = 0; y < height; y++) {
      rect(ctx, grass, x + i + Math.round(dir * (y / height) ** 2 * 2), base - y - 1, 1, 1);
    }
  }
  if (rng() < 0.4) {
    const stem = randomInt(rng, 6, 10);
    rect(ctx, grass, x + 2, base - stem, 1, stem);
    rect(ctx, mix(look.glowSoft, ramp.deep, 0.55), x + 2, base - stem, 2, 1); // flor caída
    rect(ctx, mix(look.glowSoft, ramp.deep, 0.55), x + 3, base - stem + 1, 1, 1);
  }
}

/** Poste curto com uma lanterna de alma pendurada (brilho fraco e de cor fria). */
function lanternPost(ctx: Ctx, look: BiomeLook, ramp: StoneRamp, x: number, base: number): void {
  rect(ctx, ramp.dark, x, base - 24, 1, 24);
  rect(ctx, ramp.dark, x, base - 24, 6, 1);
  rect(ctx, ramp.dark, x + 5, base - 23, 1, 2);
  rect(ctx, ramp.dark, x + 3, base - 21, 5, 6);
  rect(ctx, look.glowSoft, x + 4, base - 20, 3, 4, 0.7);
  disc(ctx, look.glow, x + 5, base - 18, 10, 0.05);
}

export function midCemiterio(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  const ground = h - 50;
  const cloth = mix(0x5a2a46, look.back.deep, 0.45);
  const earth = mix(ramp.deep, ramp.dark, 0.5);
  const mausoleumX = Math.round(w * 0.2);
  const angelX = Math.round(w * 0.38);
  const cartX = Math.round(w * 0.6);
  // Terra do fundo
  rect(ctx, earth, 0, ground, w, h - ground);
  // Fileira de trás: lápides menores e mais apagadas, de longe
  const faded = dimRamp(ramp, 0.5);
  for (let x = randomInt(rng, 0, 12); x < w; x += randomInt(rng, 10, 20)) {
    tombstone(ctx, faded, x, ground - 1, randomInt(rng, 0, 4), rng, { shrink: 6 });
  }
  // Mausoléu à esquerda e a árvore da forca à direita; outras árvores mortas pelo meio
  mausoleum(ctx, look, ramp, mausoleumX, ground + 2);
  hangingTree(ctx, ramp, Math.round(w * 0.86), ground + 2, rng);
  for (let i = 0; i < 4; i++) {
    let x = randomInt(rng, 0, w);
    if (x > mausoleumX - 16 && x < mausoleumX + 72) x += 100; // não atravessa o mausoléu
    deadTree(ctx, x, ground + 2, randomInt(rng, 70, 130), ramp.dark, rng);
  }
  // Cercas de ferro com trechos quebrados
  let fx = -10;
  while (fx < w) {
    const length = randomInt(rng, 40, 90);
    if (rng() < 0.7) ironFence(ctx, ramp, fx, ground + 2, length, rng);
    fx += length + randomInt(rng, 20, 90);
  }
  // Estandartes rasgados e as armas do campo de batalha
  for (let i = 0; i < 5; i++) {
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
  for (let i = 0; i < 8; i++) {
    const x = randomInt(rng, 12, w - 12);
    const lean = randomInt(rng, -3, 4);
    const withHelmet = rng() < 0.4;
    if (i % 3 === 0)
      plantedSpear(ctx, ramp, x, ground + 5, randomInt(rng, 34, 52), lean, withHelmet);
    else plantedSword(ctx, ramp, x, ground + 5, randomInt(rng, 12, 20), lean, withHelmet);
  }
  // Anjo decapitado e carroça quebrada, à frente das armas
  beheadedAngel(ctx, ramp, angelX, ground + 3);
  brokenCart(ctx, ramp, earth, cartX, ground + 4);
  // Lápides e cruzes em fileiras, algumas tortas ou partidas (deixando livres o anjo e a carroça)
  for (let x = randomInt(rng, 0, 20); x < w; x += randomInt(rng, 14, 30)) {
    const roll = rng();
    const clear = (x > angelX - 12 && x < angelX + 36) || (x > cartX - 12 && x < cartX + 66);
    if (clear) continue;
    const lean = roll < 0.3 ? randomInt(rng, -3, 4) : 0;
    tombstone(ctx, ramp, x, ground + 3 + randomInt(rng, 0, 4), randomInt(rng, 0, 4), rng, {
      lean,
      broken: roll > 0.82,
    });
  }
  // Covas abertas e covas recentes na frente das lápides
  for (const gx of [w * 0.18, w * 0.5, w * 0.76]) {
    openGrave(ctx, ramp, earth, Math.round(gx), ground + 12 + randomInt(rng, 0, 4));
  }
  for (let i = 0; i < 4; i++) {
    mound(
      ctx,
      mix(earth, ramp.base, 0.3),
      ramp.dark,
      randomInt(rng, 8, w - 24),
      ground + randomInt(rng, 14, 22),
      randomInt(rng, 12, 20),
      randomInt(rng, 3, 5),
    );
  }
  // Mato seco e flores murchas
  for (let i = 0; i < 46; i++) {
    dryTuft(ctx, look, ramp, rng, randomInt(rng, 0, w), ground + randomInt(rng, 6, 26));
  }
  // Lanternas nas laterais e fogos fracos de almas entre as lápides
  lanternPost(ctx, look, ramp, Math.round(w * 0.32), ground + 8);
  lanternPost(ctx, look, ramp, Math.round(w * 0.9), ground + 10);
  for (let i = 0; i < 6; i++) {
    const x = randomInt(rng, 6, w - 6);
    const y = randomInt(rng, ground - 40, ground - 4);
    disc(ctx, look.glow, x, y, 6, 0.06);
    rect(ctx, look.glow, x, y, 1, 2, 0.7);
  }
  for (let i = 0; i < 22; i++) rect(ctx, look.fog, 0, h - 90 + i * 3, w, 3, 0.012 * (i / 2));
}

// --- Primeiro plano ----------------------------------------------------------------------

/** Galho torto que desce do alto e se bifurca; `dx` é para que lado ele cresce. */
function hangingBranch(
  ctx: Ctx,
  color: number,
  rng: Rng,
  x: number,
  y: number,
  dx: number,
  length: number,
  depth: number,
): void {
  let cx = x;
  let cy = y;
  for (let i = 0; i < length; i++) {
    cy += 1;
    if (rng() < 0.45) cx += dx;
    const thick = depth === 0 && i < length * 0.4 ? 3 : 2;
    rect(ctx, color, cx, cy, thick, 1);
    if (depth < 2 && i > 6 && i % 9 === 5 && rng() < 0.75) {
      hangingBranch(ctx, color, rng, cx, cy, -dx, Math.round(length * 0.45), depth + 1);
    }
  }
}

/** Cardo seco: haste fina, folhas pontudas e uma cabeça espinhosa com a ponta arroxeada. */
function thistle(ctx: Ctx, look: BiomeLook, dark: number, x: number, base: number, height: number) {
  const bloom = mix(look.glowSoft, dark, 0.55);
  for (let y = 0; y < height; y++)
    rect(ctx, dark, x + Math.round(Math.sin(y / 9) * 1.5), base - y, 1, 1);
  const topX = x + Math.round(Math.sin(height / 9) * 1.5);
  const topY = base - height;
  rect(ctx, dark, topX - 1, topY - 3, 3, 3);
  for (const [sx, sy] of [
    [-2, -4],
    [0, -5],
    [2, -4],
    [-2, -2],
    [2, -2],
  ] as const) {
    rect(ctx, dark, topX + sx, topY + sy, 1, 1);
  }
  rect(ctx, bloom, topX, topY - 5, 1, 1);
  rect(ctx, bloom, topX - 1, topY - 4, 1, 1, 0.7);
  // Folhas serrilhadas
  for (const [lx, ly] of [
    [-3, 12],
    [3, 18],
  ] as const) {
    line(ctx, dark, x, base - ly, x + lx, base - ly - 4);
    rect(ctx, dark, x + lx, base - ly - 5, 1, 2);
  }
}

/** Lápide grande em silhueta contra a borda da tela, com rachaduras e um fio de luz. */
function bigStone(
  ctx: Ctx,
  look: BiomeLook,
  dark: number,
  x: number,
  base: number,
  h: number,
  width: number,
  kind: 'round' | 'cross',
  lean: number,
): void {
  const edge = mix(dark, look.back.light, 0.3);
  const crack = mix(dark, look.back.dark, 0.5);
  const shear = (up: number): number => Math.round((lean * up) / h);
  const put = (color: number, rx: number, up: number, rw: number, rows: number, alpha = 1) => {
    for (let r = 0; r < rows; r++)
      rect(ctx, color, x + rx + shear(up + r), base - up - r - 1, rw, 1, alpha);
  };
  if (kind === 'cross') {
    const stem = Math.floor(width / 2) - 4;
    put(dark, stem, 0, 8, h);
    put(dark, 0, h - 34, width, 9);
    put(edge, stem, 0, 1, h, 0.8);
    put(edge, 0, h - 34, 1, 9, 0.8);
    return;
  }
  put(dark, 0, 0, width, h);
  put(dark, 2, h, width - 4, 4);
  put(dark, 6, h + 4, width - 12, 3);
  put(edge, 0, 0, 2, h, 0.8);
  put(edge, 2, h, 2, 4, 0.6);
  // Rachaduras e uma inscrição quase apagada
  put(crack, Math.floor(width / 2), h - 40, 1, 14);
  put(crack, Math.floor(width / 2) + 1, h - 30, 1, 8);
  put(crack, 6, h - 16, width - 12, 1);
  put(crack, 8, h - 22, width - 16, 1);
}

export function nearCemiterio(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.5);
  // Lápides enormes nas bordas, uma torta e uma cruz
  bigStone(ctx, look, dark, 46, h, 96, 34, 'round', 3);
  bigStone(ctx, look, dark, 8, h, 52, 24, 'round', -4);
  bigStone(ctx, look, dark, w - 100, h, 84, 44, 'cross', 0);
  bigStone(ctx, look, dark, w - 44, h, 60, 28, 'round', -2);
  // Galhos tortos descendo do alto, só nos cantos
  for (const [x, dx] of [
    [34, 1],
    [62, 1],
    [104, -1],
    [w - 140, -1],
    [w - 96, 1],
    [w - 56, -1],
  ] as const) {
    hangingBranch(ctx, dark, rng, x, -2, dx, randomInt(rng, 28, 70), 0);
  }
  // Capim seco e cardos nos dois cantos de baixo, mais alto perto da borda
  for (const [from, to, edgeX] of [
    [0, 130, 0],
    [w - 130, w, w],
  ] as const) {
    for (let x = from; x < to; x += 3) {
      const near = 1 - Math.abs(x - edgeX) / 130;
      const len = randomInt(rng, 14, 30 + Math.round(near * 40));
      for (let y = 0; y < len; y++) {
        const bend = Math.round((y / len) ** 2 * (x % 2 === 0 ? 4 : -4));
        rect(ctx, y > len - 4 ? mix(look.moss, dark, 0.4) : dark, x + bend, h - 2 - y, 1, 1);
      }
      if (rng() < 0.1) thistle(ctx, look, dark, x, h - 2, randomInt(rng, 26, 52));
    }
  }
  // Névoa baixa rastejando junto ao chão, em faixas finas que somem nas pontas
  for (let i = 0; i < 10; i++) {
    const width = randomInt(rng, 70, 170);
    const x = randomInt(rng, -20, w - 60);
    const y = h - randomInt(rng, 8, 30);
    rect(ctx, look.fog, x, y, width, 2, 0.05);
    rect(ctx, look.fog, x + 14, y - 1, width - 28, 1, 0.04);
    rect(ctx, look.fog, x + 30, y + 2, width - 60, 1, 0.03);
  }
  for (let i = 0; i < 8; i++) rect(ctx, look.fog, 0, h - 24 + i * 3, w, 3, 0.006 * (i + 1));
  // Lanterna fraca pendurada num galho e poucas almas perto das bordas
  rect(ctx, dark, 112, 0, 1, 40);
  rect(ctx, dark, 110, 40, 5, 7);
  rect(ctx, look.glowSoft, 111, 42, 3, 4, 0.65);
  disc(ctx, look.glow, 112, 44, 9, 0.05);
  for (const [x, y] of [
    [88, h - 64],
    [32, h - 120],
    [w - 112, h - 96],
    [w - 70, h - 150],
  ] as const) {
    disc(ctx, look.glow, x, y, 5, 0.06);
    rect(ctx, mix(look.glow, 0xffffff, 0.4), x, y, 1, 1, 0.8);
  }
}
