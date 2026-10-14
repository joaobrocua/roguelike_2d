import { describe, expect, it } from 'vitest';
import {
  detectExits,
  layoutCells,
  templateInfo,
  validateTemplate,
} from '../src/logic/map/roomExits';
import type { RoomKind, RoomTemplate, Side } from '../src/logic/map/types';

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

/** Abre a faixa padrão de uma porta. */
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

/** Modelo válido de cada tipo de sala; os testes estragam uma coisa por vez. */
function validGrid(kind: RoomKind): Grid {
  const grid = emptyGrid();
  switch (kind) {
    case 'start':
      openDoor(grid, 'left');
      openDoor(grid, 'right');
      put(grid, 3, 14, 'P');
      break;
    case 'combat':
      openDoor(grid, 'left');
      openDoor(grid, 'right');
      put(grid, 10, 14, 'C');
      break;
    case 'rest':
      openDoor(grid, 'left');
      put(grid, 10, 14, 'F');
      break;
    case 'chest':
      openDoor(grid, 'right');
      put(grid, 10, 14, 'B');
      break;
    case 'secret':
      openDoor(grid, 'left');
      put(grid, 10, 10, 'T');
      break;
    case 'exit':
      openDoor(grid, 'left');
      put(grid, 20, 14, 'X');
      break;
    case 'boss':
      openDoor(grid, 'right');
      put(grid, 20, 14, 'G');
      break;
  }
  return grid;
}

function template(kind: RoomKind, grid: Grid = validGrid(kind)): RoomTemplate {
  return { id: `teste-${kind}`, biome: 'any', kind, layout: lines(grid) };
}

/** Parte do modelo válido de `kind`, aplica `edit` e devolve a lista de problemas. */
function problemsAfter(kind: RoomKind, edit: (grid: Grid) => void): string[] {
  const grid = validGrid(kind);
  edit(grid);
  return validateTemplate(template(kind, grid));
}

function hasProblem(problems: string[], part: string): boolean {
  return problems.some((problem) => problem.includes(part));
}

describe('layoutCells', () => {
  it('sala de 1 célula', () => {
    expect(layoutCells(lines(emptyGrid()))).toEqual({ cellsW: 1, rows: 17, cols: 30 });
  });

  it('sala de 2 células', () => {
    expect(layoutCells(lines(emptyGrid(2)))).toEqual({ cellsW: 2, rows: 17, cols: 60 });
  });

  it('largura errada devolve a divisão sem arredondar', () => {
    expect(layoutCells(['#'.repeat(45), '#'.repeat(45)]).cellsW).toBe(1.5);
  });

  it('desenho vazio', () => {
    expect(layoutCells([])).toEqual({ cellsW: 0, rows: 0, cols: 0 });
  });
});

