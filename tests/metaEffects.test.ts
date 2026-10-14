import { describe, expect, it } from 'vitest';
import { BASE_RELICS, META_CAPS, UPGRADE_NODES } from '../src/data/meta';
import type { UpgradeNode } from '../src/data/meta';
import { RELIC_IDS } from '../src/data/relics';
import { NEUTRAL_EFFECTS, computeEffects } from '../src/logic/meta/effects';
import type { MetaCaps } from '../src/logic/meta/effects';
import { createMetaSave } from '../src/logic/meta/save';
import type { MetaSave } from '../src/logic/meta/save';

const BASE_HP = 100;

function saveWith(levels: Record<string, number>): MetaSave {
  return { ...createMetaSave(), levels };
}

function maxedSave(): MetaSave {
  return saveWith(Object.fromEntries(UPGRADE_NODES.map((n) => [n.id, n.maxLevel])));
}

describe('NEUTRAL_EFFECTS', () => {
  it('é a run sem nenhum upgrade', () => {
    expect(NEUTRAL_EFFECTS).toEqual({
      maxHpBonus: 0,
      damageMultiplier: 1,
      soulRetention: 0,
      relicChanceBonus: 0,
      soulGainMultiplier: 1,
      dodgeWindowBonusMs: 0,
      secretRooms: 0,
      canChooseStart: false,
      unlockedRelics: BASE_RELICS,
    });
  });
});

describe('computeEffects: run de nível 1', () => {
  it('um save novo gera exatamente os efeitos neutros', () => {
    expect(computeEffects(createMetaSave(), undefined, undefined, BASE_HP)).toEqual(
      NEUTRAL_EFFECTS,
    );
  });

  it('o resultado neutro vale para qualquer vida base', () => {
    for (const hp of [1, 50, 100, 250]) {
      expect(computeEffects(createMetaSave(), UPGRADE_NODES, META_CAPS, hp)).toEqual(
        NEUTRAL_EFFECTS,
      );
    }
  });

  it('com todos os nós no máximo nenhum teto é ultrapassado', () => {
    const fx = computeEffects(maxedSave(), UPGRADE_NODES, META_CAPS, BASE_HP);
    expect(fx.maxHpBonus).toBeLessThanOrEqual(BASE_HP * (META_CAPS.maxHpMultiplier - 1));
    expect(BASE_HP + fx.maxHpBonus).toBeLessThanOrEqual(BASE_HP * 1.5);
    expect(fx.damageMultiplier).toBeLessThanOrEqual(META_CAPS.damageMultiplier);
    expect(fx.soulRetention).toBeLessThanOrEqual(META_CAPS.soulRetention);
    expect(fx.relicChanceBonus).toBeLessThanOrEqual(META_CAPS.relicChanceBonus);
    expect(fx.soulGainMultiplier).toBeLessThanOrEqual(1 + META_CAPS.soulGainBonus);
    expect(fx.dodgeWindowBonusMs).toBeLessThanOrEqual(META_CAPS.dodgeWindowBonusMs);
    expect(fx.secretRooms).toBeLessThanOrEqual(META_CAPS.secretRooms);
  });

  it('com tudo no máximo os efeitos são os esperados da árvore atual', () => {
    const fx = computeEffects(maxedSave(), UPGRADE_NODES, META_CAPS, BASE_HP);
    expect(fx.maxHpBonus).toBe(50);
    expect(fx.damageMultiplier).toBeCloseTo(1.2, 10);
    expect(fx.soulRetention).toBeCloseTo(0.6, 10);
    expect(fx.relicChanceBonus).toBeCloseTo(0.16, 10);
    expect(fx.soulGainMultiplier).toBeCloseTo(1.3, 10);
    expect(fx.dodgeWindowBonusMs).toBe(30);
    expect(fx.secretRooms).toBe(1);
    expect(fx.canChooseStart).toBe(true);
    expect(fx.unlockedRelics).toEqual(RELIC_IDS);
  });
});

