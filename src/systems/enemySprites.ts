import type Phaser from 'phaser';
import { GUARDIAO } from '../data/boss';
import { ENEMY_BODIES, type EnemyBody } from '../data/enemies';
import {
  ALDEAO_SHEET,
  ARQUEIRO_SHEET,
  CAO_SHEET,
  CARNICAL_SHEET,
  CORVO_SHEET,
  FATUO_SHEET,
  GOLEM_SHEET,
  GUARDIAO_SHEET,
  LOBO_SHEET,
  MORCEGO_SHEET,
  NECROMANTE_SHEET,
  RAIZ_SHEET,
  SAPO_SHEET,
  SOLDADO_SHEET,
  VULTO_SHEET,
  type ArcherPose,
  type BatPose,
  type EnemySheet,
  type FrogPose,
  type GhoulPose,
  type GolemPose,
  type HoundPose,
  type NecroPose,
  type RootPose,
  type SoldierPose,
  ENEMY_ANIM_STATES,
  type WraithPose,
} from '../data/enemySprites';
import { PALETTE } from '../data/palette';
import { enemyAnimKey } from '../logic/enemyAnim';
import { drawGuardian } from './bossSprite';
import { createSpriteSheet, fillPx, linePx, type SheetFrame } from './pixelSheet';

/**
 * Desenha os inimigos em pixel art, quadro a quadro, a partir das poses de
 * src/data/enemySprites.ts. Cada um tem a sua silhueta: o Carniçal encurvado de trapos
 * vermelhos, o Arqueiro Oco encapuzado com o arco de osso, o Vulto que flutua em fiapos e o
 * Cão de Ossos de costelas à mostra. O contorno de 1 px é automático (pixelSheet).
 */

type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };

const OUTLINE = PALETTE.void;

/**
 * Gira o desenho em torno dos pés (para cair deitado), deixando as costas apoiadas no chão. Ao
 * deitar, o corpo anda `slide` px para a direita: a cabeça cai para trás e precisa de espaço.
 */
function withFall(
  ctx: Ctx,
  rotation: number,
  centerX: number,
  ground: number,
  half: number,
  slide: number,
): void {
  if (rotation === 0) return;
  const lying = Math.sin(Math.min(Math.abs(rotation), Math.PI / 2));
  ctx.translate(centerX + Math.round(slide * lying), ground - half);
  ctx.rotate(rotation);
  ctx.translate(-centerX, -ground);
}

// --- Carniçal ----------------------------------------------------------------------------

/** Pele de cadáver esverdeada (tons só deste inimigo, fora da paleta principal). */
const SKIN = 0x7f9470;
const SKIN_LIGHT = 0xa6b88c;
const SKIN_SHADE = 0x546a4e;
const RAG = PALETTE.bloodDark;
const RAG_LIGHT = PALETTE.blood;

function drawLimb(ctx: Ctx, from: Point, to: Point, color: number, thick: number): void {
  linePx(ctx, color, from.x, from.y, to.x, to.y, thick);
}

function drawGhoul(ctx: Ctx, p: GhoulPose): void {
  const cx = 13; // o desenho fica no centro do corpo de colisão, não do quadro
  const ground = 28;
  ctx.save();
  withFall(ctx, p.rotation, cx, ground, 3, 9);

  const hipY = 20 - p.bob;
  const torsoTop = 12 - p.bob;
  const x0 = cx - 3 + p.lean; // tronco curvado: o topo avança com `lean`
  const shoulderF: Point = { x: x0 + 5, y: torsoTop + 2 };
  const shoulderB: Point = { x: x0 + 1, y: torsoTop + 2 };

  const leg = (hipX: number, off: number, lift: number, color: number): void => {
    const foot: Point = { x: hipX + off, y: ground - 2 - lift };
    const knee: Point = {
      x: Math.round((hipX + foot.x) / 2) + 1,
      y: Math.round((hipY + foot.y) / 2),
    };
    drawLimb(ctx, { x: hipX, y: hipY }, knee, color, 2);
    drawLimb(ctx, knee, foot, color, 2);
    fillPx(ctx, PALETTE.bone, foot.x, ground - 1 - lift, 4, 1); // pé com dedos longos
  };
  const claws = (hand: Point): void => {
    fillPx(ctx, PALETTE.bone, hand.x + 1, hand.y + 2, 1, 2);
    fillPx(ctx, PALETTE.bone, hand.x + 2, hand.y + 2, 1, 3);
    fillPx(ctx, PALETTE.bone, hand.x + 3, hand.y + 1, 1, 2);
  };

  // Perna e braço de trás (mais escuros)
  leg(cx - 2, p.legB, p.liftB, SKIN_SHADE);
  const handB: Point = { x: shoulderB.x + p.armB.dx, y: shoulderB.y + p.armB.dy };
  drawLimb(ctx, shoulderB, handB, SKIN_SHADE, 2);
  fillPx(ctx, SKIN_SHADE, handB.x, handB.y + 1, 2, 3);

  // Tronco: trapos vermelhos sobre a pele, barra rasgada
  fillPx(ctx, RAG, x0, torsoTop, 7, hipY - torsoTop + 1);
  fillPx(ctx, RAG_LIGHT, x0, torsoTop, 7, 1);
  fillPx(ctx, SKIN, x0 + 3, torsoTop + 1, 4, 3); // peito à mostra
  fillPx(ctx, SKIN_SHADE, x0 + 4, torsoTop + 2, 1, 1); // costela
  fillPx(ctx, RAG_LIGHT, x0 + 1, torsoTop + 5, 1, 3);
  for (let i = 0; i < 7; i += 2) fillPx(ctx, RAG, x0 + i, hipY + 1, 1, 2 + (i % 4 === 0 ? 1 : 0));

  leg(cx + 1, p.legF, p.liftF, SKIN);

  // Cabeça adiantada de cadáver: bochechas fundas, olhos de brasa, nariz de caveira e dentes
  const hx = x0 + 3;
  const hy = torsoTop - 5;
  fillPx(ctx, SKIN, hx, hy, 6, 6);
  fillPx(ctx, SKIN_LIGHT, hx + 1, hy, 3, 1);
  fillPx(ctx, SKIN_SHADE, hx, hy + 4, 3, 2); // bochecha funda
  fillPx(ctx, SKIN_SHADE, hx - 1, hy + 1, 1, 3); // nuca e cabelos ralos
  fillPx(ctx, PALETTE.stoneDark, hx - 1, hy + 2, 1, 2);
  fillPx(ctx, OUTLINE, hx + 3, hy + 1, 3, 2); // órbita
  fillPx(ctx, PALETTE.glow, hx + 4, hy + 2, 1, 1);
  fillPx(ctx, PALETTE.ember, hx + 5, hy + 2, 1, 1);
  if (p.glare) fillPx(ctx, PALETTE.glow, hx + 3, hy + 1, 3, 1, 0.6);
  fillPx(ctx, OUTLINE, hx + 5, hy + 3, 1, 1); // narina
  if (p.mouth) {
    fillPx(ctx, OUTLINE, hx + 2, hy + 4, 4, 2);
    fillPx(ctx, PALETTE.bone, hx + 2, hy + 4, 1, 1);
    fillPx(ctx, PALETTE.bone, hx + 4, hy + 4, 1, 1);
    fillPx(ctx, PALETTE.bone, hx + 3, hy + 5, 1, 1);
  } else {
    fillPx(ctx, OUTLINE, hx + 2, hy + 4, 4, 1);
    fillPx(ctx, PALETTE.bone, hx + 3, hy + 4, 1, 1);
  }

  // Braço da frente, comprido, com garras
  const handF: Point = { x: shoulderF.x + p.armF.dx, y: shoulderF.y + p.armF.dy };
  drawLimb(ctx, shoulderF, handF, SKIN, 2);
  fillPx(ctx, SKIN_SHADE, shoulderF.x - 1, shoulderF.y - 1, 3, 2); // ombro ossudo
  fillPx(ctx, SKIN, handF.x, handF.y, 2, 2);
  claws(handF);
  ctx.restore();
}

// --- Arqueiro Oco ------------------------------------------------------------------------

const CLOAK = PALETTE.stone;
const CLOAK_DARK = PALETTE.stoneDark;
const CLOAK_LIGHT = PALETTE.stoneLight;
const BONE = PALETTE.bone;
const BONE_SHADE = PALETTE.mist;
const EYE_GREEN = PALETTE.venom;

