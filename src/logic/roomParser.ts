/** Converte a descrição em texto de uma sala em dados que a cena sabe desenhar. */

export interface TileCell {
  col: number;
  row: number;
}

/** Qualquer caractere que não seja '#', '.' ou 'P' (ex.: 'C' = Carniçal), com a posição em tiles. */
export interface RoomMarker extends TileCell {
  char: string;
}

export interface ParsedRoom {
  cols: number;
  rows: number;
  solids: TileCell[];
  /** Mesma informação de `solids`, indexada por `row * cols + col`, para consultas rápidas. */
  grid: boolean[];
  /** Posição (em tiles) do 'P', ou null (só a sala inicial de um bioma tem). */
  spawn: TileCell | null;
  markers: RoomMarker[];
}

export function parseRoom(layout: readonly string[]): ParsedRoom {
  const first = layout[0];
  if (first === undefined) throw new Error('Sala vazia.');
  const cols = first.length;
  const solids: TileCell[] = [];
  const markers: RoomMarker[] = [];
  const grid: boolean[] = new Array<boolean>(cols * layout.length).fill(false);
  let spawn: TileCell | null = null;

  layout.forEach((line, row) => {
    if (line.length !== cols) {
      throw new Error(`Linha ${row} tem ${line.length} colunas, esperado ${cols}.`);
    }
    for (let col = 0; col < cols; col++) {
      const cell = line.charAt(col);
      if (cell === '#') {
        solids.push({ col, row });
        grid[row * cols + col] = true;
      } else if (cell === 'P') spawn = { col, row };
      else if (cell !== '.') markers.push({ char: cell, col, row });
    }
  });

  return { cols, rows: layout.length, solids, grid, spawn, markers };
}

/** O tile (col, row) é sólido? Fora da sala conta como sólido (a sala é fechada). */
export function isSolidTile(room: ParsedRoom, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= room.cols || row >= room.rows) return true;
  return room.grid[row * room.cols + col] === true;
}

/** O ponto (x, y) em pixels está dentro de um bloco sólido? */
export function isSolidAt(room: ParsedRoom, x: number, y: number, tileSize: number): boolean {
  return isSolidTile(room, Math.floor(x / tileSize), Math.floor(y / tileSize));
}
