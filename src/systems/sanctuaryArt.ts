import type Phaser from 'phaser';
import { ATMOSPHERE } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { BIOME_LOOK } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { SANCTUARY_DECOR as D, SANCTUARY_LOOK } from '../data/sanctuaryRoom';
import { canvasTexture, line, mix, noise2 as hash, rect, type Ctx } from './pixelCanvas';
import { drawBackgroundLayer } from './biomeBackgrounds';
import { drawColossus } from './colossusArt';

/**
 * Arte do cenário do santuário, desenhada em código (como o resto do jogo): colunas, vitral,
 * estandartes, braseiros, velas, feixe de luz e o círculo de runas. Tudo veste as cores do bioma
 * (pedra e luz de BIOME_LOOK, fogo e pano de SANCTUARY_LOOK), então a mesma sala vira três.
 */

export const BRAZIER_FRAMES = 3;
export const CANDLE_FRAMES = 2;

export const SANCTUARY_TEXTURE = {
  pillar: (biome: BiomeId): string => `sanct-pillar-${biome}`,
  colossus: (biome: BiomeId): string => `sanct-colossus-${biome}`,
  banner: (biome: BiomeId): string => `sanct-banner-${biome}`,
  brazier: (biome: BiomeId, frame: number): string => `sanct-brazier-${biome}-${frame}`,
  candle: (biome: BiomeId, frame: number): string => `sanct-candle-${biome}-${frame}`,
  gate: (biome: BiomeId): string => `sanct-gate-${biome}`,
  view: (dest: BiomeId): string => `sanct-view-${dest}`,
  fork: (a: BiomeId, b: BiomeId): string => `sanct-fork-${a}-${b}`,
  shaft: 'sanct-shaft',
  runes: 'sanct-runes',
} as const;

/** O quanto a vista clareia na cor da luz da região (0 a 1), para ela se destacar da pedra escura. */
const VIEW_LIFT = 0.1;
/** Primeira linha (px) do fundo mostrada na vista e o contraste aplicado a ela. */
const VIEW_TOP = 24;
const VIEW_PIVOT = 100;
const VIEW_CONTRAST = 1.5;

/** Tamanhos das texturas (px). */
export const BRAZIER_SIZE = { width: 32, height: 48 } as const;
export const CANDLE_SIZE = { width: 8, height: 12 } as const;
const SHAFT_SIZE = 128;

function drawPillar(ctx: Ctx, biome: BiomeId): void {
  const stone = BIOME_LOOK[biome].back;
  const { width } = D.pillar;
  const height = D.floorY - D.pillar.top;
  rect(ctx, stone.base, 2, 0, width - 4, height);
  rect(ctx, stone.light, 3, 10, 2, height - 20); // luz do lado esquerdo
  rect(ctx, stone.dark, width - 7, 10, 5, height - 20); // sombra do lado direito
  for (const x of [8, 15]) rect(ctx, stone.dark, x, 14, 1, height - 28); // caneluras
  for (let y = 36; y < height - 28; y += 30) rect(ctx, stone.deep, 2, y, width - 4, 1); // juntas
  // Capitel e base: lajes com moldura
  for (const [top, down] of [
    [0, true],
    [height - 14, false],
  ] as const) {
    rect(ctx, stone.dark, 0, top, width, 14);
    rect(ctx, stone.base, 1, top + 1, width - 2, 5);
    rect(ctx, stone.highlight, 1, down ? top + 1 : top + 8, width - 2, 1);
    rect(ctx, stone.deep, 0, down ? top + 13 : top, width, 1);
  }
  // Musgo subindo pelo pé da coluna
  const moss = BIOME_LOOK[biome].moss;
  for (let i = 0; i < 26; i++) {
    const x = 2 + Math.floor(hash(i, 3) * (width - 4));
    const y = height - 16 - Math.floor(hash(i, 9) * 22);
    rect(ctx, moss, x, y, 1 + Math.floor(hash(i, 5) * 2), 1);
  }
}