function drawArcher(ctx: Ctx, p: ArcherPose): void {
  const cx = 15;
  const ground = 26;
  ctx.save();
  withFall(ctx, p.rotation, cx, ground, 4, 9);

  const headTop = 4 - p.bob;
  const shoulderY = headTop + 6;
  const hemY = ground - 5;
  const lean = p.lean;

  // Pés de osso saindo da barra do manto
  const foot = (x: number, lift: number): void => {
    fillPx(ctx, BONE_SHADE, x, hemY, 1, ground - hemY - 2 - lift);
    fillPx(ctx, BONE, x, ground - 2 - lift, 3, 2);
  };
  foot(cx - 3 + p.legB, p.liftB);
  foot(cx + 1 + p.legF, p.liftF);

  // Manto: afunila nos ombros e abre na barra, que balança e é toda esfarrapada
  for (let y = shoulderY; y < hemY; y++) {
    const t = (y - shoulderY) / (hemY - shoulderY);
    const half = 3 + Math.round(t * 3);
    const left = cx - half + Math.round(lean * (1 - t));
    const width = half * 2 + 1;
    fillPx(ctx, CLOAK, left, y, width, 1);
    fillPx(ctx, CLOAK_DARK, left, y, 2, 1);
    fillPx(ctx, CLOAK_LIGHT, left + width - 1, y, 1, 1);
  }
  for (let i = 0; i < 6; i++) {
    const x = cx - 5 + i * 2 + Math.round(p.sway * (i % 2 === 0 ? 1 : -1));
    fillPx(ctx, CLOAK, x, hemY, 1, 1 + (i % 3));
    fillPx(ctx, CLOAK_DARK, x, hemY, 1, 1);
  }

  // "Oco": a barriga do manto é um buraco por onde se veem as costelas
  const holeX = cx - 1 + Math.round(lean * 0.6);
  fillPx(ctx, OUTLINE, holeX, shoulderY + 2, 4, 6);
  fillPx(ctx, BONE_SHADE, holeX, shoulderY + 3, 4, 1);
  fillPx(ctx, BONE_SHADE, holeX, shoulderY + 5, 4, 1);
  fillPx(ctx, BONE, holeX + 1, shoulderY + 2, 1, 6);
  fillPx(ctx, EYE_GREEN, holeX + 3, shoulderY + 7, 1, 1); // brasa verde no vazio

  // Capuz com a face vazia e os olhos verdes
  const hx = cx - 3 + lean;
  fillPx(ctx, CLOAK, hx + 2, headTop, 3, 1);
  fillPx(ctx, CLOAK, hx + 1, headTop + 1, 5, 1);
  fillPx(ctx, CLOAK, hx, headTop + 2, 7, 5);
  fillPx(ctx, CLOAK_DARK, hx, headTop + 2, 2, 5);
  fillPx(ctx, CLOAK_LIGHT, hx + 2, headTop, 2, 1);
  fillPx(ctx, OUTLINE, hx + 3, headTop + 2, 4, 4);
  fillPx(ctx, EYE_GREEN, hx + 3, headTop + 3, 1, 1);
  fillPx(ctx, EYE_GREEN, hx + 5, headTop + 3, 1, 1);
  fillPx(ctx, BONE_SHADE, hx + 4, headTop + 5, 2, 1); // mandíbula

  // Arco de osso na frente e a corda; a mão de trás puxa a corda e a flecha
  const bowX = cx + 8 + lean;
  const bowY = shoulderY + 3 + p.bowDy;
  const reach = Math.round(p.draw * 8);
  const nockX = bowX - reach;
  for (let dy = -7; dy <= 7; dy++) {
    const bend = Math.round((dy * dy) / 22) + Math.round(p.draw);
    fillPx(ctx, BONE, bowX - bend, bowY + dy, 1, 1);
    if (Math.abs(dy) < 6) fillPx(ctx, BONE_SHADE, bowX - bend - 1, bowY + dy, 1, 1);
  }
  const tipX = bowX - Math.round(49 / 22) - Math.round(p.draw);
  const stringMid = p.twang ? bowX + 2 : nockX;
  linePx(ctx, BONE_SHADE, tipX, bowY - 7, stringMid, bowY, 1);
  linePx(ctx, BONE_SHADE, stringMid, bowY, tipX, bowY + 7, 1);
  if (p.nocked) {
    linePx(ctx, BONE, nockX, bowY, bowX + 4, bowY, 1);
    fillPx(ctx, PALETTE.ember, bowX + 3, bowY, 2, 1);
    fillPx(ctx, EYE_GREEN, nockX, bowY - 1, 2, 1);
    fillPx(ctx, EYE_GREEN, nockX, bowY + 1, 2, 1);
  }
  // Braços de osso
  const shoulderF: Point = { x: cx + 3 + lean, y: shoulderY + 1 };
  const shoulderB: Point = { x: cx - 2 + lean, y: shoulderY + 1 };
  linePx(ctx, BONE, shoulderF.x, shoulderF.y, bowX - 1, bowY, 1);
  fillPx(ctx, BONE, bowX - 2, bowY - 1, 2, 3);
  const handB: Point = p.draw > 0 ? { x: nockX, y: bowY } : { x: cx - 4 + lean, y: shoulderY + 8 };
  linePx(ctx, BONE_SHADE, shoulderB.x, shoulderB.y, handB.x, handB.y, 1);
  fillPx(ctx, BONE, handB.x - 1, handB.y - 1, 2, 2);
  ctx.restore();
}

// --- Vulto -------------------------------------------------------------------------------

function drawWraith(ctx: Ctx, p: WraithPose): void {
  const cx = 15;
  const px = (color: number, x: number, y: number, w: number, h: number, a = 1): void =>
    fillPx(ctx, color, x, y, w, h, a * p.alpha);
  ctx.save();
  if (p.inverted) {
    ctx.translate(0, 28);
    ctx.scale(1, -1);
  }

  const top = 6 + Math.round(p.squash / 2) - p.bob;
  const bodyH = Math.max(5, 11 - p.squash);
  for (let r = 0; r < bodyH; r++) {
    const w = r === 0 ? 4 : r === 1 ? 6 : Math.min(10, 8 + Math.floor((r - 2) / 2));
    const shift = Math.round(p.lean * (1 - r / bodyH));
    const x0 = cx - Math.floor(w / 2) + shift;
    px(PALETTE.wraith, x0, top + r, w, 1);
    px(PALETTE.deep, x0, top + r, Math.max(1, Math.floor(w / 4)), 1, 0.5); // lado de trás na sombra
    px(PALETTE.playerAccent, x0 + w - 1, top + r, 1, 1, 0.35); // luz na frente
  }
  px(PALETTE.playerAccent, cx - 1 + p.lean, top, 2, 1, 0.5); // brilho no alto do capuz

  // Capuz: o rosto é um vazio com os olhos acesos
  const fx = cx - 1 + p.lean;
  px(OUTLINE, fx, top + 2, 6, 3);
  if (p.eyes === 'closed') {
    px(PALETTE.mist, fx + 1, top + 3, 4, 1, 0.8);
  } else {
    const eye = p.eyes === 'bright' ? PALETTE.glow : PALETTE.playerAccent;
    px(eye, fx + 1, top + 3, 1, 1);
    px(eye, fx + 4, top + 3, 1, 1);
    if (p.eyes === 'bright') {
      px(PALETTE.ember, fx, top + 3, 1, 1, 0.8);
      px(PALETTE.ember, fx + 5, top + 3, 1, 1, 0.8);
      px(PALETTE.glow, fx + 1, top + 2, 1, 1, 0.4);
      px(PALETTE.glow, fx + 4, top + 2, 1, 1, 0.4);
    }
  }

  // Fiapos soltos embaixo: cada um mais fino e mais transparente que o anterior
  const baseY = top + bodyH;
  for (const [i, dx] of [-4, -1, 2, 5].entries()) {
    const len = p.tailLen + (i % 2) * 2 + 1;
    for (let j = 0; j < len; j++) {
      const sway = Math.round(((p.tailSway * j) / Math.max(1, len)) * (i % 2 === 0 ? 1 : -1));
      px(PALETTE.wraith, cx + dx + sway, baseY + j, 2 - (j > len - 2 ? 1 : 0), 1, 0.85 - j * 0.12);
    }
  }
  // Poeira da morte
  const dust: readonly Point[] = [
    { x: -7, y: 3 },
    { x: 6, y: -2 },
    { x: -3, y: 9 },
    { x: 8, y: 7 },
    { x: 1, y: -5 },
    { x: -8, y: -3 },
  ];
  for (const [i, d] of dust.entries()) {
    if (i < p.scatter) px(PALETTE.wraith, cx + d.x, 14 + d.y, 1, 1, 0.7);
  }
  ctx.restore();
}

// --- Cão de Ossos ------------------------------------------------------------------------

function drawHoundPile(ctx: Ctx): void {
  const g = 17;
  // Costelas abertas no chão, crânio rolado para a frente, ossos soltos
  for (let i = 0; i < 5; i++) {
    fillPx(ctx, BONE, 12 + i * 2, g - 1 - (i % 2), 1, 1 + (i % 2));
    fillPx(ctx, BONE_SHADE, 13 + i * 2, g, 1, 1);
  }
  fillPx(ctx, BONE, 10, g, 12, 1);
  fillPx(ctx, BONE_SHADE, 9, g - 1, 2, 1);
  fillPx(ctx, BONE, 24, g - 3, 5, 3); // crânio
  fillPx(ctx, BONE, 28, g - 2, 3, 2);
  fillPx(ctx, OUTLINE, 26, g - 2, 1, 1);
  fillPx(ctx, PALETTE.ember, 26, g - 2, 1, 1, 0.7);
  linePx(ctx, BONE, 6, g, 9, g - 1, 1); // osso de perna solto
  fillPx(ctx, BONE, 22, g, 3, 1);
  fillPx(ctx, BONE_SHADE, 14, g - 3, 2, 1);
}

