export interface HitStopState {
  /** Tempo REAL restante de congelamento, em ms. */
  remainingMs: number;
}

export function createHitStop(): HitStopState {
  return { remainingMs: 0 };
}

/** Dispara o congelamento; nunca encurta um que já está em andamento. Duração <= 0 é ignorada. */
export function triggerHitStop(state: HitStopState, durationMs: number): void {
  if (durationMs <= 0) return;
  state.remainingMs = Math.max(state.remainingMs, durationMs);
}

/**
 * Retorna true se o jogo deve ficar congelado neste frame. Usa o tempo REAL: se ainda
 * há tempo restante, desconta `realDtMs` (dt negativo conta como 0) e retorna true, então
 * o frame que zera o contador também congela. Muta `state`; não aloca nada.
 */
export function updateHitStop(state: HitStopState, realDtMs: number): boolean {
  if (state.remainingMs <= 0) return false;
  state.remainingMs = Math.max(0, state.remainingMs - Math.max(0, realDtMs));
  return true;
}
