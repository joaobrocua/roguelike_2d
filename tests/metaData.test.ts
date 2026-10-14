import { describe, expect, it } from 'vitest';
import {
  BASE_RELICS,
  META_CAPS,
  SOUL_REWARD,
  UPGRADE_NODES,
  type UpgradeType,
} from '../src/data/meta';
import { ENEMY_BODIES } from '../src/data/enemies';
import { GUARDIAO } from '../src/data/boss';
import { RELIC_IDS, RELICS } from '../src/data/relics';
import { GAME_SIZE, ROLL } from '../src/data/balance';
import { PERFECT_DODGE } from '../src/data/combat';
import { SANCTUARY as UI } from '../src/data/ui';
import { upgradeCost } from '../src/logic/meta/tree';

const GLYPH = 8;

describe('árvore de melhorias (dados)', () => {
  it('os ids são únicos e os pré-requisitos existem e não formam ciclo', () => {
    const ids = UPGRADE_NODES.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const node of UPGRADE_NODES) {
      for (const need of node.prerequisites) {
        expect(ids, `${node.id} precisa de ${need}`).toContain(need);
        expect(need).not.toBe(node.id);
      }
    }
    // Sem ciclos: seguindo os pré-requisitos sempre se chega a nós sem pré-requisito
    const depth = (id: string, seen: string[] = []): number => {
      expect(seen, `ciclo em ${id}`).not.toContain(id);
      const node = UPGRADE_NODES.find((n) => n.id === id);
      return 1 + Math.max(0, ...(node?.prerequisites ?? []).map((p) => depth(p, [...seen, id])));
    };
    for (const id of ids) expect(depth(id)).toBeLessThan(ids.length + 1);
  });

  it('segue a divisão 20/40/40 do documento (básicos, agência, expansão)', () => {
    const count = (type: UpgradeType) => UPGRADE_NODES.filter((n) => n.type === type).length;
    const total = UPGRADE_NODES.length;
    expect(count('basic') / total).toBeCloseTo(0.2, 1);
    expect(count('agency') / total).toBeCloseTo(0.4, 1);
    expect(count('expansion') / total).toBeCloseTo(0.4, 1);
  });

  it('o multiplicador de custo fica entre 1,15 e 1,35 e o custo só cresce', () => {
    for (const node of UPGRADE_NODES) {
      expect(node.costMultiplier, node.id).toBeGreaterThanOrEqual(1.15);
      expect(node.costMultiplier, node.id).toBeLessThanOrEqual(1.35);
      expect(node.baseCost, node.id).toBeGreaterThan(0);
      expect(node.maxLevel, node.id).toBeGreaterThanOrEqual(1);
      let previous = 0;
      for (let level = 0; level < node.maxLevel; level++) {
        const cost = upgradeCost(node, level);
        expect(cost, node.id).toBeGreaterThanOrEqual(previous);
        previous = cost;
      }
    }
  });

  it('as relíquias liberadas existem e as armas de base não precisam de nó', () => {
    const unlocked = UPGRADE_NODES.flatMap((n) =>
      n.effect.kind === 'unlockRelics' ? n.effect.relics : [],
    );
    for (const id of unlocked) expect(RELIC_IDS).toContain(id);
    for (const id of unlocked) expect(BASE_RELICS).not.toContain(id);
    // Toda relíquia do jogo ou é de base ou é liberada por algum nó (nenhuma fica inalcançável)
    for (const id of RELIC_IDS) expect([...BASE_RELICS, ...unlocked]).toContain(id);
  });

  it('os tetos respeitam a regra de no máximo 1,5x a 2x dos atributos iniciais', () => {
    expect(META_CAPS.maxHpMultiplier).toBeLessThanOrEqual(2);
    expect(META_CAPS.damageMultiplier).toBeLessThanOrEqual(2);
    expect(META_CAPS.soulRetention).toBeLessThanOrEqual(1);
  });

  it('todo inimigo e o chefe rendem almas', () => {
    for (const body of [...ENEMY_BODIES, GUARDIAO]) {
      expect(SOUL_REWARD[body.id], body.id).toBeGreaterThan(0);
    }
  });
});

describe('tetos da meta-progressão', () => {
  it('a esquiva perfeita com o bônus máximo ainda cabe dentro da invulnerabilidade da rolagem', () => {
    expect(PERFECT_DODGE.windowMs + META_CAPS.dodgeWindowBonusMs).toBeLessThan(ROLL.invulnerableMs);
  });
});

describe('a janela do Santuário cabe na tela', () => {
  const L = UI.layout;

  it('nome do nó cabe no cartão e a descrição na linha do detalhe', () => {
    const cardText = L.columnWidth - 12;
    const detailText = L.width - L.padding * 2 - 12;
    for (const node of UPGRADE_NODES) {
      expect(node.name.length * GLYPH, node.id).toBeLessThanOrEqual(cardText);
      expect(node.description.length * GLYPH, node.id).toBeLessThanOrEqual(detailText);
    }
    expect(UI.startHelp.length * GLYPH).toBeLessThanOrEqual(detailText);
  });

  it('o título do detalhe e o estado (à direita) não se encontram', () => {
    const room = (L.width - L.padding * 2 - 12) / GLYPH - 2; // folga de 2 letras entre os dois
    const titleOf = (n: (typeof UPGRADE_NODES)[number]): number =>
      `${n.name}  ${n.maxLevel}/${n.maxLevel}`.length;
    const fixed = Object.entries(UI.status)
      .filter(([key]) => key !== 'locked' && key !== 'maxedShort')
      .map(([, text]) => text.length);
    for (const node of UPGRADE_NODES) {
      const missing = node.prerequisites
        .map((id) => UPGRADE_NODES.find((n) => n.id === id)?.name ?? id)
        .join(', ');
      const statuses = [...fixed, UI.status.locked.length + missing.length];
      expect(titleOf(node) + Math.max(...statuses), node.id).toBeLessThanOrEqual(room);
    }
  });

  it('a relíquia inicial e a dica cabem na largura da janela', () => {
    const longestRelic = Math.max(...RELIC_IDS.map((id) => RELICS[id].name.length));
    expect((UI.startLabel.length + longestRelic + 6) * GLYPH).toBeLessThanOrEqual(
      L.width - L.padding * 2,
    );
    expect(UI.hint.length * GLYPH).toBeLessThanOrEqual(L.width - L.padding * 2);
  });

  it('as três colunas cabem na janela e a janela cabe na tela', () => {
    expect(L.padding * 2 + L.columnWidth * 3 + L.columnGap * 2).toBeLessThanOrEqual(L.width);
    expect(L.width).toBeLessThan(GAME_SIZE.width);
    expect(L.height).toBeLessThan(GAME_SIZE.height);
  });

  it('o layout vertical não se sobrepõe (cartões, relíquia inicial, detalhe, dica)', () => {
    const { firstCardY, card, startRow, detail, hintY } = L;
    const mostCards = Math.max(
      ...(['basic', 'agency', 'expansion'] as const).map(
        (type) => UPGRADE_NODES.filter((n) => n.type === type).length,
      ),
    );
    const cardsEnd = firstCardY + mostCards * card.height + (mostCards - 1) * card.gap;
    expect(cardsEnd).toBeLessThanOrEqual(startRow.y - startRow.height / 2);
    expect(startRow.y + startRow.height / 2).toBeLessThanOrEqual(detail.y);
    expect(detail.y + detail.height).toBeLessThanOrEqual(hintY - GLYPH / 2);
    expect(hintY + GLYPH / 2).toBeLessThanOrEqual(L.height);
  });
});