function drawBanner(ctx: Ctx, biome: BiomeId): void {
  const sanct = SANCTUARY_LOOK[biome];
  const { width, height } = D.banner;
  const cloth = sanct.banner;
  const dark = mix(cloth, 0x000000, 0.4);
  const light = mix(cloth, 0xffffff, 0.14);
  // Pano com a cauda em duas pontas
  for (let x = 2; x < width - 2; x++) {
    const tail = Math.min(
      height - 1,
      Math.round(height - 14 + Math.abs(x - (width - 1) / 2) * 1.5),
    );
    rect(ctx, cloth, x, 4, 1, tail - 4);
    if (x === 2 || x === width - 3) rect(ctx, dark, x, 4, 1, tail - 4);
  }
  for (const x of [6, 13]) {
    rect(ctx, dark, x, 6, 1, 40);
    rect(ctx, light, x + 1, 6, 1, 40);
  }
  // Barra de cima com argolas
  rect(ctx, sanct.bannerTrim, 0, 2, width, 3);
  rect(ctx, mix(sanct.bannerTrim, 0x000000, 0.4), 0, 4, width, 1);
  rect(ctx, sanct.bannerTrim, 0, 1, 2, 5);
  rect(ctx, sanct.bannerTrim, width - 2, 1, 2, 5);
  for (const x of [4, width - 5]) rect(ctx, PALETTE.deep, x, 0, 1, 2);
  // Emblema: auréola e espada
  const cx = Math.floor(width / 2);
  for (let deg = 0; deg < 360; deg += 20) {
    const x = cx + Math.round(Math.cos((deg * Math.PI) / 180) * 5);
    const y = 19 + Math.round(Math.sin((deg * Math.PI) / 180) * 3);
    rect(ctx, sanct.bannerTrim, x, y, 1, 1);
  }
  rect(ctx, PALETTE.bone, cx - 1, 22, 2, 20);
  rect(ctx, sanct.bannerTrim, cx - 5, 28, 10, 2);
  rect(ctx, sanct.bannerTrim, cx - 1, 42, 2, 2);
}

/** Uma chama em camadas (borda, miolo, centro) que balança conforme o quadro. */
function drawFlame(
  ctx: Ctx,
  colors: readonly [number, number, number],
  cx: number,
  baseY: number,
  w: number,
  h: number,
  sway: number,
): void {
  for (let k = 0; k < h; k++) {
    const t = k / h;
    const half = Math.max(1, Math.round((w / 2) * (1 - t ** 1.6)));
    const shift = Math.round(sway * t * t);
    const y = baseY - k;
    rect(ctx, colors[0], cx - half + shift, y, half * 2, 1);
    if (t < 0.8) {
      const mid = Math.max(1, Math.round(half * 0.62));
      rect(ctx, colors[1], cx - mid + shift, y, mid * 2, 1);
    }
    if (t < 0.5) {
      const inner = Math.max(1, Math.round(half * 0.3));
      rect(ctx, colors[2], cx - inner + shift, y, inner * 2, 1);
    }
  }
}

function drawBrazier(ctx: Ctx, biome: BiomeId, frame: number): void {
  const colors = SANCTUARY_LOOK[biome].flame;
  const cx = BRAZIER_SIZE.width / 2;
  const bottom = BRAZIER_SIZE.height - 2;
  // Tripé de ferro
  line(ctx, PALETTE.stoneLight, cx, 28, cx - 10, bottom);
  line(ctx, PALETTE.stoneLight, cx, 28, cx + 10, bottom);
  rect(ctx, PALETTE.stoneLight, cx - 1, 28, 2, bottom - 28);
  rect(ctx, PALETTE.stoneDark, cx - 8, bottom - 12, 16, 2); // anel de travamento
  rect(ctx, PALETTE.stone, cx - 12, bottom, 24, 2); // pés
  // Bacia: borda larga, corpo afunilado e brasas
  rect(ctx, PALETTE.stoneLight, cx - 13, 22, 26, 3);
  rect(ctx, PALETTE.bone, cx - 13, 22, 26, 1);
  rect(ctx, PALETTE.stone, cx - 11, 25, 22, 2);
  rect(ctx, PALETTE.stoneDark, cx - 9, 27, 18, 2);
  rect(ctx, PALETTE.deep, cx - 6, 29, 12, 1);
  rect(ctx, colors[0], cx - 11, 21, 22, 1);
  // Chama: três quadros com alturas e balanço diferentes
  const heights = [18, 22, 16] as const;
  const sways = [1, -2, 2] as const;
  drawFlame(
    ctx,
    colors,
    cx + (frame === 1 ? -1 : 0),
    21,
    15,
    heights[frame] ?? 18,
    sways[frame] ?? 0,
  );
  // Fagulhas soltas
  const spark = [
    [cx - 6, 5],
    [cx + 5, 8],
    [cx + 1, 2],
  ] as const;
  const [sx, sy] = spark[frame] ?? [cx, 4];
  rect(ctx, colors[2], sx, sy, 1, 1);
}

