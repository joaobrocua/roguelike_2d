/**
 * A guarda do escudo: durante a fase ativa do especial o herói bloqueia os golpes que vêm de frente,
 * e bloquear logo no começo (a defesa perfeita) rende o bônus da esquiva perfeita. Puro.
 */

/** O golpe que vem de `sourceX` bate na frente de quem está em `x` olhando para `facing` (-1 ou 1)? */
export function isFrontal(facing: number, x: number, sourceX: number): boolean {
  const side = sourceX >= x ? 1 : -1;
  return side === (facing >= 0 ? 1 : -1);
}

/** O bloqueio aconteceu nos primeiros `parryMs` da guarda (a defesa perfeita)? */
export function isParry(elapsedMs: number, parryMs: number): boolean {
  return elapsedMs >= 0 && elapsedMs <= parryMs;
}

/** Resultado de um golpe contra a guarda: 0 = sem guarda ou por trás, 1 = bloqueado, 2 = defesa perfeita. */
export type GuardResult = 0 | 1 | 2;

export function guardResult(
  guarding: boolean,
  facing: number,
  x: number,
  sourceX: number,
  elapsedMs: number,
  parryMs: number,
): GuardResult {
  if (!guarding || !isFrontal(facing, x, sourceX)) return 0;
  return isParry(elapsedMs, parryMs) ? 2 : 1;
}
