import type { BiomeLook, StoneRamp } from '../data/biomeLook';
import { randomInt, type Rng } from '../utils/rng';
import { disc, line, mix, noise2, rect, type Ctx } from './pixelCanvas';

/**
 * Os três planos do fundo das Minas Desabadas, em pixel art: distante (uma galeria que se perde na
 * escuridão, com escoras em perspectiva, estalactites, veios minerais e uma luz no fim do túnel),
 * médio (escoramentos de madeira com travessas e vigas caídas, trilhos com vagonetes, entulho,
 * lampiões e cristais turquesa nas rochas) e primeiro plano (pilares de rocha e vigas largas nas
 * bordas, estalactites, raízes e poeira caindo). As cores vêm de BiomeLook.
 *
 * As camadas são mais largas que a tela (560 contra 480): o que importa fica entre x = 40 e 520.
 * No plano médio o miolo da tela fica escuro e discreto; lampiões, cristais e vagonetes ficam nos
 * terços de fora, para o jogador e as plataformas continuarem sendo o que mais se lê.
 */

const CRYSTAL = 0x4ae0d0;
const CRYSTAL_SOFT = 0x1a7a78;
const CRYSTAL_DEEP = 0x0d4a4c;
const CRYSTAL_TIP = 0xc8fff8;
/** Cor-base da madeira velha das escoras (misturada com a rampa do bioma). */
const WOOD_RAW = 0x2e1f12;
const WOOD_WARM = 0x9a6a38;
const IRON = 0x2a3038;
const IRON_LIGHT = 0x5a6470;

/** Meio da tela dentro da camada (a camada é centralizada), onde fica o jogador. */
const SCREEN_CENTER = 280;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** 1 nos terços de fora e ~0.35 no miolo da tela: quanto de brilho um enfeite pode ter naquele x. */
function outerness(x: number): number {
  return 0.35 + 0.65 * clamp01((Math.abs(x - SCREEN_CENTER) - 60) / 80);
}

// --- Madeira e ferragens ------------------------------------------------------------------

interface Wood {
  body: number;
  light: number;
  shade: number;
  grain: number;
}

/** Tons da madeira: `warm` (0 a 1) é quanto a luz quente pega na borda da peça. */
function woodTones(ramp: StoneRamp, warm: number): Wood {
  const body = mix(ramp.deep, WOOD_RAW, 0.75);
  return {
    body,
    light: mix(body, WOOD_WARM, 0.12 + 0.28 * warm),
    shade: mix(body, 0x000000, 0.45),
    grain: mix(body, 0x000000, 0.28),
  };
}

/** Tábua reta com borda iluminada de um lado, sombra do outro e veios da madeira. */
function plank(ctx: Ctx, rng: Rng, wood: Wood, x: number, y: number, w: number, h: number): void {
  rect(ctx, wood.body, x, y, w, h);
  if (h >= w) {
    rect(ctx, wood.light, x, y, 1, h);
    rect(ctx, wood.shade, x + w - 1, y, 1, h);
    for (let i = 0; i < Math.floor(h / 9); i++) {
      const gx = x + 1 + Math.floor(rng() * Math.max(1, w - 2));
      rect(ctx, wood.grain, gx, y + randomInt(rng, 0, Math.max(1, h - 6)), 1, randomInt(rng, 3, 8));
    }
  } else {
    rect(ctx, wood.light, x, y, w, 1);
    rect(ctx, wood.shade, x, y + h - 1, w, 1);
    for (let i = 0; i < Math.floor(w / 9); i++) {
      const gy = y + 1 + Math.floor(rng() * Math.max(1, h - 2));
      rect(ctx, wood.grain, x + randomInt(rng, 0, Math.max(1, w - 6)), gy, randomInt(rng, 3, 8), 1);
    }
  }
}

/** Viga inclinada de `thick` px (mão-francesa, viga caída): linhas paralelas com luz e sombra. */
function slantBeam(
  ctx: Ctx,
  wood: Wood,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thick: number,
): void {
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  for (let k = 0; k < thick; k++) {
    const color = k === 0 ? wood.light : k === thick - 1 ? wood.shade : wood.body;
    if (steep) line(ctx, color, x0 + k, y0, x1 + k, y1);
    else line(ctx, color, x0, y0 + k, x1, y1 + k);
  }
}

/** Ponta de madeira quebrada: lascas de alturas diferentes sobre `width` px. */
function splinters(ctx: Ctx, rng: Rng, wood: Wood, x: number, y: number, width: number): void {
  for (let i = 0; i < width; i++) {
    const up = randomInt(rng, 0, 5);
    rect(ctx, i % 3 === 0 ? wood.light : wood.body, x + i, y - up, 1, up + 1);
  }
}

/** Corrente pendurada (elos alternados) ou corda, de (x, y) para baixo. */
function chain(ctx: Ctx, color: number, x: number, y: number, len: number): void {
  for (let j = 0; j < len; j++) {
    const m = j % 4;
    if (m === 0 || m === 3) rect(ctx, color, x, y + j, 1, 1);
    else {
      rect(ctx, color, x - 1, y + j, 1, 1);
      rect(ctx, color, x + 1, y + j, 1, 1);
    }
  }
}

function rope(ctx: Ctx, color: number, x: number, y: number, len: number, sway: number): void {
  for (let j = 0; j < len; j++) {
    const dx = Math.round(Math.sin(j / 9) * sway);
    rect(ctx, color, x + dx, y + j, 1, 1);
    if (j % 5 === 0) rect(ctx, mix(color, 0x000000, 0.35), x + dx + 1, y + j, 1, 1);
  }
}

/** Brilho quente de lampião: miolo pequeno e forte, halos largos e fracos (sobrevivem à escuridão). */
function warmHalo(
  ctx: Ctx,
  look: BiomeLook,
  x: number,
  y: number,
  radius: number,
  k: number,
): void {
  disc(ctx, look.glowSoft, x, y, Math.round(radius * 1.5), 0.03 * k);
  disc(ctx, look.glow, x, y, radius, 0.045 * k);
  disc(ctx, look.glow, x, y, Math.round(radius * 0.55), 0.08 * k);
  disc(ctx, look.glow, x, y, Math.max(2, Math.round(radius * 0.25)), 0.14 * k);
}

