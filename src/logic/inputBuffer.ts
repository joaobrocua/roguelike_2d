/**
 * Memória curta dos botões de ação: um aperto feito um pouco ANTES do jogador poder agir (no
 * meio de um golpe, da recuperação ou de uma rolagem) fica guardado e vale assim que der. É o
 * que faz o combate responder aos apertos "adiantados" em vez de engolir o botão. Lógica pura;
 * muta o estado, não aloca nada.
 */
export type BufferedAction = 'attack' | 'special' | 'roll';

export interface InputBuffer {
  /** Tempo restante (ms) em que cada aperto ainda vale; 0 = nenhum guardado. */
  attackMs: number;
  specialMs: number;
  rollMs: number;
}

export function createInputBuffer(): InputBuffer {
  return { attackMs: 0, specialMs: 0, rollMs: 0 };
}

/** Desconta o tempo dos apertos guardados. dt negativo conta como 0. */
export function tickInputBuffer(buffer: InputBuffer, dtMs: number): void {
  const dt = Math.max(0, dtMs);
  buffer.attackMs = Math.max(0, buffer.attackMs - dt);
  buffer.specialMs = Math.max(0, buffer.specialMs - dt);
  buffer.rollMs = Math.max(0, buffer.rollMs - dt);
}

/** Guarda um aperto novo por `windowMs`. */
export function rememberPress(buffer: InputBuffer, action: BufferedAction, windowMs: number): void {
  const value = Math.max(0, windowMs);
  if (action === 'attack') buffer.attackMs = value;
  else if (action === 'special') buffer.specialMs = value;
  else buffer.rollMs = value;
}

export function isBuffered(buffer: InputBuffer, action: BufferedAction): boolean {
  if (action === 'attack') return buffer.attackMs > 0;
  if (action === 'special') return buffer.specialMs > 0;
  return buffer.rollMs > 0;
}

/** Gasta o aperto guardado (a ação aconteceu). */
export function consumePress(buffer: InputBuffer, action: BufferedAction): void {
  if (action === 'attack') buffer.attackMs = 0;
  else if (action === 'special') buffer.specialMs = 0;
  else buffer.rollMs = 0;
}

export function clearInputBuffer(buffer: InputBuffer): void {
  buffer.attackMs = 0;
  buffer.specialMs = 0;
  buffer.rollMs = 0;
}
