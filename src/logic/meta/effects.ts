/**
 * Resumo do que a meta-progressão concede a uma run: soma os efeitos dos nós comprados e aplica
 * os tetos de `META_CAPS` (o jogo base tem que continuar vencível sem upgrade nenhum). Lógica
 * pura, sem Phaser.
 */
import { BASE_RELICS, META_CAPS, UPGRADE_NODES } from '../../data/meta';
import type { UpgradeNode } from '../../data/meta';
import type { RelicId } from '../../data/relics';
import type { MetaSave } from './save';
import { nodeLevel, unlockedRelicIds } from './tree';

export interface MetaEffects {
  /** Vida máxima extra (pontos). */
  maxHpBonus: number;
  /** Multiplicador do dano causado (1 = sem bônus). */
  damageMultiplier: number;
  /** Fração (0 a 1) das almas carregadas que sobrevive à morte. */
  soulRetention: number;
  /** Chance extra (0 a 1) de um inimigo largar relíquia. */
  relicChanceBonus: number;
  /** Multiplicador das almas ganhas (1 = sem bônus). */
  soulGainMultiplier: number;
  /** Milissegundos extras na janela da esquiva perfeita. */
  dodgeWindowBonusMs: number;
  /** Salas secretas extras por bioma. */
  secretRooms: number;
  canChooseStart: boolean;
  unlockedRelics: readonly RelicId[];
}

/** Tetos aceitos por `computeEffects` (mesmo formato de `META_CAPS`, sem fixar os valores). */
export type MetaCaps = { readonly [K in keyof typeof META_CAPS]: number };

/** Efeitos de um save sem nenhum upgrade (a "run de nível 1"). */
export const NEUTRAL_EFFECTS: MetaEffects = {
  maxHpBonus: 0,
  damageMultiplier: 1,
  soulRetention: 0,
  relicChanceBonus: 0,
  soulGainMultiplier: 1,
  dodgeWindowBonusMs: 0,
  secretRooms: 0,
  canChooseStart: false,
  unlockedRelics: BASE_RELICS,
};

/** Número finito >= 0; qualquer outra coisa (NaN, Infinity, negativo) vira 0. */
function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeEffects(
  save: MetaSave,
  nodes: readonly UpgradeNode[] = UPGRADE_NODES,
  caps: MetaCaps = META_CAPS,
  baseMaxHp: number,
): MetaEffects {
  let maxHp = 0;
  let damage = 0;
  let retention = 0;
  let relicChance = 0;
  let soulGain = 0;
  let dodgeWindow = 0;
  let secretRooms = 0;
  let canChooseStart = false;

  for (const node of nodes) {
    // O nível é limitado ao máximo do nó: um save adulterado não passa do que a árvore permite.
    const level = Math.min(nodeLevel(save, node.id), Math.max(0, node.maxLevel));
    if (level < 1) continue;
    const effect = node.effect;
    switch (effect.kind) {
      case 'maxHp':
        maxHp += level * effect.perLevel;
        break;
      case 'damage':
        damage += level * effect.perLevel;
        break;
      case 'soulRetention':
        retention += level * effect.perLevel;
        break;
      case 'relicChance':
        relicChance += level * effect.perLevel;
        break;
      case 'soulGain':
        soulGain += level * effect.perLevel;
        break;
      case 'dodgeWindow':
        dodgeWindow += level * effect.perLevel;
        break;
      case 'secretRooms':
        secretRooms += level * effect.perLevel;
        break;
      case 'chooseStart':
        canChooseStart = true;
        break;
      case 'unlockRelics':
        // Tratado por unlockedRelicIds (mantém a ordem estável e sem repetição).
        break;
    }
  }

  const maxHpCap = nonNegative(baseMaxHp) * nonNegative(caps.maxHpMultiplier - 1);

  return {
    maxHpBonus: Math.min(nonNegative(maxHp), maxHpCap),
    damageMultiplier: Math.max(
      1,
      Math.min(1 + nonNegative(damage), nonNegative(caps.damageMultiplier)),
    ),
    soulRetention: Math.min(nonNegative(retention), nonNegative(caps.soulRetention)),
    relicChanceBonus: Math.min(nonNegative(relicChance), nonNegative(caps.relicChanceBonus)),
    soulGainMultiplier: 1 + Math.min(nonNegative(soulGain), nonNegative(caps.soulGainBonus)),
    dodgeWindowBonusMs: Math.min(nonNegative(dodgeWindow), nonNegative(caps.dodgeWindowBonusMs)),
    secretRooms: Math.min(nonNegative(secretRooms), nonNegative(caps.secretRooms)),
    canChooseStart,
    unlockedRelics: unlockedRelicIds(save, nodes),
  };
}

/** Efeitos de um save com a árvore e os tetos padrão do jogo (evita passar `undefined` nos padrões). */
export function effectsFor(save: MetaSave, baseMaxHp: number): MetaEffects {
  return computeEffects(save, UPGRADE_NODES, META_CAPS, baseMaxHp);
}
