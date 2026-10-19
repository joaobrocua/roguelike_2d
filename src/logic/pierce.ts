/**
 * Projétil perfurante: atravessa alguns alvos antes de sumir e nunca acerta o mesmo alvo duas vezes.
 * O estado é reaproveitado entre disparos (os projéteis ficam num pool).
 */
export interface PierceState {
  /** Quantos alvos a mais o tiro ainda pode atravessar. */
  left: number;
  /** Quem o tiro já acertou neste disparo. */
  hit: object[];
}

export function createPierce(): PierceState {
  return { left: 0, hit: [] };
}

/** Prepara o estado para um disparo novo que atravessa `count` alvos a mais (0 = some no primeiro). */
export function resetPierce(state: PierceState, count: number): void {
  state.left = Math.max(0, Math.floor(count));
  state.hit.length = 0;
}

/** Este alvo já foi acertado por este disparo? */
export function alreadyPierced(state: PierceState, target: object): boolean {
  return state.hit.includes(target);
}

/** Registra o acerto em `target`; devolve true se o tiro deve sumir (não atravessa mais ninguém). */
export function registerPierce(state: PierceState, target: object): boolean {
  state.hit.push(target);
  if (state.left <= 0) return true;
  state.left -= 1;
  return false;
}