function drawHound(ctx: Ctx, p: HoundPose): void {
  if (p.scatter >= 3) {
    drawHoundPile(ctx);
    return;
  }
  const cx = 18;
  const ground = 18;
  const lift = p.air;
  const top = 7 + p.crouch - p.bob - lift; // linha da coluna
  const hipX = cx - 6;
  const shoulderX = cx + 3;

  const leg = (x: number, off: number, liftBy: number, color: number, y: number): void => {
    const foot: Point = { x: x + off, y: ground - 2 - liftBy - lift };
    const knee: Point = { x: Math.round((x + foot.x) / 2) - 1, y: Math.round((y + foot.y) / 2) };
    drawLimb(ctx, { x, y }, knee, color, 1);
    drawLimb(ctx, knee, foot, color, 1);
    fillPx(ctx, color, foot.x, foot.y + 1, 3, 1);
  };

  // Patas do lado de longe (mais escuras), depois o corpo, depois as de perto
  leg(hipX + 1, p.hindB, p.liftHind, BONE_SHADE, top + 3);
  leg(shoulderX + 1, p.frontB, p.liftFront, BONE_SHADE, top + 3);

  // Coluna, bacia e costelas com vãos escuros
  fillPx(ctx, BONE, hipX - 2, top, cx - hipX + 9, 1);
  fillPx(ctx, BONE_SHADE, hipX - 2, top + 1, 4, 3); // bacia
  fillPx(ctx, BONE, hipX - 2, top, 4, 1);
  for (let x = cx - 3; x <= cx + 5; x += 2) {
    fillPx(ctx, BONE, x, top + 1, 1, 5);
    fillPx(ctx, OUTLINE, x + 1, top + 1, 1, 5);
  }
  fillPx(ctx, BONE_SHADE, cx - 3, top + 5, 9, 1); // linha da barriga

  leg(hipX - 1, p.hindA, p.liftHind, BONE, top + 3);
  leg(shoulderX, p.frontA, p.liftFront, BONE, top + 3);

  // Rabo de ossinhos
  linePx(ctx, BONE, hipX - 2, top, hipX - 6, top + p.tail, 1);
  fillPx(ctx, BONE_SHADE, hipX - 7, top + p.tail, 1, 1);

  // Pescoço e crânio
  const sx = cx + 5 + p.head;
  const sy = top - 2 + p.headDy;
  linePx(ctx, BONE_SHADE, cx + 5, top, sx + 1, sy + 2, 2);
  fillPx(ctx, BONE, sx, sy, 6, 5); // crânio
  fillPx(ctx, BONE_SHADE, sx, sy + 3, 6, 2);
  fillPx(ctx, BONE, sx + 1, sy - 2, 1, 2); // orelhas pontudas
  fillPx(ctx, BONE, sx + 3, sy - 1, 1, 1);
  fillPx(ctx, BONE, sx + 5, sy + 1, 4, 2); // focinho
  fillPx(ctx, OUTLINE, sx + 3, sy + 1, 2, 2); // órbita
  fillPx(ctx, PALETTE.ember, sx + 4, sy + 2, 1, 1);
  fillPx(ctx, PALETTE.glow, sx + 4, sy + 1, 1, 1, 0.6);
  // Mandíbula: abre `jaw` px, com dentes
  fillPx(ctx, BONE_SHADE, sx + 4, sy + 3 + p.jaw, 4, 1);
  if (p.jaw > 0) {
    fillPx(ctx, OUTLINE, sx + 5, sy + 3, 4, p.jaw);
    fillPx(ctx, BONE, sx + 5, sy + 3, 1, 1);
    fillPx(ctx, BONE, sx + 7, sy + 3, 1, 1);
    fillPx(ctx, BONE, sx + 6, sy + 2 + p.jaw, 1, 1);
  } else {
    fillPx(ctx, BONE, sx + 6, sy + 3, 1, 1);
  }
}

// --- Lobo Espectral ----------------------------------------------------------------------

const FUR_DARK = 0x2b3a44;
const FUR = 0x4b6573;
const FUR_LIGHT = 0x86a8b4;
const MIST = 0xbfe3e8;
const WOLF_EYE = 0xd9f58a;

function drawWolfWisps(ctx: Ctx, p: HoundPose): void {
  // Sem corpo: restam fiapos de névoa, as patas desfeitas e os olhos acesos, que vão apagando
  const g = 19;
  const fade = p.scatter >= 3 ? 0.45 : 0.7;
  for (const [x, y, w] of [
    [12, g - 1, 10],
    [16, g - 3, 6],
    [10, g - 2, 3],
    [24, g - 2, 5],
    [19, g - 5, 2],
  ] as const) {
    fillPx(ctx, MIST, x, y, w, 1, fade);
  }
  fillPx(ctx, FUR, 14, g, 12, 1, 0.8);
  fillPx(ctx, WOLF_EYE, 26, g - 2, 1, 1, 0.9);
  fillPx(ctx, WOLF_EYE, 24, g - 2, 1, 1, 0.5);
}

function drawWolf(ctx: Ctx, p: HoundPose): void {
  if (p.scatter >= 3) {
    drawWolfWisps(ctx, p);
    return;
  }
  const cx = 21;
  const ground = 21;
  const lift = p.air;
  const top = 9 + p.crouch - p.bob - lift; // linha das costas
  const hipX = cx - 7;
  const shoulderX = cx + 4;

  const leg = (x: number, off: number, liftBy: number, color: number, y: number): void => {
    const foot: Point = { x: x + off, y: ground - 2 - liftBy - lift };
    const knee: Point = { x: Math.round((x + foot.x) / 2) - 1, y: Math.round((y + foot.y) / 2) };
    drawLimb(ctx, { x, y }, knee, color, 2);
    drawLimb(ctx, knee, foot, color, 1);
    fillPx(ctx, color, foot.x, foot.y + 1, 3, 1);
  };

  // Névoa solta atrás do corpo (é um espírito)
  fillPx(ctx, MIST, hipX - 9, top + 3, 5, 1, 0.3);
  fillPx(ctx, MIST, hipX - 6, top + 6, 4, 1, 0.22);

  leg(hipX + 1, p.hindB, p.liftHind, FUR_DARK, top + 4);
  leg(shoulderX + 1, p.frontB, p.liftFront, FUR_DARK, top + 4);

  // Corpo: costas escuras, flanco de pelo e barriga clara
  fillPx(ctx, FUR_DARK, hipX - 3, top, cx - hipX + 11, 2);
  fillPx(ctx, FUR, hipX - 3, top + 1, cx - hipX + 11, 5);
  fillPx(ctx, FUR_LIGHT, hipX - 1, top + 5, cx - hipX + 8, 2);
  fillPx(ctx, FUR_DARK, hipX - 3, top + 3, 3, 3); // anca
  // Pelagem eriçada nas costas
  for (let x = hipX; x <= shoulderX + 3; x += 3) fillPx(ctx, FUR_DARK, x, top - 1, 1, 1);

  leg(hipX - 1, p.hindA, p.liftHind, FUR, top + 4);
  leg(shoulderX, p.frontA, p.liftFront, FUR, top + 4);

  // Rabo de pelo, que balança
  linePx(ctx, FUR, hipX - 3, top + 1, hipX - 8, top + 1 + p.tail, 2);
  fillPx(ctx, FUR_LIGHT, hipX - 9, top + p.tail, 2, 2);

  // Pescoço e cabeça
  const sx = cx + 6 + p.head;
  const sy = top - 3 + p.headDy;
  fillPx(ctx, FUR, cx + 4, top - 1, sx - cx - 2, 5); // pescoço grosso
  fillPx(ctx, FUR, sx, sy, 7, 6); // crânio
  fillPx(ctx, FUR_DARK, sx, sy, 7, 1);
  fillPx(ctx, FUR_DARK, sx + 1, sy - 3, 2, 3); // orelhas pontudas
  fillPx(ctx, FUR_DARK, sx + 4, sy - 2, 2, 2);
  fillPx(ctx, FUR_LIGHT, sx + 6, sy + 2, 5, 3); // focinho
  fillPx(ctx, OUTLINE, sx + 10, sy + 2, 1, 1); // nariz
  fillPx(ctx, WOLF_EYE, sx + 4, sy + 2, 2, 1);
  fillPx(ctx, WOLF_EYE, sx + 3, sy + 2, 1, 1, 0.5);
  // Mandíbula: abre `jaw` px, com presas
  if (p.jaw > 0) {
    fillPx(ctx, OUTLINE, sx + 6, sy + 5, 5, p.jaw);
    fillPx(ctx, MIST, sx + 7, sy + 5, 1, 1);
    fillPx(ctx, MIST, sx + 9, sy + 5, 1, 1);
    fillPx(ctx, FUR_DARK, sx + 6, sy + 5 + p.jaw, 4, 1);
    fillPx(ctx, MIST, sx + 8, sy + 4 + p.jaw, 1, 1);
  } else {
    fillPx(ctx, FUR_DARK, sx + 6, sy + 5, 4, 1);
  }
}

// --- Raiz Emboscadora --------------------------------------------------------------------

const ROOT_BARK = 0x4a3a22;
const ROOT_DARK = 0x2a2013;
const ROOT_LIGHT = 0x6a5430;
const ROOT_MOSS = 0x5f7a2a;
const ROOT_MOSS_LIGHT = 0xa3c04a;
const ROOT_CORE = 0xd9e46a;
const ROOT_CORE_HOT = 0xfff2a0;
const THORN = 0xc9b98a;
const ROOT_WITHER = 0x5a5340;