/** Lampião de ferro pendurado por uma corrente: gaiola escura, chama no meio e o halo em volta. */
function lantern(
  ctx: Ctx,
  look: BiomeLook,
  x: number,
  top: number,
  len: number,
  k: number,
  linkColor: number,
): void {
  chain(ctx, linkColor, x, top, len);
  const y = top + len;
  rect(ctx, IRON, x - 3, y, 7, 1);
  rect(ctx, IRON_LIGHT, x - 3, y, 7, 1, 0.5);
  rect(ctx, IRON, x - 2, y - 1, 5, 1);
  rect(ctx, IRON, x - 3, y + 1, 1, 6);
  rect(ctx, IRON, x + 3, y + 1, 1, 6);
  rect(ctx, IRON, x - 3, y + 7, 7, 1);
  rect(ctx, look.glowSoft, x - 2, y + 1, 5, 6, 0.55 + 0.4 * k);
  rect(ctx, look.glow, x - 1, y + 2, 3, 4, 0.55 + 0.45 * k);
  rect(ctx, mix(look.glow, 0xffffff, 0.6), x, y + 3, 1, 2, 0.5 + 0.5 * k);
  warmHalo(ctx, look, x, y + 4, 24, k);
}

// --- Pedra, entulho e minério -------------------------------------------------------------

/** Pedra solta, de perfil arredondado, com topo iluminado e base na sombra. */
function boulder(
  ctx: Ctx,
  ramp: StoneRamp,
  x: number,
  base: number,
  rx: number,
  ry: number,
  tone: number,
): void {
  const body = mix(ramp.base, ramp.light, tone);
  for (let dy = 0; dy < ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - ((ry - dy) / ry) ** 2 * 0.98));
    const y = base - ry + dy;
    rect(ctx, body, x - half, y, half * 2 + 1, 1);
    rect(ctx, ramp.highlight, x - half, y, Math.max(1, half - 1), 1, dy < 2 ? 0.8 : 0.35);
    rect(
      ctx,
      ramp.deep,
      x + half - Math.max(1, Math.round(half / 3)),
      y,
      Math.round(half / 3),
      1,
      0.7,
    );
  }
}

/** Faísca de minério (ouro ou cristal) presa na rocha. */
function oreGlint(ctx: Ctx, look: BiomeLook, rng: Rng, x: number, y: number, k: number): void {
  if (rng() < 0.55) rect(ctx, look.mossLight, x, y, 1, 1, 0.55 * k);
  else {
    rect(ctx, CRYSTAL, x, y, 1, 1, 0.8 * k);
    rect(ctx, CRYSTAL_SOFT, x + 1, y, 1, 1, 0.6 * k);
  }
}

/** Monte de entulho de desabamento: massa escura triangular coberta de pedras com brilho de minério. */
function rubble(
  ctx: Ctx,
  look: BiomeLook,
  rng: Rng,
  x: number,
  base: number,
  width: number,
  height: number,
  glints: number,
): void {
  const ramp = look.back;
  for (let r = 0; r < height; r++) {
    const half = Math.round((width / 2) * (1 - (r / height) ** 1.4));
    rect(ctx, ramp.dark, x + width / 2 - half, base - r, half * 2, 1);
  }
  const rocks = Math.round((width * height) / 22);
  for (let i = 0; i < rocks; i++) {
    const px = x + rng() * width;
    const norm = Math.abs(px - (x + width / 2)) / (width / 2);
    const maxH = height * (1 - norm) ** 0.9;
    const py = base - rng() * maxH;
    const rw = randomInt(rng, 3, 8);
    const rh = randomInt(rng, 2, 5);
    const body = rng() < 0.5 ? ramp.base : ramp.light;
    rect(ctx, body, px, py, rw, rh);
    rect(ctx, ramp.highlight, px, py, rw - 1, 1, 0.7);
    rect(ctx, ramp.deep, px + 1, py + rh - 1, rw - 1, 1, 0.8);
  }
  for (let i = 0; i < glints; i++) {
    const px = x + width * (0.25 + rng() * 0.5);
    oreGlint(ctx, look, rng, px, base - rng() * height * 0.55 - 1, outerness(px));
  }
}

/**
 * Massa de rocha da parede com perfil irregular, estratos, facetas e veios de cristal. `crystal` é
 * quanto os veios brilham (0 a 1).
 */
function rockMass(
  ctx: Ctx,
  look: BiomeLook,
  rng: Rng,
  x: number,
  base: number,
  width: number,
  height: number,
  crystal: number,
): void {
  const ramp = look.back;
  const body = mix(ramp.base, ramp.light, 0.55);
  const tops: number[] = [];
  for (let i = 0; i < width; i++) {
    const u = i / Math.max(1, width - 1);
    const bell = Math.sin(Math.PI * u) ** 0.65;
    const jag =
      (noise2(i >> 1, x) - 0.5) * height * 0.22 + (noise2(i >> 3, x + 9) - 0.5) * height * 0.3;
    const top = Math.round(base - height * (0.12 + 0.88 * bell) + jag * bell);
    tops.push(top);
    rect(ctx, body, x + i, top, 1, base - top);
    rect(ctx, ramp.light, x + i, top, 1, 1, 0.8);
    if (i < width * 0.4) rect(ctx, ramp.base, x + i, top + 1, 1, 2, 0.6);
  }
  // Estratos e rachaduras
  for (let n = 0; n < Math.round(height / 6); n++) {
    const i = randomInt(rng, 0, width - 10);
    const sy = base - randomInt(rng, 6, height);
    const len = randomInt(rng, 8, 26);
    for (let s = 0; s < len; s++) {
      const col = tops[i + s];
      if (col !== undefined && sy > col + 1) {
        rect(
          ctx,
          rng() < 0.5 ? ramp.deep : ramp.base,
          x + i + s,
          sy + (s > len / 2 ? 1 : 0),
          1,
          1,
          0.55,
        );
      }
    }
  }
  // Facetas claras (a luz dos lampiões pega nas quinas)
  for (let n = 0; n < Math.round(width / 12); n++) {
    const i = randomInt(rng, 2, width - 6);
    const col = tops[i] ?? base;
    const fy = col + randomInt(rng, 3, Math.max(4, base - col - 6));
    rect(ctx, ramp.highlight, x + i, fy, randomInt(rng, 2, 5), 1, 0.5);
    rect(ctx, ramp.base, x + i, fy + 1, randomInt(rng, 3, 7), 1, 0.45);
  }
  // Veios de cristal: caminhos tortos que brilham no meio da rocha
  const veins = crystal > 0 ? randomInt(rng, 2, 4) : 0;
  for (let v = 0; v < veins; v++) {
    let vx = randomInt(rng, 4, width - 4);
    let vy = (tops[vx] ?? base) + randomInt(rng, 6, Math.max(8, height - 20));
    const dir = rng() < 0.5 ? -1 : 1;
    const steps = randomInt(rng, 14, 34);
    for (let s = 0; s < steps; s++) {
      vx += dir * (rng() < 0.7 ? 1 : 0);
      vy += rng() < 0.45 ? 1 : rng() < 0.3 ? -1 : 0;
      const col = tops[vx];
      if (col === undefined || vy <= col + 1 || vy >= base) break;
      rect(ctx, CRYSTAL_DEEP, x + vx, vy, 1, 2, 0.9 * crystal);
      rect(ctx, CRYSTAL_SOFT, x + vx, vy, 1, 1, crystal);
      if (s % 5 === 2) {
        rect(ctx, CRYSTAL, x + vx, vy, 1, 1, crystal);
        disc(ctx, CRYSTAL, x + vx, vy, 5, 0.05 * crystal);
      }
    }
  }
}