describe('detectExits', () => {
  it('sala fechada não tem portas', () => {
    expect(detectExits(lines(emptyGrid()))).toEqual([]);
  });

  it('portas completas nos quatro lados', () => {
    const grid = emptyGrid();
    for (const side of ['left', 'right', 'up', 'down'] as const) openDoor(grid, side);
    expect(detectExits(lines(grid))).toEqual([
      { side: 'left', cell: 0 },
      { side: 'right', cell: 0 },
      { side: 'up', cell: 0 },
      { side: 'down', cell: 0 },
    ]);
  });

  it('porta lateral com faixa incompleta não conta', () => {
    const grid = emptyGrid();
    openDoor(grid, 'left');
    put(grid, 0, 12, '#');
    expect(detectExits(lines(grid))).toEqual([]);
  });

  it('porta de cima/baixo com uma coluna fechada não conta', () => {
    const grid = emptyGrid();
    openDoor(grid, 'up');
    openDoor(grid, 'down');
    put(grid, 16, 0, '#');
    put(grid, 13, 16, '#');
    expect(detectExits(lines(grid))).toEqual([]);
  });

  it('abertura fora da faixa padrão não é porta', () => {
    const grid = emptyGrid();
    for (const col of [5, 6, 7, 8]) put(grid, col, 0, '.');
    expect(detectExits(lines(grid))).toEqual([]);
  });

  it('um caractere que não é # na faixa (tocha) conta como aberto', () => {
    const grid = emptyGrid();
    openDoor(grid, 'right');
    put(grid, 29, 13, 'T');
    expect(detectExits(lines(grid))).toEqual([{ side: 'right', cell: 0 }]);
  });

  it('sala de 2 células com portas up nas duas células', () => {
    const grid = emptyGrid(2);
    openDoor(grid, 'up', 0);
    openDoor(grid, 'up', 1);
    openDoor(grid, 'right');
    expect(detectExits(lines(grid))).toEqual([
      { side: 'right', cell: 0 },
      { side: 'up', cell: 0 },
      { side: 'up', cell: 1 },
    ]);
  });

  it('sala de 2 células: porta só na segunda célula tem cell 1', () => {
    const grid = emptyGrid(2);
    openDoor(grid, 'down', 1);
    expect(detectExits(lines(grid))).toEqual([{ side: 'down', cell: 1 }]);
  });
});

describe('templateInfo', () => {
  it('junta id, bioma, tipo, largura em células e portas', () => {
    const grid = validGrid('combat');
    const info = templateInfo({ ...template('combat', grid), biome: 'saloes' });
    expect(info).toEqual({
      id: 'teste-combat',
      biome: 'saloes',
      kind: 'combat',
      cellsW: 1,
      exits: [
        { side: 'left', cell: 0 },
        { side: 'right', cell: 0 },
      ],
    });
  });

  it('sala larga tem cellsW 2', () => {
    const grid = emptyGrid(2);
    openDoor(grid, 'left');
    expect(templateInfo(template('rest', grid)).cellsW).toBe(2);
  });
});

describe('validateTemplate: modelos válidos', () => {
  for (const kind of ['start', 'combat', 'rest', 'chest', 'secret', 'exit', 'boss'] as const) {
    it(`modelo base '${kind}' é válido`, () => {
      expect(validateTemplate(template(kind))).toEqual([]);
    });
  }

  it("'boss' pode ter inimigos (e não precisa)", () => {
    expect(problemsAfter('boss', (grid) => put(grid, 10, 14, 'C'))).toEqual([]);
  });

  it('sala larga (2 células) com portas nas duas células é válida', () => {
    const grid = emptyGrid(2);
    openDoor(grid, 'left');
    openDoor(grid, 'up', 1);
    openDoor(grid, 'down', 0);
    put(grid, 40, 14, 'C');
    expect(validateTemplate(template('combat', grid))).toEqual([]);
  });

  it('as mensagens citam o id do modelo', () => {
    const problems = problemsAfter('combat', (grid) => put(grid, 5, 15, '.'));
    expect(problems.length).toBeGreaterThan(0);
    for (const problem of problems) expect(problem).toContain('teste-combat');
  });
});

describe('validateTemplate: tamanho e caracteres', () => {
  it('altura diferente de 17', () => {
    const layout = lines(validGrid('combat')).slice(0, 16);
    const problems = validateTemplate({ ...template('combat'), layout });
    expect(hasProblem(problems, 'altura 16')).toBe(true);
  });

  it('linhas de tamanhos diferentes', () => {
    const layout = lines(validGrid('combat'));
    layout[5] = `${layout[5] ?? ''}.`;
    expect(hasProblem(validateTemplate({ ...template('combat'), layout }), 'linha 5')).toBe(true);
  });

  it('largura que não é múltipla de 30', () => {
    const layout = lines(validGrid('combat')).map((line) => line.slice(0, 29));
    expect(hasProblem(validateTemplate({ ...template('combat'), layout }), 'múltipla')).toBe(true);
  });

  it('largura múltipla de 30 mas diferente de 30 e 60', () => {
    const layout = lines(emptyGrid(3));
    const problems = validateTemplate({ ...template('combat'), layout });
    expect(hasProblem(problems, 'largura 90 inválida')).toBe(true);
  });

  it('caractere fora da lista', () => {
    const problems = problemsAfter('combat', (grid) => put(grid, 5, 5, 'Z'));
    expect(hasProblem(problems, "caractere inválido 'Z'")).toBe(true);
  });

  it('com estrutura errada só devolve os problemas de estrutura', () => {
    const layout = lines(validGrid('combat')).slice(0, 10);
    const problems = validateTemplate({ ...template('combat'), layout });
    expect(problems).toHaveLength(1);
  });
});

