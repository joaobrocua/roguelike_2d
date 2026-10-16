/**
 * Escudo de um inimigo: ele só protege o lado para onde a guarda aponta, e a guarda demora um
 * instante para acompanhar o herói que passa por trás (é a brecha para quem rola ou pula por cima).
 * Puro: quem chama diz para onde o corpo olha e se a guarda está erguida.
 */

export type GuardDir = -1 | 1;

export interface GuardConfig {
  /** Tempo (ms) que a guarda leva para virar depois que o corpo virou. */
  turnLagMs: number;
}

export interface GuardState {
  /** Lado que o escudo cobre agora. */
  dir: GuardDir;
  /** Há quanto tempo (ms) o corpo olha para o lado contrário ao da guarda. */
  pendingMs: number;
}

export function createGuard(dir: GuardDir = -1): GuardState {
  return { dir, pendingMs: 0 };
}

/** Faz a guarda seguir para onde o corpo olha, com atraso. Muta `state`; não aloca nada. */
export function updateGuard(
  state: GuardState,
  facing: GuardDir,
  dtMs: number,
  cfg: GuardConfig,
): void {
  if (facing === state.dir) {
    state.pendingMs = 0;
    return;
  }
  state.pendingMs += dtMs > 0 ? dtMs : 0;
  if (state.pendingMs >= cfg.turnLagMs) {
    state.dir = facing;
    state.pendingMs = 0;
  }
}

/** O golpe que vem de `sourceX` bate no escudo de quem está em `enemyX`? */
export function blocksHit(
  state: GuardState,
  guardUp: boolean,
  enemyX: number,
  sourceX: number,
): boolean {
  if (!guardUp) return false;
  const side = sourceX >= enemyX ? 1 : -1;
  return side === state.dir;
}