/** Cacho de cristais saindo da rocha: hastes inclinadas de pontas claras, com um brilho em volta. */
function crystalCluster(
  ctx: Ctx,
  rng: Rng,
  x: number,
  base: number,
  size: number,
  strength = 1,
): void {
  disc(ctx, CRYSTAL, x, base - size / 2, Math.round(size * 1.5), 0.035 * strength);
  disc(ctx, CRYSTAL, x, base - size / 2, size, 0.06 * strength);
  for (let i = 0; i < 4; i++) {
    const lean = randomInt(rng, -3, 3);
    const height = Math.round(size * (0.5 + rng() * 0.6));
    for (let y = 0; y < height; y++) {
      const dx = Math.round((lean * y) / height);
      const w = Math.max(1, 3 - Math.floor((y / height) * 3));
      const cx = x + i * 2 - 3 + dx;
      rect(ctx, y > height - 3 ? CRYSTAL_TIP : CRYSTAL, cx, base - y, w, 1, 0.9 * strength);
      rect(ctx, CRYSTAL_SOFT, cx + w - 1, base - y, 1, 1, 0.8 * strength);
    }
  }
  rect(ctx, CRYSTAL_DEEP, x - 4, base, 9, 1, 0.8);
}

// --- Escoramentos, trilhos e ferramentas --------------------------------------------------

/**
 * Escoramento: dois postes, viga por cima, mãos-francesas e travessa no meio, sobre sapatas de
 * pedra. Se `broken`, o poste da direita quebrou e a viga cedeu até ele.
 */
function supportFrame(
  ctx: Ctx,
  ramp: StoneRamp,
  wood: Wood,
  rng: Rng,
  x: number,
  base: number,
  width: number,
  height: number,
  broken: boolean,
): void {
  const post = Math.max(5, Math.round(width / 13));
  const top = base - height;
  const brace = Math.round(width / 5);
  for (const fx of [x, x + width - post]) {
    rect(ctx, ramp.base, fx - 2, base - 4, post + 4, 4);
    rect(ctx, ramp.light, fx - 2, base - 4, post + 4, 1, 0.8);
  }
  plank(ctx, rng, wood, x, top, post, height - 4);
  const stump = Math.round(height * 0.42);
  if (broken) {
    plank(ctx, rng, wood, x + width - post, base - stump, post, stump - 4);
    splinters(ctx, rng, wood, x + width - post, base - stump, post);
    plank(ctx, rng, wood, x - post - 3, top - post, Math.round(width * 0.62), post);
    // A viga cedeu: o pedaço da direita despenca até o toco do poste
    slantBeam(
      ctx,
      wood,
      x + Math.round(width * 0.6),
      top - post,
      x + width + post,
      base - stump - 3,
      post - 1,
    );
    splinters(ctx, rng, wood, x + Math.round(width * 0.58), top - post + 2, 4);
  } else {
    plank(ctx, rng, wood, x + width - post, top, post, height - 4);
    plank(ctx, rng, wood, x - post - 3, top - post, width + post * 2 + 6, post);
    slantBeam(ctx, wood, x + width - post, top + brace, x + width - post - brace, top, 3);
  }
  slantBeam(ctx, wood, x + post, top + brace, x + post + brace, top, 3);
  // Travessa no meio e um contraventamento em X embaixo
  const mid = top + Math.round(height * 0.5);
  plank(ctx, rng, wood, x + post, mid, width - post * 2, Math.max(3, post - 2));
  if (!broken) slantBeam(ctx, wood, x + post, mid + 4, x + width - post, base - 8, 3);
  // Pregos e lascas
  for (let i = 0; i < 3; i++) {
    rect(
      ctx,
      mix(wood.light, 0xffffff, 0.2),
      x + 1 + (i % 2) * (post - 3),
      top + 6 + i * 22,
      1,
      1,
      0.8,
    );
  }
}

/** Trilhos de lado: dormentes, duas linhas de ferro e um vão onde o chão cedeu (se `gap` > 0). */
function railTrack(
  ctx: Ctx,
  ramp: StoneRamp,
  wood: Wood,
  y: number,
  w: number,
  gapX: number,
  gap: number,
): void {
  const rail = mix(ramp.light, IRON_LIGHT, 0.35);
  for (let x = 4; x < w; x += 12) {
    if (gap > 0 && x > gapX - 4 && x < gapX + gap) continue;
    rect(ctx, wood.body, x, y + 2, 7, 3);
    rect(ctx, wood.light, x, y + 2, 7, 1, 0.7);
  }
  for (let x = 0; x < w; x++) {
    if (gap > 0 && x >= gapX && x < gapX + gap) continue;
    rect(ctx, rail, x, y, 1, 1);
    rect(ctx, ramp.deep, x, y + 1, 1, 1);
    if (x % 17 === 0) rect(ctx, ramp.highlight, x, y, 1, 1, 0.9);
  }
  if (gap > 0) {
    // Pontas do trilho entortadas, apontando para cima
    line(ctx, rail, gapX, y, gapX + 4, y - 3);
    line(ctx, rail, gapX + gap, y, gapX + gap - 3, y - 2);
  }
}

