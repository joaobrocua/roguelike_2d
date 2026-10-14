export interface HealthState {
  hp: number;
  maxHp: number;
  /** Invulnerabilidade restante após levar dano, em ms. */
  iframeMs: number;
  /** Atordoamento restante após levar dano, em ms. */
  stunMs: number;
}

export function createHealth(maxHp: number): HealthState {
  return { hp: maxHp, maxHp, iframeMs: 0, stunMs: 0 };
}

/**
 * Aplica dano. Retorna false, sem mudar nada, se já morreu, se está nos i-frames
 * ou se `amount <= 0`. Caso contrário desconta a vida (mínimo 0), arma os timers
 * e retorna true.
 */
export function takeDamage(
  state: HealthState,
  amount: number,
  iframeMs: number,
  stunMs: number,
): boolean {
  if (isDead(state) || state.iframeMs > 0 || amount <= 0) return false;
  state.hp = Math.max(0, state.hp - amount);
  state.iframeMs = Math.max(state.iframeMs, iframeMs);
  state.stunMs = Math.max(state.stunMs, stunMs);
  return true;
}

/** Faz os timers de i-frames e atordoamento decaírem até 0. */
export function updateHealth(state: HealthState, dtMs: number): void {
  state.iframeMs = Math.max(0, state.iframeMs - dtMs);
  state.stunMs = Math.max(0, state.stunMs - dtMs);
}

export function isDead(state: HealthState): boolean {
  return state.hp <= 0;
}

export function isStunned(state: HealthState): boolean {
  return state.stunMs > 0;
}

export function isHurtInvulnerable(state: HealthState): boolean {
  return state.iframeMs > 0;
}

/** Recupera vida (roubo de vida, itens), sem passar do máximo. Retorna quanto recuperou de fato. */
export function heal(state: HealthState, amount: number): number {
  if (state.hp <= 0 || amount <= 0) return 0;
  const before = state.hp;
  state.hp = Math.min(state.maxHp, state.hp + amount);
  return state.hp - before;
}
