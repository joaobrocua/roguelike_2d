import type { RelicId } from '../data/relics';

export interface SwapConfig {
  cooldownMs: number;
  strikeWindowMs: number;
}

export interface Loadout {
  slots: [RelicId, RelicId];
  active: 0 | 1;
  /** Espera restante até poder trocar de novo. */
  swapCooldownMs: number;
  /** Tempo desde o último acerto em inimigo; Infinity = nenhum acerto válido. */
  sinceHitMs: number;
}

export type SwapResult = 'blocked' | 'swapped' | 'swapped-strike';

export function createLoadout(first: RelicId, second: RelicId): Loadout {
  return { slots: [first, second], active: 0, swapCooldownMs: 0, sinceHitMs: Infinity };
}

export function activeRelic(loadout: Loadout): RelicId {
  return loadout.slots[loadout.active];
}

export function inactiveRelic(loadout: Loadout): RelicId {
  return loadout.slots[loadout.active === 0 ? 1 : 0];
}

/** Desconta a espera da troca e envelhece o último acerto. dt negativo conta como 0. */
export function updateLoadout(loadout: Loadout, dtMs: number): void {
  const dt = Math.max(0, dtMs);
  loadout.swapCooldownMs = Math.max(0, loadout.swapCooldownMs - dt);
  loadout.sinceHitMs += dt;
}

/** Marca que o jogador acabou de acertar um inimigo. */
export function registerHit(loadout: Loadout): void {
  loadout.sinceHitMs = 0;
}

/**
 * Tenta trocar a relíquia ativa. Em espera, devolve 'blocked' e nada muda. Trocar até
 * `strikeWindowMs` (inclusive) depois de um acerto dá o golpe de troca; esse acerto é
 * consumido, então vale um único golpe.
 */
export function trySwap(loadout: Loadout, cfg: SwapConfig): SwapResult {
  if (loadout.swapCooldownMs > 0) return 'blocked';
  loadout.active = loadout.active === 0 ? 1 : 0;
  loadout.swapCooldownMs = cfg.cooldownMs;
  if (loadout.sinceHitMs <= cfg.strikeWindowMs) {
    loadout.sinceHitMs = Infinity;
    return 'swapped-strike';
  }
  return 'swapped';
}

/**
 * Casas com que a run começa: a relíquia escolhida (se houver) vai para a primeira casa e a
 * segunda continua a padrão; se a escolhida for a da segunda casa, a segunda vira a primeira
 * padrão (nunca carregar a mesma relíquia duas vezes).
 */
export function startingSlots(
  chosen: RelicId | null,
  defaults: readonly [RelicId, RelicId],
): [RelicId, RelicId] {
  if (chosen === null) return [defaults[0], defaults[1]];
  return [chosen, chosen === defaults[1] ? defaults[0] : defaults[1]];
}

export function carries(loadout: Loadout, id: RelicId): boolean {
  return loadout.slots[0] === id || loadout.slots[1] === id;
}

/**
 * Troca a relíquia do slot pela nova e devolve a descartada. Se a nova já está num OUTRO
 * slot, não faz nada e devolve null (nunca carregar a mesma relíquia duas vezes).
 */
export function replaceRelic(loadout: Loadout, slot: 0 | 1, id: RelicId): RelicId | null {
  const other = slot === 0 ? 1 : 0;
  if (loadout.slots[other] === id) return null;
  const dropped = loadout.slots[slot];
  loadout.slots[slot] = id;
  return dropped;
}
