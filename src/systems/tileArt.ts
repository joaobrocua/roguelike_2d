import type Phaser from 'phaser';
import { TILE_VARIANTS } from '../data/atmosphere';
import { BIOME_LOOK, type BiomeLook } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { ALL_BIOMES } from '../data/mapRules';
import { TILE_SIZE } from '../data/rooms';
import { TILE_EDGE, type TileKind, type TileLook } from '../logic/tileVariant';
import { createRng, randomInt, type Rng } from '../utils/rng';
import { canvasTexture, line, mix, rect, type Ctx } from './pixelCanvas';

/**
 * Blocos do cenário de cada área em pixel art. Cada área tem o seu corpo (tijolos, terra ou
 * rocha, com estratos, ossos, raízes, lama, fuligem...), o seu acabamento da superfície onde se
 * pisa e as suas franjas nas quinas ao ar livre (`edges`). Tudo é derivado das cores de
 * BIOME_LOOK.
 *
 * Regra de emenda: os blocos se repetem lado a lado e empilhados, então o que toca as bordas do
 * bloco ou continua igual no vizinho (estratos, raízes e fiadas presas numa linha fixa que não
 * depende da variação) ou fica a pelo menos 1 px de distância delas.
 */

/** Chave da textura de um bloco, a partir da aparência escolhida pela lógica pura. */
export function tileTextureKey(biome: BiomeId, look: TileLook): string {
  return `tile-${biome}-${look.kind}-${look.variant}-${look.edges}`;
}

const MAX = TILE_SIZE - 1;

/** Cor-base do osso (ivório): é um material, não uma cor de área; entra misturada à pedra. */
const BONE = 0xd9cfae;

/** Tudo o que os desenhistas precisam para pintar um bloco. */
interface Paint {
  ctx: Ctx;
  look: BiomeLook;
  kind: TileKind;
  variant: number;
  /** Tom do corpo: o bloco interno é mais escuro que o da superfície. */
  base: number;
  rng: Rng;
}

/** Franjas das quinas ao ar livre: o que pende da base e escorre nos lados. */
interface Fringe {
  main: number;
  tip: number;
  /** Chance de uma coluna ter um fio pendurado e comprimento máximo dele. */
  density: number;
  maxLen: number;
  /** Cor dos pingos (ou nenhum). */
  drop: number | null;
  /** Chance de uma lasca faltar nas bordas (rocha e terra esfarelam). */
  ragged: number;
  /** Cores do beiral que dobra a quina de cima para o lado (ou nenhum). */
  lip: readonly [number, number] | null;
}

interface BiomeStyle {
  body: (p: Paint) => void;
  /** Superfície onde se pisa (as primeiras linhas do bloco 'top'). */
  top: (p: Paint) => void;
  fringe: (look: BiomeLook) => Fringe;
}

/** Inteiro em [lo, hi], extremos incluídos. */
function between(rng: Rng, lo: number, hi: number): number {
  return randomInt(rng, lo, hi + 1);
}

/** Pontos soltos de 1 px dentro da região (extremos incluídos). */
function dots(
  p: Paint,
  color: number,
  count: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  alpha = 1,
): void {
  for (let i = 0; i < count; i++) {
    rect(p.ctx, color, between(p.rng, x0, x1), between(p.rng, y0, y1), 1, 1, alpha);
  }
}

function clear(p: Paint, x: number, y: number, w: number, h: number): void {
  p.ctx.clearRect(x, y, w, h);
}

/**
 * Veio ondulado que atravessa o bloco de lado a lado e emenda com o vizinho: nasce e termina na
 * mesma linha `y` (fixa, igual em todas as variações), ondula no meio e afina nas pontas.
 */
function vein(
  p: Paint,
  y: number,
  thick: number,
  wobble: number,
  tones: { main: number; lit?: number; under?: number },
  alpha = 0.9,
): void {
  let offset = 0;
  for (let x = 0; x < TILE_SIZE; x++) {
    const limit = Math.min(wobble, x, MAX - x);
    if (p.rng() < 0.35) offset += p.rng() < 0.5 ? -1 : 1;
    offset = Math.max(-limit, Math.min(limit, offset));
    const t = 1 + Math.round((thick - 1) * Math.sin((Math.PI * x) / MAX));
    const top = y + offset - Math.floor(t / 2);
    rect(p.ctx, tones.main, x, top, 1, t, alpha);
    if (tones.lit !== undefined) rect(p.ctx, tones.lit, x, top, 1, 1, alpha * 0.7);
    if (tones.under !== undefined) rect(p.ctx, tones.under, x, top + t, 1, 1, alpha * 0.8);
  }
}

/** Terra: fundo liso e torrões claros e escuros (sempre inteiros dentro do bloco). */
function earthBase(p: Paint, clods: number): void {
  const s = p.look.stone;
  rect(p.ctx, p.base, 0, 0, TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < clods; i++) {
    const w = between(p.rng, 3, 6);
    const h = between(p.rng, 2, 4);
    const x = between(p.rng, 1, TILE_SIZE - 1 - w);
    const y = between(p.rng, 1, TILE_SIZE - 1 - h);
    const tone = p.rng() < 0.5 ? mix(p.base, s.light, 0.35) : mix(p.base, s.dark, 0.55);
    rect(p.ctx, tone, x, y, w, h, 0.8);
  }
}

/** Pedra embutida, com luz em cima e sombra embaixo (ocupa x..x+w-1, y..y+h-1). */
function pebble(p: Paint, x: number, y: number, w: number, h: number): void {
  const s = p.look.stone;
  rect(p.ctx, s.deep, x, y + 1, w, h - 1, 0.7);
  rect(p.ctx, mix(s.light, s.base, 0.3), x, y, w - 1, h - 1);
  rect(p.ctx, s.highlight, x, y, Math.max(1, w - 2), 1, 0.7);
}

/** Sombra que a superfície projeta no corpo logo abaixo. */
function capShadow(p: Paint, y: number): void {
  rect(p.ctx, p.look.stone.deep, 0, y, TILE_SIZE, 1, 0.5);
  rect(p.ctx, p.look.stone.deep, 0, y + 1, TILE_SIZE, 1, 0.22);
}