/** Roda de vagonete: aro de ferro, miolo escuro e raios. */
function cartWheel(ctx: Ctx, ramp: StoneRamp, x: number, y: number): void {
  disc(ctx, mix(ramp.light, IRON_LIGHT, 0.3), x, y, 4);
  disc(ctx, ramp.deep, x, y, 2);
  rect(ctx, ramp.highlight, x - 4, y - 1, 9, 1, 0.5);
  rect(ctx, IRON_LIGHT, x, y, 1, 1);
}

/** Vagonete de minério: em pé e cheio, ou tombado de lado com a carga espalhada no chão. */
function minecart(
  ctx: Ctx,
  look: BiomeLook,
  rng: Rng,
  x: number,
  base: number,
  tipped: boolean,
): void {
  const ramp = look.back;
  const metal = mix(ramp.base, IRON, 0.5);
  const metalLight = mix(metal, IRON_LIGHT, 0.55);
  if (!tipped) {
    const top = base - 20;
    for (let r = 0; r < 14; r++) {
      const inset = Math.round(r / 5);
      rect(ctx, metal, x + inset, top + 4 + r, 34 - inset * 2, 1);
    }
    rect(ctx, metalLight, x - 1, top + 3, 36, 2);
    rect(ctx, ramp.deep, x - 1, top + 5, 36, 1, 0.8);
    rect(ctx, ramp.deep, x + 4, top + 8, 26, 1, 0.5);
    for (let i = 0; i < 6; i++) rect(ctx, metalLight, x + 3 + i * 6, top + 6, 1, 1, 0.8);
    cartWheel(ctx, ramp, x + 8, base - 3);
    cartWheel(ctx, ramp, x + 26, base - 3);
    rubble(ctx, look, rng, x + 1, top + 4, 32, 10, 5);
    return;
  }
  // De cabeça para baixo: o aro no chão, as rodas para o alto e a carga espalhada ao lado
  for (let r = 0; r < 18; r++) {
    const inset = Math.round((17 - r) / 5);
    rect(ctx, metal, x + inset, base - 18 + r, 34 - inset * 2, 1);
  }
  rect(ctx, metalLight, x + 3, base - 19, 28, 1);
  rect(ctx, metalLight, x - 1, base - 2, 36, 2);
  rect(ctx, ramp.deep, x + 5, base - 12, 24, 1, 0.6);
  for (let i = 0; i < 5; i++) rect(ctx, metalLight, x + 4 + i * 6, base - 8, 1, 1, 0.8);
  rect(ctx, metalLight, x + 3, base - 22, 29, 1);
  cartWheel(ctx, ramp, x + 3, base - 22);
  cartWheel(ctx, ramp, x + 31, base - 22);
  rubble(ctx, look, rng, x + 32, base, 46, 9, 7);
  // Uma roda que soltou e rolou
  disc(ctx, ramp.light, x - 14, base - 3, 3);
  disc(ctx, ramp.deep, x - 14, base - 3, 1);
}

/** Picareta encostada: cabo de madeira e cabeça de ferro curva. */
function pickaxe(
  ctx: Ctx,
  wood: Wood,
  ramp: StoneRamp,
  x: number,
  base: number,
  lean: number,
): void {
  const tx = x + lean;
  const ty = base - 26;
  line(ctx, wood.body, x, base, tx, ty);
  line(ctx, wood.light, x + 1, base, tx + 1, ty, 0.6);
  const head = mix(ramp.light, IRON_LIGHT, 0.5);
  line(ctx, head, tx - 7, ty + 4, tx - 3, ty - 1);
  line(ctx, head, tx - 3, ty - 1, tx + 3, ty - 1);
  line(ctx, head, tx + 3, ty - 1, tx + 7, ty + 4);
  rect(ctx, IRON_LIGHT, tx - 2, ty - 1, 4, 1, 0.8);
}

/** Cesto de vime com minério dentro. */
function basket(ctx: Ctx, look: BiomeLook, rng: Rng, x: number, base: number): void {
  const wood = woodTones(look.back, 0.3);
  const weaveA = mix(wood.body, WOOD_WARM, 0.18);
  const weaveB = mix(wood.body, 0x000000, 0.2);
  for (let r = 0; r < 11; r++) {
    const inset = Math.floor((10 - r) / 5);
    for (let c = inset; c < 13 - inset; c++) {
      rect(ctx, (c + r) % 2 === 0 ? weaveA : weaveB, x + c, base - r - 1, 1, 1);
    }
  }
  rect(ctx, wood.light, x - 1, base - 12, 15, 1);
  rect(ctx, wood.shade, x - 1, base - 11, 15, 1);
  rubble(ctx, look, rng, x, base - 12, 13, 5, 2);
}

/** Caixote de madeira com tábuas cruzadas. */
function crate(ctx: Ctx, rng: Rng, wood: Wood, x: number, base: number, size: number): void {
  plank(ctx, rng, wood, x, base - size, size, size);
  rect(ctx, wood.shade, x + 2, base - size + 2, size - 4, 1);
  rect(ctx, wood.shade, x + 2, base - 3, size - 4, 1);
  slantBeam(ctx, wood, x + 2, base - size + 3, x + size - 3, base - 4, 1);
}

// --- Distante -----------------------------------------------------------------------------

/**
 * A galeria do fundo em perspectiva: ponto de fuga um pouco à direita do meio e acima da faixa do
 * jogador, para a luz do fim do túnel não ficar atrás dele. Distâncias em "z" (1 = perto, `end` =
 * o fim, onde está a luz); a tela é x = vx + X * halfWidth / z.
 */
const TUNNEL = { vx: 338, vy: 112, halfWidth: 250, ceiling: 170, floor: 126, end: 15 } as const;

