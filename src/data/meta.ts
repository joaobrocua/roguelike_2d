/**
 * Progressão permanente (meta-progressão): a árvore de melhorias que se compra no Santuário com
 * almas, o que cada inimigo rende e os tetos que garantem que o jogo base continua vencível sem
 * nenhum upgrade (o "teste da run de nível 1" do documento de design). Sem lógica, sem Phaser.
 *
 * A árvore segue a regra dos três tipos do documento: 20% atributos básicos, 40% agência e
 * consistência, 40% expansão de conteúdo. Custo do nível n = custoBase x multiplicador^(n - 1).
 */
import type { RelicId } from './relics';

export type UpgradeType = 'basic' | 'agency' | 'expansion';

/** O que um nó faz. Os valores por nível ficam aqui; os tetos, em `META_CAPS`. */
export type UpgradeEffect =
  /** Vida máxima extra (pontos) por nível. */
  | { kind: 'maxHp'; perLevel: number }
  /** Dano causado extra (fração, 0.04 = +4%) por nível. */
  | { kind: 'damage'; perLevel: number }
  /** Fração das almas não guardadas que sobrevive à morte, por nível. */
  | { kind: 'soulRetention'; perLevel: number }
  /** Chance extra (0 a 1) de um inimigo largar uma relíquia, por nível. */
  | { kind: 'relicChance'; perLevel: number }
  /** Almas extras (fração) por inimigo, por nível. */
  | { kind: 'soulGain'; perLevel: number }
  /** Milissegundos a mais na janela da esquiva perfeita, por nível. */
  | { kind: 'dodgeWindow'; perLevel: number }
  /** Relíquias novas que passam a poder cair (e ser escolhidas no começo da run). */
  | { kind: 'unlockRelics'; relics: readonly RelicId[] }
  /** Salas secretas por bioma. */
  | { kind: 'secretRooms'; perLevel: number }
  /** Pode escolher a relíquia com que a run começa. */
  | { kind: 'chooseStart' };

export interface UpgradeNode {
  id: string;
  type: UpgradeType;
  name: string;
  /** Texto do que o nó faz (uma frase curta, cabe na ficha do Santuário). */
  description: string;
  maxLevel: number;
  baseCost: number;
  /** Entre 1,15 e 1,35 conforme a relevância do nó (documento de design). */
  costMultiplier: number;
  /** Nós que precisam estar no nível 1 ou mais para este poder ser comprado. */
  prerequisites: readonly string[];
  effect: UpgradeEffect;
}

/** Relíquias que existem desde a primeira run, sem nenhum upgrade. */
export const BASE_RELICS: readonly RelicId[] = ['lamina', 'martelo', 'foice', 'tomo'];

