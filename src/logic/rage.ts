/**
 * Pulso da aura da fase 2: a opacidade do brilho oscila de `min` a `max` numa onda suave, uma volta
 * a cada `periodMs`. Roda por frame: não aloca nada.
 */
export function ragePulse(clockMs: number, periodMs: number, min: number, max: number): number {
  if (periodMs <= 0) return max;
  const wave = 0.5 - 0.5 * Math.cos((clockMs / periodMs) * Math.PI * 2); // 0 .. 1 .. 0
  return min + (max - min) * wave;
}
