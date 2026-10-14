import { describe, expect, it } from 'vitest';
import { UPGRADE_NODES } from '../src/data/meta';
import type { UpgradeNode } from '../src/data/meta';
import { createMetaSave } from '../src/logic/meta/save';
import type { MetaSave } from '../src/logic/meta/save';
import {
  nextCost,
  nodeLevel,
  prerequisitesMet,
  purchaseBlock,
  purchaseUpgrade,
  unlockedRelicIds,
  upgradeCost,
} from '../src/logic/meta/tree';

function node(id: string): UpgradeNode {
  const found = UPGRADE_NODES.find((n) => n.id === id);
  if (!found) throw new Error(`nó de teste inexistente: ${id}`);
  return found;
}

function saveWith(souls: number, levels: Record<string, number> = {}): MetaSave {
  return { ...createMetaSave(), souls, levels };
}

describe('nodeLevel', () => {
  it('é 0 sem registro e devolve o nível guardado', () => {
    const save = saveWith(0, { vigor: 3 });
    expect(nodeLevel(save, 'vigor')).toBe(3);
    expect(nodeLevel(save, 'forca')).toBe(0);
    expect(nodeLevel(save, 'nao-existe')).toBe(0);
  });

  it('ignora chaves herdadas do protótipo', () => {
    expect(nodeLevel(createMetaSave(), 'constructor')).toBe(0);
    expect(nodeLevel(createMetaSave(), 'toString')).toBe(0);
  });
});

describe('upgradeCost', () => {
  it('o primeiro nível (nível atual 0) custa o custo base', () => {
    for (const n of UPGRADE_NODES) expect(upgradeCost(n, 0)).toBe(n.baseCost);
  });

  it('cresce exponencialmente: round(base x mult^nívelAtual)', () => {
    const vigor = node('vigor'); // 20, x1,25
    expect(upgradeCost(vigor, 0)).toBe(20);
    expect(upgradeCost(vigor, 1)).toBe(25);
    expect(upgradeCost(vigor, 2)).toBe(31); // 31,25
    expect(upgradeCost(vigor, 3)).toBe(39); // 39,06
    expect(upgradeCost(vigor, 4)).toBe(49); // 48,83
  });

  it('é estritamente crescente nos níveis de todos os nós com vários níveis', () => {
    for (const n of UPGRADE_NODES.filter((x) => x.maxLevel > 1)) {
      for (let level = 1; level < n.maxLevel; level += 1) {
        expect(upgradeCost(n, level)).toBeGreaterThan(upgradeCost(n, level - 1));
      }
    }
  });

  it('usa o multiplicador do nó', () => {
    const colheita = node('colheita'); // 30, x1,35
    expect(upgradeCost(colheita, 1)).toBe(Math.round(30 * 1.35));
    expect(upgradeCost(colheita, 2)).toBe(Math.round(30 * 1.35 ** 2));
  });
});

describe('prerequisitesMet', () => {
  it('nó sem pré-requisito sempre passa', () => {
    expect(prerequisitesMet(createMetaSave(), node('vigor'))).toBe(true);
  });

  it('exige todos os pré-requisitos no nível 1 ou mais', () => {
    const forca = node('forca');
    expect(prerequisitesMet(createMetaSave(), forca)).toBe(false);
    expect(prerequisitesMet(saveWith(0, { vigor: 1 }), forca)).toBe(true);

    const multi: UpgradeNode = { ...forca, id: 'multi', prerequisites: ['vigor', 'retencao'] };
    expect(prerequisitesMet(saveWith(0, { vigor: 1 }), multi)).toBe(false);
    expect(prerequisitesMet(saveWith(0, { vigor: 1, retencao: 2 }), multi)).toBe(true);
  });

  it('pré-requisito com nível 0 explícito não conta', () => {
    expect(prerequisitesMet(saveWith(0, { vigor: 0 }), node('forca'))).toBe(false);
  });
});

describe('nextCost', () => {
  it('devolve o custo do próximo nível e null no máximo', () => {
    const vigor = node('vigor');
    expect(nextCost(createMetaSave(), vigor)).toBe(20);
    expect(nextCost(saveWith(0, { vigor: 2 }), vigor)).toBe(31);
    expect(nextCost(saveWith(0, { vigor: 5 }), vigor)).toBeNull();
  });
});

