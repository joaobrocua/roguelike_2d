/**
 * Ferramentas puras para ler e validar modelos de sala: tamanho em células, portas abertas nas
 * bordas e a lista de problemas de um modelo. Usado pelos testes e uma vez ao carregar os
 * modelos (nunca por frame, então pode alocar).
 */

import { CELL, DOOR } from '../../data/mapRules';
import type { ExitInfo, RoomKind, RoomTemplate, Side, TemplateInfo } from './types';

const ALLOWED_CHARS = '#.PCAVDLRTBFXG';
const ENEMY_CHARS = 'CAVDLR';
/** Marcadores que ficam em pé sobre o chão (o 'V' voa e tem regra própria). */
const GROUNDED_CHARS = 'CADLRPBFXG';

/** Marcadores que só existem em um tipo de sala (e quantos devem existir nele). */
const OWNED_MARKERS: readonly { char: string; kind: RoomKind; exactlyOne: boolean }[] = [
  { char: 'P', kind: 'start', exactlyOne: true },
  { char: 'B', kind: 'chest', exactlyOne: false },
  { char: 'F', kind: 'rest', exactlyOne: false },
  { char: 'X', kind: 'exit', exactlyOne: true },
  { char: 'G', kind: 'boss', exactlyOne: true },
];

const KINDS_WITHOUT_ENEMIES: readonly RoomKind[] = ['start', 'rest', 'chest', 'secret', 'exit'];

interface Position {
  col: number;
  row: number;
}

/** Tamanho do desenho em células. `cellsW` não é arredondado: fica fracionário se o modelo estiver errado. */
export function layoutCells(layout: readonly string[]): {
  cellsW: number;
  rows: number;
  cols: number;
} {
  const cols = layout[0]?.length ?? 0;
  return { cellsW: cols / CELL.cols, rows: layout.length, cols };
}

/** Tile aberto (qualquer caractere que não seja '#'). Fora do desenho conta como fechado. */
function isOpenAt(layout: readonly string[], col: number, row: number): boolean {
  const line = layout[row];
  if (line === undefined || col < 0 || col >= line.length) return false;
  return line.charAt(col) !== '#';
}

/** Posições da faixa padrão de uma porta na borda. `cell` só importa para up/down. */
function doorStrip(side: Side, cell: number, cols: number, rows: number): Position[] {
  switch (side) {
    case 'left':
      return DOOR.horizontalRows.map((row) => ({ col: 0, row }));
    case 'right':
      return DOOR.horizontalRows.map((row) => ({ col: cols - 1, row }));
    case 'up':
      return DOOR.verticalCols.map((col) => ({ col: col + CELL.cols * cell, row: 0 }));
    case 'down':
      return DOOR.verticalCols.map((col) => ({ col: col + CELL.cols * cell, row: rows - 1 }));
  }
}

/** Todas as faixas de porta possíveis de um desenho, na ordem left, right, up, down. */
function allStrips(cols: number, rows: number): { exit: ExitInfo; cells: Position[] }[] {
  const cellsW = Math.max(1, Math.floor(cols / CELL.cols));
  const strips: { exit: ExitInfo; cells: Position[] }[] = [];
  const add = (side: Side, cell: number): void => {
    strips.push({ exit: { side, cell }, cells: doorStrip(side, cell, cols, rows) });
  };
  add('left', 0);
  add('right', 0);
  for (let cell = 0; cell < cellsW; cell++) add('up', cell);
  for (let cell = 0; cell < cellsW; cell++) add('down', cell);
  return strips;
}

/**
 * Portas abertas nas bordas, pelas regras padrão (src/data/mapRules.ts). Uma porta só conta se
 * TODAS as posições da faixa padrão estão abertas.
 */
export function detectExits(layout: readonly string[]): ExitInfo[] {
  const { cols, rows } = layoutCells(layout);
  if (rows === 0 || cols === 0) return [];
  return allStrips(cols, rows)
    .filter((strip) => strip.cells.every((pos) => isOpenAt(layout, pos.col, pos.row)))
    .map((strip) => strip.exit);
}

export function templateInfo(template: RoomTemplate): TemplateInfo {
  return {
    id: template.id,
    biome: template.biome,
    kind: template.kind,
    cellsW: layoutCells(template.layout).cellsW,
    exits: detectExits(template.layout),
  };
}

/**
 * Lista de problemas de um modelo (em português, citando o id). Vazia = válido. Se a estrutura
 * (tamanho, caracteres) está errada, devolve só esses problemas: o resto depende dela.
 */