function drawCandle(ctx: Ctx, biome: BiomeId, frame: number): void {
  const colors = SANCTUARY_LOOK[biome].flame;
  rect(ctx, PALETTE.bone, 2, 6, 4, 6);
  rect(ctx, PALETTE.mist, 5, 6, 1, 6);
  rect(ctx, PALETTE.bone, 1, 5, 1, 1); // pingo de cera
  rect(ctx, PALETTE.deep, 3, 5, 1, 1); // pavio
  if (frame === 0) {
    rect(ctx, colors[0], 3, 1, 2, 4);
    rect(ctx, colors[2], 3, 3, 1, 2);
  } else {
    rect(ctx, colors[0], 3, 2, 2, 3);
    rect(ctx, colors[1], 4, 1, 1, 2);
    rect(ctx, colors[2], 3, 3, 1, 1);
  }
}

const GATE = D.gate;
/** Centro e raio do arco de pedra (o raio externo é a metade da largura do quadro). */
const ARCH_CX = GATE.width / 2;
const ARCH_CY = GATE.width / 2;

/** O pixel (x, y) do quadro da passagem está no vão do arco? */
function inOpening(x: number, y: number): boolean {
  const { width, top, bottom } = GATE.opening;
  const r = width / 2;
  if (y < top || y >= bottom) return false;
  const dx = x + 0.5 - ARCH_CX;
  if (y + 0.5 >= top + r) return Math.abs(dx) < r;
  return dx * dx + (y + 0.5 - (top + r)) ** 2 < r * r;
}

/** O pixel está na pedra do arco (dentro do contorno externo)? */
function inArch(x: number, y: number): boolean {
  const dx = x + 0.5 - ARCH_CX;
  if (y >= ARCH_CY) return y < GATE.height;
  return dx * dx + (y + 0.5 - ARCH_CY) ** 2 < ARCH_CX * ARCH_CX;
}

/**
 * O arco de pedra da passagem: aduelas em volta, colunas com juntas, uma pedra-chave lisa no alto,
 * musgo, rachaduras e uma soleira gasta. O vão fica transparente (a vista da região do outro lado
 * é outra imagem, desenhada por trás).
 */
