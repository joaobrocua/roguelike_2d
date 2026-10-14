import { describe, expect, it } from 'vitest';
import {
  cellAt,
  crossedSide,
  crossingAt,
  entryCandidates,
  entryPoint,
  sealUnusedExits,
  usedExits,
} from '../src/logic/map/roomRuntime';
import { detectExits } from '../src/logic/map/roomExits';
import type { BiomeMap, MapLink, PlacedRoom, Side } from '../src/logic/map/types';

type Grid = string[][];

function emptyRoom(cells = 1): Grid {
  const cols = 30 * cells;
  return Array.from({ length: 17 }, (_, row) =>
    Array.from({ length: cols }, (_, col) =>
      row === 0 || row >= 15 || col === 0 || col === cols - 1 ? '#' : '.',
    ),
  );
}

function open(grid: Grid, side: Side, cell = 0): void {
  const cols = grid[0]?.length ?? 0;
  const set = (row: number, col: number): void => {
    const line = grid[row];
    if (line) line[col] = '.';
  };
  if (side === 'left') for (const r of [12, 13, 14]) set(r, 0);
  if (side === 'right') for (const r of [12, 13, 14]) set(r, cols - 1);
  if (side === 'up') for (const c of [13, 14, 15, 16]) set(0, c + 30 * cell);
  if (side === 'down') {
    for (const c of [13, 14, 15, 16]) {
      set(15, c + 30 * cell);
      set(16, c + 30 * cell);
    }
  }
}

const toLayout = (grid: Grid): string[] => grid.map((line) => line.join(''));

describe('sealUnusedExits', () => {
  it('fecha as portas que não estão na lista e mantém as da lista', () => {
    const grid = emptyRoom();
    open(grid, 'left');
    open(grid, 'right');
    open(grid, 'down');
    const sealed = sealUnusedExits(toLayout(grid), [{ side: 'right', cell: 0 }]);
    expect(detectExits(sealed)).toEqual([{ side: 'right', cell: 0 }]);
  });

  it('o chão fecha por inteiro quando a porta de baixo é selada', () => {
    const grid = emptyRoom();
    open(grid, 'down');
    const sealed = sealUnusedExits(toLayout(grid), []);
    expect(sealed[15]).toBe('#'.repeat(30));
    expect(sealed[16]).toBe('#'.repeat(30));
  });

  it('em sala larga, sela só a célula que não está na lista', () => {
    const grid = emptyRoom(2);
    open(grid, 'up', 0);
    open(grid, 'up', 1);
    const sealed = sealUnusedExits(toLayout(grid), [{ side: 'up', cell: 1 }]);
    expect(detectExits(sealed)).toEqual([{ side: 'up', cell: 1 }]);
  });

  it('não altera o desenho original', () => {
    const grid = emptyRoom();
    open(grid, 'left');
    const layout = toLayout(grid);
    const copy = [...layout];
    sealUnusedExits(layout, []);
    expect(layout).toEqual(copy);
  });
});

describe('crossedSide', () => {
  const size = { widthPx: 480, heightPx: 272 };

  it('devolve o lado pelo qual o centro saiu da sala', () => {
    expect(crossedSide(-1, 100, size)).toBe('left');
    expect(crossedSide(481, 100, size)).toBe('right');
    expect(crossedSide(100, -1, size)).toBe('up');
    expect(crossedSide(100, 273, size)).toBe('down');
  });

  it('dentro da sala (inclusive na borda) não há saída', () => {
    expect(crossedSide(0, 0, size)).toBeNull();
    expect(crossedSide(480, 272, size)).toBeNull();
    expect(crossedSide(240, 136, size)).toBeNull();
  });
});

describe('cellAt', () => {
  it('acha a célula (30 blocos) e limita ao tamanho da sala', () => {
    expect(cellAt(10, 16, 2)).toBe(0);
    expect(cellAt(30 * 16 + 1, 16, 2)).toBe(1);
    expect(cellAt(-50, 16, 2)).toBe(0);
    expect(cellAt(5000, 16, 2)).toBe(1);
    expect(cellAt(5000, 16, 1)).toBe(0);
  });
});

