/**
 * Almas: ganhar durante a run, guardar no save (Santuário/vitória) e perder parte na morte.
 * Lógica pura, sem Phaser. A carteira da run (`SoulWallet`) é o que ainda NÃO foi guardado.
 */
import { toCount } from './save';
import type { MetaSave } from './save';

export interface SoulWallet {
  /** Almas carregadas pela run, ainda não guardadas. */
  souls: number;
}

/**
 * Soma à carteira `baseAmount` x `gainMultiplier` (arredondado, no mínimo 1 se há ganho base).
 * Ignora `baseAmount` <= 0. Devolve quanto ganhou.
 */
export function earnSouls(wallet: SoulWallet, baseAmount: number, gainMultiplier: number): number {
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) return 0;
  const multiplier = Number.isFinite(gainMultiplier) && gainMultiplier > 0 ? gainMultiplier : 1;
  const gained = Math.max(1, Math.round(baseAmount * multiplier));
  wallet.souls += gained;
  return gained;
}

/** Move as almas carregadas para o save (saldo e total já ganho) e zera a carteira. */
export function bankSouls(wallet: SoulWallet, save: MetaSave): number {
  const amount = toCount(wallet.souls);
  save.souls += amount;
  save.stats.totalSouls += amount;
  wallet.souls = 0;
  return amount;
}

/**
 * Na morte, só `retention` (0 a 1) das almas carregadas é guardada, arredondada para baixo; o
 * resto se perde. Zera a carteira.
 */
export function loseSoulsOnDeath(
  wallet: SoulWallet,
  save: MetaSave,
  retention: number,
): { kept: number; lost: number } {
  const carried = toCount(wallet.souls);
  const fraction = Number.isFinite(retention) ? Math.min(1, Math.max(0, retention)) : 0;
  const kept = Math.min(carried, Math.floor(carried * fraction));
  save.souls += kept;
  save.stats.totalSouls += kept;
  wallet.souls = 0;
  return { kept, lost: carried - kept };
}

/** Registra o fim de uma run nas estatísticas. */
export function recordRunEnd(save: MetaSave, victory: boolean): void {
  save.stats.runs += 1;
  if (victory) save.stats.victories += 1;
}