function drawGate(ctx: Ctx, biome: BiomeId): void {
  const look = BIOME_LOOK[biome];
  const stone = look.stone;
  for (let y = 0; y < GATE.height; y++) {
    for (let x = 0; x < GATE.width; x++) {
      if (!inArch(x, y) || inOpening(x, y)) continue;
      let color = stone.base;
      const noise = hash(x, y);
      if (noise < 0.1) color = stone.light;
      else if (noise > 0.9) color = stone.dark;
      if (y < ARCH_CY) {
        // Arco: juntas radiais a cada 15 graus
        const angle = (Math.atan2(y + 0.5 - ARCH_CY, x + 0.5 - ARCH_CX) * 180) / Math.PI;
        const slot = ((angle % 15) + 15) % 15;
        if (slot < 0.9 || slot > 14.2) color = stone.deep;
      } else {
        // Colunas: juntas horizontais deslocadas entre o lado esquerdo e o direito
        const offset = x < ARCH_CX ? 0 : 6;
        if ((y + offset) % 12 === 0) color = stone.deep;
      }
      rect(ctx, color, x, y, 1, 1);
    }
  }
  // Luz do lado esquerdo e sombra do direito; contorno interno escuro junto ao vão
  for (let y = 0; y < GATE.height; y++) {
    for (let x = 0; x < GATE.width; x++) {
      if (!inArch(x, y) || inOpening(x, y)) continue;
      if (
        inOpening(x + 1, y) ||
        inOpening(x - 1, y) ||
        inOpening(x, y + 1) ||
        inOpening(x, y - 1)
      ) {
        rect(ctx, stone.deep, x, y, 1, 1);
      } else if (!inArch(x - 1, y) || !inArch(x, y - 1)) {
        rect(ctx, stone.highlight, x, y, 1, 1);
      } else if (!inArch(x + 1, y)) {
        rect(ctx, stone.dark, x, y, 1, 1);
      }
    }
  }
  // Pedra-chave lisa, com um friso gasto
  rect(ctx, stone.light, ARCH_CX - 6, 0, 12, 15);
  rect(ctx, stone.highlight, ARCH_CX - 6, 0, 12, 1);
  rect(ctx, stone.deep, ARCH_CX - 6, 14, 12, 1);
  rect(ctx, stone.deep, ARCH_CX - 7, 1, 1, 14);
  rect(ctx, stone.deep, ARCH_CX + 6, 1, 1, 14);
  rect(ctx, stone.dark, ARCH_CX - 3, 5, 6, 1);
  rect(ctx, stone.dark, ARCH_CX - 3, 9, 6, 1);
  // Musgo pelo arco e hera descendo pelas colunas, mais algumas rachaduras
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 2) * (GATE.width - 6)) + 3;
    const y = Math.floor(hash(i, 5) * (GATE.height - 24)) + 4;
    if (inArch(x, y) && !inOpening(x, y)) {
      rect(
        ctx,
        hash(x, y) > 0.5 ? look.moss : look.mossLight,
        x,
        y,
        2 + Math.floor(hash(y, x) * 3),
        1,
      );
    }
  }
  for (const x of [5, GATE.width - 7]) {
    const len = 28 + Math.floor(hash(x, 4) * 20);
    for (let j = 0; j < len; j++) {
      rect(
        ctx,
        j % 5 === 0 ? look.mossLight : look.moss,
        x + Math.round(Math.sin(j / 4 + x) * 1.2),
        18 + j,
        1,
        1,
      );
    }
  }
  for (const [x, y] of [
    [22, 30],
    [51, 64],
    [10, 84],
  ] as const) {
    rect(ctx, stone.deep, x, y, 1, 5);
    rect(ctx, stone.deep, x + 1, y + 5, 1, 4);
  }
  // Base reforçada e soleira
  rect(ctx, stone.dark, 0, GATE.height - 10, GATE.width, 10);
  rect(ctx, stone.base, 1, GATE.height - 9, GATE.width - 2, 7);
  rect(ctx, stone.highlight, 0, GATE.height - 10, GATE.width, 1);
  rect(ctx, stone.deep, 0, GATE.height - 1, GATE.width, 1);
  rect(
    ctx,
    stone.light,
    GATE.opening.bottom - GATE.opening.top > 0 ? ARCH_CX - GATE.opening.width / 2 : 0,
    GATE.opening.bottom,
    GATE.opening.width,
    GATE.height - GATE.opening.bottom - 1,
  );
}

/**
 * A vista da região do outro lado do arco: o fundo do bioma de destino (céu, silhuetas e fundo
 * médio) recortado no vão, com uma estrada de terra que some no horizonte e uma neblina baixa.
 * Pintada com as mesmas funções dos fundos do jogo, então a floresta parece a floresta.
 */