/** Lâminas de 1 px na linha 0, em tufos (quem está num tufo puxa o vizinho). */
function blades(p: Paint, tip: number, body: number, density: number): void {
  let on = false;
  for (let x = 0; x < TILE_SIZE; x++) {
    on = p.rng() < (on ? density + 0.25 : density * 0.6);
    if (on) rect(p.ctx, p.rng() < 0.55 ? tip : body, x, 0, 1, 1);
  }
}

// ---------------------------------------------------------------------------------------------
// Tijolos (muralhas, salões, catacumbas)
// ---------------------------------------------------------------------------------------------

type Brick = readonly [x: number, y: number, w: number, h: number];

/**
 * Fiadas de 8 px deslocadas: juntas em x=7 e x=15 na de cima e em x=3 e x=11 na de baixo. Os
 * tijolos inteiros podem ser danificados; os dois cortados pela emenda (meio aqui, meio no
 * vizinho) têm sempre o mesmo tom e nunca são mexidos.
 */
const FULL_BRICKS: readonly Brick[] = [
  [0, 0, 7, 7],
  [8, 0, 7, 7],
  [4, 8, 7, 7],
];
const SPLIT_BRICKS: readonly Brick[] = [
  [0, 8, 3, 7],
  [12, 8, 4, 7],
];

function brickFace(p: Paint, tone: number, [x, y, w, h]: Brick): void {
  const s = p.look.stone;
  rect(p.ctx, tone, x, y, w, h);
  rect(p.ctx, s.highlight, x + 1, y + 1, Math.max(1, w - 3), 1, 0.22); // luz na face de cima
  rect(p.ctx, s.deep, x + 1, y + h - 1, Math.max(1, w - 2), 1, 0.28); // sombra embaixo
}

/** Fiadas de tijolos com tons variados e cantos lascados; `tint` tinge alguns tijolos. */
function drawBricks(p: Paint, mortar: number, tint: number | null): void {
  const s = p.look.stone;
  rect(p.ctx, mortar, 0, 0, TILE_SIZE, TILE_SIZE);
  for (const brick of FULL_BRICKS) {
    const roll = p.rng();
    let tone =
      roll < 0.28 ? mix(p.base, s.dark, 0.6) : roll > 0.78 ? mix(p.base, s.light, 0.45) : p.base;
    if (tint !== null && p.rng() < 0.25) tone = mix(tone, tint, 0.11);
    brickFace(p, tone, brick);
  }
  for (const brick of SPLIT_BRICKS) brickFace(p, p.base, brick);
  // Cantos lascados: a argamassa invade o canto do tijolo
  for (const [x, y, w, h] of FULL_BRICKS) {
    if (p.rng() >= 0.3) continue;
    const left = p.rng() < 0.5;
    const cx = left ? x : x + w - 1;
    const cy = p.rng() < 0.5 ? y : y + h - 1;
    rect(p.ctx, mortar, cx, cy, 1, 1);
    rect(p.ctx, s.deep, cx + (left ? 1 : -1), cy, 1, 1, 0.5);
  }
}

function pickBrick(p: Paint): Brick {
  return FULL_BRICKS[between(p.rng, 0, FULL_BRICKS.length - 1)] ?? [0, 0, 7, 7];
}

/** Tijolo que falta: um nicho escuro com a sombra de cima e entulho no fundo. */
function brickHole(p: Paint, [x, y, w, h]: Brick): void {
  const s = p.look.stone;
  rect(p.ctx, mix(s.deep, 0x000000, 0.15), x, y, w, h);
  rect(p.ctx, 0x000000, x, y, w, 2, 0.25);
  rect(p.ctx, mix(s.dark, s.base, 0.3), x + 1, y + h - 1, w - 2, 1, 0.8);
  rect(p.ctx, mix(s.base, s.light, 0.4), x + between(p.rng, 1, w - 2), y + h - 1, 1, 1, 0.8);
}

/** Trinca em zigue-zague pelas fiadas. */
function crack(p: Paint): void {
  const s = p.look.stone;
  const cx = between(p.rng, 2, 11);
  const cy = between(p.rng, 1, 3);
  rect(p.ctx, s.deep, cx, cy, 1, 3, 0.85);
  rect(p.ctx, s.deep, cx + 1, cy + 3, 1, 2, 0.85);
  rect(p.ctx, s.deep, cx, cy + 5, 1, 2, 0.7);
}

/** Musgo (ou limo) crescendo nas juntas, com fios escorrendo da junta de cima. */
function growOnJoints(p: Paint, count: number): void {
  const m = p.look;
  for (let i = 0; i < count; i++) {
    const upper = p.rng() < 0.5;
    const y = upper ? 7 : 15;
    const x = between(p.rng, 1, 11);
    const w = between(p.rng, 2, 4);
    rect(p.ctx, m.moss, x, y, w, 1, 0.9);
    rect(p.ctx, m.mossLight, x + 1, y, 1, 1, 0.8);
    if (upper) rect(p.ctx, m.moss, x + between(p.rng, 0, w - 1), 8, 1, between(p.rng, 1, 3), 0.7);
    else rect(p.ctx, m.moss, x, 14, w - 1, 1, 0.6);
  }
}

/** Salpicos e fissuras pequenas espalhados pelos tijolos. */
function wear(p: Paint): void {
  const s = p.look.stone;
  for (let i = 0; i < 4; i++) {
    rect(p.ctx, s.deep, between(p.rng, 1, 14), between(p.rng, 1, 14), 1, 1, 0.4);
    rect(p.ctx, s.light, between(p.rng, 1, 14), between(p.rng, 1, 14), 1, 1, 0.3);
  }
}

function bodyMuralhas(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  // Argamassa clara, mais clara que os tijolos
  drawBricks(p, mix(p.base, s.light, 0.55), null);
  wear(p);
  if (v === 1) brickHole(p, pickBrick(p));
  if (v === 1 || v === 2) crack(p);
  growOnJoints(p, [2, 1, 1, 2][v] ?? 1);
}

