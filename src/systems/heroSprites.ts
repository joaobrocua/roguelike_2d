import type Phaser from 'phaser';
import {
  HERO_ANIMATIONS,
  HERO_BOOT_HEIGHT,
  HERO_CELL,
  HERO_FALLEN,
  HERO_FRAMES,
  HERO_GEOMETRY,
  HERO_SHEET_KEY,
  HERO_TUCK,
  heroAnimationKey,
  type HeroPose,
} from '../data/hero';
import { PALETTE } from '../data/palette';
import { heroJoints, type HeroJoints, type Point } from '../logic/heroPose';
import { createSpriteSheet, fillPx, linePx, type SheetFrame } from './pixelSheet';

/**
 * Desenha o Último Vigia em pixel art, quadro a quadro, a partir das poses de src/data/hero.ts:
 * elmo com a viseira acesa, armadura cinza-azulada, capa rasgada vermelha e botas escuras.
 * As juntas (ombros, mãos, joelhos, pés) vêm de heroJoints; aqui só se pinta.
 */

const OUTLINE = PALETTE.void;
const CAPE = PALETTE.bloodDark;
const CAPE_LIGHT = PALETTE.blood;
const ARMOR = PALETTE.mist;
const ARMOR_LIGHT = PALETTE.bone;
const ARMOR_SHADE = PALETTE.stone;
const ARMOR_DARK = PALETTE.stoneDark;
const BOOT = PALETTE.deep;
const EYE = PALETTE.player;
const EYE_BRIGHT = PALETTE.playerAccent;
const BUCKLE = PALETTE.glow;

/** Posição da mão da frente de cada quadro (para o desenho da arma da relíquia na mão). */
const handByFrame = new Map<string, Point>();

export function getHeroHand(frameName: string): Point | undefined {
  return handByFrame.get(frameName);
}

/** Posição da mão de trás de cada quadro (onde ficam a segunda lâmina e o escudo). */
const handBackByFrame = new Map<string, Point>();

export function getHeroHandBack(frameName: string): Point | undefined {
  return handBackByFrame.get(frameName);
}

type Ctx = CanvasRenderingContext2D;

/** Perna de duas partes (coxa e canela) com bota. */
function drawLeg(
  ctx: Ctx,
  hip: Point,
  knee: Point,
  foot: Point,
  color: number,
  shade: number,
): void {
  linePx(ctx, color, hip.x, hip.y, knee.x, knee.y, 3);
  linePx(ctx, color, knee.x, knee.y, foot.x, foot.y, 3);
  fillPx(ctx, shade, knee.x, knee.y, 2, 1); // joelheira
  fillPx(ctx, BOOT, foot.x - 1, foot.y, 5, HERO_BOOT_HEIGHT); // bota
  fillPx(ctx, ARMOR_SHADE, foot.x + 3, foot.y, 1, 1);
}

/** Capa: colunas penduradas dos ombros para trás, com a barra rasgada e ondulando. */
function drawCape(ctx: Ctx, pose: HeroPose, j: HeroJoints): void {
  for (let i = 0; i < pose.capeLen; i++) {
    const x = j.shoulderBack.x - 1 - i;
    const wave = Math.round(Math.sin(pose.capePhase + i * 0.7) * pose.capeAmp);
    const top = j.torsoTop + 1 + wave + Math.round(i * 0.35);
    const height = Math.max(3, 10 - Math.round(i * 0.55) - (i % 2));
    fillPx(ctx, CAPE, x, top, 1, height);
    fillPx(ctx, CAPE_LIGHT, x, top, 1, 1);
  }
  // Gola da capa em volta do pescoço
  fillPx(ctx, CAPE, j.shoulderBack.x - 1, j.torsoTop, 5, 2);
  fillPx(ctx, CAPE_LIGHT, j.shoulderBack.x - 1, j.torsoTop, 5, 1);
}

function drawTorso(ctx: Ctx, pose: HeroPose, j: HeroJoints): void {
  const x = HERO_GEOMETRY.centerX - 3 + pose.lean;
  const top = j.torsoTop;
  const h = HERO_GEOMETRY.torsoH;
  fillPx(ctx, ARMOR, x, top, 7, h);
  fillPx(ctx, ARMOR_LIGHT, x, top, 7, 1); // realce nos ombros
  fillPx(ctx, ARMOR_SHADE, x, top + 1, 2, h - 2); // sombra do lado de trás
  fillPx(ctx, ARMOR_LIGHT, x + 4, top + 2, 1, 2); // brilho no peitoral
  fillPx(ctx, ARMOR_DARK, x, j.hipY - 1, 7, 1); // cinto
  fillPx(ctx, BUCKLE, x + 4, j.hipY - 1, 1, 1);
  fillPx(ctx, ARMOR_SHADE, x, j.hipY, 7, 3); // saiote de armadura
  fillPx(ctx, ARMOR, x + 1, j.hipY, 5, 1);
}