/** Cor da parede do túnel a uma distância z: escura perto, quente perto da luz do fim. */
function tunnelShade(look: BiomeLook, z: number): number {
  const lit = clamp01((z - 0.75) / (TUNNEL.end - 0.75)) ** 1.25;
  const near = mix(look.back.base, look.skyMid, 0.45);
  const far = mix(look.skyLow, look.glow, 0.22);
  return mix(near, far, lit);
}

/** Cor de um pixel do túnel: parede, teto ou chão conforme a direção a partir do ponto de fuga. */
function tunnelColor(look: BiomeLook, x: number, y: number): number {
  const { vx, vy, halfWidth, ceiling, floor, end } = TUNNEL;
  const dx = x + 0.5 - vx;
  const dy = y + 0.5 - vy;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const lim = dy < 0 ? ceiling : floor;
  const onWall = ax * lim >= ay * halfWidth;
  const z = onWall ? halfWidth / Math.max(ax, 0.001) : lim / Math.max(ay, 0.001);
  if (z >= end) {
    // A abertura do fim do túnel, de onde vem a luz
    const t = clamp01(Math.hypot(dx / 17, dy / 10)) ** 1.2;
    return mix(mix(look.glow, 0xfff4d0, 0.55), tunnelShade(look, end), t);
  }
  let base = tunnelShade(look, z);
  if (!onWall && dy < 0) base = mix(base, 0x000000, 0.4);
  else if (!onWall) base = mix(base, 0x2a2016, 0.22);
  const grain = noise2(x >> 1, y >> 1);
  // Estratos em perspectiva: faixas da rocha que convergem para o ponto de fuga
  const strata = noise2(Math.floor(((onWall ? dy : dx) * z) / 7), onWall ? 7 : 11);
  const t = (grain - 0.5) * 0.5 + (strata - 0.5) * 0.4;
  return t > 0 ? mix(base, look.back.highlight, t * 0.55) : mix(base, 0x000000, -t * 0.85);
}

function tunnelX(side: number, z: number): number {
  return TUNNEL.vx + (side * TUNNEL.halfWidth) / z;
}
function tunnelCeilingY(z: number): number {
  return TUNNEL.vy - TUNNEL.ceiling / z;
}
function tunnelFloorY(z: number): number {
  return TUNNEL.vy + TUNNEL.floor / z;
}

/** Escora da galeria à distância z: dois postes e a viga, em silhueta contra a parede. */
function tunnelFrame(ctx: Ctx, look: BiomeLook, rng: Rng, z: number, broken: boolean): void {
  const { vx, vy, halfWidth, ceiling } = TUNNEL;
  const wall = tunnelShade(look, z);
  const tint = mix(0x4a3320, 0x120a05, clamp01((z - 2) / 6));
  const body = mix(wall, tint, 0.62);
  const edge = mix(body, look.glow, 0.2 + 0.2 * clamp01(z / 8));
  const hw = (halfWidth * 0.9) / z;
  const top = vy - (ceiling * 0.86) / z;
  const bottom = tunnelFloorY(z);
  const thick = Math.max(1, Math.round((halfWidth * 0.075) / z));
  const thickH = Math.max(1, Math.round((ceiling * 0.07) / z));
  const left = Math.round(vx - hw);
  const right = Math.round(vx + hw);
  rect(ctx, body, left - thick, top, thick, bottom - top);
  rect(ctx, edge, left, top, 1, bottom - top, 0.7);
  if (!broken) {
    rect(ctx, body, right, top, thick, bottom - top);
    rect(ctx, edge, right, top, 1, bottom - top, 0.7);
    rect(ctx, body, left - thick, top - thickH, right - left + thick * 2, thickH);
    rect(ctx, edge, left - thick, top - thickH, right - left + thick * 2, 1, 0.8);
    const brace = Math.round(hw * 0.22);
    line(ctx, body, right, top + brace, right - brace, top);
  } else {
    // Poste da direita partido ao meio e a viga caída até ele
    const stump = Math.round((bottom - top) * 0.4);
    rect(ctx, body, right, bottom - stump, thick, stump);
    rect(ctx, body, left - thick, top - thickH, Math.round((right - left) * 0.55), thickH);
    line(ctx, body, vx, top - thickH, right + thick, bottom - stump);
    line(ctx, edge, vx, top - thickH, right + thick, bottom - stump, 0.6);
    for (let i = 0; i < thick; i++)
      rect(ctx, body, right + i, bottom - stump - randomInt(rng, 0, 3), 1, 3);
  }
  const brace = Math.round(hw * 0.22);
  line(ctx, body, left, top + brace, left + brace, top);
}

/** Galeria lateral: uma boca escura aberta na parede entre duas distâncias z. */
function sideGallery(ctx: Ctx, look: BiomeLook, side: number, zNear: number, zFar: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.55);
  const x0 = Math.round(tunnelX(side, zNear));
  const x1 = Math.round(tunnelX(side, zFar));
  const step = x0 < x1 ? 1 : -1;
  for (let x = x0; x !== x1; x += step) {
    const z = TUNNEL.halfWidth / Math.abs(x - TUNNEL.vx);
    const arch = Math.abs((x - x0) / (x1 - x0) - 0.5) * 2;
    const y0 = TUNNEL.vy - (TUNNEL.ceiling * (0.5 - arch ** 3 * 0.18)) / z;
    rect(ctx, dark, x, y0, 1, tunnelFloorY(z) - y0);
    rect(ctx, mix(tunnelShade(look, z), look.glowSoft, 0.12), x, y0 - 1, 1, 1, 0.8);
  }
}

/** Estalactite vista da galeria: triângulo escuro pendurado no teto. */
function tunnelStalactite(ctx: Ctx, look: BiomeLook, rng: Rng, z: number): void {
  const X = rng() * 1.8 - 0.9;
  const x = TUNNEL.vx + (X * TUNNEL.halfWidth) / z;
  const y0 = tunnelCeilingY(z);
  const len = ((0.1 + rng() * 0.28) * TUNNEL.ceiling) / z;
  const wide = Math.max(1, Math.round(((0.04 + rng() * 0.05) * TUNNEL.halfWidth) / z));
  const color = mix(tunnelShade(look, z), 0x000000, 0.45);
  for (let j = 0; j < len; j++) {
    const half = Math.round(wide * (1 - j / len));
    rect(ctx, color, x - half, y0 + j, half * 2 + 1, 1);
  }
  rect(ctx, mix(color, look.glow, 0.25), x, y0 + len - 1, 1, 1, 0.6);
}

