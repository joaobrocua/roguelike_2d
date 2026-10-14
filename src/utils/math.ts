/** Aproxima `value` de zero em `amount`, sem passar do zero (usado no atrito do knockback). */
export function approachZero(value: number, amount: number): number {
  if (value > 0) return Math.max(0, value - amount);
  if (value < 0) return Math.min(0, value + amount);
  return 0;
}