function bodySaloes(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  drawBricks(p, mix(p.base, s.light, 0.55), p.look.glowSoft);
  wear(p);
  if (v === 2) brickHole(p, pickBrick(p));
  if (v === 2 || v === 3) crack(p);
  // Manchas escorrendo das juntas e pontos dourados de embutidos
  for (let i = 0; i < 2; i++) {
    rect(p.ctx, s.deep, between(p.rng, 1, 13), 8, 1, between(p.rng, 2, 5), 0.3);
  }
  dots(p, p.look.glow, v === 1 ? 2 : 1, 1, 1, 13, 13, 0.5);
}

function boneTones(look: BiomeLook): { bone: number; shade: number } {
  const bone = mix(look.stone.highlight, BONE, 0.72);
  return { bone, shade: mix(bone, look.stone.deep, 0.5) };
}

/** Caveira (5x5) embutida. */
function skull(p: Paint, x: number, y: number): void {
  const { bone, shade } = boneTones(p.look);
  const deep = p.look.stone.deep;
  rect(p.ctx, bone, x + 1, y, 3, 1);
  rect(p.ctx, bone, x, y + 1, 5, 2);
  rect(p.ctx, deep, x + 1, y + 2, 1, 1);
  rect(p.ctx, deep, x + 3, y + 2, 1, 1);
  rect(p.ctx, bone, x + 1, y + 3, 3, 1);
  rect(p.ctx, deep, x + 2, y + 3, 1, 1, 0.7);
  rect(p.ctx, shade, x + 1, y + 4, 1, 1);
  rect(p.ctx, shade, x + 3, y + 4, 1, 1);
}

/** Costelas (5x6) em volta da espinha. */
function ribs(p: Paint, x: number, y: number): void {
  const { bone, shade } = boneTones(p.look);
  rect(p.ctx, bone, x + 2, y, 1, 6);
  for (const ry of [y + 1, y + 3]) {
    rect(p.ctx, bone, x, ry, 5, 1);
    rect(p.ctx, shade, x, ry + 1, 1, 1);
    rect(p.ctx, shade, x + 4, ry + 1, 1, 1);
  }
}

function bodyCatacumbas(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  drawBricks(p, mix(s.deep, 0x000000, p.kind === 'top' ? 0 : 0.25), null);
  wear(p);
  const lower = FULL_BRICKS[2] ?? [4, 8, 7, 7];
  // Cada variação enterra algo diferente na parede (a 1 com só limo e trinca dá descanso à vista)
  if (v === 0) {
    brickHole(p, lower);
    skull(p, 5, 9);
  } else if (v === 1) {
    crack(p);
  } else if (v === 2) {
    brickHole(p, lower);
    ribs(p, 6, 8);
  } else {
    // Ossos soltos nas juntas, sem nicho
    const { bone, shade } = boneTones(p.look);
    for (let i = 0; i < 2; i++) {
      const bx = between(p.rng, 1, 11);
      const by = between(p.rng, 2, 11);
      rect(p.ctx, bone, bx, by, 3, 1);
      rect(p.ctx, bone, bx, by + 1, 1, 1);
      rect(p.ctx, shade, bx + 1, by + 1, 2, 1, 0.8);
    }
  }
  growOnJoints(p, v === 1 ? 3 : 2);
}

// ---------------------------------------------------------------------------------------------
// Terra (floresta, pântano, cemitério, vila)
// ---------------------------------------------------------------------------------------------

function bodyFloresta(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  earthBase(p, 8);
  for (let i = 0; i < 2; i++) {
    pebble(p, between(p.rng, 1, 12), between(p.rng, 4, 10), 3, 3);
  }
  // Duas raízes presas nas linhas 6 e 11; cada variação engrossa uma (ou as duas) de um jeito
  const root = {
    main: mix(s.base, s.light, 0.5),
    lit: mix(s.light, s.highlight, 0.5),
    under: s.deep,
  };
  const [upper, lower] = [
    [4, 2],
    [2, 4],
    [4, 3],
    [3, 4],
  ][v] ?? [3, 3];
  vein(p, 6, upper ?? 3, 2, root);
  vein(p, 11, lower ?? 3, 1, root);
  if (v >= 1) {
    // Raiz que liga as duas (v1) ou desce solta de uma delas
    const bx = between(p.rng, 3, 12);
    const len = v === 1 ? 4 : between(p.rng, 2, 3);
    rect(p.ctx, root.main, bx, 8, 1, len, 0.95);
    rect(p.ctx, s.deep, bx + 1, 8, 1, len, 0.6);
    if (v === 3) rect(p.ctx, root.main, bx - 1, 8 + len - 1, 1, 1);
  }
}

/** Redemoinho de lama: um anel escuro com o brilho molhado dentro e embaixo e o miolo marcado. */
function mudSwirl(p: Paint, x: number, y: number, w: number, h: number): void {
  const s = p.look.stone;
  const ring = mix(s.deep, 0x000000, 0.2);
  const wet = mix(s.light, s.highlight, 0.4);
  rect(p.ctx, ring, x + 1, y, w - 2, 1, 0.85);
  rect(p.ctx, ring, x + 1, y + h - 1, w - 2, 1, 0.85);
  rect(p.ctx, ring, x, y + 1, 1, h - 2, 0.85);
  rect(p.ctx, ring, x + w - 1, y + 1, 1, h - 2, 0.85);
  rect(p.ctx, wet, x + 1, y + 1, w - 2, 1, 0.45);
  rect(p.ctx, ring, x + (w >> 1), y + (h >> 1), 1, 1, 0.85);
  rect(p.ctx, wet, x + 1, y + h, w - 2, 1, 0.4);
}