export const UPGRADE_NODES: readonly UpgradeNode[] = [
  // --- Atributos básicos (20%) -----------------------------------------------------------
  {
    id: 'vigor',
    type: 'basic',
    name: 'Vigor',
    description: '+10 de vida máxima',
    maxLevel: 5,
    baseCost: 20,
    costMultiplier: 1.25,
    prerequisites: [],
    effect: { kind: 'maxHp', perLevel: 10 },
  },
  {
    id: 'forca',
    type: 'basic',
    name: 'Força',
    description: '+4% de dano',
    maxLevel: 5,
    baseCost: 25,
    costMultiplier: 1.3,
    prerequisites: ['vigor'],
    effect: { kind: 'damage', perLevel: 0.04 },
  },
  // --- Agência e consistência (40%) ------------------------------------------------------
  {
    id: 'retencao',
    type: 'agency',
    name: 'Retenção',
    description: 'Guarda +15% das almas ao morrer',
    maxLevel: 4,
    baseCost: 15,
    costMultiplier: 1.2,
    prerequisites: [],
    effect: { kind: 'soulRetention', perLevel: 0.15 },
  },
  {
    id: 'sorte',
    type: 'agency',
    name: 'Sorte',
    description: '+4% de chance de relíquia',
    maxLevel: 4,
    baseCost: 20,
    costMultiplier: 1.2,
    prerequisites: [],
    effect: { kind: 'relicChance', perLevel: 0.04 },
  },
  {
    id: 'colheita',
    type: 'agency',
    name: 'Colheita',
    description: '+10% de almas dos inimigos',
    maxLevel: 3,
    baseCost: 30,
    costMultiplier: 1.35,
    prerequisites: ['retencao'],
    effect: { kind: 'soulGain', perLevel: 0.1 },
  },
  {
    id: 'reflexo',
    type: 'agency',
    name: 'Reflexo',
    description: '+10 ms na esquiva perfeita',
    maxLevel: 3,
    baseCost: 25,
    costMultiplier: 1.25,
    prerequisites: [],
    effect: { kind: 'dodgeWindow', perLevel: 10 },
  },
  // --- Expansão de conteúdo (40%) --------------------------------------------------------
  {
    id: 'arsenal1',
    type: 'expansion',
    name: 'Arsenal I',
    description: 'Libera Adaga e Lança',
    maxLevel: 1,
    baseCost: 40,
    costMultiplier: 1.15,
    prerequisites: [],
    effect: { kind: 'unlockRelics', relics: ['adaga', 'lanca'] },
  },
  {
    id: 'arsenal2',
    type: 'expansion',
    name: 'Arsenal II',
    description: 'Libera Machado, Arco e Mangual',
    maxLevel: 1,
    baseCost: 70,
    costMultiplier: 1.15,
    prerequisites: ['arsenal1'],
    effect: { kind: 'unlockRelics', relics: ['machado', 'arco', 'mangual'] },
  },
  {
    id: 'segredos',
    type: 'expansion',
    name: 'Passagens',
    description: 'Uma sala secreta por bioma',
    maxLevel: 1,
    baseCost: 50,
    costMultiplier: 1.15,
    prerequisites: [],
    effect: { kind: 'secretRooms', perLevel: 1 },
  },
  {
    id: 'mestre',
    type: 'expansion',
    name: 'Mestre',
    description: 'Escolhe a relíquia inicial',
    maxLevel: 1,
    baseCost: 60,
    costMultiplier: 1.15,
    prerequisites: ['arsenal1'],
    effect: { kind: 'chooseStart' },
  },
];

/**
 * Tetos que a meta-progressão nunca passa (regra do documento: no máximo 1,5x a 2x dos
 * atributos iniciais). O jogo base tem que ser vencível sem upgrade nenhum.
 */
export const META_CAPS = {
  /** Vida máxima: no máximo +50% da vida inicial. */
  maxHpMultiplier: 1.5,
  /** Dano: no máximo +25%. */
  damageMultiplier: 1.25,
  /** Retenção de almas: no máximo 60%. */
  soulRetention: 0.6,
  /** Chance extra de relíquia: no máximo +20 pontos percentuais. */
  relicChanceBonus: 0.2,
  /** Almas extras: no máximo +40%. */
  soulGainBonus: 0.4,
  /** Esquiva perfeita: no máximo +30 ms (a janela total tem que ficar abaixo da invulnerabilidade da rolagem). */
  dodgeWindowBonusMs: 30,
  /** Salas secretas por bioma que os upgrades podem somar. */
  secretRooms: 2,
} as const;

/** Almas que cada inimigo derrotado rende (chave = id do inimigo em src/data/enemies.ts). */
export const SOUL_REWARD: Readonly<Record<string, number>> = {
  carnical: 3,
  arqueiro: 4,
  vulto: 4,
  cao: 2,
  lobo: 4,
  raiz: 5,
  guardiao: 40,
};

/** Almas a mais que o fim da run (vitória sobre o chefe) rende ao ser guardado. */
export const VICTORY_SOUL_BONUS = 25;

/** Onde o save fica no navegador (localStorage) e a versão do formato. */
export const META_STORAGE = {
  key: 'ruinas-esquecidas:meta',
  version: 1,
} as const;