export function farMinas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const { vx, vy, halfWidth, ceiling, floor, end } = TUNNEL;
  const image = ctx.createImageData(w, h);
  const data = image.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = tunnelColor(look, x, y);
      const i = (y * w + x) * 4;
      data[i] = (color >> 16) & 0xff;
      data[i + 1] = (color >> 8) & 0xff;
      data[i + 2] = color & 0xff;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Galerias laterais que se abrem na parede
  sideGallery(ctx, look, -1, 2.5, 3.9);
  sideGallery(ctx, look, 1, 5.2, 7.4);

  // Trilhos no chão da galeria, com dormentes cada vez mais próximos
  const rail = mix(tunnelShade(look, 3), IRON_LIGHT, 0.4);
  const sleeper = mix(tunnelShade(look, 3), 0x3a2818, 0.5);
  for (let z = 1.1; z < end; z *= 1.2) {
    const half = (0.34 * halfWidth) / z;
    rect(ctx, sleeper, vx - half, tunnelFloorY(z), half * 2, Math.max(1, Math.round(4 / z)), 0.85);
  }
  for (const side of [-0.24, 0.24]) {
    line(
      ctx,
      rail,
      tunnelX(side, 1.1),
      tunnelFloorY(1.1),
      tunnelX(side, end),
      tunnelFloorY(end),
      0.85,
    );
  }

  // Veios minerais na parede: ouro e cristal, com pontos que brilham
  for (let v = 0; v < 12; v++) {
    const side = v % 2 === 0 ? -1 : 1;
    const z0 = 1.8 + rng() * 7;
    let x = tunnelX(side, z0);
    let y = vy + (rng() - 0.55) * (ceiling / z0) * 0.9;
    const gold = v % 3 === 0;
    for (let s = 0; s < 8 + rng() * 22; s++) {
      x += side * (rng() < 0.6 ? 1 : 0) * 0.7 + (rng() < 0.2 ? -side : 0);
      y += rng() < 0.5 ? 1 : rng() < 0.4 ? -1 : 0;
      rect(ctx, gold ? look.mossLight : CRYSTAL_SOFT, x, y, 1, 1, gold ? 0.45 : 0.6);
      if (s % 6 === 3) {
        rect(ctx, gold ? look.glow : CRYSTAL, x, y, 1, 1, 0.85);
        disc(ctx, gold ? look.glow : CRYSTAL, x, y, 4, 0.04);
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const z = 1.5 + rng() * 9;
    const x = tunnelX(side, z) + side * rng() * 22;
    rect(ctx, CRYSTAL_SOFT, x, vy + (rng() - 0.5) * (floor / z) * 1.6, 1, 1, 0.45);
  }

  // Estalactites no teto, das distantes para as próximas
  for (let z = 13; z > 1.2; z *= 0.82) {
    for (let n = 0; n < 3; n++) tunnelStalactite(ctx, look, rng, z);
  }

  // Escoras da galeria, em perspectiva recuando; algumas já cederam
  for (const [z, broken] of [
    [11.5, false],
    [8.2, false],
    [5.8, true],
    [4.1, false],
    [2.9, false],
  ] as const) {
    tunnelFrame(ctx, look, rng, z, broken);
  }

  // Lampiões pendurados ao longo da galeria (pontos quentes cada vez maiores perto de nós)
  for (const [z, side] of [
    [8.2, -1],
    [5.8, 1],
    [4.1, -1],
    [2.9, 1],
  ] as const) {
    const lx = tunnelX(side * 0.6, z);
    const ly = tunnelCeilingY(z) + (ceiling * 0.2) / z;
    warmHalo(ctx, look, lx, ly, Math.round(30 / z) + 5, 0.9);
    rect(ctx, look.glow, lx - 1, ly, 2, 3, 0.9);
    rect(ctx, mix(look.glow, 0xffffff, 0.5), lx, ly + 1, 1, 1);
  }

  // A luz do fim do túnel: miolo pequeno, halos largos e raios abertos em leque
  warmHalo(ctx, look, vx, vy, 26, 1.1);
  rect(ctx, mix(look.glow, 0xffffff, 0.7), vx - 2, vy - 3, 5, 6, 0.9);
  for (let r = 0; r < 7; r++) {
    const angle = Math.PI * (0.62 + r * 0.13);
    for (let d = 8; d < 150; d += 2) {
      const rw = 1 + Math.floor(d / 22);
      rect(
        ctx,
        look.shaft,
        vx + Math.cos(angle) * d,
        vy + Math.sin(angle) * d * 0.9,
        rw,
        2,
        0.03 * (1 - d / 170),
      );
    }
  }

  // Feixe de poeira que cai de uma fresta do teto, à esquerda
  const beamX = 118;
  for (let y = 0; y < 214; y++) {
    const bx = beamX + y * 0.42;
    const bw = 16 + y * 0.09;
    rect(ctx, look.shaft, bx, y, bw, 1, 0.05 * (1 - y / 280));
    rect(ctx, look.shaft, bx + 2, y, bw - 4, 1, 0.02 * (1 - y / 280));
    if (y % 3 === 0) rect(ctx, look.shaft, bx, y, 1, 1, 0.05);
  }
  for (let i = 0; i < 26; i++) {
    const y = randomInt(rng, 6, 200);
    rect(ctx, look.shaft, beamX + y * 0.42 + rng() * (16 + y * 0.09), y, 1, 1, 0.25 + rng() * 0.3);
  }
  rect(ctx, look.shaft, beamX + 214 * 0.42 - 6, 212, 36, 2, 0.05);

  // Névoa de poeira rasteira e brilhos de cristal soltos
  for (let i = 0; i < 12; i++)
    rect(ctx, look.fog, 0, 160 + i * 6, w, 6, 0.045 * Math.sin((i / 11) * Math.PI));
  for (let i = 0; i < 18; i++) {
    const x = randomInt(rng, 0, w);
    const y = randomInt(rng, 20, 230);
    rect(ctx, CRYSTAL_SOFT, x, y, 1, 1, 0.5);
  }
}

// --- Médio --------------------------------------------------------------------------------

export function midMinas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const ramp = look.back;
  const floorY = h - 40;
  const wood = woodTones(ramp, 0.5);
  const woodCenter = woodTones(ramp, 0.1);
  const chainColor = mix(ramp.light, IRON_LIGHT, 0.3);

  // Teto de rocha irregular, com a escora de madeira que o segura por baixo
  const ceilingRock = mix(ramp.dark, ramp.deep, 0.45);
  for (let x = 0; x < w; x++) {
    const depth = 14 + Math.round(noise2(x >> 2, 1) * 12 + noise2(x >> 4, 2) * 10);
    rect(ctx, ceilingRock, x, 0, 1, depth);
    rect(ctx, ramp.light, x, depth, 1, 1, 0.45);
  }
  // Tábuas do forro entre o teto e a viga-mestra
  for (let x = 6; x < w; x += 5) {
    if (rng() < 0.82) rect(ctx, rng() < 0.5 ? wood.body : wood.shade, x, 22, 3, 14);
  }
  const lintelY = 34;
  for (let x = -20; x < w;) {
    const len = randomInt(rng, 60, 110);
    plank(ctx, rng, x > 190 && x < 360 ? woodCenter : wood, x, lintelY, len - 2, 7);
    x += len;
  }

  // Massas de rocha da parede com veios de cristal (nos terços de fora) e uma escura no meio
  rockMass(ctx, look, rng, 70, floorY + 12, 96, 150, 1);
  rockMass(ctx, look, rng, 400, floorY + 12, 112, 134, 1);
  rockMass(ctx, look, rng, 232, floorY + 12, 50, 56, 0);

  // Escoramentos ao longo da galeria; o do meio, mais escuro, está quebrado
  supportFrame(ctx, ramp, wood, rng, 118 + randomInt(rng, -6, 6), floorY + 8, 92, 150, false);
  supportFrame(ctx, ramp, woodCenter, rng, 296 + randomInt(rng, -6, 6), floorY + 8, 88, 142, true);
  supportFrame(ctx, ramp, wood, rng, 468 + randomInt(rng, -6, 6), floorY + 8, 84, 148, false);
  // Uma viga caída atravessada no chão
  slantBeam(ctx, woodCenter, 192, floorY + 6, 232, floorY - 14, 6);
  splinters(ctx, rng, woodCenter, 230, floorY - 13, 5);

  // Chão de terra batida e trilhos, com um trecho arrebentado
  const ground = mix(ramp.dark, ramp.deep, 0.4);
  for (let x = 0; x < w; x++) {
    const top = floorY + 11 + Math.round(noise2(x >> 1, 4) * 3);
    rect(ctx, ground, x, top, 1, h - top);
    rect(ctx, ramp.light, x, top, 1, 1, 0.4);
  }
  for (let i = 0; i < 40; i++) {
    rect(
      ctx,
      ramp.base,
      randomInt(rng, 0, w),
      floorY + randomInt(rng, 14, 40),
      randomInt(rng, 1, 4),
      1,
      0.6,
    );
  }
  railTrack(ctx, ramp, wood, floorY + 8, w, 214, 26);

  // Vagonete tombado, com minério espalhado, à esquerda; outro cheio, à direita
  minecart(ctx, look, rng, 150, floorY + 8, true);
  minecart(ctx, look, rng, 394, floorY + 8, false);

  // Entulho de desabamento e pedras grandes
  rubble(ctx, look, rng, 22, floorY + 12, 76, 26, 6);
  rubble(ctx, look, rng, 248, floorY + 12, 40, 12, 1);
  rubble(ctx, look, rng, 470, floorY + 12, 80, 30, 7);
  boulder(ctx, ramp, 106, floorY + 12, 9, 9, 0.5);
  boulder(ctx, ramp, 330, floorY + 12, 8, 7, 0.4);
  boulder(ctx, ramp, 456, floorY + 12, 7, 6, 0.5);

  // Ferramentas, cestos e caixotes
  pickaxe(ctx, wood, ramp, 92, floorY + 12, 8);
  pickaxe(ctx, woodCenter, ramp, 372, floorY + 12, -7);
  basket(ctx, look, rng, 64, floorY + 12);
  basket(ctx, look, rng, 502, floorY + 12);
  crate(ctx, rng, woodCenter, 304, floorY + 12, 12);
  crate(ctx, rng, wood, 520, floorY + 12, 14);
  crate(ctx, rng, wood, 528, floorY - 2, 10);

  // Cristais brilhando junto da rocha e do chão, nos terços de fora
  crystalCluster(ctx, rng, 112, floorY + 4, 17, 1);
  crystalCluster(ctx, rng, 92, floorY - 52, 12, 1);
  crystalCluster(ctx, rng, 444, floorY - 24, 15, 1);
  crystalCluster(ctx, rng, 482, floorY - 60, 12, 0.9);
  crystalCluster(ctx, rng, 340, floorY + 10, 7, 0.5);

  // Correntes e cordas penduradas da viga-mestra, e os lampiões (os do meio, mais fracos)
  for (const [x, len, strength] of [
    [74, 30, 1],
    [186, 22, 0.6],
    [284, 26, 0.35],
    [398, 34, 0.9],
    [506, 24, 1],
  ] as const) {
    lantern(ctx, look, x, lintelY + 6, len, strength * outerness(x), chainColor);
  }
  rope(ctx, wood.grain, 150, lintelY + 6, 54, 2);
  rope(ctx, wood.grain, 152, lintelY + 6, 38, 2);
  chain(ctx, chainColor, 340, lintelY + 6, 40);
  chain(ctx, chainColor, 456, lintelY + 6, 18);
  rect(ctx, IRON, 453, lintelY + 24, 7, 2); // gancho solto na ponta da corrente
  rect(ctx, IRON_LIGHT, 453, lintelY + 24, 7, 1, 0.5);

  // Poeira rasteira no chão
  for (let i = 0; i < 20; i++) rect(ctx, look.fog, 0, h - 90 + i * 3, w, 3, 0.012 * (i / 2));
}

