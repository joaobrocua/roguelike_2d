export interface ComboState {
  /** Índice do ÚLTIMO golpe dado; -1 = nenhum. */
  step: number;
  /** Tempo restante em que o próximo golpe ainda continua o combo, em ms. */
  windowMs: number;
}

export function createCombo(): ComboState {
  return { step: -1, windowMs: 0 };
}

/**
 * Escolhe o passo do próximo golpe: continua o combo se a janela ainda está aberta e
 * existe um passo seguinte; senão volta ao 0. Zera a janela (ela só reabre quando o golpe
 * termina, em `openComboWindow`). Muta `state`; não aloca nada.
 */
export function advanceCombo(state: ComboState, stepCount: number): number {
  const next = state.windowMs > 0 && state.step + 1 < stepCount ? state.step + 1 : 0;
  state.step = next;
  state.windowMs = 0;
  return next;
}

/** Chamado quando o golpe termina: abre a janela do combo. `comboWindowMs <= 0` não abre. */
export function openComboWindow(state: ComboState, comboWindowMs: number): void {
  state.windowMs = Math.max(0, comboWindowMs);
}

/** Desconta a janela; ao fechar (chegar a 0 vindo de >0) o combo recomeça do zero. */
export function updateCombo(state: ComboState, dtMs: number): void {
  if (state.windowMs <= 0) return;
  state.windowMs = Math.max(0, state.windowMs - Math.max(0, dtMs));
  if (state.windowMs === 0) state.step = -1;
}

export function resetCombo(state: ComboState): void {
  state.step = -1;
  state.windowMs = 0;
}