/** Um cipó: segmentos que se curvam aos poucos; `angle` em graus (0 = para frente, -90 = para cima). */
function drawTendril(
  ctx: Ctx,
  from: Point,
  angle: number,
  length: number,
  curl: number,
  color: number,
  tip: number,
): void {
  let x = from.x;
  let y = from.y;
  let a = angle;
  const segments = 6;
  for (let i = 0; i < segments; i++) {
    const rad = (a * Math.PI) / 180;
    const nx = x + Math.cos(rad) * (length / segments);
    const ny = y + Math.sin(rad) * (length / segments);
    linePx(ctx, color, Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), i < 3 ? 2 : 1);
    if (i % 2 === 1) fillPx(ctx, ROOT_MOSS, Math.round(nx), Math.round(ny) - 1, 1, 1);
    x = nx;
    y = ny;
    a += curl;
  }
  // Espinho na ponta
  fillPx(ctx, tip, Math.round(x), Math.round(y), 2, 1);
  fillPx(ctx, tip, Math.round(x) + 1, Math.round(y) - 1, 1, 1);
}

function drawRoot(ctx: Ctx, p: RootPose): void {
  const cx = 50;
  const ground = 37;
  const dead = p.wither > 0;
  const bark = dead ? ROOT_WITHER : ROOT_BARK;
  const dark = dead ? ROOT_DARK : ROOT_DARK;
  const light = dead ? 0x7a7258 : ROOT_LIGHT;

  // Monte de raízes no chão (sempre aparece)
  for (const [dx, w, h] of [
    [-9, 6, 3],
    [-5, 8, 5],
    [1, 8, 4],
    [5, 6, 3],
    [-2, 5, 6],
  ] as const) {
    fillPx(ctx, bark, cx + dx, ground - h, w, h);
    fillPx(ctx, light, cx + dx, ground - h, w, 1);
    fillPx(ctx, dark, cx + dx + w - 2, ground - h + 1, 2, h - 1);
  }
  fillPx(ctx, ROOT_MOSS, cx - 7, ground - 4, 3, 1);
  fillPx(ctx, ROOT_MOSS_LIGHT, cx + 3, ground - 5, 2, 1);
  fillPx(ctx, dark, cx - 10, ground - 1, 21, 1);
  if (p.rise <= 0) {
    // Dormindo: um brilho fraco entre as raízes
    if (!dead) fillPx(ctx, ROOT_CORE, cx - 1, ground - 3, 1, 1, 0.45);
    return;
  }

  // Tronco que sobe do monte, retorcido (torce um pouco a cada fileira)
  const height = Math.round(p.rise * 14);
  const baseY = ground - 4;
  const topY = baseY - height;
  for (let y = baseY; y > topY; y--) {
    const t = (baseY - y) / Math.max(1, height);
    const width = Math.round(10 - t * 3);
    const twist = Math.round(Math.sin(y * 0.5) * 1.5) + (dead ? Math.round(t * -3) : 0);
    const x0 = cx - Math.floor(width / 2) + twist;
    fillPx(ctx, bark, x0, y, width, 1);
    fillPx(ctx, light, x0, y, 2, 1);
    fillPx(ctx, dark, x0 + width - 2, y, 2, 1);
    if ((y + Math.round(t * 5)) % 4 === 0) fillPx(ctx, dark, x0 + 2, y, width - 4, 1);
  }
  if (!dead && p.rise > 0.3) fillPx(ctx, ROOT_MOSS, cx - 4, baseY - 6, 3, 2);
  if (!dead && p.rise > 0.6) fillPx(ctx, ROOT_MOSS_LIGHT, cx + 2, baseY - 11, 2, 2);

  // Bulbo no alto, com o núcleo (o olho da raiz)
  const bulbY = topY - 4;
  fillPx(ctx, bark, cx - 4, bulbY, 8, 6);
  fillPx(ctx, light, cx - 4, bulbY, 8, 1);
  fillPx(ctx, dark, cx - 4, bulbY + 5, 8, 1);
  const core = p.core === 2 ? ROOT_CORE_HOT : ROOT_CORE;
  if (p.core > 0) {
    fillPx(ctx, core, cx - 1, bulbY + 2, 4, 3);
    fillPx(ctx, ROOT_CORE_HOT, cx, bulbY + 3, 2, 1);
    if (p.core === 2) fillPx(ctx, ROOT_CORE, cx - 3, bulbY + 1, 8, 5, 0.25);
  } else {
    fillPx(ctx, dark, cx - 1, bulbY + 2, 4, 3);
  }

  // Cipós: um para trás, um para cima e o da frente (o que chicoteia)
  if (p.rise < 0.5) return;
  const root: Point = { x: cx, y: bulbY + 2 };
  const sway = p.sway;
  if (dead) {
    drawTendril(ctx, root, 150, 12, -10, bark, THORN);
    drawTendril(ctx, root, 40, 12, 12, bark, THORN);
    return;
  }
  const lash = p.lash;
  const cock = p.cock;
  const front = lash > 0 ? -4 : cock > 0 ? -45 - cock * 105 : -45 + sway * 6;
  const mid = lash > 0 ? -70 : cock > 0 ? -95 - cock * 35 : -92 + sway * 3;
  const back = lash > 0 ? -150 : cock > 0 ? -150 - cock * 22 : -145 - sway * 5;
  const frontLen = lash > 0 ? 10 + lash : 15;
  const frontCurl = lash > 0 ? 0 : cock > 0 ? -4 : 7;
  drawTendril(ctx, root, back, 13, -6, bark, THORN);
  drawTendril(ctx, root, mid, 12, sway > 0 ? 5 : -5, bark, THORN);
  drawTendril(ctx, root, front, frontLen, frontCurl, bark, THORN);
}

// --- Fogo-Fátuo --------------------------------------------------------------------------

const WISP = 0x7fe8ff;
const WISP_SOFT = 0x3a9fb8;
const WISP_CORE = 0xe0ffff;

function drawWisp(ctx: Ctx, p: WraithPose): void {
  const cx = 14 + p.lean;
  const cy = (p.inverted ? 17 : 12) - p.bob; // no mergulho a chama fica em cima: sobra espaço
  const rows = Math.max(5, 9 - p.squash);
  const half = Math.floor(rows / 2);
  const dir = p.inverted ? -1 : 1;
  // Halo suave em volta
  for (const [r, a] of [
    [9, 0.1],
    [6, 0.16],
  ] as const) {
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      fillPx(ctx, WISP, cx - w, cy + dy, w * 2 + 1, 1, a * p.alpha);
    }
  }
  // Corpo: um disco achatado de luz, claro no miolo
  for (let dy = -half; dy <= half; dy++) {
    const w = Math.round(Math.sqrt(Math.max(0, 25 - (dy * dy * 25) / (half * half + 1))));
    fillPx(ctx, WISP_SOFT, cx - w, cy + dy, w * 2 + 1, 1, p.alpha);
    if (Math.abs(dy) < half)
      fillPx(ctx, WISP, cx - w + 1, cy + dy, Math.max(1, w * 2 - 1), 1, p.alpha);
    if (Math.abs(dy) <= 1)
      fillPx(ctx, WISP_CORE, cx - Math.max(0, w - 3), cy + dy, Math.max(1, w * 2 - 5), 1, p.alpha);
  }
  // Olhos: duas fendas escuras (acesas no mergulho)
  const eye = p.eyes === 'bright' ? 0xfff2a0 : OUTLINE;
  if (p.eyes === 'closed') {
    fillPx(ctx, OUTLINE, cx - 3, cy, 6, 1, 0.7 * p.alpha);
  } else {
    fillPx(ctx, eye, cx - 3, cy - 1, 2, 2, p.alpha);
    fillPx(ctx, eye, cx + 1, cy - 1, 2, 2, p.alpha);
  }
  // Chama que escorre atrás (para baixo, ou para cima no mergulho), balançando
  const len = p.tailLen + 3;
  for (let i = 0; i < len; i++) {
    const sway = Math.round((p.tailSway * i) / Math.max(1, len));
    const width = Math.max(1, 4 - Math.floor((i * 4) / len));
    const y = cy + dir * (half + 1 + i);
    fillPx(
      ctx,
      WISP_SOFT,
      cx - Math.floor(width / 2) + sway,
      y,
      width,
      1,
      (0.85 - i * 0.1) * p.alpha,
    );
  }
  // Fagulhas soltas (a morte)
  for (const [i, [dx, dy]] of [
    [-9, -4],
    [8, -6],
    [-5, 8],
    [10, 5],
    [0, -10],
    [-11, 3],
  ].entries()) {
    if (i < p.scatter) fillPx(ctx, WISP, cx + (dx ?? 0), cy + (dy ?? 0), 1, 1, 0.8);
  }
}

// --- Sapo Peçonhento ---------------------------------------------------------------------

const FROG = 0x4f7a3a;
const FROG_DARK = 0x2e4a24;
const FROG_LIGHT = 0x8ac24a;
const FROG_BELLY = 0xcfe69a;
const FROG_EYE = 0xf0cf62;
const FROG_WART = 0x6a5230;