// --- Primeiro plano -----------------------------------------------------------------------

/** Pilar de rocha da borda: perfil que engorda para baixo, facetas e uma luz de quina quente. */
function edgePillar(
  ctx: Ctx,
  look: BiomeLook,
  rng: Rng,
  side: number,
  w: number,
  h: number,
  dark: number,
): void {
  const ramp = look.back;
  const seed = side < 0 ? 3 : 17;
  for (let y = 0; y < h; y++) {
    const swell = Math.sin(y / 23 + seed) * 8 + (noise2(y >> 1, seed) - 0.5) * 12;
    const edge = Math.round(88 + swell + (y / h) ** 2 * 28);
    const x = side < 0 ? -2 : w - edge;
    rect(ctx, dark, x, y, edge + 2, 1);
    const rimX = side < 0 ? edge - 1 : w - edge;
    if (noise2(y, seed + 5) > 0.35) rect(ctx, look.glowSoft, rimX, y, 1, 1, 0.22);
    // Facetas: placas de rocha só um pouco mais claras
    if (y % 5 === 0 && noise2(y, seed + 9) > 0.4) {
      const fx = side < 0 ? edge - randomInt(rng, 14, 44) : w - edge + randomInt(rng, 6, 30);
      rect(ctx, ramp.light, fx, y, randomInt(rng, 5, 16), 1, 0.6);
      rect(ctx, ramp.base, fx + 1, y + 1, randomInt(rng, 4, 12), 2, 0.55);
    }
  }
  // Blocos soltos na quina de baixo
  for (let i = 0; i < 4; i++) {
    const bx = side < 0 ? randomInt(rng, 70, 110) : w - randomInt(rng, 78, 118);
    const by = h - randomInt(rng, 16, 70);
    rect(ctx, dark, bx, by, randomInt(rng, 8, 18), randomInt(rng, 6, 12));
  }
}