function drawView(ctx: Ctx, dest: BiomeId): void {
  const look = BIOME_LOOK[dest];
  const bgW = ATMOSPHERE.layerWidth;
  const bgH = GAME_SIZE.height;
  const scratch = document.createElement('canvas');
  scratch.width = bgW;
  scratch.height = bgH;
  const sctx = scratch.getContext('2d');
  if (!sctx) return;
  drawBackgroundLayer(sctx, dest, 'far', bgW, bgH);
  drawBackgroundLayer(sctx, dest, 'mid', bgW, bgH);
  // O fundo encolhido pela metade (média de cada bloco 2x2, para as árvores finas não sumirem) para
  // caber uma paisagem inteira no vão: céu, silhuetas e horizonte, e não só um pedaço de tronco
  const { top, bottom } = GATE.opening;
  const shrink = 2;
  const source = sctx.getImageData(
    Math.round(bgW / 2 - (GATE.width * shrink) / 2),
    VIEW_TOP,
    GATE.width * shrink,
    GATE.height * shrink,
  );
  const horizon = top + Math.round((bottom - top) * 0.62);
  const stride = GATE.width * shrink * 4;
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < GATE.width; x++) {
      if (!inOpening(x, y)) continue;
      const channels = [0, 0, 0];
      for (let dy = 0; dy < shrink; dy++) {
        for (let dx = 0; dx < shrink; dx++) {
          const i = (y * shrink + dy) * stride + (x * shrink + dx) * 4;
          for (let c = 0; c < 3; c++) channels[c] = (channels[c] ?? 0) + (source.data[i + c] ?? 0);
        }
      }
      const n = shrink * shrink;
      const [r = 0, g = 0, b = 0] = channels.map((v) => Math.round(v / n));
      // Mais contraste (as silhuetas se separam do céu) e um toque da luz da região
      const stretch = (v: number): number =>
        Math.max(0, Math.min(255, Math.round((v - VIEW_PIVOT) * VIEW_CONTRAST + VIEW_PIVOT)));
      const color = mix(
        (stretch(r) << 16) | (stretch(g) << 8) | stretch(b),
        look.glowSoft,
        VIEW_LIFT,
      );
      rect(ctx, color, x, y, 1, 1);
    }
  }
  // Estrada de terra em perspectiva: larga embaixo e fina no horizonte
  const road = mix(look.stone.light, look.fog, 0.18);
  for (let y = horizon; y < bottom; y++) {
    const t = (y - horizon) / Math.max(1, bottom - horizon);
    const half = Math.round(2 + t * 15);
    for (let x = ARCH_CX - half; x < ARCH_CX + half; x++) {
      if (!inOpening(x, y)) continue;
      const edge = Math.abs(x + 0.5 - ARCH_CX) > half - 2;
      rect(
        ctx,
        edge ? mix(road, look.stone.deep, 0.45) : mix(road, 0x000000, (1 - t) * 0.35),
        x,
        y,
        1,
        1,
      );
    }
  }
  // Névoa baixa no horizonte, que também suaviza o recorte
  for (let y = horizon - 8; y < horizon + 6; y++) {
    const fade = 0.4 - Math.abs(y - horizon) * 0.04;
    for (let x = 0; x < GATE.width; x++) {
      if (inOpening(x, y)) rect(ctx, look.fog, x, y, 1, 1, Math.max(0, fade));
    }
  }
  // Sombra do arco por cima: o vão escurece nas bordas, como quem olha de dentro de uma sala
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < GATE.width; x++) {
      if (!inOpening(x, y)) continue;
      const edge = Math.min(
        x - (ARCH_CX - GATE.opening.width / 2),
        ARCH_CX + GATE.opening.width / 2 - 1 - x,
      );
      if (edge < 3 || y - top < 3) rect(ctx, 0x000000, x, y, 1, 1, 0.28 - Math.max(0, edge) * 0.07);
    }
  }
}