function drawHead(ctx: Ctx, j: HeroJoints): void {
  const { x, y } = j.head;
  const w = HERO_GEOMETRY.headW;
  const h = HERO_GEOMETRY.headH;
  // Penacho vermelho rasgado atrás do elmo
  fillPx(ctx, CAPE, x - 1, y, 3, 3);
  fillPx(ctx, CAPE_LIGHT, x - 1, y, 2, 1);
  fillPx(ctx, CAPE, x - 3, y + 2, 2, 2);
  // Elmo
  fillPx(ctx, ARMOR, x, y, w, h);
  fillPx(ctx, ARMOR_LIGHT, x + 1, y, w - 2, 1);
  fillPx(ctx, ARMOR_LIGHT, x, y + 1, 1, 2);
  fillPx(ctx, ARMOR_SHADE, x, y + h - 2, w, 2);
  fillPx(ctx, ARMOR_SHADE, x + w - 1, y + 1, 1, h - 2);
  // Viseira: fenda escura com os olhos acesos e um rastro de luz
  fillPx(ctx, OUTLINE, x + 2, y + 3, w - 2, 2);
  fillPx(ctx, EYE, x + 4, y + 3, 3, 1);
  fillPx(ctx, EYE_BRIGHT, x + 6, y + 3, 1, 1);
  fillPx(ctx, EYE, x + w, y + 3, 1, 1, 0.5); // brilho escapando pela frente
  // Grade da proteção do queixo
  fillPx(ctx, ARMOR_DARK, x + 3, y + 5, 1, 2);
  fillPx(ctx, ARMOR_DARK, x + 5, y + 5, 1, 2);
}

function drawArm(ctx: Ctx, shoulder: Point, hand: Point, color: number, trim: number): void {
  linePx(ctx, color, shoulder.x, shoulder.y, hand.x, hand.y, 2);
  fillPx(ctx, trim, hand.x, hand.y, 2, 2); // manopla
}

/** Corpo em pé (ou caído, se a pose gira o desenho). */
function drawBody(ctx: Ctx, pose: HeroPose): void {
  const j = heroJoints(pose, HERO_GEOMETRY);
  drawCape(ctx, pose, j);
  drawArm(ctx, j.shoulderBack, j.handBack, ARMOR_SHADE, ARMOR);
  drawLeg(ctx, j.hipBack, j.kneeBack, j.footBack, ARMOR_SHADE, ARMOR_DARK);
  drawTorso(ctx, pose, j);
  drawLeg(ctx, j.hipFront, j.kneeFront, j.footFront, ARMOR, ARMOR_SHADE);
  drawHead(ctx, j);
  drawArm(ctx, j.shoulderFront, j.handFront, ARMOR, ARMOR_LIGHT);
  // Ombreira da frente
  fillPx(ctx, ARMOR_LIGHT, j.shoulderFront.x - 2, j.shoulderFront.y - 1, 4, 1);
  fillPx(ctx, ARMOR, j.shoulderFront.x - 2, j.shoulderFront.y, 4, 2);
  fillPx(ctx, ARMOR_SHADE, j.shoulderFront.x - 2, j.shoulderFront.y + 2, 4, 1);
}

/** Herói enrolado em bola (rolagem): o giro do quadro faz a viseira e a capa rodarem. */
function drawBall(ctx: Ctx, pose: HeroPose): void {
  const { centerX: cx, centerY: cy, radius: r } = HERO_TUCK;
  // Capa arrastando
  for (let i = 0; i < pose.capeLen; i++) {
    fillPx(
      ctx,
      CAPE,
      cx - r - 1 - i,
      cy - 3 + Math.round(Math.sin(pose.capePhase + i) * 1),
      1,
      5 - (i % 2),
    );
  }
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    fillPx(ctx, ARMOR, cx - half, cy + dy, half * 2, 1);
    for (let dx = -half; dx < half; dx++) {
      if (dx + dy > 4) fillPx(ctx, ARMOR_SHADE, cx + dx, cy + dy, 1, 1);
      else if (dx + dy < -5) fillPx(ctx, ARMOR_LIGHT, cx + dx, cy + dy, 1, 1);
    }
  }
  fillPx(ctx, OUTLINE, cx + 1, cy - 2, 5, 2); // viseira
  fillPx(ctx, EYE, cx + 3, cy - 2, 2, 1);
  fillPx(ctx, EYE_BRIGHT, cx + 4, cy - 2, 1, 1);
  fillPx(ctx, BOOT, cx + 3, cy + 4, 4, 2); // botas à mostra
}

function drawHeroFrame(ctx: Ctx, pose: HeroPose): void {
  ctx.save();
  if (pose.tuck) {
    ctx.translate(HERO_TUCK.centerX, HERO_TUCK.centerY);
    ctx.rotate(pose.rotation);
    ctx.translate(-HERO_TUCK.centerX, -HERO_TUCK.centerY);
    drawBall(ctx, pose);
  } else if (pose.rotation !== 0) {
    // Caído: gira o corpo em pé em torno do meio e apoia no chão
    ctx.translate(HERO_FALLEN.groundX, HERO_FALLEN.groundY);
    ctx.rotate(pose.rotation);
    ctx.translate(-HERO_FALLEN.pivotX, -HERO_FALLEN.pivotY);
    drawBody(ctx, pose);
  } else {
    drawBody(ctx, pose);
  }
  ctx.restore();
}

/** Cria a textura do herói (todos os quadros) e registra a posição da mão de cada um. */
export function createHeroSheet(scene: Phaser.Scene): void {
  const frames: SheetFrame[] = HERO_FRAMES.map(({ name, pose }) => {
    const joints = heroJoints(pose, HERO_GEOMETRY);
    handByFrame.set(name, joints.handFront);
    handBackByFrame.set(name, joints.handBack);
    return { name, draw: (ctx) => drawHeroFrame(ctx, pose) };
  });
  createSpriteSheet(scene, HERO_SHEET_KEY, HERO_CELL, frames, OUTLINE);
}

/** Registra as animações do herói (uma por estado). */
export function createHeroAnimations(scene: Phaser.Scene): void {
  for (const animation of HERO_ANIMATIONS) {
    const key = heroAnimationKey(animation.state);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: animation.frames.map((frame) => ({ key: HERO_SHEET_KEY, frame })),
      frameRate: animation.fps,
      repeat: animation.loop ? -1 : 0,
    });
  }
}