export function validateTemplate(template: RoomTemplate): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => {
    problems.push(`Sala "${template.id}": ${message}`);
  };
  const { layout, kind } = template;
  const { cols, rows } = layoutCells(layout);

  // Estrutura: tamanho e caracteres permitidos.
  if (rows !== CELL.rows) fail(`altura ${rows}, esperado ${CELL.rows} linhas.`);
  layout.forEach((line, row) => {
    if (line.length !== cols) fail(`a linha ${row} tem ${line.length} colunas, esperado ${cols}.`);
  });
  if (cols % CELL.cols !== 0) {
    fail(`largura ${cols} não é múltipla de ${CELL.cols}.`);
  } else if (cols !== CELL.cols && cols !== CELL.cols * 2) {
    fail(`largura ${cols} inválida: use ${CELL.cols} ou ${CELL.cols * 2}.`);
  }
  const badChars = new Set<string>();
  layout.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const char = line.charAt(col);
      if (!ALLOWED_CHARS.includes(char) && !badChars.has(char)) {
        badChars.add(char);
        fail(`caractere inválido '${char}' em (${col}, ${row}).`);
      }
    }
  });
  if (problems.length > 0) return problems;

  // Borda externa: toda '#', exceto as faixas de porta, que ou abrem inteiras ou ficam fechadas.
  const strips = allStrips(cols, rows);
  const stripKeys = new Set<string>();
  const doorColumns = new Set<number>();
  for (const strip of strips) {
    for (const pos of strip.cells) stripKeys.add(`${pos.col},${pos.row}`);
    const openCount = strip.cells.filter((pos) => isOpenAt(layout, pos.col, pos.row)).length;
    const label = `${strip.exit.side}${strip.exit.side === 'up' || strip.exit.side === 'down' ? ` (célula ${strip.exit.cell})` : ''}`;
    if (openCount > 0 && openCount < strip.cells.length) {
      fail(`abertura parcial na porta ${label}: ou abre a faixa inteira ou fecha.`);
    }
    if (openCount === strip.cells.length && strip.exit.side === 'down') {
      for (const pos of strip.cells) doorColumns.add(pos.col);
    }
  }
  const strayOpenings: Position[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const onBorder = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
      if (onBorder && !stripKeys.has(`${col},${row}`) && isOpenAt(layout, col, row)) {
        strayOpenings.push({ col, row });
      }
    }
  }
  const stray = strayOpenings[0];
  if (stray !== undefined) {
    fail(
      `borda aberta fora das faixas de porta em (${stray.col}, ${stray.row})` +
        (strayOpenings.length > 1 ? ` e mais ${strayOpenings.length - 1} posição(ões).` : '.'),
    );
  }

  // Chão: as duas últimas linhas são sólidas, menos sob as portas 'down'.
  const holes: Position[] = [];
  for (let row = rows - 2; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!doorColumns.has(col) && isOpenAt(layout, col, row)) holes.push({ col, row });
    }
  }
  const hole = holes[0];
  if (hole !== undefined) {
    fail(
      `chão furado em (${hole.col}, ${hole.row})` +
        (holes.length > 1 ? ` e mais ${holes.length - 1} posição(ões)` : '') +
        ': as linhas 15 e 16 são sólidas fora das portas de baixo.',
    );
  }

  // Marcadores: contagem por tipo de sala e posição.
  const counts: Record<string, number> = {};
  const markers: { char: string; col: number; row: number }[] = [];
  layout.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const char = line.charAt(col);
      if (char === '#' || char === '.') continue;
      counts[char] = (counts[char] ?? 0) + 1;
      markers.push({ char, col, row });
    }
  });
  const countOf = (chars: string): number =>
    [...chars].reduce((sum, char) => sum + (counts[char] ?? 0), 0);

  for (const owned of OWNED_MARKERS) {
    const n = counts[owned.char] ?? 0;
    if (kind === owned.kind) {
      if (owned.exactlyOne ? n !== 1 : n < 1) {
        fail(
          `a sala '${kind}' precisa de ${owned.exactlyOne ? 'exatamente um' : 'pelo menos um'} '${owned.char}' (tem ${n}).`,
        );
      }
    } else if (n > 0) {
      fail(`'${owned.char}' só pode existir na sala '${owned.kind}' (tem ${n}).`);
    }
  }

  const enemies = countOf(ENEMY_CHARS);
  if (KINDS_WITHOUT_ENEMIES.includes(kind) && enemies > 0) {
    fail(`a sala '${kind}' não pode ter inimigos (tem ${enemies}).`);
  }
  if (kind === 'combat' && enemies < 1) fail("a sala 'combat' precisa de pelo menos um inimigo.");
  if (kind === 'secret' && (counts['T'] ?? 0) < 1) {
    fail("a sala 'secret' precisa de pelo menos uma tocha 'T'.");
  }

  // Posição de cada marcador: dentro da sala, com chão e espaço livre quando em pé.
  const solidAt = (col: number, row: number): boolean => !isOpenAt(layout, col, row);
  for (const marker of markers) {
    const { char, col, row } = marker;
    const where = `'${char}' em (${col}, ${row})`;
    if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
      fail(`${where} está sobre a borda da sala.`);
      continue;
    }
    if (GROUNDED_CHARS.includes(char)) {
      if (!solidAt(col, row + 1)) fail(`${where} não tem bloco sólido embaixo.`);
      if (solidAt(col, row - 1)) fail(`${where} não tem 2 blocos livres acima do chão.`);
    } else if (char === 'V') {
      const freeAround = [
        isOpenAt(layout, col - 1, row),
        isOpenAt(layout, col + 1, row),
        isOpenAt(layout, col, row - 1),
        isOpenAt(layout, col, row + 1),
      ].filter(Boolean).length;
      if (freeAround < 2) fail(`${where} (voador) precisa de pelo menos 2 blocos livres em volta.`);
    }
  }

  // Portas por tipo de sala.
  const doors = detectExits(layout).length;
  if (kind === 'secret' || kind === 'chest') {
    if (doors !== 1) fail(`a sala '${kind}' precisa de EXATAMENTE 1 porta (tem ${doors}).`);
  } else if (kind !== 'combat' && doors < 1) {
    fail(`a sala '${kind}' precisa de pelo menos 1 porta.`);
  }

  return problems;
}