describe('computeEffects: soma nível x perLevel', () => {
  it('um nível de cada efeito', () => {
    const fx = computeEffects(
      saveWith({ vigor: 2, forca: 1, retencao: 1, sorte: 3, colheita: 2, reflexo: 1 }),
      UPGRADE_NODES,
      META_CAPS,
      BASE_HP,
    );
    expect(fx.maxHpBonus).toBe(20);
    expect(fx.damageMultiplier).toBeCloseTo(1.04, 10);
    expect(fx.soulRetention).toBeCloseTo(0.15, 10);
    expect(fx.relicChanceBonus).toBeCloseTo(0.12, 10);
    expect(fx.soulGainMultiplier).toBeCloseTo(1.2, 10);
    expect(fx.dodgeWindowBonusMs).toBe(10);
    expect(fx.secretRooms).toBe(0);
    expect(fx.canChooseStart).toBe(false);
  });

  it('salas secretas e escolha de relíquia inicial', () => {
    const fx = computeEffects(
      saveWith({ segredos: 1, arsenal1: 1, mestre: 1 }),
      undefined,
      undefined,
      BASE_HP,
    );
    expect(fx.secretRooms).toBe(1);
    expect(fx.canChooseStart).toBe(true);
  });

  it('relíquias liberadas: base primeiro, depois a ordem dos nós, sem repetir', () => {
    expect(
      computeEffects(saveWith({ arsenal1: 1 }), undefined, undefined, BASE_HP).unlockedRelics,
    ).toEqual([...BASE_RELICS, 'adaga', 'lanca']);

    const repeated: UpgradeNode[] = [
      {
        id: 'x',
        type: 'expansion',
        name: 'x',
        description: 'x',
        maxLevel: 1,
        baseCost: 1,
        costMultiplier: 1.2,
        prerequisites: [],
        effect: { kind: 'unlockRelics', relics: ['arco', 'lamina'] },
      },
      {
        id: 'y',
        type: 'expansion',
        name: 'y',
        description: 'y',
        maxLevel: 1,
        baseCost: 1,
        costMultiplier: 1.2,
        prerequisites: [],
        effect: { kind: 'unlockRelics', relics: ['arco', 'mangual'] },
      },
    ];
    const fx = computeEffects(saveWith({ y: 1, x: 1 }), repeated, META_CAPS, BASE_HP);
    expect(fx.unlockedRelics).toEqual([...BASE_RELICS, 'arco', 'mangual']);
  });

  it('nó não comprado não libera relíquias', () => {
    const fx = computeEffects(saveWith({ arsenal2: 0 }), undefined, undefined, BASE_HP);
    expect(fx.unlockedRelics).toEqual(BASE_RELICS);
  });
});