function drawFrog(ctx: Ctx, p: FrogPose): void {
  const cx = 14;
  const ground = 18;
  const lift = p.air;
  const bodyY = ground - 8 + p.crouch - p.bob - lift; // topo do corpo
  const flat = p.flat;

  // Pernas de trás: coxa dobrada e pé comprido; esticam no pulo
  const hindX = cx - 4;
  const foot = { x: hindX - 2 - p.legs, y: ground - 1 - lift + (p.legs > 0 ? 0 : 0) };
  linePx(
    ctx,
    FROG_DARK,
    hindX + 2,
    bodyY + 4,
    hindX - 1 - Math.floor(p.legs / 2),
    bodyY + 6 + Math.floor(p.legs / 2),
    2,
  );
  linePx(
    ctx,
    FROG_DARK,
    hindX - 1 - Math.floor(p.legs / 2),
    bodyY + 6 + Math.floor(p.legs / 2),
    foot.x,
    foot.y,
    1,
  );
  fillPx(ctx, FROG_DARK, foot.x - 2, foot.y, 4, 1); // pé espalmado

  // Corpo gordo: costas escuras e verdes, barriga clara
  const h = Math.max(3, 7 - flat);
  for (let r = 0; r < h; r++) {
    const w = r === 0 ? 8 : r < h - 1 ? 12 : 10;
    fillPx(ctx, r === 0 ? FROG_DARK : FROG, cx - Math.floor(w / 2), bodyY + r, w, 1);
  }
  fillPx(ctx, FROG_LIGHT, cx - 3, bodyY + 1, 5, 1);
  fillPx(ctx, FROG_BELLY, cx - 3, bodyY + h - 1, 8, 1);
  for (const [dx, dy] of [
    [-4, 2],
    [1, 1],
    [3, 3],
    [-1, 3],
  ] as const) {
    if (dy < h) fillPx(ctx, FROG_WART, cx + dx, bodyY + dy, 1, 1);
  }

  // Pata da frente
  fillPx(ctx, FROG, cx + 3, bodyY + h - 1, 2, ground - (bodyY + h) - lift + 1);
  fillPx(ctx, FROG_DARK, cx + 3, ground - 1 - lift, 4, 1);

  // Cabeça, mais alta quando prepara o cuspe
  const hx = cx + 4;
  const hy = bodyY - 2 - p.headUp + Math.floor(flat / 2);
  fillPx(ctx, FROG, hx, hy + 1, 6, 4);
  fillPx(ctx, FROG_LIGHT, hx + 1, hy + 1, 3, 1);
  // Olhos saltados no alto da cabeça
  for (const ex of [hx + 1, hx + 4]) {
    fillPx(ctx, FROG, ex - 1, hy - 1, 3, 3);
    if (p.eyesClosed) fillPx(ctx, FROG_DARK, ex - 1, hy, 3, 1);
    else {
      fillPx(ctx, FROG_EYE, ex, hy - 1, 2, 2);
      fillPx(ctx, OUTLINE, ex + 1, hy, 1, 1);
    }
  }
  // Boca: linha escura, ou aberta cuspindo
  if (p.mouth > 0) {
    fillPx(ctx, OUTLINE, hx + 3, hy + 3, 4, p.mouth);
    fillPx(ctx, FROG_BELLY, hx + 4, hy + 3 + p.mouth, 3, 1);
    fillPx(ctx, 0xb8ffd0, hx + 6, hy + 3, 2, 1, 0.9); // gota de veneno saindo
  } else {
    fillPx(ctx, OUTLINE, hx + 2, hy + 4, 5, 1);
  }
  // Papada: incha com o veneno
  if (p.sac > 0) {
    const r = 1 + p.sac;
    for (let dy = 0; dy < r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy) * 1.4);
      fillPx(ctx, p.sac >= 3 ? 0xb8ffd0 : FROG_BELLY, hx + 2 - w + 2, hy + 5 + dy, w * 2, 1);
    }
    if (p.sac >= 2) fillPx(ctx, FROG_LIGHT, hx + 2, hy + 6, 2, 1, 0.8);
  }
}

// --- Criação das texturas e animações ----------------------------------------------------

// --- Soldado Caído -----------------------------------------------------------------------

const STEEL = 0x6c7488;
const STEEL_DARK = 0x3c4254;
const STEEL_LIGHT = 0x9aa3b8;
const RUST = 0x7a4a2c;
const TABARD = 0x5a2a46;
const TABARD_DARK = 0x3a1a2e;
const SPEAR_WOOD = 0x6a4a2c;
const SOLDIER_EYE = 0xb48cff;

function drawSoldier(ctx: Ctx, p: SoldierPose): void {
  const cx = 31;
  const ground = 28;
  ctx.save();
  withFall(ctx, p.rotation, cx, ground, 3, 12);

  const hipY = 21 - p.bob;
  const torsoTop = 12 - p.bob;
  const x0 = cx - 4 + p.lean;

  const leg = (hipX: number, off: number, lift: number, color: number, boot: number): void => {
    const foot: Point = { x: hipX + off, y: ground - 3 - lift };
    drawLimb(ctx, { x: hipX, y: hipY }, foot, color, 3);
    fillPx(ctx, boot, foot.x - 1, ground - 2 - lift, 5, 2);
  };
  leg(cx - 3, p.legB, p.liftB, STEEL_DARK, RUST);

  // Braço de trás, junto do corpo
  fillPx(ctx, STEEL_DARK, x0 - 1, torsoTop + 1, 2, 7);

  // Tronco: cota de malha enferrujada, tabardo rasgado por cima e cinto
  fillPx(ctx, STEEL, x0, torsoTop, 8, hipY - torsoTop + 1);
  fillPx(ctx, STEEL_LIGHT, x0, torsoTop, 8, 1);
  fillPx(ctx, STEEL_DARK, x0, torsoTop + 1, 1, hipY - torsoTop);
  fillPx(ctx, TABARD, x0 + 1, torsoTop + 3, 6, hipY - torsoTop + 3);
  fillPx(ctx, TABARD_DARK, x0 + 1, torsoTop + 3, 1, hipY - torsoTop + 3);
  for (let i = 1; i < 7; i += 2)
    fillPx(ctx, TABARD, x0 + i, hipY + 5, 1, 1 + (i % 3 === 1 ? 1 : 0));
  fillPx(ctx, STEEL_DARK, x0, hipY - 1, 8, 1);
  fillPx(ctx, RUST, x0 + 3, hipY - 1, 2, 1);
  fillPx(ctx, TABARD_DARK, x0 + 3, torsoTop + 5, 1, 1); // furo do tabardo

  leg(cx + 1, p.legF, p.liftF, STEEL, RUST);

  // Elmo com a viseira aberta: olhos de brasa lilás e uma pluma esfarrapada
  const hx = x0;
  const hy = torsoTop - 8;
  fillPx(ctx, STEEL, hx + 1, hy, 6, 1);
  fillPx(ctx, STEEL, hx, hy + 1, 8, 6);
  fillPx(ctx, STEEL_LIGHT, hx + 1, hy, 4, 1);
  fillPx(ctx, STEEL_DARK, hx, hy + 1, 1, 6);
  fillPx(ctx, STEEL_DARK, hx + 7, hy + 5, 1, 2);
  fillPx(ctx, STEEL_DARK, hx + 1, hy + 6, 6, 2); // gorjal
  fillPx(ctx, OUTLINE, hx + 3, hy + 3, 5, 2); // fenda da viseira
  fillPx(ctx, SOLDIER_EYE, hx + 5, hy + 3, 1, 1);
  fillPx(ctx, SOLDIER_EYE, hx + 7, hy + 3, 1, 1);
  if (p.glare) fillPx(ctx, PALETTE.glow, hx + 3, hy + 3, 5, 1, 0.55);
  fillPx(ctx, STEEL_DARK, hx + 5, hy + 1, 1, 3); // protetor do nariz
  fillPx(ctx, TABARD, hx + 2, hy - 2, 3, 2);
  fillPx(ctx, TABARD_DARK, hx + 1, hy - 1, 1, 1);

  // Lança: cabo de madeira e ponta de ferro; a mão da frente a segura
  const hand: Point = { x: cx + 4 + p.lean, y: torsoTop + 7 };
  const butt: Point = { x: hand.x + p.butt.dx, y: hand.y + p.butt.dy };
  const tip: Point = { x: hand.x + p.tip.dx, y: hand.y + p.tip.dy };
  linePx(ctx, SPEAR_WOOD, butt.x, butt.y, tip.x, tip.y, 1);
  fillPx(ctx, STEEL_LIGHT, tip.x - 2, tip.y - 1, 3, 3);
  fillPx(ctx, STEEL, tip.x - 1, tip.y, 2, 1);

  // Braço da frente e escudo: erguido cobre o peito, baixo fica junto da perna
  const shoulder: Point = { x: x0 + 6, y: torsoTop + 2 };
  drawLimb(ctx, shoulder, hand, STEEL, 2);
  fillPx(ctx, STEEL_LIGHT, shoulder.x - 1, shoulder.y - 1, 4, 2); // ombreira
  fillPx(ctx, STEEL_LIGHT, hand.x, hand.y, 2, 2);
  const rows = p.shieldUp ? 14 : 8;
  const sx = cx + 5 + p.lean;
  const sy = p.shieldUp ? torsoTop - 1 : torsoTop + 8;
  for (let r = 0; r < rows; r++) {
    const w = 6 - (r > rows - 5 ? r - (rows - 5) : 0);
    fillPx(ctx, STEEL_DARK, sx + (6 - w), sy + r, w, 1);
    fillPx(ctx, STEEL, sx + (6 - w), sy + r, Math.max(1, w - 2), 1);
  }
  fillPx(ctx, STEEL_LIGHT, sx + 1, sy, 5, 1); // aro do escudo
  fillPx(ctx, TABARD, sx + 2, sy + 2, 2, rows - 5); // listra pintada, já descascada
  fillPx(ctx, STEEL_LIGHT, sx + 2, sy + Math.floor(rows / 2) - 1, 2, 2); // o umbo
  ctx.restore();
}

