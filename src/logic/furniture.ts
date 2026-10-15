/**
 * Planejamento da mobília de uma sala: decide, de forma determinística, quais peças da ala ficam
 * onde (no chão ou penduradas no teto). Lógica pura (sem Phaser); roda uma vez por sala.
 */
import { CELL, DOOR } from '../data/mapRules';
import { DECOR_CLEAR_RADIUS_TILES, DECOR_DOOR_MARGIN_TILES } from '../data/decor';
import {
  FURNITURE,
  FURNITURE_ATTEMPTS,
  FURNITURE_GAP_TILES,
  type FurnitureKind,
  type WingDef,
} from '../data/wings';
import { createRng, randomInt } from '../utils/rng';
import { isSolidTile, type ParsedRoom } from './roomParser';

/**
 * - Peça de chão: `col` é o bloco ESQUERDO e `row` a linha do bloco sólido que a sustenta (a peça
 *   ocupa as linhas acima dele).
 * - Peça de teto: `row` é a linha do bloco sólido de teto de onde ela pende (a peça ocupa as
 *   linhas abaixo dele).
 */
export interface FurnitureItem {
  kind: FurnitureKind;
  col: number;
  row: number;
  variant: number;
  flipX: boolean;
}

/** Retângulo em blocos, com os dois extremos inclusivos. */
export interface TileRect {
  col0: number;
  col1: number;
  row0: number;
  row1: number;
}

const DOOR_ROW_MIN = Math.min(...DOOR.horizontalRows) - DECOR_DOOR_MARGIN_TILES;
const DOOR_ROW_MAX = Math.max(...DOOR.horizontalRows) + DECOR_DOOR_MARGIN_TILES;
const DOOR_COL_MIN = Math.min(...DOOR.verticalCols) - DECOR_DOOR_MARGIN_TILES;
const DOOR_COL_MAX = Math.max(...DOOR.verticalCols) + DECOR_DOOR_MARGIN_TILES;

/**
 * Retângulo VISUAL ocupado pela peça (a linha de apoio/teto NÃO entra):
 * - chão: colunas col..col+w-1 e linhas row-h..row-1 (o ar logo acima do bloco de apoio);
 * - teto: colunas col..col+w-1 e linhas row+1..row+h (o ar logo abaixo do bloco de teto).
 */
export function footprintOf(item: FurnitureItem): TileRect {
  const spec = FURNITURE[item.kind];
  const col1 = item.col + spec.widthTiles - 1;
  if (spec.placement === 'floor') {
    return { col0: item.col, col1, row0: item.row - spec.heightTiles, row1: item.row - 1 };
  }
  return { col0: item.col, col1, row0: item.row + 1, row1: item.row + spec.heightTiles };
}

/** O bloco está na borda de uma porta (ou na folga ao lado dela)? */
function isDoorStrip(room: ParsedRoom, col: number, row: number): boolean {
  if ((col === 0 || col === room.cols - 1) && row >= DOOR_ROW_MIN && row <= DOOR_ROW_MAX) {
    return true;
  }
  if (row === 0 || row === room.rows - 1) {
    const inCell = col % CELL.cols;
    return inCell >= DOOR_COL_MIN && inCell <= DOOR_COL_MAX;
  }
  return false;
}

/** Marca (1) todo bloco a até `radius` de um marcador ou do ponto de nascimento. */
function buildClearMask(room: ParsedRoom): Uint8Array {
  const mask = new Uint8Array(room.cols * room.rows);
  const r = DECOR_CLEAR_RADIUS_TILES;
  const mark = (cx: number, cy: number): void => {
    for (let row = Math.max(0, cy - r); row <= Math.min(room.rows - 1, cy + r); row++) {
      for (let col = Math.max(0, cx - r); col <= Math.min(room.cols - 1, cx + r); col++) {
        mask[row * room.cols + col] = 1;
      }
    }
  };
  for (const marker of room.markers) mark(marker.col, marker.row);
  if (room.spawn) mark(room.spawn.col, room.spawn.row);
  return mask;
}

