/**
 * Rastro claro das barras de vida: fica na vida antiga e desce devagar até a vida nova, para
 * mostrar o tamanho do dano; ao curar, sobe junto. Lógica pura.
 */

/** Limita um valor a 0..1. */
export function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Nova fração do rastro. `trail` é a fração atual dele, `target` a fração real da vida (0..1),
 * `ratePerSecond` quanto da barra ele perde por segundo e `dtMs` o tempo que passou.
 */
export function trailFraction(
  trail: number,
  target: number,
  ratePerSecond: number,
  dtMs: number,
): number {
  const goal = clampFraction(target);
  if (trail <= goal) return goal;
  return Math.max(goal, trail - (ratePerSecond * dtMs) / 1000);
}
