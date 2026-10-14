export interface SlowMoState {
  /** Tempo REAL restante de câmera lenta, em ms. */
  remainingMs: number;
}

export function createSlowMo(): SlowMoState {
  return { remainingMs: 0 };
}

/** Dispara a câmera lenta; nunca encurta uma que já está em andamento. */
export function triggerSlowMo(state: SlowMoState, durationMs: number): void {
  state.remainingMs = Math.max(state.remainingMs, durationMs);
}

/**
 * Retorna a escala de tempo deste frame: `slowScale` enquanto houver tempo restante,
 * senão 1. A decisão usa o valor ANTES de descontar `realDtMs`, então o frame que
 * zera o contador ainda roda lento (a duração pedida é cumprida por inteiro).
 * `realDtMs` é o dt real, sem escala. Muta `state`; não aloca nada.
 */
export function updateSlowMo(state: SlowMoState, realDtMs: number, slowScale: number): number {
  const scale = state.remainingMs > 0 ? slowScale : 1;
  state.remainingMs = Math.max(0, state.remainingMs - realDtMs);
  return scale;
}
