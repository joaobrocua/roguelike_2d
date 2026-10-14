import { isSolidTile, type ParsedRoom } from './roomParser';

/** 'top' = bloco com ar em cima (superfície onde se pisa); 'fill' = bloco interno. */
export type TileKind = 'top' | 'fill';

/** Lados do bloco que dão para o vazio (bits somados em `edges`). */
export const TILE_EDGE = { left: 1, right: 2, bottom: 4 } as const;

export interface TileLook {
  kind: TileKind;
  /** Variação visual (0 a variants-1), a mesma sempre para o mesmo bloco. */
  variant: number;
  /** Quais lados estão ao ar livre (soma de TILE_EDGE): a arte acaba as quinas e o teto. */
  edges: number;
}

/** Hash inteiro simples e estável de (col, row): mesma sala, mesma aparência. */
export function tileHash(col: number, row: number): number {
  let h = Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Escolhe a aparência do bloco (col, row): superfície ou interno, qual variação e quais lados. */
export function tileLook(room: ParsedRoom, col: number, row: number, variants: number): TileLook {
  const kind: TileKind = isSolidTile(room, col, row - 1) ? 'fill' : 'top';
  let edges = 0;
  if (!isSolidTile(room, col - 1, row)) edges |= TILE_EDGE.left;
  if (!isSolidTile(room, col + 1, row)) edges |= TILE_EDGE.right;
  if (!isSolidTile(room, col, row + 1)) edges |= TILE_EDGE.bottom;
  return { kind, variant: tileHash(col, row) % Math.max(1, variants), edges };
}