describe('computeEffects: tetos', () => {
  /** Nós com bônus enormes por nível para forçar todos os tetos. */
  const hugeNodes: UpgradeNode[] = [
    ['maxHp', { kind: 'maxHp', perLevel: 1000 }],
    ['damage', { kind: 'damage', perLevel: 5 }],
    ['ret', { kind: 'soulRetention', perLevel: 2 }],
    ['luck', { kind: 'relicChance', perLevel: 2 }],
    ['gain', { kind: 'soulGain', perLevel: 9 }],
    ['dodge', { kind: 'dodgeWindow', perLevel: 500 }],
    ['secret', { kind: 'secretRooms', perLevel: 10 }],
  ].map(([id, effect]) => ({
    id: id as string,
    type: 'basic',
    name: id as string,
    description: id as string,
    maxLevel: 3,
    baseCost: 1,
    costMultiplier: 1.2,
    prerequisites: [],
    effect: effect as UpgradeNode['effect'],
  }));
  const allMax = saveWith(Object.fromEntries(hugeNodes.map((n) => [n.id, 3])));

  it('cada efeito é cortado no teto de META_CAPS', () => {
    const fx = computeEffects(allMax, hugeNodes, META_CAPS, 80);
    expect(fx.maxHpBonus).toBeCloseTo(40, 10);
    expect(fx.damageMultiplier).toBe(META_CAPS.damageMultiplier);
    expect(fx.soulRetention).toBe(META_CAPS.soulRetention);
    expect(fx.relicChanceBonus).toBe(META_CAPS.relicChanceBonus);
    expect(fx.soulGainMultiplier).toBeCloseTo(1 + META_CAPS.soulGainBonus, 10);
    expect(fx.dodgeWindowBonusMs).toBe(META_CAPS.dodgeWindowBonusMs);
    expect(fx.secretRooms).toBe(META_CAPS.secretRooms);
  });

  it('usa os tetos recebidos por parâmetro', () => {
    const caps: MetaCaps = {
      maxHpMultiplier: 1.1,
      damageMultiplier: 1.05,
      soulRetention: 0.1,
      relicChanceBonus: 0.01,
      soulGainBonus: 0.02,
      dodgeWindowBonusMs: 5,
      secretRooms: 1,
    };
    const fx = computeEffects(allMax, hugeNodes, caps, 100);
    expect(fx.maxHpBonus).toBeCloseTo(10, 10);
    expect(fx.damageMultiplier).toBe(1.05);
    expect(fx.soulRetention).toBe(0.1);
    expect(fx.relicChanceBonus).toBe(0.01);
    expect(fx.soulGainMultiplier).toBeCloseTo(1.02, 10);
    expect(fx.dodgeWindowBonusMs).toBe(5);
    expect(fx.secretRooms).toBe(1);
  });

  it('o bônus de vida depende da vida base', () => {
    expect(computeEffects(allMax, hugeNodes, META_CAPS, 200).maxHpBonus).toBeCloseTo(100, 10);
    expect(computeEffects(allMax, hugeNodes, META_CAPS, 0).maxHpBonus).toBe(0);
  });

  it('um nível acima do máximo no save não passa do máximo do nó', () => {
    const forged = computeEffects(saveWith({ vigor: 500 }), UPGRADE_NODES, META_CAPS, 1000);
    const real = computeEffects(saveWith({ vigor: 5 }), UPGRADE_NODES, META_CAPS, 1000);
    expect(forged.maxHpBonus).toBe(real.maxHpBonus);
    expect(real.maxHpBonus).toBe(50);
  });
});

describe('computeEffects: robustez', () => {
  it('nunca devolve negativo nem NaN, mesmo com dados absurdos', () => {
    const bad: UpgradeNode[] = [
      { kind: 'maxHp', perLevel: -50 },
      { kind: 'damage', perLevel: Number.NaN },
      { kind: 'soulRetention', perLevel: -1 },
      { kind: 'relicChance', perLevel: Number.POSITIVE_INFINITY },
      { kind: 'soulGain', perLevel: -3 },
      { kind: 'dodgeWindow', perLevel: Number.NaN },
      { kind: 'secretRooms', perLevel: -2 },
    ].map((effect, i) => ({
      id: `n${i}`,
      type: 'basic',
      name: 'n',
      description: 'n',
      maxLevel: 2,
      baseCost: 1,
      costMultiplier: 1.2,
      prerequisites: [],
      effect: effect as UpgradeNode['effect'],
    }));
    const save = saveWith(Object.fromEntries(bad.map((n) => [n.id, 2])));
    const fx = computeEffects(save, bad, META_CAPS, Number.NaN);
    for (const value of [
      fx.maxHpBonus,
      fx.damageMultiplier,
      fx.soulRetention,
      fx.relicChanceBonus,
      fx.soulGainMultiplier,
      fx.dodgeWindowBonusMs,
      fx.secretRooms,
    ]) {
      expect(Number.isNaN(value)).toBe(false);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(fx.damageMultiplier).toBeGreaterThanOrEqual(1);
    expect(fx.soulGainMultiplier).toBeGreaterThanOrEqual(1);
  });

  it('não altera o save recebido', () => {
    const save = saveWith({ vigor: 2 });
    computeEffects(save, undefined, undefined, BASE_HP);
    expect(save).toEqual(saveWith({ vigor: 2 }));
  });
});