describe('entryPoint', () => {
  it('entrando pela esquerda ou direita: no chão, junto à parede', () => {
    const left = entryPoint('left', 0, 30, 22 / 16);
    const right = entryPoint('right', 0, 60, 22 / 16);
    expect(left.col).toBeLessThan(5);
    expect(right.col).toBe(58);
    expect(left.row).toBeCloseTo(15 - 22 / 32, 5); // centro do corpo em pé sobre o chão (linha 15)
    expect(left.vy).toBe(0);
  });

  it('entrando por cima: cai no meio da abertura; por baixo: sobe com impulso', () => {
    const up = entryPoint('up', 1, 60, 22 / 16);
    const down = entryPoint('down', 1, 60, 22 / 16);
    expect(up.col).toBe(30 + 15); // centro das colunas 13..16 da 2ª célula
    expect(up.row).toBeLessThan(3);
    expect(up.vy).toBe(0);
    // Subindo, o herói fica no chão AO LADO do buraco (no meio dele cairia de volta)
    expect(Math.abs(down.col - (30 + 15))).toBeGreaterThan(2);
    expect(down.vy).toBe(0);
  });
});

// Mapa: 0 --(right)-- 1 ; 1 --(down, célula 1)-- 2 (2 está abaixo, em outra linha)
function room(id: number, gx: number, gy: number, cellsW = 1): PlacedRoom {
  return { id, templateId: `t${id}`, kind: 'combat', gx, gy, cellsW };
}
const links: MapLink[] = [
  { from: 0, to: 1, fromSide: 'right', fromCell: 0, toCell: 0 },
  { from: 1, to: 2, fromSide: 'down', fromCell: 1, toCell: 0 },
];
const map: BiomeMap = {
  seed: 1,
  biome: 'muralhas',
  rooms: [room(0, 0, 0), room(1, 1, 0, 2), room(2, 2, 1)],
  links,
  startId: 0,
  endId: 2,
};

describe('usedExits', () => {
  it('lista as portas com ligação, nos dois sentidos da ligação', () => {
    expect(usedExits(map, 0)).toEqual([{ side: 'right', cell: 0 }]);
    expect(usedExits(map, 1)).toEqual([
      { side: 'left', cell: 0 },
      { side: 'down', cell: 1 },
    ]);
    expect(usedExits(map, 2)).toEqual([{ side: 'up', cell: 0 }]);
  });
});

describe('crossingAt', () => {
  it('sai pela direita da sala 0 e chega pela esquerda da sala 1', () => {
    expect(crossingAt(map, 0, 'right', 0)).toEqual({ toId: 1, entrySide: 'left', entryCell: 0 });
  });

  it('o caminho de volta funciona (ligação lida pelo outro lado)', () => {
    expect(crossingAt(map, 1, 'left', 0)).toEqual({ toId: 0, entrySide: 'right', entryCell: 0 });
    expect(crossingAt(map, 2, 'up', 0)).toEqual({ toId: 1, entrySide: 'down', entryCell: 1 });
  });

  it('portas verticais respeitam a célula', () => {
    expect(crossingAt(map, 1, 'down', 1)).toEqual({ toId: 2, entrySide: 'up', entryCell: 0 });
    expect(crossingAt(map, 1, 'down', 0)).toBeNull();
  });

  it('porta sem ligação devolve null', () => {
    expect(crossingAt(map, 0, 'left', 0)).toBeNull();
  });
});

describe('entryCandidates', () => {
  it('portas laterais avançam sala adentro; a de cima tem um ponto só', () => {
    const left = entryCandidates('left', 0, 30, 22 / 16);
    const right = entryCandidates('right', 0, 30, 22 / 16);
    expect(left.length).toBeGreaterThan(1);
    expect(left.map((c) => c.col)).toEqual([...left.map((c) => c.col)].sort((a, b) => a - b));
    expect(right.map((c) => c.col)).toEqual([...right.map((c) => c.col)].sort((a, b) => b - a));
    expect(left[0]).toEqual(entryPoint('left', 0, 30, 22 / 16));
    expect(entryCandidates('up', 0, 30, 22 / 16)).toHaveLength(1);
  });

  it('a porta de baixo tem alternativas, dos dois lados do buraco', () => {
    const candidates = entryCandidates('down', 0, 30, 22 / 16);
    expect(candidates.length).toBeGreaterThan(1);
    const center = 15;
    expect(candidates.some((c) => c.col > center)).toBe(true);
    expect(candidates.some((c) => c.col < center)).toBe(true);
    // Todas ficam fora do buraco (colunas 13 a 16)
    for (const c of candidates) expect(c.col < 13 || c.col > 17).toBe(true);
  });

  it('a primeira alternativa é o ponto padrão', () => {
    expect(entryCandidates('down', 1, 60, 22 / 16)[0]).toEqual(entryPoint('down', 1, 60, 22 / 16));
  });
});
