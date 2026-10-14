/** Progresso 0..1 da vida do texto (`ageMs / lifeMs`), limitado ao intervalo; `lifeMs <= 0` retorna 1. */
export function lifeProgress(ageMs: number, lifeMs: number): number {
  if (lifeMs <= 0) return 1;
  return Math.min(1, Math.max(0, ageMs / lifeMs));
}

/** Easing de saída quadrático: `1 - (1 - t)^2`, com `t` limitado a 0..1. */
export function easeOutQuad(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) * (1 - c);
}
