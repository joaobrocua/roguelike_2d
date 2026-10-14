/**
 * Esquiva perfeita: o jogador estava invulnerável na rolagem e o golpe o alcançou
 * nos primeiros `windowMs` dela (rolou no último instante antes do golpe).
 * A borda conta: `rollElapsedMs === windowMs` ainda é perfeita.
 */
export function isPerfectDodge(
  rollElapsedMs: number,
  rollInvulnerable: boolean,
  windowMs: number,
): boolean {
  return rollInvulnerable && rollElapsedMs <= windowMs;
}

/** Bônus de dano guardado para o próximo golpe após uma esquiva perfeita. */
export interface DodgeBonusState {
  ready: boolean;
}

export function createDodgeBonus(): DodgeBonusState {
  return { ready: false };
}

/** Concede o bônus; conceder de novo não acumula (vale um golpe só). */
export function grantDodgeBonus(state: DodgeBonusState): void {
  state.ready = true;
}

/** Se houver bônus, gasta e retorna `multiplier`; senão retorna 1 (sem efeito). */
export function consumeDodgeBonus(state: DodgeBonusState, multiplier: number): number {
  if (!state.ready) return 1;
  state.ready = false;
  return multiplier;
}