/** Feixe de luz do vitral: trapézio branco que vai se apagando para baixo e para as bordas. */
function drawShaft(ctx: Ctx): void {
  const image = ctx.createImageData(SHAFT_SIZE, SHAFT_SIZE);
  const { topWidth, bottomWidth } = D.shaft;
  for (let y = 0; y < SHAFT_SIZE; y++) {
    const t = y / (SHAFT_SIZE - 1);
    const half = ((topWidth + (bottomWidth - topWidth) * t) / bottomWidth) * (SHAFT_SIZE / 2);
    for (let x = 0; x < SHAFT_SIZE; x++) {
      const dx = Math.abs(x + 0.5 - SHAFT_SIZE / 2);
      if (dx >= half) continue;
      const edge = 1 - dx / half;
      const alpha = edge ** 0.6 * (1 - t * 0.75);
      const i = (y * SHAFT_SIZE + x) * 4;
      image.data[i] = 255;
      image.data[i + 1] = 255;
      image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Círculo de runas no chão: duas elipses e marcas entre elas (branco; a cor vem do tint). */
function drawRunes(ctx: Ctx): void {
  const { width, height } = D.runes;
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - 2;
  const ry = height / 2 - 1;
  for (let deg = 0; deg < 360; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    rect(
      ctx,
      0xffffff,
      cx + Math.round(Math.cos(rad) * rx),
      cy + Math.round(Math.sin(rad) * ry),
      1,
      1,
    );
    rect(
      ctx,
      0xffffff,
      cx + Math.round(Math.cos(rad) * (rx - 7)),
      cy + Math.round(Math.sin(rad) * (ry - 2)),
      1,
      1,
      0.6,
    );
  }
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const x = cx + Math.round(Math.cos(rad) * (rx - 3));
    const y = cy + Math.round(Math.sin(rad) * (ry - 1));
    rect(ctx, 0xffffff, x, y, deg % 30 === 0 ? 2 : 1, 1);
  }
}

/**
 * A vista de uma bifurcação: a metade esquerda é a paisagem de uma área e a direita, a de outra,
 * separadas por um poste fino. Mostra pelo arco que há dois caminhos.
 */
function drawFork(ctx: Ctx, a: BiomeId, b: BiomeId): void {
  const left = document.createElement('canvas');
  const right = document.createElement('canvas');
  for (const canvas of [left, right]) {
    canvas.width = GATE.width;
    canvas.height = GATE.height;
  }
  const lctx = left.getContext('2d');
  const rctx = right.getContext('2d');
  if (!lctx || !rctx) return;
  drawView(lctx, a);
  drawView(rctx, b);
  ctx.drawImage(left, 0, 0, ARCH_CX, GATE.height, 0, 0, ARCH_CX, GATE.height);
  ctx.drawImage(
    right,
    ARCH_CX,
    0,
    GATE.width - ARCH_CX,
    GATE.height,
    ARCH_CX,
    0,
    GATE.width - ARCH_CX,
    GATE.height,
  );
  const { top, bottom } = GATE.opening;
  rect(ctx, 0x0a0806, ARCH_CX - 1, top, 2, bottom - top);
  rect(ctx, 0x4a3a28, ARCH_CX - 1, top, 1, bottom - top);
}

/** Cria (uma vez) a vista de uma região, para usar fora do arco (a tela de escolha de caminho). */
export function ensureViewTexture(scene: Phaser.Scene, dest: BiomeId): string {
  canvasTexture(scene, SANCTUARY_TEXTURE.view(dest), GATE.width, GATE.height, (ctx) =>
    drawView(ctx, dest),
  );
  return SANCTUARY_TEXTURE.view(dest);
}

/** Cria (uma vez) o arco de pedra e a vista da bifurcação entre duas regiões. */
export function ensureForkTextures(
  scene: Phaser.Scene,
  biome: BiomeId,
  a: BiomeId,
  b: BiomeId,
): void {
  canvasTexture(scene, SANCTUARY_TEXTURE.gate(biome), GATE.width, GATE.height, (ctx) =>
    drawGate(ctx, biome),
  );
  canvasTexture(scene, SANCTUARY_TEXTURE.fork(a, b), GATE.width, GATE.height, (ctx) =>
    drawFork(ctx, a, b),
  );
}

/** Cria (uma vez) o arco de pedra e a vista da região de destino que se enxerga por ele. */
export function ensureGateTextures(scene: Phaser.Scene, biome: BiomeId, dest: BiomeId): void {
  canvasTexture(scene, SANCTUARY_TEXTURE.gate(biome), GATE.width, GATE.height, (ctx) =>
    drawGate(ctx, biome),
  );
  canvasTexture(scene, SANCTUARY_TEXTURE.view(dest), GATE.width, GATE.height, (ctx) =>
    drawView(ctx, dest),
  );
}

/** Cria (uma vez) todas as texturas do santuário de um bioma. */
export function ensureSanctuaryTextures(scene: Phaser.Scene, biome: BiomeId): void {
  const tex = SANCTUARY_TEXTURE;
  canvasTexture(scene, tex.pillar(biome), D.pillar.width, D.floorY - D.pillar.top, (ctx) =>
    drawPillar(ctx, biome),
  );
  canvasTexture(scene, tex.colossus(biome), D.colossus.width, D.colossus.height, (ctx) =>
    drawColossus(ctx, biome),
  );
  canvasTexture(scene, tex.banner(biome), D.banner.width, D.banner.height, (ctx) =>
    drawBanner(ctx, biome),
  );
  for (let frame = 0; frame < BRAZIER_FRAMES; frame++) {
    canvasTexture(
      scene,
      tex.brazier(biome, frame),
      BRAZIER_SIZE.width,
      BRAZIER_SIZE.height,
      (ctx) => drawBrazier(ctx, biome, frame),
    );
  }
  for (let frame = 0; frame < CANDLE_FRAMES; frame++) {
    canvasTexture(scene, tex.candle(biome, frame), CANDLE_SIZE.width, CANDLE_SIZE.height, (ctx) =>
      drawCandle(ctx, biome, frame),
    );
  }
  canvasTexture(scene, tex.shaft, SHAFT_SIZE, SHAFT_SIZE, drawShaft);
  canvasTexture(scene, tex.runes, D.runes.width, D.runes.height, drawRunes);
}
