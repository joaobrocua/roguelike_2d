/**
 * Planejamento da decoração de uma sala: decide, de forma determinística, onde ficam tufos,
 * vinhas, teias etc. Lógica pura (sem Phaser); roda uma vez por sala, não por frame.
 */
import { CELL, DOOR, type BiomeId } from '../data/mapRules';
import {
  DECOR_AIR_BELOW_TILES,
  DECOR_BIOME_BOOST,
  DECOR_CLEAR_RADIUS_TILES,
  DECOR_DOOR_MARGIN_TILES,
  DECOR_MAX_CHANCE,
  DECOR_MIN_GAP_TILES,
  DECOR_RULES,
  type DecorKind,
} from '../data/decor';
import { createRng } from '../utils/rng';
import { isSolidTile, type ParsedRoom } from './roomParser';

/**
 * `col`/`row` é o bloco ao qual o item se gruda:
 * - tuft, rubble, bone: bloco sólido de chão (o item fica em cima dele);
 * - vine, chain, drip: bloco sólido de teto (o item pende de baixo dele);
 * - cobweb: bloco VAZIO do canto interno (sólido acima e ao lado);
 * - crack: bloco sólido visível (com algum lado vazio; a variante final é um crescimento de parede).
 */
export interface DecorItem {
  kind: DecorKind;
  col: number;
  row: number;
  variant: number;
  flipX: boolean;
}

const FLOOR_KINDS: readonly DecorKind[] = ['tuft', 'rubble', 'bone'];
const CEILING_KINDS: readonly DecorKind[] = ['vine', 'chain', 'drip'];
const KIND_INDEX: Readonly<Record<DecorKind, number>> = {
  tuft: 0,
  rubble: 1,
  bone: 2,
  vine: 3,
  chain: 4,
  drip: 5,
  cobweb: 6,
  crack: 7,
  banner: 8,
};
const KIND_TOTAL = Object.keys(KIND_INDEX).length;

const DOOR_ROW_MIN = Math.min(...DOOR.horizontalRows) - DECOR_DOOR_MARGIN_TILES;
const DOOR_ROW_MAX = Math.max(...DOOR.horizontalRows) + DECOR_DOOR_MARGIN_TILES;
const DOOR_COL_MIN = Math.min(...DOOR.verticalCols) - DECOR_DOOR_MARGIN_TILES;
const DOOR_COL_MAX = Math.max(...DOOR.verticalCols) + DECOR_DOOR_MARGIN_TILES;

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

/** Um retângulo de blocos (inclusive nas quatro bordas) onde nada deve nascer. */
export interface DecorAvoid {
  col0: number;
  col1: number;
  row0: number;
  row1: number;
}

/** Marca (1) todo bloco a até `radius` de um marcador ou do ponto de nascimento, e os retângulos a evitar. */
function buildClearMask(room: ParsedRoom, avoid: readonly DecorAvoid[]): Uint8Array {
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
  for (const box of avoid) {
    for (let row = Math.max(0, box.row0); row <= Math.min(room.rows - 1, box.row1); row++) {
      for (let col = Math.max(0, box.col0); col <= Math.min(room.cols - 1, box.col1); col++) {
        mask[row * room.cols + col] = 1;
      }
    }
  }
  return mask;
}

/**
 * Chance de um tipo nascer numa posição candidata, já com o reforço da área (sem `biome`, só a
 * regra base). Nunca passa de DECOR_MAX_CHANCE; tipos com chance 0 continuam em 0.
 */
export function decorChance(kind: DecorKind, biome?: BiomeId): number {
  const base = DECOR_RULES[kind].chance;
  if (base <= 0) return 0;
  const boost = biome ? (DECOR_BIOME_BOOST[biome][kind] ?? 1) : 1;
  return Math.min(DECOR_MAX_CHANCE, base * boost);
}

