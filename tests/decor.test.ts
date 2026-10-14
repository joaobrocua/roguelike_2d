import { describe, expect, it } from 'vitest';
import { planDecor, type DecorItem } from '../src/logic/decor';
import { isSolidTile, parseRoom, type ParsedRoom } from '../src/logic/roomParser';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';
import { CELL, DOOR } from '../src/data/mapRules';
import {
  DECOR_CLEAR_RADIUS_TILES,
  DECOR_MIN_GAP_TILES,
  DECOR_RULES,
  type DecorKind,
} from '../src/data/decor';

const SEEDS = Array.from({ length: 20 }, (_, i) => i * 7919 + 1);
const FLOOR: readonly DecorKind[] = ['tuft', 'rubble', 'bone'];
const CEILING: readonly DecorKind[] = ['vine', 'chain', 'drip'];

/** Sala de uma tela com portas nas posições padrão (laterais nas linhas 12-14, topo/base 13-16). */
function doorRoom(): ParsedRoom {
  const sideRows: readonly number[] = DOOR.horizontalRows;
  const doorCols: readonly number[] = DOOR.verticalCols;
  const rows: string[] = [];
  for (let r = 0; r < CELL.rows; r++) {
    let line = '';
    for (let c = 0; c < CELL.cols; c++) {
      const side = (c === 0 || c === CELL.cols - 1) && sideRows.includes(r);
      const vertical = doorCols.includes(c) && (r === 0 || r >= 15);
      const wall = r === 0 || r >= 15 || c === 0 || c === CELL.cols - 1;
      // Plataformas no meio para ter chão e teto variados.
      const platform = (r === 10 && c >= 4 && c <= 12) || (r === 6 && c >= 16 && c <= 26);
      line += (wall && !side && !vertical) || platform ? '#' : '.';
    }
    rows.push(line);
  }
  return parseRoom(rows);
}

/** Bloco onde o item aparece de fato (em cima do chão, embaixo do teto, ou o próprio bloco). */
function visualCell(item: DecorItem): { col: number; row: number } {
  if (FLOOR.includes(item.kind)) return { col: item.col, row: item.row - 1 };
  if (CEILING.includes(item.kind)) return { col: item.col, row: item.row + 1 };
  return { col: item.col, row: item.row };
}

function allPlans(): { room: ParsedRoom; items: DecorItem[]; id: string }[] {
  const plans: { room: ParsedRoom; items: DecorItem[]; id: string }[] = [];
  for (const template of ROOM_TEMPLATES) {
    const room = parseRoom(template.layout);
    for (const seed of SEEDS) plans.push({ room, items: planDecor(room, seed), id: template.id });
  }
  return plans;
}

describe('planDecor: determinismo', () => {
  const room = doorRoom();

  it('mesma sala e mesma seed dão o mesmo resultado', () => {
    expect(planDecor(room, 123)).toEqual(planDecor(room, 123));
  });

  it('seeds diferentes geralmente dão resultados diferentes', () => {
    const distinct = new Set(SEEDS.map((seed) => JSON.stringify(planDecor(room, seed))));
    expect(distinct.size).toBeGreaterThan(SEEDS.length / 2);
  });

  it('a lista sai ordenada por (linha, coluna, tipo)', () => {
    for (const seed of SEEDS) {
      const items = planDecor(room, seed);
      for (let i = 1; i < items.length; i++) {
        const a = items[i - 1] as DecorItem;
        const b = items[i] as DecorItem;
        const order = a.row - b.row || a.col - b.col || (a.kind < b.kind ? -1 : 1);
        expect(order).toBeLessThan(0);
      }
    }
  });

  it('variantes ficam dentro do limite de cada tipo', () => {
    for (const seed of SEEDS) {
      for (const item of planDecor(room, seed)) {
        expect(item.variant).toBeGreaterThanOrEqual(0);
        expect(item.variant).toBeLessThan(DECOR_RULES[item.kind].variants);
        expect(Number.isInteger(item.variant)).toBe(true);
      }
    }
  });
});

describe('planDecor: onde cada tipo nasce', () => {
  it('tufos, entulho e ossos só sobre chão; vinhas, correntes e gotas só sob teto', () => {
    const room = doorRoom();
    const found = new Set<DecorKind>();
    for (const seed of SEEDS) {
      for (const item of planDecor(room, seed)) {
        found.add(item.kind);
        if (FLOOR.includes(item.kind)) {
          expect(isSolidTile(room, item.col, item.row)).toBe(true);
          expect(isSolidTile(room, item.col, item.row - 1)).toBe(false);
          expect(item.row).toBeGreaterThan(0);
        }
        if (CEILING.includes(item.kind)) {
          expect(isSolidTile(room, item.col, item.row)).toBe(true);
          expect(isSolidTile(room, item.col, item.row + 1)).toBe(false);
        }
      }
    }
    // Garante que o teste não passa por vazio: os tipos principais apareceram.
    for (const kind of ['tuft', 'vine', 'cobweb', 'crack'] as const) expect(found).toContain(kind);
  });

  it('teias ficam em bloco vazio com sólido acima e ao lado; fendas em sólido visível', () => {
    for (const { room, items } of allPlans()) {
      for (const item of items) {
        if (item.kind === 'cobweb') {
          expect(isSolidTile(room, item.col, item.row)).toBe(false);
          expect(isSolidTile(room, item.col, item.row - 1)).toBe(true);
          const side = item.flipX ? item.col + 1 : item.col - 1;
          expect(isSolidTile(room, side, item.row)).toBe(true);
        }
        if (item.kind === 'crack') {
          expect(isSolidTile(room, item.col, item.row)).toBe(true);
          const open =
            !isSolidTile(room, item.col, item.row - 1) ||
            !isSolidTile(room, item.col, item.row + 1) ||
            !isSolidTile(room, item.col - 1, item.row) ||
            !isSolidTile(room, item.col + 1, item.row);
          expect(open).toBe(true);
        }
      }
    }
  });

  it('tipo com chance 0 (banner) nunca é gerado', () => {
    expect(DECOR_RULES.banner.chance).toBe(0);
    for (const { items } of allPlans()) {
      expect(items.some((item) => item.kind === 'banner')).toBe(false);
    }
  });

  it('sala sem nenhuma superfície livre não gera nada', () => {
    expect(planDecor(parseRoom(['####', '####', '####']), 5)).toEqual([]);
  });

  it('sala sem chão nem teto sólidos (só vazio) não gera nada', () => {
    expect(planDecor(parseRoom(['...', '...']), 5)).toEqual([]);
  });
});