describe('purchaseBlock', () => {
  it('null quando pode comprar', () => {
    expect(purchaseBlock(saveWith(20), node('vigor'))).toBeNull();
  });

  it('maxed: nível no máximo', () => {
    expect(purchaseBlock(saveWith(9999, { arsenal1: 1 }), node('arsenal1'))).toBe('maxed');
  });

  it('locked: pré-requisito faltando', () => {
    expect(purchaseBlock(saveWith(9999), node('forca'))).toBe('locked');
  });

  it('poor: almas abaixo do custo do próximo nível', () => {
    expect(purchaseBlock(saveWith(19), node('vigor'))).toBe('poor');
    expect(purchaseBlock(saveWith(24, { vigor: 1 }), node('vigor'))).toBe('poor');
    expect(purchaseBlock(saveWith(25, { vigor: 1 }), node('vigor'))).toBeNull();
  });

  it('a ordem é maxed > locked > poor', () => {
    // maxed e poor ao mesmo tempo: maxed vence.
    expect(purchaseBlock(saveWith(0, { arsenal1: 1 }), node('arsenal1'))).toBe('maxed');
    // locked e poor ao mesmo tempo: locked vence.
    expect(purchaseBlock(saveWith(0), node('forca'))).toBe('locked');
    // maxed e locked ao mesmo tempo (save inconsistente): maxed vence.
    expect(purchaseBlock(saveWith(0, { forca: 5 }), node('forca'))).toBe('maxed');
  });

  it('unknown: custo inválido nunca é cobrado', () => {
    const broken: UpgradeNode = { ...node('vigor'), id: 'quebrado', baseCost: Number.NaN };
    expect(purchaseBlock(saveWith(999), broken)).toBe('unknown');
  });
});

describe('purchaseUpgrade', () => {
  it('compra: desconta o custo e soma 1 ao nível', () => {
    const save = saveWith(100);
    expect(purchaseUpgrade(save, node('vigor'))).toBe(true);
    expect(save.souls).toBe(80);
    expect(save.levels).toEqual({ vigor: 1 });

    expect(purchaseUpgrade(save, node('vigor'))).toBe(true);
    expect(save.souls).toBe(55);
    expect(save.levels).toEqual({ vigor: 2 });
  });

  it('compra com almas exatamente iguais ao custo', () => {
    const save = saveWith(20);
    expect(purchaseUpgrade(save, node('vigor'))).toBe(true);
    expect(save.souls).toBe(0);
  });

  it('recusa por poor sem alterar nada', () => {
    const save = saveWith(19);
    expect(purchaseUpgrade(save, node('vigor'))).toBe(false);
    expect(save).toEqual(saveWith(19));
  });

  it('recusa por locked sem alterar nada (mesmo com almas de sobra)', () => {
    const save = saveWith(9999);
    expect(purchaseUpgrade(save, node('forca'))).toBe(false);
    expect(purchaseUpgrade(save, node('arsenal2'))).toBe(false);
    expect(purchaseUpgrade(save, node('colheita'))).toBe(false);
    expect(save).toEqual(saveWith(9999));
  });

  it('recusa por maxed sem alterar nada', () => {
    const save = saveWith(9999, { arsenal1: 1 });
    expect(purchaseUpgrade(save, node('arsenal1'))).toBe(false);
    expect(save).toEqual(saveWith(9999, { arsenal1: 1 }));
  });

  it('recusa nó de custo inválido sem deixar NaN nas almas', () => {
    const broken: UpgradeNode = { ...node('vigor'), id: 'quebrado', baseCost: Number.NaN };
    const save = saveWith(50);
    expect(purchaseUpgrade(save, broken)).toBe(false);
    expect(save).toEqual(saveWith(50));
  });

  it('a compra respeita a cadeia: libera o próximo nó só depois do pré-requisito', () => {
    const save = saveWith(1000);
    expect(purchaseUpgrade(save, node('arsenal2'))).toBe(false);
    expect(purchaseUpgrade(save, node('arsenal1'))).toBe(true);
    expect(purchaseUpgrade(save, node('arsenal2'))).toBe(true);
    expect(save.levels).toEqual({ arsenal1: 1, arsenal2: 1 });
    expect(save.souls).toBe(1000 - 40 - 70);
  });

  it('não passa do nível máximo comprando em sequência', () => {
    const save = saveWith(1_000_000);
    const vigor = node('vigor');
    let bought = 0;
    while (purchaseUpgrade(save, vigor)) bought += 1;
    expect(bought).toBe(vigor.maxLevel);
    expect(nodeLevel(save, 'vigor')).toBe(vigor.maxLevel);
  });
});

describe('unlockedRelicIds', () => {
  it('sem upgrades são só as relíquias de base', () => {
    expect(unlockedRelicIds(createMetaSave())).toEqual(['lamina', 'martelo', 'foice', 'tomo']);
  });

  it('soma as dos nós comprados na ordem dos nós, sem repetir', () => {
    const ids = unlockedRelicIds(saveWith(0, { arsenal2: 1, arsenal1: 1 }));
    expect(ids).toEqual([
      'lamina',
      'martelo',
      'foice',
      'tomo',
      'adaga',
      'lanca',
      'machado',
      'arco',
      'mangual',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