function bodyPantano(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  earthBase(p, 7);
  // Veios de lama escura e molhada
  for (let i = 0; i < 3; i++) {
    const w = between(p.rng, 4, 8);
    rect(
      p.ctx,
      mix(s.dark, s.deep, 0.4),
      between(p.rng, 1, 15 - w),
      between(p.rng, 4, 13),
      w,
      1,
      0.6,
    );
  }
  for (let i = 0; i < 2 + (v & 1); i++) {
    const w = between(p.rng, 4, 6);
    const h = between(p.rng, 3, 4);
    mudSwirl(p, between(p.rng, 1, 15 - w), between(p.rng, 4, 13 - h), w, h);
  }
  // Poça de água parada num veio e brilho de água presa na lama
  if (v === 1 || v === 3) {
    const w = between(p.rng, 5, 7);
    const x = between(p.rng, 1, 15 - w);
    const water = mix(p.look.skyLow, s.deep, 0.4);
    rect(p.ctx, water, x, 11, w, 2, 0.9);
    rect(p.ctx, mix(p.look.fog, water, 0.5), x + 1, 11, 2, 1, 0.7);
  }
  dots(p, mix(p.look.fog, s.light, 0.3), 3, 1, 3, 14, 13, 0.5);
}

function bodyCemiterio(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  earthBase(p, 8);
  // Pedras maiores e fiapos claros de ossos moídos
  for (let i = 0; i < 2 + (v & 1); i++) {
    const w = between(p.rng, 4, 5);
    const h = between(p.rng, 3, 4);
    pebble(p, between(p.rng, 1, 15 - w), between(p.rng, 4, 14 - h), w, h);
  }
  dots(p, s.highlight, 4, 1, 3, 14, 13, 0.35);
  // Raízes finas presas nas linhas 7 e 12, com um fiapo descendo
  const root = mix(s.dark, p.look.moss, 0.55);
  vein(p, 7, 1, v >= 2 ? 2 : 1, { main: root }, 0.85);
  vein(p, 12, 1, 1, { main: root }, 0.75);
  const tx = between(p.rng, 2, 13);
  rect(p.ctx, root, tx, 8, 1, between(p.rng, 2, 3), 0.8);
}

function bodyVila(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  earthBase(p, 7);
  const ash = mix(p.look.mossLight, s.highlight, 0.3);
  // Manchas de fuligem em duas camadas
  for (let i = 0; i < 3; i++) {
    const w = between(p.rng, 5, 8);
    const h = between(p.rng, 3, 4);
    const x = between(p.rng, 1, 15 - w);
    const y = between(p.rng, 3, 14 - h);
    rect(p.ctx, s.deep, x, y, w, h, 0.35);
    rect(p.ctx, s.deep, x + 1, y + 1, w - 2, h - 2, 0.3);
  }
  if (v !== 2) {
    // Tábua carbonizada: lado de cima queimado, veios da madeira e a ponta esfarelada
    const len = between(p.rng, 9, 13);
    const x = between(p.rng, 1, 15 - len);
    const y = between(p.rng, 5, 10);
    const wood = mix(s.base, s.light, 0.3);
    rect(p.ctx, wood, x, y, len, 3);
    rect(p.ctx, s.deep, x, y, len, 1, 0.9);
    rect(p.ctx, mix(wood, s.highlight, 0.25), x + 1, y + 1, len - 4, 1, 0.7);
    rect(p.ctx, mix(wood, s.deep, 0.5), x, y + 2, len, 1, 0.8);
    rect(p.ctx, s.deep, x + len - 2, y + 1, 1, 2);
    rect(p.ctx, ash, x + 2, y + 2, 1, 1, 0.5);
  }
  // Brasas pequenas com um halo fraco
  const embers = v === 2 ? 2 : v === 1 ? 1 : 0;
  for (let i = 0; i < embers; i++) {
    const ex = between(p.rng, 2, 12);
    const ey = between(p.rng, 4, 13);
    rect(p.ctx, mix(s.deep, 0x000000, 0.3), ex - 1, ey, 3, 2, 0.8);
    rect(p.ctx, p.look.glowSoft, ex - 1, ey, 3, 1, 0.4);
    rect(p.ctx, p.look.glow, ex, ey, 1, 1, 0.95);
  }
  dots(p, ash, 4, 1, 3, 14, 13, 0.4);
}

// ---------------------------------------------------------------------------------------------
// Rocha (minas)
// ---------------------------------------------------------------------------------------------

/** Pedregulho arredondado embutido na rocha. */
function boulder(p: Paint, x: number, y: number, w: number, h: number): void {
  const s = p.look.stone;
  rect(p.ctx, s.deep, x + 1, y, w - 2, h, 0.75);
  rect(p.ctx, s.deep, x, y + 1, w, h - 2, 0.75);
  rect(p.ctx, mix(s.light, s.base, 0.35), x + 1, y + 1, w - 2, h - 2);
  rect(p.ctx, s.highlight, x + 1, y + 1, Math.max(1, w - 3), 1, 0.55);
  rect(p.ctx, s.dark, x + 1, y + h - 2, w - 2, 1, 0.6);
}

function bodyMinas(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  rect(p.ctx, p.base, 0, 0, TILE_SIZE, TILE_SIZE);
  // Estratos: camadas de tom diferente com limites fixos nas linhas 5 e 10 (emendam no vizinho)
  rect(p.ctx, mix(p.base, s.light, 0.14), 0, 5, TILE_SIZE, 5, 0.9);
  rect(p.ctx, mix(p.base, s.dark, 0.3), 0, 10, TILE_SIZE, 5, 0.9);
  // Facetas angulosas da rocha
  for (let i = 0; i < 6; i++) {
    const w = between(p.rng, 3, 6);
    const h = between(p.rng, 2, 3);
    const tone = p.rng() < 0.5 ? mix(p.base, s.light, 0.3) : mix(p.base, s.deep, 0.5);
    rect(p.ctx, tone, between(p.rng, 1, TILE_SIZE - 1 - w), between(p.rng, 1, 14 - h), w, h, 0.5);
  }
  const thick = [2, 1, 2, 1][v] ?? 1;
  vein(p, 5, thick, 1 + (v & 1), { main: s.deep, under: s.light }, 0.8);
  vein(p, 10, 3 - thick, 2 - (v & 1), { main: s.deep, under: s.light }, 0.8);
  // Pedregulhos
  const boulders = v === 1 || v === 3 ? 2 : 1;
  for (let i = 0; i < boulders; i++) {
    const w = between(p.rng, 5, 7);
    const h = between(p.rng, 4, 5);
    boulder(p, between(p.rng, 1, 15 - w), between(p.rng, 2, 13 - h), w, h);
  }
  // Fratura diagonal e pepitas de minério
  const x0 = between(p.rng, 1, 8);
  const y0 = between(p.rng, 1, 8);
  line(p.ctx, s.deep, x0, y0, x0 + 4, y0 + between(p.rng, 3, 5), 0.8);
  dots(p, p.look.mossLight, 2, 1, 3, 14, 13, 0.85);
  dots(p, mix(p.look.mossLight, 0xffffff, 0.4), 1, 1, 3, 14, 13, 0.9);
}

