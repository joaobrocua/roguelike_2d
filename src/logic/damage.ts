/** Dano final: base vezes multiplicador, arredondado e nunca negativo. */
export function computeDamage(base: number, multiplier: number): number {
  return Math.max(0, Math.round(base * multiplier));
}

/**
 * Sentido (eixo X) para empurrar o alvo para longe da fonte.
 * Em caso de empate (mesma posição) empurra para a direita.
 */
export function directionAway(sourceX: number, targetX: number): 1 | -1 {
  return targetX >= sourceX ? 1 : -1;
}
