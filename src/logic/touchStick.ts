/** Direções que o direcional flutuante aperta. */
export interface StickDirections {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

/**
 * Quais direções o dedo aperta: `dx` e `dy` são o deslocamento (px) desde onde o dedo encostou e
 * `deadzone` quanto é preciso arrastar para valer. Cada eixo vale sozinho; na diagonal valem os
 * dois. Muta e devolve `out` (nada de alocar).
 */
export function stickDirections(
  dx: number,
  dy: number,
  deadzone: number,
  out: StickDirections,
): StickDirections {
  out.left = dx < -deadzone;
  out.right = dx > deadzone;
  out.up = dy < -deadzone;
  out.down = dy > deadzone;
  return out;
}

/** Limita o deslocamento do dedo a um círculo de `radius` (onde fica a bolinha do direcional). */
export function clampToRadius(dx: number, dy: number, radius: number): { x: number; y: number } {
  const length = Math.hypot(dx, dy);
  if (length <= radius || length === 0) return { x: dx, y: dy };
  const k = radius / length;
  return { x: dx * k, y: dy * k };
}
