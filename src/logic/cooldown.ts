export interface CooldownState {
  remainingMs: number;
  totalMs: number;
}

export function createCooldown(): CooldownState {
  return { remainingMs: 0, totalMs: 0 };
}

/** Inicia a recarga; duração negativa vira 0 (já pronto). */
export function startCooldown(state: CooldownState, durationMs: number): void {
  const d = Math.max(0, durationMs);
  state.remainingMs = d;
  state.totalMs = d;
}

/** Desconta até 0; dt negativo conta como 0. */
export function updateCooldown(state: CooldownState, dtMs: number): void {
  state.remainingMs = Math.max(0, state.remainingMs - Math.max(0, dtMs));
}

export function isReady(state: CooldownState): boolean {
  return state.remainingMs <= 0;
}

/** 0 = pronto, 1 = recém iniciado. Sem duração total, 0. */
export function cooldownFraction(state: CooldownState): number {
  if (state.totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, state.remainingMs / state.totalMs));
}
