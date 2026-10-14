/** Tolerâncias do pulo (valores vêm de `JUMP_FORGIVENESS` em src/data/balance.ts). */
export interface JumpConfig {
  coyoteTimeMs: number;
  jumpBufferMs: number;
}

/** Timers restantes, em ms. Zero significa "janela fechada". */
export interface JumpState {
  coyoteMs: number;
  bufferMs: number;
}

export function createJumpState(): JumpState {
  return { coyoteMs: 0, bufferMs: 0 };
}

/** Fecha as duas janelas (ex.: durante a rolagem, que cancela pulo pendente e coyote). */
export function resetJump(state: JumpState): void {
  state.coyoteMs = 0;
  state.bufferMs = 0;
}

/**
 * Atualiza os timers de coyote time e jump buffer e retorna true se um pulo
 * deve disparar neste frame. Muta `state`; não aloca nada.
 */
export function updateJump(
  state: JumpState,
  dtMs: number,
  grounded: boolean,
  jumpPressed: boolean,
  cfg: JumpConfig,
): boolean {
  state.coyoteMs = grounded ? cfg.coyoteTimeMs : Math.max(0, state.coyoteMs - dtMs);
  state.bufferMs = jumpPressed ? cfg.jumpBufferMs : Math.max(0, state.bufferMs - dtMs);

  if (state.bufferMs > 0 && state.coyoteMs > 0) {
    // Consome os dois timers: sem isso, o coyote ainda aberto permitiria um pulo duplo.
    state.coyoteMs = 0;
    state.bufferMs = 0;
    return true;
  }
  return false;
}