// ---------------------------------------------------------------------------------------------
// Superfícies onde se pisa
// ---------------------------------------------------------------------------------------------

/** Folha caída (3x2). */
function leaf(p: Paint, x: number, y: number, tone: number): void {
  rect(p.ctx, tone, x, y, 3, 1);
  rect(p.ctx, mix(tone, p.look.stone.deep, 0.4), x + 1, y + 1, 2, 1, 0.85);
}

function topFloresta(p: Paint): void {
  const m = p.look;
  const v = p.variant;
  const dark = mix(m.moss, m.stone.deep, 0.5);
  capShadow(p, 3);
  // Relva: base musgosa e franja irregular escorrendo para a terra
  rect(p.ctx, m.moss, 0, 1, TILE_SIZE, 2);
  rect(p.ctx, m.mossLight, 0, 1, TILE_SIZE, 1, 0.7);
  for (let x = 0; x < TILE_SIZE; x++) {
    rect(p.ctx, p.rng() < 0.55 ? m.moss : dark, x, 3, 1, between(p.rng, 0, 3), 0.95);
  }
  // Grama alta em tufos que passam da linha da superfície
  blades(p, m.mossLight, m.moss, [0.5, 0.7, 0.35, 0.6][v] ?? 0.5);
  // Folhas caídas, cor de outono
  const autumn = mix(m.glow, m.moss, 0.45);
  for (let i = 0; i < ([0, 2, 1, 1][v] ?? 0); i++) leaf(p, between(p.rng, 1, 11), 1, autumn);
  // Raiz que sobe do chão (arco)
  if (v >= 2) {
    const x = between(p.rng, 1, 11);
    const root = mix(m.stone.deep, m.stone.light, 0.3);
    rect(p.ctx, root, x, 2, 4, 1);
    rect(p.ctx, root, x + 1, 1, 2, 1);
    rect(p.ctx, mix(m.stone.light, m.stone.highlight, 0.3), x + 1, 1, 1, 1, 0.8);
  }
}

function topPantano(p: Paint): void {
  const m = p.look;
  const s = m.stone;
  const v = p.variant;
  const mud = mix(s.light, s.base, 0.45);
  capShadow(p, 4);
  rect(p.ctx, mud, 0, 1, TILE_SIZE, 3);
  rect(p.ctx, mix(s.light, s.highlight, 0.35), 0, 1, TILE_SIZE, 1, 0.35);
  // Brilho de lama úmida
  for (let i = 0; i < 3; i++) {
    rect(p.ctx, s.highlight, between(p.rng, 0, 13), 1, between(p.rng, 2, 3), 1, 0.45);
  }
  // Lama escorrendo
  for (let x = 0; x < TILE_SIZE; x++) {
    rect(p.ctx, mix(s.dark, s.deep, 0.3), x, 4, 1, between(p.rng, 0, 2), 0.9);
  }
  // Poça com o reflexo do céu
  if (v === 0 || v === 2) {
    const w = between(p.rng, 5, 7);
    const x = between(p.rng, 1, 15 - w);
    const water = mix(m.skyLow, s.deep, 0.35);
    rect(p.ctx, water, x, 1, w, 2);
    rect(p.ctx, mix(m.fog, water, 0.45), x + 1, 1, 3, 1, 0.8);
    rect(p.ctx, s.deep, x, 3, w, 1, 0.5);
  }
  // Musgo verde-azulado
  for (let i = 0; i < (v === 0 ? 1 : 2); i++) {
    const w = between(p.rng, 4, 6);
    const x = between(p.rng, 0, 15 - w);
    rect(p.ctx, m.moss, x, 1, w, 3);
    rect(p.ctx, m.mossLight, x + 1, 1, w - 2, 1, 0.9);
    rect(p.ctx, m.moss, x + between(p.rng, 0, w - 1), 4, 1, between(p.rng, 1, 3), 0.85);
  }
  // Juncos curtos
  const reed = mix(m.moss, s.deep, 0.25);
  for (let i = 0; i < ([1, 2, 1, 2][v] ?? 1); i++) {
    const x = between(p.rng, 1, 14);
    rect(p.ctx, m.mossLight, x, 0, 1, 1);
    rect(p.ctx, reed, x, 1, 1, 2);
    rect(p.ctx, reed, x + 1, 1, 1, 1, 0.8);
  }
}

function dryGrass(look: BiomeLook): { dry: number; light: number } {
  return {
    dry: mix(look.moss, look.stone.light, 0.5),
    light: mix(look.mossLight, look.stone.highlight, 0.45),
  };
}

function topCemiterio(p: Paint): void {
  const s = p.look.stone;
  const v = p.variant;
  const { dry, light } = dryGrass(p.look);
  const soil = mix(s.base, s.dark, 0.25);
  capShadow(p, 3);
  rect(p.ctx, dry, 0, 1, TILE_SIZE, 2);
  rect(p.ctx, light, 0, 1, TILE_SIZE, 1, 0.45);
  for (let x = 0; x < TILE_SIZE; x++) {
    rect(p.ctx, p.rng() < 0.5 ? soil : s.deep, x, 3, 1, between(p.rng, 0, 2), 0.9);
  }
  // Capim seco em tufos
  blades(p, light, dry, [0.45, 0.6, 0.3, 0.55][v] ?? 0.45);
  // Pedrinhas soltas
  for (let i = 0; i < ([1, 2, 1, 2][v] ?? 1); i++) {
    const x = between(p.rng, 1, 12);
    rect(p.ctx, mix(s.light, s.highlight, 0.4), x, 1, 2, 1);
    rect(p.ctx, s.deep, x, 2, 2, 1, 0.5);
  }
  // Poeira no ar
  dots(p, s.highlight, 3, 0, 0, MAX, 0, 0.3);
}

