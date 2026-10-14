/** Caixas retangulares usadas por hitboxes e hurtboxes (sem depender do Phaser). */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HitboxShape {
  width: number;
  height: number;
  offsetY: number;
}

export function createBox(): Box {
  return { x: 0, y: 0, width: 0, height: 0 };
}

/** Dois retângulos se sobrepõem? Apenas encostar nas bordas não conta. */
export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Posiciona `out` como a hitbox de um golpe: ela começa na borda do corpo e se
 * estende `shape.width` na direção em que o atacante olha (facing: 1 ou -1).
 * (originX, originY) é o centro do corpo do atacante. Muta `out`.
 */
export function placeHitbox(
  out: Box,
  originX: number,
  originY: number,
  halfBodyWidth: number,
  facing: number,
  shape: HitboxShape,
): void {
  out.width = shape.width;
  out.height = shape.height;
  out.x = facing >= 0 ? originX + halfBodyWidth : originX - halfBodyWidth - shape.width;
  out.y = originY - shape.height / 2 + shape.offsetY;
}
