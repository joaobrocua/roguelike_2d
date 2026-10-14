import { describe, expect, it } from 'vitest';
import {
  exitsConnected,
  exitStandPoint,
  reachableFrom,
  unreachableMarkers,
} from '../src/logic/map/reachability';
import type { Side } from '../src/logic/map/types';

type Grid = string[][];

/** Caixa fechada (borda e chão sólidos, miolo vazio) com `cells` células de largura. */
function emptyGrid(cells = 1): Grid {
  const cols = 30 * cells;
  return Array.from({ length: 17 }, (_, row) =>
    Array.from({ length: cols }, (_, col) =>
      row === 0 || row >= 15 || col === 0 || col === cols - 1 ? '#' : '.',
    ),
  );
}

function put(grid: Grid, col: number, row: number, char: string): void {
  const line = grid[row];
  if (line === undefined) throw new Error(`linha ${row} fora da sala`);
  line[col] = char;
}

/** Preenche o retângulo [col0..col1] x [row0..row1] (inclusive). */
function fill(grid: Grid, col0: number, col1: number, row0: number, row1: number, char: string) {
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) put(grid, col, row, char);
  }
}

function openDoor(grid: Grid, side: Side, cell = 0): void {
  const cols = grid[0]?.length ?? 0;
  if (side === 'left' || side === 'right') {
    for (const row of [12, 13, 14]) put(grid, side === 'left' ? 0 : cols - 1, row, '.');
  } else {
    for (const col of [13, 14, 15, 16]) put(grid, col + 30 * cell, side === 'up' ? 0 : 16, '.');
  }
}

function lines(grid: Grid): string[] {
  return grid.map((line) => line.join(''));
}

/** Sala com porta esquerda e direita; `edit` desenha os obstáculos. */
function corridor(edit: (grid: Grid) => void): string[] {
  const grid = emptyGrid();
  openDoor(grid, 'left');
  openDoor(grid, 'right');
  edit(grid);
  return lines(grid);
}

describe('exitStandPoint', () => {
  it('left/right: linha mais baixa da faixa (14)', () => {
    const layout = corridor(() => {});
    expect(exitStandPoint(layout, { side: 'left', cell: 0 })).toEqual({ col: 0, row: 14 });
    expect(exitStandPoint(layout, { side: 'right', cell: 0 })).toEqual({ col: 29, row: 14 });
  });

  it('left sem chão embaixo: null', () => {
    const layout = corridor((grid) => put(grid, 0, 15, '.'));
    expect(exitStandPoint(layout, { side: 'left', cell: 0 })).toBeNull();
  });

  it('up sem nada embaixo: o chão da sala', () => {
    const grid = emptyGrid();
    openDoor(grid, 'up');
    expect(exitStandPoint(lines(grid), { side: 'up', cell: 0 })).toEqual({ col: 13, row: 14 });
  });

  it('up com plataforma sob a faixa: o ponto de pé fica em cima dela', () => {
    const grid = emptyGrid();
    openDoor(grid, 'up');
    fill(grid, 13, 16, 6, 6, '#');
    expect(exitStandPoint(lines(grid), { side: 'up', cell: 0 })).toEqual({ col: 13, row: 5 });
  });

  it('up com a faixa bloqueada logo abaixo: null', () => {
    const grid = emptyGrid();
    openDoor(grid, 'up');
    fill(grid, 13, 16, 1, 1, '#');
    expect(exitStandPoint(lines(grid), { side: 'up', cell: 0 })).toBeNull();
  });

  it('up na segunda célula usa as colunas somadas de 30', () => {
    const grid = emptyGrid(2);
    openDoor(grid, 'up', 1);
    expect(exitStandPoint(lines(grid), { side: 'up', cell: 1 })).toEqual({ col: 43, row: 14 });
  });

  it('down: o chão ao lado da abertura, na linha 14', () => {
    const grid = emptyGrid();
    openDoor(grid, 'down');
    fill(grid, 13, 16, 15, 15, '.');
    expect(exitStandPoint(lines(grid), { side: 'down', cell: 0 })).toEqual({ col: 12, row: 14 });
  });
});

