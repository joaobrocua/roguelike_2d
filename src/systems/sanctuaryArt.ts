import type Phaser from 'phaser';
import { BIOME_LOOK } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { SANCTUARY_DECOR as D, SANCTUARY_LOOK } from '../data/sanctuaryRoom';
import { bayer, canvasTexture, line, mix, noise2 as hash, rect, type Ctx } from './pixelCanvas';
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
  gate: (biome: BiomeId, dest: BiomeId): string => `sanct-gate-${biome}-${dest}`,
  portal: (dest: BiomeId, frame: number): string => `sanct-portal-${dest}-${frame}`,
  shaft: 'sanct-shaft',
  runes: 'sanct-runes',
} as const;

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

/** O pixel (x, y) do quadro do portal está no vão do arco? */
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

/** Uma runa de 3 x 4 pixels (padrão sorteado, sempre com algum traço) na cor `color`. */
function drawGlyph(ctx: Ctx, color: number, x: number, y: number, seed: number): void {
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      if (hash(seed * 7 + gx, seed * 13 + gy) > 0.45 || gx === 1)
        rect(ctx, color, x + gx, y + gy, 1, 1, 0.9);
    }
  }
}

/**
 * O arco de pedra do portal: aduelas em volta, colunas com juntas, uma pedra-chave no alto com
 * runas da cor do destino e uma soleira. O vão fica transparente (a energia é outra imagem).
 */
function drawGate(ctx: Ctx, biome: BiomeId, dest: BiomeId): void {
  const stone = BIOME_LOOK[biome].stone;
  const rune = BIOME_LOOK[dest].glow;
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
  // Pedra-chave com uma runa grande
  rect(ctx, stone.light, ARCH_CX - 6, 0, 12, 15);
  rect(ctx, stone.highlight, ARCH_CX - 6, 0, 12, 1);
  rect(ctx, stone.deep, ARCH_CX - 6, 14, 12, 1);
  rect(ctx, stone.deep, ARCH_CX - 7, 1, 1, 14);
  rect(ctx, stone.deep, ARCH_CX + 6, 1, 1, 14);
  rect(ctx, rune, ARCH_CX - 1, 3, 2, 8);
  rect(ctx, rune, ARCH_CX - 3, 5, 6, 2);
  // Runas pelo arco e pelas colunas
  [200, 225, 315, 340].forEach((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    drawGlyph(
      ctx,
      rune,
      Math.round(ARCH_CX + Math.cos(rad) * 28) - 1,
      Math.round(ARCH_CY + Math.sin(rad) * 28) - 2,
      i + 1,
    );
  });
  [58, 78, 98].forEach((y, i) => {
    drawGlyph(ctx, rune, 6, y, i + 10);
    drawGlyph(ctx, rune, GATE.width - 9, y, i + 20);
  });
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

/** Um quadro da energia dentro do arco: espirais da cor do destino que giram de um quadro ao outro. */
function drawPortal(ctx: Ctx, dest: BiomeId, frame: number): void {
  const look = BIOME_LOOK[dest];
  const ramp = [
    look.ambient,
    mix(look.glowSoft, look.ambient, 0.55),
    look.glowSoft,
    mix(look.glow, 0xffffff, 0.35),
  ];
  const { width, top, bottom } = GATE.opening;
  const halfW = width / 2;
  const halfH = (bottom - top) / 2;
  const cy = (top + bottom) / 2;
  const phase = (frame / GATE.portalFrames) * Math.PI * 2;
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < GATE.width; x++) {
      if (!inOpening(x, y)) continue;
      const u = (x + 0.5 - ARCH_CX) / halfW;
      const w = (y + 0.5 - cy) / halfH;
      const r = Math.min(1, Math.sqrt(u * u + w * w * 0.55));
      const angle = Math.atan2(w, u);
      const swirl = 0.5 + 0.5 * Math.sin(angle * 2 + r * 8 - phase);
      const value = Math.min(1, swirl * 0.55 + (1 - r) * 0.55);
      const level = value * (ramp.length - 1);
      const index = Math.min(ramp.length - 2, Math.floor(level));
      const color = level - index > bayer(x, y) ? ramp[index + 1] : ramp[index];
      rect(ctx, color ?? look.glow, x, y, 1, 1);
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

/** Cria (uma vez) o arco e a energia do portal para o bioma de destino. */
export function ensureGateTextures(scene: Phaser.Scene, biome: BiomeId, dest: BiomeId): void {
  canvasTexture(scene, SANCTUARY_TEXTURE.gate(biome, dest), GATE.width, GATE.height, (ctx) =>
    drawGate(ctx, biome, dest),
  );
  for (let frame = 0; frame < GATE.portalFrames; frame++) {
    canvasTexture(scene, SANCTUARY_TEXTURE.portal(dest, frame), GATE.width, GATE.height, (ctx) =>
      drawPortal(ctx, dest, frame),
    );
  }
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
