import { isSolidAt, type ParsedRoom } from './roomParser';

/** Passo (px) da varredura entre os dois pontos: menor que um bloco, para não pular cantos. */
const STEP_PX = 4;

/**
 * Há ar livre em linha reta entre (x0, y0) e (x1, y1)? A rocha tapa a visão: um inimigo que enxerga
 * pela parede só precisa que isto devolva false para ignorar o herói. Puro; não aloca nada.
 */
export function hasLineOfSight(
  room: ParsedRoom,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tileSize: number,
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.ceil(Math.hypot(dx, dy) / STEP_PX);
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    if (isSolidAt(room, x0 + dx * t, y0 + dy * t, tileSize)) return false;
  }
  return true;
}