describe('reachableFrom', () => {
  it('chão reto: toda a linha 14 e nada mais', () => {
    const reached = reachableFrom(
      corridor(() => {}),
      { col: 0, row: 14 },
    );
    expect(reached.size).toBe(30);
    expect(reached.has('29,14')).toBe(true);
    expect(reached.has('5,13')).toBe(false);
  });

  it('ponto que não é de pé devolve conjunto vazio', () => {
    expect(
      reachableFrom(
        corridor(() => {}),
        { col: 5, row: 10 },
      ).size,
    ).toBe(0);
  });

  it('cai da beirada de uma plataforma até o chão', () => {
    const layout = corridor((grid) => fill(grid, 10, 12, 10, 10, '#'));
    const reached = reachableFrom(layout, { col: 11, row: 9 });
    expect(reached.has('13,14')).toBe(true);
    expect(reached.has('9,14')).toBe(true);
  });

  it('o teto baixo bloqueia: não pula onde não cabe a cabeça', () => {
    // Laje no teto a 1 bloco acima do chão sobre toda a sala, menos a faixa final.
    const layout = corridor((grid) => fill(grid, 1, 20, 13, 13, '#'));
    const reached = reachableFrom(layout, { col: 0, row: 14 });
    expect(reached.size).toBeLessThan(30);
    expect(reached.has('5,14')).toBe(false);
  });
});

describe('portas esquerda e direita', () => {
  it('chão reto: conectadas', () => {
    expect(exitsConnected(corridor(() => {}))).toEqual({ ok: true, problems: [] });
  });

  it('vão de 3 blocos no chão: atravessa pulando', () => {
    const layout = corridor((grid) => fill(grid, 13, 15, 15, 16, '.'));
    expect(exitsConnected(layout).ok).toBe(true);
  });

  it('vão de 9 blocos: não atravessa', () => {
    const layout = corridor((grid) => fill(grid, 10, 18, 15, 16, '.'));
    const result = exitsConnected(layout);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('left');
    expect(result.problems.join(' ')).toContain('right');
  });

  it('vão no limite (maxGap = 5) passa e 6 não', () => {
    expect(exitsConnected(corridor((g) => fill(g, 12, 16, 15, 16, '.'))).ok).toBe(true);
    expect(exitsConnected(corridor((g) => fill(g, 12, 17, 15, 16, '.'))).ok).toBe(false);
  });

  it('fosso raso (só a linha 15) não prende o jogador', () => {
    const layout = corridor((grid) => fill(grid, 10, 18, 15, 15, '.'));
    expect(exitsConnected(layout).ok).toBe(true);
  });

  it('degrau de 2 blocos: sobe', () => {
    const layout = corridor((grid) => fill(grid, 15, 16, 13, 14, '#'));
    expect(exitsConnected(layout).ok).toBe(true);
  });

  it('degrau de 3 blocos (limite) sobe e de 4 não', () => {
    expect(exitsConnected(corridor((g) => fill(g, 15, 16, 12, 14, '#'))).ok).toBe(true);
    expect(exitsConnected(corridor((g) => fill(g, 15, 16, 11, 14, '#'))).ok).toBe(false);
  });

  it('parede de 6 blocos: não sobe', () => {
    const layout = corridor((grid) => fill(grid, 15, 16, 9, 14, '#'));
    expect(exitsConnected(layout).ok).toBe(false);
  });

  it('parede do chão ao teto: não passa', () => {
    const layout = corridor((grid) => fill(grid, 15, 15, 1, 14, '#'));
    expect(exitsConnected(layout).ok).toBe(false);
  });

  it('passagem com 2 blocos livres de altura serve; com 1 não', () => {
    const wallWithGap = (freeRows: number) =>
      corridor((grid) => fill(grid, 15, 15, 1, 14 - freeRows, '#'));
    expect(exitsConnected(wallWithGap(2)).ok).toBe(true);
    expect(exitsConnected(wallWithGap(1)).ok).toBe(false);
  });

  it('teto baixo no meio da sala (1 bloco livre) bloqueia a passagem', () => {
    // Túnel de 1 bloco: laje larga de 3 colunas no teto do chão, ligada ao teto da sala.
    const layout = corridor((grid) => {
      fill(grid, 10, 12, 1, 13, '#');
    });
    expect(exitsConnected(layout).ok).toBe(false);
  });
});

describe('porta de cima', () => {
  function upRoom(edit: (grid: Grid) => void): string[] {
    const grid = emptyGrid();
    openDoor(grid, 'left');
    openDoor(grid, 'up');
    edit(grid);
    return lines(grid);
  }

  it('plataformas escalonadas até a porta: alcançável nos dois sentidos', () => {
    const layout = upRoom((grid) => {
      fill(grid, 8, 11, 12, 12, '#');
      fill(grid, 3, 6, 9, 9, '#');
      fill(grid, 8, 11, 6, 6, '#');
      fill(grid, 13, 16, 3, 3, '#');
    });
    expect(exitStandPoint(layout, { side: 'up', cell: 0 })).toEqual({ col: 13, row: 2 });
    expect(exitsConnected(layout)).toEqual({ ok: true, problems: [] });
  });

  it('sem plataformas: a abertura fica alta demais para o pulo', () => {
    const result = exitsConnected(upRoom(() => {}));
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('up[0]');
  });

  it('plataformas com um degrau grande demais no caminho: inalcançável', () => {
    const layout = upRoom((grid) => {
      fill(grid, 8, 11, 12, 12, '#');
      fill(grid, 3, 6, 9, 9, '#');
      fill(grid, 8, 11, 5, 5, '#'); // 4 blocos acima da anterior
      fill(grid, 13, 16, 3, 3, '#');
    });
    const result = exitsConnected(layout);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('left não alcança a porta up[0]');
  });
});