function topMinas(p: Paint): void {
  const m = p.look;
  const s = m.stone;
  const v = p.variant;
  const ore = mix(m.mossLight, s.highlight, 0.25);
  capShadow(p, 3);
  rect(p.ctx, s.light, 0, 0, TILE_SIZE, 3);
  rect(p.ctx, s.highlight, 0, 0, TILE_SIZE, 1, 0.8);
  rect(p.ctx, s.base, 0, 2, TILE_SIZE, 1, 0.5);
  // Lascas: placas claras com sombra embaixo e farpas escuras
  for (let i = 0; i < 2; i++) {
    const w = between(p.rng, 3, 4);
    const x = between(p.rng, 1, TILE_SIZE - 1 - w);
    rect(p.ctx, s.highlight, x, 1, w, 1, 0.5);
    rect(p.ctx, s.dark, x, 2, w, 1, 0.6);
  }
  dots(p, s.deep, 4, 0, 0, MAX, 2, 0.55);
  // Veio de minério
  const x0 = between(p.rng, 2, 9);
  const y0 = between(p.rng, 1, 2);
  line(p.ctx, ore, x0, y0, x0 + 4, y0 + 3, 0.85);
  rect(p.ctx, mix(ore, 0xffffff, 0.4), x0 + between(p.rng, 0, 4), y0, 1, 1, 0.9);
  // Degrau: um trecho da superfície mais baixo
  if (v === 1 || v === 3) {
    const len = between(p.rng, 3, 5);
    const x = between(p.rng, 2, 11 - len);
    clear(p, x, 0, len, 1);
    rect(p.ctx, s.highlight, x, 1, len, 1, 0.65);
  }
  // Poeira de minério
  dots(p, ore, 3, 0, 0, MAX, 1, 0.5);
}

/** Cinza amontoada: a cor dos montes e do seu brilho. */
function ashTones(look: BiomeLook): { ash: number; light: number } {
  const ash = mix(look.mossLight, look.stone.highlight, 0.3);
  return { ash, light: mix(ash, look.stone.highlight, 0.5) };
}

function topVila(p: Paint): void {
  const m = p.look;
  const s = m.stone;
  const v = p.variant;
  const { ash, light } = ashTones(m);
  const char = mix(s.dark, s.deep, 0.35);
  capShadow(p, 3);
  rect(p.ctx, char, 0, 0, TILE_SIZE, 3);
  rect(p.ctx, mix(char, s.base, 0.3), 0, 0, TILE_SIZE, 1, 0.7);
  // Montes de cinza
  for (let i = 0; i < ([2, 1, 2, 3][v] ?? 1); i++) {
    const w = between(p.rng, 4, 7);
    const x = between(p.rng, 1, TILE_SIZE - 1 - w);
    rect(p.ctx, ash, x, 1, w, 2, 0.9);
    rect(p.ctx, ash, x + 1, 0, w - 2, 1);
    rect(p.ctx, light, x + 2, 0, Math.max(1, w - 4), 1, 0.8);
  }
  // Carvões com brasa
  for (let i = 0; i < ([1, 2, 1, 2][v] ?? 1); i++) {
    const x = between(p.rng, 1, 11);
    rect(p.ctx, mix(s.deep, 0x000000, 0.4), x, 1, 3, 2);
    rect(p.ctx, m.glowSoft, x, 1, 3, 1, 0.45);
    rect(p.ctx, m.glow, x + 1, 1, 1, 1, 0.95);
  }
  dots(p, ash, 4, 0, 0, MAX, 2, 0.45);
}

/** Juntas entre as lajes da superfície (uma ou duas, longe das bordas). */
function slabJoints(p: Paint, count: number, shade: number): number {
  const s = p.look.stone;
  const first = between(p.rng, 3, 12);
  const second = first < 8 ? between(p.rng, 10, 13) : between(p.rng, 2, 5);
  rect(p.ctx, s.deep, first, 0, 1, 3, shade);
  rect(p.ctx, s.highlight, first + 1, 0, 1, 1, 0.5);
  if (count > 1) rect(p.ctx, s.deep, second, 0, 1, 3, shade);
  return first;
}

function topMuralhas(p: Paint): void {
  const m = p.look;
  const s = m.stone;
  const v = p.variant;
  capShadow(p, 3);
  rect(p.ctx, s.light, 0, 0, TILE_SIZE, 3);
  rect(p.ctx, mix(s.highlight, s.light, 0.35), 0, 0, TILE_SIZE, 1);
  const joint = slabJoints(p, v >= 2 ? 2 : 1, 0.8);
  // Rachadura em zigue-zague
  if (v === 1 || v === 3) {
    const cx = between(p.rng, 3, 12);
    rect(p.ctx, s.deep, cx, 0, 1, 2, 0.8);
    rect(p.ctx, s.deep, cx + 1, 2, 1, 1, 0.8);
  }
  // Musgo no calçamento
  for (let i = 0; i < ([1, 2, 1, 2][v] ?? 1); i++) {
    const w = between(p.rng, 3, 5);
    const x = between(p.rng, 1, TILE_SIZE - 1 - w);
    rect(p.ctx, m.moss, x, 0, w, 2);
    rect(p.ctx, m.mossLight, x + 1, 0, w - 2, 1, 0.9);
    rect(p.ctx, m.moss, x + between(p.rng, 0, w - 1), 2, 1, between(p.rng, 1, 3), 0.85);
  }
  // Ervas brotando da junta
  rect(p.ctx, m.mossLight, joint, 0, 1, 2, 0.9);
  rect(p.ctx, m.moss, joint - 1, 1, 1, 1);
  rect(p.ctx, m.moss, joint + 1, 1, 1, 1);
}