describe('planDecor: áreas protegidas', () => {
  it('nenhum item perto de marcadores ou do nascimento', () => {
    const room = parseRoom([
      '####################',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.........C........#',
      '#...P.........B....#',
      '####################',
    ]);
    const points = [...room.markers, ...(room.spawn ? [room.spawn] : [])];
    let total = 0;
    for (const seed of SEEDS) {
      for (const item of planDecor(room, seed)) {
        total++;
        const cell = visualCell(item);
        for (const p of points) {
          const dist = Math.max(Math.abs(cell.col - p.col), Math.abs(cell.row - p.row));
          expect(dist).toBeGreaterThan(DECOR_CLEAR_RADIUS_TILES);
        }
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it('em todos os modelos nada nasce perto de marcadores', () => {
    // Junta as violações e confere uma vez só (um expect por item deixava o teste lento)
    const violations: string[] = [];
    for (const { room, items, id } of allPlans()) {
      for (const item of items) {
        const cell = visualCell(item);
        for (const m of room.markers) {
          const dist = Math.max(Math.abs(cell.col - m.col), Math.abs(cell.row - m.row));
          if (dist <= DECOR_CLEAR_RADIUS_TILES)
            violations.push(`${id}: ${item.kind} perto de '${m.char}'`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('nenhum item na faixa das portas', () => {
    const room = doorRoom();
    let total = 0;
    for (const seed of SEEDS) {
      for (const item of planDecor(room, seed)) {
        total++;
        if (item.col === 0 || item.col === room.cols - 1) {
          expect(item.row < 12 || item.row > 14).toBe(true);
        }
        if (item.row === 0 || item.row === room.rows - 1) {
          expect(item.col % CELL.cols < 13 || item.col % CELL.cols > 16).toBe(true);
        }
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it('em todos os modelos nada nasce na faixa das portas', () => {
    const violations: string[] = [];
    for (const { room, items, id } of allPlans()) {
      for (const item of items) {
        if (item.col === 0 || item.col === room.cols - 1) {
          if (item.row >= 12 && item.row <= 14) violations.push(`${id}: lateral`);
        }
        if (item.row === 0 || item.row === room.rows - 1) {
          const inCell = item.col % CELL.cols;
          if (inCell >= 13 && inCell <= 16) violations.push(`${id}: topo/base`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('planDecor: distância mínima', () => {
  it('dois itens do mesmo tipo na mesma linha ou coluna ficam a pelo menos o mínimo', () => {
    const violations: string[] = [];
    for (const { items, id } of allPlans()) {
      for (let i = 0; i < items.length; i++) {
        const a = items[i] as DecorItem;
        for (let j = i + 1; j < items.length; j++) {
          const b = items[j] as DecorItem;
          if (a.kind !== b.kind) continue;
          if (a.row === b.row && Math.abs(a.col - b.col) < DECOR_MIN_GAP_TILES) {
            violations.push(`${id}: ${a.kind} na linha`);
          }
          if (a.col === b.col && Math.abs(a.row - b.row) < DECOR_MIN_GAP_TILES) {
            violations.push(`${id}: ${a.kind} na coluna`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('chão comprido recebe vários tufos, e nunca em blocos vizinhos', () => {
    const wall = '#'.repeat(30);
    const air = '#' + '.'.repeat(28) + '#';
    const room = parseRoom([wall, air, air, air, wall]);
    let total = 0;
    for (const seed of SEEDS) {
      const tufts = planDecor(room, seed).filter((item) => item.kind === 'tuft');
      total += tufts.length;
      for (let i = 1; i < tufts.length; i++) {
        const gap = (tufts[i] as DecorItem).col - (tufts[i - 1] as DecorItem).col;
        expect(gap).toBeGreaterThanOrEqual(DECOR_MIN_GAP_TILES);
      }
    }
    expect(total).toBeGreaterThan(SEEDS.length);
  });
});

describe('planDecor: modelos de sala do jogo', () => {
  it('roda em todos os modelos com 20 seeds sem lançar e gera >= 1 item por sala em média', () => {
    let rooms = 0;
    let items = 0;
    for (const template of ROOM_TEMPLATES) {
      const room = parseRoom(template.layout);
      for (const seed of SEEDS) {
        expect(() => planDecor(room, seed), template.id).not.toThrow();
        items += planDecor(room, seed).length;
        rooms++;
      }
    }
    expect(rooms).toBeGreaterThan(0);
    expect(items / rooms).toBeGreaterThanOrEqual(1);
  });
});