describe('porta de baixo', () => {
  function downRoom(edit: (grid: Grid) => void): string[] {
    const grid = emptyGrid();
    openDoor(grid, 'left');
    openDoor(grid, 'down');
    fill(grid, 13, 16, 15, 15, '.');
    edit(grid);
    return lines(grid);
  }

  it('queda pela abertura: o chão ao lado dela é alcançável a partir da porta esquerda', () => {
    expect(exitsConnected(downRoom(() => {}))).toEqual({ ok: true, problems: [] });
  });

  it('parede do chão ao teto entre as duas portas: não conecta', () => {
    const layout = downRoom((grid) => fill(grid, 8, 8, 1, 14, '#'));
    expect(exitsConnected(layout).ok).toBe(false);
  });

  it('sem chão ao lado da abertura: porta sem ponto de pé', () => {
    const layout = downRoom((grid) => fill(grid, 10, 19, 15, 16, '.'));
    const result = exitsConnected(layout);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toContain('sem ponto de pé');
  });
});

describe('salas de 2 células e casos pequenos', () => {
  it('portas up nas duas células, ligadas por um chão contínuo', () => {
    const grid = emptyGrid(2);
    openDoor(grid, 'up', 0);
    openDoor(grid, 'up', 1);
    for (const base of [0, 30]) fill(grid, 13 + base, 16 + base, 3, 3, '#');
    // chão contínuo com plataformas escalonadas só na primeira célula
    fill(grid, 8, 11, 12, 12, '#');
    fill(grid, 3, 6, 9, 9, '#');
    fill(grid, 8, 11, 6, 6, '#');
    fill(grid, 38, 41, 12, 12, '#');
    fill(grid, 33, 36, 9, 9, '#');
    fill(grid, 38, 41, 6, 6, '#');
    const result = exitsConnected(lines(grid));
    expect(result).toEqual({ ok: true, problems: [] });
  });

  it('0 ou 1 porta: ok', () => {
    expect(exitsConnected(lines(emptyGrid()))).toEqual({ ok: true, problems: [] });
    const grid = emptyGrid();
    openDoor(grid, 'up');
    expect(exitsConnected(lines(grid))).toEqual({ ok: true, problems: [] });
  });
});

describe('unreachableMarkers', () => {
  it('marcadores no chão ligado a uma porta são alcançáveis', () => {
    const layout = corridor((grid) => {
      put(grid, 8, 14, 'C');
      put(grid, 20, 14, 'A');
      put(grid, 25, 14, 'B');
    });
    expect(unreachableMarkers(layout)).toEqual([]);
  });

  it('marcador numa plataforma alta demais é inalcançável', () => {
    const layout = corridor((grid) => {
      fill(grid, 8, 12, 6, 6, '#');
      put(grid, 10, 5, 'C');
      put(grid, 20, 14, 'A');
    });
    expect(unreachableMarkers(layout)).toEqual(['C(10,5)']);
  });

  it('marcador num compartimento fechado é inalcançável', () => {
    const layout = corridor((grid) => {
      fill(grid, 15, 15, 1, 14, '#');
      fill(grid, 24, 24, 1, 14, '#');
      put(grid, 20, 14, 'F');
    });
    expect(unreachableMarkers(layout)).toEqual(['F(20,14)']);
  });

  it("sala sem portas: tudo é alcançável a partir do 'P'", () => {
    const grid = emptyGrid();
    put(grid, 3, 14, 'P');
    put(grid, 20, 14, 'C');
    expect(unreachableMarkers(lines(grid))).toEqual([]);
  });

  it("sala sem portas separada por parede: o lado sem 'P' é inalcançável", () => {
    const grid = emptyGrid();
    put(grid, 3, 14, 'P');
    fill(grid, 15, 15, 1, 14, '#');
    put(grid, 20, 14, 'C');
    expect(unreachableMarkers(lines(grid))).toEqual(['C(20,14)']);
  });

  it('marcador sem chão embaixo conta como inalcançável', () => {
    const layout = corridor((grid) => put(grid, 10, 8, 'C'));
    expect(unreachableMarkers(layout)).toEqual(['C(10,8)']);
  });
});