function topSaloes(p: Paint): void {
  const m = p.look;
  const s = m.stone;
  const v = p.variant;
  capShadow(p, 3);
  rect(p.ctx, s.light, 0, 0, TILE_SIZE, 3);
  rect(p.ctx, mix(s.highlight, m.shaft, 0.25), 0, 0, TILE_SIZE, 1, 0.9);
  slabJoints(p, v === 1 ? 1 : 2, 0.7);
  // Brilho da laje polida
  const gx = between(p.rng, 2, 10);
  line(p.ctx, mix(s.highlight, m.shaft, 0.5), gx + 2, 0, gx, 2, 0.7);
  // Tapete gasto: pedaços com as pontas rasgadas, franja dourada e furos de traça
  const pieces =
    [
      [[1, 9]],
      [[5, 10]],
      [
        [1, 4],
        [8, 13],
      ],
      [],
    ][v] ?? [];
  const rug = mix(m.glowSoft, s.dark, 0.5);
  for (const [x0 = 0, x1 = 0] of pieces) {
    const w = x1 - x0 + 1;
    rect(p.ctx, rug, x0, 0, w, 3);
    rect(p.ctx, mix(rug, m.glowSoft, 0.35), x0, 0, w, 1, 0.7);
    for (let x = x0 + 1; x < x1; x += 2) rect(p.ctx, m.glow, x, 2, 1, 1, 0.55);
    rect(p.ctx, s.light, x0, 0, 1, between(p.rng, 1, 2));
    rect(p.ctx, s.light, x1, 0, 1, between(p.rng, 1, 2));
    dots(p, s.light, 2, x0 + 1, 0, x1 - 1, 1, 0.8);
  }
}

function topCatacumbas(p: Paint): void {
  const m = p.look;
  const s = m.stone;
  const v = p.variant;
  capShadow(p, 3);
  rect(p.ctx, s.light, 0, 0, TILE_SIZE, 3);
  rect(p.ctx, s.highlight, 0, 0, TILE_SIZE, 1, 0.6);
  slabJoints(p, 1, 0.7);
  // Limo verde nas lajes, escorrendo
  for (let i = 0; i < ([2, 1, 2, 1][v] ?? 1); i++) {
    const w = between(p.rng, 3, 6);
    const x = between(p.rng, 1, TILE_SIZE - 1 - w);
    rect(p.ctx, m.moss, x, 0, w, 2);
    rect(p.ctx, m.mossLight, x + 1, 0, w - 2, 1, 0.9);
    rect(p.ctx, m.moss, x + between(p.rng, 0, w - 1), 2, 1, between(p.rng, 1, 3), 0.85);
  }
  // Gotejado: pingo na laje e o rastro molhado que ele deixa
  const drop = mix(m.shaft, m.mossLight, 0.5);
  for (let i = 0; i < 1 + (v & 1); i++) {
    const x = between(p.rng, 1, 14);
    rect(p.ctx, drop, x, 0, 1, 1, 0.85);
    rect(p.ctx, m.mossLight, x, 3, 1, between(p.rng, 1, 2), 0.5);
  }
  if (v === 1 || v === 3) {
    const w = between(p.rng, 3, 4);
    const x = between(p.rng, 1, 14 - w);
    rect(p.ctx, mix(m.glowSoft, s.deep, 0.5), x, 1, w, 1, 0.9);
    rect(p.ctx, m.mossLight, x + 1, 1, 1, 1, 0.7);
  }
  // Um osso largado no chão
  if (v === 3) {
    const { bone, shade } = boneTones(m);
    const x = between(p.rng, 2, 9);
    rect(p.ctx, bone, x, 1, 5, 1);
    rect(p.ctx, bone, x - 1, 0, 1, 1);
    rect(p.ctx, bone, x + 5, 0, 1, 1);
    rect(p.ctx, shade, x + 1, 2, 3, 1, 0.8);
  }
}

// ---------------------------------------------------------------------------------------------
// Estilos por área
// ---------------------------------------------------------------------------------------------