export function planDecor(
  room: ParsedRoom,
  seed: number,
  avoid: readonly DecorAvoid[] = [],
  biome?: BiomeId,
): DecorItem[] {
  const { cols, rows } = room;
  const rng = createRng(seed);
  const clear = buildClearMask(room, avoid);
  const items: DecorItem[] = [];
  const chances = Object.fromEntries(
    (Object.keys(DECOR_RULES) as DecorKind[]).map((kind) => [kind, decorChance(kind, biome)]),
  ) as Record<DecorKind, number>;

  // Último item colocado por tipo (coluna e linha dele; a varredura é por linha, então ele é o
  // mais à direita da linha) e última linha usada por tipo em cada coluna: bastam para checar a
  // distância mínima.
  const lastColInRow = new Int32Array(KIND_TOTAL).fill(-1);
  const lastRowOfKind = new Int32Array(KIND_TOTAL).fill(-1);
  const lastRowInCol = new Int32Array(KIND_TOTAL * cols).fill(-1);

  /** Há `count` blocos de ar seguidos logo abaixo do bloco de teto (col, row)? */
  const hasAirBelow = (col: number, row: number, count: number): boolean => {
    for (let i = 1; i <= count; i++) if (isSolidTile(room, col, row + i)) return false;
    return true;
  };

  const tooClose = (kind: DecorKind, col: number, row: number): boolean => {
    const k = KIND_INDEX[kind];
    if (lastRowOfKind[k] === row && col - (lastColInRow[k] ?? -1) < DECOR_MIN_GAP_TILES) {
      return true;
    }
    const prevRow = lastRowInCol[k * cols + col] ?? -1;
    return prevRow >= 0 && row - prevRow < DECOR_MIN_GAP_TILES;
  };

  /** Tenta criar o item; `visualRow` é o bloco onde ele aparece (checa marcadores). */
  const tryPlace = (kind: DecorKind, col: number, row: number, visualRow: number): boolean => {
    const rule = DECOR_RULES[kind];
    if (rule.chance <= 0 || rule.variants <= 0) return false;
    if (isDoorStrip(room, col, row)) return false;
    if (clear[visualRow * cols + col] === 1) return false;
    if (tooClose(kind, col, row)) return false;
    if (rng() >= chances[kind]) return false;
    const variant = Math.floor(rng() * rule.variants);
    let flipX = rng() < 0.5;
    if (kind === 'cobweb') {
      // O canto da teia fica do lado da parede; só sobra sorteio se as duas existirem.
      const left = isSolidTile(room, col - 1, row);
      const right = isSolidTile(room, col + 1, row);
      flipX = left && right ? flipX : right;
    }
    items.push({ kind, col, row, variant, flipX });
    const k = KIND_INDEX[kind];
    lastColInRow[k] = col;
    lastRowOfKind[k] = row;
    lastRowInCol[k * cols + col] = row;
    return true;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (isSolidTile(room, col, row)) {
        const hasAir = (dc: number, dr: number): boolean => !isSolidTile(room, col + dc, row + dr);
        // Chão: vazio logo acima (e não a linha 0). Teto: vazio logo abaixo.
        if (row > 0 && hasAir(0, -1)) {
          for (const kind of FLOOR_KINDS) if (tryPlace(kind, col, row, row - 1)) break;
        }
        if (hasAir(0, 1)) {
          for (const kind of CEILING_KINDS) {
            if (
              !hasAirBelow(
                col,
                row,
                DECOR_AIR_BELOW_TILES[kind as keyof typeof DECOR_AIR_BELOW_TILES],
              )
            )
              continue;
            if (tryPlace(kind, col, row, row + 1)) break;
          }
        }
        if (hasAir(0, -1) || hasAir(0, 1) || hasAir(-1, 0) || hasAir(1, 0)) {
          tryPlace('crack', col, row, row);
        }
      } else if (row > 0 && col > 0 && col < cols - 1 && isSolidTile(room, col, row - 1)) {
        // Teia: canto interno (sólido acima e de um dos lados).
        if (isSolidTile(room, col - 1, row) || isSolidTile(room, col + 1, row)) {
          tryPlace('cobweb', col, row, row);
        }
      }
    }
  }

  return items.sort((a, b) => a.row - b.row || a.col - b.col || (a.kind < b.kind ? -1 : 1));
}