// --- Necromante --------------------------------------------------------------------------

const ROBE = 0x2a1f3a;
const ROBE_DARK = 0x1a1226;
const ROBE_LIGHT = 0x4a3a66;
const NECRO_EYE = 0xb48cff;
const NECRO_EYE_HOT = 0xf0e0ff;

function drawNecro(ctx: Ctx, p: NecroPose): void {
  const cx = 18;
  const ground = 34;
  ctx.save();
  withFall(ctx, p.rotation, cx, ground, 4, 9);

  const shoulderY = 17 - p.bob;
  const hemY = ground - 2;
  const lean = p.lean;

  // Manto: afunila nos ombros e abre na barra rasgada
  for (let y = shoulderY; y < hemY; y++) {
    const t = (y - shoulderY) / (hemY - shoulderY);
    const half = 3 + Math.round(t * 3);
    const left = cx - half + Math.round(lean * (1 - t));
    fillPx(ctx, ROBE, left, y, half * 2 + 1, 1);
    fillPx(ctx, ROBE_DARK, left, y, 2, 1);
    fillPx(ctx, ROBE_LIGHT, left + half * 2, y, 1, 1);
  }
  for (let i = 0; i < 7; i++) {
    const x = cx - 6 + i * 2 + Math.round(p.sway * (i % 2 === 0 ? 1 : -1));
    fillPx(ctx, ROBE, x, hemY, 1, 1 + (i % 3));
    fillPx(ctx, ROBE_DARK, x, hemY, 1, 1);
  }
  fillPx(ctx, ROBE_LIGHT, cx - 1 + lean, shoulderY + 3, 1, hemY - shoulderY - 3); // friso do manto
  fillPx(ctx, PALETTE.bone, cx - 2 + lean, shoulderY + 7, 4, 1); // cinto de ossos
  fillPx(ctx, PALETTE.mist, cx - 1 + lean, shoulderY + 7, 1, 1);

  // Capuz com a face de caveira e os olhos acesos
  const hx = cx - 4 + lean;
  const hy = shoulderY - 8;
  fillPx(ctx, ROBE, hx + 2, hy, 4, 1);
  fillPx(ctx, ROBE, hx + 1, hy + 1, 6, 1);
  fillPx(ctx, ROBE, hx, hy + 2, 8, 6);
  fillPx(ctx, ROBE_DARK, hx, hy + 2, 2, 6);
  fillPx(ctx, ROBE_LIGHT, hx + 3, hy, 2, 1);
  fillPx(ctx, OUTLINE, hx + 3, hy + 2, 5, 5);
  if (p.eyes === 'closed') {
    fillPx(ctx, PALETTE.mist, hx + 4, hy + 4, 3, 1, 0.8);
  } else {
    const eye = p.eyes === 'bright' ? NECRO_EYE_HOT : NECRO_EYE;
    fillPx(ctx, eye, hx + 4, hy + 3, 1, 1);
    fillPx(ctx, eye, hx + 6, hy + 3, 1, 1);
    if (p.eyes === 'bright') fillPx(ctx, NECRO_EYE, hx + 3, hy + 3, 5, 1, 0.5);
  }
  fillPx(ctx, PALETTE.bone, hx + 4, hy + 6, 3, 1); // mandíbula
  fillPx(ctx, PALETTE.mist, hx + 5, hy + 6, 1, 1);

  // Cajado com a caveira no topo; o braço o apoia, ergue ou aponta para a frente
  const staffX = cx + 6 + lean + (p.arm === 2 ? 5 : 0);
  const topY = p.arm === 0 ? shoulderY - 4 : p.arm === 1 ? shoulderY - 6 : shoulderY - 2;
  const handY = shoulderY + (p.arm === 0 ? 7 : p.arm === 1 ? 3 : 4);
  linePx(ctx, SPEAR_WOOD, staffX, ground - 1, staffX, topY + 3, 1);
  fillPx(ctx, PALETTE.bone, staffX - 1, topY, 3, 3);
  fillPx(ctx, OUTLINE, staffX - 1, topY + 1, 1, 1);
  fillPx(ctx, OUTLINE, staffX + 1, topY + 1, 1, 1);
  fillPx(ctx, PALETTE.mist, staffX, topY + 3, 1, 1);
  const shoulder: Point = { x: cx + 4 + lean, y: shoulderY + 1 };
  drawLimb(ctx, shoulder, { x: staffX, y: handY }, ROBE_LIGHT, 2);
  fillPx(ctx, PALETTE.bone, staffX - 1, handY - 1, 2, 2);
  // Braço de trás
  const backHand: Point = {
    x: cx - 5 + lean,
    y: p.arm === 1 ? shoulderY - 4 : shoulderY + 8,
  };
  drawLimb(ctx, { x: cx - 3 + lean, y: shoulderY + 1 }, backHand, ROBE_DARK, 2);
  fillPx(ctx, PALETTE.bone, backHand.x - 1, backHand.y - 1, 2, 2);

  // Orbe de energia sobre a caveira: cresce enquanto ele conjura
  if (p.orb > 0) {
    const r = p.orb;
    const size = r * 2 + 1;
    const top = topY - 2 - 2 * r;
    fillPx(ctx, NECRO_EYE, staffX - r - 1, top - 1, size + 2, size + 2, 0.18);
    // Esfera: as fileiras de cima e de baixo e as laterais ficam mais curtas (cantos cortados)
    for (let row = 0; row < size; row++) {
      const edge = row === 0 || row === size - 1;
      const inset = edge && r > 1 ? 1 : 0;
      fillPx(ctx, NECRO_EYE, staffX - r + inset, top + row, size - inset * 2, 1);
    }
    fillPx(ctx, NECRO_EYE_HOT, staffX - Math.floor(r / 2), topY - 2 - 2 * r + 1, r, r);
  }
  ctx.restore();
}

// --- Golem de Pedra ----------------------------------------------------------------------

const ROCK = 0x6a6258;
const ROCK_DARK = 0x3e3832;
const ROCK_LIGHT = 0x9a8f80;
const ROCK_MOSS = 0x5f7a3a;
const GOLEM_CRACK = 0xffb04a;
const GOLEM_CRACK_HOT = 0xfff0c0;

/** Uma pedra com luz em cima e sombra embaixo. */
function rockBlock(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  fillPx(ctx, ROCK, x, y, w, h);
  fillPx(ctx, ROCK_LIGHT, x, y, w, 1);
  fillPx(ctx, ROCK_LIGHT, x, y, 1, h);
  fillPx(ctx, ROCK_DARK, x, y + h - 1, w, 1);
  fillPx(ctx, ROCK_DARK, x + w - 1, y, 1, h);
}