/** Posições (col, row) em que a peça cabe na sala, sem contar as outras peças. */
function findCandidates(room: ParsedRoom, kind: FurnitureKind, clear: Uint8Array): number[] {
  const { cols, rows } = room;
  const spec = FURNITURE[kind];
  const w = spec.widthTiles;
  const h = spec.heightTiles;
  const floor = spec.placement === 'floor';
  const found: number[] = [];

  for (let row = floor ? 1 : 0; row < rows; row++) {
    for (let col = 0; col + w <= cols; col++) {
      const rowFrom = floor ? row - h : row;
      const rowTo = floor ? row : row + h;
      if (rowFrom < 0 || rowTo > rows - 1) continue;

      let fits = true;
      for (let dc = 0; dc < w && fits; dc++) {
        // Apoio sólido e ar livre no restante da pegada.
        if (!isSolidTile(room, col + dc, row)) fits = false;
        for (let r = rowFrom; r <= rowTo && fits; r++) {
          if (r === row) continue;
          if (isSolidTile(room, col + dc, r)) fits = false;
        }
      }
      if (!fits) continue;

      // Portas: pegada inteira (inclui a linha de apoio). Marcadores: só o retângulo visual.
      const visualFrom = floor ? row - h : row + 1;
      const visualTo = floor ? row - 1 : row + h;
      let blocked = false;
      for (let dc = 0; dc < w && !blocked; dc++) {
        for (let r = rowFrom; r <= rowTo && !blocked; r++) {
          if (isDoorStrip(room, col + dc, r)) blocked = true;
          else if (r >= visualFrom && r <= visualTo && clear[r * cols + col + dc] === 1) {
            blocked = true;
          }
        }
      }
      if (!blocked) found.push(col, row);
    }
  }
  return found;
}

function overlaps(a: TileRect, b: TileRect, gap: number): boolean {
  return a.col0 - gap <= b.col1 && b.col0 - gap <= a.col1 && a.row0 <= b.row1 && b.row0 <= a.row1;
}

export function planFurniture(room: ParsedRoom, wing: WingDef, seed: number): FurnitureItem[] {
  const rng = createRng(seed);
  const clear = buildClearMask(room);
  const items: FurnitureItem[] = [];
  const rects: TileRect[] = [];
  // Posições válidas por tipo, calculadas só quando o tipo é sorteado pela primeira vez.
  const candidates = new Map<FurnitureKind, number[]>();

  const pool = wing.furniture.filter((f) => f.weight > 0);
  const totalWeight = pool.reduce((sum, f) => sum + f.weight, 0);
  const target = randomInt(rng, wing.count.min, wing.count.max + 1);
  if (pool.length === 0) return items;

  const pickKind = (): FurnitureKind => {
    let roll = rng() * totalWeight;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll < 0) return entry.kind;
    }
    return (pool[pool.length - 1] as { kind: FurnitureKind }).kind;
  };

  for (let n = 0; n < target; n++) {
    const kind = pickKind();
    const spec = FURNITURE[kind];
    let spots = candidates.get(kind);
    if (!spots) {
      spots = findCandidates(room, kind, clear);
      candidates.set(kind, spots);
    }
    const total = spots.length / 2;
    if (total === 0) continue;

    for (let attempt = 0; attempt < FURNITURE_ATTEMPTS; attempt++) {
      const pick = randomInt(rng, 0, total) * 2;
      const col = spots[pick] as number;
      const row = spots[pick + 1] as number;
      const candidate: FurnitureItem = { kind, col, row, variant: 0, flipX: false };
      const rect = footprintOf(candidate);
      // A folga lateral vale entre peças do mesmo tipo de colocação (chão com chão, teto com teto).
      const taken = items.some((other, i) => {
        const sameSide = FURNITURE[other.kind].placement === spec.placement;
        return overlaps(rect, rects[i] as TileRect, sameSide ? FURNITURE_GAP_TILES : 0);
      });
      if (taken) continue;

      candidate.flipX = rng() < 0.5;
      candidate.variant = Math.floor(rng() * spec.variants);
      items.push(candidate);
      rects.push(rect);
      break;
    }
  }

  return items.sort((a, b) => a.row - b.row || a.col - b.col || (a.kind < b.kind ? -1 : 1));
}
