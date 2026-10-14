import { CELL, DOOR } from '../../data/mapRules';
import { detectExits } from './roomExits';
import { oppositeSide, type BiomeMap, type ExitInfo, type Side } from './types';

/**
 * Regras de uso de uma sala durante o jogo (tudo puro, em blocos e pixels):
 * selar as portas sem ligação, achar por qual porta o jogador saiu e onde ele nasce ao entrar.
 */

/** Uma porta está na lista? (mesmo lado e mesma célula) */
function hasExit(list: readonly ExitInfo[], exit: ExitInfo): boolean {
  return list.some((e) => e.side === exit.side && e.cell === exit.cell);
}

/** Troca por bloco sólido a faixa de uma porta (para as portas sem ligação ficarem fechadas). */
function fillExit(rows: string[][], exit: ExitInfo): void {
  const lastRow = rows.length - 1;
  const lastCol = (rows[0]?.length ?? 1) - 1;
  const set = (row: number, col: number): void => {
    const line = rows[row];
    if (line && col >= 0 && col <= lastCol) line[col] = '#';
  };
  switch (exit.side) {
    case 'left':
      for (const row of DOOR.horizontalRows) set(row, 0);
      break;
    case 'right':
      for (const row of DOOR.horizontalRows) set(row, lastCol);
      break;
    case 'up':
      for (const col of DOOR.verticalCols) set(0, exit.cell * CELL.cols + col);
      break;
    case 'down':
      // O chão tem 2 linhas: a abertura atravessa as duas
      for (const col of DOOR.verticalCols) {
        set(lastRow, exit.cell * CELL.cols + col);
        set(lastRow - 1, exit.cell * CELL.cols + col);
      }
      break;
  }
}

/** Devolve o desenho da sala com todas as portas fora de `keep` seladas. Não altera o original. */
export function sealUnusedExits(layout: readonly string[], keep: readonly ExitInfo[]): string[] {
  const rows = layout.map((line) => line.split(''));
  for (const exit of detectExits(layout)) {
    if (!hasExit(keep, exit)) fillExit(rows, exit);
  }
  return rows.map((line) => line.join(''));
}

export interface RoomSize {
  widthPx: number;
  heightPx: number;
}

/**
 * Por qual lado o jogador saiu da sala? `x`,`y` é o centro do corpo; a saída vale quando o
 * centro passa da borda da sala (as portas são vãos na parede, então o jogador atravessa).
 */
export function crossedSide(x: number, y: number, size: RoomSize): Side | null {
  if (x < 0) return 'left';
  if (x > size.widthPx) return 'right';
  if (y < 0) return 'up';
  if (y > size.heightPx) return 'down';
  return null;
}

/** Em qual célula (coluna de 30 blocos) da sala o jogador está? Usado nas portas up/down. */
export function cellAt(x: number, tileSize: number, cellsW: number): number {
  const cell = Math.floor(x / (CELL.cols * tileSize));
  return Math.min(Math.max(cell, 0), cellsW - 1);
}

export interface EntryPoint {
  /** Posição do centro do corpo, em blocos (pode ter fração), e velocidade inicial (px/s). */
  col: number;
  row: number;
  vx: number;
  vy: number;
}

/**
 * Onde o jogador nasce ao entrar na sala pela porta `side` (a porta DESTA sala por onde ele chega):
 * - left/right: logo depois da parede, em pé no chão;
 * - up: chega caindo, no meio da abertura de cima;
 * - down: chega subindo pela abertura do chão e fica em pé no chão ao lado dela.
 * `cell` é a célula da porta (para up/down); `roomCols` é a largura da sala em blocos. `bodyHeightTiles` é a altura do corpo em blocos.
 */
