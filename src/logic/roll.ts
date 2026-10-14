/** Tempos da rolagem (valores vêm de `ROLL` em src/data/balance.ts). */
export interface RollConfig {
  durationMs: number;
  invulnerableMs: number;
  cooldownMs: number;
}

export interface RollState {
  active: boolean;
  /** Tempo decorrido desde o início da rolagem atual. */
  elapsedMs: number;
  /** Espera restante até poder rolar de novo. */
  cooldownMs: number;
  /** -1 (esquerda) ou 1 (direita), fixada no início da rolagem. */
  direction: number;
}

export function createRollState(): RollState {
  return { active: false, elapsedMs: 0, cooldownMs: 0, direction: 1 };
}

/**
 * Inicia a rolagem se permitido (não ativa, cooldown zerado, no chão e `wantsRoll`).
 * Retorna true se iniciou.
 */
export function tryStartRoll(
  state: RollState,
  wantsRoll: boolean,
  direction: number,
  grounded: boolean,
): boolean {
  if (!wantsRoll || !grounded || state.active || state.cooldownMs > 0) return false;
  state.active = true;
  state.elapsedMs = 0;
  state.direction = direction;
  return true;
}

/** Avança o tempo: termina a rolagem ao atingir a duração e inicia o cooldown. */
export function updateRoll(state: RollState, dtMs: number, cfg: RollConfig): void {
  if (state.active) {
    state.elapsedMs += dtMs;
    if (state.elapsedMs >= cfg.durationMs) {
      state.active = false;
      state.cooldownMs = cfg.cooldownMs;
    }
  } else {
    state.cooldownMs = Math.max(0, state.cooldownMs - dtMs);
  }
}

/** Invulnerável só enquanto a rolagem está ativa e dentro da janela de i-frames. */
export function isInvulnerable(state: RollState, cfg: RollConfig): boolean {
  return state.active && state.elapsedMs < cfg.invulnerableMs;
}

/** Interrompe a rolagem (ex.: ao levar dano) e inicia o cooldown. */
export function cancelRoll(state: RollState, cfg: RollConfig): void {
  state.active = false;
  state.elapsedMs = 0;
  state.cooldownMs = cfg.cooldownMs;
}