describe('validateTemplate: bordas e chão', () => {
  it('abertura parcial na faixa da porta', () => {
    const problems = problemsAfter('combat', (grid) => put(grid, 0, 13, '#'));
    expect(hasProblem(problems, 'abertura parcial na porta left')).toBe(true);
  });

  it('abertura parcial de porta de cima', () => {
    const problems = problemsAfter('combat', (grid) => {
      openDoor(grid, 'up');
      put(grid, 14, 0, '#');
    });
    expect(hasProblem(problems, 'abertura parcial na porta up')).toBe(true);
  });

  it('borda aberta fora das faixas padrão', () => {
    const problems = problemsAfter('combat', (grid) => put(grid, 0, 8, '.'));
    expect(hasProblem(problems, 'borda aberta fora das faixas')).toBe(true);
  });

  it('abertura em cima fora das colunas da faixa', () => {
    const problems = problemsAfter('combat', (grid) => put(grid, 5, 0, '.'));
    expect(hasProblem(problems, 'borda aberta fora das faixas')).toBe(true);
  });

  it('buraco no chão (linha 15 ou 16) fora de porta down', () => {
    expect(
      hasProblem(
        problemsAfter('combat', (g) => put(g, 5, 15, '.')),
        'chão furado',
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('combat', (g) => put(g, 5, 16, '.')),
        'chão furado',
      ),
    ).toBe(true);
  });

  it('o vão sob uma porta down completa não conta como buraco', () => {
    const problems = problemsAfter('combat', (grid) => {
      openDoor(grid, 'down');
      for (const col of [13, 14, 15, 16]) put(grid, col, 15, '.');
    });
    expect(problems).toEqual([]);
  });

  it('buraco no chão ao lado da porta down continua sendo erro', () => {
    const problems = problemsAfter('combat', (grid) => {
      openDoor(grid, 'down');
      put(grid, 12, 15, '.');
    });
    expect(hasProblem(problems, 'chão furado')).toBe(true);
  });
});