/** Raiz que pende do teto: caminho tremido com fios finos saindo dos lados. */
function hangingRoot(ctx: Ctx, rng: Rng, x: number, len: number, color: number): void {
  let cx = x;
  for (let i = 0; i < len; i++) {
    if (rng() < 0.28) cx += rng() < 0.5 ? -1 : 1;
    rect(ctx, color, cx, i, i < len * 0.3 ? 2 : 1, 1);
    if (i > 8 && i % 9 === 0 && rng() < 0.7) {
      const dir = rng() < 0.5 ? -1 : 1;
      for (let s = 1; s < randomInt(rng, 3, 8); s++)
        rect(ctx, color, cx + dir * s, i + (s >> 1), 1, 1);
    }
  }
}

export function nearMinas(ctx: Ctx, look: BiomeLook, rng: Rng, w: number, h: number): void {
  const dark = mix(look.back.deep, 0x000000, 0.4);
  const wood: Wood = {
    body: mix(dark, WOOD_RAW, 0.28),
    light: mix(dark, WOOD_WARM, 0.2),
    shade: mix(dark, 0x000000, 0.5),
    grain: mix(dark, 0x000000, 0.3),
  };

  // Pilares de rocha nas duas bordas (a camada é larga: a parte útil começa em x = 40)
  edgePillar(ctx, look, rng, -1, w, h, dark);
  edgePillar(ctx, look, rng, 1, w, h, dark);

  // Viga larga na frente, apoiada no pilar da esquerda; e uma quebrada despencando na direita
  plank(ctx, rng, wood, 0, 56, 188, 11);
  slantBeam(ctx, wood, 0, 66, 188, 70, 3);
  plank(ctx, rng, wood, 100, 56, 12, 150);
  rect(ctx, dark, 94, 205, 24, 10);
  slantBeam(ctx, wood, w, 14, w - 150, 112, 10);
  splinters(ctx, rng, wood, w - 152, 111, 9);
  chain(ctx, mix(dark, IRON_LIGHT, 0.25), w - 124, 74, 30);

  // Estalactites no teto: mais longas e densas nas pontas, curtas sobre o miolo da tela
  for (let x = 0; x < w; x += randomInt(rng, 5, 11)) {
    const center = Math.abs(x - SCREEN_CENTER) < 90;
    const len = randomInt(rng, 8, center ? 24 : 54);
    const wide = randomInt(rng, 2, center ? 3 : 5);
    for (let j = 0; j < len; j++) {
      const half = Math.max(0, Math.round(wide * (1 - j / len) ** 0.8));
      rect(ctx, dark, x - half, j, half * 2 + 1, 1);
    }
    rect(ctx, look.back.light, x - wide + 1, 0, 1, Math.min(len, 10), 0.28);
  }
  rect(ctx, dark, 0, 0, w, 6);

  // Raízes que pendem do teto
  for (const x of [58, 132, 214, 366, 446, 524]) {
    hangingRoot(ctx, rng, x, randomInt(rng, 36, 96), mix(dark, 0x3a2a1a, 0.22));
  }

  // Poeira e pedrisco caindo de uma fresta, e partículas soltas no ar
  for (const cx of [196, 380]) {
    for (let i = 0; i < 9; i++) {
      const y = randomInt(rng, 18, 120);
      rect(ctx, look.fog, cx + randomInt(rng, -4, 5), y, 1, randomInt(rng, 2, 4), 0.22);
    }
    rect(ctx, look.mossLight, cx + randomInt(rng, -3, 3), randomInt(rng, 40, 100), 1, 1, 0.5);
  }
  for (let i = 0; i < 34; i++) {
    rect(ctx, look.fog, randomInt(rng, 0, w), randomInt(rng, 20, h - 10), 1, 1, 0.22);
  }

  // Cristais pequenos brilhando junto do chão, ao pé dos pilares
  for (const [x, size] of [
    [124, 10],
    [140, 6],
    [w - 128, 9],
    [w - 112, 6],
    [238, 4],
    [352, 5],
  ] as const) {
    crystalCluster(ctx, rng, x, h - 12, size, size < 5 ? 0.6 : 0.85);
  }
  for (let i = 0; i < 6; i++) {
    const x = randomInt(rng, 20, w - 20);
    const y = randomInt(rng, h - 120, h - 30);
    rect(ctx, CRYSTAL, x, y, 1, 1, 0.55);
    disc(ctx, CRYSTAL, x, y, 4, 0.04);
  }
}