const STYLE: Readonly<Record<BiomeId, BiomeStyle>> = {
  muralhas: {
    body: bodyMuralhas,
    top: topMuralhas,
    fringe: (look) => ({
      main: look.moss,
      tip: look.mossLight,
      density: 0.45,
      maxLen: 4,
      drop: mix(look.fog, look.glow, 0.35),
      ragged: 0,
      lip: [look.moss, look.mossLight],
    }),
  },
  saloes: {
    body: bodySaloes,
    top: topSaloes,
    fringe: (look) => ({
      main: look.moss,
      tip: look.mossLight,
      density: 0.3,
      maxLen: 3,
      drop: mix(look.shaft, look.stone.highlight, 0.4),
      ragged: 0,
      lip: null,
    }),
  },
  catacumbas: {
    body: bodyCatacumbas,
    top: topCatacumbas,
    fringe: (look) => ({
      main: look.moss,
      tip: look.mossLight,
      density: 0.55,
      maxLen: 4,
      drop: mix(look.shaft, look.mossLight, 0.5),
      ragged: 0,
      lip: [look.moss, look.mossLight],
    }),
  },
  floresta: {
    body: bodyFloresta,
    top: topFloresta,
    fringe: (look) => ({
      main: mix(look.stone.deep, look.stone.light, 0.3),
      tip: mix(look.stone.light, look.stone.base, 0.2),
      density: 0.5,
      maxLen: 4,
      drop: null,
      ragged: 0.25,
      lip: [look.moss, look.mossLight],
    }),
  },
  pantano: {
    body: bodyPantano,
    top: topPantano,
    fringe: (look) => ({
      main: look.moss,
      tip: look.mossLight,
      density: 0.5,
      maxLen: 3,
      drop: mix(look.stone.highlight, look.stone.base, 0.3),
      ragged: 0.2,
      lip: [look.moss, look.mossLight],
    }),
  },
  cemiterio: {
    body: bodyCemiterio,
    top: topCemiterio,
    fringe: (look) => {
      const { dry, light } = dryGrass(look);
      return {
        main: mix(look.stone.dark, look.moss, 0.5),
        tip: light,
        density: 0.35,
        maxLen: 3,
        drop: null,
        ragged: 0.25,
        lip: [dry, light],
      };
    },
  },
  minas: {
    body: bodyMinas,
    top: topMinas,
    fringe: (look) => ({
      main: mix(look.stone.base, look.stone.light, 0.5),
      tip: look.stone.highlight,
      density: 0.3,
      maxLen: 3,
      drop: null,
      ragged: 0.3,
      lip: null,
    }),
  },
  vila: {
    body: bodyVila,
    top: topVila,
    fringe: (look) => {
      const { ash, light } = ashTones(look);
      return {
        main: ash,
        tip: light,
        density: 0.4,
        maxLen: 4,
        drop: look.glowSoft,
        ragged: 0.2,
        lip: [ash, light],
      };
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Quinas ao ar livre
// ---------------------------------------------------------------------------------------------

/** Beiral que dobra a quina de cima por cima do lado aberto (x = 0 ou x = MAX). */
function drawLip(p: Paint, fringe: Fringe, x: number): void {
  if (!fringe.lip) return;
  const [main, light] = fringe.lip;
  const inward = x === 0 ? 1 : -1;
  const len = between(p.rng, 3, 6);
  rect(p.ctx, main, x, 1, 1, len, 0.95);
  rect(p.ctx, light, x, 1, 1, 1);
  rect(p.ctx, main, x + inward, 1, 1, Math.max(1, len - 3), 0.8);
}

/** Lascas que faltam na borda lateral de terra e rocha (nunca duas seguidas). */
function drawRagged(p: Paint, fringe: Fringe, x: number): void {
  let prev = false;
  for (let y = p.kind === 'top' ? 3 : 0; y < MAX; y++) {
    const cut: boolean = !prev && p.rng() < fringe.ragged;
    if (cut) clear(p, x, y, 1, 1);
    prev = cut;
  }
}

/** Degrau ou lasca na quina de cima de um lado aberto. */
function drawStep(p: Paint, x: number): void {
  const size = between(p.rng, 0, 2);
  if (size === 0) return;
  clear(p, x, 0, 1, 1);
  if (size === 2) {
    clear(p, x === 0 ? 1 : x - 1, 0, 1, 1);
    clear(p, x, 1, 1, 1);
  }
}

/** Acabamento comum: os lados ao ar livre (luz, sombra, beiral, lascas e franjas). */
function drawFinish(p: Paint, fringe: Fringe, edges: number): void {
  const s = p.look.stone;
  const top = p.kind === 'top';
  const y0 = top ? 1 : 0;

  // Lados ao ar livre: luz na quina da esquerda, sombra na da direita e embaixo
  if (edges & TILE_EDGE.left) {
    rect(p.ctx, s.highlight, 0, y0, 1, TILE_SIZE - y0, 0.75);
    rect(p.ctx, s.light, 1, 2, 1, TILE_SIZE - 3, 0.4);
  }
  if (edges & TILE_EDGE.right) {
    rect(p.ctx, s.deep, MAX, y0, 1, TILE_SIZE - y0, 0.9);
    rect(p.ctx, s.deep, MAX - 1, 1, 1, TILE_SIZE - 1, 0.4);
  }
  for (const [bit, x] of [
    [TILE_EDGE.left, 0],
    [TILE_EDGE.right, MAX],
  ] as const) {
    if (!(edges & bit)) continue;
    if (top) drawLip(p, fringe, x);
    if (fringe.ragged > 0) drawRagged(p, fringe, x);
    if (top) drawStep(p, x);
  }

  if (edges & TILE_EDGE.bottom) {
    // Base exposta: sombra no pé do bloco, fios e pingos pendurados, lascas faltando
    rect(p.ctx, s.deep, 0, MAX, TILE_SIZE, 1);
    rect(p.ctx, s.deep, 0, TILE_SIZE - 3, TILE_SIZE, 2, 0.45);
    const bottomRng = p.rng;
    for (let x = 1; x < MAX; x++) {
      if (bottomRng() < fringe.density) {
        const len = between(bottomRng, 1, fringe.maxLen);
        rect(p.ctx, fringe.main, x, TILE_SIZE - len, 1, len);
        rect(p.ctx, fringe.tip, x, MAX, 1, 1);
      } else if (fringe.drop !== null && bottomRng() < 0.12) {
        rect(p.ctx, fringe.drop, x, MAX - 1, 1, 1, 0.85);
      } else if (bottomRng() < fringe.ragged) {
        clear(p, x, MAX, 1, 1);
      }
    }
  } else {
    rect(p.ctx, s.deep, 0, MAX, TILE_SIZE, 1, 0.3);
  }
}

/** Desenha um bloco inteiro (16x16): corpo, superfície se for o caso e quinas ao ar livre. */
export function drawTile(
  ctx: Ctx,
  biome: BiomeId,
  kind: TileKind,
  variant: number,
  edges: number,
): void {
  const look = BIOME_LOOK[biome];
  const style = STYLE[biome];
  const s = look.stone;
  // O corpo e a superfície não dependem de `edges`: abrir um lado não reembaralha o desenho
  const seed = 100 + ALL_BIOMES.indexOf(biome) * 1009 + (kind === 'top' ? 0 : 211) + variant * 7;
  const paint: Paint = {
    ctx,
    look,
    kind,
    variant,
    base: kind === 'top' ? s.base : mix(s.base, s.dark, 0.5),
    rng: createRng(seed),
  };
  style.body(paint);
  if (kind === 'top') style.top(paint);
  else dots(paint, s.deep, 12, 1, 0, MAX - 1, MAX, 0.25); // bloco interno: pontilhado de sombra
  paint.rng = createRng(seed * 31 + edges * 17 + 5);
  drawFinish(paint, style.fringe(look), edges);
}

/** Cria todos os blocos de todas as áreas (uma textura por tipo, variação e combinação de lados). */
export function createTileTextures(scene: Phaser.Scene): void {
  for (const biome of ALL_BIOMES) {
    for (let variant = 0; variant < TILE_VARIANTS; variant++) {
      for (const kind of ['top', 'fill'] as const) {
        for (let edges = 0; edges < 8; edges++) {
          const key = tileTextureKey(biome, { kind, variant, edges });
          canvasTexture(scene, key, TILE_SIZE, TILE_SIZE, (ctx) =>
            drawTile(ctx, biome, kind, variant, edges),
          );
        }
      }
    }
  }
}