describe('validateTemplate: marcadores por tipo de sala', () => {
  it("'start' sem 'P' ou com dois 'P'", () => {
    expect(
      hasProblem(
        problemsAfter('start', (g) => put(g, 3, 14, '.')),
        "'start' precisa",
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('start', (g) => put(g, 6, 14, 'P')),
        "'start' precisa",
      ),
    ).toBe(true);
  });

  it("'P' fora da sala 'start'", () => {
    for (const kind of ['combat', 'rest', 'chest', 'secret', 'exit', 'boss'] as const) {
      expect(
        hasProblem(
          problemsAfter(kind, (g) => put(g, 6, 14, 'P')),
          "'P' só pode",
        ),
      ).toBe(true);
    }
  });

  it("'B' só em 'chest', e 'chest' precisa de ao menos um", () => {
    expect(
      hasProblem(
        problemsAfter('chest', (g) => put(g, 10, 14, '.')),
        "'chest' precisa",
      ),
    ).toBe(true);
    expect(problemsAfter('chest', (g) => put(g, 20, 14, 'B'))).toEqual([]);
    for (const kind of ['start', 'combat', 'rest', 'secret', 'exit', 'boss'] as const) {
      expect(
        hasProblem(
          problemsAfter(kind, (g) => put(g, 6, 14, 'B')),
          "'B' só pode",
        ),
      ).toBe(true);
    }
  });

  it("'F' só em 'rest', e 'rest' precisa de ao menos uma", () => {
    expect(
      hasProblem(
        problemsAfter('rest', (g) => put(g, 10, 14, '.')),
        "'rest' precisa",
      ),
    ).toBe(true);
    expect(problemsAfter('rest', (g) => put(g, 20, 14, 'F'))).toEqual([]);
    for (const kind of ['start', 'combat', 'chest', 'secret', 'exit', 'boss'] as const) {
      expect(
        hasProblem(
          problemsAfter(kind, (g) => put(g, 6, 14, 'F')),
          "'F' só pode",
        ),
      ).toBe(true);
    }
  });

  it("'X' só em 'exit', exatamente um", () => {
    expect(
      hasProblem(
        problemsAfter('exit', (g) => put(g, 20, 14, '.')),
        "'exit' precisa",
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('exit', (g) => put(g, 24, 14, 'X')),
        "'exit' precisa",
      ),
    ).toBe(true);
    for (const kind of ['start', 'combat', 'rest', 'chest', 'secret', 'boss'] as const) {
      expect(
        hasProblem(
          problemsAfter(kind, (g) => put(g, 6, 14, 'X')),
          "'X' só pode",
        ),
      ).toBe(true);
    }
  });

  it("'G' só em 'boss', exatamente um", () => {
    expect(
      hasProblem(
        problemsAfter('boss', (g) => put(g, 20, 14, '.')),
        "'boss' precisa",
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('boss', (g) => put(g, 24, 14, 'G')),
        "'boss' precisa",
      ),
    ).toBe(true);
    for (const kind of ['start', 'combat', 'rest', 'chest', 'secret', 'exit'] as const) {
      expect(
        hasProblem(
          problemsAfter(kind, (g) => put(g, 6, 14, 'G')),
          "'G' só pode",
        ),
      ).toBe(true);
    }
  });

  it('salas sem inimigos reclamam de C, A, V e D', () => {
    for (const kind of ['start', 'rest', 'chest', 'secret', 'exit'] as const) {
      for (const enemy of ['C', 'A', 'D']) {
        const problems = problemsAfter(kind, (g) => put(g, 6, 14, enemy));
        expect(hasProblem(problems, 'não pode ter inimigos')).toBe(true);
      }
      const flying = problemsAfter(kind, (g) => put(g, 6, 8, 'V'));
      expect(hasProblem(flying, 'não pode ter inimigos')).toBe(true);
    }
  });

  it("'combat' precisa de pelo menos um inimigo; com vários é válida", () => {
    expect(
      hasProblem(
        problemsAfter('combat', (g) => put(g, 10, 14, '.')),
        'pelo menos um inimigo',
      ),
    ).toBe(true);
    expect(
      problemsAfter('combat', (g) => {
        put(g, 15, 14, 'A');
        put(g, 20, 14, 'D');
        put(g, 22, 8, 'V');
      }),
    ).toEqual([]);
  });

  it("'secret' precisa de pelo menos uma tocha", () => {
    expect(
      hasProblem(
        problemsAfter('secret', (g) => put(g, 10, 10, '.')),
        "'secret' precisa",
      ),
    ).toBe(true);
  });
});