function drawGolem(ctx: Ctx, p: GolemPose): void {
  const cx = 23;
  const ground = 40;

  if (p.crumble === 3) {
    // Só o monte de pedras, com a brasa do coração quase apagada
    rockBlock(ctx, cx - 11, ground - 5, 9, 5);
    rockBlock(ctx, cx - 3, ground - 8, 10, 8);
    rockBlock(ctx, cx + 6, ground - 4, 8, 4);
    rockBlock(ctx, cx - 6, ground - 11, 6, 4);
    rockBlock(ctx, cx + 1, ground - 12, 5, 4);
    fillPx(ctx, GOLEM_CRACK, cx + 1, ground - 6, 2, 2, 0.5);
    return;
  }

  const hipY = 29 - p.bob;
  const torsoTop = 15 - p.bob;
  const x0 = cx - 8 + p.lean;

  const leg = (hipX: number, off: number, lift: number, shade: boolean): void => {
    const top = hipY - 2;
    const bottom = ground - 3 - lift;
    fillPx(ctx, shade ? ROCK_DARK : ROCK, hipX + off, top, 6, bottom - top);
    fillPx(ctx, shade ? ROCK_DARK : ROCK_LIGHT, hipX + off, top, 1, bottom - top);
    rockBlock(ctx, hipX + off - 1, bottom, 8, 3);
  };
  leg(cx - 6, p.legB, p.liftB, true);

  // Braço de trás
  const shoulderB = { x: x0 + 1, y: torsoTop + 3 };
  linePx(
    ctx,
    ROCK_DARK,
    shoulderB.x,
    shoulderB.y,
    shoulderB.x + p.armB.dx,
    shoulderB.y + p.armB.dy,
    5,
  );
  rockBlock(ctx, shoulderB.x + p.armB.dx - 3, shoulderB.y + p.armB.dy, 8, 8);

  // Tronco: um bloco largo em cima que afunila na cintura, com musgo e rachaduras que brilham
  for (let y = torsoTop; y < hipY + 1; y++) {
    const t = (y - torsoTop) / Math.max(1, hipY - torsoTop);
    const half = Math.round(9 - t * 3);
    fillPx(ctx, ROCK, cx - half + p.lean, y, half * 2, 1);
    fillPx(ctx, ROCK_DARK, cx + half - 3 + p.lean, y, 3, 1);
    fillPx(ctx, ROCK_LIGHT, cx - half + p.lean, y, 2, 1);
  }
  fillPx(ctx, ROCK_LIGHT, cx - 9 + p.lean, torsoTop, 18, 1);
  fillPx(ctx, ROCK_MOSS, cx - 6 + p.lean, torsoTop + 1, 5, 2);
  fillPx(ctx, ROCK_MOSS, cx + 3 + p.lean, hipY - 3, 3, 2);
  if (p.glow > 0) {
    const a = p.glow === 2 ? 1 : 0.55;
    fillPx(ctx, GOLEM_CRACK, cx - 1 + p.lean, torsoTop + 4, 1, 6, a);
    fillPx(ctx, GOLEM_CRACK, cx + p.lean, torsoTop + 9, 3, 1, a);
    fillPx(ctx, GOLEM_CRACK, cx - 4 + p.lean, torsoTop + 7, 3, 1, a);
    if (p.glow === 2) fillPx(ctx, GOLEM_CRACK_HOT, cx - 1 + p.lean, torsoTop + 6, 1, 2);
  }

  leg(cx, p.legF, p.liftF, false);

  // Cabeça pequena, afundada entre os ombros: olhos de brasa e uma fenda de boca
  const hx = cx - 4 + p.lean;
  const hy = torsoTop - 6;
  rockBlock(ctx, hx, hy, 8, 7);
  fillPx(ctx, OUTLINE, hx + 1, hy + 2, 6, 2);
  const eye = p.glow === 0 ? ROCK_LIGHT : p.glow === 2 ? GOLEM_CRACK_HOT : GOLEM_CRACK;
  fillPx(ctx, eye, hx + 2, hy + 2, 1, 1);
  fillPx(ctx, eye, hx + 5, hy + 2, 1, 1);
  fillPx(ctx, OUTLINE, hx + 2, hy + 5, 4, 1);

  // Ombros de pedregulho e o braço da frente
  const shoulderF = { x: x0 + 15, y: torsoTop + 3 };
  rockBlock(ctx, x0 - 3, torsoTop - 1, 6, 5);
  rockBlock(ctx, shoulderF.x - 2, torsoTop - 1, 6, 5);
  linePx(ctx, ROCK, shoulderF.x, shoulderF.y, shoulderF.x + p.armF.dx, shoulderF.y + p.armF.dy, 5);
  rockBlock(ctx, shoulderF.x + p.armF.dx - 3, shoulderF.y + p.armF.dy, 8, 8);

  // Pedaços que se soltam (a morte)
  if (p.crumble === 1) {
    rockBlock(ctx, cx - 14, ground - 9, 4, 4);
    rockBlock(ctx, cx + 11, ground - 12, 5, 4);
    rockBlock(ctx, cx - 10, ground - 3, 5, 3);
  }
}

// --- Morcego de Cristal ------------------------------------------------------------------

const BAT = 0x3a2f4a;
const BAT_DARK = 0x241b30;
const BAT_LIGHT = 0x5e4e78;
const CRYSTAL = 0x4ae0d0;
const CRYSTAL_HOT = 0xc8fff8;

function drawBat(ctx: Ctx, p: BatPose): void {
  const cx = 18;
  const cy = 15 - p.bob;
  const px = (color: number, x: number, y: number, w: number, h: number, a = 1): void =>
    fillPx(ctx, color, x, y, w, h, a * p.alpha);

  // Asas: uma membrana que sai do ombro, com a ponta subindo ou descendo conforme o bater
  const reach = Math.round(3 + p.spread * 10);
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < reach; i++) {
      const t = i / reach;
      const x = side < 0 ? cx - 3 - i : cx + 2 + i;
      const top = cy - 1 + Math.round(p.flap * t);
      const height = Math.max(2, Math.round(5 - t * 3));
      px(BAT_DARK, x, top, 1, height);
      px(BAT_LIGHT, x, top, 1, 1);
      if (i % 4 === 3) px(BAT_DARK, x, top + height, 1, 1); // ponta de dedo na borda
    }
  }

  // Corpo pequeno e peludo, com orelhas de ponta
  const bodyH = Math.max(5, 9 - p.squash);
  const top = cy - 4 + Math.round(p.squash / 2);
  for (let r = 0; r < bodyH; r++) {
    const w = r === 0 ? 4 : r < 3 ? 6 : r > bodyH - 3 ? 4 : 7;
    px(BAT, cx - Math.floor(w / 2), top + r, w, 1);
    px(BAT_DARK, cx - Math.floor(w / 2), top + r, 1, 1);
    px(BAT_LIGHT, cx + Math.floor(w / 2) - 1, top + r, 1, 1, 0.6);
  }
  px(BAT, cx - 3, top - 2, 2, 2);
  px(BAT, cx + 1, top - 2, 2, 2);

  // Cristais nas costas e nos ombros
  const crystal = p.glow ? CRYSTAL_HOT : CRYSTAL;
  px(CRYSTAL, cx - 1, top - 3, 1, 3);
  px(crystal, cx, top - 4, 1, 4);
  px(CRYSTAL, cx + 2, top - 2, 1, 2);
  if (p.glow) px(CRYSTAL, cx - 3, top - 2, 7, 2, 0.35);

  // Olhos
  if (p.eyes === 'closed') {
    px(BAT_LIGHT, cx - 2, top + 2, 4, 1, 0.8);
  } else {
    const eye = p.eyes === 'bright' ? CRYSTAL_HOT : CRYSTAL;
    px(eye, cx - 2, top + 2, 1, 1);
    px(eye, cx + 1, top + 2, 1, 1);
  }
  px(BAT_DARK, cx - 1, top + 4, 2, 1); // focinho
  px(PALETTE.bone, cx - 1, top + 5, 1, 1, 0.8); // presa

  // Cacos de cristal soltos (a morte)
  for (let i = 0; i < p.scatter; i++) {
    px(CRYSTAL, cx - 8 + i * 3, cy + 4 + (i % 2) * 2, 1, 2, 0.8);
  }
}

// --- Aldeão em Chamas --------------------------------------------------------------------

const SOOT = 0x2a2220;
const SOOT_LIGHT = 0x4a3c36;
const BURNT_CLOTH = 0x5a3a2a;
const BURNT_CLOTH_DARK = 0x362218;
const FIRE_DEEP = 0xb8381a;
const FIRE = 0xff7a2a;
const FIRE_HOT = 0xffc04a;
const FIRE_CORE = 0xfff0c0;

/** Uma língua de fogo: base escura, corpo laranja e miolo claro. A base fica em (x, y + h). */
function fireTongue(ctx: Ctx, x: number, y: number, h: number, hot: boolean): void {
  fillPx(ctx, FIRE_DEEP, x - 1, y + 1, 3, h - 1);
  fillPx(ctx, FIRE, x, y, 2, h);
  fillPx(ctx, hot ? FIRE_CORE : FIRE_HOT, x, y + 2, 1, Math.max(1, h - 3));
}

function drawVillager(ctx: Ctx, p: GhoulPose): void {
  const cx = 13;
  const ground = 28;
  ctx.save();
  withFall(ctx, p.rotation, cx, ground, 3, 9);

  const hipY = 20 - p.bob;
  const torsoTop = 12 - p.bob;
  const x0 = cx - 3 + p.lean;
  const shoulderF: Point = { x: x0 + 5, y: torsoTop + 2 };
  const shoulderB: Point = { x: x0 + 1, y: torsoTop + 2 };

  const leg = (hipX: number, off: number, lift: number, color: number): void => {
    const foot: Point = { x: hipX + off, y: ground - 2 - lift };
    const knee: Point = {
      x: Math.round((hipX + foot.x) / 2) + 1,
      y: Math.round((hipY + foot.y) / 2),
    };
    drawLimb(ctx, { x: hipX, y: hipY }, knee, color, 2);
    drawLimb(ctx, knee, foot, color, 2);
    fillPx(ctx, SOOT, foot.x, ground - 1 - lift, 4, 1);
  };

  // Perna e braço de trás
  leg(cx - 2, p.legB, p.liftB, BURNT_CLOTH_DARK);
  const handB: Point = { x: shoulderB.x + p.armB.dx, y: shoulderB.y + p.armB.dy };
  drawLimb(ctx, shoulderB, handB, SOOT, 2);
  fillPx(ctx, SOOT_LIGHT, handB.x, handB.y + 1, 2, 2);

  // Tronco: roupa chamuscada com buracos que deixam ver a pele escurecida
  fillPx(ctx, BURNT_CLOTH, x0, torsoTop, 7, hipY - torsoTop + 1);
  fillPx(ctx, BURNT_CLOTH_DARK, x0, torsoTop, 2, hipY - torsoTop + 1);
  fillPx(ctx, SOOT, x0 + 3, torsoTop + 2, 3, 3);
  fillPx(ctx, SOOT, x0 + 1, torsoTop + 6, 2, 2);
  for (let i = 0; i < 7; i += 2)
    fillPx(ctx, BURNT_CLOTH, x0 + i, hipY + 1, 1, 2 + (i % 4 === 0 ? 1 : 0));

  leg(cx + 1, p.legF, p.liftF, BURNT_CLOTH);

  // Cabeça enegrecida de fuligem, boca aberta num grito
  const hx = x0 + 3;
  const hy = torsoTop - 5;
  fillPx(ctx, SOOT, hx, hy, 6, 6);
  fillPx(ctx, SOOT_LIGHT, hx + 1, hy, 3, 1);
  fillPx(ctx, OUTLINE, hx + 3, hy + 1, 3, 2);
  fillPx(ctx, p.glare ? FIRE_CORE : FIRE_HOT, hx + 4, hy + 2, 1, 1);
  fillPx(ctx, OUTLINE, hx + 2, hy + 4, 4, 2);
  fillPx(ctx, PALETTE.bone, hx + 3, hy + 4, 1, 1);

  // Braço da frente, esticado, com a mão em brasa
  const handF: Point = { x: shoulderF.x + p.armF.dx, y: shoulderF.y + p.armF.dy };
  drawLimb(ctx, shoulderF, handF, SOOT_LIGHT, 2);
  fillPx(ctx, SOOT, handF.x, handF.y, 2, 2);

  // Chamas: na cabeça, nos ombros, nas costas e na mão; mais altas ao se preparar para o bote
  if (p.rotation !== 0) {
    ctx.restore();
    return; // caído no chão, sem chamas (o fogo se apagou)
  }
  const seed = Math.abs(p.bob * 3 + p.legF + p.lean * 2 + p.liftF + p.liftB);
  const boost = p.glare ? 2 : 0;
  fireTongue(ctx, hx + 1, hy - 3 - boost, 4 + boost + (seed % 2), p.glare);
  fireTongue(ctx, hx + 4, hy - 2 - boost, 3 + boost, p.glare);
  fireTongue(ctx, x0 + 1, torsoTop - 2 - (seed % 2), 3 + boost, false);
  fireTongue(ctx, x0 + 6, torsoTop - 1, 3 + boost, p.glare);
  fireTongue(ctx, handF.x, handF.y - 3, 3 + (seed % 2), false);
  fireTongue(ctx, x0 - 1, torsoTop + 4, 3, false);
  ctx.restore();
}