export function entryPoint(
  side: Side,
  cell: number,
  roomCols: number,
  bodyHeightTiles: number,
): EntryPoint {
  const door = DOOR.verticalCols;
  const doorCenter = cell * CELL.cols + ((door[0] ?? 13) + (door[door.length - 1] ?? 16) + 1) / 2;
  const floorRow = (DOOR.horizontalRows[DOOR.horizontalRows.length - 1] ?? 14) + 1; // linha do chão
  const standRow = floorRow - bodyHeightTiles / 2; // centro do corpo em pé no chão
  switch (side) {
    case 'left':
      return { col: 2, row: standRow, vx: 0, vy: 0 };
    case 'right':
      return { col: roomCols - 2, row: standRow, vx: 0, vy: 0 };
    case 'up':
      return { col: doorCenter, row: 1.5, vx: 0, vy: 0 };
    case 'down':
      // Sobe pelo buraco e já fica em pé no chão ao lado dele (no meio do buraco cairia de volta)
      return { col: doorCenter + DOWN_ENTRY_OFFSET, row: standRow, vx: 0, vy: 0 };
  }
}

/** Distância (em blocos) do centro do buraco do chão até onde o herói chega subindo por ele. */
const DOWN_ENTRY_OFFSET = 3.5;

/** Quantos pontos (um bloco mais adentro a cada vez) a chegada por uma porta lateral tenta. */
const SIDE_ENTRY_STEPS = 6;

/**
 * Pontos alternativos de chegada pela mesma porta, em ordem de preferência: se o primeiro estiver
 * dentro de um bloco do desenho, a cena tenta o seguinte. Nas portas laterais as alternativas
 * avançam sala adentro (há modelos com um pilar junto à porta); na de baixo, ficam do outro lado
 * do buraco e mais longe. A porta de cima cai de qualquer jeito, então tem só um ponto.
 */
export function entryCandidates(
  side: Side,
  cell: number,
  roomCols: number,
  bodyHeightTiles: number,
): EntryPoint[] {
  const first = entryPoint(side, cell, roomCols, bodyHeightTiles);
  if (side === 'left' || side === 'right') {
    const direction = side === 'left' ? 1 : -1;
    return Array.from({ length: SIDE_ENTRY_STEPS }, (_, i) => ({
      ...first,
      col: first.col + direction * i,
    }));
  }
  if (side !== 'down') return [first];
  const center = first.col - DOWN_ENTRY_OFFSET;
  return [
    first,
    { ...first, col: center - DOWN_ENTRY_OFFSET },
    { ...first, col: center + DOWN_ENTRY_OFFSET + 2 },
    { ...first, col: center - DOWN_ENTRY_OFFSET - 2 },
  ];
}

/** Portas de uma sala que têm ligação no mapa (as demais são seladas). */
export function usedExits(map: BiomeMap, roomId: number): ExitInfo[] {
  const exits: ExitInfo[] = [];
  const horizontal = (side: Side): boolean => side === 'left' || side === 'right';
  for (const link of map.links) {
    if (link.from === roomId) {
      exits.push({ side: link.fromSide, cell: horizontal(link.fromSide) ? 0 : link.fromCell });
    }
    if (link.to === roomId) {
      const side = oppositeSide(link.fromSide);
      exits.push({ side, cell: horizontal(side) ? 0 : link.toCell });
    }
  }
  return exits;
}

export interface Crossing {
  /** Sala para onde o jogador vai. */
  toId: number;
  /** Porta DA SALA NOVA por onde ele chega, e a célula dela. */
  entrySide: Side;
  entryCell: number;
}

/**
 * Para onde leva a porta `side` (na célula `cell`, para up/down) da sala `roomId`?
 * Devolve null se não há ligação ali (a porta estaria selada).
 */
export function crossingAt(
  map: BiomeMap,
  roomId: number,
  side: Side,
  cell: number,
): Crossing | null {
  const horizontal = side === 'left' || side === 'right';
  for (const link of map.links) {
    if (link.from === roomId && link.fromSide === side && (horizontal || link.fromCell === cell)) {
      return { toId: link.to, entrySide: oppositeSide(side), entryCell: link.toCell };
    }
    if (
      link.to === roomId &&
      oppositeSide(link.fromSide) === side &&
      (horizontal || link.toCell === cell)
    ) {
      return { toId: link.from, entrySide: oppositeSide(side), entryCell: link.fromCell };
    }
  }
  return null;
}
