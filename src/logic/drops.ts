import type { RelicId } from '../data/relics';
import { randomInt, type Rng } from '../utils/rng';

/**
 * Sorteia uma relíquia nova para largar: rola `chance` e, se passar, escolhe uniformemente
 * entre as do `pool` que o jogador ainda não carrega. Sem candidatas, null. Não aloca:
 * percorre o pool duas vezes (conta e depois seleciona a k-ésima).
 */
export function rollRelicDrop(
  rng: Rng,
  chance: number,
  pool: readonly RelicId[],
  carried: readonly RelicId[],
): RelicId | null {
  if (!(rng() < chance)) return null;

  let count = 0;
  for (let i = 0; i < pool.length; i++) {
    const id = pool[i];
    if (id !== undefined && !carried.includes(id)) count++;
  }
  if (count === 0) return null;

  let k = randomInt(rng, 0, count);
  for (let i = 0; i < pool.length; i++) {
    const id = pool[i];
    if (id === undefined || carried.includes(id)) continue;
    if (k === 0) return id;
    k--;
  }
  return null;
}

export type PickupPhase = 'idle' | 'warning' | 'expired';

/**
 * Em que ponto da vida está uma relíquia largada no chão: parada, piscando (avisando que vai
 * sumir, nos últimos `warnMs`) ou já expirada. Com `lifetimeMs` infinito ela nunca some.
 */
export function pickupPhase(ageMs: number, lifetimeMs: number, warnMs: number): PickupPhase {
  if (ageMs >= lifetimeMs) return 'expired';
  if (ageMs >= lifetimeMs - warnMs) return 'warning';
  return 'idle';
}
