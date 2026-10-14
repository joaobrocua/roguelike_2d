import { isSolidTile, type ParsedRoom } from './roomParser';

/**
 * Altura (px) do chão sob o ponto (x, y): o topo do primeiro bloco sólido que se encontra
 * descendo a partir dele. Se o ponto está dentro de um bloco, sobe até o ar antes de descer.
 * Sem chão embaixo, devolve o próprio `y`. Usado para a relíquia largada cair até o chão.
 */
export function floorYAt(room: ParsedRoom, x: number, y: number, tileSize: number): number {
  const col = Math.min(room.cols - 1, Math.max(0, Math.floor(x / tileSize)));
  let row = Math.min(room.rows - 1, Math.max(0, Math.floor(y / tileSize)));
  while (row > 0 && isSolidTile(room, col, row)) row--;
  for (; row < room.rows; row++) {
    if (isSolidTile(room, col, row)) return row * tileSize;
  }
  return y;
}
