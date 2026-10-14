/**
 * Regras da árvore de melhorias: custo, pré-requisitos e compra. Lógica pura, sem Phaser.
 * Quem compra (o Santuário) só chama `purchaseUpgrade`; a UI usa `purchaseBlock` para dizer o
 * motivo de um nó estar indisponível.
 */
import { BASE_RELICS, UPGRADE_NODES } from '../../data/meta';
import type { UpgradeNode } from '../../data/meta';
import type { RelicId } from '../../data/relics';
import type { MetaSave } from './save';

/**
 * Por que um nó não pode ser comprado agora. `unknown` = o nó tem dados inválidos (custo que não
 * é um número finito): recusar é mais seguro do que cobrar NaN do save.
 */
export type PurchaseBlock = 'maxed' | 'locked' | 'poor' | 'unknown';

/** Nível atual do nó no save (0 se nunca foi comprado). */
export function nodeLevel(save: MetaSave, id: string): number {
  if (!Object.hasOwn(save.levels, id)) return 0;
  const level = save.levels[id];
  return typeof level === 'number' && Number.isFinite(level) && level > 0 ? level : 0;
}

/** Custo de subir do nível atual para o próximo: round(baseCost x multiplicador^nívelAtual). */
export function upgradeCost(node: UpgradeNode, currentLevel: number): number {
  return Math.round(node.baseCost * node.costMultiplier ** currentLevel);
}

/** Todos os pré-requisitos do nó estão no nível 1 ou mais. */
export function prerequisitesMet(save: MetaSave, node: UpgradeNode): boolean {
  return node.prerequisites.every((id) => nodeLevel(save, id) >= 1);
}

/** Custo do próximo nível, ou null se o nó já está no máximo. */
export function nextCost(save: MetaSave, node: UpgradeNode): number | null {
  const level = nodeLevel(save, node.id);
  return level >= node.maxLevel ? null : upgradeCost(node, level);
}

/** Motivo de não poder comprar (nesta ordem: maxed, locked, poor), ou null se pode. */
export function purchaseBlock(save: MetaSave, node: UpgradeNode): PurchaseBlock | null {
  const cost = nextCost(save, node);
  if (cost === null) return 'maxed';
  if (!prerequisitesMet(save, node)) return 'locked';
  if (!Number.isFinite(cost) || cost < 0) return 'unknown';
  if (save.souls < cost) return 'poor';
  return null;
}

/** Compra um nível do nó. Recusa sem alterar nada se `purchaseBlock` não for null. */
export function purchaseUpgrade(save: MetaSave, node: UpgradeNode): boolean {
  if (purchaseBlock(save, node) !== null) return false;
  const level = nodeLevel(save, node.id);
  // purchaseBlock null garante que o custo existe; recalcula só para não depender de `!`.
  const cost = upgradeCost(node, level);
  save.souls -= cost;
  save.levels[node.id] = level + 1;
  return true;
}

/**
 * Relíquias que o save libera: as de base mais as dos nós `unlockRelics` já comprados. Sem
 * repetir; a ordem é estável (base primeiro, depois a ordem dos nós).
 */
export function unlockedRelicIds(
  save: MetaSave,
  nodes: readonly UpgradeNode[] = UPGRADE_NODES,
): RelicId[] {
  const result: RelicId[] = [...BASE_RELICS];
  for (const node of nodes) {
    if (node.effect.kind !== 'unlockRelics' || nodeLevel(save, node.id) < 1) continue;
    for (const relic of node.effect.relics) {
      if (!result.includes(relic)) result.push(relic);
    }
  }
  return result;
}
