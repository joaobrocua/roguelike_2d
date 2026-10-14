import type Phaser from 'phaser';
import { GAUGE_COLORS } from '../data/ui';
import { PALETTE } from '../data/palette';
import { canvasTexture, rect, type Ctx } from './pixelCanvas';

/**
 * Peças das barras de vida (do jogador e do chefe): moldura, preenchimento com brilho, rastro
 * claro e as marcas de graduação (estas por cima do preenchimento, para continuarem visíveis).
 */
export interface GaugeSpec {
  /** Prefixo das chaves de textura (uma barra de cada tipo). */
  prefix: string;
  width: number;
  height: number;
  border: number;
  /** Em quantas partes iguais as marcas dividem a barra. */
  divisions: number;
  /** Uma marca extra e mais clara numa fração da barra (ex.: início da fase 2). */
  highlightAt?: number;
}

export interface GaugeKeys {
  frame: string;
  fill: string;
  ghost: string;
  marks: string;
}

function drawFill(ctx: Ctx, spec: GaugeSpec, color: number, light: number, dark: number): void {
  const { width, height } = spec;
  rect(ctx, dark, 0, 0, width, height);
  rect(ctx, color, 0, 1, width, height - 2);
  rect(ctx, light, 0, 1, width, 1, 0.9);
  rect(ctx, dark, 0, height - 1, width, 1, 0.7);
}

function drawFrame(ctx: Ctx, spec: GaugeSpec): void {
  const { width, height, border } = spec;
  const w = width + border * 2;
  const h = height + border * 2;
  rect(ctx, PALETTE.void, 0, 0, w, h);
  rect(ctx, PALETTE.stoneLight, 0, 1, 1, h - 2);
  rect(ctx, PALETTE.stoneLight, 1, 0, w - 2, 1);
  rect(ctx, PALETTE.deep, border, border, width, height);
}

function drawMarks(ctx: Ctx, spec: GaugeSpec): void {
  const { width, height, divisions, highlightAt } = spec;
  for (let i = 1; i < divisions; i++) {
    rect(ctx, PALETTE.void, Math.round((width * i) / divisions), 0, 1, height, 0.55);
  }
  if (highlightAt !== undefined) {
    rect(ctx, PALETTE.bone, Math.round(width * highlightAt), 0, 1, height, 0.9);
  }
}

/** Cria (uma vez) as texturas da barra e devolve as chaves. */
export function ensureGauge(scene: Phaser.Scene, spec: GaugeSpec): GaugeKeys {
  const keys: GaugeKeys = {
    frame: `${spec.prefix}-frame`,
    fill: `${spec.prefix}-fill`,
    ghost: `${spec.prefix}-ghost`,
    marks: `${spec.prefix}-marks`,
  };
  const framed = { w: spec.width + spec.border * 2, h: spec.height + spec.border * 2 };
  canvasTexture(scene, keys.frame, framed.w, framed.h, (ctx) => drawFrame(ctx, spec));
  const { fill, ghost } = GAUGE_COLORS;
  canvasTexture(scene, keys.fill, spec.width, spec.height, (ctx) =>
    drawFill(ctx, spec, fill.color, fill.light, fill.dark),
  );
  canvasTexture(scene, keys.ghost, spec.width, spec.height, (ctx) =>
    drawFill(ctx, spec, ghost.color, ghost.light, ghost.dark),
  );
  canvasTexture(scene, keys.marks, spec.width, spec.height, (ctx) => drawMarks(ctx, spec));
  return keys;
}