// --- Corvo Carniceiro --------------------------------------------------------------------

const CROW = 0x1e1a22;
const CROW_LIGHT = 0x3a3440;
const CROW_SHEEN = 0x5a5470;
const CROW_BEAK = 0x9a8a62;
const CROW_EYE = 0xff4a3a;

function drawCrow(ctx: Ctx, p: BatPose): void {
  const cx = 18;
  const cy = 15 - p.bob;
  const px = (color: number, x: number, y: number, w: number, h: number, a = 1): void =>
    fillPx(ctx, color, x, y, w, h, a * p.alpha);

  // Asas: penas compridas que saem do ombro; a ponta sobe ou desce conforme o bater
  const reach = Math.round(4 + p.spread * 10);
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < reach; i++) {
      const t = i / reach;
      const x = side < 0 ? cx - 3 - i : cx + 2 + i;
      const top = cy - 1 + Math.round(p.flap * t);
      const height = Math.max(2, Math.round(5 - t * 2));
      px(CROW, x, top, 1, height);
      px(CROW_LIGHT, x, top, 1, 1);
      if (i % 3 === 2) px(CROW, x, top + height, 1, 2); // pena solta na borda
    }
  }

  // Corpo: peito arredondado, cauda de penas para trás e cabeça de bico longo para a frente
  const bodyH = Math.max(5, 8 - p.squash);
  const top = cy - 3 + Math.round(p.squash / 2);
  for (let r = 0; r < bodyH; r++) {
    const w = r === 0 ? 4 : r < 3 ? 7 : r > bodyH - 3 ? 4 : 8;
    px(CROW, cx - Math.floor(w / 2), top + r, w, 1);
    px(CROW_SHEEN, cx + Math.floor(w / 2) - 2, top + r, 1, 1, 0.5);
  }
  px(CROW, cx - 7, top + 3, 4, 2); // cauda
  px(CROW_LIGHT, cx - 8, top + 4, 2, 1);
  px(CROW, cx + 2, top - 1, 4, 4); // cabeça
  px(CROW_BEAK, cx + 6, top + 1, 3, 1);
  px(CROW_BEAK, cx + 6, top + 2, 2, 1, 0.8);
  if (p.eyes === 'closed') {
    px(CROW_LIGHT, cx + 4, top, 1, 1);
  } else {
    px(p.eyes === 'bright' ? 0xffd0c0 : CROW_EYE, cx + 4, top, 1, 1);
  }
  if (p.glow) px(CROW_EYE, cx + 3, top - 1, 3, 1, 0.4);

  // Penas soltas (a morte)
  for (let i = 0; i < p.scatter; i++) {
    px(CROW_LIGHT, cx - 8 + i * 3, cy + 4 + (i % 2) * 2, 2, 1, 0.8);
  }
}

function sheetCell(def: EnemyBody, sheet: EnemySheet<unknown>): { width: number; height: number } {
  return { width: def.width + sheet.pad.x * 2, height: def.height + sheet.pad.y * 2 };
}

function buildSheet<P>(
  scene: Phaser.Scene,
  def: EnemyBody,
  sheet: EnemySheet<P>,
  draw: (ctx: Ctx, pose: P) => void,
): void {
  const cell = sheetCell(def, sheet);
  const frames: SheetFrame[] = sheet.frames.map(({ name, pose }) => ({
    name,
    draw: (ctx) => draw(ctx, pose),
  }));
  createSpriteSheet(scene, sheet.id, cell.width, frames, OUTLINE, cell.height);
}

function enemyDef(id: string): EnemyBody {
  const def = ENEMY_BODIES.find((body) => body.id === id);
  if (!def) throw new Error(`Inimigo ${id} não existe em src/data/enemies.ts.`);
  return def;
}

/** Folga do quadro em volta do corpo de colisão, por inimigo (a entidade posiciona o corpo com isto). */
export function enemyFramePad(id: string): { x: number; y: number } | undefined {
  return SHEETS.find((sheet) => sheet.id === id)?.pad;
}

const SHEETS: readonly EnemySheet<unknown>[] = [
  CARNICAL_SHEET,
  ARQUEIRO_SHEET,
  VULTO_SHEET,
  CAO_SHEET,
  LOBO_SHEET,
  RAIZ_SHEET,
  FATUO_SHEET,
  SAPO_SHEET,
  SOLDADO_SHEET,
  NECROMANTE_SHEET,
  GOLEM_SHEET,
  MORCEGO_SHEET,
  ALDEAO_SHEET,
  CORVO_SHEET,
  GUARDIAO_SHEET,
];

/** O desenho de um inimigo: a folha de poses, o corpo de colisão e a função que pinta um quadro. */
export interface EnemyDrawer {
  sheet: EnemySheet<never>;
  body: EnemyBody;
  draw: (ctx: Ctx, pose: never) => void;
}

/** Todos os inimigos desenhados em código (também usado pelos testes de enquadramento). */
export function enemyDrawers(): readonly EnemyDrawer[] {
  return [
    { sheet: CARNICAL_SHEET, body: enemyDef('carnical'), draw: drawGhoul },
    { sheet: ARQUEIRO_SHEET, body: enemyDef('arqueiro'), draw: drawArcher },
    { sheet: VULTO_SHEET, body: enemyDef('vulto'), draw: drawWraith },
    { sheet: CAO_SHEET, body: enemyDef('cao'), draw: drawHound },
    { sheet: LOBO_SHEET, body: enemyDef('lobo'), draw: drawWolf },
    { sheet: RAIZ_SHEET, body: enemyDef('raiz'), draw: drawRoot },
    { sheet: FATUO_SHEET, body: enemyDef('fatuo'), draw: drawWisp },
    { sheet: SAPO_SHEET, body: enemyDef('sapo'), draw: drawFrog },
    { sheet: SOLDADO_SHEET, body: enemyDef('soldado'), draw: drawSoldier },
    { sheet: NECROMANTE_SHEET, body: enemyDef('necromante'), draw: drawNecro },
    { sheet: GOLEM_SHEET, body: enemyDef('golem'), draw: drawGolem },
    { sheet: MORCEGO_SHEET, body: enemyDef('morcego'), draw: drawBat },
    { sheet: ALDEAO_SHEET, body: enemyDef('aldeao'), draw: drawVillager },
    { sheet: CORVO_SHEET, body: enemyDef('corvo'), draw: drawCrow },
    { sheet: GUARDIAO_SHEET, body: GUARDIAO, draw: drawGuardian },
  ] as unknown as readonly EnemyDrawer[];
}

/** Tamanho do quadro de um inimigo: o corpo de colisão mais a folga dos dois lados. */
export function enemyCellSize(drawer: EnemyDrawer): { width: number; height: number } {
  return sheetCell(drawer.body, drawer.sheet);
}

/** Cria as texturas de todos os inimigos com sprites (um quadro por pose). */
export function createEnemySheets(scene: Phaser.Scene): void {
  for (const drawer of enemyDrawers()) {
    buildSheet(
      scene,
      drawer.body,
      drawer.sheet as EnemySheet<unknown>,
      drawer.draw as (ctx: Ctx, pose: unknown) => void,
    );
  }
}

/** Registra as animações de cada inimigo (`<id>-<estado>`). */
export function createEnemyAnimations(scene: Phaser.Scene): void {
  for (const sheet of SHEETS) {
    for (const state of ENEMY_ANIM_STATES) {
      const key = enemyAnimKey(sheet.id, state);
      if (scene.anims.exists(key)) continue;
      const animation = sheet.animations[state];
      scene.anims.create({
        key,
        frames: animation.frames.map((frame) => ({ key: sheet.id, frame })),
        frameRate: animation.fps,
        repeat: animation.loop ? -1 : 0,
      });
    }
  }
}