describe('validateTemplate: posição dos marcadores', () => {
  it('tocha sobre a borda', () => {
    const problems = problemsAfter('combat', (grid) => put(grid, 0, 5, 'T'));
    expect(hasProblem(problems, 'sobre a borda')).toBe(true);
  });

  it('tocha na faixa de uma porta aberta também está sobre a borda', () => {
    const problems = problemsAfter('combat', (grid) => put(grid, 0, 13, 'T'));
    expect(hasProblem(problems, 'sobre a borda')).toBe(true);
  });

  it('inimigo e P sobre a borda', () => {
    expect(
      hasProblem(
        problemsAfter('combat', (g) => put(g, 29, 14, 'C')),
        'sobre a borda',
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('start', (g) => put(g, 0, 14, 'P')),
        'sobre a borda',
      ),
    ).toBe(true);
  });

  it('inimigo terrestre flutuando (sem chão embaixo)', () => {
    for (const enemy of ['C', 'A', 'D']) {
      const problems = problemsAfter('combat', (grid) => put(grid, 15, 10, enemy));
      expect(hasProblem(problems, 'não tem bloco sólido embaixo')).toBe(true);
    }
  });

  it('marcador terrestre com teto colado em cima (menos de 2 blocos livres)', () => {
    const problems = problemsAfter('combat', (grid) => put(grid, 10, 13, '#'));
    expect(hasProblem(problems, 'não tem 2 blocos livres')).toBe(true);
  });

  it('P, B, F, X e G também precisam de chão e de espaço', () => {
    expect(
      hasProblem(
        problemsAfter('start', (g) => put(g, 3, 15 - 6, 'P')),
        'embaixo',
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('chest', (g) => put(g, 10, 13, '#')),
        'não tem 2 blocos',
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('rest', (g) => put(g, 10, 13, '#')),
        'não tem 2 blocos',
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('exit', (g) => put(g, 20, 13, '#')),
        'não tem 2 blocos',
      ),
    ).toBe(true);
    expect(
      hasProblem(
        problemsAfter('boss', (g) => put(g, 20, 13, '#')),
        'não tem 2 blocos',
      ),
    ).toBe(true);
  });

  it('marcador sobre o chão com espaço livre não dá erro, mesmo com tocha acima', () => {
    expect(problemsAfter('combat', (g) => put(g, 10, 13, 'T'))).toEqual([]);
  });

  it("'V' exige pelo menos 2 blocos livres em volta", () => {
    const enclosed = problemsAfter('combat', (grid) => {
      put(grid, 20, 8, 'V');
      put(grid, 19, 8, '#');
      put(grid, 21, 8, '#');
      put(grid, 20, 7, '#');
    });
    expect(hasProblem(enclosed, 'voador')).toBe(true);
    const open = problemsAfter('combat', (grid) => put(grid, 20, 8, 'V'));
    expect(open).toEqual([]);
  });
});

describe('validateTemplate: portas por tipo', () => {
  it("'start', 'exit', 'boss' e 'rest' precisam de pelo menos 1 porta", () => {
    for (const kind of ['start', 'exit', 'boss', 'rest'] as const) {
      const problems = problemsAfter(kind, (grid) => {
        for (const row of [12, 13, 14]) {
          put(grid, 0, row, '#');
          put(grid, 29, row, '#');
        }
      });
      expect(hasProblem(problems, 'pelo menos 1 porta')).toBe(true);
    }
  });

  it("'start' com uma única porta é válida", () => {
    expect(problemsAfter('start', (g) => put(g, 29, 13, '#'))).toContain(
      'Sala "teste-start": abertura parcial na porta right: ou abre a faixa inteira ou fecha.',
    );
    expect(
      problemsAfter('start', (g) => {
        for (const row of [12, 13, 14]) put(g, 29, row, '#');
      }),
    ).toEqual([]);
  });

  it("'secret' e 'chest' precisam de EXATAMENTE 1 porta", () => {
    for (const kind of ['secret', 'chest'] as const) {
      const none = problemsAfter(kind, (grid) => {
        for (const row of [12, 13, 14]) {
          put(grid, 0, row, '#');
          put(grid, 29, row, '#');
        }
      });
      expect(hasProblem(none, 'EXATAMENTE 1 porta')).toBe(true);
      const two = problemsAfter(kind, (grid) => {
        openDoor(grid, 'left');
        openDoor(grid, 'right');
      });
      expect(hasProblem(two, 'EXATAMENTE 1 porta')).toBe(true);
    }
  });
});
