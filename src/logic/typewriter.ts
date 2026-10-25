/**
 * Quantas letras já apareceram num texto "digitado": `elapsedMs` desde o começo e `charsPerSecond`
 * de ritmo. Nunca passa do total nem fica negativo. Roda por frame: não aloca nada.
 */
export function visibleChars(elapsedMs: number, charsPerSecond: number, total: number): number {
  if (total <= 0 || elapsedMs <= 0 || charsPerSecond <= 0) return 0;
  return Math.min(total, Math.floor((elapsedMs / 1000) * charsPerSecond));
}

/** Tempo (ms) que o texto leva para aparecer inteiro. */
export function typingDuration(total: number, charsPerSecond: number): number {
  if (total <= 0 || charsPerSecond <= 0) return 0;
  return Math.ceil((total / charsPerSecond) * 1000);
}
